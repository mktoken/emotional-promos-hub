-- CHK-IMP-1: CDO Precio Personal × 1.03 antes de Pricing V2.
-- Alcance exclusivo: regla CDO del único rule set activo.
-- No activa releases, no recalcula caché y no modifica G4, márgenes ni Legacy.

BEGIN;

DO $migration$
DECLARE
  v_active_count integer;
  v_active_id uuid;
  v_cdo_factor numeric;
  v_forpromotional_factor numeric;
  v_g4_factor numeric;
  v_g4_tier integer;
BEGIN
  SELECT count(*)::integer
  INTO v_active_count
  FROM public.pricing_rule_sets
  WHERE is_active = true;

  IF v_active_count <> 1 THEN
    RAISE EXCEPTION
      'CHK-IMP-1 CDO: se esperaba exactamente un rule set activo; encontrados %',
      v_active_count;
  END IF;

  SELECT id
  INTO v_active_id
  FROM public.pricing_rule_sets
  WHERE is_active = true
  ORDER BY active_from DESC
  LIMIT 1;

  SELECT cost_factor
  INTO v_cdo_factor
  FROM public.provider_pricing_rules
  WHERE rule_set_id = v_active_id
    AND provider_code = 'cdo_mx';

  IF v_cdo_factor IS NULL THEN
    RAISE EXCEPTION 'CHK-IMP-1 CDO: regla cdo_mx inexistente en el rule set activo';
  END IF;

  IF v_cdo_factor NOT IN (1.0000, 1.0300) THEN
    RAISE EXCEPTION
      'CHK-IMP-1 CDO: factor previo inesperado %, se esperaba 1.0000 o 1.0300',
      v_cdo_factor;
  END IF;

  UPDATE public.provider_pricing_rules
  SET cost_factor = 1.0300,
      notes = 'CDO Precio Personal * 1.03 antes de Pricing V2'
  WHERE rule_set_id = v_active_id
    AND provider_code = 'cdo_mx';

  SELECT cost_factor
  INTO v_forpromotional_factor
  FROM public.provider_pricing_rules
  WHERE rule_set_id = v_active_id
    AND provider_code = 'forpromotional';

  IF v_forpromotional_factor IS DISTINCT FROM 1.0300 THEN
    RAISE EXCEPTION
      'CHK-IMP-1 CDO: ForPromotional cambió inesperadamente a %',
      v_forpromotional_factor;
  END IF;

  SELECT cost_factor, provider_tier_number
  INTO v_g4_factor, v_g4_tier
  FROM public.provider_pricing_rules
  WHERE rule_set_id = v_active_id
    AND provider_code = 'g4_mx';

  IF v_g4_factor IS DISTINCT FROM 1.0000 OR v_g4_tier IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION
      'CHK-IMP-1 CDO: G4 cambió inesperadamente; factor %, tier %',
      v_g4_factor,
      v_g4_tier;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_pricing_rules
    WHERE rule_set_id = v_active_id
      AND provider_code = 'cdo_mx'
      AND cost_factor = 1.0300
  ) THEN
    RAISE EXCEPTION 'CHK-IMP-1 CDO: no se pudo verificar el factor 1.0300';
  END IF;
END
$migration$;

COMMIT;
