-- PE ForPromotional atomic activation package
-- Stage 3: certify one complete candidate without changing live costs,
-- live stock, the current release, the feature flag, or the cron.
-- The candidate remains private until 13_activate_atomic_candidate.sql.

BEGIN;

DO $certify$
DECLARE
  v_candidate record;
  v_candidate_count integer;
  v_provider_id uuid;
  v_stage_count integer;
  v_expected_count integer;
  v_ambiguous_count integer;
  v_invalid_count integer;
  v_g4_cdo_count integer;
  v_updated_count integer;
  v_qmin integer;
  v_probe_q integer;
  v_probe_price numeric;
  v_qmin_price numeric;
  v_previous_price numeric;
  v_probe_total numeric;
  v_previous_total numeric;
  v_cost numeric;
  v_product_id uuid;
  v_report jsonb;
  v_probe_quantities integer[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_activation_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT count(*)::integer
  INTO v_candidate_count
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'building';
  IF v_candidate_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one building ForPromotional candidate is required; found %', v_candidate_count;
  END IF;

  SELECT c.*
  INTO v_candidate
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'building'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exactly one building ForPromotional candidate is required';
  END IF;

  IF NOT v_candidate.api_complete THEN
    RAISE EXCEPTION 'Candidate API import is incomplete';
  END IF;

  SELECT count(*)::integer
  INTO v_invalid_count
  FROM public.forpromotional_atomic_exceptions
  WHERE candidate_id = v_candidate.id;
  IF v_invalid_count <> 0 THEN
    RAISE EXCEPTION 'Candidate contains % unresolved API exceptions', v_invalid_count;
  END IF;

  SELECT count(*)::integer
  INTO v_stage_count
  FROM public.forpromotional_atomic_cost_shadow
  WHERE candidate_id = v_candidate.id;
  IF v_stage_count = 0 THEN
    RAISE EXCEPTION 'Candidate contains no staged API costs';
  END IF;

  SELECT count(*)::integer
  INTO v_ambiguous_count
  FROM (
    SELECT m.producto_b2b_id
    FROM public.producto_b2b_oferta_map AS m
    JOIN public.producto_proveedor_ofertas AS o ON o.id = m.oferta_id
    JOIN public.catalog_price_cache_v2_shadow AS base
      ON base.product_id = m.producto_b2b_id
     AND base.generation_id = v_candidate.base_generation_id
    WHERE m.provider_code = 'forpromotional'
      AND o.proveedor_id = v_candidate.provider_id
      AND o.activo = true
    GROUP BY m.producto_b2b_id
    HAVING count(DISTINCT m.oferta_id) <> 1
  ) AS ambiguous;
  IF v_ambiguous_count > 0 THEN
    RAISE EXCEPTION
      'Candidate blocked: % public ForPromotional products have ambiguous active offers',
      v_ambiguous_count;
  END IF;

  SELECT count(*)::integer
  INTO v_expected_count
  FROM public.producto_b2b_oferta_map AS m
  JOIN public.producto_proveedor_ofertas AS o ON o.id = m.oferta_id
  JOIN public.producto_precio_escalas AS s
    ON s.oferta_id = o.id AND s.proveedor_id = v_candidate.provider_id
  JOIN public.producto_proveedor_stock AS st
    ON st.oferta_id = o.id AND st.proveedor_id = v_candidate.provider_id
  JOIN public.catalog_price_cache_v2_shadow AS base
    ON base.product_id = m.producto_b2b_id
   AND base.generation_id = v_candidate.base_generation_id
  WHERE m.provider_code = 'forpromotional'
    AND o.proveedor_id = v_candidate.provider_id
    AND o.activo = true;
  IF v_expected_count <> v_stage_count THEN
    RAISE EXCEPTION
      'Candidate coverage mismatch: staged offers %, expected eligible products %',
      v_stage_count, v_expected_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cost_shadow AS st
    WHERE st.candidate_id = v_candidate.id
      AND (st.source_field <> 'forpromotional.api.precio_desc'
        OR st.factor <> 1.0000
        OR st.unit_cost <= 0
        OR st.supplier_moq < 1
        OR st.stock_qty < 0
        OR st.stock_status NOT IN ('disponible','bajo','agotado'))
  ) THEN
    RAISE EXCEPTION 'Candidate contains invalid cost, factor, MOQ or stock evidence';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cost_shadow AS st
    LEFT JOIN public.producto_b2b_oferta_map AS m
      ON m.oferta_id = st.offer_id
     AND m.producto_b2b_id = st.product_id
     AND m.provider_code = 'forpromotional'
    WHERE st.candidate_id = v_candidate.id
      AND m.oferta_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Candidate contains a staged offer without its exact public mapping';
  END IF;

  -- A product that is also selected by G4 or CDO cannot be changed by this
  -- provider-only cutover; failing closed protects those certified contracts.
  SELECT count(*)::integer
  INTO v_g4_cdo_count
  FROM public.forpromotional_atomic_cost_shadow AS st
  JOIN public.producto_b2b_oferta_map AS m
    ON m.producto_b2b_id = st.product_id
   AND m.provider_code IN ('g4_mx','cdo_mx')
  WHERE st.candidate_id = v_candidate.id;
  IF v_g4_cdo_count > 0 THEN
    RAISE EXCEPTION
      'Candidate blocked: % staged products overlap certified G4/CDO mappings',
      v_g4_cdo_count;
  END IF;

  -- Verify the cloned generation is unchanged outside the exact staged product
  -- set. The symmetric EXCEPT catches accidental loss as well as mutation.
  IF EXISTS (
    (
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.base_generation_id
        AND product_id NOT IN (
          SELECT product_id FROM public.forpromotional_atomic_cost_shadow
          WHERE candidate_id = v_candidate.id
        )
      EXCEPT
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.catalog_generation_id
        AND product_id NOT IN (
          SELECT product_id FROM public.forpromotional_atomic_cost_shadow
          WHERE candidate_id = v_candidate.id
        )
    )
    UNION ALL
    (
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.catalog_generation_id
        AND product_id NOT IN (
          SELECT product_id FROM public.forpromotional_atomic_cost_shadow
          WHERE candidate_id = v_candidate.id
        )
      EXCEPT
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.base_generation_id
        AND product_id NOT IN (
          SELECT product_id FROM public.forpromotional_atomic_cost_shadow
          WHERE candidate_id = v_candidate.id
        )
    )
  ) THEN
    RAISE EXCEPTION 'Candidate generation differs outside ForPromotional staged products';
  END IF;

  v_probe_quantities := ARRAY[1, 54, 100, 250, 500, 541, 1000, 1743,
                              3486, 5000, 5229, 6000, 20000];

  FOR v_product_id, v_cost IN
    SELECT product_id, unit_cost
    FROM public.forpromotional_atomic_cost_shadow
    WHERE candidate_id = v_candidate.id
    ORDER BY product_id
  LOOP
    SELECT GREATEST(
      st.supplier_moq,
      CEIL(4000 / (st.unit_cost * (74.52 / 57.38)))::integer
    )
    INTO v_qmin
    FROM public.forpromotional_atomic_cost_shadow AS st
    WHERE st.candidate_id = v_candidate.id
      AND st.product_id = v_product_id;

    v_probe_q := v_qmin;
    WHILE v_probe_q <= 1000000 LOOP
      v_probe_price := public.forpromotional_curve_price_v1(v_cost, v_probe_q, v_qmin);
      EXIT WHEN v_probe_price IS NOT NULL
        AND ROUND(v_probe_q * v_probe_price, 2) >= 4000;
      v_probe_q := v_probe_q + 1;
    END LOOP;
    IF v_probe_q > 1000000 THEN
      RAISE EXCEPTION 'No eligible quantity reaches the $4,000 minimum for product %', v_product_id;
    END IF;
    v_qmin := v_probe_q;

    SELECT public.forpromotional_curve_price_v1(v_cost, v_qmin, v_qmin)
    INTO v_probe_price;
    IF v_probe_price IS NULL OR ROUND(v_qmin * v_probe_price, 2) < 4000 THEN
      RAISE EXCEPTION 'Invalid candidate price at qmin for product %', v_product_id;
    END IF;
    v_qmin_price := v_probe_price;

    v_previous_price := NULL;
    v_previous_total := NULL;
    FOREACH v_probe_q IN ARRAY v_probe_quantities LOOP
      IF v_probe_q < v_qmin THEN
        CONTINUE;
      END IF;
      v_probe_price := public.forpromotional_curve_price_v1(v_cost, v_probe_q, v_qmin);
      IF v_probe_price IS NULL THEN
        RAISE EXCEPTION 'Curve returned NULL at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      v_probe_total := ROUND(v_probe_q * v_probe_price, 2);
      IF v_previous_price IS NOT NULL AND v_probe_price > v_previous_price THEN
        RAISE EXCEPTION 'Unit price increased at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      IF v_previous_total IS NOT NULL AND v_probe_total < v_previous_total THEN
        RAISE EXCEPTION 'Order total decreased at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      v_previous_price := v_probe_price;
      v_previous_total := v_probe_total;
    END LOOP;

    UPDATE public.catalog_price_cache_v2_shadow AS s
    SET public_price_status = 'priced',
        price_before_tax_mxn = v_qmin_price,
        currency = 'MXN',
        minimum_quantity = v_qmin,
        calculation_version = 'forpromotional-atomic-v1',
        computed_at = now(),
        updated_at = now()
    WHERE s.generation_id = v_candidate.catalog_generation_id
      AND s.product_id = v_product_id;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'Candidate generation row missing for product %', v_product_id;
    END IF;
  END LOOP;

  UPDATE public.catalog_price_cache_v2_generations
  SET status = 'certified',
      processed_count = candidate_count,
      priced_count = (
        SELECT count(*) FROM public.catalog_price_cache_v2_shadow
        WHERE generation_id = v_candidate.catalog_generation_id
          AND public_price_status = 'priced'
      ),
      completed_at = now(),
      updated_at = now()
  WHERE id = v_candidate.catalog_generation_id
    AND status = 'running';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate generation is not in running state';
  END IF;

  v_report := jsonb_build_object(
    'candidate_id', v_candidate.id,
    'staged_rows', v_stage_count,
    'exceptions', v_invalid_count,
    'factor', 1.0000,
    'cost_source', 'forpromotional.api.precio_desc',
    'minimum_sale_mxn', 4000,
    'g4_cdo_changed', false,
    'monotonicity', 'sampled_control_quantities; exhaustive consecutive validation remains a local test gate'
  );

  UPDATE public.forpromotional_atomic_candidates
  SET status = 'certified',
      certified_at = now(),
      validation_report = v_report,
      updated_at = now()
  WHERE id = v_candidate.id
    AND status = 'building';
END
$certify$;

COMMIT;

SELECT id AS candidate_id, status, api_complete, certified_at,
       base_generation_id, catalog_generation_id, validation_report
FROM public.forpromotional_atomic_candidates
WHERE status = 'certified';
