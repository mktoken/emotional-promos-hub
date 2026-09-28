-- CHK-IMP-1: aserciones read-only posteriores a la migración CDO.
-- Ejecutar únicamente contra una base QA controlada; este archivo no escribe.

DO $assertions$
DECLARE
  v_active_id uuid;
  v_function_definition text;
  v_general_multipliers numeric[];
  v_g4_multipliers numeric[];
BEGIN
  SELECT id
  INTO v_active_id
  FROM public.pricing_rule_sets
  WHERE is_active = true
  ORDER BY active_from DESC
  LIMIT 1;

  IF v_active_id IS NULL THEN
    RAISE EXCEPTION 'CDO assertions: no existe rule set activo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.provider_pricing_rules
    WHERE rule_set_id = v_active_id
      AND provider_code = 'cdo_mx'
      AND cost_factor = 1.0300
  ) THEN
    RAISE EXCEPTION 'CDO assertions: factor CDO distinto de 1.0300';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.provider_pricing_rules
    WHERE rule_set_id = v_active_id
      AND provider_code = 'forpromotional'
      AND cost_factor = 1.0300
  ) THEN
    RAISE EXCEPTION 'CDO assertions: ForPromotional dejó de usar 1.0300';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.provider_pricing_rules
    WHERE rule_set_id = v_active_id
      AND provider_code = 'g4_mx'
      AND provider_tier_number = 5
      AND cost_factor = 1.0000
  ) THEN
    RAISE EXCEPTION 'CDO assertions: G4 fue modificado';
  END IF;

  SELECT array_agg(multiplier ORDER BY level_number)
  INTO v_general_multipliers
  FROM public.margin_tiers
  WHERE rule_set_id = v_active_id
    AND provider_code IS NULL
    AND applies_to = 'product';

  IF v_general_multipliers IS DISTINCT FROM ARRAY[1.75, 1.55, 1.32, 1.27, 1.23, 1.20]::numeric[] THEN
    RAISE EXCEPTION 'CDO assertions: multiplicadores generales cambiaron: %', v_general_multipliers;
  END IF;

  SELECT array_agg(multiplier ORDER BY level_number)
  INTO v_g4_multipliers
  FROM public.margin_tiers
  WHERE rule_set_id = v_active_id
    AND provider_code = 'g4_mx'
    AND applies_to = 'product';

  IF v_g4_multipliers IS DISTINCT FROM ARRAY[1.85, 1.55, 1.32, 1.27, 1.23, 1.20]::numeric[] THEN
    RAISE EXCEPTION 'CDO assertions: override G4 cambió: %', v_g4_multipliers;
  END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO v_function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'calculate_product_price_v2'
    AND pg_get_function_identity_arguments(p.oid) = 'p_producto_b2b_id uuid, p_quantity integer, p_rule_set_id uuid'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_function_definition IS NULL THEN
    RAISE EXCEPTION 'CDO assertions: no se encontró calculate_product_price_v2';
  END IF;

  IF position('no_cdo_personal_price' IN v_function_definition) = 0
     OR position('request_quote' IN v_function_definition) = 0
     OR position('multiple_cdo_personal_prices' IN v_function_definition) = 0
  THEN
    RAISE EXCEPTION 'CDO assertions: fallback CDO no está protegido';
  END IF;

  IF position('1.35' IN v_function_definition) > 0 THEN
    RAISE EXCEPTION 'CDO assertions: Legacy ×1.35 contaminó la función V2';
  END IF;
END
$assertions$;
