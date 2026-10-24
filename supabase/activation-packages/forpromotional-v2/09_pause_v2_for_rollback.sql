-- PE ForPromotional activation package
-- Stage 9: pause only the exact v2 ForPromotional cron before 05_rollback.sql.
-- A divergent command is never unscheduled by inference.

BEGIN;

DO $pause_v2$
DECLARE
  v_saved record;
  v_expected_v2_command text;
  v_current record;
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 rollback pause stopped: original cron snapshot is missing';
  END IF;

  v_expected_v2_command := replace(
    v_saved.command,
    '/refresh-provider-stock?',
    '/refresh-provider-stock-forpromotional-v2?'
  );

  SELECT jobid, jobname, schedule, command, active
  INTO v_current
  FROM cron.job
  WHERE jobname = v_saved.jobname;

  IF FOUND THEN
    IF v_current.schedule IS DISTINCT FROM v_saved.schedule
       OR v_current.command IS DISTINCT FROM v_expected_v2_command THEN
      RAISE EXCEPTION 'V2 rollback pause stopped: current cron is not the exact approved v2 route';
    END IF;
    PERFORM cron.unschedule(v_current.jobid);
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_saved.jobname) THEN
    RAISE EXCEPTION 'V2 rollback pause failed: cron still exists';
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.stock_refresh_locks
       WHERE scope = 'forpromotional' AND locked_until > now()
     ) THEN
    RAISE EXCEPTION 'V2 rollback pause stopped: wait for active ForPromotional lock to expire';
  END IF;
END
$pause_v2$;

COMMIT;
