-- RB3-A: contrato de persistencia para solicitudes Route B.
--
-- Esta migración solo prepara el contrato en Git. No activa el flujo Route B,
-- no modifica submit_public_quote_request y no crea índices ni triggers nuevos.

BEGIN;

-- ============================================================================
-- 1. Delta estructural mínimo
-- ============================================================================

ALTER TABLE public.cotizaciones_leads
  ADD COLUMN IF NOT EXISTS public_request_type text NOT NULL DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS consent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS privacy_version text NULL,
  ADD COLUMN IF NOT EXISTS privacy_url text NULL,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

ALTER TABLE public.cotizaciones_leads
  ALTER COLUMN public_request_type SET DEFAULT 'quote',
  ALTER COLUMN public_request_type SET NOT NULL,
  ALTER COLUMN marketing_consent SET DEFAULT false,
  ALTER COLUMN marketing_consent SET NOT NULL;

COMMENT ON COLUMN public.cotizaciones_leads.public_request_type IS
  'Tipo de solicitud pública: quote o project_brief. El valor histórico por defecto es quote.';

COMMENT ON COLUMN public.cotizaciones_leads.consent_at IS
  'Fecha/hora server-side del consentimiento de Route B.';

COMMENT ON COLUMN public.cotizaciones_leads.privacy_version IS
  'Versión del aviso activo usada por el boundary server-side de Route B.';

COMMENT ON COLUMN public.cotizaciones_leads.privacy_url IS
  'URL del aviso activo usada por el boundary server-side de Route B.';

COMMENT ON COLUMN public.cotizaciones_leads.marketing_consent IS
  'Consentimiento separado de marketing; permanece false en RB3 V1.';

-- ============================================================================
-- 2. Tipo de solicitud y contrato condicionado
-- ============================================================================

ALTER TABLE public.cotizaciones_leads
  DROP CONSTRAINT IF EXISTS cotizaciones_leads_public_request_type_check;

ALTER TABLE public.cotizaciones_leads
  ADD CONSTRAINT cotizaciones_leads_public_request_type_check
  CHECK (public_request_type IN ('quote', 'project_brief'));

ALTER TABLE public.cotizaciones_leads
  DROP CONSTRAINT IF EXISTS cotizaciones_leads_public_request_contract_check;

ALTER TABLE public.cotizaciones_leads
  ADD CONSTRAINT cotizaciones_leads_public_request_contract_check
  CHECK (
    (
      public_submission = false
      AND public_request_type = 'quote'
    )
    OR
    (
      public_submission = true
      AND public_request_type = 'quote'
      AND public_request_id IS NOT NULL
      AND public_request_fingerprint IS NOT NULL
      AND char_length(public_request_fingerprint) = 32
      AND public_email_hash IS NOT NULL
      AND char_length(public_email_hash) = 32
      AND public_phone_hash IS NOT NULL
      AND char_length(public_phone_hash) = 32
    )
    OR
    (
      public_submission = true
      AND public_request_type = 'project_brief'
      AND public_request_id IS NOT NULL
      AND public_request_fingerprint IS NOT NULL
      AND char_length(public_request_fingerprint) = 32
      AND (public_email_hash IS NOT NULL OR public_phone_hash IS NOT NULL)
      AND (public_email_hash IS NULL OR char_length(public_email_hash) = 32)
      AND (public_phone_hash IS NULL OR char_length(public_phone_hash) = 32)
      AND consent_at IS NOT NULL
      AND privacy_version IS NOT NULL
      AND btrim(privacy_version) <> ''
      AND privacy_url IS NOT NULL
      AND btrim(privacy_url) <> ''
      AND marketing_consent = false
    )
  );

-- ============================================================================
-- 3. Aislamiento del insert público legacy
-- ============================================================================

DROP POLICY IF EXISTS legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads;

CREATE POLICY legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public_submission = false
  AND public_request_type = 'quote'
  AND public_request_id IS NULL
  AND public_request_fingerprint IS NULL
  AND public_email_hash IS NULL
  AND public_phone_hash IS NULL
  AND COALESCE(estado_cotizacion, 'NUEVA') = 'NUEVA'
  AND assigned_to IS NULL
);

COMMENT ON POLICY legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads IS
  'Compatibilidad temporal con el frontend legacy: solo inserta quote y nunca project_brief.';

-- ============================================================================
-- 4. RPC interna server-side para project_brief
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_project_brief_internal(
  p_request_id uuid,
  p_request_fingerprint text,
  p_datos_cliente jsonb,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_privacy_consent boolean DEFAULT false
)
RETURNS TABLE (
  quote_id uuid,
  result text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_existing public.cotizaciones_leads%ROWTYPE;
  v_quote_id uuid;
  v_email text;
  v_phone_digits text;
  v_email_hash text;
  v_phone_hash text;
  v_fingerprint text;
  v_idempotency_lock bigint;
  v_email_lock bigint;
  v_phone_lock bigint;
  v_recent_count integer;
  v_privacy_active text;
  v_privacy_version text;
  v_privacy_url text;
  v_datos_cliente jsonb;
BEGIN
  -- El gate y la metadata de privacidad viven en configuración server-side.
  -- La ausencia de configuración activa mantiene la escritura bloqueada.
  v_privacy_active := lower(
    coalesce(current_setting('app.pe_privacy_active', true), 'false')
  );
  v_privacy_version := nullif(
    btrim(current_setting('app.pe_privacy_version', true)),
    ''
  );
  v_privacy_url := nullif(
    btrim(current_setting('app.pe_privacy_url', true)),
    ''
  );

  IF v_privacy_active <> 'true'
     OR v_privacy_version IS NULL
     OR v_privacy_url IS NULL
  THEN
    RAISE EXCEPTION 'privacy_not_active'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id_required'
      USING ERRCODE = '22004';
  END IF;

  v_fingerprint := nullif(btrim(p_request_fingerprint), '');

  IF v_fingerprint IS NULL OR char_length(v_fingerprint) <> 32 THEN
    RAISE EXCEPTION 'invalid_request_fingerprint'
      USING ERRCODE = '22023';
  END IF;

  IF p_datos_cliente IS NULL
     OR jsonb_typeof(p_datos_cliente) IS DISTINCT FROM 'object'
  THEN
    RAISE EXCEPTION 'datos_cliente_must_be_object'
      USING ERRCODE = '22023';
  END IF;

  IF p_privacy_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'privacy_consent_required'
      USING ERRCODE = '22023';
  END IF;

  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_phone_digits := nullif(
    regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'),
    ''
  );

  IF v_email IS NULL AND v_phone_digits IS NULL THEN
    RAISE EXCEPTION 'contact_required'
      USING ERRCODE = '22023';
  END IF;

  IF v_email IS NOT NULL
     AND (
       char_length(v_email) < 5
       OR char_length(v_email) > 254
       OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     )
  THEN
    RAISE EXCEPTION 'invalid_contact_email'
      USING ERRCODE = '22023';
  END IF;

  IF v_phone_digits IS NOT NULL
     AND (
       char_length(v_phone_digits) < 10
       OR char_length(v_phone_digits) > 15
     )
  THEN
    RAISE EXCEPTION 'invalid_contact_phone'
      USING ERRCODE = '22023';
  END IF;

  v_email_hash := CASE
    WHEN v_email IS NULL THEN NULL
    ELSE md5(v_email)
  END;

  v_phone_hash := CASE
    WHEN v_phone_digits IS NULL THEN NULL
    ELSE md5(v_phone_digits)
  END;

  -- Se usa la misma familia de lock que Quote V2 para serializar un request_id
  -- compartido entre rutas antes de consultar la fila existente.
  v_idempotency_lock := hashtextextended(
    'public-quote-request:' || p_request_id::text,
    0
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(v_idempotency_lock);

  SELECT *
  INTO v_existing
  FROM public.cotizaciones_leads
  WHERE public_request_id = p_request_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.public_request_fingerprint IS DISTINCT FROM v_fingerprint
       OR v_existing.public_request_type IS DISTINCT FROM 'project_brief'
    THEN
      RAISE EXCEPTION 'idempotency_key_conflict'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT v_existing.id, 'idempotent_replay'::text;
    RETURN;
  END IF;

  -- Rate limit por cada contacto presente. Un replay ya salió antes de este
  -- bloque y no consume cuota adicional.
  IF v_email_hash IS NOT NULL THEN
    v_email_lock := hashtextextended(
      'public-quote-email:' || v_email_hash,
      0
    );
  END IF;

  IF v_phone_hash IS NOT NULL THEN
    v_phone_lock := hashtextextended(
      'public-quote-phone:' || v_phone_hash,
      0
    );
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
  FROM public.cotizaciones_leads
  WHERE public_submission = true
    AND created_at >= now() - interval '15 minutes'
    AND (
      (v_email_hash IS NOT NULL AND public_email_hash = v_email_hash)
      OR
      (v_phone_hash IS NOT NULL AND public_phone_hash = v_phone_hash)
    );

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001';
  END IF;

  -- El cliente no puede inyectar estado, identidad de request ni metadata de
  -- consentimiento dentro de datos_cliente. Esa metadata se escribe aquí.
  v_datos_cliente :=
    jsonb_build_object('source', 'route_b')
    || (
      p_datos_cliente
      - ARRAY[
        'source',
        'email',
        'phone',
        'consent_at',
        'privacy_version',
        'privacy_url',
        'privacy_consent',
        'marketing_consent',
        'public_request_type',
        'public_submission',
        'public_request_id',
        'public_request_fingerprint',
        'public_email_hash',
        'public_phone_hash',
        'articulos_cotizados',
        'total_estimado',
        'estado_cotizacion',
        'assigned_to'
      ]::text[]
    )
    || jsonb_build_object(
      'email', v_email,
      'phone', v_phone_digits
    );

  INSERT INTO public.cotizaciones_leads (
    datos_cliente,
    articulos_cotizados,
    total_estimado,
    estado_cotizacion,
    assigned_to,
    public_request_type,
    consent_at,
    privacy_version,
    privacy_url,
    marketing_consent,
    public_request_id,
    public_request_fingerprint,
    public_submission,
    public_email_hash,
    public_phone_hash
  )
  VALUES (
    v_datos_cliente,
    '[]'::jsonb,
    NULL,
    'NUEVA',
    NULL,
    'project_brief',
    clock_timestamp(),
    v_privacy_version,
    v_privacy_url,
    false,
    p_request_id,
    v_fingerprint,
    true,
    v_email_hash,
    v_phone_hash
  )
  RETURNING id INTO v_quote_id;

  RETURN QUERY
  SELECT v_quote_id, 'created'::text;
END;
$function$;

-- La RPC no es invocable directamente por clientes públicos. El boundary
-- server-side autorizado debe usar el rol service_role tras el gate legal.
REVOKE ALL ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
TO service_role;

COMMENT ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
IS
  'Inserta project_brief de Route B solo desde un boundary server-side con privacy gate activo; aplica idempotencia, hashes y rate limit sin precio ni total.';

COMMIT;
