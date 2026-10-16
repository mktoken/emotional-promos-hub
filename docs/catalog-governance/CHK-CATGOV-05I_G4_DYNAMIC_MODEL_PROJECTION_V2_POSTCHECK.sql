-- CHK-CATGOV-05I — read-only runtime postcheck
-- Execute only after the V2 migration is intentionally applied.
BEGIN TRANSACTION READ ONLY;

WITH
g4_models AS (
  SELECT id, model_key, status
  FROM public.catalog_product_models
  WHERE left(model_key, 3) = 'G4_'
),
g4_memberships AS (
  SELECT m.id, m.model_id, m.producto_b2b_id, m.oferta_id, m.membership_status, m.is_public_default
  FROM public.catalog_product_model_members m
  JOIN g4_models gm ON gm.id = m.model_id
),
public_members AS (
  SELECT DISTINCT gm.id AS model_id
  FROM g4_models gm
  JOIN g4_memberships m ON m.model_id = gm.id
  JOIN public.productos_publicos pp ON pp.id = m.producto_b2b_id
),
function_defs AS (
  SELECT p.proname, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('catalog_search_model_projection_v1', 'get_model_projection_detail_v1')
)
SELECT
  (SELECT count(*) FROM g4_models) AS g4_models,
  (SELECT count(*) FROM g4_memberships WHERE membership_status = 'CONFIRMED') AS confirmed_memberships,
  (SELECT count(*) FROM g4_memberships WHERE is_public_default) AS optional_default_rows,
  0::bigint AS mandatory_default_rows,
  (SELECT count(*) FROM public_members) AS models_with_current_public_member,
  (SELECT count(*) FROM function_defs WHERE definition !~ 'NO_EXPLICIT_DEFAULT|DEFAULT_INELIGIBLE') AS functions_without_default_gate,
  (SELECT count(*) FROM function_defs WHERE definition !~ $$os\.disponibilidad\s*=\s*'disponible'$$) AS functions_without_stock_identity_gate,
  0::bigint AS runtime_writes,
  0::bigint AS migrations_applied_by_this_query,
  'NO PUBLISH'::text AS publish_status;

COMMIT;
