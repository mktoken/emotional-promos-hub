# Plan corregido — Integración multi-proveedor (Build 1 no destructivo)

Catálogo maestro = `productos_b2b` existente. No se crea `products_master`. Las tablas nuevas son **lateral** a `productos_b2b` y se vinculan por `productos_b2b.id` cuando exista mapeo manual; mientras no haya mapeo, los datos crudos de proveedor viven aisladamente y no afectan al catálogo público.

---

## Auditoría de `productos_publicos` (NO se modifica en Build 1)

Vista actual:

```sql
SELECT id, id_interno, sku_base, categoria_principal, datos_generales,
       variantes, imagenes, motor_de_personalizacion, activo, updated_at,
       CASE WHEN (costeo->>'precio_neto_distribuidor') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN round(((costeo->>'precio_neto_distribuidor')::numeric) * 1.35, 2)
            ELSE NULL END AS precio_desde_mxn
FROM productos_b2b p
WHERE activo = true;
```

Observaciones:

- Markup 1.35 está hardcoded en SQL (no parametrizado por proveedor).
- Lee `costeo->>'precio_neto_distribuidor'` (campo único, sin escalas).
- No expone `proveedor_nombre` ni `costeo` crudo (OK).
- Frontend depende de esta vista.

**Riesgo de tocarla ahora**: cualquier cambio de shape rompe catálogo. Por eso Build 1 NO toca esta vista. La sustitución/extensión queda para una fase posterior cuando ya existan escalas reales en `producto_precio_escalas`. Se hará entonces como vista nueva paralela (`productos_publicos_v2`) y migración gradual.

---

## Tablas nuevas (Build 1)

Todas privadas, sin acceso `anon`, solo `is_staff` + `service_role`.

### 1. `proveedores`

Catálogo de proveedores internos.

- `id` uuid pk
- `code` text unique — `forpromotional` | `cdo_mx` | `g4_mx`
- `nombre` text
- `activo` boolean default true
- `markup_pct` numeric default 35
- `moneda` text default `MXN`
- `config` jsonb default `{}` — endpoints, paginación, notas
- `last_sync_at` timestamptz
- `created_at`, `updated_at`

### 2. `provider_import_batches`

Auditoría de cada corrida de sync.

- `id` uuid pk
- `proveedor_id` uuid fk → proveedores
- `started_at`, `finished_at` timestamptz
- `status` text — `running` | `ok` | `error` | `partial`
- `items_received`, `items_upserted`, `items_failed` int default 0
- `error_message` text
- `triggered_by` uuid nullable (auth.users)
- `mode` text — `full` | `incremental` | `dry_run`

### 3. `provider_raw_products`

Ingesta cruda 1 fila por SKU/proveedor. No reemplaza `productos_b2b`.

- `id` uuid pk
- `proveedor_id` uuid fk → proveedores
- `provider_sku` text not null
- `batch_id` uuid fk → provider_import_batches
- `raw_payload` jsonb not null
- `nombre`, `descripcion`, `categoria`, `subcategoria` text
- `last_seen_at` timestamptz default now()
- `activo` boolean default true
- `productos_b2b_id` uuid nullable fk → productos_b2b(id) — mapping manual posterior
- unique(`proveedor_id`, `provider_sku`)

### 4. `producto_proveedor_ofertas`

Una "oferta" = combinación variante (color/talla/modelo) de un proveedor.

- `id` uuid pk
- `provider_raw_product_id` uuid fk
- `proveedor_id` uuid fk (denormalizado para policies/queries)
- `variant_sku` text nullable
- `color_code`, `color_nombre`, `talla`, `material`, `modelo` text
- `imagen_url` text
- `atributos` jsonb default `{}`
- `activo` boolean default true
- unique(`provider_raw_product_id`, coalesce(`variant_sku`,''), coalesce(`color_code`,''), coalesce(`talla`,''))

### 5. `producto_precio_escalas`

Escalas/tiers de precio por oferta. Para proveedores sin escalas (ForPromotional/CDO) se inserta 1 fila sintética.

- `id` uuid pk
- `oferta_id` uuid fk → producto_proveedor_ofertas
- `proveedor_id` uuid fk (denormalizado)
- `min_qty` int not null default 1
- `max_qty` int nullable
- `unit_cost` numeric(14,4) not null
- `currency` text default `MXN`
- `source_field` text — `precio_desc` | `precio` | `net_price` | `list_price` | `escala_g4`
- check `min_qty >= 1` y `(max_qty IS NULL OR max_qty >= min_qty)`

### 6. `producto_proveedor_stock`

Stock por oferta (server-side, nunca expuesto numéricamente al público).

- `id` uuid pk
- `oferta_id` uuid fk unique → producto_proveedor_ofertas
- `proveedor_id` uuid fk
- `cantidad` int not null default 0
- `disponibilidad` text — `disponible` | `bajo` | `agotado`
- `updated_at` timestamptz default now()

---

## SQL de Build 1

```sql
-- ============================================================
-- Build 1: Multi-proveedor (no destructivo)
-- No toca productos_b2b, productos_publicos, CRM, ni RLS existente.
-- ============================================================

-- 1. proveedores
CREATE TABLE public.proveedores (
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
CREATE POLICY "staff manage proveedores" ON public.proveedores
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 2. provider_import_batches
CREATE TABLE public.provider_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  mode text NOT NULL DEFAULT 'full',
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
CREATE POLICY "staff manage batches" ON public.provider_import_batches
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 3. provider_raw_products
CREATE TABLE public.provider_raw_products (
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
CREATE INDEX ON public.provider_raw_products(productos_b2b_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_raw_products TO authenticated;
GRANT ALL ON public.provider_raw_products TO service_role;
ALTER TABLE public.provider_raw_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage raw products" ON public.provider_raw_products
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 4. producto_proveedor_ofertas
CREATE TABLE public.producto_proveedor_ofertas (
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
CREATE UNIQUE INDEX ofertas_unique_variant
  ON public.producto_proveedor_ofertas (
    provider_raw_product_id,
    coalesce(variant_sku,''),
    coalesce(color_code,''),
    coalesce(talla,'')
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_proveedor_ofertas TO authenticated;
GRANT ALL ON public.producto_proveedor_ofertas TO service_role;
ALTER TABLE public.producto_proveedor_ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage ofertas" ON public.producto_proveedor_ofertas
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. producto_precio_escalas
CREATE TABLE public.producto_precio_escalas (
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
CREATE INDEX ON public.producto_precio_escalas(oferta_id, min_qty);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precio_escalas TO authenticated;
GRANT ALL ON public.producto_precio_escalas TO service_role;
ALTER TABLE public.producto_precio_escalas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage escalas" ON public.producto_precio_escalas
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 6. producto_proveedor_stock
CREATE TABLE public.producto_proveedor_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL UNIQUE REFERENCES public.producto_proveedor_ofertas(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  cantidad int NOT NULL DEFAULT 0,
  disponibilidad text NOT NULL DEFAULT 'agotado',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_proveedor_stock TO authenticated;
GRANT ALL ON public.producto_proveedor_stock TO service_role;
ALTER TABLE public.producto_proveedor_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage stock" ON public.producto_proveedor_stock
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Triggers updated_at (reusa public.update_updated_at existente)
CREATE TRIGGER trg_proveedores_updated BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_raw_products_updated BEFORE UPDATE ON public.provider_raw_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_ofertas_updated BEFORE UPDATE ON public.producto_proveedor_ofertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_escalas_updated BEFORE UPDATE ON public.producto_precio_escalas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed proveedores
INSERT INTO public.proveedores (code, nombre, markup_pct, config) VALUES
  ('forpromotional', 'ForPromotional / 4Promotional', 35, '{"endpoint":"https://api-external-clients.4promotional.net/api/products","auth":"bearer"}'),
  ('cdo_mx',         'CDO Promocionales México',      35, '{"endpoint":"http://api.mexico.cdopromocionales.com/v2/products","auth":"query_param","param":"auth_token"}'),
  ('g4_mx',          'G4 México',                     35, '{"endpoint_wsdl_secret":"G4_WSDL_URL","auth":"soap","sku_source":"pendiente"}')
ON CONFLICT (code) DO NOTHING;
```

---

## Relación con `productos_b2b`

- `productos_b2b` sigue siendo el catálogo maestro **autoritativo** y única fuente de `productos_publicos`.
- `provider_raw_products.productos_b2b_id` es **nullable** — vínculo opcional, manual, posterior. Mientras esté null, la fila vive aislada y no afecta al catálogo público.
- Build 1 NO modifica filas de `productos_b2b`, NO altera su esquema, NO toca la vista `productos_publicos`.
- Futuro: cuando un raw product se mapee a un `productos_b2b.id`, el costeo/escala oficial podrá leerse desde `producto_precio_escalas` en lugar de `costeo->>precio_neto_distribuidor`. Eso se decidirá en un Build posterior con una vista paralela; nunca reemplazando la actual sin migración explícita.

---

## RLS (resumen)


| Tabla nueva                | anon       | authenticated         | service_role |
| -------------------------- | ---------- | --------------------- | ------------ |
| proveedores                | sin acceso | solo `is_staff` (ALL) | ALL          |
| provider_import_batches    | sin acceso | solo `is_staff` (ALL) | ALL          |
| provider_raw_products      | sin acceso | solo `is_staff` (ALL) | ALL          |
| producto_proveedor_ofertas | sin acceso | solo `is_staff` (ALL) | ALL          |
| producto_precio_escalas    | sin acceso | solo `is_staff` (ALL) | ALL          |
| producto_proveedor_stock   | sin acceso | solo `is_staff` (ALL) | ALL          |


RLS de tablas existentes (`productos_b2b`, `productos_publicos`, CRM, `cotizaciones_leads`, `user_roles`, `profiles`) **no se toca**.

---

## Qué NO se toca en Build 1

- `productos_b2b` (datos y esquema)
- `productos_publicos` (vista actual)
- `cotizaciones_leads`
- Todo el CRM (`crm_*`)
- `tabuladores_impresion`
- `user_roles`, `profiles`, función `is_staff`, `has_role`
- Edge Functions existentes (`capture-assistant-lead`, `test-g4-connection`, `test-forpromotional-connection`, `test-cdo-connection`)
- Frontend completo (Landing, Catálogo, PDP, Carrito, Checkout, CRM UI, asistente)
- Tipos `src/integrations/supabase/types.ts` se regeneran automáticamente tras la migración — no se editan a mano
- `supabase/config.toml`

---

## Riesgos técnicos

- **Regeneración de `types.ts**`: tras la migración el archivo cambia. Es esperado y no rompe nada porque el frontend no usa estas tablas todavía.
- **Volumen de `raw_payload**`: jsonb crudo puede crecer. Mitigación: `provider_raw_products` solo guarda último payload por SKU (upsert), no histórico. Históricos en `provider_import_batches`.
- **Sin sync aún**: las tablas quedarán vacías salvo `proveedores`. No hay riesgo de fuga porque RLS bloquea anon.
- **G4 sin fuente de SKUs**: bloquea sync G4. Build 1 no depende de eso; el sync G4 queda fuera del orden hasta resolverlo.
- **Doble verdad futura**: cuando existan escalas reales, `productos_publicos` seguirá usando `costeo->>precio_neto_distribuidor`. Diferencias entre vista oficial y datos nuevos hasta que se publique vista paralela. No es un riesgo de Build 1, pero hay que reconocerlo.
- **Triggers `update_updated_at**`: ya existe la función; si no estuviera marcada como `SECURITY DEFINER`, no hay impacto en RLS.

---

## Checklist antes de Build 1

- Confirmar markup default 35% por proveedor (igual en los 3) o distinto.
- Confirmar moneda MXN para los 3 proveedores.
- Confirmar que está OK guardar `raw_payload` completo (jsonb) o si se desea truncar campos.
- Confirmar política de soft-delete: marcar `activo=false` cuando un SKU deja de aparecer en una corrida (recomendado) vs hard delete.
- Confirmar que la fuente de SKUs de G4 se define **después** (Build G4 queda postpuesto).
- Confirmar orden propuesto de Builds siguientes:
  - Build 2: `sync-forpromotional-products`
  - Build 3: `sync-cdo-products`
  - Build 4: definir y construir fuente de SKUs G4 + `sync-g4-products`
  - Build 5: `calculate-quote` (server-side, lee escalas)
  - Build 6: `submit-quote` (puente a CRM/WhatsApp)
  - Build 7+: vista paralela `productos_publicos_v2` y migración del frontend (decisión posterior)
- Confirmar que el linter post-migración (warnings esperados) será revisado y corregido en la misma corrida si corresponde.

Esperando aprobación explícita para ejecutar **solo Build 1** (migración SQL + seed proveedores). No se construye sync ni se toca frontend.  
  
Plan aprobado con ajustes menores antes de Build 1.

No cambies nada que no se te pida explícitamente.

No rediseñes.

No refactorices.

No toques frontend.

No toques productos_b2b.

No toques productos_publicos.

No sincronices proveedores todavía.

Ajustes requeridos:

1. Agrega CHECK constraints para evitar datos sucios:

- provider_import_batches.status IN ('running','ok','error','partial')

- provider_import_batches.mode IN ('full','incremental','dry_run')

- producto_proveedor_stock.disponibilidad IN ('disponible','bajo','agotado')

2. Antes de crear triggers, valida que exista public.update_updated_at().

Si no existe, créala de forma segura con CREATE OR REPLACE FUNCTION.

3. Confirma que productos_[b2b.id](http://b2b.id) es uuid antes de crear la FK provider_raw_products.productos_b2b_id.

Si no es uuid, detente y reporta.

4. Usa CREATE TABLE IF NOT EXISTS donde sea posible para hacer la migración más segura.

Si aceptas estos ajustes, ejecuta únicamente Build 1:

- tablas nuevas

- RLS de tablas nuevas

- seed de proveedores

No hagas nada más.