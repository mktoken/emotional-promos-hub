-- PE ForPromotional activation package
-- Stage 3: post-activation checks. Read-only; stop on any FAIL.

WITH current_release AS (
  SELECT r.generation_id, g.rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g
    ON g.id = r.generation_id
  WHERE r.is_current = true
)
SELECT
  (SELECT count(*) FROM current_release) AS current_release_count,
  cr.rule_set_id,
  count(r.*) FILTER (WHERE r.provider_code = 'forpromotional') AS forpromotional_rule_count,
  max(r.cost_factor) FILTER (WHERE r.provider_code = 'forpromotional') AS forpromotional_factor,
  count(r.*) FILTER (WHERE r.provider_code = 'g4_mx') AS g4_rule_count,
  count(r.*) FILTER (WHERE r.provider_code = 'cdo_mx') AS cdo_rule_count
FROM current_release AS cr
LEFT JOIN public.provider_pricing_rules AS r
  ON r.rule_set_id = cr.rule_set_id
GROUP BY cr.rule_set_id;

SELECT
  policy_key,
  enabled,
  policy_version,
  updated_at
FROM public.pricing_policy_flags
WHERE policy_key = 'forpromotional_continuous_v1';

SELECT
  p.oid::regprocedure::text AS function_identity,
  md5(pg_get_functiondef(p.oid)) AS definition_md5,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility
FROM pg_proc AS p
WHERE p.oid IN (
  to_regprocedure('public.forpromotional_curve_price_v1(numeric,integer,integer)'),
  to_regprocedure('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)'),
  to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)'),
  to_regprocedure('public.get_public_product_price_quote(uuid,integer)')
)
ORDER BY function_identity;

SELECT
  jobname,
  schedule,
  active,
  CASE WHEN command ~* 'sync-forpromotional-products|refresh-provider-stock'
    THEN 'WRITE_CAPABLE'
    ELSE 'UNEXPECTED'
  END AS runtime_effect
FROM cron.job
WHERE jobname = 'catalog-stock-refresh-forpromotional';

SELECT
  backup_key,
  captured_at,
  quote_status,
  jsonb_array_length(provider_rows) AS provider_rows,
  jsonb_array_length(offer_rows) AS offer_rows,
  jsonb_array_length(scale_rows) AS scale_rows,
  jsonb_array_length(stock_rows) AS stock_rows,
  jsonb_array_length(status_rows) AS status_rows,
  jsonb_array_length(raw_rows) AS raw_rows,
  jsonb_array_length(batch_rows) AS batch_rows,
  jsonb_array_length(cron_rows) AS cron_rows,
  jsonb_array_length(function_rows) AS function_rows,
  jsonb_array_length(quote_rows) AS quote_rows
FROM public.pe_forpromotional_activation_backup_v1
WHERE backup_key = 'current';

-- The following comparison is intentionally compact: it checks the protected
-- provider rules and current release identity against the snapshot. Detailed
-- quote comparison remains a Lovable Cloud runtime step using the saved
-- quote_rows baseline.
WITH snapshot_rules AS (
  SELECT (x->>'id')::uuid AS id,
         x->>'provider_code' AS provider_code,
         (x->>'cost_factor')::numeric AS cost_factor
  FROM public.pe_forpromotional_activation_backup_v1 b,
       jsonb_array_elements(b.rule_rows) AS e(x)
  WHERE b.backup_key = 'current'
), current_rules AS (
  SELECT r.id, r.provider_code, r.cost_factor
  FROM public.provider_pricing_rules r
  JOIN public.catalog_price_v2_releases rel ON rel.is_current
  JOIN public.catalog_price_cache_v2_generations gen ON gen.id = rel.generation_id
  WHERE r.rule_set_id = gen.rule_set_id
)
SELECT
  sr.provider_code,
  sr.cost_factor AS snapshot_factor,
  cr.cost_factor AS current_factor,
  (sr.cost_factor IS NOT DISTINCT FROM cr.cost_factor) AS unchanged
FROM snapshot_rules sr
FULL OUTER JOIN current_rules cr USING (id, provider_code)
WHERE sr.provider_code IN ('g4_mx', 'cdo_mx')
   OR cr.provider_code IN ('g4_mx', 'cdo_mx')
ORDER BY COALESCE(sr.provider_code, cr.provider_code);

-- Product-level quote checks must be executed from Lovable Cloud with the
-- authorized product IDs and quantities from the dry-run manifest. Confirm:
-- * provider = forpromotional;
-- * pricing_policy_version = forpromotional-continuous-v1;
-- * status/total are coherent;
-- * G4 and CDO return their pre-activation values;
-- * no synthetic SKU, cost or API token is exposed publicly.
