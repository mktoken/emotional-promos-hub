-- =====================================================================
-- Fix: public.get_public_product_price_tiers
-- Motivo: la función comparaba price_status = 'price_valid' (inexistente)
-- y usaba un fallback con multiplicador 1.35 cuando no hallaba caché.
-- El vocabulario real emitido por promote-provider-products-to-catalog es
-- 'valid' | 'manual_review' | 'unavailable'.
-- Este cambio elimina el fallback y exige caché real con precio > 0.
-- Firma, grants, SECURITY DEFINER y whitelist de columnas se preservan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ROLLBACK (ejecutar este bloque SQL completo para restaurar la versión
-- anterior de la función):
-- ---------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION public.get_public_product_price_tiers(
--   p_producto_b2b_id uuid DEFAULT NULL::uuid,
--   p_id_interno text DEFAULT NULL::text
-- )
-- RETURNS TABLE(
--   min_qty integer,
--   max_qty integer,
--   precio_unitario_mxn numeric,
--   currency text,
--   tax_included boolean,
--   price_status text
-- )
-- LANGUAGE sql
-- STABLE SECURITY DEFINER
-- SET search_path TO 'public', 'pg_temp'
-- AS $rollback$
--   with visible_product as (
--     select pp.id as producto_b2b_id, pp.id_interno, pp.precio_desde_mxn
--     from public.productos_publicos pp
--     where (p_producto_b2b_id is not null and pp.id = p_producto_b2b_id)
--        or (p_id_interno is not null and pp.id_interno = p_id_interno)
--     limit 1
--   ),
--   cache as (
--     select c.producto_b2b_id, c.id_interno, c.source_oferta_id,
--            coalesce(c.currency, 'MXN') as cache_currency,
--            coalesce(c.tax_included, false) as cache_tax_included,
--            c.price_status as cache_price_status
--     from public.catalog_price_cache c
--     join visible_product vp
--       on c.producto_b2b_id = vp.producto_b2b_id
--       or c.id_interno = vp.id_interno
--     where c.price_status = 'price_valid'
--     order by c.calculated_at desc nulls last, c.updated_at desc
--     limit 1
--   ),
--   selected_offer as (
--     select m.oferta_id,
--            coalesce(c.cache_currency, 'MXN') as tier_currency,
--            coalesce(c.cache_tax_included, false) as tier_tax_included,
--            coalesce(c.cache_price_status, 'price_valid') as tier_price_status
--     from visible_product vp
--     join public.producto_b2b_oferta_map m on m.producto_b2b_id = vp.producto_b2b_id
--     left join cache c on true
--     where c.source_oferta_id is null or m.oferta_id = c.source_oferta_id or m.is_primary = true
--     order by case when m.oferta_id = c.source_oferta_id then 1
--                   when m.is_primary = true then 2 else 3 end,
--              m.match_score desc nulls last, m.created_at asc
--     limit 1
--   ),
--   raw_tiers as (
--     select pe.min_qty, min(pe.unit_cost) as unit_cost,
--            max(so.tier_currency) as tier_currency,
--            bool_or(so.tier_tax_included) as tier_tax_included,
--            max(so.tier_price_status) as tier_price_status
--     from selected_offer so
--     join public.producto_precio_escalas pe on pe.oferta_id = so.oferta_id
--     where pe.unit_cost is not null and pe.unit_cost > 0
--       and pe.min_qty is not null and pe.min_qty > 0
--     group by pe.min_qty
--   ),
--   price_factor as (
--     select case when min(rt.unit_cost) > 0 and max(vp.precio_desde_mxn) > 0
--                 then greatest(max(vp.precio_desde_mxn) / min(rt.unit_cost), 1)
--                 else 1.35 end as multiplier
--     from raw_tiers rt cross join visible_product vp
--   ),
--   priced as (
--     select rt.min_qty,
--            lead(rt.min_qty) over (order by rt.min_qty asc) as next_min_qty,
--            round((rt.unit_cost * pf.multiplier)::numeric, 2) as precio_unitario_mxn,
--            rt.tier_currency, rt.tier_tax_included, rt.tier_price_status
--     from raw_tiers rt cross join price_factor pf
--   )
--   select p.min_qty,
--          case when p.next_min_qty is null then null
--               else greatest(p.next_min_qty - 1, p.min_qty) end as max_qty,
--          p.precio_unitario_mxn, p.tier_currency as currency,
--          p.tier_tax_included as tax_included, p.tier_price_status as price_status
--   from priced p order by p.min_qty asc;
-- $rollback$;
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_product_price_tiers(
  p_producto_b2b_id uuid DEFAULT NULL::uuid,
  p_id_interno text DEFAULT NULL::text
)
RETURNS TABLE(
  min_qty integer,
  max_qty integer,
  precio_unitario_mxn numeric,
  currency text,
  tax_included boolean,
  price_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  -- Producto visible en el catálogo público (por id o id_interno).
  with visible_product as (
    select
      pp.id as producto_b2b_id,
      pp.id_interno,
      pp.precio_desde_mxn
    from public.productos_publicos pp
    where (
      p_producto_b2b_id is not null
      and pp.id = p_producto_b2b_id
    )
    or (
      p_id_interno is not null
      and pp.id_interno = p_id_interno
    )
    limit 1
  ),
  -- Estrictamente: solo cachés con price_status = 'valid' y precio > 0.
  -- Se elige la más reciente por calculated_at con desempate por updated_at e id.
  cache as (
    select
      c.producto_b2b_id,
      c.id_interno,
      c.source_oferta_id,
      c.min_price_before_tax_mxn,
      coalesce(c.currency, 'MXN') as cache_currency,
      coalesce(c.tax_included, false) as cache_tax_included,
      c.price_status as cache_price_status
    from public.catalog_price_cache c
    join visible_product vp
      on c.producto_b2b_id = vp.producto_b2b_id
      or c.id_interno = vp.id_interno
    where c.price_status = 'valid'
      and c.min_price_before_tax_mxn is not null
      and c.min_price_before_tax_mxn > 0
    order by
      c.calculated_at desc nulls last,
      c.updated_at desc,
      c.id desc
    limit 1
  ),
  -- Oferta ligada a la caché válida (si no hay caché válida, no habrá filas).
  selected_offer as (
    select
      m.oferta_id,
      c.cache_currency as tier_currency,
      c.cache_tax_included as tier_tax_included,
      c.cache_price_status as tier_price_status
    from visible_product vp
    join cache c
      on true
    join public.producto_b2b_oferta_map m
      on m.producto_b2b_id = vp.producto_b2b_id
    where
      m.oferta_id = c.source_oferta_id
      or (c.source_oferta_id is null and m.is_primary = true)
    order by
      case
        when m.oferta_id = c.source_oferta_id then 1
        when m.is_primary = true then 2
        else 3
      end,
      m.match_score desc nulls last,
      m.created_at asc
    limit 1
  ),
  -- Escalas crudas del proveedor asociadas a la oferta seleccionada.
  raw_tiers as (
    select
      pe.min_qty,
      min(pe.unit_cost) as unit_cost,
      max(so.tier_currency) as tier_currency,
      bool_or(so.tier_tax_included) as tier_tax_included,
      max(so.tier_price_status) as tier_price_status
    from selected_offer so
    join public.producto_precio_escalas pe
      on pe.oferta_id = so.oferta_id
    where pe.unit_cost is not null
      and pe.unit_cost > 0
      and pe.min_qty is not null
      and pe.min_qty > 0
    group by pe.min_qty
  ),
  -- Multiplicador derivado exclusivamente del precio público certificado
  -- que ya vive en la caché válida (min_price_before_tax_mxn).
  -- NO existe fallback: si no hay caché válida no se llega aquí porque
  -- selected_offer / raw_tiers estarán vacías.
  price_factor as (
    select
      case
        when min(rt.unit_cost) > 0
         and max(c.min_price_before_tax_mxn) > 0
        then greatest(
          max(c.min_price_before_tax_mxn) / min(rt.unit_cost),
          1
        )
        else null
      end as multiplier
    from raw_tiers rt
    cross join cache c
  ),
  priced as (
    select
      rt.min_qty,
      lead(rt.min_qty) over (order by rt.min_qty asc) as next_min_qty,
      round((rt.unit_cost * pf.multiplier)::numeric, 2) as precio_unitario_mxn,
      rt.tier_currency,
      rt.tier_tax_included,
      rt.tier_price_status
    from raw_tiers rt
    cross join price_factor pf
    where pf.multiplier is not null
  )
  select
    p.min_qty,
    case
      when p.next_min_qty is null then null
      else greatest(p.next_min_qty - 1, p.min_qty)
    end as max_qty,
    p.precio_unitario_mxn,
    p.tier_currency as currency,
    p.tier_tax_included as tax_included,
    p.tier_price_status as price_status
  from priced p
  where p.precio_unitario_mxn is not null
    and p.precio_unitario_mxn > 0
  order by p.min_qty asc;
$function$;

COMMENT ON FUNCTION public.get_public_product_price_tiers(uuid, text) IS
  'RPC pública de escalas de precio. Solo devuelve filas cuando existe una caché en public.catalog_price_cache con price_status = ''valid'' y min_price_before_tax_mxn > 0. Sin caché válida devuelve 0 filas (nunca aplica multiplicador de fallback). Los estados manual_review y unavailable no se publican. Las reglas comerciales por proveedor se calculan fuera de esta RPC (Edge Function promote-provider-products-to-catalog).';
