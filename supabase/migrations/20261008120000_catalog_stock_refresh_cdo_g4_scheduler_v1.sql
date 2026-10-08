-- CP-2 — CONTROLLED SCHEDULER REMEDIATION
-- Replaces only the legacy CDO and G4 scheduler contracts.
-- ForPromotional is intentionally untouched.
--
-- Current cadences are preserved:
--   CDO: 40 */6 * * *
--   G4:  10 * * * *
--
-- Each job uses the already-certified contract:
--   mode=full
--   max_batches=3
--   x-stock-refresh-key from STOCK_REFRESH_CRON_KEY in Vault
--   no secret in the query string
--
-- This migration schedules jobs only. It does not invoke the Edge Function.

DO $scheduler_remediation$
DECLARE
  v_job_id bigint;
BEGIN
  -- Remove only the known legacy jobs and any previous canonical jobs for
  -- these two providers. ForPromotional is deliberately excluded.
  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'refresh_stock_cdo_every_6h',
      'refresh_stock_g4_hourly',
      'catalog-stock-refresh-cdo',
      'catalog-stock-refresh-g4'
    )
      AND (
        command ~* 'provider[=:%3d]+(cdo_mx|cdo)'
        OR command ~* 'provider[=:%3d]+(g4_mx|g4)'
      )
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  -- Avoid silently creating duplicate active CDO jobs under an unexpected
  -- name. The known legacy/canonical names were handled above.
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE active = true
      AND jobname NOT IN (
        'refresh_stock_cdo_every_6h',
        'catalog-stock-refresh-cdo'
      )
      AND command ~* 'provider[=:%3d]+(cdo_mx|cdo)'
  ) THEN
    RAISE EXCEPTION
      'Unexpected active CDO scheduler remains outside the approved names';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE active = true
      AND jobname NOT IN (
        'refresh_stock_g4_hourly',
        'catalog-stock-refresh-g4'
      )
      AND command ~* 'provider[=:%3d]+(g4_mx|g4)'
  ) THEN
    RAISE EXCEPTION
      'Unexpected active G4 scheduler remains outside the approved names';
  END IF;

  PERFORM cron.schedule(
    'catalog-stock-refresh-cdo',
    '40 */6 * * *',
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
        body := '{}'::jsonb,
        timeout_milliseconds := 150000
      );
    $job$
  );

  PERFORM cron.schedule(
    'catalog-stock-refresh-g4',
    '10 * * * *',
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
        body := '{}'::jsonb,
        timeout_milliseconds := 150000
      );
    $job$
  );
END
$scheduler_remediation$;
