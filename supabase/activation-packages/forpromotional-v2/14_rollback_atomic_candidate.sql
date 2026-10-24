-- PE ForPromotional atomic activation package
-- Stage R: rollback of 13_activate_atomic_candidate.sql. This restores the
-- exact ForPromotional scale, stock, rule, policy and release pointer saved by
-- 01_snapshot_backup.sql. It does not delete candidate data and never uses
-- CASCADE. Any mismatch aborts before the first mutation.

BEGIN;

DO $rollback_atomic$
DECLARE
  v_candidate record;
  v_candidate_count integer;
  v_backup record;
  v_current_release record;
  v_current_release_count integer;
  v_old_release_id uuid;
  v_provider_id uuid;
  v_scale_count integer;
  v_stock_count integer;
  v_expected_scale_count integer;
  v_expected_stock_count integer;
  v_active_locks integer;
  v_running_imports integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_activation_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT * INTO v_backup
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic rollback requires the current rollback snapshot';
  END IF;

  SELECT count(*)::integer INTO v_candidate_count
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'active';
  IF v_candidate_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one active atomic candidate is required; found %', v_candidate_count;
  END IF;

  SELECT c.* INTO v_candidate
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exactly one active atomic candidate is required for rollback';
  END IF;
  v_provider_id := v_candidate.provider_id;

  SELECT count(*)::integer INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Current release pointer is not unique; found %', v_current_release_count;
  END IF;

  SELECT r.* INTO v_current_release
  FROM public.catalog_price_v2_releases AS r
  WHERE r.is_current = true
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current release pointer is not unique';
  END IF;
  IF v_current_release.generation_id IS DISTINCT FROM v_candidate.catalog_generation_id THEN
    RAISE EXCEPTION 'Current release is not the active atomic candidate';
  END IF;

  SELECT id INTO v_old_release_id
  FROM public.catalog_price_v2_releases
  WHERE generation_id = v_candidate.base_generation_id
    AND NOT is_current;
  IF v_old_release_id IS NULL THEN
    RAISE EXCEPTION 'The pre-activation release pointer is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional' AND active
  ) THEN
    RAISE EXCEPTION 'ForPromotional cron must be paused during atomic rollback';
  END IF;
  IF to_regclass('public.stock_refresh_locks') IS NOT NULL THEN
    SELECT count(*)::integer INTO v_active_locks
    FROM public.stock_refresh_locks
    WHERE scope = 'forpromotional' AND locked_until > now();
    IF v_active_locks > 0 THEN
      RAISE EXCEPTION 'An in-flight ForPromotional refresh lock exists';
    END IF;
  END IF;
  SELECT count(*)::integer INTO v_running_imports
  FROM public.provider_import_batches
  WHERE proveedor_id = v_provider_id AND status = 'running';
  IF v_running_imports > 0 THEN
    RAISE EXCEPTION 'An in-flight ForPromotional import batch exists';
  END IF;

  SELECT count(*)::integer INTO v_expected_scale_count
  FROM jsonb_to_recordset(v_backup.scale_rows) AS saved(id uuid, proveedor_id uuid)
  WHERE saved.proveedor_id = v_provider_id;
  SELECT count(*)::integer INTO v_expected_stock_count
  FROM jsonb_to_recordset(v_backup.stock_rows) AS saved(id uuid, proveedor_id uuid)
  WHERE saved.proveedor_id = v_provider_id;

  UPDATE public.producto_precio_escalas AS live
  SET oferta_id = saved.oferta_id,
      proveedor_id = saved.proveedor_id,
      min_qty = saved.min_qty,
      max_qty = saved.max_qty,
      unit_cost = saved.unit_cost,
      currency = saved.currency,
      source_field = saved.source_field,
      created_at = saved.created_at,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.producto_precio_escalas, e.value)).*
    FROM jsonb_array_elements(v_backup.scale_rows) AS e(value)
  ) AS saved
  WHERE live.id = saved.id AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_scale_count = ROW_COUNT;
  IF v_scale_count <> v_expected_scale_count THEN
    RAISE EXCEPTION 'Atomic rollback scale count mismatch: % of %',
      v_scale_count, v_expected_scale_count;
  END IF;

  UPDATE public.producto_proveedor_stock AS live
  SET oferta_id = saved.oferta_id,
      proveedor_id = saved.proveedor_id,
      cantidad = saved.cantidad,
      disponibilidad = saved.disponibilidad,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.producto_proveedor_stock, e.value)).*
    FROM jsonb_array_elements(v_backup.stock_rows) AS e(value)
  ) AS saved
  WHERE live.id = saved.id AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_stock_count = ROW_COUNT;
  IF v_stock_count <> v_expected_stock_count THEN
    RAISE EXCEPTION 'Atomic rollback stock count mismatch: % of %',
      v_stock_count, v_expected_stock_count;
  END IF;

  UPDATE public.provider_pricing_rules AS live
  SET rule_set_id = saved.rule_set_id,
      provider_code = saved.provider_code,
      base_cost_strategy = saved.base_cost_strategy,
      provider_tier_number = saved.provider_tier_number,
      cost_factor = saved.cost_factor,
      fallback_strategy = saved.fallback_strategy,
      requires_manual_review_on_fallback = saved.requires_manual_review_on_fallback,
      notes = saved.notes,
      created_at = saved.created_at,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.provider_pricing_rules, e.value)).*
    FROM jsonb_array_elements(v_backup.rule_rows) AS e(value)
  ) AS saved
  WHERE live.id = saved.id
    AND live.provider_code = 'forpromotional'
    AND live.rule_set_id = v_candidate.rule_set_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ForPromotional rule could not be restored';
  END IF;

  -- The feature table is installed by 03 with the flag disabled. If it did
  -- not exist in the original snapshot, disable rather than drop it: the
  -- installed SQL functions depend on the table and 05_rollback.sql performs
  -- the final schema cleanup when a full package rollback is required.
  IF to_regclass('public.pricing_policy_flags') IS NULL THEN
    RAISE EXCEPTION 'pricing_policy_flags is missing during atomic rollback';
  END IF;
  IF v_backup.policy_row IS NULL OR v_backup.policy_row = 'null'::jsonb THEN
    UPDATE public.pricing_policy_flags
    SET enabled = false, updated_at = now()
    WHERE policy_key = 'forpromotional_continuous_v1';
  ELSE
    INSERT INTO public.pricing_policy_flags (policy_key, enabled, policy_version, updated_at)
    VALUES (
      v_backup.policy_row->>'policy_key',
      COALESCE((v_backup.policy_row->>'enabled')::boolean, false),
      v_backup.policy_row->>'policy_version',
      COALESCE((v_backup.policy_row->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (policy_key) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      policy_version = EXCLUDED.policy_version,
      updated_at = EXCLUDED.updated_at;
  END IF;

  UPDATE public.catalog_price_v2_releases
  SET is_current = false,
      superseded_at = now(),
      superseded_by = v_old_release_id,
      updated_at = now()
  WHERE id = v_current_release.id AND is_current;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active candidate release could not be retired';
  END IF;

  UPDATE public.catalog_price_v2_releases
  SET is_current = true,
      published_at = COALESCE(published_at, now()),
      superseded_at = NULL,
      superseded_by = NULL,
      updated_at = now()
  WHERE id = v_old_release_id AND NOT is_current;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original release could not be restored';
  END IF;

  UPDATE public.forpromotional_atomic_candidates
  SET status = 'rolled_back', rolled_back_at = now(), updated_at = now()
  WHERE id = v_candidate.id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic candidate status changed during rollback';
  END IF;
END
$rollback_atomic$;

COMMIT;

SELECT c.id AS candidate_id, c.status AS candidate_status,
       r.generation_id, r.is_current,
       f.enabled AS policy_enabled, rule.cost_factor AS forpromotional_factor
FROM public.forpromotional_atomic_candidates AS c
JOIN public.catalog_price_v2_releases AS r
  ON r.generation_id = c.base_generation_id AND r.is_current
JOIN public.pricing_policy_flags AS f
  ON f.policy_key = 'forpromotional_continuous_v1'
JOIN public.provider_pricing_rules AS rule
  ON rule.rule_set_id = c.rule_set_id AND rule.provider_code = 'forpromotional'
WHERE c.status = 'rolled_back';
