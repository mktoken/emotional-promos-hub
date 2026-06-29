
-- Validar / asegurar función update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  markup_pct numeric(6,2) NOT NULL DEFAULT 35,
  moneda text NOT NULL DEFAULT 'MXN',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO authenticated;
GRANT ALL ON public.proveedores TO service_role;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage proveedores" ON public.proveedores;
CREATE POLICY "staff manage proveedores" ON public.proveedores
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 2. provider_import_batches
CREATE TABLE IF NOT EXISTS public.provider_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error','partial')),
  mode text NOT NULL DEFAULT 'full' CHECK (mode IN ('full','incremental','dry_run')),
  items_received int NOT NULL DEFAULT 0,
  items_upserted int NOT NULL DEFAULT 0,
  items_failed int NOT NULL DEFAULT 0,
  error_message text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_import_batches TO authenticated;
GRANT ALL ON public.provider_import_batches TO service_role;
ALTER TABLE public.provider_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage batches" ON public.provider_import_batches;
CREATE POLICY "staff manage batches" ON public.provider_import_batches
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 3. provider_raw_products  (productos_b2b.id ya validado como uuid)
CREATE TABLE IF NOT EXISTS public.provider_raw_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  provider_sku text NOT NULL,
  batch_id uuid REFERENCES public.provider_import_batches(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL,
  nombre text,
  descripcion text,
  categoria text,
  subcategoria text,
  productos_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proveedor_id, provider_sku)
);
CREATE INDEX IF NOT EXISTS idx_raw_products_b2b ON public.provider_raw_products(productos_b2b_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_raw_products TO authenticated;
GRANT ALL ON public.provider_raw_products TO service_role;
ALTER TABLE public.provider_raw_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage raw products" ON public.provider_raw_products;
CREATE POLICY "staff manage raw products" ON public.provider_raw_products
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 4. producto_proveedor_ofertas
CREATE TABLE IF NOT EXISTS public.producto_proveedor_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_raw_product_id uuid NOT NULL REFERENCES public.provider_raw_products(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  variant_sku text,
  color_code text,
  color_nombre text,
  talla text,
  material text,
  modelo text,
  imagen_url text,
  atributos jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ofertas_unique_variant
  ON public.producto_proveedor_ofertas (
    provider_raw_product_id,
    coalesce(variant_sku,''),
    coalesce(color_code,''),
    coalesce(talla,'')
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_proveedor_ofertas TO authenticated;
GRANT ALL ON public.producto_proveedor_ofertas TO service_role;
ALTER TABLE public.producto_proveedor_ofertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage ofertas" ON public.producto_proveedor_ofertas;
CREATE POLICY "staff manage ofertas" ON public.producto_proveedor_ofertas
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. producto_precio_escalas
CREATE TABLE IF NOT EXISTS public.producto_precio_escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.producto_proveedor_ofertas(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  min_qty int NOT NULL DEFAULT 1,
  max_qty int,
  unit_cost numeric(14,4) NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  source_field text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_qty >= 1),
  CHECK (max_qty IS NULL OR max_qty >= min_qty)
);
CREATE INDEX IF NOT EXISTS idx_escalas_oferta_minqty ON public.producto_precio_escalas(oferta_id, min_qty);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precio_escalas TO authenticated;
GRANT ALL ON public.producto_precio_escalas TO service_role;
ALTER TABLE public.producto_precio_escalas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage escalas" ON public.producto_precio_escalas;
CREATE POLICY "staff manage escalas" ON public.producto_precio_escalas
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 6. producto_proveedor_stock
CREATE TABLE IF NOT EXISTS public.producto_proveedor_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL UNIQUE REFERENCES public.producto_proveedor_ofertas(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  cantidad int NOT NULL DEFAULT 0,
  disponibilidad text NOT NULL DEFAULT 'agotado' CHECK (disponibilidad IN ('disponible','bajo','agotado')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_proveedor_stock TO authenticated;
GRANT ALL ON public.producto_proveedor_stock TO service_role;
ALTER TABLE public.producto_proveedor_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage stock" ON public.producto_proveedor_stock;
CREATE POLICY "staff manage stock" ON public.producto_proveedor_stock
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_proveedores_updated ON public.proveedores;
CREATE TRIGGER trg_proveedores_updated BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_raw_products_updated ON public.provider_raw_products;
CREATE TRIGGER trg_raw_products_updated BEFORE UPDATE ON public.provider_raw_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_ofertas_updated ON public.producto_proveedor_ofertas;
CREATE TRIGGER trg_ofertas_updated BEFORE UPDATE ON public.producto_proveedor_ofertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_escalas_updated ON public.producto_precio_escalas;
CREATE TRIGGER trg_escalas_updated BEFORE UPDATE ON public.producto_precio_escalas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed proveedores
INSERT INTO public.proveedores (code, nombre, markup_pct, moneda, config) VALUES
  ('forpromotional', 'ForPromotional / 4Promotional', 35, 'MXN', '{"endpoint":"https://api-external-clients.4promotional.net/api/products","auth":"bearer"}'::jsonb),
  ('cdo_mx',         'CDO Promocionales México',      35, 'MXN', '{"endpoint":"http://api.mexico.cdopromocionales.com/v2/products","auth":"query_param","param":"auth_token"}'::jsonb),
  ('g4_mx',          'G4 México',                     35, 'MXN', '{"endpoint_wsdl_secret":"G4_WSDL_URL","auth":"soap","sku_source":"pendiente"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
