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

SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  CASE
    WHEN c.column_name = 'provider'
      AND c.data_type = 'text'
      AND c.is_nullable = 'NO' THEN 'PASS'
    WHEN c.column_name IN ('next_offset', 'next_page', 'cycle_count')
      AND c.data_type = 'integer'
      AND c.is_nullable = 'NO' THEN 'PASS'
    WHEN c.column_name = 'next_offer_offset'
      AND c.data_type = 'integer'
      AND c.is_nullable = 'YES' THEN 'PASS'
    WHEN c.column_name IN ('last_run_at', 'last_completed_cycle_at')
      AND c.data_type = 'timestamp with time zone'
      AND c.is_nullable = 'YES' THEN 'PASS'
    WHEN c.column_name = 'updated_at'
      AND c.data_type = 'timestamp with time zone'
      AND c.is_nullable = 'NO' THEN 'PASS'
    ELSE 'FAIL'
  END AS cursor_contract_status
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stock_refresh_cursors'
  AND c.column_name IN (
    'provider',
    'next_offset',
    'next_page',
    'next_offer_offset',
    'cycle_count',
    'last_run_at',
    'last_completed_cycle_at',
    'updated_at'
  )
ORDER BY CASE c.column_name
  WHEN 'provider' THEN 1
  WHEN 'next_offset' THEN 2
  WHEN 'next_page' THEN 3
  WHEN 'next_offer_offset' THEN 4
  WHEN 'cycle_count' THEN 5
  WHEN 'last_run_at' THEN 6
  WHEN 'last_completed_cycle_at' THEN 7
  WHEN 'updated_at' THEN 8
END;
