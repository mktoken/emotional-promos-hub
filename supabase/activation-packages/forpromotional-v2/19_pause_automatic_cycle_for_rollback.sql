-- PE ForPromotional automatic cycle
-- Pauses only the exact automatic-cycle route before rollback.

BEGIN;

DO $pause_automatic$
DECLARE
  v_job record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_activation_v1', 0));
  SELECT jobid, command, active INTO v_job
  FROM cron.job
  WHERE jobname = 'catalog-stock-refresh-forpromotional';
  IF FOUND THEN
    IF position('/run-forpromotional-atomic-cycle-v1?' IN v_job.command) = 0
       OR position('/refresh-provider-stock?' IN v_job.command) > 0
       OR position('/refresh-provider-stock-forpromotional-v2?' IN v_job.command) > 0 THEN
      RAISE EXCEPTION 'automatic cycle pause stopped: cron command is divergent';
    END IF;
    PERFORM cron.unschedule(v_job.jobid);
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'catalog-stock-refresh-forpromotional') THEN
    RAISE EXCEPTION 'automatic cycle pause failed: cron still exists';
  END IF;
  UPDATE public.forpromotional_atomic_cycle_state
  SET automatic_enabled = false, status = 'disabled', updated_at = now()
  WHERE provider_code = 'forpromotional';
END
$pause_automatic$;

COMMIT;
