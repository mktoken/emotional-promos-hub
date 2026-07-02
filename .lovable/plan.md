# Plan Sprint 2.1 — Publicar piloto elegible sin tocar frontend

## 1. Definición actual de `productos_publicos`

Vista simple sobre `productos_b2b`:

```sql
SELECT id, id_interno, sku_base, categoria_principal, datos_generales,
       variantes, imagenes, motor_de_personalizacion, activo, updated_at,
       CASE WHEN (costeo->>'precio_neto_distribuidor') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN round((costeo->>'precio_neto_distribuidor')::numeric * 1.35, 2)
       END AS precio_desde_mxn
FROM productos_b2b p
WHERE activo = true;
```

- Filtro único: `activo = true`.
- Precio derivado inline de `costeo->>'precio_neto_distribuidor' * 1.35`.
- Hoy devuelve 48 productos legado. Los 50 piloto quedan fuera porque `activo=false`.

## 2. Contrato que consume el frontend (`CatalogView.tsx`)

Columnas leídas por `.select(...)`:

```
id, id_interno, sku_base, categoria_principal, datos_generales,
variantes, imagenes, motor_de_personalizacion, activo, updated_at,
precio_desde_mxn
```

- `datos_generales.nombre`, `datos_generales.descripcion`
- `variantes[].stock_total`
- `imagenes` (array o string JSON)
- `precio_desde_mxn` (number, MXN, se muestra tal cual — hoy sin IVA visible)

**El contrato debe conservarse 1:1.** Ningún campo nuevo, ninguno removido, mismos tipos.

## 3. Estrategia — Redefinir la vista como UNION ALL

Dos ramas mutuamente excluyentes por `producto_b2b_id`:

**Rama A — Legado (comportamiento actual, intacto):**

- `productos_b2b.activo = true`
- `precio_desde_mxn` calculado desde `costeo->>'precio_neto_distribuidor' * 1.35` (idéntico a hoy).
- Excluye los pilotos (todos tienen `activo = false`).

**Rama B — Piloto elegible (nuevo):**

- `productos_b2b.activo = false`
- `EXISTS` en `producto_b2b_status` con **todas** estas condiciones:
  - `public_visible = true`
  - `stock_status = 'disponible'`
  - `price_valid = true`
  - `image_available = true`
- `EXISTS` en `catalog_price_cache` con:
  - `price_status = 'valid'`
  - `tax_included = false`
  - `currency = 'MXN'`
  - `min_price_before_tax_mxn IS NOT NULL`
- `precio_desde_mxn = catalog_price_cache.min_price_before_tax_mxn` (pre-IVA, mismo contrato numérico).
- `activo` se **proyecta como `true**` en la salida de la vista (columna calculada), para que el frontend siga filtrando por `.eq('activo', true)` sin cambios. La fila subyacente en `productos_b2b` sigue en `activo=false`.

Con esto, ~31 pilotos entrarían (los que tienen imagen + stock + precio válido), y los 9 agotados / 10 sin imagen quedan fuera automáticamente.

### Boceto SQL (referencia, no ejecutar aún)

```sql
CREATE OR REPLACE VIEW public.productos_publicos AS
-- Rama A: legado
SELECT
  p.id, p.id_interno, p.sku_base, p.categoria_principal,
  p.datos_generales, p.variantes, p.imagenes, p.motor_de_personalizacion,
  true AS activo,  -- ya filtrado por activo=true
  p.updated_at,
  CASE WHEN (p.costeo->>'precio_neto_distribuidor') ~ '^[0-9]+(\.[0-9]+)?$'
       THEN round((p.costeo->>'precio_neto_distribuidor')::numeric * 1.35, 2)
  END AS precio_desde_mxn
FROM public.productos_b2b p
WHERE p.activo = true

UNION ALL

-- Rama B: piloto elegible
SELECT
  p.id, p.id_interno, p.sku_base, p.categoria_principal,
  p.datos_generales, p.variantes, p.imagenes, p.motor_de_personalizacion,
  true AS activo,  -- proyectado, no persistido
  p.updated_at,
  c.min_price_before_tax_mxn AS precio_desde_mxn
FROM public.productos_b2b p
JOIN public.producto_b2b_status s ON s.producto_b2b_id = p.id
JOIN public.catalog_price_cache  c ON c.producto_b2b_id = p.id
WHERE p.activo = false
  AND s.public_visible = true
  AND s.stock_status  = 'disponible'
  AND s.price_valid   = true
  AND s.image_available = true
  AND c.price_status  = 'valid'
  AND c.tax_included  = false
  AND c.currency      = 'MXN'
  AND c.min_price_before_tax_mxn IS NOT NULL;
```

## 4. Puntos 4–8 (respuestas directas)

4. **Filtrar por `public_visible=true**` → JOIN con `producto_b2b_status` en Rama B, condiciones combinadas listadas arriba. No hay bandera única "publicable"; se exige la conjunción completa para que el gate sea explícito y auditable.
5. `**precio_desde_mxn**` en Rama B viene directo de `catalog_price_cache.min_price_before_tax_mxn` (sin multiplicar, ya viene calculado por el pipeline de Sprint 2). Rama A conserva la fórmula histórica `*1.35`.
6. **Precios "más IVA"**: se garantiza requiriendo `tax_included = false` en la Rama B. Rama A ya opera como "precio base" y no cambia. La vista **no** aplica IVA; comunicar "+ IVA" es responsabilidad del frontend (fuera de alcance de este sprint).
7. **No exponer datos sensibles**: la vista **sólo proyecta** las 11 columnas del contrato. No se hace `SELECT *` de `catalog_price_cache` (que contiene `provider_code`, `source_oferta_id`, `pricing_warning`). El GRANT a `anon` sigue siendo únicamente sobre `productos_publicos`. `datos_generales` ya pasó por el whitelist del edge function (`nombre`, `descripcion`, `promoted_at`, `pilot`). Se debe reconfirmar con un `SELECT DISTINCT jsonb_object_keys(datos_generales)` sobre los 50 pilotos antes de publicar.
8. **¿`activo` piloto debe seguir en `false`?** **Sí.** La fila persistida se queda `activo=false` (candado físico contra fugas si alguien usa `productos_b2b` directamente). La visibilidad pública se controla exclusivamente por `producto_b2b_status.public_visible` + condiciones de la Rama B. La vista **proyecta `activo=true**` solo para mantener el contrato con el frontend (`.eq('activo', true)`).

## 5. SQL de validación

### Antes del cambio

```sql
-- Snapshot
SELECT count(*) FROM public.productos_publicos;                      -- esperado: 48
SELECT pg_get_viewdef('public.productos_publicos'::regclass, true);  -- guardar
SELECT count(*) FROM public.productos_b2b WHERE activo=false;        -- 50 piloto
SELECT DISTINCT jsonb_object_keys(datos_generales)
FROM public.productos_b2b
WHERE id IN (SELECT producto_b2b_id FROM public.catalog_price_cache); -- confirmar whitelist
```

### Después del cambio

```sql
-- Conteos
SELECT count(*) FROM public.productos_publicos;   -- esperado ~48 + 31 = ~79
SELECT count(*) FROM public.productos_publicos WHERE precio_desde_mxn IS NULL;  -- 0

-- Ningún agotado / sin imagen se cuela
SELECT count(*) FROM public.productos_publicos pp
JOIN public.producto_b2b_status s ON s.producto_b2b_id = pp.id
WHERE s.stock_status <> 'disponible' OR s.image_available = false OR s.price_valid = false;  -- 0

-- Legado intacto
SELECT count(*) FROM public.productos_publicos pp
JOIN public.productos_b2b p ON p.id = pp.id
WHERE p.activo = true;   -- esperado: 48

-- Piloto expuesto sólo si cumple TODO
SELECT count(*) FROM public.productos_publicos pp
JOIN public.productos_b2b p ON p.id = pp.id
WHERE p.activo = false;  -- esperado: 31 (o el número real de elegibles)

-- No hay columnas nuevas / faltantes
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='productos_publicos'
ORDER BY ordinal_position;  -- debe coincidir 1:1 con el contrato

-- Anon RLS
SET ROLE anon;
SELECT count(*) FROM public.productos_publicos;   -- debe funcionar
SELECT count(*) FROM public.catalog_price_cache;  -- debe fallar / 0
SELECT count(*) FROM public.producto_b2b_status;  -- debe fallar / 0
RESET ROLE;
```

## 6. Riesgos

- **Cambio de conteo** en catálogo público (48 → ~79). Verificable, esperado, reversible con `CREATE OR REPLACE VIEW` a la definición previa.
- **Fuga por `datos_generales**` si un piloto tiene campos fuera del whitelist. Mitigación: validación previa de keys (script SQL de arriba).
- **Precio en Rama B sin IVA** vs Rama A cuya base histórica no explicita IVA. Riesgo comercial de comunicar precios mezclados; requiere confirmación de negocio antes del Build. Fuera de alcance modificar copy del frontend.
- `**activo` proyectado ≠ persistido**: cualquier tool interno que haga JOIN a `productos_b2b.activo` verá `false` para pilotos. Aceptable y deseado (candado).
- **Performance**: dos JOIN adicionales sobre 50 filas piloto es despreciable; a escala hay que agregar índices en `producto_b2b_status(producto_b2b_id)` y `catalog_price_cache(producto_b2b_id)` — no incluido en este sprint.
- **RLS/GRANTS**: `catalog_price_cache` y `producto_b2b_status` tienen policies restrictivas; una vista sin `SECURITY INVOKER` en Postgres 15+ corre con permisos del creador. Debe confirmarse que la vista NO exponga datos por debajo (el proyecto sólo devuelve columnas seguras, así que aunque corra como owner sigue sin filtrar datos sensibles).
- `**UNION ALL` con `activo=true` constante**: si algún día el frontend deja de filtrar por `activo`, el comportamiento no cambia (todas las filas de la vista ya son "publicables").

## 7. Alcance exacto del futuro Build

Un único `CREATE OR REPLACE VIEW public.productos_publicos AS ...` vía migración, más:

- `GRANT SELECT ON public.productos_publicos TO anon, authenticated;` (reconfirmar, no ampliar).
- **Nada más.** Sin cambios en:
  - `productos_b2b` (los pilotos siguen `activo=false`)
  - `producto_b2b_status`, `catalog_price_cache` (sólo lectura desde la vista)
  - Edge functions
  - Frontend (`CatalogView.tsx`, `types.ts`) — el shape de la vista es idéntico
  - RLS de tablas subyacentes
  - Rutas ni UI

## 8. Criterios de aceptación

- `pg_get_viewdef` posterior contiene las dos ramas (`UNION ALL`).
- Columnas de la vista: exactamente 11, en el mismo orden y tipo que hoy.
- `SELECT count(*) FROM productos_publicos` = 48 (legado) + N pilotos elegibles (esperado 31).
- Ningún piloto con `stock_status ≠ 'disponible'`, `image_available=false`, `price_valid=false`, `tax_included=true`, o `price_status ≠ 'valid'` aparece.
- `precio_desde_mxn` no NULL para todas las filas publicadas.
- `SET ROLE anon; SELECT ... FROM catalog_price_cache/producto_b2b_status` sigue denegado.
- Frontend no requiere cambios; catálogo carga y renderiza precios de pilotos como "Desde $X".
- Rollback: guardar la definición anterior y validar `CREATE OR REPLACE VIEW` reversible.

**No implementar hasta aprobación.**  
  
BUILD.

INSTRUCCIÓN CRÍTICA DE ALCANCE:

No cambies nada que no se te pida explícitamente.

No modifiques frontend.

No rediseñes UI.

No refactorices archivos no relacionados.

No cambies componentes React.

No cambies rutas.

No ejecutes sincronizaciones.

No promociones más productos.

No modifiques Edge Functions.

No cambies RLS.

No cambies productos_b2b estructura.

No cambies producto_b2b_status estructura.

No cambies catalog_price_cache estructura.

No publiques.

No optimices ni limpies código fuera del alcance solicitado.

Alcance exacto:

Crear SOLO una migración SQL para redefinir la vista:

public.productos_publicos

Nada más.

Contexto validado:

- productos_publicos actual tiene 48 productos.

- Hay 50 productos piloto en productos_b2b con activo=false.

- Hay 31 pilotos elegibles para publicación.

- datos_generales del piloto está limpio, pero la vista debe sanitizarlo de todos modos.

- productos_b2b piloto NO debe activarse.

- productos_b2b.activo debe seguir false para pilotos.

Contrato obligatorio de productos_publicos:

La vista debe conservar exactamente estas 11 columnas y en este orden:

1. id

2. id_interno

3. sku_base

4. categoria_principal

5. datos_generales

6. variantes

7. imagenes

8. motor_de_personalizacion

9. activo

10. updated_at

11. precio_desde_mxn

Objetivo:

Redefinir productos_publicos para mantener los 48 productos actuales y agregar los 31 productos piloto elegibles usando UNION ALL.

Rama 1 — productos actuales legacy:

Mantener la lógica actual:

- FROM public.productos_b2b p

- WHERE p.activo = true

- precio_desde_mxn calculado como hasta ahora desde:

  costeo->>'precio_neto_distribuidor' * 1.35

No cambiar esta rama salvo lo mínimo necesario para el UNION ALL.

Rama 2 — productos piloto:

Agregar productos piloto desde:

- productos_b2b p

- producto_b2b_status s

- catalog_price_cache c mediante JOIN LATERAL

Condiciones obligatorias:

- p.datos_generales->>'pilot' = 'true'

- p.activo = false

- s.producto_b2b_id = [p.id](http://p.id)

- s.public_visible = true

- s.stock_status = 'disponible'

- s.price_valid = true

- s.image_available = true

- s.quote_mode = 'cotizable'

- c.price_status = 'valid'

- [c.tax](http://c.tax)_included = false

- c.currency = 'MXN'

- c.min_price_before_tax_mxn is not null

Importante:

catalog_price_cache puede llegar a tener más de una fila por producto en el futuro.

Usar JOIN LATERAL para tomar una sola fila válida por producto:

order by

  c.calculated_at desc nulls last,

  c.updated_at desc nulls last,

  c.created_at desc nulls last

limit 1

precio_desde_mxn para pilotos:

- debe venir de c.min_price_before_tax_mxn

- es precio antes de IVA

- NO calcular IVA en la vista

Seguridad:

La vista NO debe exponer:

- proveedor

- provider_code

- provider_sku

- proveedor_id

- costo

- unit_cost

- factor

- multiplier

- margen

- markup

- raw_payload

- pricing rules

- source_oferta_id

datos_generales para pilotos debe construirse con jsonb_build_object.

NO usar p.datos_generales completo en la rama piloto.

datos_generales permitido para pilotos:

- nombre

- descripcion

- pilot

- promoted_at

Para pilotos:

- sku_base debe mantenerse como NULL si está NULL.

- activo debe proyectarse como true en la vista, aunque p.activo siga false.

- costeo no aparece porque no es columna de la vista.

- proveedor_nombre no aparece porque no es columna de la vista.

Validaciones esperadas después de la migración:

- productos_publicos total debe pasar de 48 a 79.

- productos_publicos con datos_generales->>'pilot'='true' debe ser 31.

- productos_b2b piloto debe seguir con activo=false en 50 registros.

- No debe haber campos prohibidos en datos_generales del piloto.

- No debe haber id_interno que contenga cdo_mx, forpromotional o g4_mx.

- precio_desde_mxn de pilotos debe ser not null.

- productos_publicos debe conservar las mismas 11 columnas.

Entrega:

1. Crear solo una migración SQL.

2. No tocar frontend.

3. No tocar Edge Functions.

4. No tocar RLS.

5. No ejecutar funciones.

6. Al terminar, resume:

   - archivo creado

   - SQL aplicado para CREATE OR REPLACE VIEW

   - SQL de validación post-migración

   - rollback sugerido usando la definición anterior si fuera necesario