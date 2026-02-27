
-- 1. Add categoria_principal to productos_b2b
ALTER TABLE public.productos_b2b ADD COLUMN IF NOT EXISTS categoria_principal text;

-- 2. Add updated_at to cotizaciones_leads
ALTER TABLE public.cotizaciones_leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Create trigger for cotizaciones_leads updated_at
CREATE TRIGGER set_cotizaciones_leads_updated_at
  BEFORE UPDATE ON public.cotizaciones_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 4. Create trigger for productos_b2b updated_at (if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_productos_b2b_updated_at') THEN
    CREATE TRIGGER set_productos_b2b_updated_at
      BEFORE UPDATE ON public.productos_b2b
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;

-- 5. Fix RLS policies - drop existing and recreate with activo filter

-- productos_b2b
DROP POLICY IF EXISTS "Lectura pública de productos" ON public.productos_b2b;
CREATE POLICY "Lectura pública de productos activos"
  ON public.productos_b2b FOR SELECT TO anon
  USING (activo = true);

-- tabuladores_impresion
DROP POLICY IF EXISTS "Lectura pública de tabuladores" ON public.tabuladores_impresion;
CREATE POLICY "Lectura pública de tabuladores activos"
  ON public.tabuladores_impresion FOR SELECT TO anon
  USING (activo = true);

-- cotizaciones_leads - keep existing INSERT policy, ensure no SELECT
DROP POLICY IF EXISTS "Inserción pública de cotizaciones" ON public.cotizaciones_leads;
CREATE POLICY "Inserción pública de cotizaciones"
  ON public.cotizaciones_leads FOR INSERT TO anon
  WITH CHECK (true);

-- 6. Create index on categoria_principal for fast filtering
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos_b2b (categoria_principal);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos_b2b (activo);
