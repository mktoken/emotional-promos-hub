-- CHK-CATGOV-05H — read-only default plan generator v1
-- This query generates the exact activation table; it performs no writes.
-- It must return 104 rows before the activation migration is allowed to run.

BEGIN TRANSACTION READ ONLY;

WITH approved_geomfix(provider_sku) AS (
  VALUES
    ('vas-nom-ve1'), ('vas-nom-az1'), ('cen-met-neg'), ('moc-dia-azu'),
    ('lib-ski-vec'), ('lob-sol-neg'), ('imp-neg-cro'), ('vas-nom-ro1'),
    ('lob-sol-bla'), ('lib-bor-azu'), ('jel-zen-ver'), ('lib-pea-aob'),
    ('spl-sol-azu'), ('lon-del-gob'), ('lob-sol-azu'), ('spl-sol-roj')
),
g4_models AS (
  SELECT md.id AS model_id, md.model_key
  FROM public.catalog_product_models md
  WHERE left(md.model_key, 3) = 'G4_'
),
candidate_rows AS (
  SELECT
    gm.model_id,
    gm.model_key,
    m.producto_b2b_id AS default_product_id,
    COALESCE(rp.provider_sku, o.variant_sku, pp.sku_base, pp.id_interno) AS default_provider_sku,
    m.is_public_default AS currently_default,
    pp.id IS NOT NULL
      AND (
        m.oferta_id IS NULL
        OR (
          o.id IS NOT NULL
          AND o.activo IS NOT FALSE
          AND os.disponibilidad = 'disponible'
        )
      ) AS public_eligible,
    NULLIF(trim(v.variant->>'imagen_url'), '') AS provider_image_url,
    EXISTS (
      SELECT 1
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
        AND NULLIF(trim(a.public_url), '') IS NOT NULL
    ) AS approved_asset_available
  FROM g4_models gm
  JOIN public.catalog_product_model_members m ON m.model_id = gm.model_id
  LEFT JOIN public.productos_publicos pp ON pp.id = m.producto_b2b_id
  LEFT JOIN public.producto_proveedor_ofertas o ON o.id = m.oferta_id
  LEFT JOIN public.producto_proveedor_stock os ON os.oferta_id = m.oferta_id
  LEFT JOIN public.provider_raw_products rp ON rp.id = o.provider_raw_product_id
  LEFT JOIN LATERAL (
    SELECT v0.variant
    FROM jsonb_array_elements(COALESCE(pp.variantes, '[]'::jsonb)) v0(variant)
    WHERE m.oferta_id IS NOT NULL
      AND v0.variant->>'oferta_id' = m.oferta_id::text
    ORDER BY v0.variant->>'imagen_url'
    LIMIT 1
  ) v ON true
),
ranked AS (
  SELECT
    c.*,
    CASE
      WHEN c.currently_default
       AND c.public_eligible
       AND (c.approved_asset_available OR c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/')
        THEN 0
      WHEN c.approved_asset_available
       AND EXISTS (SELECT 1 FROM approved_geomfix g WHERE g.provider_sku = c.default_provider_sku)
        THEN 1
      WHEN c.approved_asset_available THEN 2
      WHEN c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/' THEN 3
      ELSE 99
    END AS image_priority,
    row_number() OVER (
      PARTITION BY c.model_id
      ORDER BY
        CASE
          WHEN c.currently_default
           AND c.public_eligible
           AND (c.approved_asset_available OR c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/')
            THEN 0
          WHEN c.approved_asset_available
           AND EXISTS (SELECT 1 FROM approved_geomfix g WHERE g.provider_sku = c.default_provider_sku)
            THEN 1
          WHEN c.approved_asset_available THEN 2
          WHEN c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/' THEN 3
          ELSE 99
        END,
        lower(c.default_provider_sku),
        c.default_product_id
    ) AS default_rank
  FROM candidate_rows c
  WHERE c.public_eligible
    AND (c.approved_asset_available OR c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/')
)
SELECT
  r.model_id,
  r.model_key,
  r.default_product_id,
  r.default_provider_sku,
  CASE
    WHEN r.image_priority = 0 THEN 'PRESERVED_EXISTING_VALID_DEFAULT'
    WHEN r.image_priority = 1 THEN 'APPROVED_GEOMFIX'
    WHEN r.image_priority = 2 THEN 'CATALOG_MASTER'
    ELSE 'G4_PROVIDER_FALLBACK'
  END AS default_reason,
  CASE
    WHEN r.image_priority IN (0, 1, 2) THEN 'APPROVED_ASSET'
    ELSE 'G4_PROVIDER_FALLBACK'
  END AS image_source
FROM ranked r
WHERE r.default_rank = 1
ORDER BY r.model_key, r.default_provider_sku, r.default_product_id;

ROLLBACK;
