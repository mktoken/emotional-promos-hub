-- PE ForPromotional disabled-install rollback.
-- Restores only SQL functions, ACLs and policy configuration captured by 01,
-- then removes the private staging/cycle objects installed by 10 and 16.
-- It intentionally does not restore costs, stock, offers, releases or cron.

BEGIN;

DO $disabled_install_rollback$
DECLARE
  v_backup public.pe_forpromotional_activation_backup_v1%ROWTYPE;
  v_function record;
  v_acl record;
  v_target record;
  v_policy_row jsonb;
  v_grantee_sql text;
  v_grant_option text;
  v_policy_enabled boolean := false;
  v_automatic_enabled boolean := false;
  v_candidate_active boolean := false;
  v_cycle_running boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  SELECT *
  INTO v_backup
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'disabled install rollback stopped: current backup is missing';
  END IF;

  IF v_backup.policy_table_preexisting THEN
    RAISE EXCEPTION
      'disabled install rollback stopped: this package requires a previously absent policy table';
  END IF;

  IF to_regclass('public.pricing_policy_flags') IS NOT NULL THEN
    EXECUTE $check_policy$
      SELECT EXISTS (
        SELECT 1
        FROM public.pricing_policy_flags
        WHERE policy_key = 'forpromotional_continuous_v1' AND enabled
      )
    $check_policy$
    INTO v_policy_enabled;
  END IF;
  IF v_policy_enabled THEN
    RAISE EXCEPTION 'disabled install rollback stopped: pricing policy is enabled';
  END IF;

  IF to_regclass('public.forpromotional_atomic_cycle_state') IS NOT NULL THEN
    EXECUTE $check_automatic$
      SELECT EXISTS (
        SELECT 1
        FROM public.forpromotional_atomic_cycle_state
        WHERE provider_code = 'forpromotional' AND automatic_enabled
      )
    $check_automatic$
    INTO v_automatic_enabled;
  END IF;
  IF v_automatic_enabled THEN
    RAISE EXCEPTION 'disabled install rollback stopped: automatic cycle is enabled';
  END IF;

  IF to_regclass('public.forpromotional_atomic_candidates') IS NOT NULL THEN
    EXECUTE $check_candidate$
      SELECT EXISTS (
        SELECT 1 FROM public.forpromotional_atomic_candidates
        WHERE status IN ('building', 'certified', 'active')
      )
    $check_candidate$
    INTO v_candidate_active;
  END IF;
  IF to_regclass('public.forpromotional_atomic_cycle_runs') IS NOT NULL THEN
    EXECUTE $check_cycle$
      SELECT EXISTS (
        SELECT 1 FROM public.forpromotional_atomic_cycle_runs
        WHERE status = 'running'
      )
    $check_cycle$
    INTO v_cycle_running;
  END IF;
  IF v_candidate_active OR v_cycle_running THEN
    RAISE EXCEPTION 'disabled install rollback stopped: candidate or cycle is active';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job AS current_job
    FULL JOIN jsonb_to_recordset(v_backup.cron_rows)
      AS saved(jobname text, schedule text, command text, active boolean)
      ON saved.jobname = current_job.jobname
    WHERE COALESCE(saved.jobname, current_job.jobname) = 'catalog-stock-refresh-forpromotional'
      AND (
        current_job.jobname IS NULL
        OR saved.jobname IS NULL
        OR (current_job.schedule, current_job.command, current_job.active)
           IS DISTINCT FROM (saved.schedule, saved.command, saved.active)
      )
  ) THEN
    RAISE EXCEPTION 'disabled install rollback stopped: cron state diverged';
  END IF;

  -- Restore saved definitions before removing newly introduced dependencies.
  FOR v_function IN
    SELECT *
    FROM jsonb_to_recordset(v_backup.function_rows)
      AS saved(identity text, definition text, acl jsonb)
  LOOP
    EXECUTE v_function.definition;
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
      v_function.identity
    );
    FOR v_acl IN
      SELECT *
      FROM jsonb_to_recordset(v_function.acl)
        AS saved(grantee text, privilege_type text, is_grantable boolean)
    LOOP
      v_grantee_sql := CASE
        WHEN v_acl.grantee = 'PUBLIC' THEN 'PUBLIC'
        ELSE quote_ident(v_acl.grantee)
      END;
      v_grant_option := CASE
        WHEN v_acl.is_grantable THEN ' WITH GRANT OPTION'
        ELSE ''
      END;
      EXECUTE format(
        'GRANT %s ON FUNCTION %s TO %s%s',
        v_acl.privilege_type,
        v_function.identity,
        v_grantee_sql,
        v_grant_option
      );
    END LOOP;
  END LOOP;

  FOR v_target IN
    SELECT * FROM (VALUES
      ('public.get_public_product_price_quote(uuid,integer)'),
      ('public.get_public_product_price_quote_v2(uuid,integer)'),
      ('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)'),
      ('public.forpromotional_curve_price_v1(numeric,integer,integer)')
    ) AS targets(identity)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(v_backup.function_rows)
        AS saved(identity text, definition text, acl jsonb)
      WHERE saved.identity = v_target.identity
    ) THEN
      EXECUTE format('DROP FUNCTION IF EXISTS %s', v_target.identity);
    END IF;
  END LOOP;

  DROP FUNCTION IF EXISTS public.pe_forpromotional_cycle_rollback_v1(uuid);
  DROP FUNCTION IF EXISTS public.pe_forpromotional_cycle_activate_v1(uuid);
  DROP FUNCTION IF EXISTS public.pe_forpromotional_cycle_certify_v1(uuid);
  DROP FUNCTION IF EXISTS public.pe_forpromotional_cycle_finish_v1(uuid,text,jsonb,text);
  DROP FUNCTION IF EXISTS public.pe_forpromotional_cycle_begin_v1(text,text);
  DROP FUNCTION IF EXISTS public.pe_forpromotional_reconcile_candidate_v1(uuid);

  DROP TABLE IF EXISTS public.forpromotional_atomic_restore_rows;
  DROP TABLE IF EXISTS public.forpromotional_atomic_restore_meta;
  DROP TABLE IF EXISTS public.forpromotional_atomic_cycle_state;
  DROP TABLE IF EXISTS public.forpromotional_atomic_cycle_runs;
  DROP TABLE IF EXISTS public.forpromotional_atomic_local_absences;
  DROP TABLE IF EXISTS public.forpromotional_atomic_variant_shadow;
  DROP TABLE IF EXISTS public.forpromotional_atomic_exceptions;
  DROP TABLE IF EXISTS public.forpromotional_atomic_cost_shadow;
  DROP TABLE IF EXISTS public.forpromotional_atomic_candidates;

  v_policy_row := v_backup.policy_row;
  IF v_policy_row IS NOT NULL AND v_policy_row <> 'null'::jsonb THEN
    RAISE EXCEPTION
      'disabled install rollback stopped: unexpected preexisting policy row';
  END IF;
  DROP TABLE IF EXISTS public.pricing_policy_flags;
END
$disabled_install_rollback$;

COMMIT;

SELECT jsonb_build_object(
  'status', 'DISABLED_INSTALL_ROLLED_BACK',
  'policy_table', to_regclass('public.pricing_policy_flags'),
  'atomic_candidates', to_regclass('public.forpromotional_atomic_candidates'),
  'automatic_cycle_state', to_regclass('public.forpromotional_atomic_cycle_state'),
  'cron_route_unchanged', EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional'
      AND active
      AND position('/refresh-provider-stock?' IN command) > 0
      AND position('/run-forpromotional-atomic-cycle-v1?' IN command) = 0
  )
) AS rollback_report;
