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
    SELECT DISTINCT ON (s.producto_b2b_id) s.producto_b2b_id, s.public_visible, s.stock_status
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
      (COALESCE(ls.public_visible, false) AND COALESCE(ls.stock_status, '') = 'disponible') AS g_stock,
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