-- QA de preparación del puntero reversible V2.
-- SOLO LECTURA: no publica, no hace rollback, no modifica datos.
-- Ejecutar únicamente después de aplicar:
--   1) 20260802233000_version_catalog_price_v2_shadow_tables.sql
--   2) 20260802235500_prepare_catalog_price_v2_releases.sql
-- y antes de cualquier cutover o Publish.

BEGIN;
SET TRANSACTION READ ONLY;

-- ============================================================================
-- A1. Objetos esperados
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.catalog_price_cache_v2_generations') IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing catalog_price_cache_v2_generations';
  END IF;

  IF to_regclass('public.catalog_price_cache_v2_shadow') IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing catalog_price_cache_v2_shadow';
  END IF;

  IF to_regclass('public.catalog_price_v2_releases') IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing catalog_price_v2_releases';
  END IF;

  IF to_regclass('public.catalog_price_v2_current_prices') IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing catalog_price_v2_current_prices';
  END IF;

  IF to_regprocedure(
    'public.publish_catalog_price_v2_generation(uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing publish function';
  END IF;

  IF to_regprocedure(
    'public.rollback_catalog_price_v2_to_legacy()'
  ) IS NULL THEN
    RAISE EXCEPTION 'A1_FAIL: missing rollback function';
  END IF;
END;
$$;

-- ============================================================================
-- A2. Release vacía y puntero apagado
-- ============================================================================

DO $$
DECLARE
  v_release_rows bigint;
  v_current_rows bigint;
  v_current_price_rows bigint;
BEGIN
  SELECT count(*)
  INTO v_release_rows
  FROM public.catalog_price_v2_releases;

  SELECT count(*)
  INTO v_current_rows
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  SELECT count(*)
  INTO v_current_price_rows
  FROM public.catalog_price_v2_current_prices;

  IF v_release_rows <> 0 THEN
    RAISE EXCEPTION
      'A2_FAIL: releases table must be empty before cutover; found %',
      v_release_rows;
  END IF;

  IF v_current_rows <> 0 THEN
    RAISE EXCEPTION
      'A2_FAIL: current releases must be zero before cutover; found %',
      v_current_rows;
  END IF;

  IF v_current_price_rows <> 0 THEN
    RAISE EXCEPTION
      'A2_FAIL: current prices view must be empty before cutover; found %',
      v_current_price_rows;
  END IF;
END;
$$;

-- ============================================================================
-- A3. Generación certificada y shadow intactos
-- ============================================================================

DO $$
DECLARE
  v_generation record;
  v_shadow_rows bigint;
  v_distinct_products bigint;
  v_duplicate_products bigint;
  v_price_contract_violations bigint;
BEGIN
  SELECT
    g.id,
    g.mode,
    g.status,
    g.candidate_count,
    g.processed_count,
    g.priced_count,
    g.request_quote_count,
    g.unavailable_count,
    g.error_count,
    g.unresolved_count
  INTO v_generation
  FROM public.catalog_price_cache_v2_generations AS g
  WHERE g.id = '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid;

  IF v_generation.id IS NULL THEN
    RAISE EXCEPTION 'A3_FAIL: certified generation not found';
  END IF;

  IF v_generation.mode <> 'shadow_write'
     OR v_generation.status <> 'certified'
     OR v_generation.candidate_count <> 1524
     OR v_generation.processed_count <> 1524
     OR v_generation.priced_count <> 1505
     OR v_generation.request_quote_count <> 19
     OR v_generation.unavailable_count <> 0
     OR v_generation.error_count <> 0
     OR v_generation.unresolved_count <> 0
  THEN
    RAISE EXCEPTION
      'A3_FAIL: certified generation counters or status changed';
  END IF;

  SELECT
    count(*),
    count(DISTINCT s.product_id),
    count(*) - count(DISTINCT s.product_id),
    count(*) FILTER (
      WHERE
        (
          s.public_price_status = 'priced'
          AND (
            s.price_before_tax_mxn IS NULL
            OR s.price_before_tax_mxn <= 0
            OR s.minimum_quantity IS NULL
            OR s.minimum_quantity <= 0
          )
        )
        OR
        (
          s.public_price_status IN ('request_quote', 'unavailable')
          AND s.price_before_tax_mxn IS NOT NULL
        )
    )
  INTO
    v_shadow_rows,
    v_distinct_products,
    v_duplicate_products,
    v_price_contract_violations
  FROM public.catalog_price_cache_v2_shadow AS s
  WHERE s.generation_id =
    '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid;

  IF v_shadow_rows <> 1524
     OR v_distinct_products <> 1524
     OR v_duplicate_products <> 0
     OR v_price_contract_violations <> 0
  THEN
    RAISE EXCEPTION
      'A3_FAIL: shadow integrity changed rows=% distinct=% duplicates=% violations=%',
      v_shadow_rows,
      v_distinct_products,
      v_duplicate_products,
      v_price_contract_violations;
  END IF;
END;
$$;

-- ============================================================================
-- A4. Seguridad de tablas internas y RPCs
-- ============================================================================

DO $$
DECLARE
  v_policy_count bigint;
  v_publish_security_definer boolean;
  v_rollback_security_definer boolean;
  v_publish_search_path text[];
  v_rollback_search_path text[];
BEGIN
  SELECT count(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'catalog_price_cache_v2_generations',
      'catalog_price_cache_v2_shadow',
      'catalog_price_v2_releases'
    );

  IF v_policy_count <> 0 THEN
    RAISE EXCEPTION
      'A4_FAIL: internal V2 tables must have zero policies; found %',
      v_policy_count;
  END IF;

  IF has_table_privilege(
       'anon',
       'public.catalog_price_cache_v2_generations',
       'SELECT'
     )
     OR has_table_privilege(
       'authenticated',
       'public.catalog_price_cache_v2_generations',
       'SELECT'
     )
     OR has_table_privilege(
       'anon',
       'public.catalog_price_cache_v2_shadow',
       'SELECT'
     )
     OR has_table_privilege(
       'authenticated',
       'public.catalog_price_cache_v2_shadow',
       'SELECT'
     )
     OR has_table_privilege(
       'anon',
       'public.catalog_price_v2_releases',
       'SELECT'
     )
     OR has_table_privilege(
       'authenticated',
       'public.catalog_price_v2_releases',
       'SELECT'
     )
  THEN
    RAISE EXCEPTION
      'A4_FAIL: anon/authenticated have direct SELECT on internal V2 tables';
  END IF;

  IF NOT has_table_privilege(
    'anon',
    'public.catalog_price_v2_current_prices',
    'SELECT'
  ) OR NOT has_table_privilege(
    'authenticated',
    'public.catalog_price_v2_current_prices',
    'SELECT'
  ) THEN
    RAISE EXCEPTION
      'A4_FAIL: safe public current-prices view lacks SELECT grants';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.publish_catalog_price_v2_generation(uuid)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'anon',
       'public.rollback_catalog_price_v2_to_legacy()',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION
      'A4_FAIL: anon can execute publish or rollback';
  END IF;

  IF NOT has_function_privilege(
       'authenticated',
       'public.publish_catalog_price_v2_generation(uuid)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'authenticated',
       'public.rollback_catalog_price_v2_to_legacy()',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION
      'A4_FAIL: authenticated lacks RPC EXECUTE grants';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO v_publish_security_definer, v_publish_search_path
  FROM pg_proc AS p
  WHERE p.oid =
    'public.publish_catalog_price_v2_generation(uuid)'::regprocedure;

  SELECT p.prosecdef, p.proconfig
  INTO v_rollback_security_definer, v_rollback_search_path
  FROM pg_proc AS p
  WHERE p.oid =
    'public.rollback_catalog_price_v2_to_legacy()'::regprocedure;

  IF NOT v_publish_security_definer
     OR NOT v_rollback_security_definer
  THEN
    RAISE EXCEPTION
      'A4_FAIL: publish and rollback must be SECURITY DEFINER';
  END IF;

  IF NOT (
    'search_path=public, pg_temp' = ANY(v_publish_search_path)
  ) OR NOT (
    'search_path=public, pg_temp' = ANY(v_rollback_search_path)
  ) THEN
    RAISE EXCEPTION
      'A4_FAIL: publish or rollback has unexpected search_path';
  END IF;
END;
$$;

-- ============================================================================
-- A5. La vista expone únicamente el contrato público mínimo
-- ============================================================================

DO $$
DECLARE
  v_columns text[];
BEGIN
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'catalog_price_v2_current_prices';

  IF v_columns IS DISTINCT FROM ARRAY[
    'product_id',
    'generation_id',
    'rule_set_id',
    'public_price_status',
    'price_before_tax_mxn',
    'currency',
    'minimum_quantity',
    'computed_at'
  ]::text[] THEN
    RAISE EXCEPTION
      'A5_FAIL: safe current-prices view has unexpected columns';
  END IF;
END;
$$;

-- ============================================================================
-- A6. Legacy y rule sets continúan intactos
-- ============================================================================

DO $$
DECLARE
  v_cache_rows bigint;
  v_active_rule_sets bigint;
  v_draft_is_active boolean;
BEGIN
  SELECT count(*)
  INTO v_cache_rows
  FROM public.catalog_price_cache
  WHERE producto_b2b_id IS NOT NULL;

  SELECT count(*)
  INTO v_active_rule_sets
  FROM public.pricing_rule_sets
  WHERE is_active = true;

  SELECT is_active
  INTO v_draft_is_active
  FROM public.pricing_rule_sets
  WHERE version = '2026-01-v2-draft';

  IF v_cache_rows <> 1524 THEN
    RAISE EXCEPTION
      'A6_FAIL: catalog_price_cache candidate rows changed; found %',
      v_cache_rows;
  END IF;

  IF v_active_rule_sets <> 1 THEN
    RAISE EXCEPTION
      'A6_FAIL: expected exactly one active rule set; found %',
      v_active_rule_sets;
  END IF;

  IF v_draft_is_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'A6_FAIL: 2026-01-v2-draft must remain inactive';
  END IF;
END;
$$;

-- ============================================================================
-- Resultado visible
-- ============================================================================

SELECT
  'PASS'::text AS result,
  0::bigint AS current_releases,
  (SELECT count(*)
   FROM public.catalog_price_v2_current_prices) AS current_price_rows,
  (SELECT count(*)
   FROM public.catalog_price_cache_v2_shadow
   WHERE generation_id =
     '45c79265-77bc-416b-b6e0-96d2b37a6e1c'::uuid) AS certified_shadow_rows,
  (SELECT count(*)
   FROM public.catalog_price_cache
   WHERE producto_b2b_id IS NOT NULL) AS legacy_cache_rows,
  (SELECT count(*)
   FROM public.pricing_rule_sets
   WHERE is_active = true) AS active_rule_sets;

ROLLBACK;
