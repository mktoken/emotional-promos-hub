-- Redefine public.productos_publicos to include eligible pilot products
-- while preserving the exact 11-column contract consumed by the frontend.
--
-- Branch 1: legacy behavior (activo=true) unchanged.
-- Branch 2: pilot products from producto_b2b_status + catalog_price_cache
--           via LATERAL join, sanitized datos_generales, price before tax.

CREATE OR REPLACE VIEW public.productos_publicos AS
-- ============ Rama 1: legacy ============
SELECT
  p.id,
  p.id_interno,
  p.sku_base,
  p.categoria_principal,
  p.datos_generales,
  p.variantes,
  p.imagenes,
  p.motor_de_personalizacion,
  p.activo,
  p.updated_at,
  CASE
    WHEN (p.costeo ->> 'precio_neto_distribuidor') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN round(((p.costeo ->> 'precio_neto_distribuidor')::numeric) * 1.35, 2)
    ELSE NULL::numeric
  END AS precio_desde_mxn
FROM public.productos_b2b p
WHERE p.activo = true

UNION ALL

-- ============ Rama 2: piloto elegible ============
SELECT
  p.id,
  p.id_interno,
  p.sku_base,
  p.categoria_principal,
  jsonb_strip_nulls(jsonb_build_object(
    'nombre',       p.datos_generales ->> 'nombre',
    'descripcion',  p.datos_generales ->> 'descripcion',
    'pilot',        p.datos_generales ->> 'pilot',
    'promoted_at',  p.datos_generales ->> 'promoted_at'
  )) AS datos_generales,
  p.variantes,
  p.imagenes,
  p.motor_de_personalizacion,
  true AS activo,   -- proyectado; la fila subyacente sigue activo=false
  p.updated_at,
  c.min_price_before_tax_mxn AS precio_desde_mxn
FROM public.productos_b2b p
JOIN public.producto_b2b_status s
  ON s.producto_b2b_id = p.id
JOIN LATERAL (
  SELECT cc.min_price_before_tax_mxn
  FROM public.catalog_price_cache cc
  WHERE cc.producto_b2b_id = p.id
    AND cc.price_status = 'valid'
    AND cc.tax_included = false
    AND cc.currency = 'MXN'
    AND cc.min_price_before_tax_mxn IS NOT NULL
  ORDER BY
    cc.calculated_at DESC NULLS LAST,
    cc.updated_at    DESC NULLS LAST,
    cc.created_at    DESC NULLS LAST
  LIMIT 1
) c ON true
WHERE p.activo = false
  AND (p.datos_generales ->> 'pilot') = 'true'
  AND s.public_visible  = true
  AND s.stock_status    = 'disponible'
  AND s.price_valid     = true
  AND s.image_available = true
  AND s.quote_mode      = 'cotizable';

-- Reafirmar GRANT (no ampliar)
GRANT SELECT ON public.productos_publicos TO anon, authenticated;