# Sprint 2 (v2) — Piloto de promoción proveedor → catálogo interno

Correcciones aplicadas respecto a v1: `activo=false` forzado, `id_interno` opaco, `datos_generales` sin campos sensibles, `stock_status` acotado, `base_cost_strategy` alineado a seeds, `productos_publicos` blindado.

Objetivo: promover 50 productos (20 CDO, 20 ForPromotional, 10 G4) desde tablas proveedor a `productos_b2b` + `producto_b2b_status` + `producto_b2b_oferta_map` + `catalog_price_cache`. Sin tocar frontend, sin tocar `productos_publicos`, sin cambiar RLS, sin calcular impresión.

---

## 1. Diagnóstico del esquema real (validado por lectura directa)

### 1.1 `productos_b2b` (existente, no se modifica)

Columnas: `id uuid pk`, `id_interno text UNIQUE NOT NULL`, `proveedor_nombre text NOT NULL`, `sku_base text`, `datos_generales jsonb`, `variantes jsonb`, `imagenes jsonb`, `especificaciones_tecnicas jsonb`, `datos_logistica_b2b jsonb`, `motor_de_personalizacion jsonb`, `costeo jsonb`, `activo bool`, `categoria_principal text`, timestamps.

- Constraints duros: `id_interno` UNIQUE + NOT NULL, `proveedor_nombre` NOT NULL.
- **Regla crítica Sprint 2**: todo producto piloto se inserta con `**activo = false**`. Motivo: `productos_publicos` es una vista sobre `productos_b2b` y podría filtrarse por `activo=true`; mantener el piloto inactivo garantiza cero exposición pública mientras validamos. La visibilidad piloto se controla exclusivamente en `producto_b2b_status.public_visible` (que aún no se conecta a la vista pública).

### 1.2 `productos_publicos`

- Vista existente consumida por el frontend. **Intocable en Sprint 2.**
- Guardaremos snapshot antes y después del Build: `pg_get_viewdef` y `count(*)`.

### 1.3 `producto_b2b_status`

Columnas relevantes: `producto_b2b_id`, `id_interno`, `public_visible`, `stock_status`, `stock_qty`, `quote_mode`, `kit_eligible`, `price_valid`, `image_available`, `last_stock_sync_at`.

- Sin UNIQUE en `producto_b2b_id` → idempotencia por `SELECT ... FOR UPDATE` + `INSERT/UPDATE` en tx. Recomendación pos-Sprint 2: agregar UNIQUE.

### 1.4 `producto_b2b_oferta_map`

`UNIQUE (oferta_id)` presente → `ON CONFLICT (oferta_id) DO UPDATE`.

### 1.5 `catalog_price_cache`

Columnas: `producto_b2b_id`, `id_interno`, `min_price_before_tax_mxn`, `tax_included bool default false`, `currency`, `pricing_rule_set_id`, `provider_code`, `source_oferta_id`, `price_status default 'pending'`, `pricing_warning`, `calculated_at`.

- Sin UNIQUE en `producto_b2b_id` → misma estrategia SELECT+UPSERT en tx. Recomendación pos-Sprint 2: agregar UNIQUE.

### 1.6 Fuentes (sólo lectura)

`provider_raw_products`, `producto_proveedor_ofertas`, `producto_precio_escalas`, `producto_proveedor_stock`, `proveedores.code ∈ { cdo_mx, forpromotional, g4_mx }`.

---

## 2. Selección del piloto (determinista)

Filtros por proveedor sobre `provider_raw_products prp` JOIN ofertas activas JOIN stock:

- `prp.activo = true`, `o.activo = true`.
- `prp.nombre` NOT NULL, `length(trim(prp.nombre)) >= 3`.
- Existe alguna escala con `unit_cost > 0` en las ofertas del producto.
- Stock conocido (`producto_proveedor_stock` con row; `cantidad` puede ser 0).
- `prp.productos_b2b_id IS NULL`.
- Ninguna oferta del producto está ya en `producto_b2b_oferta_map`.
- Imagen no bloquea; prioriza los que tienen imagen: `ORDER BY (o.imagen_url IS NOT NULL) DESC, prp.provider_sku ASC`.
- G4: si no hay 5ª escala, entra pero se marcará `manual_review`; máximo 3 de los 10 pueden salir en `manual_review`.

Cuotas: 20 `cdo_mx`, 20 `forpromotional`, 10 `g4_mx`. Un `productos_b2b` por `provider_raw_product` (no por oferta).

---

## 3. Mapeo proveedor → destino

### 3.1 `productos_b2b`

- `id_interno` = **opaco y determinista**:  
`id_interno = 'pp_' || substr(encode(digest(provider_code || ':' || provider_sku, 'sha256'), 'hex'), 1, 24)`  
(usa `pgcrypto.digest`, ya disponible en Supabase). Idempotente, no revela proveedor.
- `proveedor_nombre` = nombre humano del proveedor tomado de `proveedores.nombre` (aceptable exponer; el frontend hoy no muestra proveedor porque `activo=false` bloquea la vista).
- `sku_base` = **NULL** en Sprint 2 para no filtrar el SKU original del proveedor (se puede recuperar vía mapa staff-only).
- `categoria_principal` = `prp.categoria` normalizada.
- `datos_generales` (jsonb) — whitelist estricta:
  ```
  { "nombre": ..., "descripcion": ..., "promoted_at": "<iso>", "pilot": true }
  ```
  **Prohibido** en `datos_generales`: `provider_code`, `provider_sku`, `proveedor_id`, `costo`, `factor`, `raw_payload`, `markup`, `margen`, cualquier cifra de costo.
- `variantes` = agregado de ofertas con: `color_code`, `color_nombre`, `talla`, `material`, `modelo`, `imagen_url` (sin costos, sin `variant_sku` interno del proveedor si expone SKU proveedor → se guarda un id opaco por variante `v_<hash>` o simplemente el `id` uuid de la oferta que ya es opaco; se opta por `oferta_id` UUID).
- `imagenes` = array distinct de `imagen_url` no nulos.
- `especificaciones_tecnicas` = subset de `prp.raw_payload -> 'atributos'` con whitelist (dimensiones, peso, material). Nunca copiar el raw completo.
- `motor_de_personalizacion` = `{}`.
- `costeo` = `{}` (costos viven sólo en tablas proveedor).
- `**activo = false**` (regla crítica del Sprint).
- `ON CONFLICT (id_interno) DO NOTHING`.

### 3.2 `producto_b2b_oferta_map`

N filas por producto (una por oferta hija).

- `is_primary=true` sólo para la oferta que aporta el `source_oferta_id` del cache.
- `match_score=1.0`, `match_reason='direct_promotion_from_provider_raw'` (secundarias: `'secondary_variant'`).
- `ON CONFLICT (oferta_id) DO UPDATE`.

### 3.3 Vínculo inverso

`UPDATE provider_raw_products SET productos_b2b_id = ... WHERE id = prp.id AND productos_b2b_id IS NULL`.

---

## 4. Precio cacheado (`catalog_price_cache`)

Un row por producto. **Antes de IVA**, `tax_included=false`.

### 4.1 Costo base — usar los valores REALES de `provider_pricing_rules.base_cost_strategy`

Valores válidos alineados con los seeds:

- `**list_price**` — CDO: toma `min(unit_cost)` de escalas de la oferta primaria (precio de lista base).
- `**list_price_factor**` — ForPromotional: `min(unit_cost) * cost_factor` (seed = 1.03).
- `**provider_tier_n**` — G4: `unit_cost` de la fila `n` (ordenando escalas por `min_qty ASC`), con `n = provider_pricing_rules.provider_tier_number` (seed = 5).

Si `provider_tier_n` no encuentra la escala solicitada (G4 con <5 escalas) y `fallback_strategy='manual_review'` con `requires_manual_review_on_fallback=true` → resultado `manual_review`, no se inventa precio.

### 4.2 Multiplicador

`margin_tiers WHERE rule_set_id=<activo> AND applies_to='product' AND level_number=1 AND (provider_code=<code> OR provider_code IS NULL) ORDER BY provider_code NULLS LAST LIMIT 1`.
Resultado: G4 = 1.85, CDO/ForPro = 1.75 (nivel 1, mínimo $1,500 MXN).

### 4.3 Cálculo

```
adj_cost   = base según §4.1 (list_price | list_price*factor | tier_n)
public_min = round(adj_cost * multiplier, 2)
```

Se guarda en `min_price_before_tax_mxn`.

### 4.4 `price_status`

- `valid`: base confiable, `public_min > 0`, stock conocido, producto activo en fuente.
- `manual_review`: G4 sin escala requerida, o `adj_cost <= 0`, o cálculo <$1 MXN.
- `unavailable`: sin ofertas activas o `prp.activo=false`.
- `pending`: transitorio dentro de la tx; no debe persistir al terminar `full`.

### 4.5 `pricing_warning` (staff-only, sin cifras)

`g4_missing_tier_5`, `cost_base_zero_or_negative`, `no_active_offer`, `provider_rule_missing`.

### 4.6 Row guardado

`producto_b2b_id`, `id_interno`, `min_price_before_tax_mxn`, `tax_included=false`, `currency='MXN'`, `pricing_rule_set_id=<activo>`, `provider_code`, `source_oferta_id`, `price_status`, `pricing_warning`, `calculated_at=now()`.

---

## 5. G4 específico

1. Ordenar escalas `ASC` por `min_qty`; contar.
2. `count>=5` → base = 5ª fila; `price_status='valid'` (si cumple resto).
3. `count<5` → `price_status='manual_review'`, `min_price_before_tax_mxn=NULL`, `pricing_warning='g4_missing_tier_5'`. No inventar.
4. `price_valid=false` cuando `manual_review`/`unavailable`.
5. Máximo 3 de los 10 G4 pueden salir en `manual_review`.

---

## 6. Reglas `producto_b2b_status`

- `stock_qty = SUM(cantidad)` de las ofertas hijas.
- `image_available = EXISTS(imagen_url NOT NULL)`.
- `price_valid = (catalog_price_cache.price_status = 'valid')`.
- `last_stock_sync_at = MAX(stock.updated_at)`.

`**stock_status` — valores permitidos únicamente: `disponible`, `bajo`, `agotado`, `consultar`.**


| Situación                                          | public_visible | stock_status | quote_mode                 | kit_eligible | price_valid |
| -------------------------------------------------- | -------------- | ------------ | -------------------------- | ------------ | ----------- |
| fuente activa, price valid, stock_qty ≥ 50, imagen | true           | `disponible` | `cotizable`                | true         | true        |
| fuente activa, price valid, 0 < stock_qty < 50     | true           | `bajo`       | `cotizable`                | true         | true        |
| fuente activa, price valid, stock_qty = 0          | false          | `agotado`    | `consultar_disponibilidad` | false        | true        |
| fuente activa, price manual_review                 | false          | `consultar`  | `consultar_disponibilidad` | false        | false       |
| fuente activa, price unavailable                   | false          | `consultar`  | `no_cotizable`             | false        | false       |
| fuente inactiva/descontinuada                      | false          | `agotado`    | `no_cotizable`             | false        | false       |


Nota: `public_visible=true` en el status **no** hace visible al producto en `productos_publicos` durante Sprint 2, porque `productos_b2b.activo=false` (regla §3.1). El flag sólo se pre-calcula para el futuro.

Idempotencia: SELECT+UPDATE/INSERT dentro de tx por `producto_b2b_id`.

---

## 7. `producto_b2b_oferta_map`

- Una fila por oferta hija. `is_primary=true` para la oferta usada como `source_oferta_id`; empate → menor UUID.
- `match_score=1.0` fijo en piloto.
- `match_reason ∈ {'direct_promotion_from_provider_raw','secondary_variant'}`.
- `provider_code` y `proveedor_id` denormalizados (staff-only por RLS).
- Idempotencia via `UNIQUE(oferta_id)`.

---

## 8. Seguridad

- Edge Function corre con service_role, exige `test_key === PROVIDERS_TEST_KEY`; en `mode=full` además exige header `x-lovable-pilot: sprint2`.
- Nunca devuelve costos, factor, raw_payload, ni SKU proveedor en el JSON de salida.
- Whitelist estricta en `datos_generales` y `especificaciones_tecnicas`.
- `productos_publicos` intocable. Snapshot pre/post (§11).
- RLS sin cambios; nuevas tablas permanecen staff-only.
- `**productos_b2b.activo=false**` cierra la puerta ante cualquier filtro `activo=true` que exista o pueda existir en la vista.

---

## 9. Contrato Edge Function futura (diseño; NO se crea en este Sprint)

`promote-provider-products-to-catalog`.

### Query params


| Param           | Valores                                       | Default   |
| --------------- | --------------------------------------------- | --------- |
| `mode`          | `dry_run` | `full`                            | `dry_run` |
| `provider`      | `all` | `cdo_mx` | `forpromotional` | `g4_mx` | `all`     |
| `limit`         | int                                           | 50        |
| `offset`        | int                                           | 0         |
| `pilot`         | `true` | `false`                              | `true`    |
| `require_image` | `true` | `false`                              | `false`   |
| `min_stock`     | int                                           | 0         |
| `test_key`      | string                                        | requerido |


### Comportamiento

- `dry_run`: sólo lectura; devuelve preview y cálculos simulados.
- `full`: transacción por producto: insert/find `productos_b2b` (con `activo=false`), upsert map, upsert cache, upsert status, actualizar `provider_raw_products.productos_b2b_id`.
- `pilot=true` fuerza cuotas 20/20/10 e ignora `limit` global.
- Errores por item se acumulan en `skipped_reasons`; no tumban la corrida.

### Output JSON

```json
{
  "ok": true,
  "mode": "dry_run",
  "provider": "all",
  "selected": { "cdo_mx": 20, "forpromotional": 20, "g4_mx": 10 },
  "inserted_productos_b2b": 0,
  "inserted_status": 0,
  "inserted_maps": 0,
  "inserted_price_cache": 0,
  "manual_review_count": 0,
  "skipped_count": 0,
  "skipped_reasons": { "no_price": 0, "no_stock_row": 0, "already_promoted": 0, "g4_missing_tier_5": 0 },
  "sample": [
    { "id_interno": "pp_XXXXXXXXXXXXXXXXXXXXXXXX", "price_status": "valid", "stock_status": "bajo" }
  ],
  "next_offset": null,
  "has_more": false
}
```

`sample` **no** incluye `provider_code`, costos ni SKU proveedor.

---

## 10. Idempotencia

- `productos_b2b`: `ON CONFLICT (id_interno) DO NOTHING`; `id_interno` es hash determinista.
- `producto_b2b_oferta_map`: `ON CONFLICT (oferta_id) DO UPDATE`.
- `producto_b2b_status` / `catalog_price_cache`: SELECT+UPDATE/INSERT en tx (sin UNIQUE hoy; ver recomendación).
- `provider_raw_products.productos_b2b_id`: sólo se escribe si es NULL.
- Doble corrida idéntica ⇒ 0 nuevos inserts, 0 cambios de precio.

---

## 11. SQL de validación

```sql
-- Snapshot previo (guardar antes del Build)
SELECT count(*) AS pp_count_before FROM productos_publicos;
SELECT pg_get_viewdef('public.productos_publicos'::regclass, true) AS pp_def_before;

-- 1) Piloto insertado y con activo=false
SELECT proveedor_nombre, count(*) FILTER (WHERE activo=false) AS inactivos, count(*) AS total
FROM productos_b2b
WHERE datos_generales->>'pilot' = 'true'
GROUP BY proveedor_nombre;
-- Esperado: inactivos == total; 20/20/10 según proveedor.

-- 2) Nada de campos prohibidos en datos_generales
SELECT count(*) FROM productos_b2b
WHERE datos_generales->>'pilot' = 'true'
  AND (
       datos_generales ? 'provider_code'
    OR datos_generales ? 'provider_sku'
    OR datos_generales ? 'proveedor_id'
    OR datos_generales ? 'costo'
    OR datos_generales ? 'factor'
    OR datos_generales ? 'raw_payload'
    OR datos_generales ? 'markup'
    OR datos_generales ? 'margen'
  );
-- Esperado: 0

-- 3) id_interno opaco
SELECT count(*) FROM productos_b2b
WHERE datos_generales->>'pilot'='true'
  AND (id_interno ~* '(cdo_mx|forpromotional|g4_mx)' OR id_interno !~ '^pp_[0-9a-f]{24}$');
-- Esperado: 0

-- 4) Status generado y stock_status válido
SELECT stock_status, count(*) FROM producto_b2b_status s
JOIN productos_b2b p ON p.id=s.producto_b2b_id
WHERE p.datos_generales->>'pilot'='true'
GROUP BY stock_status;
-- stock_status ∈ {disponible,bajo,agotado,consultar}

-- 5) Maps
SELECT provider_code, count(*), sum(is_primary::int) primaries
FROM producto_b2b_oferta_map m
JOIN productos_b2b p ON p.id=m.producto_b2b_id
WHERE p.datos_generales->>'pilot'='true'
GROUP BY provider_code;
-- primaries == count(productos por proveedor)

-- 6) Price cache
SELECT price_status, count(*) FROM catalog_price_cache c
JOIN productos_b2b p ON p.id=c.producto_b2b_id
WHERE p.datos_generales->>'pilot'='true'
GROUP BY price_status;

-- 7) G4 manual_review
SELECT id_interno, pricing_warning FROM catalog_price_cache
WHERE provider_code='g4_mx' AND price_status='manual_review';

-- 8) productos_publicos intocable
SELECT count(*) AS pp_count_after FROM productos_publicos;      -- debe == pp_count_before
SELECT pg_get_viewdef('public.productos_publicos'::regclass, true) AS pp_def_after; -- debe == pp_def_before

-- 9) Ningún piloto visible públicamente
SELECT count(*) FROM productos_publicos pp
JOIN productos_b2b p ON p.id = pp.id  -- ajustar al join real si difiere
WHERE p.datos_generales->>'pilot' = 'true';
-- Esperado: 0

-- 10) Anon no ve tablas internas
SET ROLE anon;
SELECT count(*) FROM catalog_price_cache;      -- 0 / permiso denegado
SELECT count(*) FROM producto_b2b_status;      -- 0 / permiso denegado
SELECT count(*) FROM producto_b2b_oferta_map;  -- 0 / permiso denegado
SELECT count(*) FROM provider_pricing_rules;   -- 0 / permiso denegado
RESET ROLE;
```

---

## 12. Alcance exacto del Build futuro (si se aprueba)

- **Nuevo archivo**: `supabase/functions/promote-provider-products-to-catalog/index.ts`.
- **Nada más**: sin migraciones, sin frontend, sin cambios a `productos_publicos`, sin RLS, sin `types.ts`, sin otras Edge Functions.

---

## 13. Riesgos


| Riesgo                                          | Mitigación                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Producto piloto visible en `productos_publicos` | `productos_b2b.activo=false` + validación §11.9                                                                         |
| `datos_generales` filtra proveedor/costo        | Whitelist estricta + query §11.2                                                                                        |
| `id_interno` revela proveedor                   | Hash sha256 truncado prefijado `pp_` + query §11.3                                                                      |
| Precio inflado                                  | Reglas explícitas alineadas a seeds (`list_price`, `list_price_factor`, `provider_tier_n`); `dry_run` obligatorio antes |
| G4 sin tier 5                                   | `manual_review`, nunca inventar                                                                                         |
| Duplicados                                      | `id_interno` determinista + `ON CONFLICT`; `UNIQUE(oferta_id)`                                                          |
| `stock_status` fuera de dominio                 | Sólo `disponible/bajo/agotado/consultar`                                                                                |
| Cambio accidental a `productos_publicos`        | Función whitelistea 4 tablas destino; snapshot pre/post                                                                 |
| Fuga de costo en logs/JSON                      | `pricing_warning` sin cifras; sample sin `provider_code`                                                                |
| Carga masiva accidental                         | `pilot=true` + header `x-lovable-pilot` en `full`                                                                       |
| Falta de UNIQUE en status/cache                 | Tx SELECT+UPSERT hoy; recomendación pos-Sprint 2                                                                        |


---

## 14. Criterios de aceptación

- `dry_run` devuelve `selected={cdo_mx:20, forpromotional:20, g4_mx:10}` y no escribe.
- `full` inserta 50 productos con **`activo=false`** en 100% de los casos.
- `id_interno` cumple regex `^pp_[0-9a-f]{24}$` y no contiene `cdo_mx|forpromotional|g4_mx`.
- `datos_generales` sólo contiene `nombre`, `descripcion`, `promoted_at`, `pilot`. Ninguno de los campos prohibidos aparece.
- 50 filas en `producto_b2b_status`, 50 en `catalog_price_cache`; ≥1 map por producto con exactamente 1 `is_primary`.
- `stock_status` ∈ `{disponible,bajo,agotado,consultar}` para las 50 filas.
- G4: como máximo 3 en `price_status='manual_review'`; ninguno con `min_price_before_tax_mxn NOT NULL` + `manual_review`.
- CDO y ForPro: todos `valid` con `min_price_before_tax_mxn>0`; `tax_included=false` en las 50.
- `pp_count_after == pp_count_before` y `pg_get_viewdef` idéntico.
- `SELECT ... FROM productos_publicos WHERE pilot='true'` = 0.
- `SET ROLE anon` sobre las 4 tablas nuevas: 0 filas / permiso denegado.
- Segunda corrida `full` idempotente: 0 nuevos inserts, 0 cambios en cache.
- Frontend sin cambios.

---

## Recomendaciones detectadas (NO se implementan aquí)

1. Agregar `UNIQUE(producto_b2b_id)` en `producto_b2b_status` y `catalog_price_cache` (Sprint 2.5).
2. Confirmar en Sprint 3, antes de reconstruir `productos_publicos`, la definición real de la vista y su filtro de `activo`.
3. Añadir extensión `pgcrypto` explícita al Build futuro si el proyecto no la tiene ya habilitada (verificar en preflight; no ejecutar migración aquí).  
  
BUILD.
  INSTRUCCIÓN CRÍTICA DE ALCANCE:
  No cambies nada que no se te pida explícitamente.
  No modifiques frontend.
  No rediseñes UI.
  No refactorices archivos no relacionados.
  No cambies productos_publicos.
  No cambies productos_b2b estructura.
  No cambies RLS.
  No ejecutes migraciones.
  No modifiques Edge Functions existentes.
  No ejecutes sincronizaciones.
  No publiques.
  No optimices ni limpies código fuera del alcance solicitado.
  Alcance exacto:
  Crear SOLO una nueva Edge Function:
  supabase/functions/promote-provider-products-to-catalog/index.ts
  Nada más.
  No tocar:
  - frontend
  - componentes React
  - rutas
  - productos_publicos
  - productos_b2b schema
  - RLS
  - migraciones
  - otras Edge Functions
  - CRM
  - carrito
  - calculate-quote
  Objetivo:
  Crear una Edge Function para promover un piloto pequeño desde proveedores hacia catálogo interno.
  Piloto:
  - 20 productos CDO / cdo_mx
  - 20 productos ForPromotional / forpromotional
  - 10 productos G4 / g4_mx
  Tablas destino:
  - productos_b2b
  - producto_b2b_status
  - producto_b2b_oferta_map
  - catalog_price_cache
  Reglas obligatorias:
  1. Todos los productos piloto insertados en productos_b2b deben quedar con:
     activo = false
  2. No tocar productos_publicos.
  3. No reconstruir productos_publicos.
  4. No exponer proveedor, costo, margen, markup, factor, provider_sku, provider_code ni raw_payload en:
     - datos_generales
     - variantes
     - imagenes
     - output JSON público de la función
  5. id_interno debe ser opaco y determinista:
     formato: pp_<hash de 24 hex chars>
     No debe contener:
     - cdo_mx
     - forpromotional
     - g4_mx
     - SKU proveedor
  Preferencia:
  Generar el hash en TypeScript dentro de la Edge Function usando Web Crypto / SHA-256.
  No dependas de pgcrypto salvo que ya exista y sea inevitable.
  No crear migración para pgcrypto.
  6. datos_generales permitido:
  {
    "nombre": "...",
    "descripcion": "...",
    "promoted_at": "...",
    "pilot": true
  }
  datos_generales prohibido:
  - provider_code
  - provider_sku
  - proveedor_id
  - costo
  - factor
  - raw_payload
  - markup
  - margen
  7. productos_b2b.sku_base debe quedar NULL en Sprint 2 para no filtrar SKU proveedor.
  8. productos_b2b.costeo debe quedar vacío:
  {}
  9. productos_b2b.motor_de_personalizacion debe quedar vacío:
  {}
  10. variantes no debe incluir SKU proveedor.
  Puede usar oferta_id UUID como identificador opaco.
  11. catalog_price_cache debe guardar precio antes de IVA:
  - min_price_before_tax_mxn
  - tax_included = false
  - currency = MXN
  12. No calcular impresión en Sprint 2.
  13. No crear calculate-quote.
  14. No guardar snapshots de cotización.
  Contrato de la Edge Function:
  Query params:
  - mode=dry_run|full
  - provider=all|cdo_mx|forpromotional|g4_mx
  - limit
  - offset
  - pilot=true|false
  - require_image=true|false
  - min_stock
  - test_key
  Defaults:
  - mode=dry_run
  - provider=all
  - pilot=true
  - require_image=false
  - min_stock=0
  Seguridad:
  - test_key debe validar contra PROVIDERS_TEST_KEY.
  - Si mode=full, exigir además header:
    x-lovable-pilot: sprint2
  - Si falta test_key o header en full, devolver error 401/403.
  - Usar service role solo dentro de la función.
  - Nunca devolver costos, factores, SKU proveedor, raw_payload ni proveedor en sample público.
  Selección del piloto:
  - 20 cdo_mx
  - 20 forpromotional
  - 10 g4_mx
  - prp.activo = true
  - oferta activa
  - nombre válido
  - precio válido o manual_review controlado
  - stock row existente
  - provider_raw_products.productos_b2b_id IS NULL
  - oferta no existe ya en producto_b2b_oferta_map
  - imagen no bloquea
  - priorizar con imagen
  - orden determinista por provider_sku o id estable
  Pricing:
  Usar pricing_rule_sets activo.
  Usar provider_pricing_rules reales:
  - cdo_mx: list_price
  - forpromotional: list_price_factor con cost_factor 1.03
  - g4_mx: provider_tier_n con provider_tier_number 5
  Usar margin_tiers:
  - nivel 1
  - G4 escala 1 = 1.85
  - CDO/ForPro escala 1 = general 1.75
  G4:
  - ordenar escalas por min_qty ASC
  - si tiene 5ta escala, usar esa como base
  - si no tiene 5ta escala:
    price_status = manual_review
    min_price_before_tax_mxn = null
    pricing_warning = g4_missing_tier_5
    price_valid = false
  - no inventar precio
  price_status:
  - valid
  - manual_review
  - unavailable
  - pending solo transitorio, no debe persistir al terminar full
  producto_b2b_status:
  Usar solo estos stock_status:
  - disponible
  - bajo
  - agotado
  - consultar
  Reglas:
  - stock_qty >= 50 y price valid e imagen:
    public_visible = true
    stock_status = disponible
    quote_mode = cotizable
    kit_eligible = true
    price_valid = true
  - 0 < stock_qty < 50 y price valid:
    public_visible = true
    stock_status = bajo
    quote_mode = cotizable
    kit_eligible = true
    price_valid = true
  - stock_qty = 0 y price valid:
    public_visible = false
    stock_status = agotado
    quote_mode = consultar_disponibilidad
    kit_eligible = false
    price_valid = true
  - price manual_review:
    public_visible = false
    stock_status = consultar
    quote_mode = consultar_disponibilidad
    kit_eligible = false
    price_valid = false
  - price unavailable:
    public_visible = false
    stock_status = consultar
    quote_mode = no_cotizable
    kit_eligible = false
    price_valid = false
  producto_b2b_oferta_map:
  - una fila por oferta hija
  - is_primary=true solo para la oferta usada en catalog_price_cache.source_oferta_id
  - match_score=1.0
  - match_reason:
    direct_promotion_from_provider_raw
    secondary_variant
  - provider_code sí puede guardarse aquí porque esta tabla es interna/staff-only
  - unique por oferta_id
  Idempotencia:
  - productos_b2b: id_interno hash determinista
  - producto_b2b_oferta_map: ON CONFLICT oferta_id DO UPDATE
  - producto_b2b_status: buscar por producto_b2b_id o id_interno y actualizar/insertar dentro de transacción lógica
  - catalog_price_cache: buscar por producto_b2b_id o id_interno y actualizar/insertar
  - provider_raw_products.productos_b2b_id: actualizar solo si está NULL
  - segunda corrida full debe insertar 0 nuevos productos
  Output JSON:
  Debe devolver:
  {
    ok,
    mode,
    provider,
    selected,
    inserted_productos_b2b,
    inserted_status,
    inserted_maps,
    inserted_price_cache,
    manual_review_count,
    skipped_count,
    skipped_reasons,
    sample,
    next_offset,
    has_more
  }
  sample permitido:
  - id_interno
  - price_status
  - stock_status
  - image_available
  - price_valid
  sample prohibido:
  - provider_code
  - provider_sku
  - proveedor_id
  - costo
  - unit_cost
  - factor
  - multiplier
  - raw_payload
  - margin
  - markup
  Validaciones internas:
  Antes de full:
  - obtener count(*) de productos_publicos
  - obtener pg_get_viewdef de productos_publicos
  Después de full:
  - confirmar count igual
  - confirmar viewdef igual
  Si cambió, devolver error crítico.
  Importante:
  No tocar productos_publicos en ningún momento.
  No tocar frontend.
  Entrega:
  1. Crea solo el archivo:
     supabase/functions/promote-provider-products-to-catalog/index.ts
  2. Al terminar, resume:
  - archivo creado
  - qué tablas lee
  - qué tablas escribe
  - cómo probar dry_run
  - cómo probar full
  - SQL de validación post-Build
  3. No ejecutes la función todavía.