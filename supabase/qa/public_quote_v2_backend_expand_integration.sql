-- Integración transaccional del RPC público de cotizaciones.
-- Crea filas de prueba únicamente dentro de esta transacción y termina
-- siempre con ROLLBACK. No envía correos ni ejecuta Edge Functions.

BEGIN;

DO $$
DECLARE
  v_product_id uuid;
  v_request_id uuid := gen_random_uuid();
  v_second_request_id uuid := gen_random_uuid();
  v_third_request_id uuid := gen_random_uuid();
  v_blocked_request_id uuid := gen_random_uuid();
  v_unique_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_numeric_suffix text;
  v_contact jsonb;
  v_items jsonb;
  v_conflicting_items jsonb;
  v_first record;
  v_second record;
  v_rate_second record;
  v_rate_third record;
  v_saved public.cotizaciones_leads%ROWTYPE;
  v_saved_line jsonb;
  v_before_count bigint;
  v_after_count bigint;
BEGIN
  SELECT pp.id
  INTO v_product_id
  FROM public.productos_publicos AS pp
  WHERE pp.precio_desde_mxn IS NOT NULL
    AND pp.precio_desde_mxn > 0
  ORDER BY pp.id
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION
      'I1_FAIL: no priced public product available';
  END IF;

  v_numeric_suffix := substr(
    regexp_replace(v_unique_suffix, '[^0-9]', '', 'g') || '00000000',
    1,
    8
  );

  v_contact := jsonb_build_object(
    'name', 'QA Public Quote',
    'company', 'QA Transaction Only',
    'email', 'qa+' || v_unique_suffix || '@example.test',
    'phone', '+52 55 ' || v_numeric_suffix
  );

  v_items := jsonb_build_array(
    jsonb_build_object(
      'product_id', v_product_id,
      'quantity', 100,
      'color', 'QA',
      'personalization', jsonb_build_object(
        'type', 'advisor_review',
        'label', 'Por definir con asesor',
        'message', 'Prueba transaccional',
        'requires_review', true
      )
    )
  );

  SELECT count(*)
  INTO v_before_count
  FROM public.cotizaciones_leads;

  SELECT *
  INTO v_first
  FROM public.submit_public_quote_request(
    v_request_id,
    v_contact,
    'individual',
    v_items
  );

  IF v_first.quote_id IS NULL
     OR v_first.reused IS DISTINCT FROM false
     OR v_first.item_count IS DISTINCT FROM 1
     OR v_first.request_quote_item_count IS DISTINCT FROM 0
     OR v_first.total_estimated IS NULL
     OR v_first.total_estimated <= 0
  THEN
    RAISE EXCEPTION
      'I1_FAIL: first submission contract mismatch';
  END IF;

  SELECT *
  INTO v_second
  FROM public.submit_public_quote_request(
    v_request_id,
    v_contact,
    'individual',
    v_items
  );

  IF v_second.quote_id IS DISTINCT FROM v_first.quote_id
     OR v_second.reused IS DISTINCT FROM true
     OR v_second.total_estimated
        IS DISTINCT FROM v_first.total_estimated
  THEN
    RAISE EXCEPTION
      'I2_FAIL: idempotent retry did not reuse the lead';
  END IF;

  v_conflicting_items := jsonb_set(
    v_items,
    '{0,quantity}',
    '101'::jsonb
  );

  BEGIN
    PERFORM *
    FROM public.submit_public_quote_request(
      v_request_id,
      v_contact,
      'individual',
      v_conflicting_items
    );

    RAISE EXCEPTION 'I3_FAIL: conflicting idempotency payload was accepted';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'idempotency_key_conflict' THEN
        RAISE;
      END IF;
  END;

  SELECT *
  INTO v_saved
  FROM public.cotizaciones_leads
  WHERE id = v_first.quote_id;

  IF NOT FOUND
     OR v_saved.public_submission IS DISTINCT FROM true
     OR v_saved.estado_cotizacion IS DISTINCT FROM 'NUEVA'
     OR v_saved.assigned_to IS NOT NULL
     OR v_saved.public_request_id IS DISTINCT FROM v_request_id
  THEN
    RAISE EXCEPTION
      'I4_FAIL: persisted public lead contract mismatch';
  END IF;

  IF jsonb_array_length(v_saved.articulos_cotizados) <> 1 THEN
    RAISE EXCEPTION
      'I5_FAIL: expected one server-derived line';
  END IF;

  v_saved_line := v_saved.articulos_cotizados -> 0;

  IF v_saved_line ->> 'producto_id'
       IS DISTINCT FROM v_product_id::text
     OR v_saved_line ->> 'public_price_status'
        IS DISTINCT FROM 'priced'
     OR COALESCE(
          (v_saved_line ->> 'precio_unitario_estimado')::numeric,
          0
        ) <= 0
     OR (v_saved_line ->> 'subtotal')::numeric
        IS DISTINCT FROM v_first.total_estimated
     OR v_saved_line ? 'precio_cliente'
     OR v_saved_line ? 'subtotal_cliente'
  THEN
    RAISE EXCEPTION
      'I5_FAIL: server-derived line contract mismatch';
  END IF;

  -- La primera solicitud ya consume 1 de 3. Dos solicitudes nuevas deben
  -- aceptarse y la cuarta debe ser bloqueada.
  SELECT *
  INTO v_rate_second
  FROM public.submit_public_quote_request(
    v_second_request_id,
    v_contact,
    'individual',
    v_items
  );

  SELECT *
  INTO v_rate_third
  FROM public.submit_public_quote_request(
    v_third_request_id,
    v_contact,
    'individual',
    v_items
  );

  IF v_rate_second.reused IS DISTINCT FROM false
     OR v_rate_third.reused IS DISTINCT FROM false
  THEN
    RAISE EXCEPTION
      'I6_FAIL: rate-limit setup submissions were not created';
  END IF;

  BEGIN
    PERFORM *
    FROM public.submit_public_quote_request(
      v_blocked_request_id,
      v_contact,
      'individual',
      v_items
    );

    RAISE EXCEPTION 'I6_FAIL: fourth submission bypassed rate limit';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'rate_limit_exceeded' THEN
        RAISE;
      END IF;
  END;

  SELECT count(*)
  INTO v_after_count
  FROM public.cotizaciones_leads;

  IF v_after_count <> v_before_count + 3 THEN
    RAISE EXCEPTION
      'I7_FAIL: expected exactly three transactional test rows';
  END IF;
END;
$$;

SELECT
  'PASS'::text AS result,
  'transaction_will_rollback'::text AS persistence,
  (
    SELECT count(*)
    FROM public.catalog_price_v2_releases
    WHERE is_current = true
  ) AS current_releases;

ROLLBACK;
