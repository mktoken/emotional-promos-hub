-- ForPromotional continuous pricing v1.
--
-- The policy is intentionally isolated from G4 and CDO. The internal
-- resolver reads the active offer, source scale and provider factor, while
-- public functions return only commercial values.
-- The feature flag is installed disabled. Activation is a separate,
-- controlled operation after isolated runtime validation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pricing_policy_flags (
  policy_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $policy_schema$
DECLARE
  v_columns text[];
BEGIN
  SELECT array_agg(
    format('%s:%s:%s', column_name, udt_name, is_nullable)
    ORDER BY ordinal_position
  )
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pricing_policy_flags';

  IF v_columns IS DISTINCT FROM ARRAY[
    'policy_key:text:NO',
    'enabled:bool:NO',
    'policy_version:text:NO',
    'updated_at:timestamptz:NO'
  ]::text[] THEN
    RAISE EXCEPTION
      'pricing_policy_flags_schema_drift: columnas, tipos o nullability inesperados';
  END IF;
END
$policy_schema$;

INSERT INTO public.pricing_policy_flags (
  policy_key,
  enabled,
  policy_version
)
VALUES (
  'forpromotional_continuous_v1',
  false,
  'forpromotional-continuous-v1'
)
ON CONFLICT (policy_key) DO UPDATE
SET enabled = false,
    policy_version = EXCLUDED.policy_version,
    updated_at = now();

ALTER TABLE public.pricing_policy_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pricing_policy_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pricing_policy_flags TO service_role;

-- Pure policy math.  The returned unit price keeps six decimals so the
-- authoritative total can be reproduced by the existing quote RPC after it
-- rounds the line total to cents.  The UI formats the unit price to cents.
CREATE OR REPLACE FUNCTION public.forpromotional_curve_price_v1(
  p_cost numeric,
  p_quantity integer,
  p_qmin integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_threshold_costs numeric[] := ARRAY[
    3041.14::numeric,
    31042.58::numeric,
    100013.34::numeric,
    200026.68::numeric,
    300040.02::numeric
  ];
  v_reference_multipliers numeric[] := ARRAY[
    (74.52 / 57.38)::numeric,
    (71.73 / 57.38)::numeric,
    (69.98 / 57.38)::numeric,
    (69.13 / 57.38)::numeric,
    (66.72 / 57.38)::numeric
  ];
  v_threshold_quantities integer[] := ARRAY[]::integer[];
  v_current_index integer := 1;
  v_index integer;
  v_margin numeric := p_cost * 1.05;
  v_epsilon numeric := 0.0000001;
  v_discount numeric;
  v_future_discount numeric;
  v_current_cap numeric;
  v_future_target numeric;
  v_future_cap numeric;
  v_price numeric;
BEGIN
  IF p_cost <= 0 OR p_quantity < 1 OR p_qmin < 1 THEN
    RETURN NULL;
  END IF;

  FOR v_index IN 1..5 LOOP
    v_threshold_quantities := v_threshold_quantities ||
      GREATEST(1, CEIL(v_threshold_costs[v_index] / p_cost)::integer);
    IF p_quantity >= v_threshold_quantities[v_index] THEN
      v_current_index := v_index;
    END IF;
  END LOOP;

  v_discount := CASE
    WHEN p_quantity = p_qmin THEN 0::numeric
    WHEN p_quantity < v_threshold_quantities[5]
      THEN 0.01::numeric + v_epsilon * GREATEST(0, p_quantity - p_qmin - 1)
    ELSE 0.01::numeric
  END;

  v_current_cap := p_cost * v_reference_multipliers[v_current_index] - v_discount;
  v_price := v_current_cap;

  FOR v_index IN 1..5 LOOP
    IF v_threshold_quantities[v_index] > p_quantity THEN
      v_future_discount := CASE
        WHEN v_index = 5 THEN 0.01::numeric
        ELSE 0.01::numeric + v_epsilon *
          GREATEST(0, v_threshold_quantities[v_index] - p_qmin - 1)
      END;
      v_future_target :=
        p_cost * v_reference_multipliers[v_index] - v_future_discount;
      v_future_cap := (
        v_threshold_quantities[v_index] * v_future_target
        - (v_threshold_quantities[v_index] - p_quantity) * v_margin
      ) / p_quantity;
      v_price := LEAST(v_price, v_future_cap);
    END IF;
  END LOOP;

  IF v_price <= v_margin THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(v_price, 6);
END;
$function$;

REVOKE ALL ON FUNCTION public.forpromotional_curve_price_v1(numeric, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forpromotional_curve_price_v1(numeric, integer, integer)
TO service_role;

-- Internal resolver.  It deliberately returns NOT_APPLICABLE when the
-- selected product is not a uniquely mapped ForPromotional product so the
-- public wrapper can preserve the established Pricing V2 path.
CREATE OR REPLACE FUNCTION public.calculate_forpromotional_continuous_price_v1(
  p_producto_b2b_id uuid,
  p_quantity integer,
  p_rule_set_id uuid
)
RETURNS TABLE (
  status text,
  warning_code text,
  requested_quantity integer,
  is_valid_quantity boolean,
  minimum_quantity integer,
  unit_price_mxn numeric,
  subtotal_mxn numeric,
  currency text,
  policy_version text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_enabled boolean;
  v_offer_count integer;
  v_offer_id uuid;
  v_rule_count integer;
  v_factor numeric;
  v_moq integer;
  v_qmin integer;
  v_candidate_q integer;
  v_qmin_found boolean := false;
  v_candidate_cost numeric;
  v_qmin_cost numeric;
  v_qmin_price numeric;
  v_price numeric;
  v_previous_price numeric;
  v_total numeric;
  v_previous_total numeric;
  v_applicable_count integer;
  v_policy_version text := 'forpromotional-continuous-v1';
  v_min_scale public.producto_precio_escalas;
  v_scale public.producto_precio_escalas;
  v_candidate_scale public.producto_precio_escalas;
  v_previous_scale public.producto_precio_escalas;
BEGIN
  currency := 'MXN';
  policy_version := v_policy_version;
  requested_quantity := p_quantity;
  is_valid_quantity := false;

  IF p_producto_b2b_id IS NULL OR p_quantity IS NULL OR p_quantity < 1
     OR p_quantity > 1000000 OR p_rule_set_id IS NULL THEN
    status := 'request_quote';
    warning_code := 'invalid_input';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT f.enabled
  INTO v_enabled
  FROM public.pricing_policy_flags AS f
  WHERE f.policy_key = 'forpromotional_continuous_v1';

  IF NOT COALESCE(v_enabled, false) THEN
    status := 'not_applicable';
    warning_code := 'feature_disabled';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*)::integer
  INTO v_offer_count
  FROM public.producto_b2b_oferta_map AS m
  WHERE m.producto_b2b_id = p_producto_b2b_id
    AND m.provider_code = 'forpromotional';

  IF v_offer_count = 0 THEN
    status := 'not_applicable';
    warning_code := 'not_forpromotional';
    RETURN NEXT;
    RETURN;
  ELSIF v_offer_count <> 1 THEN
    status := 'request_quote';
    warning_code := 'ambiguous_forpromotional_offer';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT m.oferta_id
  INTO v_offer_id
  FROM public.producto_b2b_oferta_map AS m
  WHERE m.producto_b2b_id = p_producto_b2b_id
    AND m.provider_code = 'forpromotional';

  SELECT count(*)::integer, max(r.cost_factor)
  INTO v_rule_count, v_factor
  FROM public.provider_pricing_rules AS r
  WHERE r.rule_set_id = p_rule_set_id
    AND r.provider_code = 'forpromotional';

  -- The distributor API price is already the acquisition unit cost. Any
  -- factor other than 1.0000 would create a second cost source/adjustment.
  IF v_rule_count <> 1 OR v_factor IS DISTINCT FROM 1.0000 THEN
    status := 'request_quote';
    warning_code := 'invalid_forpromotional_rule';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT s.min_qty, s
  INTO v_moq, v_min_scale
  FROM public.producto_precio_escalas AS s
  WHERE s.oferta_id = v_offer_id
    AND s.unit_cost > 0
  ORDER BY s.min_qty ASC
  LIMIT 1;

  IF v_moq IS NULL OR v_min_scale.id IS NULL THEN
    status := 'request_quote';
    warning_code := 'no_valid_forpromotional_scale';
    RETURN NEXT;
    RETURN;
  END IF;

  v_qmin_cost := ROUND(v_min_scale.unit_cost, 4);
  v_qmin := GREATEST(
    v_moq,
    CEIL(4000 / (v_qmin_cost * (74.52 / 57.38)))::integer
  );

  -- Find the first integer quantity whose own curve result reaches the
  -- commercial minimum.  Each candidate must belong to exactly one scale.
  FOR v_candidate_scale IN
    SELECT s.*
    FROM public.producto_precio_escalas AS s
    WHERE s.oferta_id = v_offer_id
      AND s.unit_cost > 0
    ORDER BY s.min_qty ASC
  LOOP
    v_candidate_q := GREATEST(v_moq, v_candidate_scale.min_qty, v_qmin);
    IF v_candidate_scale.max_qty IS NOT NULL
       AND v_candidate_q > v_candidate_scale.max_qty THEN
      CONTINUE;
    END IF;

    LOOP
      SELECT count(*)::integer
      INTO v_applicable_count
      FROM public.producto_precio_escalas AS s
      WHERE s.oferta_id = v_offer_id
        AND s.unit_cost > 0
        AND s.min_qty <= v_candidate_q
        AND (s.max_qty IS NULL OR s.max_qty >= v_candidate_q);

      IF v_applicable_count <> 1 THEN
        status := 'request_quote';
        warning_code := 'ambiguous_forpromotional_scale';
        RETURN NEXT;
        RETURN;
      END IF;

      v_candidate_cost := ROUND(
      v_candidate_scale.unit_cost,
        4
      );
      v_qmin_price := public.forpromotional_curve_price_v1(
        v_candidate_cost,
        v_candidate_q,
        v_candidate_q
      );

      IF v_qmin_price IS NOT NULL
         AND ROUND(v_candidate_q * v_qmin_price, 2) >= 4000 THEN
        v_qmin := v_candidate_q;
        v_qmin_found := true;
        EXIT;
      END IF;

      v_candidate_q := v_candidate_q + 1;
      IF v_candidate_scale.max_qty IS NOT NULL
         AND v_candidate_q > v_candidate_scale.max_qty THEN
        EXIT;
      END IF;
      IF v_candidate_q > 1000000 THEN
        EXIT;
      END IF;
    END LOOP;

    IF v_qmin_found THEN
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_qmin_found OR v_qmin < v_moq OR v_qmin > 1000000 THEN
    status := 'request_quote';
    warning_code := 'minimum_quantity_unresolved';
    RETURN NEXT;
    RETURN;
  END IF;

  minimum_quantity := v_qmin;

  SELECT count(*)::integer
  INTO v_applicable_count
  FROM public.producto_precio_escalas AS s
  WHERE s.oferta_id = v_offer_id
    AND s.unit_cost > 0
    AND s.min_qty <= p_quantity
    AND (s.max_qty IS NULL OR s.max_qty >= p_quantity);

  IF v_applicable_count = 0 THEN
    status := 'below_minimum';
    warning_code := 'no_applicable_forpromotional_scale';
    RETURN NEXT;
    RETURN;
  ELSIF v_applicable_count <> 1 THEN
    status := 'request_quote';
    warning_code := 'ambiguous_forpromotional_scale';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_quantity < v_qmin THEN
    status := 'below_minimum';
    warning_code := 'commercial_minimum';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT s.*
  INTO v_scale
  FROM public.producto_precio_escalas AS s
  WHERE s.oferta_id = v_offer_id
    AND s.unit_cost > 0
    AND s.min_qty <= p_quantity
    AND (s.max_qty IS NULL OR s.max_qty >= p_quantity)
  ORDER BY s.min_qty DESC;

  v_candidate_cost := ROUND(v_scale.unit_cost, 4);
  v_price := public.forpromotional_curve_price_v1(
    v_candidate_cost,
    p_quantity,
    v_qmin
  );

  IF v_price IS NULL OR v_price < v_candidate_cost * 1.05 THEN
    status := 'request_quote';
    warning_code := 'marginal_revenue_floor';
    RETURN NEXT;
    RETURN;
  END IF;

  v_total := ROUND(p_quantity * v_price, 2);
  IF v_total < 4000 THEN
    status := 'below_minimum';
    warning_code := 'commercial_minimum';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Validate the adjacent quantity using its own acquisition scale.  A
  -- failed monotonicity check falls back to the established Pricing V2 path.
  IF p_quantity > v_qmin THEN
    SELECT count(*)::integer
    INTO v_applicable_count
    FROM public.producto_precio_escalas AS s
    WHERE s.oferta_id = v_offer_id
      AND s.unit_cost > 0
      AND s.min_qty <= p_quantity - 1
      AND (s.max_qty IS NULL OR s.max_qty >= p_quantity - 1);

    IF v_applicable_count <> 1 THEN
      status := 'request_quote';
      warning_code := 'previous_quantity_not_deterministic';
      RETURN NEXT;
      RETURN;
    END IF;

    SELECT s.*
    INTO v_previous_scale
    FROM public.producto_precio_escalas AS s
    WHERE s.oferta_id = v_offer_id
      AND s.unit_cost > 0
      AND s.min_qty <= p_quantity - 1
      AND (s.max_qty IS NULL OR s.max_qty >= p_quantity - 1)
    ORDER BY s.min_qty DESC;

    v_previous_price := public.forpromotional_curve_price_v1(
      ROUND(v_previous_scale.unit_cost, 4),
      p_quantity - 1,
      v_qmin
    );
    v_previous_total := ROUND((p_quantity - 1) * v_previous_price, 2);

    IF v_previous_price IS NULL
       OR v_price > v_previous_price + 0.000001
       OR v_total < v_previous_total THEN
      status := 'request_quote';
      warning_code := 'non_monotonic_effective_cost';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  status := 'priced';
  is_valid_quantity := true;
  unit_price_mxn := v_price;
  subtotal_mxn := v_total;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_forpromotional_continuous_price_v1(uuid, integer, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_forpromotional_continuous_price_v1(uuid, integer, uuid)
TO service_role;

-- Versioned public contract.  It adds the authoritative line total and policy
-- version without changing the installed seven-column RPC.
CREATE OR REPLACE FUNCTION public.get_public_product_price_quote_v2(
  p_producto_b2b_id uuid,
  p_quantity integer
)
RETURNS TABLE (
  public_price_status text,
  price_before_tax_mxn numeric,
  total_before_tax_mxn numeric,
  currency text,
  minimum_quantity integer,
  pricing_generation_id uuid,
  requested_quantity integer,
  is_valid_quantity boolean,
  pricing_policy_version text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_release_count integer;
  v_generation_id uuid;
  v_rule_set_id uuid;
  v_shadow_status text;
  v_shadow_price numeric;
  v_shadow_currency text;
  v_shadow_minimum_quantity integer;
  v_legacy_price numeric;
  v_calc record;
  v_curve record;
BEGIN
  IF p_producto_b2b_id IS NULL OR p_quantity IS NULL
     OR p_quantity < 1 OR p_quantity > 1000000 THEN
    RETURN QUERY SELECT
      'unavailable'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
      NULL::integer, NULL::uuid, p_quantity, false, 'unavailable'::text;
    RETURN;
  END IF;

  SELECT count(*)::integer
  INTO v_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  IF v_release_count = 0 THEN
    SELECT pp.precio_desde_mxn
    INTO v_legacy_price
    FROM public.productos_publicos AS pp
    WHERE pp.id = p_producto_b2b_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN QUERY SELECT
        'unavailable'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
        NULL::integer, NULL::uuid, p_quantity, false, 'legacy'::text;
    ELSIF v_legacy_price IS NULL OR v_legacy_price <= 0 THEN
      RETURN QUERY SELECT
        'request_quote'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
        NULL::integer, NULL::uuid, p_quantity, true, 'legacy'::text;
    ELSE
      RETURN QUERY SELECT
        'priced'::text,
        ROUND(v_legacy_price, 6),
        ROUND(v_legacy_price * p_quantity, 2),
        'MXN'::text,
        1,
        NULL::uuid,
        p_quantity,
        true,
        'legacy'::text;
    END IF;
    RETURN;
  END IF;

  IF v_release_count <> 1 THEN
    RETURN QUERY SELECT
      'request_quote'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
      NULL::integer, NULL::uuid, p_quantity, false, 'ambiguous-release'::text;
    RETURN;
  END IF;

  SELECT
    r.generation_id,
    g.rule_set_id,
    s.public_price_status,
    s.price_before_tax_mxn,
    s.currency,
    s.minimum_quantity
  INTO
    v_generation_id,
    v_rule_set_id,
    v_shadow_status,
    v_shadow_price,
    v_shadow_currency,
    v_shadow_minimum_quantity
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g
    ON g.id = r.generation_id
  LEFT JOIN public.catalog_price_cache_v2_shadow AS s
    ON s.generation_id = r.generation_id
   AND s.product_id = p_producto_b2b_id
  WHERE r.is_current = true;

  IF v_shadow_status IS NULL THEN
    RETURN QUERY SELECT
      'unavailable'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
      NULL::integer, v_generation_id, p_quantity, false, 'pricing-v2'::text;
    RETURN;
  END IF;

  SELECT *
  INTO v_calc
  FROM public.calculate_product_price_v2(
    p_producto_b2b_id,
    p_quantity,
    v_rule_set_id
  )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'unavailable'::text, NULL::numeric, NULL::numeric, 'MXN'::text,
      v_shadow_minimum_quantity, v_generation_id, p_quantity, false,
      'pricing-v2'::text;
    RETURN;
  END IF;

  IF v_calc.applied_provider_code = 'forpromotional' THEN
    SELECT *
    INTO v_curve
    FROM public.calculate_forpromotional_continuous_price_v1(
      p_producto_b2b_id,
      p_quantity,
      v_rule_set_id
    )
    LIMIT 1;

    IF v_curve.status IN ('priced', 'below_minimum') THEN
      RETURN QUERY SELECT
        CASE WHEN v_curve.status = 'priced' THEN 'priced' ELSE 'below_minimum' END,
        CASE WHEN v_curve.status = 'priced' THEN v_curve.unit_price_mxn ELSE NULL::numeric END,
        CASE WHEN v_curve.status = 'priced' THEN v_curve.subtotal_mxn ELSE NULL::numeric END,
        'MXN'::text,
        v_curve.minimum_quantity,
        v_generation_id,
        p_quantity,
        v_curve.is_valid_quantity,
        v_curve.policy_version;
      RETURN;
    END IF;
    IF v_curve.status <> 'not_applicable'
       OR v_curve.warning_code <> 'feature_disabled' THEN
      -- Never expose the historical ForPromotional factor path when the API
      -- cost contract is missing, ambiguous or non-monotonic.
      RETURN QUERY SELECT
        'request_quote'::text, NULL::numeric, NULL::numeric,
        COALESCE(v_calc.currency, v_shadow_currency, 'MXN')::text,
        v_calc.minimum_quantity, v_generation_id, p_quantity, true,
        'forpromotional-api-cost-required'::text;
      RETURN;
    END IF;
    -- Feature disabled: continue below and preserve the installed Pricing V2
    -- result until the controlled activation step explicitly enables the curve.
  END IF;

  IF v_calc.status = 'valid' THEN
    RETURN QUERY SELECT
      'priced'::text,
      ROUND(v_calc.unit_price_mxn, 6),
      ROUND(v_calc.unit_price_mxn * p_quantity, 2),
      COALESCE(v_calc.currency, v_shadow_currency, 'MXN')::text,
      v_calc.minimum_quantity,
      v_generation_id,
      p_quantity,
      true,
      CASE
        WHEN v_calc.applied_provider_code = 'forpromotional'
          THEN 'pricing-v2-fallback'
        ELSE 'pricing-v2'
      END::text;
  ELSIF v_calc.status = 'below_minimum' THEN
    RETURN QUERY SELECT
      'below_minimum'::text, NULL::numeric, NULL::numeric,
      COALESCE(v_calc.currency, v_shadow_currency, 'MXN')::text,
      v_calc.minimum_quantity, v_generation_id, p_quantity, false,
      CASE
        WHEN v_calc.applied_provider_code = 'forpromotional'
          THEN 'pricing-v2-fallback'
        ELSE 'pricing-v2'
      END::text;
  ELSE
    RETURN QUERY SELECT
      CASE WHEN v_calc.status IN ('request_quote', 'manual_review')
        THEN 'request_quote' ELSE 'unavailable' END::text,
      NULL::numeric,
      NULL::numeric,
      COALESCE(v_calc.currency, v_shadow_currency, 'MXN')::text,
      v_calc.minimum_quantity,
      v_generation_id,
      p_quantity,
      v_calc.status IN ('request_quote', 'manual_review'),
      CASE
        WHEN v_calc.applied_provider_code = 'forpromotional'
          THEN 'pricing-v2-fallback'
        ELSE 'pricing-v2'
      END::text;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_product_price_quote_v2(uuid, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_price_quote_v2(uuid, integer)
TO anon, authenticated, service_role;

-- Preserve the installed seven-column contract.  Existing quote submission
-- code calls this wrapper, so it automatically receives the curve's precise
-- unit price and keeps its existing server-side line-total calculation.
CREATE OR REPLACE FUNCTION public.get_public_product_price_quote(
  p_producto_b2b_id uuid,
  p_quantity integer
)
RETURNS TABLE (
  public_price_status text,
  price_before_tax_mxn numeric,
  currency text,
  minimum_quantity integer,
  pricing_generation_id uuid,
  requested_quantity integer,
  is_valid_quantity boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    q.public_price_status,
    q.price_before_tax_mxn,
    q.currency,
    q.minimum_quantity,
    q.pricing_generation_id,
    q.requested_quantity,
    q.is_valid_quantity
  FROM public.get_public_product_price_quote_v2($1, $2) AS q;
$function$;

REVOKE ALL ON FUNCTION public.get_public_product_price_quote(uuid, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_price_quote(uuid, integer)
TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_product_price_quote_v2(uuid, integer)
IS 'Versioned public price contract. ForPromotional uses the gated continuous curve; G4 and CDO remain on Pricing V2. Returns an authoritative line total without exposing costs.';

COMMIT;
