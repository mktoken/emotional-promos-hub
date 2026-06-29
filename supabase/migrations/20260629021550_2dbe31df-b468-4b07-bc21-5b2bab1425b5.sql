CREATE INDEX IF NOT EXISTS idx_raw_products_proveedor_last_seen
  ON public.provider_raw_products(proveedor_id, last_seen_at);