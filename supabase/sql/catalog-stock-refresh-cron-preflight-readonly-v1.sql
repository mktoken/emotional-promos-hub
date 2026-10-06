-- CHK-CATALOG-P0-STOCK-AUTO-SYNC-BUILD-REMEDIATION-V1
-- READ-ONLY ACTIVATION PREFLIGHT — DO NOT MODIFY RUNTIME.

SELECT
  current_setting('cron.timezone', true) AS cron_timezone,
  current_setting('TimeZone', true) AS database_timezone;

SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net', 'vault')
ORDER BY extname;

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'catalog-stock-refresh-cdo',
  'catalog-stock-refresh-forpromotional',
  'catalog-stock-refresh-g4'
)
ORDER BY jobname;

SELECT count(*) AS active_stock_refresh_jobs
FROM cron.job
WHERE active = true
  AND command ~* 'refresh-provider-stock';
