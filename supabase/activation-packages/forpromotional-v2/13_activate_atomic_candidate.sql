-- PE ForPromotional atomic activation package
-- Stage 4: one transaction changes the ForPromotional source rows, factor,
-- policy flag and public Pricing V2 release together. Before COMMIT, readers
-- see the old state; after COMMIT, readers see the certified new state.
-- Any exception aborts every change in this file.

BEGIN;

DO $activate_atomic$
DECLARE
  v_candidate record;
  v_candidate_count integer;
  v_backup record;
  v_current_release record;
  v_current_release_count integer;
  v_new_release_id uuid := gen_random_uuid();
  v_published_by uuid;
  v_scale_count integer;
  v_stock_count integer;
  v_rule_count integer;
  v_current_rules_md5 text;
  v_snapshot_rules_md5 text;
  v_current_scales_md5 text;
  v_snapshot_scales_md5 text;
  v_current_stock_md5 text;
  v_snapshot_stock_md5 text;
  v_enabled boolean;
  v_running_imports integer;
  v_active_locks integer;
  v_provider_id uuid;
  v_current_generation_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_activation_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT * INTO v_backup
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic activation requires the current rollback snapshot';
  END IF;

  SELECT count(*)::integer INTO v_candidate_count
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'certified';
  IF v_candidate_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one certified atomic candidate is required; found %', v_candidate_count;
  END IF;

  SELECT c.* INTO v_candidate
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status = 'certified'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exactly one certified atomic candidate is required';
  END IF;

  SELECT count(*)::integer INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one current Pricing V2 release is required; found %', v_current_release_count;
  END IF;

  SELECT r.*, g.rule_set_id
  INTO v_current_release
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current = true
  FOR UPDATE OF r, g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exactly one current Pricing V2 release is required';
  END IF;
  v_current_generation_id := v_current_release.generation_id;

  IF v_current_generation_id IS DISTINCT FROM v_candidate.base_generation_id THEN
    RAISE EXCEPTION 'Current release advanced after candidate preparation';
  END IF;
  IF v_current_release.rule_set_id IS DISTINCT FROM v_candidate.rule_set_id THEN
    RAISE EXCEPTION 'Current release rule set differs from candidate';
  END IF;

  v_provider_id := v_candidate.provider_id;
  IF v_provider_id IS DISTINCT FROM v_backup.provider_id
     OR v_candidate.rule_set_id IS DISTINCT FROM v_backup.rule_set_id THEN
    RAISE EXCEPTION 'Candidate and rollback snapshot do not describe the same provider/rule set';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional' AND active
  ) THEN
    RAISE EXCEPTION 'ForPromotional cron must be paused during atomic activation';
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

  SELECT md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id)::text, '[]'))
  INTO v_current_rules_md5
  FROM public.provider_pricing_rules AS r
  WHERE r.rule_set_id = v_candidate.rule_set_id;
  SELECT md5(COALESCE(jsonb_agg(e.value ORDER BY e.value->>'id')::text, '[]'))
  INTO v_snapshot_rules_md5
  FROM jsonb_array_elements(v_backup.rule_rows) AS e(value);
  IF v_current_rules_md5 IS DISTINCT FROM v_snapshot_rules_md5 THEN
    RAISE EXCEPTION 'Pricing rules changed after the rollback snapshot';
  END IF;

  SELECT md5(COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id)::text, '[]'))
  INTO v_current_scales_md5
  FROM public.producto_precio_escalas AS s
  WHERE s.proveedor_id = v_provider_id;
  SELECT md5(COALESCE(jsonb_agg(e.value ORDER BY e.value->>'id')::text, '[]'))
  INTO v_snapshot_scales_md5
  FROM jsonb_array_elements(v_backup.scale_rows) AS e(value);
  IF v_current_scales_md5 IS DISTINCT FROM v_snapshot_scales_md5 THEN
    RAISE EXCEPTION 'ForPromotional costs/scales changed after the rollback snapshot';
  END IF;

  SELECT md5(COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id)::text, '[]'))
  INTO v_current_stock_md5
  FROM public.producto_proveedor_stock AS s
  WHERE s.proveedor_id = v_provider_id;
  SELECT md5(COALESCE(jsonb_agg(e.value ORDER BY e.value->>'id')::text, '[]'))
  INTO v_snapshot_stock_md5
  FROM jsonb_array_elements(v_backup.stock_rows) AS e(value);
  IF v_current_stock_md5 IS DISTINCT FROM v_snapshot_stock_md5 THEN
    RAISE EXCEPTION 'ForPromotional stock changed after the rollback snapshot';
  END IF;

  SELECT count(*)::integer INTO v_rule_count
  FROM public.provider_pricing_rules
  WHERE rule_set_id = v_candidate.rule_set_id
    AND provider_code = 'forpromotional';
  IF v_rule_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one ForPromotional pricing rule is required';
  END IF;
  IF (SELECT cost_factor FROM public.provider_pricing_rules
      WHERE rule_set_id = v_candidate.rule_set_id
        AND provider_code = 'forpromotional') IS DISTINCT FROM 1.0300 THEN
    RAISE EXCEPTION 'ForPromotional factor is not the expected pre-activation 1.0300';
  END IF;

  IF to_regclass('public.pricing_policy_flags') IS NULL THEN
    RAISE EXCEPTION 'pricing_policy_flags is missing';
  END IF;
  SELECT enabled INTO v_enabled
  FROM public.pricing_policy_flags
  WHERE policy_key = 'forpromotional_continuous_v1'
  FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'ForPromotional policy must exist and be disabled before activation';
  END IF;

  -- The candidate was certified against exact IDs. These updates cannot affect
  -- G4/CDO because certification rejects overlapping product mappings.
  UPDATE public.producto_precio_escalas AS live
  SET unit_cost = staged.unit_cost,
      currency = staged.currency,
      source_field = staged.source_field,
      updated_at = now()
  FROM public.forpromotional_atomic_cost_shadow AS staged
  WHERE staged.candidate_id = v_candidate.id
    AND live.id = staged.scale_id
    AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_scale_count = ROW_COUNT;
  IF v_scale_count <> (SELECT count(*) FROM public.forpromotional_atomic_cost_shadow
                       WHERE candidate_id = v_candidate.id) THEN
    RAISE EXCEPTION 'Atomic cost update count mismatch: %', v_scale_count;
  END IF;

  UPDATE public.producto_proveedor_stock AS live
  SET cantidad = staged.stock_qty,
      disponibilidad = staged.stock_status,
      updated_at = now()
  FROM public.forpromotional_atomic_cost_shadow AS staged
  WHERE staged.candidate_id = v_candidate.id
    AND live.id = staged.stock_id
    AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_stock_count = ROW_COUNT;
  IF v_stock_count <> (SELECT count(*) FROM public.forpromotional_atomic_cost_shadow
                       WHERE candidate_id = v_candidate.id) THEN
    RAISE EXCEPTION 'Atomic stock update count mismatch: %', v_stock_count;
  END IF;

  UPDATE public.provider_pricing_rules
  SET cost_factor = 1.0000,
      notes = 'ForPromotional API precio_desc; factor 1.0000; atomic candidate activation',
      updated_at = now()
  WHERE rule_set_id = v_candidate.rule_set_id
    AND provider_code = 'forpromotional';

  UPDATE public.pricing_policy_flags
  SET enabled = true,
      policy_version = v_candidate.policy_version,
      updated_at = now()
  WHERE policy_key = 'forpromotional_continuous_v1';

  -- Retire the old pointer and publish the already-certified clone in the same
  -- transaction. Use the saved publication actor because SQL Editor sessions
  -- do not necessarily have an auth.uid().
  SELECT (e.value->>'published_by')::uuid
  INTO v_published_by
  FROM jsonb_array_elements(v_backup.release_rows) AS e(value)
  WHERE COALESCE((e.value->>'is_current')::boolean, false)
  LIMIT 1;
  IF v_published_by IS NULL THEN
    RAISE EXCEPTION 'Current release snapshot has no publication actor';
  END IF;

  UPDATE public.catalog_price_v2_releases
  SET is_current = false,
      superseded_at = now(),
      superseded_by = v_new_release_id,
      updated_at = now()
  WHERE id = v_current_release.id AND is_current;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current Pricing V2 pointer could not be retired';
  END IF;

  INSERT INTO public.catalog_price_v2_releases (
    id, generation_id, is_current, published_at, published_by,
    created_at, updated_at
  ) VALUES (
    v_new_release_id, v_candidate.catalog_generation_id, true, now(),
    v_published_by, now(), now()
  );

  UPDATE public.forpromotional_atomic_candidates
  SET status = 'active', activated_at = now(), updated_at = now()
  WHERE id = v_candidate.id AND status = 'certified';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate status changed during activation';
  END IF;
END
$activate_atomic$;

COMMIT;

SELECT c.id AS candidate_id, c.status AS candidate_status,
       r.id AS release_id, r.generation_id, r.is_current,
       f.enabled AS policy_enabled, rule.cost_factor AS forpromotional_factor
FROM public.forpromotional_atomic_candidates AS c
JOIN public.catalog_price_v2_releases AS r
  ON r.generation_id = c.catalog_generation_id AND r.is_current
JOIN public.pricing_policy_flags AS f
  ON f.policy_key = 'forpromotional_continuous_v1'
JOIN public.provider_pricing_rules AS rule
  ON rule.rule_set_id = c.rule_set_id AND rule.provider_code = 'forpromotional'
WHERE c.status = 'active';
