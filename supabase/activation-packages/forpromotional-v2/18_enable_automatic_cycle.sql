-- PE ForPromotional automatic cycle
-- Enables writes only after the cron route is the exact approved atomic cycle.

BEGIN;

DO $enable_automatic$
DECLARE
  v_job record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_activation_v1', 0));
  SELECT jobname, command, active INTO v_job
  FROM cron.job
  WHERE jobname = 'catalog-stock-refresh-forpromotional';
  IF NOT FOUND OR NOT v_job.active
     OR position('/run-forpromotional-atomic-cycle-v1?' IN v_job.command) = 0
     OR position('/refresh-provider-stock?' IN v_job.command) > 0
     OR position('/refresh-provider-stock-forpromotional-v2?' IN v_job.command) > 0 THEN
    RAISE EXCEPTION 'automatic cycle enable stopped: cron route is not the exact v2 route';
  END IF;
  UPDATE public.forpromotional_atomic_cycle_state
  SET automatic_enabled = true, status = 'idle', last_error = NULL, updated_at = now()
  WHERE provider_code = 'forpromotional';
  IF NOT FOUND THEN RAISE EXCEPTION 'automatic cycle state is missing'; END IF;
END
$enable_automatic$;

COMMIT;

SELECT provider_code, automatic_enabled, status, last_success_at, last_failure_at, last_error
FROM public.forpromotional_atomic_cycle_state
WHERE provider_code = 'forpromotional';
