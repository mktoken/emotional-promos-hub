-- QA del contrato público autoritativo de precio por cantidad.
-- SOLO LECTURA. No publica releases, no ejecuta rollback y no modifica datos.
-- Ejecutar después de aplicar:
--   1) 20260802233000_version_catalog_price_v2_shadow_tables.sql
--   2) 20260802235500_prepare_catalog_price_v2_releases.sql
--   3) 20260803002000_add_public_product_price_quote.sql
-- y antes de cualquier cutover o Publish.

BEGIN;
SET TRANSACTION READ ONLY;

-- ============================================================================
-- Q1. Existencia, seguridad y grants
-- ============================================================================

DO $$
DECLARE
  v_security_definer boolean;
  v_search_path text[];
BEGIN
  IF to_regprocedure(
    'public.get_public_product_price_quote(uuid,integer)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'Q1_FAIL: missing get_public_product_price_quote(uuid, integer)';
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO v_security_definer, v_search_path
  FROM pg_proc AS p
  WHERE p.oid =
    'public.get_public_product_price_quote(uuid,integer)'::regprocedure;

  IF NOT v_security_definer THEN
    RAISE EXCEPTION
      'Q1_FAIL: public price quote function must be SECURITY DEFINER';
  END IF;

  IF NOT (
    'search_path=public, pg_temp' = ANY(v_search_path)
  ) THEN
    RAISE EXCEPTION
      'Q1_FAIL: unexpected search_path';
  END IF;

  IF NOT has_function_privilege(
       'anon',
       'public.get_public_product_price_quote(uuid,integer)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'authenticated',
       'public.get_public_product_price_quote(uuid,integer)',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION
      'Q1_FAIL: anon/authenticated must have EXECUTE';
  END IF;
END;
$$;

-- ============================================================================
-- Q2. Puntero apagado antes del cutover
-- ============================================================================

DO $$
DECLARE
  v_current_releases bigint;
  v_current_prices bigint;
BEGIN
  SELECT count(*)
  INTO v_current_releases
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  SELECT count(*)
  INTO v_current_prices
  FROM public.catalog_price_v2_current_prices;

  IF v_current_releases <> 0 THEN
    RAISE EXCEPTION
      'Q2_FAIL: expected zero current releases; found %',
      v_current_releases;
  END IF;

  IF v_current_prices <> 0 THEN
    RAISE EXCEPTION
      'Q2_FAIL: expected zero current V2 prices; found %',
      v_current_prices;
  END IF;
END;
$$;

-- ============================================================================
-- Q3. Fallback legacy preserva el precio público actual
-- ============================================================================

DO $$
DECLARE
  v_product_id uuid;
  v_legacy_price numeric;
  v_quote record;
BEGIN
  SELECT pp.id, pp.precio_desde_mxn
  INTO v_product_id, v_legacy_price
  FROM public.productos_publicos AS pp
  WHERE pp.precio_desde_mxn IS NOT NULL
    AND pp.precio_desde_mxn > 0
  ORDER BY pp.id
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION
      'Q3_FAIL: no public legacy product with positive price available';
  END IF;

  SELECT *
  INTO v_quote
  FROM public.get_public_product_price_quote(
    v_product_id,
    100
  );

  IF v_quote.public_price_status <> 'priced'
     OR v_quote.price_before_tax_mxn IS DISTINCT FROM round(v_legacy_price, 2)
     OR v_quote.currency <> 'MXN'
     OR v_quote.minimum_quantity <> 1
     OR v_quote.pricing_generation_id IS NOT NULL
     OR v_quote.requested_quantity <> 100
     OR v_quote.is_valid_quantity IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION
      'Q3_FAIL: legacy fallback contract mismatch';
  END IF;
END;
$$;

-- ============================================================================
-- Q4. Producto inexistente no inventa precio
-- ============================================================================

DO $$
DECLARE
  v_missing_product_id uuid := '00000000-0000-0000-0000-000000000000';
  v_quote record;
BEGIN
  SELECT *
  INTO v_quote
  FROM public.get_public_product_price_quote(
    v_missing_product_id,
    100
  );

  IF v_quote.public_price_status <> 'unavailable'
     OR v_quote.price_before_tax_mxn IS NOT NULL
     OR v_quote.pricing_generation_id IS NOT NULL
     OR v_quote.is_valid_quantity IS DISTINCT FROM false
  THEN
    RAISE EXCEPTION
      'Q4_FAIL: unknown product must be unavailable without price';
  END IF;
END;
$$;

-- ============================================================================
-- Q5. Validación de inputs
-- ============================================================================

DO $$
BEGIN
  BEGIN
    PERFORM *
    FROM public.get_public_product_price_quote(
      '00000000-0000-0000-0000-000000000000'::uuid,
      0
    );

    RAISE EXCEPTION
      'Q5_FAIL: quantity zero was accepted';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN
      NULL;
  END;

  BEGIN
    PERFORM *
    FROM public.get_public_product_price_quote(
      '00000000-0000-0000-0000-000000000000'::uuid,
      1000001
    );

    RAISE EXCEPTION
      'Q5_FAIL: quantity above limit was accepted';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN
      NULL;
  END;

  BEGIN
    PERFORM *
    FROM public.get_public_product_price_quote(
      NULL::uuid,
      100
    );

    RAISE EXCEPTION
      'Q5_FAIL: null product id was accepted';
  EXCEPTION
    WHEN SQLSTATE '22004' THEN
      NULL;
  END;
END;
$$;

-- ============================================================================
-- Q6. El contrato no expone campos internos
-- ============================================================================

DO $$
DECLARE
  v_result_definition text;
BEGIN
  SELECT pg_get_function_result(
    'public.get_public_product_price_quote(uuid,integer)'::regprocedure
  )
  INTO v_result_definition;

  IF v_result_definition ILIKE '%cost%'
     OR v_result_definition ILIKE '%multiplier%'
     OR v_result_definition ILIKE '%provider%'
     OR v_result_definition ILIKE '%source_oferta%'
     OR v_result_definition ILIKE '%warning%'
  THEN
    RAISE EXCEPTION
      'Q6_FAIL: public quote contract exposes internal fields';
  END IF;

  IF v_result_definition NOT ILIKE '%public_price_status%'
     OR v_result_definition NOT ILIKE '%price_before_tax_mxn%'
     OR v_result_definition NOT ILIKE '%minimum_quantity%'
     OR v_result_definition NOT ILIKE '%pricing_generation_id%'
     OR v_result_definition NOT ILIKE '%requested_quantity%'
     OR v_result_definition NOT ILIKE '%is_valid_quantity%'
  THEN
    RAISE EXCEPTION
      'Q6_FAIL: public quote contract is missing required safe fields';
  END IF;
END;
$$;

-- ============================================================================
-- Resultado visible
-- ============================================================================

SELECT
  'PASS'::text AS result,
  0::bigint AS current_releases,
  0::bigint AS current_v2_price_rows,
  (
    SELECT count(*)
    FROM public.productos_publicos
    WHERE precio_desde_mxn IS NOT NULL
      AND precio_desde_mxn > 0
  ) AS legacy_priced_products_available,
  'legacy_fallback_preserved'::text AS pricing_mode;

ROLLBACK;
