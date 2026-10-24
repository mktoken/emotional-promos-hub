-- PE ForPromotional activation package
-- Read-only gate immediately before calling sync-forpromotional-products-v2
-- with mode=dry_run. Every row must report PASS.

WITH checks AS (
  SELECT
    'continuous_policy_disabled'::text AS check_name,
    CASE
      WHEN to_regclass('public.pricing_policy_flags') IS NULL THEN true
      ELSE NOT EXISTS (
        SELECT 1
        FROM public.pricing_policy_flags
        WHERE policy_key = 'forpromotional_continuous_v1'
          AND enabled = true
      )
    END AS passed,
    'The policy must be absent or disabled during parallel dry-run tests.'::text AS detail

  UNION ALL

  SELECT
    'cron_still_uses_original_route',
    count(*) = 1
      AND bool_and(active)
      AND bool_and(position('/refresh-provider-stock?' IN command) > 0)
      AND bool_and(position('/refresh-provider-stock-forpromotional-v2?' IN command) = 0),
    'The production ForPromotional cron must still point to the original orchestrator.'
  FROM cron.job
  WHERE jobname = 'catalog-stock-refresh-forpromotional'

  UNION ALL

  SELECT
    'no_active_forpromotional_refresh',
    CASE
      WHEN to_regclass('public.stock_refresh_locks') IS NULL THEN true
      ELSE NOT EXISTS (
        SELECT 1
        FROM public.stock_refresh_locks
        WHERE scope = 'forpromotional' AND locked_until > now()
      )
    END,
    'Wait for the current legacy refresh lock to finish before comparing a dry-run page.'
)
SELECT
  check_name,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  detail
FROM checks
ORDER BY check_name;
