-- Assertions estáticas de la fase expand del backend de cotizaciones V2.
-- SOLO LECTURA. No crea leads, no modifica datos y termina con ROLLBACK.

BEGIN;
SET TRANSACTION READ ONLY;

-- ============================================================================
-- E1. Columnas, tipos y contrato de metadata
-- ============================================================================

DO $$
DECLARE
  v_columns text[];
  v_check_definition text;
BEGIN
  SELECT array_agg(
    format('%s:%s:%s', column_name, udt_name, is_nullable)
    ORDER BY column_name
  )
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'cotizaciones_leads'
    AND column_name IN (
      'public_request_id',
      'public_request_fingerprint',
      'public_submission',
      'public_email_hash',
      'public_phone_hash'
    );

  IF v_columns IS DISTINCT FROM ARRAY[
    'public_email_hash:text:YES',
    'public_phone_hash:text:YES',
    'public_request_fingerprint:text:YES',
    'public_request_id:uuid:YES',
    'public_submission:bool:NO'
  ]::text[] THEN
    RAISE EXCEPTION
      'E1_FAIL: public quote metadata column drift: %',
      v_columns;
  END IF;

  SELECT pg_get_constraintdef(con.oid, true)
  INTO v_check_definition
  FROM pg_catalog.pg_constraint AS con
  WHERE con.conrelid = 'public.cotizaciones_leads'::regclass
    AND con.conname =
      'cotizaciones_leads_public_request_contract_check';

  IF v_check_definition IS NULL
     OR v_check_definition NOT ILIKE '%public_submission%'
     OR v_check_definition NOT ILIKE '%public_request_id IS NOT NULL%'
     OR v_check_definition NOT ILIKE '%public_request_fingerprint IS NOT NULL%'
     OR v_check_definition NOT ILIKE '%public_email_hash IS NOT NULL%'
     OR v_check_definition NOT ILIKE '%public_phone_hash IS NOT NULL%'
  THEN
    RAISE EXCEPTION
      'E1_FAIL: public request check constraint is missing or unsafe';
  END IF;
END;
$$;

-- ============================================================================
-- E2. Policies transitorias: compatibilidad legacy sin poisoning del RPC
-- ============================================================================

DO $$
DECLARE
  v_legacy_check text;
  v_staff_check text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cotizaciones_leads'
      AND policyname IN (
        'Inserción pública de cotizaciones',
        'anon_insert_cotizaciones_leads'
      )
  ) THEN
    RAISE EXCEPTION
      'E2_FAIL: broad legacy insert policies still exist';
  END IF;

  SELECT with_check
  INTO v_legacy_check
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'cotizaciones_leads'
    AND policyname = 'legacy_public_insert_cotizaciones_leads'
    AND cmd = 'INSERT'
    AND roles @> ARRAY['anon', 'authenticated']::name[];

  IF v_legacy_check IS NULL
     OR (
       v_legacy_check NOT ILIKE '%public_submission = false%'
       AND v_legacy_check NOT ILIKE '%NOT public_submission%'
     )
     OR v_legacy_check NOT ILIKE '%public_request_id IS NULL%'
     OR v_legacy_check NOT ILIKE '%public_request_fingerprint IS NULL%'
     OR v_legacy_check NOT ILIKE '%public_email_hash IS NULL%'
     OR v_legacy_check NOT ILIKE '%public_phone_hash IS NULL%'
     OR v_legacy_check NOT ILIKE '%assigned_to IS NULL%'
     OR v_legacy_check NOT ILIKE '%NUEVA%'
  THEN
    RAISE EXCEPTION
      'E2_FAIL: transitional public INSERT policy is missing or unsafe: %',
      v_legacy_check;
  END IF;

  SELECT with_check
  INTO v_staff_check
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'cotizaciones_leads'
    AND policyname = 'staff_insert_cotizaciones_leads'
    AND cmd = 'INSERT'
    AND roles @> ARRAY['authenticated']::name[];

  IF v_staff_check IS NULL
     OR v_staff_check NOT ILIKE '%is_staff%'
     OR v_staff_check NOT ILIKE '%auth.uid%'
  THEN
    RAISE EXCEPTION
      'E2_FAIL: staff INSERT policy is missing or unsafe: %',
      v_staff_check;
  END IF;

  IF NOT has_table_privilege(
       'anon',
       'public.cotizaciones_leads',
       'INSERT'
     )
     OR NOT has_table_privilege(
       'authenticated',
       'public.cotizaciones_leads',
       'INSERT'
     )
  THEN
    RAISE EXCEPTION
      'E2_FAIL: expand phase must preserve legacy INSERT grants';
  END IF;
END;
$$;

-- ============================================================================
-- E3. RPCs, SECURITY DEFINER, search_path y grants
-- ============================================================================

DO $$
DECLARE
  v_submit_config text[];
  v_catalog_config text[];
  v_submit_definer boolean;
  v_catalog_definer boolean;
BEGIN
  IF to_regprocedure(
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'E3_FAIL: submit_public_quote_request is missing';
  END IF;

  IF to_regprocedure(
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'E3_FAIL: catalog_search_products_v2 is missing';
  END IF;

  SELECT p.proconfig, p.prosecdef
  INTO v_submit_config, v_submit_definer
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid =
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)'::regprocedure;

  SELECT p.proconfig, p.prosecdef
  INTO v_catalog_config, v_catalog_definer
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid =
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)'::regprocedure;

  IF NOT v_submit_definer
     OR NOT ('search_path=public, pg_temp' = ANY(v_submit_config))
  THEN
    RAISE EXCEPTION
      'E3_FAIL: submit RPC security contract is unsafe';
  END IF;

  IF NOT v_catalog_definer
     OR NOT ('search_path=public, pg_temp' = ANY(v_catalog_config))
  THEN
    RAISE EXCEPTION
      'E3_FAIL: catalog RPC security contract is unsafe';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'E3_FAIL: submit RPC grants are incorrect';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'E3_FAIL: catalog RPC grants are incorrect';
  END IF;
END;
$$;

-- ============================================================================
-- E4. Índices de idempotencia y rate limit
-- ============================================================================

DO $$
DECLARE
  v_idempotency_index text;
  v_email_index text;
  v_phone_index text;
BEGIN
  SELECT indexdef
  INTO v_idempotency_index
  FROM pg_catalog.pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'cotizaciones_leads'
    AND indexname =
      'cotizaciones_leads_public_request_id_unique_idx';

  IF v_idempotency_index IS NULL
     OR v_idempotency_index NOT ILIKE 'CREATE UNIQUE INDEX%'
     OR v_idempotency_index NOT ILIKE '%(public_request_id)%'
     OR v_idempotency_index NOT ILIKE '%public_request_id IS NOT NULL%'
  THEN
    RAISE EXCEPTION
      'E4_FAIL: idempotency unique index is missing or invalid';
  END IF;

  SELECT indexdef
  INTO v_email_index
  FROM pg_catalog.pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'cotizaciones_leads'
    AND indexname = 'cotizaciones_leads_public_email_rate_idx';

  SELECT indexdef
  INTO v_phone_index
  FROM pg_catalog.pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'cotizaciones_leads'
    AND indexname = 'cotizaciones_leads_public_phone_rate_idx';

  IF v_email_index IS NULL
     OR v_email_index NOT ILIKE '%public_email_hash%'
     OR v_email_index NOT ILIKE '%created_at DESC%'
     OR v_email_index NOT ILIKE '%public_submission = true%'
  THEN
    RAISE EXCEPTION
      'E4_FAIL: email rate-limit index is missing or invalid';
  END IF;

  IF v_phone_index IS NULL
     OR v_phone_index NOT ILIKE '%public_phone_hash%'
     OR v_phone_index NOT ILIKE '%created_at DESC%'
     OR v_phone_index NOT ILIKE '%public_submission = true%'
  THEN
    RAISE EXCEPTION
      'E4_FAIL: phone rate-limit index is missing or invalid';
  END IF;
END;
$$;

-- ============================================================================
-- E5. Contratos públicos mínimos y ausencia de campos internos
-- ============================================================================

DO $$
DECLARE
  v_catalog_result text;
  v_submit_result text;
BEGIN
  SELECT pg_get_function_result(
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)'::regprocedure
  )
  INTO v_catalog_result;

  IF v_catalog_result NOT ILIKE '%public_price_status%'
     OR v_catalog_result NOT ILIKE '%precio_desde_mxn%'
     OR v_catalog_result NOT ILIKE '%minimum_quantity%'
     OR v_catalog_result NOT ILIKE '%pricing_generation_id%'
     OR v_catalog_result NOT ILIKE '%total_count%'
  THEN
    RAISE EXCEPTION
      'E5_FAIL: catalog V2 return contract is incomplete';
  END IF;

  IF v_catalog_result ILIKE '%cost%'
     OR v_catalog_result ILIKE '%multiplier%'
     OR v_catalog_result ILIKE '%provider%'
     OR v_catalog_result ILIKE '%source_oferta%'
     OR v_catalog_result ILIKE '%warning%'
  THEN
    RAISE EXCEPTION
      'E5_FAIL: catalog V2 exposes internal fields';
  END IF;

  SELECT pg_get_function_result(
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)'::regprocedure
  )
  INTO v_submit_result;

  IF v_submit_result NOT ILIKE '%quote_id%'
     OR v_submit_result NOT ILIKE '%reused%'
     OR v_submit_result NOT ILIKE '%total_estimated%'
     OR v_submit_result NOT ILIKE '%request_quote_item_count%'
  THEN
    RAISE EXCEPTION
      'E5_FAIL: submit RPC return contract is incomplete';
  END IF;
END;
$$;

-- ============================================================================
-- E6. Sin release current: catálogo V2 debe preservar exactamente legacy
-- ============================================================================

DO $$
DECLARE
  v_release_count bigint;
  v_catalog_mismatch bigint;
  v_v2_contract_mismatch bigint;
BEGIN
  SELECT count(*)
  INTO v_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  IF v_release_count <> 0 THEN
    RAISE EXCEPTION
      'E6_FAIL: expected no current release during expand QA';
  END IF;

  WITH legacy AS (
    SELECT
      id,
      id_interno,
      sku_base,
      nombre,
      descripcion,
      imagenes,
      precio_desde_mxn,
      categoria_slug,
      categoria_nombre,
      subcategoria_slug,
      subcategoria_nombre,
      relevance,
      total_count
    FROM public.catalog_search_products(
      NULL, NULL, NULL, NULL, NULL, 24, 0, NULL
    )
  ),
  v2 AS (
    SELECT
      id,
      id_interno,
      sku_base,
      nombre,
      descripcion,
      imagenes,
      precio_desde_mxn,
      categoria_slug,
      categoria_nombre,
      subcategoria_slug,
      subcategoria_nombre,
      relevance,
      total_count
    FROM public.catalog_search_products_v2(
      NULL, NULL, NULL, NULL, NULL, 24, 0, NULL
    )
  ),
  differences AS (
    (SELECT * FROM legacy EXCEPT ALL SELECT * FROM v2)
    UNION ALL
    (SELECT * FROM v2 EXCEPT ALL SELECT * FROM legacy)
  )
  SELECT count(*)
  INTO v_catalog_mismatch
  FROM differences;

  IF v_catalog_mismatch <> 0 THEN
    RAISE EXCEPTION
      'E6_FAIL: catalog V2 does not preserve legacy before cutover; differences=%',
      v_catalog_mismatch;
  END IF;

  SELECT count(*)
  INTO v_v2_contract_mismatch
  FROM public.catalog_search_products_v2(
    NULL, NULL, NULL, NULL, NULL, 24, 0, NULL
  ) AS c
  WHERE
    (
      c.precio_desde_mxn > 0
      AND (
        c.public_price_status <> 'priced'
        OR c.currency <> 'MXN'
        OR c.minimum_quantity <> 1
        OR c.pricing_generation_id IS NOT NULL
      )
    )
    OR (
      c.precio_desde_mxn IS NULL
      AND (
        c.public_price_status <> 'request_quote'
        OR c.minimum_quantity IS NOT NULL
        OR c.pricing_generation_id IS NOT NULL
      )
    );

  IF v_v2_contract_mismatch <> 0 THEN
    RAISE EXCEPTION
      'E6_FAIL: catalog V2 public metadata mismatch; rows=%',
      v_v2_contract_mismatch;
  END IF;
END;
$$;

-- ============================================================================
-- E7. Estado certificado intacto y sin cutover
-- ============================================================================

DO $$
DECLARE
  v_release_count bigint;
  v_current_count bigint;
  v_shadow_count bigint;
  v_distinct_count bigint;
  v_generation record;
BEGIN
  SELECT count(*)
  INTO v_release_count
  FROM public.catalog_price_v2_releases;

  SELECT count(*)
  INTO v_current_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  SELECT count(*), count(DISTINCT product_id)
  INTO v_shadow_count, v_distinct_count
  FROM public.catalog_price_cache_v2_shadow
  WHERE generation_id =
    '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid;

  SELECT
    status,
    processed_count,
    priced_count,
    request_quote_count,
    unavailable_count,
    error_count,
    unresolved_count
  INTO v_generation
  FROM public.catalog_price_cache_v2_generations
  WHERE id = '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid;

  IF v_release_count <> 0 OR v_current_count <> 0 THEN
    RAISE EXCEPTION
      'E7_FAIL: expand migration must not publish a release';
  END IF;

  IF v_shadow_count <> 1524 OR v_distinct_count <> 1524 THEN
    RAISE EXCEPTION
      'E7_FAIL: certified shadow counts changed';
  END IF;

  IF v_generation.status IS DISTINCT FROM 'certified'
     OR v_generation.processed_count IS DISTINCT FROM 1524
     OR v_generation.priced_count IS DISTINCT FROM 1505
     OR v_generation.request_quote_count IS DISTINCT FROM 19
     OR v_generation.unavailable_count IS DISTINCT FROM 0
     OR v_generation.error_count IS DISTINCT FROM 0
     OR v_generation.unresolved_count IS DISTINCT FROM 0
  THEN
    RAISE EXCEPTION
      'E7_FAIL: certified generation counters changed';
  END IF;
END;
$$;

SELECT
  'PASS'::text AS result,
  to_regprocedure(
    'public.submit_public_quote_request(uuid,jsonb,text,jsonb)'
  ) IS NOT NULL AS submit_rpc_exists,
  to_regprocedure(
    'public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)'
  ) IS NOT NULL AS catalog_rpc_exists,
  (
    SELECT count(*)
    FROM public.catalog_price_v2_releases
  ) AS release_rows,
  (
    SELECT count(*)
    FROM public.catalog_price_cache_v2_shadow
    WHERE generation_id =
      '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid
  ) AS certified_shadow_rows,
  (
    SELECT count(*)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cotizaciones_leads'
      AND policyname = 'legacy_public_insert_cotizaciones_leads'
  ) AS transitional_public_insert_policy_count,
  (
    SELECT count(*)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cotizaciones_leads'
      AND policyname = 'staff_insert_cotizaciones_leads'
  ) AS staff_insert_policy_count;

ROLLBACK;
