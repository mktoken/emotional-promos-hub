-- CHK-CATGOV-05C-A — DESIGN ARTIFACT ONLY
-- DATA-ONLY APPLY PACKAGE. DO NOT EXECUTE IN THIS CHECKPOINT.
-- Run only after PRECHECK_V2 returns READY_TO_APPLY = true.
-- The two target tables are the only write surfaces in this file.

BEGIN;
SET TRANSACTION READ WRITE;

-- Models first. ON CONFLICT DO NOTHING is fail-safe replay behavior: it never
-- replaces an existing row. PRECHECK_V2 must reject incompatible conflicts.
INSERT INTO public.catalog_product_models
  (id, model_key, label, family_key, status, reason, created_by, reviewed_by, reviewed_at)
VALUES
  ('8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, 'G4_LOBBY', 'Lobby', 'lobby', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE from frozen 05A family decision; color variants remain commercial-specific.', NULL, NULL, NULL),
  ('4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, 'G4_JELLO_COLORS_BIO', 'Jello Colors Bio', 'jello_colors_bio', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE from frozen 05A exact family/color evidence; variant image gates remain independent.', NULL, NULL, NULL),
  ('1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, 'G4_JELLO_ZEN', 'Jello Zen', 'jello_zen', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE from frozen 05A exact family/color evidence; variant image gates remain independent.', NULL, NULL, NULL),
  ('dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, 'G4_VASO_NOMI', 'Vaso Nomi', 'vaso_nomi', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE from frozen 05A certified multi-variant family evidence.', NULL, NULL, NULL),
  ('022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'G4_SPLASH', 'Splash', 'splash', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE from frozen 05A certified multi-variant family evidence.', NULL, NULL, NULL),
  ('260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, 'G4_IMPERIAL', 'Imperial', 'imperial', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE family proposal; imp-neg-oro remains NO_VALID_MASTER and is not publishable.', NULL, NULL, NULL),
  ('b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, 'G4_LIBRETA_BORDER', 'Libreta Border', 'libreta_border', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / MODEL_COMPATIBLE family proposal; lib-bor-gri remains NO_VALID_MASTER and is not publishable.', NULL, NULL, NULL),
  ('bbe08fb7-318d-5e99-8c0b-343f9db9201d'::uuid, 'G4_KOI_TRA_AMA', 'Koi Bio Translúcida Tinta Azul', 'koi_tra_ama', 'REVIEW_REQUIRED', 'CHK-CATGOV-05B / seed-v1 / KEEP_SEPARATE single-member candidate; identity remains BANK_MATCH_REVIEW_REQUIRED.', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Memberships second. Values are copied from the certified 05B payload; no
-- SKU parsing, color inference, provider consolidation, or image approval.
INSERT INTO public.catalog_product_model_members
  (id, model_id, producto_b2b_id, oferta_id, variant_label, membership_status, evidence_id, reason, reviewed_by, reviewed_at)
VALUES
  ('2ededb2f-c123-5a29-9569-2e83d454ad25'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, 'dc7cc3e7-aa00-47a3-b4e8-edde4bc0b6d0'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', 'ac309908-28e7-5e9a-bada-69ad837b3664'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('35d2be8b-ed7c-5979-882f-a92fa641c46f'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, '38edd673-b077-4c9a-a0f1-ceb4e3d8a9aa'::uuid, NULL, 'COLOR: NEGRO', 'CANDIDATE', 'e31213fc-b071-57fb-a0eb-4d7f98e8bce8'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('8ce4ad62-167d-574c-bcdf-77287711f42e'::uuid, '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid, '6a4f917b-f915-4da2-ae22-58ef089b2ecc'::uuid, NULL, 'COLOR: BLANCO', 'CANDIDATE', '7a4adb69-b4b4-5a1f-9cdc-45c7ae4c2062'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('2fc70bd1-8628-542f-a687-84dad4e786a0'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, '7e09a141-a116-48a9-bc9b-35f2b0898045'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', '68ea5e2d-d818-5c95-a1d3-554d97f9c91b'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; SOURCE_MASTER_INSUFFICIENT remains independent.', NULL, NULL),
  ('5e99b3a0-0e98-5cdd-bd5f-f256b5260a35'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, '0c5fd12d-e232-4c0c-ae64-5524da62cdf9'::uuid, NULL, 'COLOR: NEGRO', 'CANDIDATE', 'c15d01cb-652c-5513-9bc3-843a0698aadf'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; SOURCE_MASTER_INSUFFICIENT remains independent.', NULL, NULL),
  ('bd2c4a96-7df5-58e3-8fc1-ee6179644e3c'::uuid, '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid, 'd129e6c7-ec52-4d0b-a304-33f7c9c1b316'::uuid, NULL, 'COLOR: ROSA', 'CANDIDATE', 'b84289f3-b3f2-5bb9-b34d-ea686fd9a006'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; SOURCE_MASTER_INSUFFICIENT remains independent.', NULL, NULL),
  ('b94bb42b-a05a-5661-8ff0-8a1fc44f70da'::uuid, '1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, 'eb35ff6c-1d67-4630-8799-2df62b95e79a'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', 'd42ebe19-8ac4-5bdc-9922-50d9d33c86ca'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; SOURCE_MASTER_INSUFFICIENT remains independent.', NULL, NULL),
  ('2240c17c-4950-56c1-ab6e-76ae4bd84111'::uuid, '1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid, '9287b3dd-d356-4bf6-b41c-c0728cbfaadb'::uuid, NULL, 'COLOR: VERDE', 'CANDIDATE', 'dbc7d795-ead0-55ba-8b71-85f444cef95e'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; SOURCE_MASTER_INSUFFICIENT remains independent.', NULL, NULL),
  ('f6e08953-e8b3-55a4-82d3-2bc9c6983a1a'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '0b889781-de86-4115-9a62-ae1540e1140d'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', 'c97eee8b-7391-5bb4-a2f6-3c6a0c83c709'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('01939076-72a7-5b30-ab9b-3a3577f62bf0'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '5a3b2909-d914-49e9-943c-b189f93b99b6'::uuid, NULL, 'COLOR: ROJO', 'CANDIDATE', '88e9fcb0-2a85-549a-88d6-0faa7d7324cf'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('e250608d-96a0-5563-a8d7-4c617b937dba'::uuid, 'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid, '045d2c3e-4d9d-4594-b941-d9ecce15a6b6'::uuid, NULL, 'COLOR: VERDE', 'CANDIDATE', '4998e130-27fb-5cd2-a1a3-b557e8c8f682'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('ebc73594-8ce9-54c2-93cf-1c75fb74d6a6'::uuid, '022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'a8214d09-27a5-48b0-aa7e-68ec8a2707d9'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', 'a8f03b06-72dc-5167-8fc4-ddddca3f2371'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('8090c7f6-4fa6-573e-88a7-90e9e3777428'::uuid, '022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid, 'e20c1edf-3015-4b9d-bbd5-b283ad0a0f44'::uuid, NULL, 'COLOR: ROJO', 'CANDIDATE', '1d6d265c-891d-582c-a092-0a5153d9a19f'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; asset and publication gates remain independent.', NULL, NULL),
  ('5a020e3c-4792-5baf-af29-ea92342d72cc'::uuid, '260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, '3b1efba6-a127-49f4-b98b-fa4eb0b84249'::uuid, NULL, 'FINISH: NEGRA/PLATA', 'CANDIDATE', 'faa25723-d44b-5645-99e6-63b03fa41829'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; imp-neg-oro remains blocked separately.', NULL, NULL),
  ('311236c7-4e52-55c5-a02c-215cbc8ba7fc'::uuid, '260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid, '7b347c71-0cc9-41de-ad29-d8674fb5da1e'::uuid, NULL, 'FINISH: NEGRA/ORO', 'CANDIDATE', 'd01becba-02d1-5244-b0b2-c76096467434'::uuid, 'CHK-CATGOV-05B / seed-v1 / exact family membership only; NO_VALID_MASTER remains a blocker.', NULL, NULL),
  ('afe15ee1-5139-57ad-aca8-ddd12f1bd8f3'::uuid, 'b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, '7955df9c-8e9c-4203-9f65-505faf5d69cb'::uuid, NULL, 'COLOR: AZUL', 'CANDIDATE', '6f63f209-ae2d-54ec-b4e9-3e7eb1a35ed7'::uuid, 'CHK-CATGOV-05B / seed-v1 / frozen 05A membership; lib-bor-gri remains blocked separately.', NULL, NULL),
  ('3ea100d7-18aa-5412-b908-85e8662f6f51'::uuid, 'b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid, '5e03ff91-3b06-467c-a4ea-0d1f061b7eb4'::uuid, NULL, 'COLOR: GRIS', 'CANDIDATE', 'a2c76b43-7965-5cf6-a397-c54cd7cece88'::uuid, 'CHK-CATGOV-05B / seed-v1 / exact family membership only; NO_VALID_MASTER remains a blocker.', NULL, NULL),
  ('77cb3478-d4d1-5e5b-9d64-9bb2dbaa4547'::uuid, 'bbe08fb7-318d-5e99-8c0b-343f9db9201d'::uuid, '2ec3bee5-e6eb-461c-b865-53a281a5bbdf'::uuid, NULL, 'OTHER: UNRESOLVED', 'CANDIDATE', 'f7501dc3-b40c-5fe7-8de7-fd14868785d7'::uuid, 'CHK-CATGOV-05B / seed-v1 / KEEP_SEPARATE single-member candidate; BANK_MATCH_REVIEW_REQUIRED remains open.', NULL, NULL)
ON CONFLICT DO NOTHING;

COMMIT;
