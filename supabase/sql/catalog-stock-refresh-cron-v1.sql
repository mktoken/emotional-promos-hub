-- CHK-CATALOG-P0-STOCK-AUTO-SYNC-BUILD-V1
-- MANUAL CONTROL SQL — NOT EXECUTED BY THIS CHECKPOINT.
--
-- This script replaces only the three active stock refresh jobs after
-- a read-only review confirms that exactly three matching jobs exist.
-- It does not embed STOCK_REFRESH_CRON_KEY. The key is read at runtime
-- from Supabase Vault and sent in a header.
--
-- BEFORE EXECUTION, run the read-only companion:
-- supabase/sql/catalog-stock-refresh-cron-preflight-readonly-v1.sql
-- Do not activate if cron.timezone is not explicitly understood.

DO $cron_replace$
DECLARE
  v_job_ids bigint[];
  v_job_id bigint;
BEGIN
  SELECT array_agg(jobid ORDER BY jobid)
  INTO v_job_ids
  FROM cron.job
  WHERE active = true
    AND command ~* 'refresh-provider-stock';

  IF COALESCE(cardinality(v_job_ids), 0) <> 3 THEN
    RAISE EXCEPTION
      'Expected exactly 3 active refresh-provider-stock jobs; found %',
      COALESCE(cardinality(v_job_ids), 0);
  END IF;

  FOREACH v_job_id IN ARRAY v_job_ids LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'catalog-stock-refresh-cdo',
    '0-55/5 8-15 * * *',
    $job$
      SELECT net.http_post(
        url := 'https://unzfwdykdqotiwzihsvc.supabase.co/functions/v1/refresh-provider-stock?provider=cdo_mx&mode=full&max_batches=3',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-stock-refresh-key', (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'STOCK_REFRESH_CRON_KEY'
            LIMIT 1
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  PERFORM cron.schedule(
    'catalog-stock-refresh-forpromotional',
    '1-56/5 8-15 * * *',
    $job$
      SELECT net.http_post(
        url := 'https://unzfwdykdqotiwzihsvc.supabase.co/functions/v1/refresh-provider-stock?provider=forpromotional&mode=full&max_batches=3',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-stock-refresh-key', (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'STOCK_REFRESH_CRON_KEY'
            LIMIT 1
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  PERFORM cron.schedule(
    'catalog-stock-refresh-g4',
    '2-57/5 8-15 * * *',
    $job$
      SELECT net.http_post(
        url := 'https://unzfwdykdqotiwzihsvc.supabase.co/functions/v1/refresh-provider-stock?provider=g4_mx&mode=full&max_batches=3',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-stock-refresh-key', (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'STOCK_REFRESH_CRON_KEY'
            LIMIT 1
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );
END
$cron_replace$;
