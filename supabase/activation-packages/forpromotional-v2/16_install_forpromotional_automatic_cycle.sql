-- PE ForPromotional automatic cycle package
-- Installs only private cycle state, restore metadata and service-role RPCs.
-- It does not activate the policy, change live costs, change stock or change cron.

BEGIN;

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_cycle_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  candidate_id uuid REFERENCES public.forpromotional_atomic_candidates(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'running',
  trigger text NOT NULL DEFAULT 'cron',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_cycle_runs_status_check
    CHECK (status IN ('running','succeeded','failed','skipped'))
);

CREATE UNIQUE INDEX IF NOT EXISTS forpromotional_atomic_cycle_one_running_idx
ON public.forpromotional_atomic_cycle_runs ((true))
WHERE status = 'running';

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_cycle_state (
  provider_code text PRIMARY KEY,
  automatic_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'idle',
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  stale_after interval NOT NULL DEFAULT interval '15 minutes',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_cycle_state_provider_check
    CHECK (provider_code = 'forpromotional'),
  CONSTRAINT forpromotional_atomic_cycle_state_status_check
    CHECK (status IN ('idle','running','succeeded','failed','stale','disabled'))
);

DO $automatic_state_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cycle_state
    WHERE provider_code = 'forpromotional'
      AND automatic_enabled = true
  ) THEN
    RAISE EXCEPTION
      'automatic cycle install stopped: existing ForPromotional cycle is enabled';
  END IF;
END
$automatic_state_guard$;

INSERT INTO public.forpromotional_atomic_cycle_state (provider_code, status)
VALUES ('forpromotional', 'disabled')
ON CONFLICT (provider_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_restore_meta (
  candidate_id uuid PRIMARY KEY REFERENCES public.forpromotional_atomic_candidates(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  old_release_id uuid NOT NULL REFERENCES public.catalog_price_v2_releases(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  old_generation_id uuid NOT NULL REFERENCES public.catalog_price_cache_v2_generations(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  old_factor numeric NOT NULL,
  old_rule_notes text,
  old_policy_enabled boolean NOT NULL,
  old_policy_version text,
  old_release_row jsonb,
  old_rule_row jsonb,
  old_policy_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_restore_rows (
  candidate_id uuid NOT NULL REFERENCES public.forpromotional_atomic_candidates(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  scale_id uuid NOT NULL REFERENCES public.producto_precio_escalas(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  old_unit_cost numeric NOT NULL,
  old_currency text NOT NULL,
  old_source_field text NOT NULL,
  stock_id uuid NOT NULL REFERENCES public.producto_proveedor_stock(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  old_stock_qty integer NOT NULL,
  old_stock_status text NOT NULL,
  old_scale_row jsonb,
  old_stock_row jsonb,
  PRIMARY KEY (candidate_id, scale_id, stock_id)
);

ALTER TABLE public.forpromotional_atomic_restore_meta
  ADD COLUMN IF NOT EXISTS old_release_row jsonb,
  ADD COLUMN IF NOT EXISTS old_rule_row jsonb,
  ADD COLUMN IF NOT EXISTS old_policy_row jsonb;
ALTER TABLE public.forpromotional_atomic_restore_rows
  ADD COLUMN IF NOT EXISTS old_scale_row jsonb,
  ADD COLUMN IF NOT EXISTS old_stock_row jsonb;

ALTER TABLE public.forpromotional_atomic_candidates
  ADD COLUMN IF NOT EXISTS cycle_run_id uuid;

ALTER TABLE public.forpromotional_atomic_cycle_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_cycle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_restore_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_restore_rows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.forpromotional_atomic_cycle_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_cycle_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_restore_meta FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_restore_rows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.forpromotional_atomic_cycle_runs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.forpromotional_atomic_cycle_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_restore_meta TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_restore_rows TO service_role;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_cycle_begin_v1(
  p_idempotency_key text,
  p_trigger text DEFAULT 'cron'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cycle_begin$
DECLARE
  v_existing record;
  v_run_id uuid := gen_random_uuid();
  v_candidate_id uuid := gen_random_uuid();
  v_generation_id uuid := gen_random_uuid();
  v_provider_id uuid;
  v_base_generation_id uuid;
  v_rule_set_id uuid;
  v_source_count integer;
  v_current_count integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'service_role required';
  END IF;
  IF nullif(trim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'idempotency key required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_cycle_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT * INTO v_existing
  FROM public.forpromotional_atomic_cycle_runs
  WHERE idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'run_id', v_existing.id,
      'candidate_id', v_existing.candidate_id,
      'status', v_existing.status,
      'result', v_existing.result
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_cycle_runs
    WHERE status = 'running'
  ) THEN
    RAISE EXCEPTION 'another ForPromotional automatic cycle is running';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_candidates
    WHERE status IN ('building','certified')
  ) THEN
    RAISE EXCEPTION 'an unfinished ForPromotional candidate already exists';
  END IF;

  SELECT p.id INTO v_provider_id
  FROM public.proveedores AS p
  WHERE p.code = 'forpromotional';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ForPromotional provider is missing';
  END IF;

  SELECT count(*)::integer INTO v_current_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_count <> 1 THEN
    RAISE EXCEPTION 'exactly one current Pricing V2 release is required';
  END IF;

  SELECT r.generation_id, g.rule_set_id
  INTO v_base_generation_id, v_rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current = true
  FOR UPDATE OF r, g;

  SELECT count(*)::integer INTO v_source_count
  FROM public.catalog_price_cache_v2_shadow
  WHERE generation_id = v_base_generation_id;
  IF v_source_count <= 0 THEN
    RAISE EXCEPTION 'current Pricing V2 generation is empty';
  END IF;

  INSERT INTO public.forpromotional_atomic_cycle_runs (id, idempotency_key, trigger)
  VALUES (v_run_id, trim(p_idempotency_key), COALESCE(NULLIF(trim(p_trigger), ''), 'cron'));

  INSERT INTO public.catalog_price_cache_v2_generations (
    id, idempotency_key, mode, status, rule_set_id,
    candidate_count, processed_count, priced_count,
    request_quote_count, unavailable_count, error_count, unresolved_count,
    started_at
  ) VALUES (
    v_generation_id,
    'forpromotional-cycle-' || v_run_id::text,
    'shadow_write',
    'running',
    v_rule_set_id,
    v_source_count,
    0, 0, 0, 0, 0, 0,
    now()
  );

  INSERT INTO public.catalog_price_cache_v2_shadow (
    generation_id, product_id, rule_set_id, public_price_status,
    price_before_tax_mxn, currency, minimum_quantity, computed_at,
    calculation_version
  )
  SELECT v_generation_id, s.product_id, s.rule_set_id, s.public_price_status,
         s.price_before_tax_mxn, s.currency, s.minimum_quantity, s.computed_at,
         s.calculation_version
  FROM public.catalog_price_cache_v2_shadow AS s
  WHERE s.generation_id = v_base_generation_id;

  IF (SELECT count(*) FROM public.catalog_price_cache_v2_shadow WHERE generation_id = v_generation_id)
     <> v_source_count THEN
    RAISE EXCEPTION 'automatic candidate generation clone is incomplete';
  END IF;

  INSERT INTO public.forpromotional_atomic_candidates (
    id, status, provider_id, base_generation_id, catalog_generation_id,
    rule_set_id, factor, api_complete, validation_report, cycle_run_id
  ) VALUES (
    v_candidate_id, 'building', v_provider_id, v_base_generation_id,
    v_generation_id, v_rule_set_id, 1.0000, false,
    jsonb_build_object('source_rows', v_source_count, 'cycle_run_id', v_run_id),
    v_run_id
  );

  UPDATE public.forpromotional_atomic_cycle_runs
  SET candidate_id = v_candidate_id, updated_at = now()
  WHERE id = v_run_id;

  UPDATE public.forpromotional_atomic_cycle_state
  SET status = 'running', last_attempt_at = now(), last_error = NULL, updated_at = now()
  WHERE provider_code = 'forpromotional';

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'run_id', v_run_id,
    'candidate_id', v_candidate_id,
    'base_generation_id', v_base_generation_id,
    'catalog_generation_id', v_generation_id,
    'status', 'running'
  );
END
$cycle_begin$;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_cycle_finish_v1(
  p_run_id uuid,
  p_status text,
  p_result jsonb DEFAULT '{}'::jsonb,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cycle_finish$
DECLARE
  v_run record;
  v_final_status text := lower(trim(p_status));
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'service_role required';
  END IF;
  IF v_final_status NOT IN ('succeeded','failed','skipped') THEN
    RAISE EXCEPTION 'invalid cycle status';
  END IF;

  SELECT * INTO v_run
  FROM public.forpromotional_atomic_cycle_runs
  WHERE id = p_run_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cycle run not found';
  END IF;

  UPDATE public.forpromotional_atomic_cycle_runs
  SET status = v_final_status,
      result = COALESCE(p_result, '{}'::jsonb),
      error_message = p_error,
      finished_at = now(),
      updated_at = now()
  WHERE id = p_run_id;

  UPDATE public.forpromotional_atomic_cycle_state
  SET status = CASE WHEN v_final_status = 'succeeded' THEN 'succeeded'
                    WHEN v_final_status = 'skipped' THEN 'idle'
                    ELSE 'failed' END,
      last_success_at = CASE WHEN v_final_status = 'succeeded' THEN now() ELSE last_success_at END,
      last_failure_at = CASE WHEN v_final_status = 'failed' THEN now() ELSE last_failure_at END,
      last_error = CASE WHEN v_final_status = 'failed' THEN p_error ELSE NULL END,
      updated_at = now()
  WHERE provider_code = 'forpromotional';

  RETURN jsonb_build_object('ok', true, 'run_id', p_run_id, 'status', v_final_status);
END
$cycle_finish$;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_cycle_certify_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cycle_certify$
DECLARE
  v_candidate record;
  v_variant_count integer;
  v_occurrence_count integer;
  v_stage_count integer;
  v_expected_count integer;
  v_exception_count integer;
  v_ambiguous_count integer;
  v_overlap_count integer;
  v_absent_count integer;
  v_public_absent_count integer;
  v_pending_public_count integer;
  v_updated_count integer;
  v_product_id uuid;
  v_cost numeric;
  v_qmin integer;
  v_probe_q integer;
  v_probe_price numeric;
  v_qmin_price numeric;
  v_previous_price numeric;
  v_previous_total numeric;
  v_probe_total numeric;
  v_report jsonb;
  v_probe_quantities integer[] := ARRAY[1,54,100,250,500,541,1000,1743,3486,5000,5229,6000,20000];
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'service_role required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_cycle_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT * INTO v_candidate
  FROM public.forpromotional_atomic_candidates
  WHERE id = p_candidate_id AND status = 'building'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'building automatic candidate not found';
  END IF;
  IF NOT v_candidate.api_complete THEN
    RAISE EXCEPTION 'candidate API import is incomplete';
  END IF;

  IF v_candidate.api_record_count IS NULL
     OR v_candidate.api_unique_variant_count IS NULL
     OR v_candidate.api_duplicate_record_count IS NULL
     OR nullif(v_candidate.api_source_fingerprint, '') IS NULL
     OR v_candidate.api_record_count
        <> v_candidate.api_unique_variant_count + v_candidate.api_duplicate_record_count THEN
    RAISE EXCEPTION 'candidate API reconciliation metrics are incomplete';
  END IF;

  SELECT count(*)::integer, COALESCE(sum(api_occurrences), 0)::integer
  INTO v_variant_count, v_occurrence_count
  FROM public.forpromotional_atomic_variant_shadow
  WHERE candidate_id = p_candidate_id;
  IF v_variant_count <> v_candidate.api_unique_variant_count
     OR v_occurrence_count <> v_candidate.api_record_count THEN
    RAISE EXCEPTION
      'candidate API inventory mismatch: variants %/% occurrences %/%',
      v_variant_count, v_candidate.api_unique_variant_count,
      v_occurrence_count, v_candidate.api_record_count;
  END IF;

  SELECT count(*)::integer INTO v_exception_count
  FROM public.forpromotional_atomic_exceptions
  WHERE candidate_id = p_candidate_id;
  IF v_exception_count <> 0 THEN
    RAISE EXCEPTION 'candidate contains % unresolved API exceptions', v_exception_count;
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE public_mapping_count > 0)::integer,
         count(*) FILTER (
           WHERE public_mapping_count > 0 AND resolution_status = 'pending'
         )::integer
  INTO v_absent_count, v_public_absent_count, v_pending_public_count
  FROM public.forpromotional_atomic_local_absences
  WHERE candidate_id = p_candidate_id;
  IF v_pending_public_count > 0 THEN
    RAISE EXCEPTION
      'candidate blocked: % API-absent local offers affect public products and lack a documented decision',
      v_pending_public_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_local_absences AS a
    WHERE a.candidate_id = p_candidate_id
      AND a.public_mapping_count > 0
      AND a.resolution_status = 'resolved_externally'
      AND EXISTS (
        SELECT 1 FROM public.producto_b2b_oferta_map AS m
        WHERE m.oferta_id = a.offer_id
          AND m.provider_code = 'forpromotional'
      )
  ) THEN
    RAISE EXCEPTION 'candidate has externally-resolved absences whose public mappings still exist';
  END IF;

  SELECT count(*)::integer INTO v_stage_count
  FROM public.forpromotional_atomic_cost_shadow
  WHERE candidate_id = p_candidate_id;
  IF v_stage_count = 0 THEN
    RAISE EXCEPTION 'candidate contains no staged API costs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cost_shadow AS s
    LEFT JOIN public.forpromotional_atomic_variant_shadow AS v
      ON v.candidate_id = s.candidate_id
     AND v.variant_key = s.variant_sku
     AND v.offer_id = s.offer_id
     AND v.scale_id = s.scale_id
     AND v.stock_id = s.stock_id
     AND v.product_id = s.product_id
     AND v.publication_state = 'publishable'
    WHERE s.candidate_id = p_candidate_id
      AND v.id IS NULL
  ) THEN
    RAISE EXCEPTION 'publishable cost staging is not backed by exact variant evidence';
  END IF;

  SELECT count(*)::integer INTO v_expected_count
  FROM (
    SELECT DISTINCT m.oferta_id
    FROM public.producto_b2b_oferta_map AS m
    JOIN public.producto_proveedor_ofertas AS o ON o.id = m.oferta_id
    JOIN public.provider_raw_products AS raw ON raw.id = o.provider_raw_product_id
    JOIN public.forpromotional_atomic_variant_shadow AS v
      ON v.candidate_id = p_candidate_id
     AND v.provider_sku = upper(raw.provider_sku)
     AND v.variant_sku = o.variant_sku
     AND v.publication_state = 'publishable'
    JOIN public.producto_precio_escalas AS s
      ON s.oferta_id = o.id AND s.proveedor_id = v_candidate.provider_id
    JOIN public.producto_proveedor_stock AS st
      ON st.oferta_id = o.id AND st.proveedor_id = v_candidate.provider_id
    JOIN public.catalog_price_cache_v2_shadow AS base
      ON base.product_id = m.producto_b2b_id
     AND base.generation_id = v_candidate.base_generation_id
    WHERE m.provider_code = 'forpromotional'
      AND o.proveedor_id = v_candidate.provider_id
      AND o.activo = true
  ) AS eligible;
  IF v_expected_count <> v_stage_count THEN
    RAISE EXCEPTION 'candidate coverage mismatch: staged %, eligible %', v_stage_count, v_expected_count;
  END IF;

  -- Every currently published ForPromotional offer must either be staged from
  -- an exact API match or have an explicit retain-current decision. Nothing is
  -- silently unpublished and no potentially stale price is retained by default.
  IF EXISTS (
    SELECT 1
    FROM public.producto_b2b_oferta_map AS m
    JOIN public.producto_proveedor_ofertas AS o ON o.id = m.oferta_id
    JOIN public.catalog_price_cache_v2_shadow AS base
      ON base.product_id = m.producto_b2b_id
     AND base.generation_id = v_candidate.base_generation_id
    LEFT JOIN public.forpromotional_atomic_cost_shadow AS s
      ON s.candidate_id = p_candidate_id
     AND s.offer_id = o.id
     AND s.product_id = m.producto_b2b_id
    LEFT JOIN public.forpromotional_atomic_local_absences AS a
      ON a.candidate_id = p_candidate_id
     AND a.offer_id = o.id
    WHERE m.provider_code = 'forpromotional'
      AND o.proveedor_id = v_candidate.provider_id
      AND o.activo = true
      AND s.id IS NULL
      AND COALESCE(a.resolution_status, 'pending') <> 'retain_current'
  ) THEN
    RAISE EXCEPTION 'candidate leaves a public ForPromotional offer without API evidence or retain-current decision';
  END IF;

  SELECT count(*)::integer INTO v_ambiguous_count
  FROM (
    SELECT m.producto_b2b_id
    FROM public.producto_b2b_oferta_map AS m
    JOIN public.producto_proveedor_ofertas AS o ON o.id = m.oferta_id
    JOIN public.catalog_price_cache_v2_shadow AS base
      ON base.product_id = m.producto_b2b_id
     AND base.generation_id = v_candidate.base_generation_id
    WHERE m.provider_code = 'forpromotional'
      AND o.proveedor_id = v_candidate.provider_id
      AND o.activo = true
    GROUP BY m.producto_b2b_id
    HAVING count(DISTINCT m.oferta_id) <> 1
  ) AS ambiguous;
  IF v_ambiguous_count > 0 THEN
    RAISE EXCEPTION 'candidate has % products with ambiguous active offers', v_ambiguous_count;
  END IF;

  IF EXISTS (
    SELECT product_id
    FROM public.forpromotional_atomic_cost_shadow
    WHERE candidate_id = p_candidate_id
    GROUP BY product_id
    HAVING count(DISTINCT offer_id) <> 1
  ) THEN
    RAISE EXCEPTION 'candidate has more than one active ForPromotional offer per public product';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_cost_shadow AS s
    WHERE s.candidate_id = p_candidate_id
      AND (s.source_field <> 'forpromotional.api.precio_desc'
        OR s.factor <> 1.0000 OR s.unit_cost <= 0 OR s.supplier_moq < 1
        OR s.stock_qty < 0 OR s.stock_status NOT IN ('disponible','bajo','agotado'))
  ) THEN
    RAISE EXCEPTION 'candidate contains invalid precio_desc, factor, MOQ or stock';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_cost_shadow AS s
    LEFT JOIN public.producto_b2b_oferta_map AS m
      ON m.oferta_id = s.offer_id AND m.producto_b2b_id = s.product_id
     AND m.provider_code = 'forpromotional'
    WHERE s.candidate_id = p_candidate_id AND m.oferta_id IS NULL
  ) THEN
    RAISE EXCEPTION 'candidate contains a staged offer without exact public mapping';
  END IF;

  SELECT count(*)::integer INTO v_overlap_count
  FROM public.forpromotional_atomic_cost_shadow AS s
  JOIN public.producto_b2b_oferta_map AS m
    ON m.producto_b2b_id = s.product_id
   AND m.provider_code IN ('g4_mx','cdo_mx')
  WHERE s.candidate_id = p_candidate_id;
  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'candidate overlaps % certified G4/CDO mappings', v_overlap_count;
  END IF;

  IF EXISTS (
    (
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.base_generation_id
        AND product_id NOT IN (SELECT product_id FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id)
      EXCEPT
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.catalog_generation_id
        AND product_id NOT IN (SELECT product_id FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id)
    )
    UNION ALL
    (
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.catalog_generation_id
        AND product_id NOT IN (SELECT product_id FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id)
      EXCEPT
      SELECT product_id, public_price_status, price_before_tax_mxn, currency,
             minimum_quantity, calculation_version
      FROM public.catalog_price_cache_v2_shadow
      WHERE generation_id = v_candidate.base_generation_id
        AND product_id NOT IN (SELECT product_id FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id)
    )
  ) THEN
    RAISE EXCEPTION 'candidate generation differs outside staged ForPromotional products';
  END IF;

  FOR v_product_id, v_cost IN
    SELECT product_id, max(unit_cost)
    FROM public.forpromotional_atomic_cost_shadow
    WHERE candidate_id = p_candidate_id
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    SELECT GREATEST(max(s.supplier_moq), CEIL(4000 / (max(s.unit_cost) * (74.52 / 57.38)))::integer)
    INTO v_qmin
    FROM public.forpromotional_atomic_cost_shadow AS s
    WHERE s.candidate_id = p_candidate_id AND s.product_id = v_product_id;

    v_probe_q := v_qmin;
    WHILE v_probe_q <= 1000000 LOOP
      v_probe_price := public.forpromotional_curve_price_v1(v_cost, v_probe_q, v_qmin);
      EXIT WHEN v_probe_price IS NOT NULL AND ROUND(v_probe_q * v_probe_price, 2) >= 4000;
      v_probe_q := v_probe_q + 1;
    END LOOP;
    IF v_probe_q > 1000000 THEN
      RAISE EXCEPTION 'no eligible quantity reaches $4,000 for product %', v_product_id;
    END IF;
    v_qmin := v_probe_q;
    v_qmin_price := public.forpromotional_curve_price_v1(v_cost, v_qmin, v_qmin);
    IF v_qmin_price IS NULL OR ROUND(v_qmin * v_qmin_price, 2) < 4000 THEN
      RAISE EXCEPTION 'invalid candidate price at qmin for product %', v_product_id;
    END IF;

    v_previous_price := NULL;
    v_previous_total := NULL;
    FOREACH v_probe_q IN ARRAY v_probe_quantities LOOP
      IF v_probe_q < v_qmin THEN CONTINUE; END IF;
      v_probe_price := public.forpromotional_curve_price_v1(v_cost, v_probe_q, v_qmin);
      IF v_probe_price IS NULL THEN
        RAISE EXCEPTION 'curve returned NULL at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      v_probe_total := ROUND(v_probe_q * v_probe_price, 2);
      IF v_previous_price IS NOT NULL AND v_probe_price > v_previous_price THEN
        RAISE EXCEPTION 'unit price increased at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      IF v_previous_total IS NOT NULL AND v_probe_total < v_previous_total THEN
        RAISE EXCEPTION 'order total decreased at quantity % for product %', v_probe_q, v_product_id;
      END IF;
      v_previous_price := v_probe_price;
      v_previous_total := v_probe_total;
    END LOOP;

    UPDATE public.catalog_price_cache_v2_shadow AS c
    SET public_price_status = 'priced',
        price_before_tax_mxn = v_qmin_price,
        currency = 'MXN',
        minimum_quantity = v_qmin,
        calculation_version = 'forpromotional-atomic-v1',
        computed_at = now(), updated_at = now()
    WHERE c.generation_id = v_candidate.catalog_generation_id
      AND c.product_id = v_product_id;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'candidate generation row missing for product %', v_product_id;
    END IF;
  END LOOP;

  UPDATE public.catalog_price_cache_v2_generations
  SET status = 'certified', processed_count = candidate_count,
      priced_count = (SELECT count(*) FROM public.catalog_price_cache_v2_shadow
                      WHERE generation_id = v_candidate.catalog_generation_id AND public_price_status = 'priced'),
      completed_at = now(), updated_at = now()
  WHERE id = v_candidate.catalog_generation_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'candidate generation is not running'; END IF;

  v_report := jsonb_build_object(
    'candidate_id', p_candidate_id,
    'api_records', v_candidate.api_record_count,
    'unique_variants', v_candidate.api_unique_variant_count,
    'duplicate_records', v_candidate.api_duplicate_record_count,
    'source_fingerprint', v_candidate.api_source_fingerprint,
    'staged_rows', v_stage_count,
    'unpublished_variants', (
      SELECT count(*) FROM public.forpromotional_atomic_variant_shadow
      WHERE candidate_id = p_candidate_id
        AND publication_state IN ('unpublished','api_only')
    ),
    'absent_local_offers', v_absent_count,
    'public_absent_offers', v_public_absent_count,
    'pending_public_decisions', v_pending_public_count,
    'exceptions', 0,
    'factor', 1.0000,
    'cost_source', 'forpromotional.api.precio_desc',
    'minimum_sale_mxn', 4000,
    'g4_cdo_changed', false,
    'monotonicity', 'sampled_control_quantities; local consecutive gate required'
  );
  UPDATE public.forpromotional_atomic_candidates
  SET status = 'certified', certified_at = now(), validation_report = validation_report || v_report,
      updated_at = now()
  WHERE id = p_candidate_id AND status = 'building';
  RETURN v_report;
END
$cycle_certify$;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_cycle_activate_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cycle_activate$
DECLARE
  v_candidate record;
  v_current_release record;
  v_current_count integer;
  v_provider_id uuid;
  v_scale_count integer;
  v_stock_count integer;
  v_rule record;
  v_flag record;
  v_published_by uuid;
  v_new_release_id uuid := gen_random_uuid();
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'service_role required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_cycle_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  SELECT * INTO v_candidate
  FROM public.forpromotional_atomic_candidates
  WHERE id = p_candidate_id AND status = 'certified'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'certified automatic candidate not found'; END IF;

  SELECT count(*)::integer INTO v_current_count
  FROM public.catalog_price_v2_releases WHERE is_current = true;
  IF v_current_count <> 1 THEN RAISE EXCEPTION 'exactly one current release is required'; END IF;
  SELECT r.*, g.rule_set_id INTO v_current_release
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current = true FOR UPDATE OF r, g;
  IF v_current_release.generation_id IS DISTINCT FROM v_candidate.base_generation_id THEN
    RAISE EXCEPTION 'current release advanced after candidate preparation';
  END IF;
  IF v_current_release.rule_set_id IS DISTINCT FROM v_candidate.rule_set_id THEN
    RAISE EXCEPTION 'current rule set changed after candidate preparation';
  END IF;

  SELECT p.id INTO v_provider_id FROM public.proveedores AS p WHERE p.code = 'forpromotional';
  IF v_provider_id IS DISTINCT FROM v_candidate.provider_id THEN RAISE EXCEPTION 'provider mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'catalog-stock-refresh-forpromotional'
      AND active
      AND position('/run-forpromotional-atomic-cycle-v1' IN command) = 0
  ) THEN
    RAISE EXCEPTION 'an active ForPromotional cron is not the approved automatic-cycle route';
  END IF;
  IF to_regclass('public.stock_refresh_locks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.stock_refresh_locks WHERE scope = 'forpromotional' AND locked_until > now()
  ) THEN RAISE EXCEPTION 'ForPromotional refresh lock is active'; END IF;
  IF EXISTS (SELECT 1 FROM public.provider_import_batches WHERE proveedor_id = v_provider_id AND status = 'running') THEN
    RAISE EXCEPTION 'ForPromotional import batch is running';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_local_absences
    WHERE candidate_id = p_candidate_id
      AND public_mapping_count > 0
      AND resolution_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'public API-absence decisions changed or remain pending after certification';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cost_shadow AS s
    LEFT JOIN public.producto_b2b_oferta_map AS fp
      ON fp.oferta_id = s.offer_id
     AND fp.producto_b2b_id = s.product_id
     AND fp.provider_code = 'forpromotional'
    WHERE s.candidate_id = p_candidate_id
      AND fp.oferta_id IS NULL
  ) THEN
    RAISE EXCEPTION 'a certified ForPromotional mapping changed before activation';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.forpromotional_atomic_cost_shadow AS s
    JOIN public.producto_b2b_oferta_map AS other
      ON other.producto_b2b_id = s.product_id
     AND other.provider_code IN ('g4_mx','cdo_mx')
    WHERE s.candidate_id = p_candidate_id
  ) THEN
    RAISE EXCEPTION 'G4/CDO overlap appeared after certification';
  END IF;

  SELECT * INTO v_rule FROM public.provider_pricing_rules
  WHERE rule_set_id = v_candidate.rule_set_id AND provider_code = 'forpromotional';
  IF NOT FOUND OR v_rule.cost_factor IS NULL
     OR v_rule.cost_factor NOT IN (1.0000, 1.0300) THEN
    RAISE EXCEPTION 'unexpected ForPromotional factor';
  END IF;
  SELECT * INTO v_flag FROM public.pricing_policy_flags
  WHERE policy_key = 'forpromotional_continuous_v1' FOR UPDATE;
  IF NOT FOUND OR v_flag.enabled IS NULL
     OR NOT ((v_rule.cost_factor = 1.0300 AND v_flag.enabled = false)
             OR (v_rule.cost_factor = 1.0000 AND v_flag.enabled = true)) THEN
    RAISE EXCEPTION 'factor and policy flag are not a supported transition state';
  END IF;

  IF EXISTS (SELECT 1 FROM public.forpromotional_atomic_restore_meta WHERE candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'candidate restore metadata already exists';
  END IF;
  INSERT INTO public.forpromotional_atomic_restore_meta (
    candidate_id, old_release_id, old_generation_id, old_factor, old_rule_notes,
    old_policy_enabled, old_policy_version, old_release_row, old_rule_row,
    old_policy_row
  ) VALUES (
    p_candidate_id, v_current_release.id, v_current_release.generation_id,
    v_rule.cost_factor, v_rule.notes, v_flag.enabled, v_flag.policy_version,
    to_jsonb(v_current_release) - 'rule_set_id', to_jsonb(v_rule), to_jsonb(v_flag)
  );
  INSERT INTO public.forpromotional_atomic_restore_rows (
    candidate_id, scale_id, old_unit_cost, old_currency, old_source_field,
    stock_id, old_stock_qty, old_stock_status, old_scale_row, old_stock_row
  )
  SELECT p_candidate_id, s.scale_id, live_scale.unit_cost, live_scale.currency, live_scale.source_field,
         s.stock_id, live_stock.cantidad, live_stock.disponibilidad,
         to_jsonb(live_scale), to_jsonb(live_stock)
  FROM public.forpromotional_atomic_cost_shadow AS s
  JOIN public.producto_precio_escalas AS live_scale ON live_scale.id = s.scale_id
  JOIN public.producto_proveedor_stock AS live_stock ON live_stock.id = s.stock_id
  WHERE s.candidate_id = p_candidate_id;

  IF (SELECT count(*) FROM public.forpromotional_atomic_restore_rows WHERE candidate_id = p_candidate_id)
     <> (SELECT count(*) FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'restore snapshot is incomplete';
  END IF;

  UPDATE public.producto_precio_escalas AS live
  SET unit_cost = staged.unit_cost, currency = staged.currency,
      source_field = staged.source_field, updated_at = now()
  FROM public.forpromotional_atomic_cost_shadow AS staged
  WHERE staged.candidate_id = p_candidate_id AND live.id = staged.scale_id
    AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_scale_count = ROW_COUNT;
  IF v_scale_count <> (SELECT count(*) FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'atomic scale update count mismatch';
  END IF;

  UPDATE public.producto_proveedor_stock AS live
  SET cantidad = staged.stock_qty, disponibilidad = staged.stock_status, updated_at = now()
  FROM public.forpromotional_atomic_cost_shadow AS staged
  WHERE staged.candidate_id = p_candidate_id AND live.id = staged.stock_id
    AND live.proveedor_id = v_provider_id;
  GET DIAGNOSTICS v_stock_count = ROW_COUNT;
  IF v_stock_count <> (SELECT count(*) FROM public.forpromotional_atomic_cost_shadow WHERE candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'atomic stock update count mismatch';
  END IF;

  UPDATE public.provider_pricing_rules
  SET cost_factor = 1.0000,
      notes = 'ForPromotional API precio_desc; factor 1.0000; automatic atomic cycle',
      updated_at = now()
  WHERE rule_set_id = v_candidate.rule_set_id AND provider_code = 'forpromotional';
  UPDATE public.pricing_policy_flags
  SET enabled = true, policy_version = v_candidate.policy_version, updated_at = now()
  WHERE policy_key = 'forpromotional_continuous_v1';

  v_published_by := v_current_release.published_by;
  IF v_published_by IS NULL THEN
    SELECT (e.value->>'published_by')::uuid INTO v_published_by
    FROM public.pe_forpromotional_activation_backup_v1 AS b,
         jsonb_array_elements(b.release_rows) AS e(value)
    WHERE b.backup_key = 'current' AND COALESCE((e.value->>'is_current')::boolean, false)
    LIMIT 1;
  END IF;
  IF v_published_by IS NULL THEN RAISE EXCEPTION 'publication actor is missing'; END IF;

  UPDATE public.catalog_price_v2_releases
  SET is_current = false, superseded_at = now(), superseded_by = v_new_release_id, updated_at = now()
  WHERE id = v_current_release.id AND is_current;
  IF NOT FOUND THEN RAISE EXCEPTION 'current release could not be retired'; END IF;
  INSERT INTO public.catalog_price_v2_releases (
    id, generation_id, is_current, published_at, published_by, created_at, updated_at
  ) VALUES (v_new_release_id, v_candidate.catalog_generation_id, true, now(), v_published_by, now(), now());

  UPDATE public.forpromotional_atomic_candidates
  SET status = 'active', activated_at = now(), updated_at = now()
  WHERE id = p_candidate_id AND status = 'certified';
  IF NOT FOUND THEN RAISE EXCEPTION 'candidate status changed during activation'; END IF;

  RETURN jsonb_build_object('ok', true, 'candidate_id', p_candidate_id,
    'release_id', v_new_release_id, 'generation_id', v_candidate.catalog_generation_id,
    'factor', 1.0000, 'policy_enabled', true);
END
$cycle_activate$;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_cycle_rollback_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cycle_rollback$
DECLARE
  v_candidate record;
  v_meta record;
  v_current_release record;
  v_restored integer;
  v_expected integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'service_role required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_cycle_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));
  SELECT * INTO v_candidate FROM public.forpromotional_atomic_candidates
  WHERE id = p_candidate_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active automatic candidate not found'; END IF;
  SELECT * INTO v_meta FROM public.forpromotional_atomic_restore_meta WHERE candidate_id = p_candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'automatic rollback metadata is missing'; END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'catalog-stock-refresh-forpromotional' AND active) THEN
    RAISE EXCEPTION 'pause the automatic cron before rollback';
  END IF;
  IF to_regclass('public.stock_refresh_locks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.stock_refresh_locks
    WHERE scope = 'forpromotional' AND locked_until > now()
  ) THEN
    RAISE EXCEPTION 'ForPromotional refresh lock is active';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.provider_import_batches
    WHERE proveedor_id = v_candidate.provider_id AND status = 'running'
  ) THEN
    RAISE EXCEPTION 'ForPromotional import batch is running';
  END IF;
  SELECT * INTO v_current_release FROM public.catalog_price_v2_releases
  WHERE generation_id = v_candidate.catalog_generation_id AND is_current FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'candidate release is not current'; END IF;

  IF v_meta.old_release_row IS NULL OR v_meta.old_rule_row IS NULL
     OR v_meta.old_policy_row IS NULL THEN
    RAISE EXCEPTION 'exact candidate restore metadata is incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_restore_rows
    WHERE candidate_id = p_candidate_id
      AND (old_scale_row IS NULL OR old_stock_row IS NULL)
  ) THEN
    RAISE EXCEPTION 'exact candidate restore rows are incomplete';
  END IF;

  SELECT count(*)::integer INTO v_expected
  FROM public.forpromotional_atomic_restore_rows
  WHERE candidate_id = p_candidate_id;

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
    SELECT (jsonb_populate_record(NULL::public.producto_precio_escalas, r.old_scale_row)).*
    FROM public.forpromotional_atomic_restore_rows AS r
    WHERE r.candidate_id = p_candidate_id
  ) AS saved
  WHERE live.id = saved.id AND live.proveedor_id = v_candidate.provider_id;
  GET DIAGNOSTICS v_restored = ROW_COUNT;
  IF v_restored <> v_expected THEN
    RAISE EXCEPTION 'exact scale rollback count mismatch: %/%', v_restored, v_expected;
  END IF;

  UPDATE public.producto_proveedor_stock AS live
  SET oferta_id = saved.oferta_id,
      proveedor_id = saved.proveedor_id,
      cantidad = saved.cantidad,
      disponibilidad = saved.disponibilidad,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.producto_proveedor_stock, r.old_stock_row)).*
    FROM public.forpromotional_atomic_restore_rows AS r
    WHERE r.candidate_id = p_candidate_id
  ) AS saved
  WHERE live.id = saved.id AND live.proveedor_id = v_candidate.provider_id;
  GET DIAGNOSTICS v_restored = ROW_COUNT;
  IF v_restored <> v_expected THEN
    RAISE EXCEPTION 'exact stock rollback count mismatch: %/%', v_restored, v_expected;
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
    SELECT (jsonb_populate_record(NULL::public.provider_pricing_rules, v_meta.old_rule_row)).*
  ) AS saved
  WHERE live.id = saved.id
    AND live.rule_set_id = v_candidate.rule_set_id
    AND live.provider_code = 'forpromotional';
  IF NOT FOUND THEN RAISE EXCEPTION 'exact ForPromotional rule rollback failed'; END IF;

  UPDATE public.pricing_policy_flags AS live
  SET enabled = saved.enabled,
      policy_version = saved.policy_version,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.pricing_policy_flags, v_meta.old_policy_row)).*
  ) AS saved
  WHERE live.policy_key = saved.policy_key
    AND live.policy_key = 'forpromotional_continuous_v1';
  IF NOT FOUND THEN RAISE EXCEPTION 'exact policy rollback failed'; END IF;

  UPDATE public.catalog_price_v2_releases
  SET is_current = false, superseded_at = now(), superseded_by = v_meta.old_release_id, updated_at = now()
  WHERE id = v_current_release.id AND is_current;
  UPDATE public.catalog_price_v2_releases AS live
  SET generation_id = saved.generation_id,
      is_current = saved.is_current,
      published_at = saved.published_at,
      published_by = saved.published_by,
      superseded_at = saved.superseded_at,
      superseded_by = saved.superseded_by,
      created_at = saved.created_at,
      updated_at = saved.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.catalog_price_v2_releases, v_meta.old_release_row)).*
  ) AS saved
  WHERE live.id = saved.id AND live.id = v_meta.old_release_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'previous release is missing'; END IF;
  UPDATE public.forpromotional_atomic_candidates
  SET status = 'rolled_back', rolled_back_at = now(), updated_at = now()
  WHERE id = p_candidate_id;
  UPDATE public.forpromotional_atomic_cycle_state
  SET status = 'idle', updated_at = now() WHERE provider_code = 'forpromotional';
  RETURN jsonb_build_object('ok', true, 'candidate_id', p_candidate_id,
    'restored_release_id', v_meta.old_release_id, 'factor', v_meta.old_factor,
    'policy_enabled', v_meta.old_policy_enabled);
END
$cycle_rollback$;

REVOKE ALL ON FUNCTION public.pe_forpromotional_cycle_begin_v1(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pe_forpromotional_cycle_finish_v1(uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pe_forpromotional_cycle_certify_v1(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pe_forpromotional_cycle_activate_v1(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pe_forpromotional_cycle_rollback_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_cycle_begin_v1(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_cycle_finish_v1(uuid, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_cycle_certify_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_cycle_activate_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_cycle_rollback_v1(uuid) TO service_role;

COMMIT;

SELECT provider_code, automatic_enabled, status, last_attempt_at,
       last_success_at, last_failure_at, last_error
FROM public.forpromotional_atomic_cycle_state
WHERE provider_code = 'forpromotional';
