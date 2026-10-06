-- CHK-CATALOG-P0-STOCK-AUTO-SYNC-BUILD-REMEDIATION-V1
-- MANUAL ROLLBACK SQL — NOT EXECUTED BY THIS CHECKPOINT.
--
-- Disables only the three new PE stock jobs. It does not restore the
-- historical broken jobs, touch data, cursors, runs, or secrets.

DO $rollback_stock_jobs$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'catalog-stock-refresh-cdo',
      'catalog-stock-refresh-forpromotional',
      'catalog-stock-refresh-g4'
    )
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END
$rollback_stock_jobs$;
