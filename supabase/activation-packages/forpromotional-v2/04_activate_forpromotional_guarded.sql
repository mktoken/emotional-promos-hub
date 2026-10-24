-- PE ForPromotional activation package
-- Stage 2: controlled activation. Run only after the Lovable Cloud dry-run,
-- before/after quote comparison and cron transition approval are PASS.
-- This changes only the ForPromotional rule and its feature flag.

BEGIN;

DO $activate$
DECLARE
  v_current_release_count integer;
  v_rule_set_id uuid;
  v_backup_rule_set_id uuid;
  v_rule_count integer;
  v_factor numeric;
  v_enabled boolean;
  v_snapshot_rules_md5 text;
  v_current_rules_md5 text;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  IF to_regclass('public.pe_forpromotional_activation_backup_v1') IS NULL THEN
    RAISE EXCEPTION 'Rollback snapshot is missing';
  END IF;

  SELECT rule_set_id
  INTO v_backup_rule_set_id
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current';

  IF v_backup_rule_set_id IS NULL THEN
    RAISE EXCEPTION 'Rollback snapshot current row is missing';
  END IF;

  SELECT count(*)::integer
  INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;

  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one current pricing release, found %', v_current_release_count;
  END IF;

  SELECT g.rule_set_id
  INTO v_rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g
    ON g.id = r.generation_id
  WHERE r.is_current = true;

  IF v_rule_set_id IS DISTINCT FROM v_backup_rule_set_id THEN
    RAISE EXCEPTION 'Current rule set changed after snapshot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional'
      AND active
  ) THEN
    RAISE EXCEPTION
      'ForPromotional cron is active; pause it before changing the factor or enabling the policy';
  END IF;

  SELECT count(*)::integer, max(cost_factor)
  INTO v_rule_count, v_factor
  FROM public.provider_pricing_rules
  WHERE rule_set_id = v_rule_set_id
    AND provider_code = 'forpromotional';

  IF v_rule_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one ForPromotional rule, found %', v_rule_count;
  END IF;

  IF v_factor IS DISTINCT FROM 1.0300 THEN
    RAISE EXCEPTION
      'Expected the confirmed production ForPromotional factor 1.0300 before activation, found %',
      v_factor;
  END IF;

  SELECT md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id)::text, '[]'))
  INTO v_current_rules_md5
  FROM public.provider_pricing_rules AS r
  WHERE r.rule_set_id = v_rule_set_id;

  SELECT md5(COALESCE(jsonb_agg(e.value ORDER BY e.value->>'id')::text, '[]'))
  INTO v_snapshot_rules_md5
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_array_elements(b.rule_rows) AS e(value)
  WHERE b.backup_key = 'current';

  IF v_current_rules_md5 IS DISTINCT FROM v_snapshot_rules_md5 THEN
    RAISE EXCEPTION
      'Pricing rule set changed after snapshot; refusing to alter ForPromotional';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.producto_precio_escalas AS s
    JOIN public.producto_proveedor_ofertas AS o ON o.id = s.oferta_id
    WHERE o.proveedor_id = (
      SELECT provider_id
      FROM public.pe_forpromotional_activation_backup_v1
      WHERE backup_key = 'current'
    )
      AND o.activo
      AND (s.unit_cost IS NULL OR s.unit_cost <= 0
           OR s.source_field IS DISTINCT FROM 'forpromotional.api.precio_desc')
  ) THEN
    RAISE EXCEPTION
      'ForPromotional has an active offer with an invalid or non-API cost scale';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pe_forpromotional_activation_backup_v1
    WHERE backup_key = 'current'
      AND quote_status = 'NOT_VERIFIED'
  ) THEN
    RAISE EXCEPTION
      'Quote baseline was not captured; activation requires a verified baseline';
  END IF;

  IF to_regclass('public.pricing_policy_flags') IS NULL THEN
    RAISE EXCEPTION 'Pricing policy flags table is missing; install stage is incomplete';
  END IF;

  SELECT enabled
  INTO v_enabled
  FROM public.pricing_policy_flags
  WHERE policy_key = 'forpromotional_continuous_v1'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ForPromotional policy flag is missing';
  END IF;

  IF COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'ForPromotional policy is already active; aborting duplicate activation';
  END IF;

  UPDATE public.provider_pricing_rules
  SET cost_factor = 1.0000,
      notes = 'ForPromotional API precio_desc; factor 1.0000; controlled activation'
  WHERE rule_set_id = v_rule_set_id
    AND provider_code = 'forpromotional';

  UPDATE public.pricing_policy_flags
  SET enabled = true,
      policy_version = 'forpromotional-continuous-v1',
      updated_at = now()
  WHERE policy_key = 'forpromotional_continuous_v1';
END
$activate$;

COMMIT;
