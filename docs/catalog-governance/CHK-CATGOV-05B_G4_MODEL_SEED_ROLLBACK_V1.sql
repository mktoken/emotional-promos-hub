-- CHK-CATGOV-05B — DESIGN ARTIFACT ONLY
-- BOUNDED ROLLBACK DESIGN. DO NOT EXECUTE IN THIS CHECKPOINT.
-- If later authorized, review precheck and postcheck results first.

BEGIN;
SET TRANSACTION READ WRITE;

-- Memberships first to respect foreign keys. The reason token prevents removal
-- of a row that was later repurposed or reviewed by another operation.
DELETE FROM public.catalog_product_model_members
WHERE id IN (
  '2ededb2f-c123-5a29-9569-2e83d454ad25'::uuid,
  '35d2be8b-ed7c-5979-882f-a92fa641c46f'::uuid,
  '8ce4ad62-167d-574c-bcdf-77287711f42e'::uuid,
  '2fc70bd1-8628-542f-a687-84dad4e786a0'::uuid,
  '5e99b3a0-0e98-5cdd-bd5f-f256b5260a35'::uuid,
  'bd2c4a96-7df5-58e3-8fc1-ee6179644e3c'::uuid,
  'b94bb42b-a05a-5661-8ff0-8a1fc44f70da'::uuid,
  '2240c17c-4950-56c1-ab6e-76ae4bd84111'::uuid,
  'f6e08953-e8b3-55a4-82d3-2bc9c6983a1a'::uuid,
  '01939076-72a7-5b30-ab9b-3a3577f62bf0'::uuid,
  'e250608d-96a0-5563-a8d7-4c617b937dba'::uuid,
  'ebc73594-8ce9-54c2-93cf-1c75fb74d6a6'::uuid,
  '8090c7f6-4fa6-573e-88a7-90e9e3777428'::uuid,
  '5a020e3c-4792-5baf-af29-ea92342d72cc'::uuid,
  '311236c7-4e52-55c5-a02c-215cbc8ba7fc'::uuid,
  'afe15ee1-5139-57ad-aca8-ddd12f1bd8f3'::uuid,
  '3ea100d7-18aa-5412-b908-85e8662f6f51'::uuid,
  '77cb3478-d4d1-5e5b-9d64-9bb2dbaa4547'::uuid
)
AND membership_status = 'CANDIDATE'
AND reason LIKE 'CHK-CATGOV-05B / seed-v1 /%';

-- Models are removed only when their exact deterministic ID and operation
-- reason still prove that this seed created them. Foreign-key violations from
-- later dependent content must stop the rollback rather than cascade.
DELETE FROM public.catalog_product_models
WHERE id IN (
  '8691e041-0da3-5d8b-9407-29b6ad0a1f75'::uuid,
  '4837aa49-03cc-5dd3-9f51-5b451f60ab2a'::uuid,
  '1f11a9a8-f283-5e55-b03a-e796afb3a8fa'::uuid,
  'dba78f0a-a7c4-5b73-9195-e4108772ce8b'::uuid,
  '022199c9-a46c-512d-899a-a7dd1ab2c484'::uuid,
  '260a6f7f-740f-5c53-aaad-22330805f2f3'::uuid,
  'b8a0cc81-23c0-50cb-8d34-e7aa509055bc'::uuid,
  'bbe08fb7-318d-5e99-8c0b-343f9db9201d'::uuid
)
AND status = 'REVIEW_REQUIRED'
AND reason LIKE 'CHK-CATGOV-05B / seed-v1 /%';

COMMIT;
