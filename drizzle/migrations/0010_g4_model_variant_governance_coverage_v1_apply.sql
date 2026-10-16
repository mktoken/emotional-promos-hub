-- CHK-CATGOV-05H — G4 model/variant governance coverage v1
-- Repository package only. Applying this migration does not approve or publish
-- any model, membership, image, product, price, stock, or visibility record.
-- The source is the already-public G4 projection; no provider is contacted.


DO $preflight$
DECLARE
  v_rows integer;
  v_models integer;
  v_invalid_offer_rows integer;
BEGIN
  SELECT
    count(*)::integer,
    count(DISTINCT NULLIF(trim(v.variant->>'modelo'), ''))::integer,
    count(*) FILTER (
      WHERE NULLIF(trim(v.variant->>'oferta_id'), '') IS NULL
         OR NULLIF(trim(v.variant->>'oferta_id'), '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )::integer
  INTO v_rows, v_models, v_invalid_offer_rows
  FROM public.productos_publicos pp
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pp.variantes, '[]'::jsonb)) AS v(variant)
  WHERE COALESCE(v.variant->>'imagen_url', '') ~* '^https://(www\.)?g4mexico\.com\.mx/'
    AND NULLIF(trim(v.variant->>'modelo'), '') IS NOT NULL;

  IF v_rows <> 289 OR v_models <> 104 OR v_invalid_offer_rows <> 0 THEN
    RAISE EXCEPTION
      'G4 governance preflight failed: expected 289 public variants / 104 provider models with valid offer IDs; got rows=%, models=%, invalid_offer_rows=%',
      v_rows, v_models, v_invalid_offer_rows;
  END IF;
END
$preflight$;

CREATE TEMP TABLE _g4_governance_variants (
  producto_b2b_id uuid NOT NULL,
  model_code text NOT NULL,
  oferta_id uuid NOT NULL,
  variant_label text,
  PRIMARY KEY (producto_b2b_id, oferta_id)
) ON COMMIT DROP;

INSERT INTO _g4_governance_variants (producto_b2b_id, model_code, oferta_id, variant_label)
SELECT
  pp.id,
  trim(v.variant->>'modelo'),
  (trim(v.variant->>'oferta_id'))::uuid,
  NULLIF(
    concat_ws(
      ' / ',
      CASE WHEN NULLIF(trim(v.variant->>'color_code'), '') IS NOT NULL
        THEN 'COLOR: ' || upper(trim(v.variant->>'color_code')) END,
      CASE WHEN NULLIF(trim(v.variant->>'color_nombre'), '') IS NOT NULL
        THEN 'COLOR NAME: ' || trim(v.variant->>'color_nombre') END,
      CASE WHEN NULLIF(trim(v.variant->>'material'), '') IS NOT NULL
        THEN 'MATERIAL: ' || trim(v.variant->>'material') END
    ),
    ''
  )
FROM public.productos_publicos pp
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pp.variantes, '[]'::jsonb)) AS v(variant)
WHERE COALESCE(v.variant->>'imagen_url', '') ~* '^https://(www\.)?g4mexico\.com\.mx/'
  AND NULLIF(trim(v.variant->>'modelo'), '') IS NOT NULL
  AND NULLIF(trim(v.variant->>'oferta_id'), '') IS NOT NULL;

CREATE TEMP TABLE _g4_governance_models (
  model_code text PRIMARY KEY,
  model_key text NOT NULL UNIQUE,
  label text NOT NULL,
  family_key text NOT NULL,
  model_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO _g4_governance_models (model_code, model_key, label, family_key, model_id)
SELECT
  model_code,
  CASE model_code
    WHEN 'lob-sol' THEN 'G4_LOBBY'
    WHEN 'jbi-con' THEN 'G4_JELLO_COLORS_BIO'
    WHEN 'jel-zen' THEN 'G4_JELLO_ZEN'
    WHEN 'vas-nom' THEN 'G4_VASO_NOMI'
    WHEN 'spl-sol' THEN 'G4_SPLASH'
    WHEN 'imp-neg' THEN 'G4_IMPERIAL'
    WHEN 'lib-bor' THEN 'G4_LIBRETA_BORDER'
    WHEN 'kbi-tra' THEN 'G4_KOI_TRA_AMA'
    ELSE 'G4_PROVIDER_' || regexp_replace(upper(model_code), '[^A-Z0-9]+', '_', 'g')
  END,
  'G4 provider model ' || model_code,
  'g4_' || regexp_replace(lower(model_code), '[^a-z0-9]+', '_', 'g'),
  md5(
    'catalog-model-v1:' || CASE model_code
      WHEN 'lob-sol' THEN 'G4_LOBBY'
      WHEN 'jbi-con' THEN 'G4_JELLO_COLORS_BIO'
      WHEN 'jel-zen' THEN 'G4_JELLO_ZEN'
      WHEN 'vas-nom' THEN 'G4_VASO_NOMI'
      WHEN 'spl-sol' THEN 'G4_SPLASH'
      WHEN 'imp-neg' THEN 'G4_IMPERIAL'
      WHEN 'lib-bor' THEN 'G4_LIBRETA_BORDER'
      WHEN 'kbi-tra' THEN 'G4_KOI_TRA_AMA'
      ELSE 'G4_PROVIDER_' || regexp_replace(upper(model_code), '[^A-Z0-9]+', '_', 'g')
    END
  )::uuid
FROM (SELECT DISTINCT model_code FROM _g4_governance_variants) models;

INSERT INTO public.catalog_product_models (id, model_key, label, family_key, status, reason)
SELECT
  gm.model_id,
  gm.model_key,
  gm.label,
  gm.family_key,
  'REVIEW_REQUIRED',
  'CHK-CATGOV-05H: deterministic provider model coverage only; human identity, image, rights, default, and publication gates remain pending.'
FROM _g4_governance_models gm
ON CONFLICT (model_key) DO NOTHING;

UPDATE _g4_governance_models gm
SET model_id = m.id
FROM public.catalog_product_models m
WHERE m.model_key = gm.model_key;

-- Existing 05B product-level candidates are retained, but when their exact
-- public G4 offer is now available, attach that offer without changing status
-- or default approval. This preserves the model/variant identity contract.
UPDATE public.catalog_product_model_members m
SET oferta_id = gv.oferta_id,
    updated_at = now()
FROM _g4_governance_variants gv
JOIN _g4_governance_models gm ON gm.model_code = gv.model_code
WHERE m.model_id = gm.model_id
  AND m.producto_b2b_id = gv.producto_b2b_id
  AND m.oferta_id IS NULL
  AND m.membership_status IN ('CANDIDATE', 'CONFIRMED')
  AND NOT EXISTS (
    SELECT 1
    FROM public.catalog_product_model_members existing_offer
    WHERE existing_offer.model_id = m.model_id
      AND existing_offer.producto_b2b_id = m.producto_b2b_id
      AND existing_offer.oferta_id = gv.oferta_id
      AND existing_offer.id <> m.id
      AND existing_offer.membership_status IN ('CANDIDATE', 'CONFIRMED')
  );

INSERT INTO public.catalog_product_model_members (
  id,
  model_id,
  producto_b2b_id,
  oferta_id,
  variant_label,
  membership_status,
  reason,
  is_public_default
)
SELECT
  md5('catalog-model-member-v1:' || gm.model_key || ':' || gv.producto_b2b_id::text || ':' || gv.oferta_id::text)::uuid,
  gm.model_id,
  gv.producto_b2b_id,
  gv.oferta_id,
  gv.variant_label,
  'CANDIDATE',
  'CHK-CATGOV-05H: exact public G4 product/offer evidence; image, rights, human confirmation, default, and publication gates remain pending.',
  false
FROM _g4_governance_variants gv
JOIN _g4_governance_models gm ON gm.model_code = gv.model_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalog_product_model_members existing_member
  WHERE existing_member.model_id = gm.model_id
    AND existing_member.producto_b2b_id = gv.producto_b2b_id
    AND existing_member.oferta_id = gv.oferta_id
    AND existing_member.membership_status IN ('CANDIDATE', 'CONFIRMED')
)
ON CONFLICT (id) DO NOTHING;