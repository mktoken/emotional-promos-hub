-- PE ForPromotional activation package
-- Stage 2: pause only the ForPromotional cron after the snapshot exists.
-- This is an intentional write to pg_cron metadata. It does not touch
-- products, prices, offers, stock, rules, or functions.
-- Run only after 01_snapshot_backup.sql succeeds.

BEGIN;

DO $pause$
DECLARE
  v_backup_count integer;
  v_live_count integer;
  v_saved record;
  v_job record;
  v_unscheduled boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  SELECT count(*)::integer
  INTO v_backup_count
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current';

  IF v_backup_count <> 1 THEN
    RAISE EXCEPTION
      'Cannot pause ForPromotional cron: expected one current backup, found %',
      v_backup_count;
  END IF;

  SELECT saved.jobname, saved.schedule, saved.command, saved.active
  INTO v_saved
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_to_recordset(b.cron_rows)
         AS saved(jobname text, schedule text, command text, active boolean)
  WHERE b.backup_key = 'current';

  IF NOT FOUND
     OR v_saved.jobname <> 'catalog-stock-refresh-forpromotional'
     OR NOT v_saved.active THEN
    RAISE EXCEPTION 'Cannot pause ForPromotional cron: captured active job is missing or invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_saved.jobname
      AND (schedule, command, active) IS DISTINCT FROM
          (v_saved.schedule, v_saved.command, v_saved.active)
  ) THEN
    RAISE EXCEPTION 'Cannot pause ForPromotional cron: live definition diverges from snapshot';
  END IF;

  SELECT count(*)::integer
  INTO v_live_count
  FROM cron.job
  WHERE jobname = v_saved.jobname;

  IF v_live_count <> 1 THEN
    RAISE EXCEPTION 'Cannot pause ForPromotional cron: expected one live job, found %', v_live_count;
  END IF;

  FOR v_job IN
    SELECT jobid, jobname, active
    FROM cron.job
    WHERE jobname = v_saved.jobname
  LOOP
    IF v_job.active THEN
      PERFORM cron.unschedule(v_job.jobid);
      v_unscheduled := true;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional'
      AND active
  ) THEN
    RAISE EXCEPTION 'ForPromotional cron is still active after pause';
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.stock_refresh_locks
       WHERE scope = 'forpromotional'
         AND locked_until > now()
     ) THEN
    RAISE EXCEPTION
      'ForPromotional refresh is already running; wait for the active lock to expire before continuing';
  END IF;

  RAISE NOTICE 'forpromotional_cron_paused=%', v_unscheduled;
END
$pause$;

COMMIT;
