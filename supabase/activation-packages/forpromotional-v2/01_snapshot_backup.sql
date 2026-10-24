-- PE ForPromotional activation package
-- Stage 1: persistent rollback snapshot.
--
-- This writes only the backup metadata. It does not change product, offer,
-- scale, stock, pricing-rule, function, release or cron state. It captures
-- the complete provider-scoped rows that the controlled sync can touch, the
-- active Pricing V2 baseline, function definitions/ACLs, cron metadata and
-- public quote baselines. Run only after 00_preflight_readonly.sql is PASS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pe_forpromotional_activation_backup_v1 (
  backup_key text PRIMARY KEY,
  captured_at timestamptz NOT NULL,
  provider_id uuid NOT NULL,
  rule_set_id uuid NOT NULL,
  provider_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  release_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  generation_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  shadow_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_set_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  purchase_level_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  margin_tier_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  offer_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  scale_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  status_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  batch_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_price_cache_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  cursor_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_run_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_run_item_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_lock_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  cron_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  function_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  policy_row jsonb,
  policy_table_preexisting boolean NOT NULL DEFAULT false,
  quote_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  quote_status text NOT NULL DEFAULT 'NOT_VERIFIED'
);

-- Permit the package to detect and extend a backup table created by an older
-- local copy without overwriting its captured row.
ALTER TABLE public.pe_forpromotional_activation_backup_v1
  ADD COLUMN IF NOT EXISTS captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS rule_set_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS provider_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS release_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generation_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shadow_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rule_set_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS purchase_level_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS margin_tier_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS offer_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS batch_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legacy_price_cache_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cursor_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_run_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_run_item_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_lock_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cron_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS function_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_row jsonb,
  ADD COLUMN IF NOT EXISTS policy_table_preexisting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_status text NOT NULL DEFAULT 'NOT_VERIFIED';

ALTER TABLE public.pe_forpromotional_activation_backup_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pe_forpromotional_activation_backup_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pe_forpromotional_activation_backup_v1 TO service_role;

DO $snapshot$
DECLARE
  v_current_release_count integer;
  v_cron_count integer;
  v_rule_set_id uuid;
  v_provider_id uuid;
  v_generation_id uuid;
  v_provider_rows jsonb;
  v_release_rows jsonb;
  v_generation_rows jsonb;
  v_shadow_rows jsonb;
  v_rule_set_rows jsonb;
  v_purchase_level_rows jsonb;
  v_margin_tier_rows jsonb;
  v_rule_rows jsonb;
  v_offer_rows jsonb;
  v_scale_rows jsonb;
  v_stock_rows jsonb;
  v_status_rows jsonb;
  v_raw_rows jsonb;
  v_batch_rows jsonb;
  v_legacy_price_cache_rows jsonb;
  v_cursor_rows jsonb := '[]'::jsonb;
  v_stock_run_rows jsonb := '[]'::jsonb;
  v_stock_run_item_rows jsonb := '[]'::jsonb;
  v_stock_lock_rows jsonb := '[]'::jsonb;
  v_cron_rows jsonb;
  v_function_rows jsonb;
  v_policy_row jsonb := 'null'::jsonb;
  v_policy_table_preexisting boolean := false;
  v_quote_rows jsonb := '[]'::jsonb;
  v_quote_status text := 'NOT_VERIFIED';
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.pe_forpromotional_activation_backup_v1
    WHERE backup_key = 'current'
  ) THEN
    RAISE EXCEPTION 'PE activation backup already exists; do not overwrite it';
  END IF;

  SELECT count(*)::integer
  INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one current pricing release, found %', v_current_release_count;
  END IF;

  SELECT r.generation_id, g.rule_set_id
  INTO v_generation_id, v_rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current = true;
  IF v_rule_set_id IS NULL OR v_generation_id IS NULL THEN
    RAISE EXCEPTION 'Current pricing release has no generation or rule set';
  END IF;

  SELECT p.id
  INTO v_provider_id
  FROM public.proveedores AS p
  WHERE p.code = 'forpromotional';
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'ForPromotional provider is missing';
  END IF;

  SELECT count(*)::integer
  INTO v_cron_count
  FROM cron.job
  WHERE jobname = 'catalog-stock-refresh-forpromotional';
  IF v_cron_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one ForPromotional cron job, found %', v_cron_count;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
  INTO v_provider_rows
  FROM public.proveedores AS p
  WHERE p.id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_release_rows
  FROM public.catalog_price_v2_releases AS r
  WHERE r.is_current = true;

  SELECT COALESCE(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
  INTO v_generation_rows
  FROM public.catalog_price_cache_v2_generations AS g
  WHERE g.id = v_generation_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  INTO v_shadow_rows
  FROM public.catalog_price_cache_v2_shadow AS s
  WHERE s.generation_id = v_generation_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(rs)), '[]'::jsonb)
  INTO v_rule_set_rows
  FROM public.pricing_rule_sets AS rs
  WHERE rs.id = v_rule_set_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(pl)), '[]'::jsonb)
  INTO v_purchase_level_rows
  FROM public.purchase_levels AS pl
  WHERE pl.rule_set_id = v_rule_set_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(mt)), '[]'::jsonb)
  INTO v_margin_tier_rows
  FROM public.margin_tiers AS mt
  WHERE mt.rule_set_id = v_rule_set_id;

  -- Capture all providers in the active rule set so G4/CDO can be compared
  -- after activation even though only ForPromotional may be changed.
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_rule_rows
  FROM public.provider_pricing_rules AS r
  WHERE r.rule_set_id = v_rule_set_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
  INTO v_offer_rows
  FROM public.producto_proveedor_ofertas AS o
  WHERE o.proveedor_id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  INTO v_scale_rows
  FROM public.producto_precio_escalas AS s
  WHERE s.proveedor_id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  INTO v_stock_rows
  FROM public.producto_proveedor_stock AS s
  WHERE s.proveedor_id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  INTO v_status_rows
  FROM public.producto_b2b_status AS s
  WHERE EXISTS (
    SELECT 1
    FROM public.producto_b2b_oferta_map AS m
    WHERE m.producto_b2b_id = s.producto_b2b_id
      AND m.provider_code = 'forpromotional'
  );

  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_raw_rows
  FROM public.provider_raw_products AS r
  WHERE r.proveedor_id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
  INTO v_batch_rows
  FROM public.provider_import_batches AS b
  WHERE b.proveedor_id = v_provider_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
  INTO v_legacy_price_cache_rows
  FROM public.catalog_price_cache AS c
  WHERE c.provider_code = 'forpromotional'
     OR c.source_oferta_id IN (
       SELECT o.id FROM public.producto_proveedor_ofertas AS o
       WHERE o.proveedor_id = v_provider_id
     );

  IF to_regclass('public.stock_refresh_cursors') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    INTO v_cursor_rows
    FROM public.stock_refresh_cursors AS c
    WHERE c.provider = 'forpromotional';
  END IF;

  IF to_regclass('public.stock_refresh_runs') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    INTO v_stock_run_rows
    FROM public.stock_refresh_runs AS r
    WHERE r.provider = 'forpromotional';
  END IF;

  IF to_regclass('public.stock_refresh_run_items') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    INTO v_stock_run_item_rows
    FROM public.stock_refresh_run_items AS i
    WHERE i.provider = 'forpromotional';
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
    INTO v_stock_lock_rows
    FROM public.stock_refresh_locks AS l
    WHERE l.scope = 'forpromotional';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(j)), '[]'::jsonb)
  INTO v_cron_rows
  FROM cron.job AS j
  WHERE j.jobname = 'catalog-stock-refresh-forpromotional';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'identity', p.oid::regprocedure::text,
        'definition', pg_get_functiondef(p.oid),
        'acl', COALESCE(
          (
            SELECT jsonb_agg(jsonb_build_object(
              'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
              'privilege_type', a.privilege_type,
              'is_grantable', a.is_grantable
            ))
            FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS a
          ),
          '[]'::jsonb
        )
      )
    ),
    '[]'::jsonb
  )
  INTO v_function_rows
  FROM pg_proc AS p
  WHERE p.oid IN (
    to_regprocedure('public.forpromotional_curve_price_v1(numeric,integer,integer)'),
    to_regprocedure('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)'),
    to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)'),
    to_regprocedure('public.get_public_product_price_quote(uuid,integer)')
  );

  IF to_regclass('public.pricing_policy_flags') IS NOT NULL THEN
    v_policy_table_preexisting := true;
    EXECUTE $policy$
      SELECT COALESCE(
        (SELECT to_jsonb(f)
         FROM public.pricing_policy_flags AS f
         WHERE f.policy_key = 'forpromotional_continuous_v1'),
        'null'::jsonb
      )
    $policy$ INTO v_policy_row;
  END IF;

  -- Quote calls are used only as a pre-activation comparison baseline. Require
  -- a STABLE public function before calling it; otherwise leave the baseline
  -- explicitly NOT_VERIFIED instead of assuming it is side-effect free.
  IF to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_proc
       WHERE oid = to_regprocedure('public.get_public_product_price_quote_v2(uuid,integer)')
         AND provolatile = 's'
     ) THEN
    EXECUTE $quotes$
      SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      FROM (
        SELECT m.producto_b2b_id, q.quantity,
          (
            SELECT to_jsonb(result)
            FROM public.get_public_product_price_quote_v2(m.producto_b2b_id, q.quantity) AS result
            LIMIT 1
          ) AS quote
        FROM (
          SELECT DISTINCT producto_b2b_id
          FROM public.producto_b2b_oferta_map
          WHERE provider_code = 'forpromotional'
            AND producto_b2b_id IS NOT NULL
        ) AS m
        CROSS JOIN (VALUES (54), (500), (1000), (5000)) AS q(quantity)
      ) AS x
    $quotes$ INTO v_quote_rows;
    v_quote_status := 'CAPTURED_WITH_STABLE_V2_QUOTE';
  ELSIF to_regprocedure('public.get_public_product_price_quote(uuid,integer)') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM pg_proc
          WHERE oid = to_regprocedure('public.get_public_product_price_quote(uuid,integer)')
            AND provolatile = 's'
        ) THEN
    EXECUTE $quotes$
      SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      FROM (
        SELECT m.producto_b2b_id, q.quantity,
          (
            SELECT to_jsonb(result)
            FROM public.get_public_product_price_quote(m.producto_b2b_id, q.quantity) AS result
            LIMIT 1
          ) AS quote
        FROM (
          SELECT DISTINCT producto_b2b_id
          FROM public.producto_b2b_oferta_map
          WHERE provider_code = 'forpromotional'
            AND producto_b2b_id IS NOT NULL
        ) AS m
        CROSS JOIN (VALUES (54), (500), (1000), (5000)) AS q(quantity)
      ) AS x
    $quotes$ INTO v_quote_rows;
    v_quote_status := 'CAPTURED_WITH_STABLE_LEGACY_QUOTE';
  END IF;

  INSERT INTO public.pe_forpromotional_activation_backup_v1 (
    backup_key, captured_at, provider_id, rule_set_id,
    provider_rows, release_rows, generation_rows, shadow_rows,
    rule_set_rows, purchase_level_rows, margin_tier_rows, rule_rows,
    offer_rows, scale_rows, stock_rows, status_rows, raw_rows, batch_rows,
    legacy_price_cache_rows, cursor_rows, stock_run_rows,
    stock_run_item_rows, stock_lock_rows, cron_rows, function_rows,
    policy_row, policy_table_preexisting, quote_rows, quote_status
  )
  VALUES (
    'current', now(), v_provider_id, v_rule_set_id,
    v_provider_rows, v_release_rows, v_generation_rows, v_shadow_rows,
    v_rule_set_rows, v_purchase_level_rows, v_margin_tier_rows, v_rule_rows,
    v_offer_rows, v_scale_rows, v_stock_rows, v_status_rows, v_raw_rows, v_batch_rows,
    v_legacy_price_cache_rows, v_cursor_rows, v_stock_run_rows,
    v_stock_run_item_rows, v_stock_lock_rows, v_cron_rows, v_function_rows,
    v_policy_row, v_policy_table_preexisting, v_quote_rows, v_quote_status
  );
END
$snapshot$;

COMMIT;
