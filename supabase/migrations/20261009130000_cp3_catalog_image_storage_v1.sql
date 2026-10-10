-- CP-3 P1-C Phase 3A.1: canonical catalog image storage.
-- Product rows are intentionally not modified by this migration.

BEGIN;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'catalog-product-images',
  'catalog-product-images',
  true,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "catalog product images public read" ON storage.objects;
CREATE POLICY "catalog product images public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'catalog-product-images');

-- No INSERT, UPDATE, or DELETE policy is granted to anon/authenticated.
-- The trusted catalog-image-admin Edge Function uses service_role.

COMMIT;
