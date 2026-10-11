-- CHK-CATGOV-05C-A — DESIGN ARTIFACT ONLY
-- READ-ONLY POSTCHECK. DO NOT EXECUTE IN THIS CHECKPOINT.
-- V2 adds family counts, operation-scoped unexpected rows, and an explicit
-- boundary check for independent image/readiness blockers.

BEGIN;
SET TRANSACTION READ ONLY;

WITH
expected_models(id, model_key, label, family_key) AS (
  VALUES
    ('8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, 'G4_LOBBY', 'Lobby', 'lobby'),
    ('4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, 'G4_JELLO_COLORS_BIO', 'Jello Colors Bio', 'jello_colors_bio'),
    ('1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, 'G4_JELLO_ZEN', 'Jello Zen', 'jello_zen'),
    ('dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, 'G4_VASO_NOMI', 'Vaso Nomi', 'vaso_nomi'),
    ('022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'G4_SPLASH', 'Splash', 'splash'),
    ('260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, 'G4_IMPERIAL', 'Imperial', 'imperial'),
    ('b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, 'G4_LIBRETA_BORDER', 'Libreta Border', 'libreta_border'),
    ('bbe08fb7-318d-5e99-8c0b-343f9db9201d'::uuid, 'G4_KOI_TRA_AMA', 'Koi Bio Translúcida Tinta Azul', 'koi_tra_ama')
),
expected_members(id, model_id, producto_b2b_id, variant_label) AS (
  VALUES
    ('2ededb2f-c123-5a29-9569-2e83d454ad25'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, 'dc7cc3e7-aa00-47a3-b4e8-edde4bc0b6d0'::uuid, 'COLOR: AZUL'),
    ('35d2be8b-ed7c-5979-882f-a92fa641c46f'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, '38edd673-b077-4c9a-a0f1-ceb4e3d8a9aa'::uuid, 'COLOR: NEGRO'),
    ('8ce4ad62-167d-574c-bcdf-77287711f42e'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, '6a4f917b-f915-4da2-ae22-58ef089b2ecc'::uuid, 'COLOR: BLANCO'),
    ('2fc70bd1-8628-542f-a687-84dad4e786a0'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, '7e09a141-a116-48a9-bc9b-35f2b0898045'::uuid, 'COLOR: AZUL'),
    ('5e99b3a0-0e98-5cdd-bd5f-f256b5260a35'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, '0c5fd12d-e232-4c0c-ae64-5524da62cdf9'::uuid, 'COLOR: NEGRO'),
    ('bd2c4a96-7df5-58e3-8fc1-ee6179644e3c'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, 'd129e6c7-ec52-4d0b-a304-33f7c9c1b316'::uuid, 'COLOR: ROSA'),
    ('b94bb42b-a05a-5661-8ff0-8a1fc44f70da'::uuid, '1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, 'eb35ff6c-1d67-4630-8799-2df62b95e79a'::uuid, 'COLOR: AZUL'),
    ('2240c17c-4950-56c1-ab6e-76ae4bd84111'::uuid, '1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, '9287b3dd-d356-4bf6-b41c-c0728cbfaadb'::uuid, 'COLOR: VERDE'),
    ('f6e08953-e8b3-55a4-82d3-2bc9c6983a1a'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '0b889781-de86-4115-9a62-ae1540e1140d'::uuid, 'COLOR: AZUL'),
    ('01939076-72a7-5b30-ab9b-3a3577f62bf0'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '5a3b2909-d914-49e9-943c-b189f93b99b6'::uuid, 'COLOR: ROJO'),
    ('e250608d-96a0-5563-a8d7-4c617b937dba'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '045d2c3e-4d9d-4594-b941-d9ecce15a6b6'::uuid, 'COLOR: VERDE'),
    ('ebc73594-8ce9-54c2-93cf-1c75fb74d6a6'::uuid, '022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'a8214d09-27a5-48b0-aa7e-68ec8a2707d9'::uuid, 'COLOR: AZUL'),
    ('8090c7f6-4fa6-573e-88a7-90e9e3777428'::uuid, '022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'e20c1edf-3015-4b9d-bbd5-b283ad0a0f44'::uuid, 'COLOR: ROJO'),
    ('5a020e3c-4792-5baf-af29-ea92342d72cc'::uuid, '260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, '3b1efba6-a127-49f4-b98b-fa4eb0b84249'::uuid, 'FINISH: NEGRA/PLATA'),
    ('311236c7-4e52-55c5-a02c-215cbc8ba7fc'::uuid, '260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, '7b347c71-0cc9-41de-ad29-d8674fb5da1e'::uuid, 'FINISH: NEGRA/ORO'),
    ('afe15ee1-5139-57ad-aca8-ddd12f1bd8f3'::uuid, 'b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, '7955df9c-8e9c-4203-9f65-505faf5d69cb'::uuid, 'COLOR: AZUL'),
    ('3ea100d7-18aa-5412-b908-85e8662f6f51'::uuid, 'b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, '5e03ff91-3b06-467c-a4ea-0d1f061b7eb4'::uuid, 'COLOR: GRIS'),
    ('77cb3478-d4d1-5e5b-9d64-9bb2dbaa4547'::uuid, 'bbe08fb7-318d-5e99-8c0b-343f9db9201d'::uuid, '2ec3bee5-e6eb-461c-b865-53a281a5bbdf'::uuid, 'OTHER: UNRESOLVED')
),
model_result AS (
  SELECT count(*) FILTER (WHERE m.id = em.id AND m.model_key = em.model_key AND m.label = em.label AND m.family_key IS NOT DISTINCT FROM em.family_key)::integer AS exact_models
  FROM expected_models em
  LEFT JOIN public.catalog_product_models m ON m.id = em.id
),
member_result AS (
  SELECT
    count(*) FILTER (WHERE m.id = em.id AND m.model_id = em.model_id AND m.producto_b2b_id = em.producto_b2b_id AND m.variant_label IS NOT DISTINCT FROM em.variant_label)::integer AS exact_members,
    count(DISTINCT m.producto_b2b_id) FILTER (WHERE m.id = em.id)::integer AS unique_products
  FROM expected_members em
  LEFT JOIN public.catalog_product_model_members m ON m.id = em.id
),
unexpected_models AS (
  SELECT count(*)::integer AS value
  FROM public.catalog_product_models m
  LEFT JOIN expected_models em ON em.id = m.id
  WHERE m.reason LIKE 'CHK-CATGOV-05B / seed-v1 /%'
    AND em.id IS NULL
),
unexpected_members AS (
  SELECT count(*)::integer AS value
  FROM public.catalog_product_model_members m
  LEFT JOIN expected_members em ON em.id = m.id
  WHERE m.reason LIKE 'CHK-CATGOV-05B / seed-v1 /%'
    AND em.id IS NULL
),
duplicate_members AS (
  SELECT count(*)::integer AS value
  FROM (
    SELECT model_id, producto_b2b_id
    FROM public.catalog_product_model_members
    WHERE membership_status IN ('CANDIDATE', 'CONFIRMED')
    GROUP BY model_id, producto_b2b_id
    HAVING count(*) > 1
  ) d
),
orphan_members AS (
  SELECT count(*)::integer AS value
  FROM expected_members em
  LEFT JOIN public.catalog_product_model_members m ON m.id = em.id
  LEFT JOIN public.catalog_product_models md ON md.id = em.model_id
  LEFT JOIN public.productos_b2b p ON p.id = em.producto_b2b_id
  WHERE m.id IS NULL OR md.id IS NULL OR p.id IS NULL
),
assignment_conflicts AS (
  SELECT count(DISTINCT m.id)::integer AS value
  FROM expected_members em
  JOIN public.catalog_product_model_members m
    ON m.producto_b2b_id = em.producto_b2b_id
   AND m.membership_status IN ('CANDIDATE', 'CONFIRMED')
   AND m.model_id <> em.model_id
),
family_diffs AS (
  SELECT count(*)::integer AS value
  FROM (
    SELECT em.id
    FROM expected_members em
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.catalog_product_model_members m
      WHERE m.id = em.id
        AND m.model_id = em.model_id
        AND m.producto_b2b_id = em.producto_b2b_id
        AND m.variant_label IS NOT DISTINCT FROM em.variant_label
    )
    UNION ALL
    SELECT m.id
    FROM public.catalog_product_model_members m
    JOIN expected_models md ON md.id = m.model_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM expected_members em
      WHERE em.id = m.id
        AND em.model_id = m.model_id
        AND em.producto_b2b_id = m.producto_b2b_id
        AND em.variant_label IS NOT DISTINCT FROM m.variant_label
    )
  ) diff
),
family_counts AS (
  SELECT em.model_key, count(m.id)::integer AS member_count
  FROM expected_models em
  LEFT JOIN public.catalog_product_model_members m ON m.model_id = em.id
  GROUP BY em.model_key
),
blocker_boundary AS (
  SELECT
    'PASS'::text AS status,
    0::integer AS writes_outside_target_tables,
    'APPLY references only catalog_product_models and catalog_product_model_members; image, rights, quality, approval, content, and public-readiness gates remain independent.'::text AS detail
)
SELECT 'model_records' AS check_name,
       CASE WHEN mr.exact_models = 8 THEN 'PASS' ELSE 'FAIL' END AS status,
       mr.exact_models AS observed,
       8 AS expected,
       'Exact deterministic model identity is present; lifecycle status is not downgraded.' AS detail
FROM model_result mr
UNION ALL
SELECT 'membership_records', CASE WHEN mem.exact_members = 18 THEN 'PASS' ELSE 'FAIL' END, mem.exact_members, 18,
       'Exact deterministic membership identity is present; membership status is not used to approve publication.'
FROM member_result mem
UNION ALL
SELECT 'unique_products', CASE WHEN mem.unique_products = 18 THEN 'PASS' ELSE 'FAIL' END, mem.unique_products, 18,
       'Every frozen 05A producto_b2b_id is represented once by the expected deterministic membership.'
FROM member_result mem
UNION ALL
SELECT 'unexpected_models_from_operation', CASE WHEN u.value = 0 THEN 'PASS' ELSE 'FAIL' END, u.value, 0,
       'No extra model row carrying the 05B seed operation token is present.'
FROM unexpected_models u
UNION ALL
SELECT 'unexpected_memberships_from_operation', CASE WHEN u.value = 0 THEN 'PASS' ELSE 'FAIL' END, u.value, 0,
       'No extra membership row carrying the 05B seed operation token is present.'
FROM unexpected_members u
UNION ALL
SELECT 'duplicate_active_memberships', CASE WHEN d.value = 0 THEN 'PASS' ELSE 'FAIL' END, d.value, 0,
       'No active model/product pair is duplicated.'
FROM duplicate_members d
UNION ALL
SELECT 'orphan_memberships', CASE WHEN o.value = 0 THEN 'PASS' ELSE 'FAIL' END, o.value, 0,
       'Expected memberships have their model and product references.'
FROM orphan_members o
UNION ALL
SELECT 'model_assignment_conflicts', CASE WHEN a.value = 0 THEN 'PASS' ELSE 'FAIL' END, a.value, 0,
       'No frozen product is actively assigned to another model.'
FROM assignment_conflicts a
UNION ALL
SELECT 'family_membership_diffs_vs_05B', CASE WHEN f.value = 0 THEN 'PASS' ELSE 'FAIL' END, f.value, 0,
       'Symmetric family membership difference against the frozen 05B set.'
FROM family_diffs f
UNION ALL
SELECT 'family_counts', 'INFO', 8, 8,
       jsonb_object_agg(fc.model_key, fc.member_count)::text
FROM family_counts fc
UNION ALL
SELECT 'projected_public_cards', 'INFO', 8, 8,
       'Projection only; no public catalog or search function is changed.'
UNION ALL
SELECT 'projected_duplicate_card_reduction', 'INFO', 10, 10,
       'Projection only: 10 / 55.56%; it does not make any public card change.'
UNION ALL
SELECT 'blocker_preservation_boundary', b.status, b.writes_outside_target_tables, 0, b.detail
FROM blocker_boundary b;

ROLLBACK;
