
-- 1. Tabla: productos_b2b
CREATE TABLE public.productos_b2b (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_interno text UNIQUE NOT NULL,
  proveedor_nombre text NOT NULL,
  sku_base text,
  datos_generales jsonb DEFAULT '{}'::jsonb,
  variantes jsonb DEFAULT '[]'::jsonb,
  imagenes jsonb DEFAULT '[]'::jsonb,
  especificaciones_tecnicas jsonb DEFAULT '{}'::jsonb,
  datos_logistica_b2b jsonb DEFAULT '{}'::jsonb,
  motor_de_personalizacion jsonb DEFAULT '{}'::jsonb,
  costeo jsonb DEFAULT '{}'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tabla: tabuladores_impresion
CREATE TABLE public.tabuladores_impresion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnica_nombre text UNIQUE NOT NULL,
  costo_setup_fijo numeric DEFAULT 0,
  tarifas_por_volumen jsonb DEFAULT '[]'::jsonb,
  activo boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 3. Tabla: cotizaciones_leads
CREATE TABLE public.cotizaciones_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  datos_cliente jsonb NOT NULL DEFAULT '{}'::jsonb,
  articulos_cotizados jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_estimado numeric DEFAULT 0,
  estado_cotizacion text DEFAULT 'NUEVA',
  created_at timestamptz DEFAULT now()
);

-- RLS: productos_b2b (lectura pública, sin escritura anónima)
ALTER TABLE public.productos_b2b ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de productos" ON public.productos_b2b
  FOR SELECT USING (true);

-- RLS: tabuladores_impresion (lectura pública)
ALTER TABLE public.tabuladores_impresion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de tabuladores" ON public.tabuladores_impresion
  FOR SELECT USING (true);

-- RLS: cotizaciones_leads (cualquiera puede insertar, nadie puede leer sin auth)
ALTER TABLE public.cotizaciones_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inserción pública de cotizaciones" ON public.cotizaciones_leads
  FOR INSERT WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_productos
  BEFORE UPDATE ON public.productos_b2b
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_tabuladores
  BEFORE UPDATE ON public.tabuladores_impresion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
