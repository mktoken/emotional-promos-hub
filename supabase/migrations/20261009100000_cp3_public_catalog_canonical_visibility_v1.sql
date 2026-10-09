-- CP-3 P0: make canonical status the sole public-visibility gate.
-- Preserve the prior view definition privately for rollback and auditing;
-- the public relation keeps its existing column contract and OID.

BEGIN;

DO $$
DECLARE
  v_definition text;
BEGIN
  IF to_regclass('public.productos_publicos_legacy_v1') IS NULL THEN
    SELECT pg_get_viewdef('public.productos_publicos'::regclass, true)
      INTO v_definition;

    EXECUTE format(
      'CREATE VIEW public.productos_publicos_legacy_v1 AS %s',
      v_definition
    );
  END IF;
END
$$;

CREATE OR REPLACE VIEW public.productos_publicos AS
SELECT
  legacy.id,
  legacy.id_interno,
  legacy.sku_base,
  legacy.categoria_principal,
  legacy.datos_generales,
  legacy.variantes,
  legacy.imagenes,
  legacy.motor_de_personalizacion,
  legacy.activo,
  legacy.updated_at,
  legacy.precio_desde_mxn
FROM public.productos_publicos_legacy_v1 AS legacy
JOIN LATERAL (
  SELECT
    s.public_visible,
    s.stock_status,
    s.price_valid,
    s.image_available,
    s.quote_mode
  FROM public.producto_b2b_status AS s
  WHERE s.producto_b2b_id = legacy.id
  ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
  LIMIT 1
) AS current_status ON true
WHERE current_status.public_visible = true
  AND current_status.stock_status = 'disponible'
  AND current_status.price_valid = true
  AND current_status.image_available = true
  AND current_status.quote_mode = 'cotizable';

REVOKE ALL ON public.productos_publicos_legacy_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.productos_publicos TO anon, authenticated;

COMMIT;
