-- PE ForPromotional activation package
-- Stage 0: READ-ONLY preflight. Do not run any later stage until every
-- required result is PASS. This script performs no INSERT/UPDATE/DELETE.

SELECT
  'public.forpromotional_curve_price_v1(numeric,integer,integer)' AS function_name,
  to_regprocedure('public.forpromotional_curve_price_v1(numeric,integer,integer)') IS NOT NULL AS installed;

SELECT
  'public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)' AS function_name,
  to_regprocedure('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)') IS NOT NULL AS installed;

SELECT
  'public.get_public_product_price_quote_v2(uuid,integer)' AS function_name,
  to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)') IS NOT NULL AS installed;

SELECT
  p.oid::regprocedure::text AS function_identity,
  md5(pg_get_functiondef(p.oid)) AS definition_md5,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  pg_get_userbyid(p.proowner) AS owner
FROM pg_proc AS p
WHERE p.oid IN (
  to_regprocedure('public.forpromotional_curve_price_v1(numeric,integer,integer)'),
  to_regprocedure('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)'),
  to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)'),
  to_regprocedure('public.get_public_product_price_quote(uuid,integer)')
)
ORDER BY function_identity;

WITH current_release AS (
  SELECT r.id AS release_id, r.generation_id, g.rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g
    ON g.id = r.generation_id
  WHERE r.is_current = true
)
SELECT
  (SELECT count(*) FROM current_release) AS current_release_count,
  cr.release_id,
  cr.generation_id,
  cr.rule_set_id,
  r.provider_code,
  r.base_cost_strategy,
  r.cost_factor,
  r.provider_tier_number
FROM current_release AS cr
LEFT JOIN public.provider_pricing_rules AS r
  ON r.rule_set_id = cr.rule_set_id
ORDER BY r.provider_code;

SELECT
  to_regclass('public.pricing_policy_flags') AS policy_flags_table,
  CASE
    WHEN to_regclass('public.pricing_policy_flags') IS NULL THEN 'NOT_INSTALLED'
    ELSE 'INSTALLED'
  END AS policy_table_status;

-- The table is intentionally optional before the disabled-install stage. Do
-- not reference it statically here: a missing table is a valid preflight
-- result, not a parser/runtime failure. After installation, verify the row
-- with the SELECT in 06_post_activation_verify.sql.

SELECT
  jobid,
  jobname,
  schedule,
  active,
  CASE
    WHEN command ~* 'refresh-provider-stock' THEN 'WRITES_VIA_REFRESH_PROVIDER_STOCK'
    ELSE 'NO_MATCH'
  END AS runtime_effect
FROM cron.job
WHERE jobname IN (
  'catalog-stock-refresh-forpromotional',
  'catalog-stock-refresh-g4',
  'catalog-stock-refresh-cdo'
)
ORDER BY jobname;

SELECT
  p.code AS provider_code,
  count(DISTINCT o.id) AS offer_count,
  count(DISTINCT s.id) AS scale_count,
  count(*) FILTER (WHERE s.source_field = 'forpromotional.api.precio_desc') AS api_cost_scale_count
FROM public.proveedores AS p
LEFT JOIN public.producto_proveedor_ofertas AS o
  ON o.proveedor_id = p.id
LEFT JOIN public.producto_precio_escalas AS s
  ON s.oferta_id = o.id
WHERE p.code IN ('forpromotional', 'g4_mx', 'cdo_mx')
GROUP BY p.code
ORDER BY p.code;

-- Expected stop conditions:
-- * more than one current release;
-- * zero or multiple ForPromotional rules in the current rule set;
-- * an unexpected ForPromotional factor;
-- * an active refresh cron job that cannot be paused for the transition;
-- * any G4/CDO rule or count that differs from the recorded baseline.
