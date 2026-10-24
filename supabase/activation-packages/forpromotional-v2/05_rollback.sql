-- PE ForPromotional activation package
-- Stage R: guarded rollback. Run after 09_pause_v2_for_rollback.sql and after
-- ensuring the ForPromotional cron is paused. The original Edge Functions were
-- never overwritten. This restores the provider
-- rows, pricing rule, policy flag, SQL functions/ACLs and cron schedule saved
-- by 01_snapshot_backup.sql. It never uses CASCADE and aborts before deletion
-- if an unexpected concurrent mapping or active lock is detected.

BEGIN;

DO $rollback$
DECLARE
  v_backup record;
  v_rule_set_id uuid;
  v_provider_id uuid;
  v_job record;
  v_function record;
  v_acl record;
  v_target record;
  v_policy_row jsonb;
  v_grantee_sql text;
  v_grant_option text;
  v_extra_count integer;
  v_active_lock_count integer;
  v_current_release_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('pe_forpromotional_activation_v1', 0)
  );

  SELECT *
  INTO v_backup
  FROM public.pe_forpromotional_activation_backup_v1
  WHERE backup_key = 'current';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rollback snapshot current row is missing';
  END IF;

  v_provider_id := v_backup.provider_id;
  v_rule_set_id := v_backup.rule_set_id;
  IF v_provider_id IS NULL OR v_rule_set_id IS NULL THEN
    RAISE EXCEPTION 'Rollback snapshot lacks provider_id or rule_set_id';
  END IF;

  SELECT count(*)::integer
  INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Rollback stopped: current release count is %', v_current_release_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.catalog_price_v2_releases AS r
    JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
    WHERE r.is_current = true
      AND g.rule_set_id = v_rule_set_id
  ) THEN
    RAISE EXCEPTION 'Rollback stopped: current release rule set changed after snapshot';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional' AND active
  ) THEN
    RAISE EXCEPTION 'Rollback stopped: ForPromotional cron is still active';
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL THEN
    SELECT count(*)::integer
    INTO v_active_lock_count
    FROM public.stock_refresh_locks
    WHERE scope = 'forpromotional'
      AND locked_until > now();
    IF v_active_lock_count > 0 THEN
      RAISE EXCEPTION 'Rollback stopped: an active ForPromotional refresh lock exists';
    END IF;
  END IF;

  -- New rows are safe to remove only inside the explicitly controlled window.
  -- Before deleting an offer, refuse any mapping that was not part of the
  -- provider sync contract; no commercial relationship is guessed or removed.
  SELECT count(*)::integer INTO v_extra_count
  FROM public.producto_precio_escalas AS s
  WHERE s.proveedor_id = v_provider_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.scale_rows) AS saved(id uuid)
      WHERE saved.id = s.id
    );
  IF v_extra_count > 0 THEN
    DELETE FROM public.producto_precio_escalas AS s
    WHERE s.proveedor_id = v_provider_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.scale_rows) AS saved(id uuid)
        WHERE saved.id = s.id
      );
  END IF;

  DELETE FROM public.producto_proveedor_stock AS s
  WHERE s.proveedor_id = v_provider_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.stock_rows) AS saved(id uuid)
      WHERE saved.id = s.id
    );

  IF EXISTS (
    SELECT 1
    FROM public.producto_proveedor_ofertas AS o
    WHERE o.proveedor_id = v_provider_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.offer_rows) AS saved(id uuid)
        WHERE saved.id = o.id
      )
      AND EXISTS (
        SELECT 1 FROM public.producto_b2b_oferta_map AS m
        WHERE m.oferta_id = o.id
      )
  ) THEN
    RAISE EXCEPTION
      'Rollback stopped: an unexpected new ForPromotional offer has a commercial mapping';
  END IF;

  DELETE FROM public.producto_proveedor_ofertas AS o
  WHERE o.proveedor_id = v_provider_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.offer_rows) AS saved(id uuid)
      WHERE saved.id = o.id
    );

  -- Restore rows in foreign-key order. jsonb_populate_record uses the exact
  -- live composite type, so the script does not invent or omit provider fields.
  INSERT INTO public.provider_import_batches
  SELECT (jsonb_populate_record(NULL::public.provider_import_batches, value)).*
  FROM jsonb_array_elements(v_backup.batch_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    proveedor_id = EXCLUDED.proveedor_id,
    started_at = EXCLUDED.started_at,
    finished_at = EXCLUDED.finished_at,
    status = EXCLUDED.status,
    mode = EXCLUDED.mode,
    items_received = EXCLUDED.items_received,
    items_upserted = EXCLUDED.items_upserted,
    items_failed = EXCLUDED.items_failed,
    error_message = EXCLUDED.error_message,
    triggered_by = EXCLUDED.triggered_by,
    created_at = EXCLUDED.created_at;

  DELETE FROM public.provider_import_batches AS b
  WHERE b.proveedor_id = v_provider_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.batch_rows) AS saved(id uuid)
      WHERE saved.id = b.id
    );

  INSERT INTO public.provider_raw_products
  SELECT (jsonb_populate_record(NULL::public.provider_raw_products, value)).*
  FROM jsonb_array_elements(v_backup.raw_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    proveedor_id = EXCLUDED.proveedor_id,
    provider_sku = EXCLUDED.provider_sku,
    batch_id = EXCLUDED.batch_id,
    raw_payload = EXCLUDED.raw_payload,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    categoria = EXCLUDED.categoria,
    subcategoria = EXCLUDED.subcategoria,
    productos_b2b_id = EXCLUDED.productos_b2b_id,
    activo = EXCLUDED.activo,
    last_seen_at = EXCLUDED.last_seen_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM public.provider_raw_products AS r
  WHERE r.proveedor_id = v_provider_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.raw_rows) AS saved(id uuid)
      WHERE saved.id = r.id
    );

  -- Restore the refresh audit trail and cursor state. These tables are
  -- optional in older installations; when present they are restored only
  -- for the ForPromotional provider.
  IF to_regclass('public.stock_refresh_run_items') IS NOT NULL THEN
    DELETE FROM public.stock_refresh_run_items AS i
    WHERE i.provider = 'forpromotional'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.stock_run_item_rows) AS saved(id uuid)
        WHERE saved.id = i.id
      );
  END IF;

  IF to_regclass('public.stock_refresh_runs') IS NOT NULL THEN
    DELETE FROM public.stock_refresh_runs AS r
    WHERE r.provider = 'forpromotional'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.stock_run_rows) AS saved(id uuid)
        WHERE saved.id = r.id
      );

    INSERT INTO public.stock_refresh_runs
    SELECT (jsonb_populate_record(NULL::public.stock_refresh_runs, value)).*
    FROM jsonb_array_elements(v_backup.stock_run_rows) AS e(value)
    ON CONFLICT (id) DO UPDATE SET
      provider = EXCLUDED.provider,
      mode = EXCLUDED.mode,
      params = EXCLUDED.params,
      status = EXCLUDED.status,
      result = EXCLUDED.result,
      error = EXCLUDED.error,
      started_at = EXCLUDED.started_at,
      finished_at = EXCLUDED.finished_at;
  END IF;

  IF to_regclass('public.stock_refresh_run_items') IS NOT NULL THEN
    INSERT INTO public.stock_refresh_run_items
    SELECT (jsonb_populate_record(NULL::public.stock_refresh_run_items, value)).*
    FROM jsonb_array_elements(v_backup.stock_run_item_rows) AS e(value)
    ON CONFLICT (id) DO UPDATE SET
      run_id = EXCLUDED.run_id,
      provider = EXCLUDED.provider,
      batch_number = EXCLUDED.batch_number,
      page_used = EXCLUDED.page_used,
      offset_used = EXCLUDED.offset_used,
      offer_offset_used = EXCLUDED.offer_offset_used,
      status = EXCLUDED.status,
      items_seen = EXCLUDED.items_seen,
      stock_updated = EXCLUDED.stock_updated,
      response = EXCLUDED.response,
      error = EXCLUDED.error,
      created_at = EXCLUDED.created_at;
  END IF;

  IF to_regclass('public.stock_refresh_cursors') IS NOT NULL THEN
    DELETE FROM public.stock_refresh_cursors AS c
    WHERE c.provider = 'forpromotional'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.cursor_rows) AS saved(provider text)
        WHERE saved.provider = c.provider
      );

    INSERT INTO public.stock_refresh_cursors
    SELECT (jsonb_populate_record(NULL::public.stock_refresh_cursors, value)).*
    FROM jsonb_array_elements(v_backup.cursor_rows) AS e(value)
    ON CONFLICT (provider) DO UPDATE SET
      next_offset = EXCLUDED.next_offset,
      next_page = EXCLUDED.next_page,
      next_offer_offset = EXCLUDED.next_offer_offset,
      cycle_count = EXCLUDED.cycle_count,
      last_run_at = EXCLUDED.last_run_at,
      last_completed_cycle_at = EXCLUDED.last_completed_cycle_at,
      updated_at = EXCLUDED.updated_at;
  END IF;

  IF to_regclass('public.stock_refresh_locks') IS NOT NULL THEN
    DELETE FROM public.stock_refresh_locks AS l
    WHERE l.scope = 'forpromotional'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.stock_lock_rows) AS saved(scope text)
        WHERE saved.scope = l.scope
      );

    INSERT INTO public.stock_refresh_locks
    SELECT (jsonb_populate_record(NULL::public.stock_refresh_locks, value)).*
    FROM jsonb_array_elements(v_backup.stock_lock_rows) AS e(value)
    ON CONFLICT (scope) DO UPDATE SET
      lock_token = EXCLUDED.lock_token,
      run_id = EXCLUDED.run_id,
      acquired_at = EXCLUDED.acquired_at,
      locked_until = EXCLUDED.locked_until,
      updated_at = EXCLUDED.updated_at;
  END IF;

  INSERT INTO public.producto_proveedor_ofertas
  SELECT (jsonb_populate_record(NULL::public.producto_proveedor_ofertas, value)).*
  FROM jsonb_array_elements(v_backup.offer_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    provider_raw_product_id = EXCLUDED.provider_raw_product_id,
    proveedor_id = EXCLUDED.proveedor_id,
    variant_sku = EXCLUDED.variant_sku,
    color_code = EXCLUDED.color_code,
    color_nombre = EXCLUDED.color_nombre,
    talla = EXCLUDED.talla,
    material = EXCLUDED.material,
    modelo = EXCLUDED.modelo,
    imagen_url = EXCLUDED.imagen_url,
    atributos = EXCLUDED.atributos,
    activo = EXCLUDED.activo,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.producto_precio_escalas
  SELECT (jsonb_populate_record(NULL::public.producto_precio_escalas, value)).*
  FROM jsonb_array_elements(v_backup.scale_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    oferta_id = EXCLUDED.oferta_id,
    proveedor_id = EXCLUDED.proveedor_id,
    min_qty = EXCLUDED.min_qty,
    max_qty = EXCLUDED.max_qty,
    unit_cost = EXCLUDED.unit_cost,
    currency = EXCLUDED.currency,
    source_field = EXCLUDED.source_field,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.producto_proveedor_stock
  SELECT (jsonb_populate_record(NULL::public.producto_proveedor_stock, value)).*
  FROM jsonb_array_elements(v_backup.stock_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    oferta_id = EXCLUDED.oferta_id,
    proveedor_id = EXCLUDED.proveedor_id,
    cantidad = EXCLUDED.cantidad,
    disponibilidad = EXCLUDED.disponibilidad,
    updated_at = EXCLUDED.updated_at;

  -- Restore the public stock-status materialization for products mapped to
  -- ForPromotional. Do not delete an unexpected status row: a product may
  -- also be supplied by G4/CDO, so deleting it could cross provider scope.
  INSERT INTO public.producto_b2b_status
  SELECT (jsonb_populate_record(NULL::public.producto_b2b_status, value)).*
  FROM jsonb_array_elements(v_backup.status_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    producto_b2b_id = EXCLUDED.producto_b2b_id,
    id_interno = EXCLUDED.id_interno,
    public_visible = EXCLUDED.public_visible,
    stock_status = EXCLUDED.stock_status,
    stock_qty = EXCLUDED.stock_qty,
    quote_mode = EXCLUDED.quote_mode,
    kit_eligible = EXCLUDED.kit_eligible,
    price_valid = EXCLUDED.price_valid,
    image_available = EXCLUDED.image_available,
    last_stock_sync_at = EXCLUDED.last_stock_sync_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.proveedores
  SELECT (jsonb_populate_record(NULL::public.proveedores, value)).*
  FROM jsonb_array_elements(v_backup.provider_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    nombre = EXCLUDED.nombre,
    activo = EXCLUDED.activo,
    markup_pct = EXCLUDED.markup_pct,
    moneda = EXCLUDED.moneda,
    config = EXCLUDED.config,
    last_sync_at = EXCLUDED.last_sync_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  -- Restore every rule in the active rule set, including G4/CDO baselines.
  IF EXISTS (
    SELECT 1
    FROM public.provider_pricing_rules AS r
    WHERE r.rule_set_id = v_rule_set_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(v_backup.rule_rows) AS saved(id uuid)
        WHERE saved.id = r.id
      )
  ) THEN
    RAISE EXCEPTION 'Rollback stopped: unexpected pricing rule exists in active rule set';
  END IF;

  INSERT INTO public.provider_pricing_rules
  SELECT (jsonb_populate_record(NULL::public.provider_pricing_rules, value)).*
  FROM jsonb_array_elements(v_backup.rule_rows) AS e(value)
  ON CONFLICT (id) DO UPDATE SET
    rule_set_id = EXCLUDED.rule_set_id,
    provider_code = EXCLUDED.provider_code,
    base_cost_strategy = EXCLUDED.base_cost_strategy,
    provider_tier_number = EXCLUDED.provider_tier_number,
    cost_factor = EXCLUDED.cost_factor,
    fallback_strategy = EXCLUDED.fallback_strategy,
    requires_manual_review_on_fallback = EXCLUDED.requires_manual_review_on_fallback,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  v_policy_row := v_backup.policy_row;
  IF v_policy_row IS NULL OR v_policy_row = 'null'::jsonb THEN
    IF to_regclass('public.pricing_policy_flags') IS NOT NULL THEN
      DELETE FROM public.pricing_policy_flags
      WHERE policy_key = 'forpromotional_continuous_v1';
    END IF;
  ELSE
    INSERT INTO public.pricing_policy_flags (policy_key, enabled, policy_version, updated_at)
    VALUES (
      v_policy_row->>'policy_key',
      COALESCE((v_policy_row->>'enabled')::boolean, false),
      v_policy_row->>'policy_version',
      COALESCE((v_policy_row->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (policy_key) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      policy_version = EXCLUDED.policy_version,
      updated_at = EXCLUDED.updated_at;
  END IF;

  -- Restore saved SQL definitions and exact ACL entries. Any target function
  -- created after the snapshot is dropped only after all data restoration has
  -- succeeded; DROP FUNCTION is never issued with CASCADE.
  FOR v_function IN
    SELECT * FROM jsonb_to_recordset(v_backup.function_rows)
      AS saved(identity text, definition text, acl jsonb)
  LOOP
    EXECUTE v_function.definition;
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
      v_function.identity
    );
    FOR v_acl IN
      SELECT * FROM jsonb_to_recordset(v_function.acl)
        AS saved(grantee text, privilege_type text, is_grantable boolean)
    LOOP
      v_grantee_sql := CASE
        WHEN v_acl.grantee = 'PUBLIC' THEN 'PUBLIC'
        ELSE quote_ident(v_acl.grantee)
      END;
      v_grant_option := CASE WHEN v_acl.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END;
      EXECUTE format(
        'GRANT %s ON FUNCTION %s TO %s%s',
        v_acl.privilege_type, v_function.identity, v_grantee_sql, v_grant_option
      );
    END LOOP;
  END LOOP;

  FOR v_target IN
    SELECT * FROM (VALUES
      ('public.forpromotional_curve_price_v1(numeric,integer,integer)'),
      ('public.calculate_forpromotional_continuous_price_v1(uuid,integer,uuid)'),
      ('public.get_public_product_price_quote_v2(uuid,integer)'),
      ('public.get_public_product_price_quote(uuid,integer)')
    ) AS targets(identity)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_backup.function_rows)
        AS saved(identity text, definition text, acl jsonb)
      WHERE saved.identity = v_target.identity
    ) THEN
      EXECUTE format('DROP FUNCTION IF EXISTS %s', v_target.identity);
    END IF;
  END LOOP;

  IF NOT v_backup.policy_table_preexisting
     AND to_regclass('public.pricing_policy_flags') IS NOT NULL THEN
    DROP TABLE public.pricing_policy_flags;
  END IF;

  -- Restore cron state from the captured schedule. The original active job is
  -- recreated only when it is absent; a divergent existing job stops safely.
  FOR v_job IN
    SELECT * FROM jsonb_to_recordset(v_backup.cron_rows)
      AS saved(jobname text, schedule text, command text, active boolean)
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job.jobname) THEN
      IF EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = v_job.jobname
          AND (schedule, command) IS DISTINCT FROM (v_job.schedule, v_job.command)
      ) THEN
        RAISE EXCEPTION 'Rollback stopped: cron definition diverged for %', v_job.jobname;
      END IF;
    ELSIF v_job.active THEN
      PERFORM cron.schedule(v_job.jobname, v_job.schedule, v_job.command);
    END IF;
  END LOOP;
END
$rollback$;

COMMIT;
