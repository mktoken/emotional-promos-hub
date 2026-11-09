BEGIN;

-- Public intake can create CRM follow-up records only through the Edge Function.
-- Existing leads are never selected or updated by this routine.
CREATE OR REPLACE FUNCTION public.capture_assistant_lead_internal(
  p_request_id uuid,
  p_request_fingerprint text,
  p_captured jsonb,
  p_messages jsonb,
  p_summary text,
  p_budget_range text,
  p_next_follow_up_at timestamptz,
  p_privacy_consent boolean
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_existing_fingerprint text;
  v_email text;
  v_phone text;
  v_request_lock bigint;
  v_email_lock bigint;
  v_phone_lock bigint;
  v_recent_count integer;
  v_lead_id uuid;
  v_session_id uuid;
  v_event_date date;
  v_priority public.activity_priority;
  v_consent_at timestamptz := clock_timestamp();
  v_captured_data jsonb;
  v_message jsonb;
BEGIN
  IF p_privacy_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'privacy_consent_required' USING ERRCODE = 'P0001';
  END IF;

  IF p_request_id IS NULL
     OR p_request_fingerprint IS NULL
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_captured) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_messages) IS DISTINCT FROM 'array'
     OR p_summary IS NULL
     OR nullif(btrim(p_summary), '') IS NULL
     OR char_length(p_summary) > 5000
     OR p_next_follow_up_at IS NULL
  THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_array_length(p_messages) > 50 THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  IF p_budget_range IS NULL OR p_budget_range NOT IN (
    'menos_10000', '10000_30000', '30000_75000',
    '75000_150000', 'mas_150000', 'por_definir'
  ) THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  v_email := nullif(lower(btrim(p_captured->>'email')), '');
  v_phone := nullif(p_captured->>'whatsapp', '');
  IF nullif(btrim(p_captured->>'contact_name'), '') IS NULL
     OR (v_email IS NULL AND v_phone IS NULL)
     OR (v_email IS NOT NULL AND (char_length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
     OR (v_phone IS NOT NULL AND v_phone !~ '^[0-9]{10,15}$')
  THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  FOR v_message IN SELECT value FROM jsonb_array_elements(p_messages) AS items(value)
  LOOP
    IF jsonb_typeof(v_message) IS DISTINCT FROM 'object'
       OR v_message->>'role' NOT IN ('visitor', 'assistant')
       OR nullif(btrim(v_message->>'message'), '') IS NULL
       OR char_length(v_message->>'message') > 500
    THEN
      RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Serialize retries before checking the request ID, then lock contacts in a
  -- stable order so concurrent submissions cannot bypass the contact limit.
  v_request_lock := hashtextextended('assistant-capture-request:' || p_request_id::text, 0);
  PERFORM pg_catalog.pg_advisory_xact_lock(v_request_lock);

  SELECT s.captured_data->>'request_fingerprint'
  INTO v_existing_fingerprint
  FROM public.crm_chat_sessions AS s
  WHERE s.source = 'asistente_virtual'
    AND s.captured_data->>'public_request_id' = p_request_id::text
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency_key_conflict' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY SELECT 'idempotent_replay'::text;
    RETURN;
  END IF;

  IF v_email IS NOT NULL THEN
    v_email_lock := hashtextextended('assistant-capture-email:' || v_email, 0);
  END IF;
  IF v_phone IS NOT NULL THEN
    v_phone_lock := hashtextextended('assistant-capture-phone:' || v_phone, 0);
  END IF;

  IF v_email_lock IS NOT NULL AND v_phone_lock IS NOT NULL THEN
    IF v_email_lock <= v_phone_lock THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock);
      PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock);
    ELSE
      PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock);
      PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock);
    END IF;
  ELSIF v_email_lock IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock);
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock);
  END IF;

  SELECT count(*)::integer
  INTO v_recent_count
  FROM public.crm_chat_sessions AS s
  WHERE s.source = 'asistente_virtual'
    AND s.created_at >= clock_timestamp() - interval '15 minutes'
    AND s.captured_data ? 'public_request_id'
    AND (
      (v_email IS NOT NULL AND lower(coalesce(s.captured_data->>'email', '')) = v_email)
      OR (v_phone IS NOT NULL AND regexp_replace(coalesce(s.captured_data->>'whatsapp', ''), '[^0-9]', '', 'g') = v_phone)
    );

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  IF nullif(p_captured->>'event_date', '') IS NOT NULL THEN
    v_event_date := (p_captured->>'event_date')::date;
  END IF;
  v_priority := CASE
    WHEN v_event_date IS NOT NULL
      AND v_event_date < (clock_timestamp() AT TIME ZONE 'UTC')::date + 14
      THEN 'alta'::public.activity_priority
    ELSE 'media'::public.activity_priority
  END;

  INSERT INTO public.crm_leads (
    source,
    status,
    company_name,
    contact_name,
    phone,
    whatsapp,
    email,
    city,
    state,
    product_interest,
    budget_range,
    event_date,
    notes,
    next_follow_up_at
  )
  VALUES (
    'asistente_virtual',
    'interesado',
    coalesce(nullif(btrim(p_captured->>'company_name'), ''), nullif(btrim(p_captured->>'contact_name'), ''), 'Sin empresa'),
    nullif(btrim(p_captured->>'contact_name'), ''),
    v_phone,
    v_phone,
    v_email,
    nullif(btrim(p_captured->>'delivery_city'), ''),
    nullif(btrim(p_captured->>'delivery_state'), ''),
    nullif(btrim(p_captured->>'product_interest'), ''),
    p_budget_range::public.budget_range,
    v_event_date,
    p_summary,
    p_next_follow_up_at
  )
  RETURNING id INTO v_lead_id;

  INSERT INTO public.crm_activities (
    lead_id, type, title, description, priority, due_date
  )
  VALUES (
    v_lead_id,
    'seguimiento_cotizacion',
    'Solicitud recibida desde asistente virtual',
    p_summary,
    v_priority,
    p_next_follow_up_at
  );

  INSERT INTO public.crm_notes (lead_id, note)
  VALUES (v_lead_id, p_summary);

  v_captured_data := p_captured || jsonb_build_object(
    'public_request_id', p_request_id,
    'request_fingerprint', p_request_fingerprint,
    'privacy_consent', true,
    'consent_at', v_consent_at,
    'privacy_version', 'PE-PRIVACY-V1',
    'privacy_url', '/aviso-de-privacidad',
    'marketing_consent', false
  );

  INSERT INTO public.crm_chat_sessions (
    lead_id, source, status, intent, summary, captured_data, completed_at
  )
  VALUES (
    v_lead_id,
    'asistente_virtual',
    'completed',
    nullif(p_captured->>'intent', ''),
    p_summary,
    v_captured_data,
    clock_timestamp()
  )
  RETURNING id INTO v_session_id;

  INSERT INTO public.crm_chat_messages (session_id, role, message, metadata)
  SELECT
    v_session_id,
    (item->>'role')::public.chat_message_role,
    item->>'message',
    '{}'::jsonb
  FROM jsonb_array_elements(p_messages) AS messages(item);

  RETURN QUERY SELECT 'created'::text;
END;
$function$;

ALTER FUNCTION public.capture_assistant_lead_internal(
  uuid, text, jsonb, jsonb, text, text, timestamptz, boolean
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.capture_assistant_lead_internal(
  uuid, text, jsonb, jsonb, text, text, timestamptz, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.capture_assistant_lead_internal(
  uuid, text, jsonb, jsonb, text, text, timestamptz, boolean
) TO service_role;

COMMENT ON FUNCTION public.capture_assistant_lead_internal(
  uuid, text, jsonb, jsonb, text, text, timestamptz, boolean
) IS
  'Transacción interna para crear prospectos del asistente público; no actualiza prospectos existentes, aplica idempotencia y limita tres solicitudes por contacto cada 15 minutos.';

COMMIT;
