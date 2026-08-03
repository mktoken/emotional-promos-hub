-- Contrato público autoritativo de precio por cantidad.
-- Requiere las migraciones de tablas V2 y releases reversibles.
-- NO publica releases, NO activa V2 y NO modifica contratos públicos existentes.

BEGIN;

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_has_current_release boolean := false;
  v_generation_id uuid;
  v_rule_set_id uuid;
  v_shadow_status text;
  v_shadow_price numeric;
  v_shadow_currency text;
  v_shadow_minimum_quantity integer;
  v_legacy_price numeric;
  v_calc record;
BEGIN
  IF p_producto_b2b_id IS NULL THEN
    RAISE EXCEPTION 'product_id_required'
      USING ERRCODE = '22004';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 1000000 THEN
    RAISE EXCEPTION 'quantity_out_of_range'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    true,
    r.generation_id,
    g.rule_set_id,
    s.public_price_status,
    s.price_before_tax_mxn,
    s.currency,
    s.minimum_quantity
  INTO
    v_has_current_release,
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
  WHERE r.is_current = true
  LIMIT 1;

  -- Sin release V2 publicada: preservar el contrato legacy actual.
  IF NOT COALESCE(v_has_current_release, false) THEN
    SELECT pp.precio_desde_mxn
    INTO v_legacy_price
    FROM public.productos_publicos AS pp
    WHERE pp.id = p_producto_b2b_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN QUERY
      SELECT
        'unavailable'::text,
        NULL::numeric,
        'MXN'::text,
        NULL::integer,
        NULL::uuid,
        p_quantity,
        false;
      RETURN;
    END IF;

    IF v_legacy_price IS NOT NULL AND v_legacy_price > 0 THEN
      RETURN QUERY
      SELECT
        'priced'::text,
        round(v_legacy_price, 2),
        'MXN'::text,
        1,
        NULL::uuid,
        p_quantity,
        true;
    ELSE
      RETURN QUERY
      SELECT
        'request_quote'::text,
        NULL::numeric,
        'MXN'::text,
        NULL::integer,
        NULL::uuid,
        p_quantity,
        true;
    END IF;

    RETURN;
  END IF;

  -- Existe release V2, pero este producto no forma parte de ella.
  IF v_shadow_status IS NULL THEN
    RETURN QUERY
    SELECT
      'unavailable'::text,
      NULL::numeric,
      'MXN'::text,
      NULL::integer,
      v_generation_id,
      p_quantity,
      false;
    RETURN;
  END IF;

  -- Estados sin precio autoritativo: no recalcular ni inventar importe.
  IF v_shadow_status IN ('request_quote', 'unavailable') THEN
    RETURN QUERY
    SELECT
      v_shadow_status,
      NULL::numeric,
      COALESCE(v_shadow_currency, 'MXN'),
      v_shadow_minimum_quantity,
      v_generation_id,
      p_quantity,
      true;
    RETURN;
  END IF;

  -- Solo los productos certificados como priced llegan al cálculo dinámico.
  SELECT *
  INTO v_calc
  FROM public.calculate_product_price_v2(
    p_producto_b2b_id,
    p_quantity,
    v_rule_set_id
  )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'request_quote'::text,
      NULL::numeric,
      COALESCE(v_shadow_currency, 'MXN'),
      v_shadow_minimum_quantity,
      v_generation_id,
      p_quantity,
      false;
    RETURN;
  END IF;

  CASE v_calc.status
    WHEN 'valid' THEN
      IF v_calc.unit_price_mxn IS NULL
         OR v_calc.unit_price_mxn <= 0
         OR v_calc.minimum_quantity IS NULL
         OR v_calc.minimum_quantity <= 0
      THEN
        RETURN QUERY
        SELECT
          'request_quote'::text,
          NULL::numeric,
          COALESCE(v_calc.currency, 'MXN'),
          v_calc.minimum_quantity,
          v_generation_id,
          p_quantity,
          false;
      ELSE
        RETURN QUERY
        SELECT
          'priced'::text,
          round(v_calc.unit_price_mxn, 2),
          COALESCE(v_calc.currency, 'MXN'),
          v_calc.minimum_quantity,
          v_generation_id,
          p_quantity,
          true;
      END IF;

    WHEN 'below_minimum' THEN
      RETURN QUERY
      SELECT
        'below_minimum'::text,
        NULL::numeric,
        COALESCE(v_calc.currency, 'MXN'),
        v_calc.minimum_quantity,
        v_generation_id,
        p_quantity,
        false;

    WHEN 'manual_review' THEN
      RETURN QUERY
      SELECT
        'request_quote'::text,
        NULL::numeric,
        COALESCE(v_calc.currency, 'MXN'),
        v_calc.minimum_quantity,
        v_generation_id,
        p_quantity,
        true;

    WHEN 'request_quote' THEN
      RETURN QUERY
      SELECT
        'request_quote'::text,
        NULL::numeric,
        COALESCE(v_calc.currency, 'MXN'),
        v_calc.minimum_quantity,
        v_generation_id,
        p_quantity,
        true;

    WHEN 'unavailable' THEN
      RETURN QUERY
      SELECT
        'unavailable'::text,
        NULL::numeric,
        COALESCE(v_calc.currency, 'MXN'),
        v_calc.minimum_quantity,
        v_generation_id,
        p_quantity,
        false;

    ELSE
      -- Fallback seguro: derivar a revisión humana sin exponer detalles internos.
      RETURN QUERY
      SELECT
        'request_quote'::text,
        NULL::numeric,
        COALESCE(v_calc.currency, 'MXN'),
        v_calc.minimum_quantity,
        v_generation_id,
        p_quantity,
        false;
  END CASE;

  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION
  public.get_public_product_price_quote(uuid, integer)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.get_public_product_price_quote(uuid, integer)
TO anon, authenticated;

COMMENT ON FUNCTION
  public.get_public_product_price_quote(uuid, integer)
IS
  'Precio público autoritativo por cantidad. Usa legacy sin release current y V2 cuando existe una generación publicada. No expone costos ni multiplicadores.';

COMMIT;
