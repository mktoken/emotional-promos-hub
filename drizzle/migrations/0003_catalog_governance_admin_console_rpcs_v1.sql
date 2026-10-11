-- BUILD 2: Catalog Governance Console read-only RPCs (staff only, no DML)

CREATE OR REPLACE FUNCTION public.catalog_governance_admin_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'catalog_governance_admin_dashboard_v1: staff only' USING ERRCODE = '42501';
  END IF;

  WITH r AS (
    SELECT * FROM public.catalog_governance_readiness_v1(NULL)
  ),
  base AS (
    SELECT p.id, p.proveedor_nombre,
      COALESCE(gs.review_status, 'NOT_REVIEWED') AS governance_status,
      (pp.id IS NOT NULL) AS published,
      COALESCE(cp.public_price_status, 'unresolved') AS pricing_status
    FROM public.productos_b2b p
    LEFT JOIN public.catalog_governance_state gs ON gs.producto_b2b_id = p.id
    LEFT JOIN public.productos_publicos pp ON pp.id = p.id
    LEFT JOIN public.catalog_price_v2_current_prices cp ON cp.product_id = p.id
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'total_products', (SELECT count(*) FROM base),
    'census', jsonb_build_object(
      'readiness_row_count', (SELECT count(*) FROM r),
      'distinct_product_count', (SELECT count(DISTINCT producto_b2b_id) FROM r),
      'duplicate_product_count', (SELECT count(*) - count(DISTINCT producto_b2b_id) FROM r),
      'runtime_product_count', (SELECT count(*) FROM public.productos_b2b)
    ),
    'readiness', (SELECT COALESCE(jsonb_object_agg(editorial_readiness, n), '{}'::jsonb)
                  FROM (SELECT editorial_readiness, count(*) n FROM r GROUP BY 1) x),
    'governance_status', (SELECT COALESCE(jsonb_object_agg(governance_status, n), '{}'::jsonb)
                  FROM (SELECT governance_status, count(*) n FROM base GROUP BY 1) x),
    'public_eligibility', jsonb_build_object(
      'eligible', (SELECT count(*) FROM r WHERE stock_public_eligibility_pass),
      'not_eligible', (SELECT count(*) FROM r WHERE NOT stock_public_eligibility_pass)),
    'publication', jsonb_build_object(
      'published', (SELECT count(*) FROM base WHERE published),
      'not_published', (SELECT count(*) FROM base WHERE NOT published)),
    'pricing', (SELECT COALESCE(jsonb_object_agg(pricing_status, n), '{}'::jsonb)
                  FROM (SELECT pricing_status, count(*) n FROM base GROUP BY 1) x),
    'gates', jsonb_build_object(
      'identity', (SELECT count(*) FROM r WHERE identity_pass),
      'data', (SELECT count(*) FROM r WHERE data_completeness_pass),
      'content', (SELECT count(*) FROM r WHERE content_pass),
      'image', (SELECT count(*) FROM r WHERE image_pass),
      'pricing', (SELECT count(*) FROM r WHERE pricing_pass),
      'stock', (SELECT count(*) FROM r WHERE stock_public_eligibility_pass)),
    'open_issues', (SELECT COALESCE(jsonb_object_agg(severity, n), '{}'::jsonb)
                  FROM (SELECT severity, count(*) n FROM public.catalog_quality_issues
                        WHERE status IN ('OPEN','IN_REVIEW') GROUP BY 1) x),
    'providers', (SELECT COALESCE(jsonb_object_agg(COALESCE(proveedor_nombre,'—'), n), '{}'::jsonb)
                  FROM (SELECT proveedor_nombre, count(*) n FROM base GROUP BY 1) x),
    'governance_rows', jsonb_build_object(
      'governance_state', (SELECT count(*) FROM public.catalog_governance_state),
      'source_documents', (SELECT count(*) FROM public.catalog_source_documents),
      'assets', (SELECT count(*) FROM public.catalog_asset_registry),
      'quality_issues', (SELECT count(*) FROM public.catalog_quality_issues),
      'approvals', (SELECT count(*) FROM public.catalog_approvals))
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_governance_admin_queue_v1(
  p_search text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_sku text DEFAULT NULL,
  p_governance_status text DEFAULT NULL,
  p_readiness text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_rights_status text DEFAULT NULL,
  p_visual_status text DEFAULT NULL,
  p_issue_code text DEFAULT NULL,
  p_asset_role text DEFAULT NULL,
  p_pricing_status text DEFAULT NULL,
  p_stock_eligibility boolean DEFAULT NULL,
  p_sort text DEFAULT 'name',
  p_sort_dir text DEFAULT 'asc',
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
  v_desc boolean := lower(COALESCE(p_sort_dir, 'asc')) = 'desc';
  v_sort text := COALESCE(p_sort, 'name');
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'catalog_governance_admin_queue_v1: staff only' USING ERRCODE = '42501';
  END IF;
  IF v_sort NOT IN ('name','provider','sku','governance_status','readiness','pricing_status','stock','published','issues','updated_at') THEN
    v_sort := 'name';
  END IF;

  WITH r AS (
    SELECT * FROM public.catalog_governance_readiness_v1(NULL)
  ),
  base AS (
    SELECT p.id, p.id_interno, p.sku_base, p.proveedor_nombre,
      COALESCE(p.datos_generales->>'nombre', p.sku_base) AS name,
      p.updated_at,
      COALESCE(gs.review_status, 'NOT_REVIEWED') AS governance_status,
      r.editorial_readiness AS readiness,
      r.stock_public_eligibility_pass AS stock_eligible,
      r.pricing_pass,
      r.blocking_issue_count,
      (pp.id IS NOT NULL) AS published,
      COALESCE(cp.public_price_status, 'unresolved') AS pricing_status
    FROM public.productos_b2b p
    JOIN r ON r.producto_b2b_id = p.id
    LEFT JOIN public.catalog_governance_state gs ON gs.producto_b2b_id = p.id
    LEFT JOIN public.productos_publicos pp ON pp.id = p.id
    LEFT JOIN public.catalog_price_v2_current_prices cp ON cp.product_id = p.id
  ),
  f AS (
    SELECT b.* FROM base b
    WHERE (p_search IS NULL OR p_search = '' OR b.name ILIKE '%' || p_search || '%'
           OR b.sku_base ILIKE '%' || p_search || '%' OR b.id_interno ILIKE '%' || p_search || '%'
           OR b.id::text = p_search)
      AND (p_provider IS NULL OR p_provider = '' OR b.proveedor_nombre = p_provider)
      AND (p_provider_sku IS NULL OR p_provider_sku = '' OR b.sku_base ILIKE '%' || p_provider_sku || '%'
           OR b.id_interno ILIKE '%' || p_provider_sku || '%')
      AND (p_governance_status IS NULL OR p_governance_status = '' OR b.governance_status = p_governance_status)
      AND (p_readiness IS NULL OR p_readiness = '' OR b.readiness = p_readiness)
      AND (p_pricing_status IS NULL OR p_pricing_status = '' OR b.pricing_status = p_pricing_status)
      AND (p_stock_eligibility IS NULL OR b.stock_eligible = p_stock_eligibility)
      AND (p_source_type IS NULL OR p_source_type = '' OR EXISTS (
            SELECT 1 FROM public.catalog_source_evidence e
            JOIN public.catalog_source_documents d ON d.id = e.source_document_id
            WHERE e.subject_type = 'PRODUCT' AND e.subject_id = b.id AND d.source_type = p_source_type))
      AND (p_rights_status IS NULL OR p_rights_status = '' OR EXISTS (
            SELECT 1 FROM public.catalog_product_asset_links l
            JOIN public.catalog_asset_registry a ON a.id = l.asset_id
            WHERE l.producto_b2b_id = b.id AND a.rights_status = p_rights_status))
      AND (p_visual_status IS NULL OR p_visual_status = '' OR EXISTS (
            SELECT 1 FROM public.catalog_product_asset_links l
            JOIN public.catalog_asset_registry a ON a.id = l.asset_id
            WHERE l.producto_b2b_id = b.id AND a.visual_status = p_visual_status))
      AND (p_asset_role IS NULL OR p_asset_role = '' OR EXISTS (
            SELECT 1 FROM public.catalog_product_asset_links l
            WHERE l.producto_b2b_id = b.id AND l.role = p_asset_role))
      AND (p_issue_code IS NULL OR p_issue_code = '' OR EXISTS (
            SELECT 1 FROM public.catalog_quality_issues q
            WHERE q.subject_type = 'PRODUCT' AND q.subject_id = b.id
              AND q.issue_code = p_issue_code AND q.status IN ('OPEN','IN_REVIEW')))
  ),
  page AS (
    SELECT f.* FROM f
    ORDER BY
      CASE WHEN NOT v_desc THEN
        CASE v_sort
          WHEN 'name' THEN lower(f.name) WHEN 'provider' THEN f.proveedor_nombre
          WHEN 'sku' THEN f.sku_base WHEN 'governance_status' THEN f.governance_status
          WHEN 'readiness' THEN f.readiness WHEN 'pricing_status' THEN f.pricing_status
          WHEN 'stock' THEN f.stock_eligible::text WHEN 'published' THEN f.published::text
          WHEN 'issues' THEN lpad(f.blocking_issue_count::text, 8, '0')
          WHEN 'updated_at' THEN f.updated_at::text END END ASC NULLS LAST,
      CASE WHEN v_desc THEN
        CASE v_sort
          WHEN 'name' THEN lower(f.name) WHEN 'provider' THEN f.proveedor_nombre
          WHEN 'sku' THEN f.sku_base WHEN 'governance_status' THEN f.governance_status
          WHEN 'readiness' THEN f.readiness WHEN 'pricing_status' THEN f.pricing_status
          WHEN 'stock' THEN f.stock_eligible::text WHEN 'published' THEN f.published::text
          WHEN 'issues' THEN lpad(f.blocking_issue_count::text, 8, '0')
          WHEN 'updated_at' THEN f.updated_at::text END END DESC NULLS LAST,
      f.id
    LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'limit', v_limit,
    'offset', v_offset,
    'rows', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'producto_b2b_id', id, 'id_interno', id_interno, 'sku_base', sku_base,
        'provider', proveedor_nombre, 'name', name, 'updated_at', updated_at,
        'governance_status', governance_status, 'readiness', readiness,
        'stock_eligible', stock_eligible, 'pricing_status', pricing_status,
        'pricing_pass', pricing_pass, 'published', published,
        'blocking_issue_count', blocking_issue_count)) FROM page), '[]'::jsonb),
    'providers', COALESCE((SELECT jsonb_agg(DISTINCT proveedor_nombre) FROM base WHERE proveedor_nombre IS NOT NULL), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_governance_admin_detail_v1(p_producto_b2b_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'catalog_governance_admin_detail_v1: staff only' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.productos_b2b WHERE id = p_producto_b2b_id) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'product', (SELECT jsonb_build_object(
        'producto_b2b_id', p.id, 'id_interno', p.id_interno, 'sku_base', p.sku_base,
        'provider', p.proveedor_nombre, 'name', p.datos_generales->>'nombre',
        'categoria_principal', p.categoria_principal, 'updated_at', p.updated_at,
        'image_count', COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.imagenes)='array' THEN p.imagenes END), 0),
        'primary_image_url', CASE WHEN jsonb_typeof(p.imagenes)='array' THEN p.imagenes->0->>'url' END)
      FROM public.productos_b2b p WHERE p.id = p_producto_b2b_id),
    'readiness', (SELECT to_jsonb(r) FROM public.catalog_governance_readiness_v1(p_producto_b2b_id) r LIMIT 1),
    'governance_state', (SELECT to_jsonb(gs) - 'last_reviewed_by' FROM public.catalog_governance_state gs
                         WHERE gs.producto_b2b_id = p_producto_b2b_id LIMIT 1),
    'runtime_status', (SELECT jsonb_build_object(
        'public_visible', s.public_visible, 'stock_status', s.stock_status, 'stock_qty', s.stock_qty,
        'quote_mode', s.quote_mode, 'price_valid', s.price_valid, 'image_available', s.image_available,
        'last_stock_sync_at', s.last_stock_sync_at, 'updated_at', s.updated_at)
      FROM public.producto_b2b_status s WHERE s.producto_b2b_id = p_producto_b2b_id
      ORDER BY s.updated_at DESC NULLS LAST, s.id DESC LIMIT 1),
    'published', EXISTS (SELECT 1 FROM public.productos_publicos pp WHERE pp.id = p_producto_b2b_id),
    'pricing', (SELECT jsonb_build_object(
        'public_price_status', cp.public_price_status, 'price_before_tax_mxn', cp.price_before_tax_mxn,
        'currency', cp.currency, 'minimum_quantity', cp.minimum_quantity, 'computed_at', cp.computed_at)
      FROM public.catalog_price_v2_current_prices cp WHERE cp.product_id = p_producto_b2b_id LIMIT 1),
    'evidence', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'field_path', e.field_path, 'page_number', e.page_number, 'locator', e.locator,
        'evidence_excerpt', e.evidence_excerpt, 'confidence', e.confidence, 'status', e.status,
        'observed_at', e.observed_at, 'source_type', d.source_type, 'original_filename', d.original_filename,
        'source_version', d.source_version, 'rights_status', d.rights_status) ORDER BY e.observed_at DESC NULLS LAST)
      FROM public.catalog_source_evidence e
      LEFT JOIN public.catalog_source_documents d ON d.id = e.source_document_id
      WHERE e.subject_type = 'PRODUCT' AND e.subject_id = p_producto_b2b_id), '[]'::jsonb),
    'attributes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', v.id, 'key', d.key, 'label', d.label, 'is_required', d.is_required,
        'raw_value', v.raw_value, 'normalized_value', v.normalized_value, 'unit', v.unit,
        'normalization_status', v.normalization_status, 'confidence', v.confidence,
        'is_current', v.is_current, 'value_version', v.value_version) ORDER BY d.key, v.value_version DESC)
      FROM public.catalog_attribute_values v
      JOIN public.catalog_attribute_definitions d ON d.id = v.definition_id
      WHERE v.subject_type = 'PRODUCT' AND v.subject_id = p_producto_b2b_id), '[]'::jsonb),
    'content', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'version', c.version, 'is_current', c.is_current, 'status', c.status,
        'canonical_name', c.canonical_name, 'short_description', c.short_description,
        'approved_at', c.approved_at) ORDER BY c.version DESC)
      FROM public.catalog_product_content c WHERE c.producto_b2b_id = p_producto_b2b_id), '[]'::jsonb),
    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'link_id', l.id, 'role', l.role, 'target_type', l.target_type, 'display_order', l.display_order,
        'link_status', l.link_status, 'original_filename', a.original_filename, 'mime_type', a.mime_type,
        'width', a.width, 'height', a.height, 'rights_status', a.rights_status,
        'identity_status', a.identity_status, 'technical_status', a.technical_status,
        'visual_status', a.visual_status, 'approval_status', a.approval_status,
        'public_url', a.public_url, 'version', a.version) ORDER BY l.display_order NULLS LAST)
      FROM public.catalog_product_asset_links l
      JOIN public.catalog_asset_registry a ON a.id = l.asset_id
      WHERE l.producto_b2b_id = p_producto_b2b_id), '[]'::jsonb),
    'issues', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', q.id, 'issue_code', q.issue_code, 'severity', q.severity, 'status', q.status,
        'opened_at', q.opened_at, 'resolved_at', q.resolved_at, 'resolution', q.resolution) ORDER BY q.opened_at DESC NULLS LAST)
      FROM public.catalog_quality_issues q
      WHERE q.subject_type = 'PRODUCT' AND q.subject_id = p_producto_b2b_id), '[]'::jsonb),
    'approvals', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'scope', a.scope, 'decision', a.decision, 'version_ref', a.version_ref,
        'is_current', a.is_current, 'decided_at', a.decided_at, 'notes', a.notes) ORDER BY a.decided_at DESC NULLS LAST)
      FROM public.catalog_approvals a
      WHERE a.subject_type = 'PRODUCT' AND a.subject_id = p_producto_b2b_id), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_governance_admin_dashboard_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.catalog_governance_admin_queue_v1(text,text,text,text,text,text,text,text,text,text,text,boolean,text,text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.catalog_governance_admin_detail_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_governance_admin_dashboard_v1() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_governance_admin_queue_v1(text,text,text,text,text,text,text,text,text,text,text,boolean,text,text,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_governance_admin_detail_v1(uuid) TO authenticated, service_role;