DROP POLICY IF EXISTS "catalog product images public read" ON storage.objects;
CREATE POLICY "catalog product images public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'catalog-product-images');