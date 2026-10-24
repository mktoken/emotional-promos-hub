-- PE ForPromotional activation package
-- Stage 7: restore the previously captured cron schedule after all post-
-- activation checks pass. This is not a generic cron creator.

BEGIN;

DO $resume$
DECLARE
  v_job record;
  v_existing record;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  SELECT *
  INTO v_job
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_to_recordset(b.cron_rows)
         AS saved(jobname text, schedule text, command text, active boolean)
  WHERE b.backup_key = 'current';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cron resume stopped: snapshot or cron row is missing';
  END IF;

  IF NOT v_job.active THEN
    RAISE EXCEPTION
      'Captured ForPromotional cron was inactive; do not activate it implicitly';
  END IF;

  SELECT jobid, jobname, schedule, command, active
  INTO v_existing
  FROM cron.job
  WHERE jobname = v_job.jobname;

  IF FOUND THEN
    IF v_existing.schedule IS DISTINCT FROM v_job.schedule
       OR v_existing.command IS DISTINCT FROM v_job.command THEN
      RAISE EXCEPTION
        'Cron resume stopped: existing job definition diverges from snapshot';
    END IF;
    IF NOT v_existing.active THEN
      RAISE EXCEPTION
        'Cron resume stopped: existing job is inactive; restore it through the approved Lovable Cloud procedure';
    END IF;
  ELSE
    PERFORM cron.schedule(v_job.jobname, v_job.schedule, v_job.command);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = v_job.jobname
      AND active
  ) THEN
    RAISE EXCEPTION 'ForPromotional cron is not active after resume';
  END IF;
END
$resume$;

COMMIT;
