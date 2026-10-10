-- CHK-CATGOV-01 — BUILD 1 — SHADOW GOVERNANCE FOUNDATION (v1)
-- Structure only. Zero data. No runtime authority is modified.
-- No ON DELETE CASCADE toward runtime. No global UNIQUE on sha256.

-- 1. catalog_governance_state
CREATE TABLE public.catalog_governance_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_b2b_id uuid NOT NULL UNIQUE REFERENCES public.productos_b2b(id) ON DELETE RESTRICT,
  identity_status text NOT NULL DEFAULT 'NOT_REVIEWED' CHECK (identity_status IN ('NOT_REVIEWED','PASS','NEEDS_REVIEW','BLOCKED')),
  data_status text NOT NULL DEFAULT 'NOT_REVIEWED' CHECK (data_status IN ('NOT_REVIEWED','PASS','NEEDS_REVIEW','BLOCKED')),
  content_status text NOT NULL DEFAULT 'NOT_REVIEWED' CHECK (content_status IN ('NOT_REVIEWED','PASS','NEEDS_REVIEW','BLOCKED')),
  image_status text NOT NULL DEFAULT 'NOT_REVIEWED' CHECK (image_status IN ('NOT_REVIEWED','PASS','NEEDS_REVIEW','BLOCKED')),
  review_status text NOT NULL DEFAULT 'NOT_REVIEWED' CHECK (review_status IN ('NOT_REVIEWED','PASS','NEEDS_REVIEW','BLOCKED')),
  last_reviewed_at timestamptz,
  last_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. catalog_source_documents
CREATE TABLE public.catalog_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK (source_type IN ('PDF','CSV','XLS','XLSX','JSON','API_SNAPSHOT','ZIP','WEB_SNAPSHOT','IMAGE_BANK','OTHER')),
  source_uri text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  source_version text,
  observed_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  supersedes_document_id uuid REFERENCES public.catalog_source_documents(id) ON DELETE RESTRICT,
  rights_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (rights_status IN ('UNKNOWN','PENDING','CLEARED','RESTRICTED','REJECTED')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (supersedes_document_id IS NULL OR supersedes_document_id <> id)
);
CREATE INDEX catalog_source_documents_sha256_idx ON public.catalog_source_documents (sha256);
CREATE INDEX catalog_source_documents_proveedor_idx ON public.catalog_source_documents (proveedor_id);

-- 3. catalog_source_evidence
CREATE TABLE public.catalog_source_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.catalog_source_documents(id) ON DELETE RESTRICT,
  subject_type text NOT NULL CHECK (subject_type IN ('MODEL','PRODUCT','VARIANT','OFFER','ATTRIBUTE','CONTENT','ASSET')),
  subject_id uuid NOT NULL,
  field_path text,
  page_number integer CHECK (page_number IS NULL OR page_number > 0),
  locator text,
  raw_value text,
  evidence_excerpt text,
  reference_uri text,
  observed_at timestamptz,
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status text NOT NULL DEFAULT 'OBSERVED' CHECK (status IN ('OBSERVED','EXTRACTED','NORMALIZED','HUMAN_REVIEW_REQUIRED','APPROVED','REJECTED','NEEDS_REVIEW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_source_evidence_subject_idx ON public.catalog_source_evidence (subject_type, subject_id);
CREATE INDEX catalog_source_evidence_document_idx ON public.catalog_source_evidence (source_document_id);

-- 4. catalog_attribute_definitions
CREATE TABLE public.catalog_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  label text NOT NULL,
  family_scope text,
  data_type text NOT NULL CHECK (data_type IN ('TEXT','NUMBER','BOOLEAN','ENUM','DIMENSION','JSON')),
  unit_type text NOT NULL DEFAULT 'NONE' CHECK (unit_type IN ('NONE','MM','CM','ML','L','G','KG','OTHER')),
  is_required boolean NOT NULL DEFAULT false,
  validation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);
CREATE UNIQUE INDEX catalog_attribute_definitions_one_active_per_key ON public.catalog_attribute_definitions (key) WHERE active;
CREATE INDEX catalog_attribute_definitions_family_idx ON public.catalog_attribute_definitions (family_scope) WHERE active;

-- 5. catalog_attribute_values
CREATE TABLE public.catalog_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('PRODUCT','MODEL','VARIANT','OFFER')),
  subject_id uuid NOT NULL,
  definition_id uuid NOT NULL REFERENCES public.catalog_attribute_definitions(id) ON DELETE RESTRICT,
  raw_value text,
  normalized_value jsonb,
  unit text,
  source_evidence_id uuid REFERENCES public.catalog_source_evidence(id) ON DELETE SET NULL,
  normalization_status text NOT NULL DEFAULT 'RAW' CHECK (normalization_status IN ('RAW','AUTO_EXTRACTED','AI_NORMALIZED','HUMAN_REVIEW_REQUIRED','APPROVED','REJECTED','SUPERSEDED')),
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  value_version integer NOT NULL DEFAULT 1 CHECK (value_version > 0),
  is_current boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id, definition_id, value_version)
);
CREATE UNIQUE INDEX catalog_attribute_values_one_current ON public.catalog_attribute_values (subject_type, subject_id, definition_id) WHERE is_current;

-- 7. catalog_product_models (before content/members/links that reference it)
CREATE TABLE public.catalog_product_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL UNIQUE,
  label text NOT NULL,
  family_key text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW_REQUIRED','APPROVED','REJECTED','ARCHIVED')),
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. catalog_product_content
CREATE TABLE public.catalog_product_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE RESTRICT,
  model_id uuid REFERENCES public.catalog_product_models(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_current boolean NOT NULL DEFAULT false,
  canonical_name text,
  short_description text,
  structured_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  technical_specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  available_colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','AI_SUGGESTED','HUMAN_REVIEW_REQUIRED','HUMAN_APPROVED','SUPERSEDED')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_content_exactly_one_target CHECK (num_nonnulls(producto_b2b_id, model_id) = 1)
);
CREATE UNIQUE INDEX catalog_product_content_product_version ON public.catalog_product_content (producto_b2b_id, version) WHERE producto_b2b_id IS NOT NULL;
CREATE UNIQUE INDEX catalog_product_content_model_version ON public.catalog_product_content (model_id, version) WHERE model_id IS NOT NULL;
CREATE UNIQUE INDEX catalog_product_content_current_product ON public.catalog_product_content (producto_b2b_id) WHERE is_current AND producto_b2b_id IS NOT NULL;
CREATE UNIQUE INDEX catalog_product_content_current_model ON public.catalog_product_content (model_id) WHERE is_current AND model_id IS NOT NULL;

-- 8. catalog_product_model_members
CREATE TABLE public.catalog_product_model_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.catalog_product_models(id) ON DELETE RESTRICT,
  producto_b2b_id uuid NOT NULL REFERENCES public.productos_b2b(id) ON DELETE RESTRICT,
  oferta_id uuid REFERENCES public.producto_proveedor_ofertas(id) ON DELETE SET NULL,
  variant_label text,
  membership_status text NOT NULL DEFAULT 'CANDIDATE' CHECK (membership_status IN ('CANDIDATE','CONFIRMED','REJECTED','REMOVED')),
  evidence_id uuid REFERENCES public.catalog_source_evidence(id) ON DELETE SET NULL,
  reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX catalog_model_members_active_product ON public.catalog_product_model_members (model_id, producto_b2b_id)
  WHERE oferta_id IS NULL AND membership_status IN ('CANDIDATE','CONFIRMED');
CREATE UNIQUE INDEX catalog_model_members_active_offer ON public.catalog_product_model_members (model_id, producto_b2b_id, oferta_id)
  WHERE oferta_id IS NOT NULL AND membership_status IN ('CANDIDATE','CONFIRMED');
CREATE INDEX catalog_model_members_product_idx ON public.catalog_product_model_members (producto_b2b_id);

-- 9. catalog_asset_registry
CREATE TABLE public.catalog_asset_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  source_document_id uuid REFERENCES public.catalog_source_documents(id) ON DELETE RESTRICT,
  source_uri text,
  original_filename text,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  mime_type text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  rights_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (rights_status IN ('UNKNOWN','PENDING','CLEARED','RESTRICTED','REJECTED')),
  identity_status text NOT NULL DEFAULT 'UNREVIEWED' CHECK (identity_status IN ('UNREVIEWED','MATCHED','AMBIGUOUS','REJECTED')),
  technical_status text NOT NULL DEFAULT 'UNREVIEWED' CHECK (technical_status IN ('UNREVIEWED','PASS','FAIL')),
  visual_status text NOT NULL DEFAULT 'UNREVIEWED' CHECK (visual_status IN ('UNREVIEWED','PASS','REVIEW_REQUIRED','FAIL')),
  approval_status text NOT NULL DEFAULT 'UNREVIEWED' CHECK (approval_status IN ('UNREVIEWED','CANDIDATE','APPROVED','REJECTED','PUBLIC_READY')),
  public_url text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_asset_registry_sha256_idx ON public.catalog_asset_registry (sha256);
CREATE INDEX catalog_asset_registry_proveedor_idx ON public.catalog_asset_registry (proveedor_id);

-- 10. catalog_product_asset_links
CREATE TABLE public.catalog_product_asset_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.catalog_asset_registry(id) ON DELETE RESTRICT,
  target_type text NOT NULL CHECK (target_type IN ('MODEL','PRODUCT','VARIANT','OFFER')),
  model_id uuid REFERENCES public.catalog_product_models(id) ON DELETE RESTRICT,
  producto_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE RESTRICT,
  oferta_id uuid REFERENCES public.producto_proveedor_ofertas(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('MASTER','VARIANT','ALT','DETAIL','LIFESTYLE')),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  link_status text NOT NULL DEFAULT 'CANDIDATE' CHECK (link_status IN ('CANDIDATE','LINKED','REVIEW_REQUIRED','REJECTED','PUBLIC_READY')),
  evidence_id uuid REFERENCES public.catalog_source_evidence(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_asset_links_exactly_one_typed_target CHECK (
    (target_type = 'MODEL'   AND model_id IS NOT NULL AND producto_b2b_id IS NULL AND oferta_id IS NULL) OR
    (target_type = 'PRODUCT' AND producto_b2b_id IS NOT NULL AND model_id IS NULL AND oferta_id IS NULL) OR
    (target_type IN ('VARIANT','OFFER') AND oferta_id IS NOT NULL AND model_id IS NULL AND producto_b2b_id IS NULL)
  )
);
CREATE UNIQUE INDEX catalog_asset_links_current_master_model ON public.catalog_product_asset_links (model_id)
  WHERE target_type = 'MODEL' AND role = 'MASTER' AND link_status IN ('LINKED','PUBLIC_READY');
CREATE UNIQUE INDEX catalog_asset_links_current_master_product ON public.catalog_product_asset_links (producto_b2b_id)
  WHERE target_type = 'PRODUCT' AND role = 'MASTER' AND link_status IN ('LINKED','PUBLIC_READY');
CREATE UNIQUE INDEX catalog_asset_links_current_master_offer ON public.catalog_product_asset_links (target_type, oferta_id)
  WHERE target_type IN ('VARIANT','OFFER') AND role = 'MASTER' AND link_status IN ('LINKED','PUBLIC_READY');
CREATE INDEX catalog_asset_links_asset_idx ON public.catalog_product_asset_links (asset_id);

-- 11. catalog_quality_issues
CREATE TABLE public.catalog_quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_code text NOT NULL CHECK (issue_code IN ('IDENTITY_AMBIGUOUS','SOURCE_CONFLICT','MISSING_ATTRIBUTE','MISSING_CONTENT','WRONG_MASTER','WRONG_VARIANT','VISUAL_INCONSISTENCY','RIGHTS_UNCONFIRMED','LOW_CONFIDENCE','OTHER')),
  severity text NOT NULL CHECK (severity IN ('INFO','WARN','BLOCKER')),
  subject_type text NOT NULL CHECK (subject_type IN ('MODEL','PRODUCT','VARIANT','OFFER','ATTRIBUTE','CONTENT','ASSET')),
  subject_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','WONT_FIX')),
  source_evidence_id uuid REFERENCES public.catalog_source_evidence(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX catalog_quality_issues_one_active ON public.catalog_quality_issues (subject_type, subject_id, issue_code)
  WHERE status IN ('OPEN','IN_REVIEW');

-- 12. catalog_approvals
CREATE TABLE public.catalog_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('MODEL','PRODUCT','VARIANT','OFFER','ATTRIBUTE','CONTENT','ASSET')),
  subject_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('IDENTITY','DATA','CONTENT','IMAGE','COMMERCIAL','RIGHTS')),
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED','REVOKED','SUPERSEDED')),
  version_ref text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  source_evidence_id uuid REFERENCES public.catalog_source_evidence(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX catalog_approvals_one_current ON public.catalog_approvals (subject_type, subject_id, scope) WHERE is_current;

-- 13. audit_events
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('USER','SERVICE','SYSTEM','AI')),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  checkpoint text,
  before_ref text,
  after_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_entity_idx ON public.audit_events (entity_type, entity_id);

-- GRANTS (minimum) + RLS (staff SELECT only, no DML for authenticated)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['catalog_governance_state','catalog_source_documents','catalog_source_evidence',
    'catalog_attribute_definitions','catalog_attribute_values','catalog_product_content','catalog_product_models',
    'catalog_product_model_members','catalog_asset_registry','catalog_product_asset_links','catalog_quality_issues',
    'catalog_approvals','audit_events']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Staff can read governance rows" ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;

-- READINESS (private, read-only, staff-only)
CREATE OR REPLACE FUNCTION public.catalog_governance_readiness_v1(p_producto_b2b_id uuid DEFAULT NULL)
RETURNS TABLE (
  producto_b2b_id uuid,
  identity_pass boolean,
  data_completeness_pass boolean,
  content_pass boolean,
  image_pass boolean,
  pricing_pass boolean,
  stock_public_eligibility_pass boolean,
  editorial_readiness text,
  blocking_issue_count integer,
  completeness_score numeric,
  evaluated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'catalog_governance_readiness_v1: staff only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH products AS (
    SELECT p.id FROM public.productos_b2b p
    WHERE p_producto_b2b_id IS NULL OR p.id = p_producto_b2b_id
  ),
  latest_status AS (
    SELECT DISTINCT ON (s.producto_b2b_id) s.producto_b2b_id, s.public_visible
    FROM public.producto_b2b_status s
    JOIN products pr ON pr.id = s.producto_b2b_id
    ORDER BY s.producto_b2b_id, s.updated_at DESC NULLS LAST, s.id DESC
  ),
  blockers AS (
    SELECT q.subject_id AS pid, count(*)::int AS n
    FROM public.catalog_quality_issues q
    WHERE q.subject_type = 'PRODUCT' AND q.severity = 'BLOCKER' AND q.status IN ('OPEN','IN_REVIEW')
    GROUP BY q.subject_id
  ),
  identity_blockers AS (
    SELECT q.subject_id AS pid, count(*)::int AS n
    FROM public.catalog_quality_issues q
    WHERE q.subject_type = 'PRODUCT' AND q.severity = 'BLOCKER' AND q.status IN ('OPEN','IN_REVIEW')
      AND q.issue_code IN ('IDENTITY_AMBIGUOUS','SOURCE_CONFLICT')
    GROUP BY q.subject_id
  ),
  -- Applicable family: exactly one CONFIRMED membership in an APPROVED model with a family_key.
  families AS (
    SELECT m.producto_b2b_id AS pid, min(md.family_key) AS family_key, count(DISTINCT md.family_key) AS n
    FROM public.catalog_product_model_members m
    JOIN public.catalog_product_models md ON md.id = m.model_id
    WHERE m.membership_status = 'CONFIRMED' AND md.status = 'APPROVED' AND md.family_key IS NOT NULL
    GROUP BY m.producto_b2b_id
  ),
  completeness AS (
    SELECT f.pid,
           count(d.id)::int AS required_n,
           count(v.id)::int AS approved_n
    FROM families f
    JOIN public.catalog_attribute_definitions d
      ON d.active AND d.is_required AND d.family_scope = f.family_key
    LEFT JOIN public.catalog_attribute_values v
      ON v.subject_type = 'PRODUCT' AND v.subject_id = f.pid AND v.definition_id = d.id
     AND v.is_current AND v.normalization_status = 'APPROVED'
    WHERE f.n = 1
    GROUP BY f.pid
  ),
  gates AS (
    SELECT pr.id AS pid,
      COALESCE(b.n, 0) AS blockers_n,
      (gs.identity_status = 'PASS' AND COALESCE(ib.n, 0) = 0) AS g_identity,
      (gs.data_status = 'PASS' AND COALESCE(b.n, 0) = 0
        AND c.required_n > 0 AND c.approved_n = c.required_n) AS g_data,
      EXISTS (
        SELECT 1 FROM public.catalog_product_content ct
        WHERE ct.producto_b2b_id = pr.id AND ct.is_current AND ct.status = 'HUMAN_APPROVED'
      ) AS g_content,
      EXISTS (
        SELECT 1 FROM public.catalog_product_asset_links l
        JOIN public.catalog_asset_registry a ON a.id = l.asset_id
        WHERE l.target_type = 'PRODUCT' AND l.producto_b2b_id = pr.id AND l.role = 'MASTER'
          AND l.link_status IN ('LINKED','PUBLIC_READY')
          AND a.identity_status = 'MATCHED' AND a.technical_status = 'PASS'
          AND a.visual_status = 'PASS' AND a.rights_status = 'CLEARED'
          AND a.approval_status IN ('APPROVED','PUBLIC_READY')
      ) AS g_image,
      EXISTS (
        SELECT 1 FROM public.catalog_price_v2_current_prices cp
        WHERE cp.product_id = pr.id AND cp.public_price_status = 'priced'
          AND cp.price_before_tax_mxn IS NOT NULL AND cp.price_before_tax_mxn > 0
      ) AS g_pricing,
      COALESCE(ls.public_visible, false) AS g_stock,
      CASE WHEN c.required_n > 0 THEN round(c.approved_n::numeric / c.required_n, 4) END AS score
    FROM products pr
    LEFT JOIN public.catalog_governance_state gs ON gs.producto_b2b_id = pr.id
    LEFT JOIN blockers b ON b.pid = pr.id
    LEFT JOIN identity_blockers ib ON ib.pid = pr.id
    LEFT JOIN completeness c ON c.pid = pr.id
    LEFT JOIN latest_status ls ON ls.producto_b2b_id = pr.id
  )
  SELECT g.pid,
         COALESCE(g.g_identity, false),
         COALESCE(g.g_data, false),
         g.g_content,
         g.g_image,
         g.g_pricing,
         g.g_stock,
         CASE
           WHEN g.blockers_n > 0 THEN 'BLOCKED'
           WHEN COALESCE(g.g_identity, false) AND COALESCE(g.g_data, false) AND g.g_content AND g.g_image THEN 'EDITORIAL_READY'
           ELSE 'NEEDS_REVIEW'
         END,
         g.blockers_n,
         g.score,
         now()
  FROM gates g;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_governance_readiness_v1(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.catalog_governance_readiness_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.catalog_governance_readiness_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_governance_readiness_v1(uuid) TO service_role;
