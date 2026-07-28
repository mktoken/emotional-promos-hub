
-- =========================================================
-- CDO — Integración masiva + Regla Precio Personal en Motor V2
-- Lote: cdo_bulk_2026_01
-- =========================================================

-- ---------------------------------------------------------
-- 0. PREFLIGHT ASSERTIONS
-- ---------------------------------------------------------
DO $preflight$
DECLARE
  v_cdo_id uuid;
  v_missing_np int;
  v_draft_active boolean;
BEGIN
  SELECT id INTO v_cdo_id FROM public.proveedores WHERE code = 'cdo_mx';
  IF v_cdo_id IS NULL THEN
    RAISE EXCEPTION 'cdo_mx no encontrado en proveedores';
  END IF;

  -- Draft V2 must exist and be inactive
  SELECT is_active INTO v_draft_active
  FROM public.pricing_rule_sets
  WHERE id = '6dfe8a90-ae52-4b9f-8ed1-6db22029de23';
  IF v_draft_active IS NULL THEN
    RAISE EXCEPTION 'Draft V2 rule set inexistente';
  END IF;
  IF v_draft_active THEN
    RAISE EXCEPTION 'Draft V2 debe permanecer inactivo; abortando';
  END IF;

  -- Todas las ofertas CDO deben tener al menos un net_price positivo
  SELECT COUNT(*) INTO v_missing_np
  FROM public.producto_proveedor_ofertas o
  WHERE o.proveedor_id = v_cdo_id
    AND NOT EXISTS (
      SELECT 1 FROM public.producto_precio_escalas s
      WHERE s.oferta_id = o.id AND s.unit_cost > 0
    );
  IF v_missing_np > 0 THEN
    RAISE EXCEPTION 'CDO: % ofertas sin precio positivo; abortando', v_missing_np;
  END IF;
END
$preflight$;

-- ---------------------------------------------------------
-- PHASE A: mapear 5 productos existentes
-- ---------------------------------------------------------
DO $phase_a$
DECLARE
  v_cdo_id uuid;
  v_rec record;
  v_primary_offer uuid;
  v_maps_created int := 0;
  v_products_mapped int := 0;
BEGIN
  SELECT id INTO v_cdo_id FROM public.proveedores WHERE code = 'cdo_mx';

  FOR v_rec IN
    SELECT r.id AS raw_id, r.provider_sku, p.id AS b2b_id, p.id_interno
    FROM (VALUES
      ('C578','CDO_C578'),('T164','CDO_T164'),('T702','CDO_T702'),
      ('T723','CDO_T723'),('T731','CDO_T731')
    ) v(provider_sku, id_interno)
    JOIN public.provider_raw_products r
      ON r.provider_sku = v.provider_sku AND r.proveedor_id = v_cdo_id
    JOIN public.productos_b2b p
      ON p.id_interno = v.id_interno
  LOOP
    -- Guardia: el producto B2B destino no puede tener mapeos de otro raw CDO
    IF EXISTS (
      SELECT 1 FROM public.producto_b2b_oferta_map m
      JOIN public.producto_proveedor_ofertas o ON o.id = m.oferta_id
      WHERE m.producto_b2b_id = v_rec.b2b_id
        AND o.provider_raw_product_id <> v_rec.raw_id
    ) THEN
      RAISE EXCEPTION 'Phase A: b2b % ya tiene ofertas de otro raw CDO; abortando', v_rec.id_interno;
    END IF;

    SELECT o.id INTO v_primary_offer
    FROM public.producto_proveedor_ofertas o
    WHERE o.provider_raw_product_id = v_rec.raw_id
    ORDER BY (o.imagen_url IS NULL), o.id::text
    LIMIT 1;

    WITH ins AS (
      INSERT INTO public.producto_b2b_oferta_map
        (producto_b2b_id, id_interno, oferta_id, proveedor_id, provider_code,
         is_primary, match_score, match_reason)
      SELECT v_rec.b2b_id, v_rec.id_interno, o.id, v_cdo_id, 'cdo_mx',
             (o.id = v_primary_offer), 1.0,
             CASE WHEN o.id = v_primary_offer
                  THEN 'cdo_bulk_2026_01_map_existing'
                  ELSE 'cdo_bulk_2026_01_secondary' END
      FROM public.producto_proveedor_ofertas o
      WHERE o.provider_raw_product_id = v_rec.raw_id
      ON CONFLICT (oferta_id) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_maps_created FROM (SELECT v_maps_created + (SELECT count(*) FROM ins)) t;

    UPDATE public.provider_raw_products
    SET productos_b2b_id = v_rec.b2b_id
    WHERE id = v_rec.raw_id AND productos_b2b_id IS NULL;

    v_products_mapped := v_products_mapped + 1;
  END LOOP;

  RAISE NOTICE 'PHASE A: % productos existentes mapeados', v_products_mapped;
END
$phase_a$;

-- ---------------------------------------------------------
-- PHASE B: crear productos B2B nuevos (inequívocos)
-- ---------------------------------------------------------
DO $phase_b$
DECLARE
  v_cdo_id uuid;
  v_rec record;
  v_new_id uuid;
  v_id_interno text;
  v_variantes jsonb;
  v_imagenes jsonb;
  v_esp jsonb;
  v_primary_offer uuid;
  v_stock_qty int;
  v_last_stock timestamptz;
  v_image_available boolean;
  v_stock_status text;
  v_quote_mode text;
  v_created int := 0;
  v_skipped_existing_id int := 0;
BEGIN
  SELECT id INTO v_cdo_id FROM public.proveedores WHERE code = 'cdo_mx';

  FOR v_rec IN
    WITH cand AS (
      SELECT r.id AS raw_id, r.provider_sku, r.nombre, r.descripcion, r.categoria,
             substring(upper(r.provider_sku) from '^([A-Z]+[0-9]+)') AS sku_prefix
      FROM public.provider_raw_products r
      WHERE r.proveedor_id = v_cdo_id
        AND r.activo
        AND r.productos_b2b_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.producto_proveedor_ofertas o
          JOIN public.producto_b2b_oferta_map m ON m.oferta_id = o.id
          WHERE o.provider_raw_product_id = r.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.productos_b2b p WHERE p.sku_base = r.provider_sku
        )
    )
    SELECT c.*
    FROM cand c
    WHERE NOT (
      c.sku_prefix IS NOT NULL AND EXISTS (
        SELECT 1 FROM cand c2 WHERE c2.raw_id <> c.raw_id AND c2.sku_prefix = c.sku_prefix
      )
    )
  LOOP
    v_id_interno := 'pp_' || substring(
      encode(extensions.digest('cdo_mx:' || v_rec.provider_sku, 'sha256'), 'hex') for 24
    );

    IF EXISTS (SELECT 1 FROM public.productos_b2b WHERE id_interno = v_id_interno) THEN
      v_skipped_existing_id := v_skipped_existing_id + 1;
      CONTINUE;
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
             'oferta_id', o.id,
             'color_code', o.color_code,
             'color_nombre', o.color_nombre,
             'talla', o.talla,
             'material', o.material,
             'modelo', o.modelo,
             'imagen_url', o.imagen_url
           ) ORDER BY o.id)
    INTO v_variantes
    FROM public.producto_proveedor_ofertas o
    WHERE o.provider_raw_product_id = v_rec.raw_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('url', u)), '[]'::jsonb)
    INTO v_imagenes
    FROM (
      SELECT DISTINCT o.imagen_url AS u
      FROM public.producto_proveedor_ofertas o
      WHERE o.provider_raw_product_id = v_rec.raw_id AND o.imagen_url IS NOT NULL
    ) s;

    SELECT o.id INTO v_primary_offer
    FROM public.producto_proveedor_ofertas o
    WHERE o.provider_raw_product_id = v_rec.raw_id
    ORDER BY (o.imagen_url IS NULL), o.id::text
    LIMIT 1;

    -- Whitelist mínima de especificaciones desde primary offer
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'material', o.material,
      'modelo', o.modelo
    ))
    INTO v_esp
    FROM public.producto_proveedor_ofertas o
    WHERE o.id = v_primary_offer;

    INSERT INTO public.productos_b2b (
      id_interno, proveedor_nombre, sku_base,
      datos_generales, variantes, imagenes,
      especificaciones_tecnicas, datos_logistica_b2b, motor_de_personalizacion, costeo,
      activo, categoria_principal
    ) VALUES (
      v_id_interno,
      'CDO Promocionales México',
      NULL,
      jsonb_build_object(
        'nombre', v_rec.nombre,
        'descripcion', COALESCE(v_rec.descripcion, ''),
        'promoted_at', now()::text,
        'source', 'cdo_bulk_2026_01_create_new'
      ),
      COALESCE(v_variantes, '[]'::jsonb),
      v_imagenes,
      COALESCE(v_esp, '{}'::jsonb),
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      false,
      v_rec.categoria
    )
    RETURNING id INTO v_new_id;

    v_created := v_created + 1;

    INSERT INTO public.producto_b2b_oferta_map
      (producto_b2b_id, id_interno, oferta_id, proveedor_id, provider_code,
       is_primary, match_score, match_reason)
    SELECT v_new_id, v_id_interno, o.id, v_cdo_id, 'cdo_mx',
           (o.id = v_primary_offer), 1.0,
           CASE WHEN o.id = v_primary_offer
                THEN 'cdo_bulk_2026_01_create_new'
                ELSE 'cdo_bulk_2026_01_secondary' END
    FROM public.producto_proveedor_ofertas o
    WHERE o.provider_raw_product_id = v_rec.raw_id
    ON CONFLICT (oferta_id) DO NOTHING;

    SELECT COALESCE(SUM(st.cantidad), 0)::int, MAX(st.updated_at)
    INTO v_stock_qty, v_last_stock
    FROM public.producto_proveedor_ofertas o
    LEFT JOIN public.producto_proveedor_stock st ON st.oferta_id = o.id
    WHERE o.provider_raw_product_id = v_rec.raw_id;

    v_image_available := jsonb_array_length(v_imagenes) > 0;

    IF v_stock_qty = 0 THEN
      v_stock_status := 'agotado';
      v_quote_mode := 'consultar_disponibilidad';
    ELSIF v_stock_qty < 50 THEN
      v_stock_status := 'bajo';
      v_quote_mode := 'cotizable';
    ELSE
      v_stock_status := 'disponible';
      v_quote_mode := 'cotizable';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.producto_b2b_status WHERE producto_b2b_id = v_new_id) THEN
      INSERT INTO public.producto_b2b_status (
        producto_b2b_id, id_interno, public_visible, stock_status, stock_qty,
        quote_mode, kit_eligible, price_valid, image_available, last_stock_sync_at
      ) VALUES (
        v_new_id, v_id_interno,
        false, v_stock_status, v_stock_qty,
        v_quote_mode, false, false, v_image_available, v_last_stock
      );
    END IF;

    UPDATE public.provider_raw_products
    SET productos_b2b_id = v_new_id
    WHERE id = v_rec.raw_id AND productos_b2b_id IS NULL;
  END LOOP;

  RAISE NOTICE 'PHASE B: creados=% skipped_existing_id=%', v_created, v_skipped_existing_id;
END
$phase_b$;

-- ---------------------------------------------------------
-- PHASE D: Motor V2 — regla Precio Personal CDO
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_product_price_v2(
  p_producto_b2b_id uuid, p_quantity integer, p_rule_set_id uuid
) RETURNS TABLE(
  status text, warning_code text, requested_quantity integer, is_valid_quantity boolean,
  minimum_quantity integer, lower_valid_quantity integer, upper_valid_quantity integer,
  unit_price_mxn numeric, subtotal_mxn numeric, currency text, tax_included boolean,
  applied_level integer, applied_multiplier numeric, applied_unit_cost numeric,
  adjusted_unit_cost numeric, applied_cost_factor numeric, applied_provider_code text,
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
  v_g4_costs numeric[]; v_g4_fixed_cost numeric;
  v_cdo_costs numeric[]; v_cdo_fixed_cost numeric;
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
  -- G4: costo base fijo desde min_qty = 250 conectada.
  -- =====================================================================
  IF v_provider_code = 'g4_mx' THEN
    SELECT array_agg(DISTINCT unit_cost)
      INTO v_g4_costs
    FROM public.producto_precio_escalas
    WHERE oferta_id = v_oferta_id AND min_qty = 250 AND unit_cost > 0;

    IF v_g4_costs IS NULL OR array_length(v_g4_costs, 1) = 0 THEN
      status := 'request_quote'; warning_code := 'no_g4_250_scale';
      RETURN NEXT; RETURN;
    ELSIF array_length(v_g4_costs, 1) > 1 THEN
      status := 'manual_review'; warning_code := 'multiple_g4_250_costs';
      RETURN NEXT; RETURN;
    END IF;
    v_g4_fixed_cost := v_g4_costs[1];
  END IF;

  -- =====================================================================
  -- CDO: costo base fijo = Precio Personal conectado (variant.net_price
  --      o cdo.precio_personal_api). Sin fallback a list_price. Costo
  --      independiente de la cantidad solicitada.
  -- =====================================================================
  IF v_provider_code = 'cdo_mx' THEN
    SELECT array_agg(DISTINCT unit_cost)
      INTO v_cdo_costs
    FROM public.producto_precio_escalas
    WHERE oferta_id = v_oferta_id
      AND unit_cost > 0
      AND source_field IN ('variant.net_price', 'cdo.precio_personal_api');

    IF v_cdo_costs IS NULL OR array_length(v_cdo_costs, 1) = 0 THEN
      status := 'request_quote'; warning_code := 'no_cdo_personal_price';
      RETURN NEXT; RETURN;
    ELSIF array_length(v_cdo_costs, 1) > 1 THEN
      status := 'manual_review'; warning_code := 'multiple_cdo_personal_prices';
      RETURN NEXT; RETURN;
    END IF;
    v_cdo_fixed_cost := v_cdo_costs[1];
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
        unit_c := round(coalesce(v_g4_fixed_cost, v_cdo_fixed_cost, s.unit_cost) * v_rule.cost_factor, 4);
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
        unit_c := round(coalesce(v_g4_fixed_cost, v_cdo_fixed_cost, scale_used.unit_cost) * v_rule.cost_factor, 4);
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

  v_effective_unit_cost := coalesce(v_g4_fixed_cost, v_cdo_fixed_cost, v_scale.unit_cost);
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

-- Reasegurar grants (CREATE OR REPLACE los conserva; explícito por seguridad)
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_product_price_v2(uuid, integer, uuid) TO service_role;

-- ---------------------------------------------------------
-- PHASE E: normalizar source_field CDO -> cdo.precio_personal_api
-- Sólo cambia el nombre de la fuente; no cambia unit_cost.
-- ---------------------------------------------------------
UPDATE public.producto_precio_escalas s
SET source_field = 'cdo.precio_personal_api'
FROM public.producto_proveedor_ofertas o
WHERE s.oferta_id = o.id
  AND o.proveedor_id = (SELECT id FROM public.proveedores WHERE code = 'cdo_mx')
  AND s.source_field = 'variant.net_price'
  AND s.unit_cost > 0;

-- ---------------------------------------------------------
-- POST-ASSERT: sin duplicados, sin fusiones cruzadas
-- ---------------------------------------------------------
DO $post$
DECLARE
  v_cdo_id uuid;
  v_dup_offers int;
  v_missing_pp int;
BEGIN
  SELECT id INTO v_cdo_id FROM public.proveedores WHERE code = 'cdo_mx';

  -- ofertas con más de un mapeo (imposible por UNIQUE, doble check)
  SELECT COUNT(*) INTO v_dup_offers FROM (
    SELECT oferta_id, COUNT(*) c FROM public.producto_b2b_oferta_map
    WHERE provider_code='cdo_mx' GROUP BY oferta_id HAVING COUNT(*)>1
  ) t;
  IF v_dup_offers > 0 THEN
    RAISE EXCEPTION 'POST: % ofertas CDO con múltiples mapeos', v_dup_offers;
  END IF;

  -- toda escala CDO debe tener source_field cdo.precio_personal_api
  SELECT COUNT(*) INTO v_missing_pp
  FROM public.producto_precio_escalas s
  JOIN public.producto_proveedor_ofertas o ON o.id = s.oferta_id
  WHERE o.proveedor_id = v_cdo_id
    AND s.unit_cost > 0
    AND s.source_field <> 'cdo.precio_personal_api';
  IF v_missing_pp > 0 THEN
    RAISE EXCEPTION 'POST: % escalas CDO con source_field inesperado', v_missing_pp;
  END IF;

  RAISE NOTICE 'POST-ASSERT OK';
END
$post$;
