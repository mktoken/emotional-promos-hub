-- PE ForPromotional disabled-install gate (READ ONLY).
-- Every row must report PASS before 01, 03, 10 or 16 is executed.

WITH checks AS (
  SELECT
    'single_current_release'::text AS check_name,
    ((SELECT count(*) FROM public.catalog_price_v2_releases WHERE is_current) = 1) AS passed,
    jsonb_build_object(
      'current_release_count',
      (SELECT count(*) FROM public.catalog_price_v2_releases WHERE is_current)
    ) AS details
  UNION ALL
  SELECT
    'forpromotional_factor_is_1_0300',
    (
      SELECT count(*) = 1 AND min(r.cost_factor) = 1.0300
      FROM public.catalog_price_v2_releases AS rel
      JOIN public.catalog_price_cache_v2_generations AS gen ON gen.id = rel.generation_id
      JOIN public.provider_pricing_rules AS r ON r.rule_set_id = gen.rule_set_id
      WHERE rel.is_current AND r.provider_code = 'forpromotional'
    ),
    (
      SELECT jsonb_build_object('rule_count', count(*), 'factor', min(r.cost_factor))
      FROM public.catalog_price_v2_releases AS rel
      JOIN public.catalog_price_cache_v2_generations AS gen ON gen.id = rel.generation_id
      JOIN public.provider_pricing_rules AS r ON r.rule_set_id = gen.rule_set_id
      WHERE rel.is_current AND r.provider_code = 'forpromotional'
    )
  UNION ALL
  SELECT
    'policy_table_not_installed',
    to_regclass('public.pricing_policy_flags') IS NULL,
    jsonb_build_object('relation', to_regclass('public.pricing_policy_flags'))
  UNION ALL
  SELECT
    'atomic_staging_not_installed',
    to_regclass('public.forpromotional_atomic_candidates') IS NULL
      AND to_regclass('public.forpromotional_atomic_cost_shadow') IS NULL
      AND to_regclass('public.forpromotional_atomic_exceptions') IS NULL,
    jsonb_build_object(
      'candidates', to_regclass('public.forpromotional_atomic_candidates'),
      'cost_shadow', to_regclass('public.forpromotional_atomic_cost_shadow'),
      'exceptions', to_regclass('public.forpromotional_atomic_exceptions')
    )
  UNION ALL
  SELECT
    'automatic_cycle_not_installed',
    to_regclass('public.forpromotional_atomic_cycle_runs') IS NULL
      AND to_regclass('public.forpromotional_atomic_cycle_state') IS NULL
      AND to_regclass('public.forpromotional_atomic_restore_meta') IS NULL
      AND to_regclass('public.forpromotional_atomic_restore_rows') IS NULL
      AND to_regprocedure('public.pe_forpromotional_cycle_begin_v1(text,text)') IS NULL
      AND to_regprocedure('public.pe_forpromotional_cycle_finish_v1(uuid,text,jsonb,text)') IS NULL
      AND to_regprocedure('public.pe_forpromotional_cycle_certify_v1(uuid)') IS NULL
      AND to_regprocedure('public.pe_forpromotional_cycle_activate_v1(uuid)') IS NULL
      AND to_regprocedure('public.pe_forpromotional_cycle_rollback_v1(uuid)') IS NULL,
    jsonb_build_object(
      'cycle_runs', to_regclass('public.forpromotional_atomic_cycle_runs'),
      'cycle_state', to_regclass('public.forpromotional_atomic_cycle_state'),
      'begin_rpc', to_regprocedure('public.pe_forpromotional_cycle_begin_v1(text,text)')
    )
  UNION ALL
  SELECT
    'original_cron_route_preserved',
    count(*) = 1
      AND bool_and(active)
      AND bool_and(position('/refresh-provider-stock?' IN command) > 0)
      AND bool_and(position('provider=forpromotional' IN command) > 0)
      AND bool_and(position('provider=g4_mx' IN command) = 0)
      AND bool_and(position('provider=cdo_mx' IN command) = 0)
      AND bool_and(position('/run-forpromotional-atomic-cycle-v1?' IN command) = 0),
    jsonb_build_object(
      'job_count', count(*),
      'active_count', count(*) FILTER (WHERE active),
      'forpromotional_route_count', count(*) FILTER (
        WHERE position('provider=forpromotional' IN command) > 0
      ),
      'v2_route_count', count(*) FILTER (
        WHERE position('/run-forpromotional-atomic-cycle-v1?' IN command) > 0
      )
    )
  FROM cron.job
  WHERE jobname = 'catalog-stock-refresh-forpromotional'
)
SELECT
  check_name,
  CASE WHEN passed THEN 'PASS' ELSE 'BLOCKED' END AS status,
  details
FROM checks
ORDER BY check_name;
