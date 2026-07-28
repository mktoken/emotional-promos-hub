
-- Fase G4: costo base fijo desde escala 250 conectada.
-- Alcance: solo public.calculate_product_price_v2. Draft inactivo.
-- Nota técnica: cuando exista una fuente estructurada y explícita de
-- precios especiales G4 (único / promoción / liquidación / vigencia),
-- esa fuente tendrá prioridad sobre la escala 250 conectada. Mientras
-- esa fuente no exista, no se activa ninguna rama especial.

CREATE OR REPLACE FUNCTION public.calculate_product_price_v2(
  p_producto_b2b_id uuid,
  p_quantity integer,
  p_rule_set_id uuid
)
RETURNS TABLE(
  status text, warning_code text, requested_quantity integer,
  is_valid_quantity boolean, minimum_quantity integer,
  lower_valid_quantity integer, upper_valid_quantity integer,
  unit_price_mxn numeric, subtotal_mxn numeric, currency text,
  tax_included boolean, applied_level integer, applied_multiplier numeric,
  applied_unit_cost numeric, adjusted_unit_cost numeric,
  applied_cost_factor numeric, applied_provider_code text,
  source_oferta_id uuid, suggested jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_oferta_id uuid; v_provider_code text; v_rule public.provider_pricing_rules;
  v_scale public.producto_precio_escalas; v_min_scale int; v_moq int; v_pack int := 1;
  v_pack_warning boolean := false; v_adjusted_cost numeric;
  v_chosen_level int; v_chosen_mult numeric; v_chosen_unit numeric; v_chosen_subtotal numeric;
  v_min_qty_valid int; v_suggested jsonb := '[]'::jsonb; v_monotonic boolean := true;
  -- G4: costo base fijo desde escala 250 conectada.
  v_g4_costs numeric[]; v_g4_fixed_cost numeric;
  v_effective_unit_cost numeric;
BEGIN
  currency := 'MXN'; tax_included := false; requested_quantity := p_quantity;
  is_valid_quantity := false; suggested := '[]'::jsonb;

  IF p_producto_b2b_id IS NULL OR p_quantity IS NULL OR p_rule_set_id IS NULL THEN
    status := 'unavailable'; warning_code := 'invalid_input'; RETURN NEXT; RETURN;
  END IF;
  IF p_quantity <= 0 THEN
    status := 'unavailable'; warning_code := 'invalid_quantity'; RETURN NEXT; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pricing_rule_sets WHERE id = p_rule_set_id) THEN
    status := 'unavailable'; warning_code := 'rule_set_not_found'; RETURN NEXT; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos_b2b WHERE id = p_producto_b2b_id) THEN
    status := 'request_quote'; warning_code := 'product_not_found'; RETURN NEXT; RETURN;
  END IF;

  SELECT m.oferta_id, m.provider_code INTO v_oferta_id, v_provider_code
  FROM public.producto_b2b_oferta_map m
  WHERE m.producto_b2b_id = p_producto_b2b_id
  ORDER BY (m.is_primary)::int DESC, m.match_score DESC NULLS LAST, m.created_at ASC
  LIMIT 1;

  IF v_oferta_id IS NULL THEN
    status := 'request_quote'; warning_code := 'no_offer'; RETURN NEXT; RETURN;
  END IF;
  applied_provider_code := v_provider_code; source_oferta_id := v_oferta_id;

  SELECT * INTO v_rule FROM public.provider_pricing_rules
  WHERE rule_set_id = p_rule_set_id AND provider_code = v_provider_code;
  IF v_rule.id IS NULL THEN
    status := 'request_quote'; warning_code := 'no_provider_rule'; RETURN NEXT; RETURN;
  END IF;
  applied_cost_factor := v_rule.cost_factor;

  -- =====================================================================
  -- G4: seleccionar costo base fijo desde min_qty = 250. No usar cantidad
  -- solicitada para elegir el costo. No hacer fallback a otras escalas.
  -- selected_cost_source (conceptual) = 'g4.precio_escala_250_conectado'.
  -- =====================================================================
  IF v_provider_code = 'g4_mx' THEN
    SELECT array_agg(DISTINCT unit_cost)
      INTO v_g4_costs
    FROM public.producto_precio_escalas
    WHERE oferta_id = v_oferta_id
      AND min_qty = 250
      AND unit_cost > 0;

    IF v_g4_costs IS NULL OR array_length(v_g4_costs, 1) = 0 THEN
      status := 'request_quote'; warning_code := 'no_g4_250_scale';
      RETURN NEXT; RETURN;
    ELSIF array_length(v_g4_costs, 1) > 1 THEN
      status := 'manual_review'; warning_code := 'multiple_g4_250_costs';
      RETURN NEXT; RETURN;
    END IF;

    v_g4_fixed_cost := v_g4_costs[1];
  END IF;

  SELECT min(min_qty) INTO v_min_scale FROM public.producto_precio_escalas
  WHERE oferta_id = v_oferta_id AND unit_cost > 0;
  IF v_min_scale IS NULL THEN
    status := 'request_quote'; warning_code := 'no_scales'; RETURN NEXT; RETURN;
  END IF;
  v_moq := v_min_scale; minimum_quantity := v_moq;

  DECLARE
    l record; s record; unit_c numeric; unit_p numeric; raw_q numeric; adj_q int;
    subt numeric; best_q int; sug_arr jsonb := '[]'::jsonb;
    scale_used public.producto_precio_escalas; prev_up numeric; cur_up numeric; i int;
  BEGIN
    FOR l IN
      SELECT pl.level_number, pl.threshold_amount_mxn,
        coalesce(
          (SELECT mt.multiplier FROM public.margin_tiers mt
           WHERE mt.rule_set_id=pl.rule_set_id AND mt.level_number=pl.level_number
             AND mt.applies_to='product' AND mt.provider_code=v_provider_code),
          (SELECT mt.multiplier FROM public.margin_tiers mt
           WHERE mt.rule_set_id=pl.rule_set_id AND mt.level_number=pl.level_number
             AND mt.applies_to='product' AND mt.provider_code IS NULL)
        ) AS mult
      FROM public.purchase_levels pl WHERE pl.rule_set_id=p_rule_set_id
      ORDER BY pl.level_number ASC
    LOOP
      IF l.mult IS NULL THEN CONTINUE; END IF;
      best_q := NULL;
      FOR s IN SELECT * FROM public.producto_precio_escalas
        WHERE oferta_id=v_oferta_id AND unit_cost>0 ORDER BY min_qty ASC
      LOOP
        -- G4: costo fijo escala 250; otros proveedores: costo por escala.
        unit_c := round(coalesce(v_g4_fixed_cost, s.unit_cost) * v_rule.cost_factor, 4);
        unit_p := round(unit_c * l.mult, 2);
        IF unit_p <= 0 THEN CONTINUE; END IF;
        raw_q := ceil(l.threshold_amount_mxn / unit_p);
        adj_q := greatest(raw_q::int, s.min_qty, v_moq);
        IF s.max_qty IS NOT NULL AND adj_q > s.max_qty THEN CONTINUE; END IF;
        subt := round(unit_p * adj_q, 2);
        IF subt < l.threshold_amount_mxn THEN CONTINUE; END IF;
        IF best_q IS NULL OR adj_q < best_q THEN best_q := adj_q; END IF;
      END LOOP;
      IF best_q IS NOT NULL THEN
        SELECT * INTO scale_used FROM public.producto_precio_escalas
        WHERE oferta_id=v_oferta_id AND unit_cost>0 AND min_qty<=best_q
          AND (max_qty IS NULL OR max_qty>=best_q)
        ORDER BY min_qty DESC LIMIT 1;
        unit_c := round(coalesce(v_g4_fixed_cost, scale_used.unit_cost) * v_rule.cost_factor, 4);
        unit_p := round(unit_c * l.mult, 2);
        subt := round(unit_p * best_q, 2);
        sug_arr := sug_arr || jsonb_build_object(
          'quantity',best_q,'unit_price_mxn',unit_p,'subtotal_mxn',subt,
          'currency','MXN','tax_included',false,'price_status','valid');
      END IF;
    END LOOP;

    sug_arr := coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'quantity')::int)
      FROM (SELECT DISTINCT ON ((v->>'quantity')::int) v AS x
            FROM jsonb_array_elements(sug_arr) v
            ORDER BY (v->>'quantity')::int, (v->>'unit_price_mxn')::numeric ASC) t
    ), '[]'::jsonb);

    prev_up := NULL;
    FOR i IN 0 .. jsonb_array_length(sug_arr)-1 LOOP
      cur_up := (sug_arr->i->>'unit_price_mxn')::numeric;
      IF prev_up IS NOT NULL AND cur_up > prev_up THEN v_monotonic := false; EXIT; END IF;
      prev_up := cur_up;
    END LOOP;
    v_suggested := sug_arr;
  END;

  IF NOT v_monotonic THEN
    status := 'manual_review'; warning_code := 'non_monotonic_scales';
    suggested := '[]'::jsonb; RETURN NEXT; RETURN;
  END IF;

  suggested := v_suggested;
  IF jsonb_array_length(v_suggested) > 0 THEN
    v_min_qty_valid := (v_suggested->0->>'quantity')::int;
  ELSE
    v_min_qty_valid := v_moq;
  END IF;
  minimum_quantity := v_min_qty_valid;

  SELECT * INTO v_scale FROM public.producto_precio_escalas
  WHERE oferta_id=v_oferta_id AND unit_cost>0
    AND min_qty<=p_quantity AND (max_qty IS NULL OR max_qty>=p_quantity)
  ORDER BY min_qty DESC LIMIT 1;

  IF v_scale.id IS NULL THEN
    status := 'below_minimum';
    warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
    RETURN NEXT; RETURN;
  END IF;

  -- G4: costo base fijo desde escala 250, independientemente de v_scale.
  v_effective_unit_cost := coalesce(v_g4_fixed_cost, v_scale.unit_cost);
  v_adjusted_cost := round(v_effective_unit_cost * v_rule.cost_factor, 4);
  applied_unit_cost := v_effective_unit_cost; adjusted_unit_cost := v_adjusted_cost;

  DECLARE l record; up numeric; sub numeric;
  BEGIN
    FOR l IN
      SELECT pl.level_number, pl.threshold_amount_mxn,
        coalesce(
          (SELECT mt.multiplier FROM public.margin_tiers mt
           WHERE mt.rule_set_id=pl.rule_set_id AND mt.level_number=pl.level_number
             AND mt.applies_to='product' AND mt.provider_code=v_provider_code),
          (SELECT mt.multiplier FROM public.margin_tiers mt
           WHERE mt.rule_set_id=pl.rule_set_id AND mt.level_number=pl.level_number
             AND mt.applies_to='product' AND mt.provider_code IS NULL)
        ) AS mult
      FROM public.purchase_levels pl WHERE pl.rule_set_id=p_rule_set_id
      ORDER BY pl.level_number DESC
    LOOP
      IF l.mult IS NULL THEN CONTINUE; END IF;
      up := round(v_adjusted_cost * l.mult, 2);
      sub := round(up * p_quantity, 2);
      IF sub >= l.threshold_amount_mxn THEN
        v_chosen_level := l.level_number; v_chosen_mult := l.mult;
        v_chosen_unit := up; v_chosen_subtotal := sub; EXIT;
      END IF;
    END LOOP;
  END;

  IF v_chosen_level IS NULL THEN
    status := 'below_minimum';
    warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
    RETURN NEXT; RETURN;
  END IF;

  status := 'valid';
  warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
  is_valid_quantity := true;
  lower_valid_quantity := v_min_qty_valid; upper_valid_quantity := v_scale.max_qty;
  unit_price_mxn := v_chosen_unit; subtotal_mxn := v_chosen_subtotal;
  applied_level := v_chosen_level; applied_multiplier := v_chosen_mult;
  RETURN NEXT;
END;
$function$;

-- Restaurar grants (CREATE OR REPLACE los preserva, pero se declaran explícitos).
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) TO service_role;
