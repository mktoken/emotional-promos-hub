-- PE ForPromotional automatic cycle
-- Read-only health report after deployment or during incident review.

SELECT jsonb_build_object(
  'provider', 'forpromotional',
  'automatic_enabled', state.automatic_enabled,
  'cycle_status', state.status,
  'last_attempt_at', state.last_attempt_at,
  'last_success_at', state.last_success_at,
  'last_failure_at', state.last_failure_at,
  'last_error', state.last_error,
  'stale_after', state.stale_after,
  'stale', (
    state.automatic_enabled
    AND (state.last_success_at IS NULL OR state.last_success_at + state.stale_after < now())
  ),
  'active_cycle_runs', (
    SELECT count(*) FROM public.forpromotional_atomic_cycle_runs
    WHERE status = 'running'
  ),
  'open_candidates', (
    SELECT count(*) FROM public.forpromotional_atomic_candidates
    WHERE status IN ('building','certified')
  ),
  'current_release_count', (
    SELECT count(*) FROM public.catalog_price_v2_releases WHERE is_current
  ),
  'automatic_cron', (
    SELECT jsonb_build_object('jobname', j.jobname, 'schedule', j.schedule,
                              'active', j.active, 'approved_route',
                              position('/run-forpromotional-atomic-cycle-v1?' IN j.command) > 0)
    FROM cron.job AS j
    WHERE j.jobname = 'catalog-stock-refresh-forpromotional'
  ),
  'g4_cdo_open_candidate_overlap', (
    SELECT count(*)
    FROM public.forpromotional_atomic_cost_shadow AS s
    JOIN public.producto_b2b_oferta_map AS m
      ON m.producto_b2b_id = s.product_id
     AND m.provider_code IN ('g4_mx','cdo_mx')
    JOIN public.forpromotional_atomic_candidates AS c ON c.id = s.candidate_id
    WHERE c.status IN ('building','certified','active')
  )
) AS automatic_cycle_health
FROM public.forpromotional_atomic_cycle_state AS state
WHERE state.provider_code = 'forpromotional';

SELECT r.id AS run_id, r.idempotency_key, r.candidate_id, r.status,
       r.started_at, r.finished_at, r.error_message
FROM public.forpromotional_atomic_cycle_runs AS r
ORDER BY r.started_at DESC
LIMIT 10;
