-- CHK-G4 canonical catalog search eligibility
-- Preserve the existing RPC contract and rely on productos_publicos for public eligibility.

CREATE OR REPLACE FUNCTION public.catalog_search_products_v2(
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_collection_slug text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_subcategory_slug text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  id_interno text,
  sku_base text,
  nombre text,
  descripcion text,
  imagenes jsonb,
  precio_desde_mxn numeric,
  public_price_status text,
  currency text,
  minimum_quantity integer,
  pricing_generation_id uuid,
  categoria_slug text,
  categoria_nombre text,
  subcategoria_slug text,
  subcategoria_nombre text,
  relevance numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH params AS (
    SELECT
      public.normalize_catalog_text(COALESCE(p_query, '')) AS q,
      NULLIF(trim(p_category_slug), '') AS requested_category_slug,
      NULLIF(trim(p_subcategory_slug), '') AS requested_subcategory_slug,
      NULLIF(trim(p_collection_slug), '') AS collection_slug,
      greatest(least(COALESCE(p_limit, 24), 60), 1) AS safe_limit,
      greatest(COALESCE(p_offset, 0), 0) AS safe_offset
  ),
  matched_aliases AS (
    SELECT
      a.term,
      public.normalize_catalog_text(a.term) AS norm_term,
      a.expanded_terms,
      a.category_slug,
      a.boost
    FROM public.product_search_aliases AS a
    CROSS JOIN params AS p
    WHERE a.is_active = true
      AND p.q <> ''
      AND (
        p.q = public.normalize_catalog_text(a.term)
        OR p.q LIKE '%' || public.normalize_catalog_text(a.term) || '%'
        OR public.normalize_catalog_text(a.term) LIKE '%' || p.q || '%'
      )
  ),
  expanded_terms AS (
    SELECT
      ma.category_slug,
      ma.boost,
      public.normalize_catalog_text(ma.term) AS term
    FROM matched_aliases AS ma

    UNION ALL

    SELECT
      ma.category_slug,
      ma.boost,
      public.normalize_catalog_text(x.term) AS term
    FROM matched_aliases AS ma
    CROSS JOIN LATERAL unnest(ma.expanded_terms) AS x(term)
  ),
  expanded_query AS (
    SELECT
      p.q,
      p.requested_category_slug,
      p.requested_subcategory_slug,
      p.collection_slug,
      p.safe_limit,
      p.safe_offset,
      COALESCE(
        p.requested_category_slug,
        max(et.category_slug) FILTER (WHERE et.category_slug IS NOT NULL)
      ) AS effective_category_slug,
      COALESCE(max(et.boost), 1.00) AS alias_boost,
      array_remove(array_agg(DISTINCT et.term), NULL) AS terms
    FROM params AS p
    LEFT JOIN expanded_terms AS et
      ON true
    GROUP BY
      p.q,
      p.requested_category_slug,
      p.requested_subcategory_slug,
      p.collection_slug,
      p.safe_limit,
      p.safe_offset
  ),
  release_state AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.catalog_price_v2_releases
      WHERE is_current = true
    ) AS has_current_release
  ),
  base_products AS (
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
      ) AS nombre,
      COALESCE(
        pp.datos_generales ->> 'descripcion',
        pp.datos_generales ->> 'description',
        ''
      ) AS descripcion,
      pp.imagenes,
      CASE
        WHEN rs.has_current_release THEN
          CASE
            WHEN cp.public_price_status = 'priced'
                 AND cp.price_before_tax_mxn > 0
            THEN round(cp.price_before_tax_mxn, 2)
            ELSE NULL::numeric
          END
        ELSE
          CASE
            WHEN pp.precio_desde_mxn > 0
            THEN round(pp.precio_desde_mxn, 2)
            ELSE NULL::numeric
          END
      END AS precio_desde_mxn,
      CASE
        WHEN rs.has_current_release THEN
          CASE
            WHEN cp.product_id IS NULL THEN 'unavailable'::text
            WHEN cp.public_price_status = 'priced'
                 AND cp.price_before_tax_mxn > 0
            THEN 'priced'::text
            WHEN cp.public_price_status IN ('request_quote', 'unavailable')
            THEN cp.public_price_status
            ELSE 'request_quote'::text
          END
        ELSE
          CASE
            WHEN pp.precio_desde_mxn > 0 THEN 'priced'::text
            ELSE 'request_quote'::text
          END
      END AS public_price_status,
      CASE
        WHEN rs.has_current_release THEN COALESCE(cp.currency, 'MXN')
        ELSE 'MXN'::text
      END AS currency,
      CASE
        WHEN rs.has_current_release THEN cp.minimum_quantity
        WHEN pp.precio_desde_mxn > 0 THEN 1
        ELSE NULL::integer
      END AS minimum_quantity,
      CASE
        WHEN rs.has_current_release THEN cp.generation_id
        ELSE NULL::uuid
      END AS pricing_generation_id,
      pc.slug AS categoria_slug,
      pc.name AS categoria_nombre,
      ps.slug AS subcategoria_slug,
      ps.name AS subcategoria_nombre,
      public.normalize_catalog_text(
        concat_ws(
          ' ',
          pp.id_interno,
          pp.sku_base,
          pp.categoria_principal,
          pp.datos_generales ->> 'clave_producto',
          pp.datos_generales ->> 'modelo_comercial',
          pp.datos_generales ->> 'nombre',
          pp.datos_generales ->> 'name',
          pp.datos_generales ->> 'title',
          pp.datos_generales ->> 'descripcion',
          pp.datos_generales ->> 'description',
          pp.datos_generales ->> 'material',
          pc.name,
          pc.slug,
          ps.name,
          ps.slug
        )
      ) AS search_text,
      public.normalize_catalog_text(
        concat_ws(
          ' ',
          pp.datos_generales ->> 'modelo_comercial',
          pp.datos_generales ->> 'nombre',
          pp.datos_generales ->> 'name',
          pp.datos_generales ->> 'title',
          pp.sku_base,
          pp.id_interno
        )
      ) AS name_text
    FROM public.productos_publicos AS pp
    JOIN public.product_category_assignments AS pca
      ON pca.producto_b2b_id = pp.id
    JOIN public.product_categories AS pc
      ON pc.id = pca.category_id
     AND pc.is_active = true
    LEFT JOIN public.product_subcategory_assignments AS psa
      ON psa.producto_b2b_id = pp.id
    LEFT JOIN public.product_subcategories AS ps
      ON ps.id = psa.subcategory_id
     AND ps.is_active = true
    CROSS JOIN release_state AS rs
    LEFT JOIN public.catalog_price_v2_current_prices AS cp
      ON cp.product_id = pp.id
  ),
  scored AS (
    SELECT
      bp.*,
      eq.q,
      eq.terms,
      eq.alias_boost,
      eq.effective_category_slug,
      (
        CASE
          WHEN eq.q = '' THEN 1
          WHEN bp.name_text = eq.q THEN 120
          WHEN bp.name_text LIKE eq.q || '%' THEN 100
          WHEN bp.name_text LIKE '%' || eq.q || '%' THEN 80
          WHEN bp.search_text LIKE '%' || replace(eq.q, ' ', '%') || '%'
            THEN 55
          ELSE 0
        END
        +
        COALESCE((
          SELECT max(
            CASE
              WHEN bp.name_text = t THEN 90
              WHEN bp.name_text LIKE t || '%' THEN 70
              WHEN bp.name_text LIKE '%' || t || '%' THEN 55
              WHEN bp.search_text LIKE '%' || replace(t, ' ', '%') || '%'
                THEN 35
              ELSE 0
            END
          )
          FROM unnest(eq.terms) AS t
        ), 0)
        +
        CASE
          WHEN eq.effective_category_slug IS NOT NULL
            AND bp.categoria_slug = eq.effective_category_slug
          THEN 35
          ELSE 0
        END
        +
        CASE
          WHEN eq.requested_subcategory_slug IS NOT NULL
            AND bp.subcategoria_slug = eq.requested_subcategory_slug
          THEN 25
          ELSE 0
        END
      ) * eq.alias_boost AS relevance
    FROM base_products AS bp
    CROSS JOIN expanded_query AS eq
    WHERE
      (
        eq.effective_category_slug IS NULL
        OR bp.categoria_slug = eq.effective_category_slug
      )
      AND (
        eq.requested_subcategory_slug IS NULL
        OR bp.subcategoria_slug = eq.requested_subcategory_slug
      )
      AND (
        eq.collection_slug IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.product_collection_assignments AS pca2
          JOIN public.product_collections AS pc2
            ON pc2.id = pca2.collection_id
          WHERE pca2.producto_b2b_id = bp.id
            AND pc2.slug = eq.collection_slug
            AND pc2.is_active = true
        )
      )
      AND (
        p_min_price IS NULL
        OR bp.precio_desde_mxn >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR bp.precio_desde_mxn <= p_max_price
      )
      AND (
        eq.q = ''
        OR bp.search_text LIKE '%' || replace(eq.q, ' ', '%') || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(eq.terms) AS t
          WHERE bp.search_text LIKE '%' || replace(t, ' ', '%') || '%'
        )
        OR (
          eq.effective_category_slug IS NOT NULL
          AND bp.categoria_slug = eq.effective_category_slug
        )
      )
  ),
  ranked AS (
    SELECT
      s.*,
      count(*) OVER () AS total_count
    FROM scored AS s
    WHERE s.relevance > 0
       OR s.q = ''
    ORDER BY
      CASE WHEN s.q = '' THEN 0 ELSE s.relevance END DESC,
      s.precio_desde_mxn ASC NULLS LAST,
      s.id ASC
    LIMIT (SELECT safe_limit FROM expanded_query)
    OFFSET (SELECT safe_offset FROM expanded_query)
  )
  SELECT
    r.id,
    r.id_interno,
    r.sku_base,
    r.nombre,
    r.descripcion,
    r.imagenes,
    r.precio_desde_mxn,
    r.public_price_status,
    r.currency,
    r.minimum_quantity,
    r.pricing_generation_id,
    r.categoria_slug,
    r.categoria_nombre,
    r.subcategoria_slug,
    r.subcategoria_nombre,
    r.relevance,
    r.total_count
  FROM ranked AS r;
$function$;
