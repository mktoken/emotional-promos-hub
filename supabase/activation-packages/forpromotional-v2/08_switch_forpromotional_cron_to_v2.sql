-- PE ForPromotional activation package
-- Stage 8: route only the existing ForPromotional cron to the parallel v2
-- orchestrator. Run after 04 and 06 pass. The original Edge Functions remain
-- deployed and untouched; G4/CDO jobs are not selected or modified.

BEGIN;

DO $switch$
DECLARE
  v_saved record;
  v_v2_command text;
  v_jobid bigint;
  v_route_occurrences integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  SELECT saved.jobname, saved.schedule, saved.command, saved.active
  INTO v_saved
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_to_recordset(b.cron_rows)
         AS saved(jobname text, schedule text, command text, active boolean)
  WHERE b.backup_key = 'current';

  IF NOT FOUND OR NOT v_saved.active THEN
    RAISE EXCEPTION 'V2 cron switch stopped: active original cron snapshot is missing';
  END IF;

  v_route_occurrences := (
    length(v_saved.command) - length(replace(v_saved.command, '/refresh-provider-stock?', ''))
  ) / length('/refresh-provider-stock?');

  IF v_saved.jobname <> 'catalog-stock-refresh-forpromotional'
     OR v_route_occurrences <> 1
     OR position('/refresh-provider-stock?' IN v_saved.command) = 0
     OR position('provider=forpromotional' IN v_saved.command) = 0
     OR position('/refresh-provider-stock-forpromotional-v2?' IN v_saved.command) > 0
     OR position('provider=g4_mx' IN v_saved.command) > 0
     OR position('provider=cdo_mx' IN v_saved.command) > 0 THEN
    RAISE EXCEPTION 'V2 cron switch stopped: captured command is not the expected ForPromotional-only route';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_saved.jobname) THEN
    RAISE EXCEPTION 'V2 cron switch stopped: job already exists; pause it through stage 02 first';
  END IF;

  IF to_regclass('public.pricing_policy_flags') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.pricing_policy_flags
       WHERE policy_key = 'forpromotional_continuous_v1'
         AND enabled = true
     ) THEN
    RAISE EXCEPTION 'V2 cron switch stopped: continuous policy is not enabled';
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.stock_refresh_locks
       WHERE scope = 'forpromotional' AND locked_until > now()
     ) THEN
    RAISE EXCEPTION 'V2 cron switch stopped: active ForPromotional refresh lock exists';
  END IF;

  v_v2_command := replace(
    v_saved.command,
    '/refresh-provider-stock?',
    '/refresh-provider-stock-forpromotional-v2?'
  );

  IF v_v2_command = v_saved.command
     OR position('/refresh-provider-stock?' IN v_v2_command) > 0
     OR position('/refresh-provider-stock-forpromotional-v2?' IN v_v2_command) = 0 THEN
    RAISE EXCEPTION 'V2 cron switch stopped: route replacement was not exact';
  END IF;

  v_jobid := cron.schedule(v_saved.jobname, v_saved.schedule, v_v2_command);

  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = v_jobid
      AND jobname = v_saved.jobname
      AND schedule = v_saved.schedule
      AND command = v_v2_command
      AND active
  ) THEN
    RAISE EXCEPTION 'V2 cron switch failed verification';
  END IF;
END
$switch$;

COMMIT;
