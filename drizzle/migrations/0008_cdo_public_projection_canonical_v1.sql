-- CHK-CDO PUBLIC PROJECTION FINAL: use the current canonical eligibility state.
-- Keep the public relation contract stable while removing the frozen legacy
-- projection and its historical inclusion gates.


CREATE OR REPLACE VIEW public.productos_publicos AS
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
    WHEN cp.public_price_status = 'priced'
         AND cp.price_before_tax_mxn > 0
    THEN round(cp.price_before_tax_mxn, 2)
    ELSE NULL::numeric
  END AS precio_desde_mxn
FROM public.productos_b2b AS p
JOIN LATERAL (
  SELECT
    s.public_visible,
    s.price_valid,
    s.image_available,
    s.stock_qty
  FROM public.producto_b2b_status AS s
  WHERE s.producto_b2b_id = p.id
  ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
  LIMIT 1
) AS current_status ON true
LEFT JOIN public.catalog_price_v2_current_prices AS cp
  ON cp.product_id = p.id
WHERE current_status.public_visible = true
  AND current_status.price_valid = true
  AND current_status.image_available = true
  AND current_status.stock_qty > 0
  AND EXISTS (
    SELECT 1
    FROM public.product_category_assignments AS pca
    JOIN public.product_categories AS pc
      ON pc.id = pca.category_id
    WHERE pca.producto_b2b_id = p.id
      AND pc.is_active = true
  );

GRANT SELECT ON public.productos_publicos TO anon, authenticated;

