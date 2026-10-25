-- PE ForPromotional V2 reconciliation patch.
-- Adds private, candidate-scoped API inventory and local-absence evidence.
-- It does not change public mappings, live costs, stock, releases, flags or cron.

BEGIN;

ALTER TABLE public.forpromotional_atomic_candidates
  ADD COLUMN IF NOT EXISTS api_record_count integer,
  ADD COLUMN IF NOT EXISTS api_unique_variant_count integer,
  ADD COLUMN IF NOT EXISTS api_duplicate_record_count integer,
  ADD COLUMN IF NOT EXISTS api_source_fingerprint text;

ALTER TABLE public.forpromotional_atomic_candidates
  DROP CONSTRAINT IF EXISTS forpromotional_atomic_candidates_api_counts_check;
ALTER TABLE public.forpromotional_atomic_candidates
  ADD CONSTRAINT forpromotional_atomic_candidates_api_counts_check CHECK (
    (api_record_count IS NULL AND api_unique_variant_count IS NULL
      AND api_duplicate_record_count IS NULL AND api_source_fingerprint IS NULL)
    OR
    (api_record_count >= 0 AND api_unique_variant_count >= 0
      AND api_duplicate_record_count >= 0
      AND api_record_count = api_unique_variant_count + api_duplicate_record_count
      AND nullif(api_source_fingerprint, '') IS NOT NULL)
  );

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_variant_shadow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.forpromotional_atomic_candidates(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  variant_key text NOT NULL,
  provider_sku text NOT NULL,
  variant_sku text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}'::text[],
  subcategories text[] NOT NULL DEFAULT '{}'::text[],
  api_occurrences integer NOT NULL DEFAULT 1,
  unit_cost numeric,
  stock_qty integer,
  stock_status text,
  commercial_mode text,
  source_field text,
  publication_state text NOT NULL,
  offer_id uuid REFERENCES public.producto_proveedor_ofertas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  scale_id uuid REFERENCES public.producto_precio_escalas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  stock_id uuid REFERENCES public.producto_proveedor_stock(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  product_id uuid REFERENCES public.productos_b2b(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  control_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  api_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_variant_shadow_key UNIQUE (candidate_id, variant_key),
  CONSTRAINT forpromotional_atomic_variant_shadow_occurrences_check CHECK (api_occurrences >= 1),
  CONSTRAINT forpromotional_atomic_variant_shadow_state_check CHECK (
    publication_state IN ('publishable','unpublished','api_only','ambiguous','invalid')
  ),
  CONSTRAINT forpromotional_atomic_variant_shadow_stock_check CHECK (stock_qty IS NULL OR stock_qty >= 0),
  CONSTRAINT forpromotional_atomic_variant_shadow_status_check CHECK (
    stock_status IS NULL OR stock_status IN ('disponible','bajo','agotado')
  ),
  CONSTRAINT forpromotional_atomic_variant_shadow_publishable_check CHECK (
    publication_state <> 'publishable'
    OR (offer_id IS NOT NULL AND scale_id IS NOT NULL AND stock_id IS NOT NULL
        AND product_id IS NOT NULL AND unit_cost > 0 AND stock_qty >= 0
        AND source_field = 'forpromotional.api.precio_desc')
  )
);

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_local_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.forpromotional_atomic_candidates(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  offer_id uuid NOT NULL REFERENCES public.producto_proveedor_ofertas(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  provider_sku text NOT NULL,
  variant_sku text NOT NULL,
  base_sku_absent boolean NOT NULL,
  public_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  public_mapping_count integer NOT NULL DEFAULT 0,
  resolution_status text NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_local_absences_key UNIQUE (candidate_id, offer_id),
  CONSTRAINT forpromotional_atomic_local_absences_mapping_count_check CHECK (public_mapping_count >= 0),
  CONSTRAINT forpromotional_atomic_local_absences_resolution_check CHECK (
    resolution_status IN ('pending','retain_current','resolved_externally')
  ),
  CONSTRAINT forpromotional_atomic_local_absences_decision_check CHECK (
    (resolution_status = 'pending' AND decision_reason IS NULL
      AND decided_by IS NULL AND decided_at IS NULL)
    OR
    (resolution_status <> 'pending' AND nullif(trim(decision_reason), '') IS NOT NULL
      AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

-- Candidate-scoped restore data is the rollback authority for an activation.
-- The original package backup remains historical and is never overwritten.
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

ALTER TABLE public.forpromotional_atomic_variant_shadow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_local_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_restore_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_restore_rows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.forpromotional_atomic_variant_shadow FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_local_absences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_restore_meta FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_restore_rows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_variant_shadow TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_local_absences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_restore_meta TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_restore_rows TO service_role;

CREATE OR REPLACE FUNCTION public.pe_forpromotional_reconcile_candidate_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $reconcile$
DECLARE
  v_candidate record;
  v_absent_variants integer;
  v_absent_base_skus integer;
  v_variants_with_base_present integer;
  v_public_links integer;
  v_public_offers integer;
  v_report jsonb;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'service_role required';
  END IF;

  SELECT c.* INTO v_candidate
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.id = p_candidate_id AND c.status = 'building'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'building ForPromotional candidate not found';
  END IF;

  DELETE FROM public.forpromotional_atomic_local_absences
  WHERE candidate_id = p_candidate_id
    AND resolution_status = 'pending';

  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_local_absences
    WHERE candidate_id = p_candidate_id AND resolution_status <> 'pending'
  ) THEN
    RAISE EXCEPTION 'candidate reconciliation cannot replace documented commercial decisions';
  END IF;

  INSERT INTO public.forpromotional_atomic_local_absences (
    candidate_id, offer_id, provider_sku, variant_sku, base_sku_absent,
    public_product_ids, public_mapping_count
  )
  SELECT
    p_candidate_id,
    o.id,
    upper(r.provider_sku),
    o.variant_sku,
    NOT EXISTS (
      SELECT 1
      FROM public.forpromotional_atomic_variant_shadow AS v
      WHERE v.candidate_id = p_candidate_id
        AND v.provider_sku = upper(r.provider_sku)
    ),
    COALESCE(
      array_agg(DISTINCT m.producto_b2b_id)
        FILTER (WHERE m.producto_b2b_id IS NOT NULL),
      '{}'::uuid[]
    ),
    count(DISTINCT m.producto_b2b_id)::integer
  FROM public.producto_proveedor_ofertas AS o
  JOIN public.provider_raw_products AS r
    ON r.id = o.provider_raw_product_id
   AND r.proveedor_id = v_candidate.provider_id
  LEFT JOIN public.producto_b2b_oferta_map AS m
    ON m.oferta_id = o.id
   AND m.provider_code = 'forpromotional'
  WHERE o.proveedor_id = v_candidate.provider_id
    AND o.activo = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.forpromotional_atomic_variant_shadow AS v
      WHERE v.candidate_id = p_candidate_id
        AND v.provider_sku = upper(r.provider_sku)
        AND v.variant_sku = o.variant_sku
    )
  GROUP BY o.id, r.provider_sku, o.variant_sku;

  SELECT count(*)::integer,
         count(DISTINCT provider_sku)
           FILTER (WHERE base_sku_absent)::integer,
         count(*) FILTER (WHERE NOT base_sku_absent)::integer,
         COALESCE(sum(public_mapping_count), 0)::integer,
         count(*) FILTER (WHERE public_mapping_count > 0)::integer
  INTO v_absent_variants, v_absent_base_skus, v_variants_with_base_present,
       v_public_links, v_public_offers
  FROM public.forpromotional_atomic_local_absences
  WHERE candidate_id = p_candidate_id;

  v_report := jsonb_build_object(
    'absent_local_variants', v_absent_variants,
    'distinct_absent_base_skus', v_absent_base_skus,
    'variants_with_base_present', v_variants_with_base_present,
    'base_and_variant_absence_same_set', v_variants_with_base_present = 0,
    'affected_public_links', v_public_links,
    'affected_public_offers', v_public_offers,
    'pending_public_decisions', v_public_offers
  );

  UPDATE public.forpromotional_atomic_candidates
  SET validation_report = jsonb_set(
        COALESCE(validation_report, '{}'::jsonb),
        '{reconciliation}', v_report, true
      ),
      updated_at = now()
  WHERE id = p_candidate_id;

  RETURN v_report;
END
$reconcile$;

REVOKE ALL ON FUNCTION public.pe_forpromotional_reconcile_candidate_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pe_forpromotional_reconcile_candidate_v1(uuid)
  TO service_role;

COMMENT ON TABLE public.forpromotional_atomic_variant_shadow IS
  'Complete private API inventory, one row per unique ForPromotional variant and candidate.';
COMMENT ON TABLE public.forpromotional_atomic_local_absences IS
  'Local active ForPromotional offers absent from a candidate API inventory; public impacts require a documented decision.';

COMMIT;
