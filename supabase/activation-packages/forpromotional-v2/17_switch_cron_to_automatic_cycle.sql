-- PE ForPromotional automatic cycle
-- Switches the captured ForPromotional cron to the v2 atomic cycle.
-- The cycle remains disabled until 18_enable_automatic_cycle.sql is approved.

BEGIN;

DO $switch_automatic$
DECLARE
  v_saved record;
  v_command text;
  v_jobid bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_activation_v1', 0));

  SELECT saved.jobname, saved.schedule, saved.command, saved.active
  INTO v_saved
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_to_recordset(b.cron_rows)
         AS saved(jobname text, schedule text, command text, active boolean)
  WHERE b.backup_key = 'current';
  IF NOT FOUND OR NOT v_saved.active OR v_saved.jobname <> 'catalog-stock-refresh-forpromotional' THEN
    RAISE EXCEPTION 'automatic cycle switch stopped: active original cron snapshot is missing';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_saved.jobname) THEN
    RAISE EXCEPTION 'automatic cycle switch stopped: pause the original cron first';
  END IF;
  IF to_regclass('public.forpromotional_atomic_cycle_state') IS NULL THEN
    RAISE EXCEPTION 'automatic cycle state is not installed';
  END IF;

  v_command := replace(
    v_saved.command,
    '/refresh-provider-stock?',
    '/run-forpromotional-atomic-cycle-v1?'
  );
  IF v_command = v_saved.command
     OR position('/refresh-provider-stock?' IN v_command) > 0
     OR position('/run-forpromotional-atomic-cycle-v1?' IN v_command) = 0
     OR position('/refresh-provider-stock-forpromotional-v2?' IN v_command) > 0
     OR position('provider=g4_mx' IN v_command) > 0
     OR position('provider=cdo_mx' IN v_command) > 0 THEN
    RAISE EXCEPTION 'automatic cycle switch stopped: route replacement was not exact';
  END IF;

  v_jobid := cron.schedule(v_saved.jobname, v_saved.schedule, v_command);
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = v_jobid AND jobname = v_saved.jobname
      AND schedule = v_saved.schedule AND command = v_command AND active
  ) THEN
    RAISE EXCEPTION 'automatic cycle switch failed verification';
  END IF;

  UPDATE public.forpromotional_atomic_cycle_state
  SET automatic_enabled = false, status = 'disabled', updated_at = now()
  WHERE provider_code = 'forpromotional';
END
$switch_automatic$;

COMMIT;

SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'catalog-stock-refresh-forpromotional';
