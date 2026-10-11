-- CHK-CATGOV-02H: fix memberships_bounded outer ORDER BY (q.id -> q.membership_id).
-- Detail RPC only. No DML, backfill, or runtime authority changes.

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

  IF NOT EXISTS (
    SELECT 1 FROM public.productos_b2b WHERE id = p_producto_b2b_id
  ) THEN
    RETURN NULL;
  END IF;

  WITH
  model_scope AS (
    SELECT DISTINCT m.model_id
    FROM public.catalog_product_model_members m
    WHERE m.producto_b2b_id = p_producto_b2b_id
    UNION
    SELECT DISTINCT c.model_id
    FROM public.catalog_product_content c
    WHERE c.producto_b2b_id = p_producto_b2b_id
      AND c.model_id IS NOT NULL
  ),
  offer_scope AS (
    SELECT DISTINCT m.oferta_id
    FROM public.producto_b2b_oferta_map m
    WHERE m.producto_b2b_id = p_producto_b2b_id
  ),
  asset_scope AS (
    SELECT DISTINCT l.asset_id
    FROM public.catalog_product_asset_links l
    WHERE l.producto_b2b_id = p_producto_b2b_id
       OR l.model_id IN (SELECT model_id FROM model_scope)
       OR l.oferta_id IN (SELECT oferta_id FROM offer_scope)
  ),
  detail_subjects AS (
    SELECT 'PRODUCT'::text AS subject_type, p_producto_b2b_id AS subject_id
    UNION
    SELECT 'MODEL'::text, model_id FROM model_scope
    UNION
    SELECT 'OFFER'::text, oferta_id FROM offer_scope
    UNION
    SELECT 'VARIANT'::text, oferta_id FROM offer_scope
    UNION
    SELECT 'ASSET'::text, asset_id FROM asset_scope
  ),
  source_docs_deduped AS (
    SELECT DISTINCT ON (d.id)
      d.id AS document_id,
      d.source_type,
      d.original_filename,
      d.source_version,
      d.rights_status,
      d.observed_at,
      d.ingested_at,
      COALESCE(e.observed_at, d.observed_at, d.ingested_at) AS effective_observed_at
    FROM public.catalog_source_documents d
    JOIN public.catalog_source_evidence e
      ON e.source_document_id = d.id
    JOIN detail_subjects s
      ON s.subject_type = e.subject_type
     AND s.subject_id = e.subject_id
    ORDER BY d.id, COALESCE(e.observed_at, d.observed_at, d.ingested_at) DESC NULLS LAST, e.id DESC
  ),
  source_docs_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.effective_observed_at DESC NULLS LAST, q.document_id DESC
    ) AS rn
    FROM (
      SELECT q.*
      FROM source_docs_deduped q
      ORDER BY q.effective_observed_at DESC NULLS LAST, q.document_id DESC
      LIMIT 51
    ) q
  ),
  evidence_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.observed_at DESC NULLS LAST, q.id DESC
    ) AS rn
    FROM (
      SELECT
        e.id,
        e.subject_type,
        e.subject_id,
        e.field_path,
        e.page_number,
        e.locator,
        left(e.evidence_excerpt, 2000) AS evidence_excerpt,
        e.confidence,
        e.status,
        e.observed_at,
        d.source_type,
        d.original_filename,
        d.source_version,
        d.rights_status
      FROM public.catalog_source_evidence e
      LEFT JOIN public.catalog_source_documents d ON d.id = e.source_document_id
      JOIN detail_subjects s
        ON s.subject_type = e.subject_type
       AND s.subject_id = e.subject_id
      ORDER BY e.observed_at DESC NULLS LAST, e.id DESC
      LIMIT 101
    ) q
  ),
  attributes_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.is_current DESC, q.attribute_key, q.value_version DESC, q.id DESC
    ) AS rn
    FROM (
      SELECT
        v.id,
        d.key AS attribute_key,
        d.label,
        d.is_required,
        v.raw_value,
        v.normalized_value,
        v.unit,
        v.normalization_status,
        v.confidence,
        v.is_current,
        v.value_version
      FROM public.catalog_attribute_values v
      JOIN public.catalog_attribute_definitions d ON d.id = v.definition_id
      WHERE v.subject_type = 'PRODUCT'
        AND v.subject_id = p_producto_b2b_id
      ORDER BY v.is_current DESC, d.key, v.value_version DESC, v.id DESC
      LIMIT 101
    ) q
  ),
  content_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.is_current DESC, q.version DESC, q.id DESC
    ) AS rn
    FROM (
      SELECT
        c.id,
        c.version,
        c.is_current,
        c.status,
        c.canonical_name,
        c.short_description,
        c.approved_at
      FROM public.catalog_product_content c
      WHERE c.producto_b2b_id = p_producto_b2b_id
      ORDER BY c.is_current DESC, c.version DESC, c.id DESC
      LIMIT 26
    ) q
  ),
  assets_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.display_order NULLS LAST, q.link_id DESC
    ) AS rn
    FROM (
      SELECT
        l.id AS link_id,
        l.role,
        l.target_type,
        l.display_order,
        l.link_status,
        a.original_filename,
        a.mime_type,
        a.width,
        a.height,
        a.rights_status,
        a.identity_status,
        a.technical_status,
        a.visual_status,
        a.approval_status,
        a.public_url,
        a.version
      FROM public.catalog_product_asset_links l
      JOIN public.catalog_asset_registry a ON a.id = l.asset_id
      WHERE l.asset_id IN (SELECT asset_id FROM asset_scope)
      ORDER BY l.display_order NULLS LAST, l.id DESC
      LIMIT 101
    ) q
  ),
  issues_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.opened_at DESC NULLS LAST, q.id DESC
    ) AS rn
    FROM (
      SELECT
        i.id,
        i.subject_type,
        i.subject_id,
        i.issue_code,
        i.severity,
        i.status,
        i.opened_at,
        i.resolved_at,
        i.resolution
      FROM public.catalog_quality_issues i
      JOIN detail_subjects s
        ON s.subject_type = i.subject_type
       AND s.subject_id = i.subject_id
      ORDER BY i.opened_at DESC NULLS LAST, i.id DESC
      LIMIT 101
    ) q
  ),
  approvals_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.decided_at DESC NULLS LAST, q.id DESC
    ) AS rn
    FROM (
      SELECT
        a.id,
        a.subject_type,
        a.subject_id,
        a.scope,
        a.decision,
        a.version_ref,
        a.is_current,
        a.decided_at,
        a.notes
      FROM public.catalog_approvals a
      JOIN detail_subjects s
        ON s.subject_type = a.subject_type
       AND s.subject_id = a.subject_id
      ORDER BY a.decided_at DESC NULLS LAST, a.id DESC
      LIMIT 101
    ) q
  ),
  models_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.status, q.model_key, q.id
    ) AS rn
    FROM (
      SELECT
        m.id,
        m.model_key,
        m.label,
        m.family_key,
        m.status,
        m.reason
      FROM public.catalog_product_models m
      WHERE m.id IN (SELECT model_id FROM model_scope)
      ORDER BY m.status, m.model_key, m.id
      LIMIT 26
    ) q
  ),
  memberships_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.model_id, q.membership_status, q.membership_id
    ) AS rn
    FROM (
      SELECT
        m.id AS membership_id,
        m.model_id,
        m.producto_b2b_id,
        m.oferta_id,
        m.variant_label,
        m.membership_status,
        m.reason,
        m.evidence_id,
        m.reviewed_at
      FROM public.catalog_product_model_members m
      WHERE m.producto_b2b_id = p_producto_b2b_id
      ORDER BY m.model_id, m.membership_status, m.id
      LIMIT 101
    ) q
  ),
  offers_bounded AS (
    SELECT q.*, row_number() OVER (
      ORDER BY q.provider, q.provider_sku, q.oferta_id
    ) AS rn
    FROM (
      SELECT
        o.id AS oferta_id,
        pr.nombre AS provider,
        pr.code AS provider_code,
        rp.provider_sku,
        o.variant_sku,
        o.color_nombre AS color,
        o.talla AS size,
        o.material,
        o.modelo AS model,
        o.activo AS offer_status,
        rp.activo AS raw_product_status,
        m.is_primary,
        m.match_score,
        m.match_reason
      FROM public.producto_b2b_oferta_map m
      JOIN public.producto_proveedor_ofertas o ON o.id = m.oferta_id
      JOIN public.provider_raw_products rp ON rp.id = o.provider_raw_product_id
      JOIN public.proveedores pr ON pr.id = o.proveedor_id
      WHERE m.producto_b2b_id = p_producto_b2b_id
      ORDER BY pr.nombre, rp.provider_sku, o.id
      LIMIT 101
    ) q
  )
  SELECT jsonb_build_object(
    'overview', (
      SELECT jsonb_build_object(
        'producto_b2b_id', p.id,
        'id_interno', p.id_interno,
        'sku_base', p.sku_base,
        'provider', p.proveedor_nombre,
        'name', p.datos_generales->>'nombre',
        'categoria_principal', p.categoria_principal,
        'updated_at', p.updated_at,
        'image_count', COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.imagenes) = 'array' THEN p.imagenes END), 0),
        'primary_image_url', CASE WHEN jsonb_typeof(p.imagenes) = 'array' THEN p.imagenes->0->>'url' END,
        'models_count', (SELECT count(*) FROM model_scope),
        'memberships_count', (SELECT count(*) FROM public.catalog_product_model_members WHERE producto_b2b_id = p.id),
        'offers_count', (SELECT count(*) FROM offer_scope)
      )
      FROM public.productos_b2b p
      WHERE p.id = p_producto_b2b_id
    ),
    'sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'document_id', document_id,
        'source_type', source_type,
        'original_filename', original_filename,
        'source_version', source_version,
        'rights_status', rights_status,
        'observed_at', observed_at,
        'ingested_at', ingested_at
      ) ORDER BY rn) FILTER (WHERE rn <= 50)
      FROM source_docs_bounded
    ), '[]'::jsonb),
    'evidence', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'subject_type', subject_type,
        'subject_id', subject_id,
        'field_path', field_path,
        'page_number', page_number,
        'locator', locator,
        'evidence_excerpt', evidence_excerpt,
        'confidence', confidence,
        'status', status,
        'observed_at', observed_at,
        'source_type', source_type,
        'original_filename', original_filename,
        'source_version', source_version,
        'rights_status', rights_status
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM evidence_bounded
    ), '[]'::jsonb),
    'attributes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'key', attribute_key,
        'label', label,
        'is_required', is_required,
        'raw_value', raw_value,
        'normalized_value', normalized_value,
        'unit', unit,
        'normalization_status', normalization_status,
        'confidence', confidence,
        'is_current', is_current,
        'value_version', value_version
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM attributes_bounded
    ), '[]'::jsonb),
    'content', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'version', version,
        'is_current', is_current,
        'status', status,
        'canonical_name', canonical_name,
        'short_description', short_description,
        'approved_at', approved_at
      ) ORDER BY rn) FILTER (WHERE rn <= 25)
      FROM content_bounded
    ), '[]'::jsonb),
    'assets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'link_id', link_id,
        'role', role,
        'target_type', target_type,
        'display_order', display_order,
        'link_status', link_status,
        'original_filename', original_filename,
        'mime_type', mime_type,
        'width', width,
        'height', height,
        'rights_status', rights_status,
        'identity_status', identity_status,
        'technical_status', technical_status,
        'visual_status', visual_status,
        'approval_status', approval_status,
        'public_url', public_url,
        'version', version
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM assets_bounded
    ), '[]'::jsonb),
    'issues', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'subject_type', subject_type,
        'subject_id', subject_id,
        'issue_code', issue_code,
        'severity', severity,
        'status', status,
        'opened_at', opened_at,
        'resolved_at', resolved_at,
        'resolution', resolution
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM issues_bounded
    ), '[]'::jsonb),
    'approvals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'subject_type', subject_type,
        'subject_id', subject_id,
        'scope', scope,
        'decision', decision,
        'version_ref', version_ref,
        'is_current', is_current,
        'decided_at', decided_at,
        'notes', notes
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM approvals_bounded
    ), '[]'::jsonb),
    'runtime', (
      SELECT jsonb_build_object(
        'public_visible', s.public_visible,
        'stock_status', s.stock_status,
        'stock_qty', s.stock_qty,
        'quote_mode', s.quote_mode,
        'price_valid', s.price_valid,
        'image_available', s.image_available,
        'last_stock_sync_at', s.last_stock_sync_at,
        'updated_at', s.updated_at
      )
      FROM public.producto_b2b_status s
      WHERE s.producto_b2b_id = p_producto_b2b_id
      ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
      LIMIT 1
    ),
    'models', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'model_id', id,
        'model_key', model_key,
        'label', label,
        'family_key', family_key,
        'status', status,
        'reason', reason
      ) ORDER BY rn) FILTER (WHERE rn <= 25)
      FROM models_bounded
    ), '[]'::jsonb),
    'memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'membership_id', membership_id,
        'model_id', model_id,
        'producto_b2b_id', producto_b2b_id,
        'oferta_id', oferta_id,
        'variant_label', variant_label,
        'membership_status', membership_status,
        'reason', reason,
        'evidence_id', evidence_id,
        'reviewed_at', reviewed_at
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM memberships_bounded
    ), '[]'::jsonb),
    'offers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'oferta_id', oferta_id,
        'provider', provider,
        'provider_code', provider_code,
        'provider_sku', provider_sku,
        'variant_sku', variant_sku,
        'color', color,
        'size', size,
        'material', material,
        'model', model,
        'offer_status', offer_status,
        'raw_product_status', raw_product_status,
        'is_primary', is_primary,
        'match_score', match_score,
        'match_reason', match_reason
      ) ORDER BY rn) FILTER (WHERE rn <= 100)
      FROM offers_bounded
    ), '[]'::jsonb),
    'governance_state', (
      SELECT to_jsonb(gs) - 'last_reviewed_by'
      FROM public.catalog_governance_state gs
      WHERE gs.producto_b2b_id = p_producto_b2b_id
      LIMIT 1
    ),
    'published', EXISTS (
      SELECT 1 FROM public.productos_publicos pp WHERE pp.id = p_producto_b2b_id
    ),
    'pricing', (
      SELECT jsonb_build_object(
        'public_price_status', cp.public_price_status,
        'price_before_tax_mxn', cp.price_before_tax_mxn,
        'currency', cp.currency,
        'minimum_quantity', cp.minimum_quantity,
        'computed_at', cp.computed_at
      )
      FROM public.catalog_price_v2_current_prices cp
      WHERE cp.product_id = p_producto_b2b_id
      ORDER BY cp.computed_at DESC NULLS LAST, cp.generation_id DESC NULLS LAST
      LIMIT 1
    ),
    'collection_meta', jsonb_build_object(
      'sources', jsonb_build_object('returned', (SELECT count(*) FROM source_docs_bounded WHERE rn <= 50), 'limit', 50, 'truncated', (SELECT count(*) > 50 FROM source_docs_bounded)),
      'evidence', jsonb_build_object('returned', (SELECT count(*) FROM evidence_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM evidence_bounded)),
      'attributes', jsonb_build_object('returned', (SELECT count(*) FROM attributes_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM attributes_bounded)),
      'content', jsonb_build_object('returned', (SELECT count(*) FROM content_bounded WHERE rn <= 25), 'limit', 25, 'truncated', (SELECT count(*) > 25 FROM content_bounded)),
      'assets', jsonb_build_object('returned', (SELECT count(*) FROM assets_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM assets_bounded)),
      'issues', jsonb_build_object('returned', (SELECT count(*) FROM issues_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM issues_bounded)),
      'approvals', jsonb_build_object('returned', (SELECT count(*) FROM approvals_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM approvals_bounded)),
      'models', jsonb_build_object('returned', (SELECT count(*) FROM models_bounded WHERE rn <= 25), 'limit', 25, 'truncated', (SELECT count(*) > 25 FROM models_bounded)),
      'memberships', jsonb_build_object('returned', (SELECT count(*) FROM memberships_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM memberships_bounded)),
      'offers', jsonb_build_object('returned', (SELECT count(*) FROM offers_bounded WHERE rn <= 100), 'limit', 100, 'truncated', (SELECT count(*) > 100 FROM offers_bounded))
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_governance_admin_detail_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_governance_admin_detail_v1(uuid) TO authenticated, service_role;
