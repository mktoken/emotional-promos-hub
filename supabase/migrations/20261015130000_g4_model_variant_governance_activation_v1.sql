-- CHK-CATGOV-05H — G4 model/variant governance activation v1
-- Prepared only. Do not apply in this checkpoint.
--
-- This migration activates only the 104 G4 models and their exact 289
-- memberships already created by 20261015110000_g4_model_variant_governance_coverage_v1.sql.
-- It does not create models, memberships, products, assets, mappings, stock,
-- prices, categories, visibility records, or provider data.
--
-- Image decisions remain an independent apply surface. The 16 approved
-- geometric replacements are packaged locally; this SQL does not upload or
-- publish them. The five provider-fallback decisions are not asset approvals.

BEGIN;
SET TRANSACTION READ WRITE;

DO $preflight$
DECLARE
  v_model_count bigint;
  v_membership_count bigint;
  v_model_state_conflicts bigint;
  v_membership_state_conflicts bigint;
  v_duplicate_default_models bigint;
BEGIN
  IF to_regclass('public.catalog_product_models') IS NULL
     OR to_regclass('public.catalog_product_model_members') IS NULL
     OR to_regclass('public.productos_publicos') IS NULL
     OR to_regclass('public.producto_proveedor_ofertas') IS NULL
     OR to_regclass('public.producto_proveedor_stock') IS NULL
     OR to_regclass('public.provider_raw_products') IS NULL THEN
    RAISE EXCEPTION 'G4 activation blocked: required catalog/governance tables are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_product_model_members'
      AND column_name = 'is_public_default'
  ) THEN
    RAISE EXCEPTION 'G4 activation blocked: is_public_default is missing; apply the model projection migration first';
  END IF;

  SELECT count(*)
  INTO v_model_count
  FROM public.catalog_product_models
  WHERE left(model_key, 3) = 'G4_';

  SELECT count(*)
  INTO v_membership_count
  FROM public.catalog_product_model_members m
  JOIN public.catalog_product_models md ON md.id = m.model_id
  WHERE left(md.model_key, 3) = 'G4_'
    AND m.membership_status IN ('CANDIDATE', 'CONFIRMED');

  SELECT count(*)
  INTO v_model_state_conflicts
  FROM public.catalog_product_models
  WHERE left(model_key, 3) = 'G4_'
    AND status NOT IN ('REVIEW_REQUIRED', 'APPROVED');

  SELECT count(*)
  INTO v_membership_state_conflicts
  FROM public.catalog_product_model_members m
  JOIN public.catalog_product_models md ON md.id = m.model_id
  WHERE left(md.model_key, 3) = 'G4_'
    AND m.membership_status NOT IN ('CANDIDATE', 'CONFIRMED');

  SELECT count(*)
  INTO v_duplicate_default_models
  FROM (
    SELECT m.model_id
    FROM public.catalog_product_model_members m
    JOIN public.catalog_product_models md ON md.id = m.model_id
    WHERE left(md.model_key, 3) = 'G4_'
      AND m.is_public_default = true
    GROUP BY m.model_id
    HAVING count(*) > 1
  ) duplicates;

  IF v_model_count <> 104
     OR v_membership_count <> 289
     OR v_model_state_conflicts <> 0
     OR v_membership_state_conflicts <> 0
     OR v_duplicate_default_models <> 0 THEN
    RAISE EXCEPTION
      'G4 activation blocked: expected models=104 memberships=289 state_conflicts=0/0 duplicate_default_models=0; got models=% memberships=% model_state_conflicts=% membership_state_conflicts=% duplicate_default_models=%',
      v_model_count,
      v_membership_count,
      v_model_state_conflicts,
      v_membership_state_conflicts,
      v_duplicate_default_models;
  END IF;
END
$preflight$;

CREATE TEMP TABLE _g4_activation_default_plan (
  model_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  model_key text NOT NULL,
  default_product_id uuid NOT NULL,
  default_provider_sku text NOT NULL,
  default_reason text NOT NULL,
  image_source text NOT NULL,
  PRIMARY KEY (model_id)
) ON COMMIT DROP;

INSERT INTO _g4_activation_default_plan (
  model_id,
  membership_id,
  model_key,
  default_product_id,
  default_provider_sku,
  default_reason,
  image_source
)
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
    m.id AS membership_id,
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
    AND (
      c.approved_asset_available
      OR c.provider_image_url ~* '^https://(www\.)?g4mexico\.com\.mx/'
    )
)
SELECT
  r.model_id,
  r.membership_id,
  r.model_key,
  r.default_product_id,
  r.default_provider_sku,
  CASE
    WHEN r.image_priority = 0 THEN 'PRESERVED_EXISTING_VALID_DEFAULT'
    WHEN r.image_priority = 1 THEN 'APPROVED_GEOMFIX'
    WHEN r.image_priority = 2 THEN 'CATALOG_MASTER'
    ELSE 'G4_PROVIDER_FALLBACK'
  END,
  CASE
    WHEN r.image_priority IN (0, 1, 2) THEN 'APPROVED_ASSET'
    ELSE 'G4_PROVIDER_FALLBACK'
  END
FROM ranked r
WHERE r.default_rank = 1;

DO $plan_check$
DECLARE
  v_plan_models bigint;
  v_plan_defaults bigint;
  v_models_without_default bigint;
  v_multiple_defaults bigint;
BEGIN
  SELECT count(*), count(DISTINCT model_id)
  INTO v_plan_defaults, v_plan_models
  FROM _g4_activation_default_plan;

  SELECT count(*)
  INTO v_models_without_default
  FROM (
    SELECT md.id
    FROM public.catalog_product_models md
    WHERE left(md.model_key, 3) = 'G4_'
    EXCEPT
    SELECT p.model_id FROM _g4_activation_default_plan p
  ) missing;

  SELECT count(*)
  INTO v_multiple_defaults
  FROM (
    SELECT p.model_id
    FROM _g4_activation_default_plan p
    GROUP BY p.model_id
    HAVING count(*) > 1
  ) duplicates;

  IF v_plan_models <> 104
     OR v_plan_defaults <> 104
     OR v_models_without_default <> 0
     OR v_multiple_defaults <> 0 THEN
    RAISE EXCEPTION
      'G4 activation blocked: defaults expected models=104 defaults=104 missing=0 duplicates=0; got models=% defaults=% missing=% duplicates=%',
      v_plan_models,
      v_plan_defaults,
      v_models_without_default,
      v_multiple_defaults;
  END IF;
END
$plan_check$;

UPDATE public.catalog_product_models md
SET
  status = 'APPROVED',
  reason = 'CHK-CATGOV-05H: G4 model activation; identity universe preserved, image/publication gates remain separate.',
  updated_at = now()
WHERE left(md.model_key, 3) = 'G4_'
  AND md.status <> 'APPROVED';

UPDATE public.catalog_product_model_members m
SET
  membership_status = 'CONFIRMED',
  reason = 'CHK-CATGOV-05H: G4 membership confirmation; exact product/offer relationship preserved, image/publication gates remain separate.',
  updated_at = now()
FROM public.catalog_product_models md
WHERE md.id = m.model_id
  AND left(md.model_key, 3) = 'G4_'
  AND m.membership_status <> 'CONFIRMED';

UPDATE public.catalog_product_model_members m
SET
  is_public_default = false,
  updated_at = now()
FROM public.catalog_product_models md
WHERE md.id = m.model_id
  AND left(md.model_key, 3) = 'G4_'
  AND m.is_public_default = true;

UPDATE public.catalog_product_model_members m
SET
  is_public_default = true,
  updated_at = now()
FROM _g4_activation_default_plan p
WHERE p.model_id = m.model_id
  AND p.membership_id = m.id;

DO $postcheck$
DECLARE
  v_models bigint;
  v_memberships bigint;
  v_defaults bigint;
  v_duplicate_default_models bigint;
BEGIN
  SELECT count(*) INTO v_models
  FROM public.catalog_product_models
  WHERE left(model_key, 3) = 'G4_' AND status = 'APPROVED';

  SELECT count(*) INTO v_memberships
  FROM public.catalog_product_model_members m
  JOIN public.catalog_product_models md ON md.id = m.model_id
  WHERE left(md.model_key, 3) = 'G4_'
    AND m.membership_status = 'CONFIRMED';

  SELECT count(*) INTO v_defaults
  FROM public.catalog_product_model_members m
  JOIN public.catalog_product_models md ON md.id = m.model_id
  WHERE left(md.model_key, 3) = 'G4_'
    AND m.is_public_default = true;

  SELECT count(*) INTO v_duplicate_default_models
  FROM (
    SELECT m.model_id
    FROM public.catalog_product_model_members m
    JOIN public.catalog_product_models md ON md.id = m.model_id
    WHERE left(md.model_key, 3) = 'G4_'
      AND m.is_public_default = true
    GROUP BY m.model_id
    HAVING count(*) > 1
  ) duplicates;

  IF v_models <> 104
     OR v_memberships <> 289
     OR v_defaults <> 104
     OR v_duplicate_default_models <> 0 THEN
    RAISE EXCEPTION
      'G4 activation postcheck failed: expected models=104 memberships=289 defaults=104 duplicate_default_models=0; got models=% memberships=% defaults=% duplicate_default_models=%',
      v_models,
      v_memberships,
      v_defaults,
      v_duplicate_default_models;
  END IF;
END
$postcheck$;

COMMIT;
