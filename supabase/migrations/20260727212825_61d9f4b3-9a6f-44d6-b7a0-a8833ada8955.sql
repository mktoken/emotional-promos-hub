-- Fase 1A: Motor unificado de precio de producto (BORRADOR, no activo)
-- Preflight + clone rule set + funciones V2 internas.

DO $preflight$
DECLARE
  v_active_count int;
  v_active_id uuid;
  v_new_id uuid;
BEGIN
  -- 1. Exactamente un rule set activo
  SELECT count(*)::int INTO v_active_count FROM public.pricing_rule_sets WHERE is_active = true;
  SELECT id INTO v_active_id FROM public.pricing_rule_sets WHERE is_active = true ORDER BY active_from DESC LIMIT 1;
  IF v_active_count <> 1 THEN
    RAISE EXCEPTION 'Preflight: esperaba exactamente 1 rule set activo, encontré %', v_active_count;
  END IF;

  -- 2. Niveles 1..6 completos en el activo
  IF (SELECT count(*) FROM public.purchase_levels WHERE rule_set_id = v_active_id) <> 6 THEN
    RAISE EXCEPTION 'Preflight: rule set activo no tiene 6 purchase_levels';
  END IF;

  -- 3. Thresholds estrictamente crecientes
  IF EXISTS (
    SELECT 1 FROM (
      SELECT threshold_amount_mxn,
             lag(threshold_amount_mxn) OVER (ORDER BY level_number) AS prev
      FROM public.purchase_levels WHERE rule_set_id = v_active_id
    ) x WHERE prev IS NOT NULL AND threshold_amount_mxn <= prev
  ) THEN
    RAISE EXCEPTION 'Preflight: thresholds no son estrictamente crecientes';
  END IF;

  -- 4. Multiplicadores no crecientes en el activo (por provider_code)
  IF EXISTS (
    SELECT 1 FROM (
      SELECT multiplier,
             lag(multiplier) OVER (PARTITION BY coalesce(provider_code,''), applies_to ORDER BY level_number) AS prev
      FROM public.margin_tiers WHERE rule_set_id = v_active_id
    ) x WHERE prev IS NOT NULL AND multiplier > prev
  ) THEN
    RAISE EXCEPTION 'Preflight: multiplicadores del activo no son monótonos no-crecientes';
  END IF;

  -- 5. Sin escalas inválidas
  IF EXISTS (SELECT 1 FROM public.producto_precio_escalas WHERE unit_cost <= 0 OR min_qty <= 0) THEN
    RAISE EXCEPTION 'Preflight: existen escalas con unit_cost<=0 o min_qty<=0';
  END IF;

  -- 6. Sin traslapes por oferta
  IF EXISTS (
    WITH s AS (
      SELECT oferta_id, max_qty,
             lead(min_qty) OVER (PARTITION BY oferta_id ORDER BY min_qty) AS next_min
      FROM public.producto_precio_escalas
    )
    SELECT 1 FROM s WHERE max_qty IS NOT NULL AND next_min IS NOT NULL AND max_qty >= next_min
  ) THEN
    RAISE EXCEPTION 'Preflight: existen escalas superpuestas para una misma oferta';
  END IF;

  -- 7. Funciones V2 no existen ya
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname IN ('calculate_product_price_v2','admin_preview_product_price_v2')) THEN
    RAISE EXCEPTION 'Preflight: funciones V2 ya existen; ejecuta rollback antes';
  END IF;

  -- 8. Draft no existe ya
  IF EXISTS (SELECT 1 FROM public.pricing_rule_sets WHERE version = '2026-01-v2-draft') THEN
    RAISE EXCEPTION 'Preflight: rule set draft v2 ya existe';
  END IF;

  -- === Clonado ===
  INSERT INTO public.pricing_rule_sets (name, version, description, is_active, active_from, active_until)
  SELECT name,
         '2026-01-v2-draft',
         coalesce(description,'') || E'\n[DRAFT v2] Ajuste factores niveles 4=1.25, 5=1.23, 6=1.19. INACTIVO.',
         false,
         now(),
         NULL
  FROM public.pricing_rule_sets
  WHERE id = v_active_id
  RETURNING id INTO v_new_id;

  INSERT INTO public.purchase_levels (rule_set_id, level_number, threshold_amount_mxn)
  SELECT v_new_id, level_number, threshold_amount_mxn
  FROM public.purchase_levels WHERE rule_set_id = v_active_id;

  INSERT INTO public.margin_tiers (rule_set_id, provider_code, level_number, multiplier, applies_to, notes)
  SELECT v_new_id,
         provider_code,
         level_number,
         CASE level_number
           WHEN 4 THEN 1.2500
           WHEN 5 THEN 1.2300
           WHEN 6 THEN 1.1900
           ELSE multiplier
         END,
         applies_to,
         notes
  FROM public.margin_tiers WHERE rule_set_id = v_active_id;

  INSERT INTO public.provider_pricing_rules
    (rule_set_id, provider_code, base_cost_strategy, provider_tier_number, cost_factor,
     fallback_strategy, requires_manual_review_on_fallback, notes)
  SELECT v_new_id, provider_code, base_cost_strategy, provider_tier_number, cost_factor,
         fallback_strategy, requires_manual_review_on_fallback, notes
  FROM public.provider_pricing_rules WHERE rule_set_id = v_active_id;

  -- Validación post-clone
  IF EXISTS (
    SELECT 1 FROM (
      SELECT multiplier,
             lag(multiplier) OVER (PARTITION BY coalesce(provider_code,''), applies_to ORDER BY level_number) AS prev
      FROM public.margin_tiers WHERE rule_set_id = v_new_id
    ) x WHERE prev IS NOT NULL AND multiplier > prev
  ) THEN
    RAISE EXCEPTION 'Post-clone: multiplicadores V2 no son monótonos no-crecientes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.margin_tiers WHERE rule_set_id=v_new_id AND level_number=4 AND multiplier=1.2500) THEN
    RAISE EXCEPTION 'Post-clone: nivel 4 no quedó en 1.25';
  END IF;

  RAISE NOTICE 'Fase 1A: rule set draft V2 creado id=%', v_new_id;
END
$preflight$;


-- ============================================================
-- calculate_product_price_v2: motor interno
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_product_price_v2(
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
  lower_valid_quantity integer,
  upper_valid_quantity integer,
  unit_price_mxn numeric,
  subtotal_mxn numeric,
  currency text,
  tax_included boolean,
  applied_level integer,
  applied_multiplier numeric,
  applied_unit_cost numeric,
  adjusted_unit_cost numeric,
  applied_cost_factor numeric,
  applied_provider_code text,
  source_oferta_id uuid,
  suggested jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_oferta_id uuid;
  v_provider_code text;
  v_rule public.provider_pricing_rules;
  v_scale public.producto_precio_escalas;
  v_min_scale int;
  v_moq int;
  v_pack int := 1;
  v_pack_warning boolean := true; -- pack_multiple_not_configured por defecto
  v_adjusted_cost numeric;
  v_chosen_level int;
  v_chosen_mult numeric;
  v_chosen_unit numeric;
  v_chosen_subtotal numeric;
  v_min_qty_valid int;
  v_suggested jsonb := '[]'::jsonb;
  v_monotonic boolean := true;
BEGIN
  -- Init defaults
  currency := 'MXN';
  tax_included := false;
  requested_quantity := p_quantity;
  is_valid_quantity := false;
  suggested := '[]'::jsonb;

  -- Validaciones de entrada
  IF p_producto_b2b_id IS NULL OR p_quantity IS NULL OR p_rule_set_id IS NULL THEN
    status := 'unavailable'; warning_code := 'invalid_input';
    RETURN NEXT; RETURN;
  END IF;
  IF p_quantity <= 0 THEN
    status := 'unavailable'; warning_code := 'invalid_quantity';
    RETURN NEXT; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pricing_rule_sets WHERE id = p_rule_set_id) THEN
    status := 'unavailable'; warning_code := 'rule_set_not_found';
    RETURN NEXT; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos_b2b WHERE id = p_producto_b2b_id AND coalesce(activo, true) = true) THEN
    status := 'request_quote'; warning_code := 'product_not_eligible';
    RETURN NEXT; RETURN;
  END IF;

  -- Seleccionar oferta (primary, luego mejor match_score)
  SELECT m.oferta_id, m.provider_code
  INTO v_oferta_id, v_provider_code
  FROM public.producto_b2b_oferta_map m
  WHERE m.producto_b2b_id = p_producto_b2b_id
  ORDER BY (m.is_primary)::int DESC, m.match_score DESC NULLS LAST, m.created_at ASC
  LIMIT 1;

  IF v_oferta_id IS NULL THEN
    status := 'request_quote'; warning_code := 'no_offer';
    RETURN NEXT; RETURN;
  END IF;

  applied_provider_code := v_provider_code;
  source_oferta_id := v_oferta_id;

  -- Regla de proveedor
  SELECT * INTO v_rule
  FROM public.provider_pricing_rules
  WHERE rule_set_id = p_rule_set_id AND provider_code = v_provider_code;

  IF v_rule.id IS NULL THEN
    status := 'request_quote'; warning_code := 'no_provider_rule';
    RETURN NEXT; RETURN;
  END IF;
  applied_cost_factor := v_rule.cost_factor;

  -- MOQ = primera escala; pack no configurado explícitamente => 1
  SELECT min(min_qty) INTO v_min_scale
  FROM public.producto_precio_escalas WHERE oferta_id = v_oferta_id AND unit_cost > 0;

  IF v_min_scale IS NULL THEN
    status := 'request_quote'; warning_code := 'no_scales';
    RETURN NEXT; RETURN;
  END IF;
  v_moq := v_min_scale;
  minimum_quantity := v_moq;

  -- Precomputar suggested por nivel usando todas las escalas
  DECLARE
    l record;
    s record;
    unit_c numeric;
    unit_p numeric;
    raw_q numeric;
    adj_q int;
    subt numeric;
    best_q int;
    sug_arr jsonb := '[]'::jsonb;
    scale_used public.producto_precio_escalas;
    prev_up numeric;
    cur_up numeric;
    i int;
  BEGIN
    FOR l IN
      SELECT pl.level_number, pl.threshold_amount_mxn,
             coalesce(
               (SELECT mt.multiplier FROM public.margin_tiers mt
                WHERE mt.rule_set_id = pl.rule_set_id
                  AND mt.level_number = pl.level_number
                  AND mt.applies_to = 'product'
                  AND mt.provider_code = v_provider_code),
               (SELECT mt.multiplier FROM public.margin_tiers mt
                WHERE mt.rule_set_id = pl.rule_set_id
                  AND mt.level_number = pl.level_number
                  AND mt.applies_to = 'product'
                  AND mt.provider_code IS NULL)
             ) AS mult
      FROM public.purchase_levels pl
      WHERE pl.rule_set_id = p_rule_set_id
      ORDER BY pl.level_number ASC
    LOOP
      IF l.mult IS NULL THEN CONTINUE; END IF;
      best_q := NULL;
      FOR s IN
        SELECT * FROM public.producto_precio_escalas
        WHERE oferta_id = v_oferta_id AND unit_cost > 0
        ORDER BY min_qty ASC
      LOOP
        unit_c := round(s.unit_cost * v_rule.cost_factor, 4);
        unit_p := round(unit_c * l.mult, 2);
        IF unit_p <= 0 THEN CONTINUE; END IF;
        raw_q := ceil(l.threshold_amount_mxn / unit_p);
        adj_q := greatest(raw_q::int, s.min_qty, v_moq);
        -- pack multiple = 1 → no requiere ajuste adicional
        IF s.max_qty IS NOT NULL AND adj_q > s.max_qty THEN CONTINUE; END IF;
        subt := round(unit_p * adj_q, 2);
        IF subt < l.threshold_amount_mxn THEN CONTINUE; END IF;
        IF best_q IS NULL OR adj_q < best_q THEN best_q := adj_q; END IF;
      END LOOP;

      IF best_q IS NOT NULL THEN
        SELECT * INTO scale_used FROM public.producto_precio_escalas
        WHERE oferta_id = v_oferta_id AND unit_cost > 0
          AND min_qty <= best_q AND (max_qty IS NULL OR max_qty >= best_q)
        ORDER BY min_qty DESC LIMIT 1;
        unit_c := round(scale_used.unit_cost * v_rule.cost_factor, 4);
        unit_p := round(unit_c * l.mult, 2);
        subt := round(unit_p * best_q, 2);
        sug_arr := sug_arr || jsonb_build_object(
          'quantity', best_q,
          'unit_price_mxn', unit_p,
          'subtotal_mxn', subt,
          'currency', 'MXN',
          'tax_included', false,
          'price_status', 'valid'
        );
      END IF;
    END LOOP;

    -- dedup + sort ASC por quantity
    sug_arr := coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'quantity')::int)
      FROM (
        SELECT DISTINCT ON ((v->>'quantity')::int) v AS x
        FROM jsonb_array_elements(sug_arr) v
        ORDER BY (v->>'quantity')::int, (v->>'unit_price_mxn')::numeric ASC
      ) t
    ), '[]'::jsonb);

    -- Monotonicidad
    prev_up := NULL;
    FOR i IN 0 .. jsonb_array_length(sug_arr) - 1 LOOP
      cur_up := (sug_arr->i->>'unit_price_mxn')::numeric;
      IF prev_up IS NOT NULL AND cur_up > prev_up THEN
        v_monotonic := false; EXIT;
      END IF;
      prev_up := cur_up;
    END LOOP;

    v_suggested := sug_arr;
  END;

  IF NOT v_monotonic THEN
    status := 'manual_review'; warning_code := 'non_monotonic_scales';
    suggested := '[]'::jsonb;
    RETURN NEXT; RETURN;
  END IF;

  suggested := v_suggested;
  IF jsonb_array_length(v_suggested) > 0 THEN
    v_min_qty_valid := (v_suggested->0->>'quantity')::int;
  ELSE
    v_min_qty_valid := v_moq;
  END IF;
  minimum_quantity := v_min_qty_valid;

  -- Escala aplicable a la cantidad solicitada
  SELECT * INTO v_scale FROM public.producto_precio_escalas
  WHERE oferta_id = v_oferta_id AND unit_cost > 0
    AND min_qty <= p_quantity AND (max_qty IS NULL OR max_qty >= p_quantity)
  ORDER BY min_qty DESC LIMIT 1;

  IF v_scale.id IS NULL THEN
    -- cantidad por debajo del mínimo o fuera de rango
    status := 'below_minimum';
    warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
    is_valid_quantity := false;
    RETURN NEXT; RETURN;
  END IF;

  v_adjusted_cost := round(v_scale.unit_cost * v_rule.cost_factor, 4);
  applied_unit_cost := v_scale.unit_cost;
  adjusted_unit_cost := v_adjusted_cost;

  -- Elegir mejor nivel: recorrer de 6 -> 1
  DECLARE
    l record;
    up numeric;
    sub numeric;
  BEGIN
    FOR l IN
      SELECT pl.level_number, pl.threshold_amount_mxn,
             coalesce(
               (SELECT mt.multiplier FROM public.margin_tiers mt
                WHERE mt.rule_set_id = pl.rule_set_id AND mt.level_number = pl.level_number
                  AND mt.applies_to = 'product' AND mt.provider_code = v_provider_code),
               (SELECT mt.multiplier FROM public.margin_tiers mt
                WHERE mt.rule_set_id = pl.rule_set_id AND mt.level_number = pl.level_number
                  AND mt.applies_to = 'product' AND mt.provider_code IS NULL)
             ) AS mult
      FROM public.purchase_levels pl
      WHERE pl.rule_set_id = p_rule_set_id
      ORDER BY pl.level_number DESC
    LOOP
      IF l.mult IS NULL THEN CONTINUE; END IF;
      up := round(v_adjusted_cost * l.mult, 2);
      sub := round(up * p_quantity, 2);
      IF sub >= l.threshold_amount_mxn THEN
        v_chosen_level := l.level_number;
        v_chosen_mult := l.mult;
        v_chosen_unit := up;
        v_chosen_subtotal := sub;
        EXIT;
      END IF;
    END LOOP;
  END;

  IF v_chosen_level IS NULL THEN
    status := 'below_minimum';
    warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
    is_valid_quantity := false;
    RETURN NEXT; RETURN;
  END IF;

  status := 'valid';
  warning_code := CASE WHEN v_pack_warning THEN 'pack_multiple_not_configured' ELSE NULL END;
  is_valid_quantity := true;
  lower_valid_quantity := v_min_qty_valid;
  upper_valid_quantity := v_scale.max_qty;
  unit_price_mxn := v_chosen_unit;
  subtotal_mxn := v_chosen_subtotal;
  applied_level := v_chosen_level;
  applied_multiplier := v_chosen_mult;
  RETURN NEXT;
END;
$fn$;

COMMENT ON FUNCTION public.calculate_product_price_v2(uuid,integer,uuid) IS
  'Fase 1A motor V2 interno. No expuesto al público. Devuelve status/precio y suggested por nivel.';

REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid,integer,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid,integer,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_product_price_v2(uuid,integer,uuid) TO service_role;


-- ============================================================
-- admin_preview_product_price_v2: vista previa administrativa
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_preview_product_price_v2(
  p_producto_b2b_id uuid,
  p_quantity integer,
  p_rule_set_id uuid DEFAULT NULL
)
RETURNS TABLE (
  status text,
  warning_code text,
  requested_quantity integer,
  is_valid_quantity boolean,
  minimum_quantity integer,
  lower_valid_quantity integer,
  upper_valid_quantity integer,
  unit_price_mxn numeric,
  subtotal_mxn numeric,
  currency text,
  tax_included boolean,
  applied_level integer,
  applied_multiplier numeric,
  applied_unit_cost numeric,
  adjusted_unit_cost numeric,
  applied_cost_factor numeric,
  applied_provider_code text,
  source_oferta_id uuid,
  suggested jsonb,
  rule_set_id uuid,
  rule_set_version text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_rs uuid;
  v_ver text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  v_rs := coalesce(
    p_rule_set_id,
    (SELECT id FROM public.pricing_rule_sets WHERE version = '2026-01-v2-draft' LIMIT 1)
  );
  IF v_rs IS NULL THEN
    RAISE EXCEPTION 'rule_set draft V2 no encontrado';
  END IF;
  SELECT version INTO v_ver FROM public.pricing_rule_sets WHERE id = v_rs;

  RETURN QUERY
  SELECT
    c.status, c.warning_code, c.requested_quantity, c.is_valid_quantity,
    c.minimum_quantity, c.lower_valid_quantity, c.upper_valid_quantity,
    c.unit_price_mxn, c.subtotal_mxn, c.currency, c.tax_included,
    c.applied_level, c.applied_multiplier, c.applied_unit_cost,
    c.adjusted_unit_cost, c.applied_cost_factor, c.applied_provider_code,
    c.source_oferta_id, c.suggested, v_rs, v_ver
  FROM public.calculate_product_price_v2(p_producto_b2b_id, p_quantity, v_rs) c;
END;
$fn$;

COMMENT ON FUNCTION public.admin_preview_product_price_v2(uuid,integer,uuid) IS
  'Fase 1A vista previa admin. Solo usuarios con rol admin o sales_manager.';

REVOKE ALL ON FUNCTION public.admin_preview_product_price_v2(uuid,integer,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_preview_product_price_v2(uuid,integer,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_product_price_v2(uuid,integer,uuid) TO authenticated;