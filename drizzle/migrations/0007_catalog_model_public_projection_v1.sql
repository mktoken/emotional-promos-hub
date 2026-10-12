-- CHK-CATGOV-05F — model-level public projection backend v1
-- Repository package only. This migration has not been applied by this checkpoint.
-- It adds an explicit, human-governed default membership and two additive,
-- read-only public projection RPCs. Existing public views and RPCs are untouched.

BEGIN;

ALTER TABLE public.catalog_product_model_members
  ADD COLUMN IF NOT EXISTS is_public_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.catalog_product_model_members.is_public_default IS
  'Human-governed model anchor. It does not bypass membership, image, price, stock, or public eligibility gates.';

CREATE UNIQUE INDEX IF NOT EXISTS catalog_model_members_one_public_default_idx
  ON public.catalog_product_model_members (model_id)
  WHERE is_public_default = true;

CREATE INDEX IF NOT EXISTS catalog_model_members_public_projection_idx
  ON public.catalog_product_model_members (model_id, membership_status, producto_b2b_id)
  WHERE membership_status = 'CONFIRMED';

-- The public projection composes existing runtime authorities. It does not
-- publish Governance rows directly and does not expose offer/provider IDs.
CREATE OR REPLACE FUNCTION public.catalog_search_model_projection_v1(
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_collection_slug text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_moq integer DEFAULT NULL,
  p_max_moq integer DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_material text DEFAULT NULL,
  p_availability text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  result_grain text,
  result_id uuid,
  model_id uuid,
  model_key text,
  canonical_model_name text,
  default_producto_b2b_id uuid,
  selected_variant_sku text,
  selected_variant_value text,
  eligible_variant_count integer,
  variants jsonb,
  representative_image jsonb,
  card_price jsonb,
  card_moq integer,
  availability text,
  category jsonb,
  search_match jsonb,
  projection_version text,
  relevance numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH
  params AS (
    SELECT
      public.normalize_catalog_text(COALESCE(p_query, '')) AS q,
      NULLIF(trim(p_category_slug), '') AS category_slug,
      NULLIF(trim(p_collection_slug), '') AS collection_slug,
      NULLIF(trim(p_color), '') AS color,
      NULLIF(trim(p_material), '') AS material,
      NULLIF(lower(trim(p_availability)), '') AS availability,
      greatest(least(COALESCE(p_limit, 24), 60), 1) AS safe_limit,
      greatest(COALESCE(p_offset, 0), 0) AS safe_offset
  ),
  latest_status AS (
    SELECT DISTINCT ON (s.producto_b2b_id)
      s.producto_b2b_id,
      s.stock_status,
      s.stock_qty
    FROM public.producto_b2b_status s
    ORDER BY s.producto_b2b_id, s.updated_at DESC NULLS LAST, s.id DESC
  ),
  release_state AS (
    SELECT EXISTS (
      SELECT 1 FROM public.catalog_price_v2_releases WHERE is_current = true
    ) AS has_current_release
  ),
  public_products AS (
    SELECT
      pp.id,
      pp.id_interno,
      pp.sku_base,
      COALESCE(
        pp.datos_generales ->> 'modelo_comercial',
        pp.datos_generales ->> 'nombre',
        pp.datos_generales ->> 'name',
        pp.datos_generales ->> 'title',
        pp.sku_base,
        pp.id_interno
      ) AS product_name,
      pp.datos_generales,
      pp.imagenes,
      cat.slug AS category_slug,
      cat.name AS category_name,
      subcat.slug AS subcategory_slug,
      subcat.name AS subcategory_name,
      col.collection_match,
      CASE WHEN rs.has_current_release THEN cp.price_before_tax_mxn ELSE pp.precio_desde_mxn END AS price_before_tax_mxn,
      CASE
        WHEN rs.has_current_release THEN COALESCE(cp.public_price_status, 'unavailable')
        WHEN pp.precio_desde_mxn > 0 THEN 'priced'
        ELSE 'request_quote'
      END AS public_price_status,
      CASE WHEN rs.has_current_release THEN COALESCE(cp.currency, 'MXN') ELSE 'MXN' END AS currency,
      CASE WHEN rs.has_current_release THEN cp.minimum_quantity WHEN pp.precio_desde_mxn > 0 THEN 1 ELSE NULL END AS minimum_quantity,
      CASE WHEN rs.has_current_release THEN cp.generation_id ELSE NULL::uuid END AS generation_id,
      st.stock_status,
      st.stock_qty
    FROM public.productos_publicos pp
    CROSS JOIN release_state rs
    LEFT JOIN LATERAL (
      SELECT pc.slug, pc.name
      FROM public.product_category_assignments pca
      JOIN public.product_categories pc ON pc.id = pca.category_id
      WHERE pca.producto_b2b_id = pp.id
        AND pc.is_active = true
      ORDER BY pca.updated_at DESC NULLS LAST, pca.id DESC
      LIMIT 1
    ) cat ON true
    LEFT JOIN LATERAL (
      SELECT ps.slug, ps.name
      FROM public.product_subcategory_assignments psa
      JOIN public.product_subcategories ps ON ps.id = psa.subcategory_id
      WHERE psa.producto_b2b_id = pp.id
        AND ps.is_active = true
      ORDER BY psa.updated_at DESC NULLS LAST, psa.id DESC
      LIMIT 1
    ) subcat ON true
    LEFT JOIN LATERAL (
      SELECT true AS collection_match
      FROM public.product_collection_assignments pca2
      JOIN public.product_collections pc2 ON pc2.id = pca2.collection_id
      WHERE pca2.producto_b2b_id = pp.id
        AND pc2.slug = (SELECT collection_slug FROM params)
        AND pc2.is_active = true
      LIMIT 1
    ) col ON true
    LEFT JOIN LATERAL (
      SELECT
        c.price_before_tax_mxn,
        c.public_price_status,
        c.currency,
        c.minimum_quantity,
        c.generation_id
      FROM public.catalog_price_v2_current_prices c
      WHERE c.product_id = pp.id
      ORDER BY c.computed_at DESC NULLS LAST, c.generation_id DESC NULLS LAST
      LIMIT 1
    ) cp ON true
    LEFT JOIN latest_status st ON st.producto_b2b_id = pp.id
  ),
  model_members AS (
    SELECT
      md.id AS model_id,
      md.model_key,
      md.label AS model_label,
      md.family_key,
      m.id AS membership_id,
      m.is_public_default,
      m.producto_b2b_id,
      m.variant_label,
      m.oferta_id,
      pp.id IS NOT NULL
        AND (
          m.oferta_id IS NULL
          OR (
            o.id IS NOT NULL
            AND o.activo IS NOT FALSE
            AND os.disponibilidad = 'disponible'
          )
        ) AS public_eligible,
      COALESCE(o.variant_sku, pp.sku_base, pp.id_interno) AS variant_sku,
      COALESCE(m.variant_label, o.color_nombre, o.color_code, o.modelo) AS variant_value,
      o.material,
      COALESCE(os.disponibilidad, pp.stock_status, 'consultar') AS stock_status,
      CASE
        WHEN m.oferta_id IS NOT NULL THEN os.cantidad
        ELSE pp.stock_qty
      END AS stock_qty,
      pp.product_name,
      pp.id_interno,
      pp.sku_base,
      pp.category_slug,
      pp.category_name,
      pp.subcategory_slug,
      pp.subcategory_name,
      pp.collection_match,
      pp.price_before_tax_mxn,
      pp.public_price_status,
      pp.currency,
      pp.minimum_quantity,
      pp.generation_id,
      va.public_url AS variant_image_url,
      va.link_status AS variant_image_link_status,
      va.approval_status AS variant_image_approval_status,
      rp.provider_sku
    FROM public.catalog_product_models md
    JOIN public.catalog_product_model_members m
      ON m.model_id = md.id
     AND m.membership_status = 'CONFIRMED'
     AND md.status = 'APPROVED'
    LEFT JOIN public_products pp ON pp.id = m.producto_b2b_id
    LEFT JOIN public.producto_proveedor_ofertas o ON o.id = m.oferta_id
    LEFT JOIN public.producto_proveedor_stock os ON os.oferta_id = m.oferta_id
    LEFT JOIN public.provider_raw_products rp ON rp.id = o.provider_raw_product_id
    LEFT JOIN LATERAL (
      SELECT
        a.public_url,
        l.link_status,
        a.approval_status
      FROM public.catalog_product_asset_links l
      JOIN public.catalog_asset_registry a ON a.id = l.asset_id
      WHERE m.oferta_id IS NOT NULL
        AND l.target_type IN ('VARIANT', 'OFFER')
        AND l.oferta_id = m.oferta_id
        AND l.role = 'MASTER'
        AND l.link_status IN ('LINKED', 'PUBLIC_READY')
        AND a.identity_status = 'MATCHED'
        AND a.technical_status = 'PASS'
        AND a.visual_status = 'PASS'
        AND a.rights_status = 'CLEARED'
        AND a.approval_status IN ('APPROVED', 'PUBLIC_READY')
      ORDER BY l.display_order, l.id DESC
      LIMIT 1
    ) va ON true
  ),
  model_assets AS (
    SELECT DISTINCT ON (l.model_id)
      l.model_id,
      a.public_url,
      l.role,
      l.link_status,
      a.approval_status
    FROM public.catalog_product_asset_links l
    JOIN public.catalog_asset_registry a ON a.id = l.asset_id
    WHERE l.target_type = 'MODEL'
      AND l.role = 'MASTER'
      AND l.link_status IN ('LINKED', 'PUBLIC_READY')
      AND a.identity_status = 'MATCHED'
      AND a.technical_status = 'PASS'
      AND a.visual_status = 'PASS'
      AND a.rights_status = 'CLEARED'
      AND a.approval_status IN ('APPROVED', 'PUBLIC_READY')
    ORDER BY l.model_id, l.display_order, l.id DESC
  ),
  model_projection AS (
    SELECT
      mm.model_id,
      min(mm.model_key) AS model_key,
      min(mm.model_label) AS model_label,
      min(mm.family_key) AS family_key,
      count(*) FILTER (WHERE mm.public_eligible)::integer AS eligible_variant_count,
      jsonb_agg(
        jsonb_build_object(
          'producto_b2b_id', mm.producto_b2b_id,
          'sku', mm.variant_sku,
          'variant_type', CASE WHEN mm.material IS NOT NULL THEN 'material_variant' ELSE 'color_variant' END,
          'variant_value', mm.variant_value,
          'image', CASE
            WHEN mm.variant_image_url IS NOT NULL
              THEN jsonb_build_object('url', mm.variant_image_url, 'role', 'VARIANT_MASTER', 'status', 'PUBLIC_READY')
            ELSE jsonb_build_object('url', NULL, 'role', 'VARIANT_MASTER', 'status', 'NOT_READY')
          END,
          'card_price', CASE
            WHEN mm.public_price_status = 'priced' AND mm.price_before_tax_mxn > 0
              THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(mm.price_before_tax_mxn, 2), 'currency', COALESCE(mm.currency, 'MXN'), 'generation_id', mm.generation_id)
            ELSE jsonb_build_object('status', COALESCE(mm.public_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(mm.currency, 'MXN'))
          END,
          'minimum_quantity', mm.minimum_quantity,
          'stock_status', mm.stock_status,
          'stock_qty', mm.stock_qty,
          'public_eligible', mm.public_eligible,
          'offer_resolution', CASE WHEN mm.oferta_id IS NULL THEN 'product_authority' ELSE 'exact_offer_resolved' END
        ) ORDER BY mm.variant_sku, mm.producto_b2b_id
      ) FILTER (WHERE mm.public_eligible) AS variants,
      (array_agg(mm.producto_b2b_id ORDER BY mm.producto_b2b_id) FILTER (WHERE mm.is_public_default))[1] AS default_producto_b2b_id,
      max(mm.variant_sku) FILTER (WHERE mm.is_public_default) AS default_variant_sku,
      max(mm.variant_value) FILTER (WHERE mm.is_public_default) AS default_variant_value,
      bool_or(mm.is_public_default AND mm.public_eligible) AS default_is_eligible,
      bool_or(mm.is_public_default) AS has_explicit_default,
      max(mm.price_before_tax_mxn) FILTER (WHERE mm.is_public_default) AS default_price,
      max(mm.public_price_status) FILTER (WHERE mm.is_public_default) AS default_price_status,
      max(mm.currency) FILTER (WHERE mm.is_public_default) AS default_currency,
      max(mm.minimum_quantity) FILTER (WHERE mm.is_public_default) AS default_moq,
      (array_agg(mm.generation_id ORDER BY mm.generation_id) FILTER (WHERE mm.is_public_default))[1] AS default_generation_id,
      max(mm.category_slug) FILTER (WHERE mm.is_public_default) AS default_category_slug,
      max(mm.category_name) FILTER (WHERE mm.is_public_default) AS default_category_name,
      max(mm.subcategory_slug) FILTER (WHERE mm.is_public_default) AS default_subcategory_slug,
      max(mm.subcategory_name) FILTER (WHERE mm.is_public_default) AS default_subcategory_name,
      max(mm.variant_image_url) FILTER (WHERE mm.is_public_default) AS default_variant_image_url,
      max(ma.public_url) AS model_image_url,
      max(ma.role) AS model_image_role,
      string_agg(
        concat_ws(' ', mm.model_key, mm.model_label, mm.family_key, mm.variant_sku, mm.variant_value, mm.provider_sku),
        ' '
      ) FILTER (WHERE mm.public_eligible) AS search_text,
      string_agg(
        concat_ws('|', mm.variant_sku, mm.variant_value, mm.producto_b2b_id::text),
        ' '
      ) FILTER (WHERE mm.public_eligible) AS variant_search_text
    FROM model_members mm
    LEFT JOIN model_assets ma ON ma.model_id = mm.model_id
    GROUP BY mm.model_id
  ),
  eligible_models AS (
    SELECT
      mp.*,
      CASE
        WHEN mp.eligible_variant_count = 0 THEN 'NO_ELIGIBLE_VARIANTS'
        WHEN NOT COALESCE(mp.has_explicit_default, false) THEN 'NO_EXPLICIT_DEFAULT'
        WHEN NOT COALESCE(mp.default_is_eligible, false) THEN 'DEFAULT_INELIGIBLE'
        WHEN mp.model_image_url IS NOT NULL THEN 'PUBLIC_READY'
        WHEN mp.default_variant_image_url IS NOT NULL THEN 'PUBLIC_READY'
        ELSE 'NOT_PUBLIC_READY'
      END AS projection_readiness,
      CASE
        WHEN mp.model_image_url IS NOT NULL THEN 'MODEL_MASTER'
        WHEN mp.default_variant_image_url IS NOT NULL THEN 'VARIANT_MASTER'
        ELSE 'NOT_READY'
      END AS image_readiness
    FROM model_projection mp
  ),
  model_results AS (
    SELECT
      'MODEL_RESULT'::text AS result_grain,
      em.model_id AS result_id,
      em.model_id,
      em.model_key,
      em.model_label AS canonical_model_name,
      em.default_producto_b2b_id,
      COALESCE(match.variant_sku, em.default_variant_sku) AS selected_variant_sku,
      COALESCE(match.variant_value, em.default_variant_value) AS selected_variant_value,
      em.eligible_variant_count,
      em.variants,
      CASE
        WHEN em.model_image_url IS NOT NULL
          THEN jsonb_build_object('url', em.model_image_url, 'role', em.model_image_role, 'status', 'PUBLIC_READY')
        WHEN em.default_variant_image_url IS NOT NULL
          THEN jsonb_build_object('url', em.default_variant_image_url, 'role', 'VARIANT_MASTER', 'status', 'PUBLIC_READY')
        ELSE jsonb_build_object('url', NULL, 'role', NULL, 'status', em.image_readiness)
      END AS representative_image,
      CASE
        WHEN em.default_price_status = 'priced' AND em.default_price > 0
          THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(em.default_price, 2), 'currency', COALESCE(em.default_currency, 'MXN'), 'generation_id', em.default_generation_id)
        ELSE jsonb_build_object('status', COALESCE(em.default_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(em.default_currency, 'MXN'))
      END AS card_price,
      em.default_moq AS card_moq,
      'available'::text AS availability,
      jsonb_build_object('slug', em.default_category_slug, 'name', em.default_category_name, 'subcategory_slug', em.default_subcategory_slug, 'subcategory_name', em.default_subcategory_name) AS category,
      CASE
        WHEN public.normalize_catalog_text(em.model_key) = (SELECT q FROM params)
          THEN jsonb_build_object('kind', 'model_key')
        WHEN match.variant_sku IS NOT NULL
          THEN jsonb_build_object('kind', CASE WHEN match.provider_sku IS NOT NULL AND public.normalize_catalog_text(match.provider_sku) = (SELECT q FROM params) THEN 'provider_sku' ELSE 'variant_sku' END, 'variant_sku', match.variant_sku, 'variant_value', match.variant_value)
        ELSE NULL::jsonb
      END AS search_match,
      CASE
        WHEN public.normalize_catalog_text(em.model_key) = (SELECT q FROM params) THEN 120
        WHEN public.normalize_catalog_text(em.model_label) = (SELECT q FROM params) THEN 110
        WHEN public.normalize_catalog_text(em.search_text) LIKE '%' || (SELECT q FROM params) || '%' THEN 70
        ELSE 1
      END::numeric AS relevance
    FROM eligible_models em
    LEFT JOIN LATERAL (
      SELECT mm.variant_sku, mm.variant_value, mm.provider_sku
      FROM model_members mm
      WHERE mm.model_id = em.model_id
        AND mm.public_eligible
        AND (
          public.normalize_catalog_text(mm.variant_sku) = (SELECT q FROM params)
          OR public.normalize_catalog_text(mm.provider_sku) = (SELECT q FROM params)
        )
      ORDER BY mm.variant_sku, mm.producto_b2b_id
      LIMIT 1
    ) match ON true
    WHERE em.projection_readiness = 'PUBLIC_READY'
      AND ((SELECT q FROM params) = '' OR public.normalize_catalog_text(em.search_text) LIKE '%' || replace((SELECT q FROM params), ' ', '%') || '%')
      AND ((SELECT category_slug FROM params) IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible
          AND mm.category_slug = (SELECT category_slug FROM params)
      ))
      AND ((SELECT collection_slug FROM params) IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible AND mm.collection_match
      ))
      AND ((SELECT color FROM params) IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible
          AND public.normalize_catalog_text(COALESCE(mm.variant_value, '')) LIKE '%' || public.normalize_catalog_text((SELECT color FROM params)) || '%'
      ))
      AND ((SELECT material FROM params) IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible
          AND public.normalize_catalog_text(COALESCE(mm.material, '')) LIKE '%' || public.normalize_catalog_text((SELECT material FROM params)) || '%'
      ))
      AND (p_min_price IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible AND mm.price_before_tax_mxn >= p_min_price
      ))
      AND (p_max_price IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible AND mm.price_before_tax_mxn <= p_max_price
      ))
      AND (p_min_moq IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible AND mm.minimum_quantity >= p_min_moq
      ))
      AND (p_max_moq IS NULL OR EXISTS (
        SELECT 1 FROM model_members mm
        WHERE mm.model_id = em.model_id AND mm.public_eligible AND mm.minimum_quantity <= p_max_moq
      ))
      AND ((SELECT availability FROM params) IS NULL OR (SELECT availability FROM params) = 'available')
  ),
  standalone_results AS (
    SELECT
      'VARIANT_RESULT'::text AS result_grain,
      pp.id AS result_id,
      NULL::uuid AS model_id,
      NULL::text AS model_key,
      pp.product_name AS canonical_model_name,
      pp.id AS default_producto_b2b_id,
      pp.sku_base AS selected_variant_sku,
      NULL::text AS selected_variant_value,
      1::integer AS eligible_variant_count,
      jsonb_build_array(
        jsonb_build_object(
          'producto_b2b_id', pp.id,
          'sku', pp.sku_base,
          'variant_type', 'product',
          'variant_value', NULL,
          'image', jsonb_build_object('value', pp.imagenes, 'role', 'PUBLIC_RUNTIME', 'status', 'PUBLIC_READY'),
          'card_price', CASE
            WHEN pp.public_price_status = 'priced' AND pp.price_before_tax_mxn > 0
              THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(pp.price_before_tax_mxn, 2), 'currency', COALESCE(pp.currency, 'MXN'), 'generation_id', pp.generation_id)
            ELSE jsonb_build_object('status', COALESCE(pp.public_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(pp.currency, 'MXN'))
          END,
          'minimum_quantity', pp.minimum_quantity,
          'stock_status', pp.stock_status,
          'stock_qty', pp.stock_qty,
          'public_eligible', true,
          'offer_resolution', 'product_authority'
        )
      ) AS variants,
      jsonb_build_object('value', pp.imagenes, 'role', 'PUBLIC_RUNTIME', 'status', 'PUBLIC_READY') AS representative_image,
      CASE
        WHEN pp.public_price_status = 'priced' AND pp.price_before_tax_mxn > 0
          THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(pp.price_before_tax_mxn, 2), 'currency', COALESCE(pp.currency, 'MXN'), 'generation_id', pp.generation_id)
        ELSE jsonb_build_object('status', COALESCE(pp.public_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(pp.currency, 'MXN'))
      END AS card_price,
      pp.minimum_quantity AS card_moq,
      'available'::text AS availability,
      jsonb_build_object('slug', pp.category_slug, 'name', pp.category_name, 'subcategory_slug', pp.subcategory_slug, 'subcategory_name', pp.subcategory_name) AS category,
      CASE
        WHEN public.normalize_catalog_text(pp.sku_base) = (SELECT q FROM params)
          THEN jsonb_build_object('kind', 'sku', 'sku', pp.sku_base)
        ELSE NULL::jsonb
      END AS search_match,
      CASE
        WHEN public.normalize_catalog_text(pp.sku_base) = (SELECT q FROM params) THEN 120
        WHEN public.normalize_catalog_text(pp.product_name) = (SELECT q FROM params) THEN 110
        WHEN public.normalize_catalog_text(concat_ws(' ', pp.product_name, pp.sku_base, pp.id_interno)) LIKE '%' || (SELECT q FROM params) || '%' THEN 70
        ELSE 1
      END::numeric AS relevance
    FROM public_products pp
    WHERE NOT EXISTS (
        SELECT 1
        FROM model_members mm
        JOIN eligible_models em ON em.model_id = mm.model_id
        WHERE mm.producto_b2b_id = pp.id
          AND mm.public_eligible
          AND em.projection_readiness = 'PUBLIC_READY'
      )
      AND ((SELECT q FROM params) = '' OR public.normalize_catalog_text(concat_ws(' ', pp.product_name, pp.sku_base, pp.id_interno)) LIKE '%' || replace((SELECT q FROM params), ' ', '%') || '%')
      AND ((SELECT category_slug FROM params) IS NULL OR pp.category_slug = (SELECT category_slug FROM params))
      AND ((SELECT collection_slug FROM params) IS NULL OR pp.collection_match)
      AND ((SELECT color FROM params) IS NULL OR public.normalize_catalog_text(COALESCE(pp.datos_generales ->> 'color', '')) LIKE '%' || public.normalize_catalog_text((SELECT color FROM params)) || '%')
      AND ((SELECT material FROM params) IS NULL OR public.normalize_catalog_text(COALESCE(pp.datos_generales ->> 'material', '')) LIKE '%' || public.normalize_catalog_text((SELECT material FROM params)) || '%')
      AND (p_min_price IS NULL OR pp.price_before_tax_mxn >= p_min_price)
      AND (p_max_price IS NULL OR pp.price_before_tax_mxn <= p_max_price)
      AND (p_min_moq IS NULL OR pp.minimum_quantity >= p_min_moq)
      AND (p_max_moq IS NULL OR pp.minimum_quantity <= p_max_moq)
      AND ((SELECT availability FROM params) IS NULL OR (SELECT availability FROM params) = 'available')
  ),
  combined AS (
    SELECT * FROM model_results
    UNION ALL
    SELECT * FROM standalone_results
  ),
  ranked AS (
    SELECT
      c.*,
      count(*) OVER () AS total_count
    FROM combined c
    ORDER BY c.relevance DESC, c.canonical_model_name ASC, c.result_id ASC
    LIMIT (SELECT safe_limit FROM params)
    OFFSET (SELECT safe_offset FROM params)
  )
  SELECT
    r.result_grain,
    r.result_id,
    r.model_id,
    r.model_key,
    r.canonical_model_name,
    r.default_producto_b2b_id,
    r.selected_variant_sku,
    r.selected_variant_value,
    r.eligible_variant_count,
    r.variants,
    r.representative_image,
    r.card_price,
    r.card_moq,
    r.availability,
    r.category,
    r.search_match,
    'CATALOG_MODEL_PUBLIC_PROJECTION_V1'::text AS projection_version,
    r.relevance,
    r.total_count
  FROM ranked r;
$function$;

REVOKE ALL ON FUNCTION public.catalog_search_model_projection_v1(text, text, text, numeric, numeric, integer, integer, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_search_model_projection_v1(text, text, text, numeric, numeric, integer, integer, text, text, text, integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_model_projection_detail_v1(
  p_model_key text,
  p_variant_sku text DEFAULT NULL
)
RETURNS TABLE (
  result_grain text,
  result_id uuid,
  model_id uuid,
  model_key text,
  canonical_model_name text,
  projection_readiness text,
  default_producto_b2b_id uuid,
  selected_variant_sku text,
  selected_variant_value text,
  eligible_variant_count integer,
  variants jsonb,
  representative_image jsonb,
  card_price jsonb,
  card_moq integer,
  availability text,
  category jsonb,
  search_match jsonb,
  projection_version text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH
  latest_status AS (
    SELECT DISTINCT ON (s.producto_b2b_id)
      s.producto_b2b_id,
      s.stock_status,
      s.stock_qty
    FROM public.producto_b2b_status s
    ORDER BY s.producto_b2b_id, s.updated_at DESC NULLS LAST, s.id DESC
  ),
  release_state AS (
    SELECT EXISTS (
      SELECT 1 FROM public.catalog_price_v2_releases WHERE is_current = true
    ) AS has_current_release
  ),
  public_products AS (
    SELECT
      pp.id,
      pp.id_interno,
      pp.sku_base,
      COALESCE(pp.datos_generales ->> 'modelo_comercial', pp.datos_generales ->> 'nombre', pp.datos_generales ->> 'name', pp.datos_generales ->> 'title', pp.sku_base, pp.id_interno) AS product_name,
      pp.imagenes,
      cat.slug AS category_slug,
      cat.name AS category_name,
      subcat.slug AS subcategory_slug,
      subcat.name AS subcategory_name,
      CASE WHEN rs.has_current_release THEN cp.price_before_tax_mxn ELSE pp.precio_desde_mxn END AS price_before_tax_mxn,
      CASE
        WHEN rs.has_current_release THEN COALESCE(cp.public_price_status, 'unavailable')
        WHEN pp.precio_desde_mxn > 0 THEN 'priced'
        ELSE 'request_quote'
      END AS public_price_status,
      CASE WHEN rs.has_current_release THEN COALESCE(cp.currency, 'MXN') ELSE 'MXN' END AS currency,
      CASE WHEN rs.has_current_release THEN cp.minimum_quantity WHEN pp.precio_desde_mxn > 0 THEN 1 ELSE NULL END AS minimum_quantity,
      CASE WHEN rs.has_current_release THEN cp.generation_id ELSE NULL::uuid END AS generation_id,
      st.stock_status,
      st.stock_qty
    FROM public.productos_publicos pp
    CROSS JOIN release_state rs
    LEFT JOIN LATERAL (
      SELECT pc.slug, pc.name
      FROM public.product_category_assignments pca
      JOIN public.product_categories pc ON pc.id = pca.category_id
      WHERE pca.producto_b2b_id = pp.id AND pc.is_active = true
      ORDER BY pca.updated_at DESC NULLS LAST, pca.id DESC
      LIMIT 1
    ) cat ON true
    LEFT JOIN LATERAL (
      SELECT ps.slug, ps.name
      FROM public.product_subcategory_assignments psa
      JOIN public.product_subcategories ps ON ps.id = psa.subcategory_id
      WHERE psa.producto_b2b_id = pp.id AND ps.is_active = true
      ORDER BY psa.updated_at DESC NULLS LAST, psa.id DESC
      LIMIT 1
    ) subcat ON true
    LEFT JOIN LATERAL (
      SELECT c.price_before_tax_mxn, c.public_price_status, c.currency, c.minimum_quantity, c.generation_id
      FROM public.catalog_price_v2_current_prices c
      WHERE c.product_id = pp.id
      ORDER BY c.computed_at DESC NULLS LAST, c.generation_id DESC NULLS LAST
      LIMIT 1
    ) cp ON true
    LEFT JOIN latest_status st ON st.producto_b2b_id = pp.id
  ),
  model_members AS (
    SELECT
      md.id AS model_id,
      md.model_key,
      md.label AS model_label,
      md.family_key,
      m.id AS membership_id,
      m.is_public_default,
      m.producto_b2b_id,
      m.oferta_id,
      m.variant_label,
      pp.id IS NOT NULL AND (m.oferta_id IS NULL OR (o.id IS NOT NULL AND o.activo IS NOT FALSE AND os.disponibilidad = 'disponible')) AS public_eligible,
      COALESCE(o.variant_sku, pp.sku_base, pp.id_interno) AS variant_sku,
      COALESCE(m.variant_label, o.color_nombre, o.color_code, o.modelo) AS variant_value,
      COALESCE(os.disponibilidad, pp.stock_status, 'consultar') AS stock_status,
      CASE WHEN m.oferta_id IS NOT NULL THEN os.cantidad ELSE pp.stock_qty END AS stock_qty,
      o.material,
      pp.category_slug,
      pp.category_name,
      pp.subcategory_slug,
      pp.subcategory_name,
      pp.price_before_tax_mxn,
      pp.public_price_status,
      pp.currency,
      pp.minimum_quantity,
      pp.generation_id,
      va.public_url AS variant_image_url
    FROM public.catalog_product_models md
    JOIN public.catalog_product_model_members m ON m.model_id = md.id AND m.membership_status = 'CONFIRMED' AND md.status = 'APPROVED'
    LEFT JOIN public_products pp ON pp.id = m.producto_b2b_id
    LEFT JOIN public.producto_proveedor_ofertas o ON o.id = m.oferta_id
    LEFT JOIN public.producto_proveedor_stock os ON os.oferta_id = m.oferta_id
    LEFT JOIN LATERAL (
      SELECT a.public_url
      FROM public.catalog_product_asset_links l
      JOIN public.catalog_asset_registry a ON a.id = l.asset_id
      WHERE m.oferta_id IS NOT NULL
        AND l.target_type IN ('VARIANT', 'OFFER')
        AND l.oferta_id = m.oferta_id
        AND l.role = 'MASTER'
        AND l.link_status IN ('LINKED', 'PUBLIC_READY')
        AND a.identity_status = 'MATCHED'
        AND a.technical_status = 'PASS'
        AND a.visual_status = 'PASS'
        AND a.rights_status = 'CLEARED'
        AND a.approval_status IN ('APPROVED', 'PUBLIC_READY')
      ORDER BY l.display_order, l.id DESC
      LIMIT 1
    ) va ON true
  ),
  model_assets AS (
    SELECT DISTINCT ON (l.model_id)
      l.model_id,
      a.public_url,
      l.role
    FROM public.catalog_product_asset_links l
    JOIN public.catalog_asset_registry a ON a.id = l.asset_id
    WHERE l.target_type = 'MODEL'
      AND l.role = 'MASTER'
      AND l.link_status IN ('LINKED', 'PUBLIC_READY')
      AND a.identity_status = 'MATCHED'
      AND a.technical_status = 'PASS'
      AND a.visual_status = 'PASS'
      AND a.rights_status = 'CLEARED'
      AND a.approval_status IN ('APPROVED', 'PUBLIC_READY')
    ORDER BY l.model_id, l.display_order, l.id DESC
  ),
  projection AS (
    SELECT
      mm.model_id,
      min(mm.model_key) AS model_key,
      min(mm.model_label) AS model_label,
      count(*) FILTER (WHERE mm.public_eligible)::integer AS eligible_variant_count,
      jsonb_agg(
        jsonb_build_object(
          'producto_b2b_id', mm.producto_b2b_id,
          'sku', mm.variant_sku,
          'variant_type', CASE WHEN mm.material IS NOT NULL THEN 'material_variant' ELSE 'color_variant' END,
          'variant_value', mm.variant_value,
          'image', CASE WHEN mm.variant_image_url IS NOT NULL THEN jsonb_build_object('url', mm.variant_image_url, 'role', 'VARIANT_MASTER', 'status', 'PUBLIC_READY') ELSE jsonb_build_object('url', NULL, 'role', 'VARIANT_MASTER', 'status', 'NOT_READY') END,
          'card_price', CASE WHEN mm.public_price_status = 'priced' AND mm.price_before_tax_mxn > 0 THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(mm.price_before_tax_mxn, 2), 'currency', COALESCE(mm.currency, 'MXN'), 'generation_id', mm.generation_id) ELSE jsonb_build_object('status', COALESCE(mm.public_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(mm.currency, 'MXN')) END,
          'minimum_quantity', mm.minimum_quantity,
          'stock_status', mm.stock_status,
          'stock_qty', mm.stock_qty,
          'public_eligible', mm.public_eligible,
          'offer_resolution', CASE WHEN mm.oferta_id IS NULL THEN 'product_authority' ELSE 'exact_offer_resolved' END
        ) ORDER BY mm.variant_sku, mm.producto_b2b_id
      ) FILTER (WHERE mm.public_eligible) AS variants,
      (array_agg(mm.producto_b2b_id ORDER BY mm.producto_b2b_id) FILTER (WHERE mm.is_public_default))[1] AS default_producto_b2b_id,
      max(mm.variant_sku) FILTER (WHERE mm.is_public_default) AS default_variant_sku,
      max(mm.variant_value) FILTER (WHERE mm.is_public_default) AS default_variant_value,
      bool_or(mm.is_public_default AND mm.public_eligible) AS default_is_eligible,
      bool_or(mm.is_public_default) AS has_explicit_default,
      max(mm.price_before_tax_mxn) FILTER (WHERE mm.is_public_default) AS default_price,
      max(mm.public_price_status) FILTER (WHERE mm.is_public_default) AS default_price_status,
      max(mm.currency) FILTER (WHERE mm.is_public_default) AS default_currency,
      max(mm.minimum_quantity) FILTER (WHERE mm.is_public_default) AS default_moq,
      (array_agg(mm.generation_id ORDER BY mm.generation_id) FILTER (WHERE mm.is_public_default))[1] AS default_generation_id,
      max(mm.category_slug) FILTER (WHERE mm.is_public_default) AS default_category_slug,
      max(mm.category_name) FILTER (WHERE mm.is_public_default) AS default_category_name,
      max(mm.subcategory_slug) FILTER (WHERE mm.is_public_default) AS default_subcategory_slug,
      max(mm.subcategory_name) FILTER (WHERE mm.is_public_default) AS default_subcategory_name,
      max(mm.variant_image_url) FILTER (WHERE mm.is_public_default) AS default_variant_image_url,
      max(ma.public_url) AS model_image_url,
      max(ma.role) AS model_image_role
    FROM model_members mm
    LEFT JOIN model_assets ma ON ma.model_id = mm.model_id
    WHERE mm.model_key = trim(p_model_key)
    GROUP BY mm.model_id
  )
  SELECT
    'MODEL_RESULT'::text,
    pr.model_id,
    pr.model_id,
    pr.model_key,
    pr.model_label,
    CASE
      WHEN pr.eligible_variant_count = 0 THEN 'NO_ELIGIBLE_VARIANTS'
      WHEN NOT COALESCE(pr.has_explicit_default, false) THEN 'NO_EXPLICIT_DEFAULT'
      WHEN NOT COALESCE(pr.default_is_eligible, false) THEN 'DEFAULT_INELIGIBLE'
      WHEN pr.model_image_url IS NOT NULL OR pr.default_variant_image_url IS NOT NULL THEN 'PUBLIC_READY'
      ELSE 'NOT_PUBLIC_READY'
    END,
    pr.default_producto_b2b_id,
    CASE
      WHEN p_variant_sku IS NULL THEN pr.default_variant_sku
      ELSE p_variant_sku
    END,
    CASE
      WHEN p_variant_sku IS NULL THEN pr.default_variant_value
      ELSE (SELECT mm.variant_value FROM model_members mm WHERE mm.model_id = pr.model_id AND mm.public_eligible AND lower(mm.variant_sku) = lower(trim(p_variant_sku)) ORDER BY mm.variant_sku LIMIT 1)
    END,
    pr.eligible_variant_count,
    COALESCE(pr.variants, '[]'::jsonb),
    CASE
      WHEN pr.model_image_url IS NOT NULL THEN jsonb_build_object('url', pr.model_image_url, 'role', pr.model_image_role, 'status', 'PUBLIC_READY')
      WHEN pr.default_variant_image_url IS NOT NULL THEN jsonb_build_object('url', pr.default_variant_image_url, 'role', 'VARIANT_MASTER', 'status', 'PUBLIC_READY')
      ELSE jsonb_build_object('url', NULL, 'role', NULL, 'status', 'NOT_READY')
    END,
    CASE
      WHEN pr.default_price_status = 'priced' AND pr.default_price > 0 THEN jsonb_build_object('status', 'priced', 'amount_mxn', round(pr.default_price, 2), 'currency', COALESCE(pr.default_currency, 'MXN'), 'generation_id', pr.default_generation_id)
      ELSE jsonb_build_object('status', COALESCE(pr.default_price_status, 'unavailable'), 'amount_mxn', NULL, 'currency', COALESCE(pr.default_currency, 'MXN'))
    END,
    pr.default_moq,
    CASE WHEN pr.eligible_variant_count > 0 THEN 'available' ELSE 'unavailable' END,
    jsonb_build_object('slug', pr.default_category_slug, 'name', pr.default_category_name, 'subcategory_slug', pr.default_subcategory_slug, 'subcategory_name', pr.default_subcategory_name),
    CASE WHEN p_variant_sku IS NOT NULL THEN jsonb_build_object('kind', 'variant_sku', 'variant_sku', p_variant_sku) ELSE NULL::jsonb END,
    'CATALOG_MODEL_PUBLIC_PROJECTION_V1'::text
  FROM projection pr
  WHERE p_variant_sku IS NULL
     OR EXISTS (
       SELECT 1
       FROM model_members mm
       WHERE mm.model_id = pr.model_id
         AND mm.public_eligible
         AND lower(mm.variant_sku) = lower(trim(p_variant_sku))
     );
$function$;

REVOKE ALL ON FUNCTION public.get_model_projection_detail_v1(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_model_projection_detail_v1(text, text) TO anon, authenticated;

COMMIT;
