# Plan — `sync-g4-products` (no ejecutar Build todavía)

Objetivo: crear una Edge Function que consuma el WebService SOAP de G4 (`getProduct` sin SKU para catálogo completo, `getProductStock` para existencias) y lo normalice hacia las tablas proveedor ya existentes, sin tocar `productos_b2b`, sin exponer costos, y sin timeout.

## 1. Mapeo G4 → tablas proveedor

Proveedor G4 (row en `proveedores` con `slug='g4'` o `codigo='g4'`). Cada `<producto>` de G4 se representa así:

### 1.1 `provider_raw_products` (staging, 1 fila por variante de color)

- `proveedor_id` → id de G4
- `external_id` → `codigo_producto` (padre) — o `codigo_producto|codigo_color` si prefieres 1 fila por variante; recomendado: **padre**, y variantes viven como filas propias en `producto_proveedor_ofertas`.
- `sku_proveedor` → `codigo_producto`
- `payload_json` → JSON completo del producto tal como decodificado (incluye escalas, colores, imágenes).
- `import_batch_id` → batch actual.
- `last_seen_at` → `now()`.
- `hash_payload` → md5 estable del payload normalizado (para saltar upserts sin cambios).

### 1.2 `producto_proveedor_ofertas` (1 fila por variante = producto × color)

Clave lógica: `(proveedor_id, variant_sku)` con `variant_sku = buildVariantSku("G4", codigo_producto, model, codigo_color, "")`.

Campos:

- `proveedor_id` → G4
- `sku_proveedor` → `codigo_producto`
- `variant_sku` → composite arriba
- `nombre` → `nombre_producto`
- `descripcion` → `descripcion`
- `linea` / `categoria` → `linea`
- `material` → `material`
- `color_code` → `codigo_color`
- `color_nombre` → `nombre_color`
- `modelo` → `model`
- `talla` → `""` (G4 no expone talla en el ejemplo; dejar vacío)
- `activo` → `activo` (bool)
- `imagen_principal` → `principal`
- `imagen_ambientada` → `ambientada`
- `imagenes_adicionales` → array JSON de `adicionales`
- `precio_base` → precio de la escala más pequeña (menor rango) — costo distribuidor, **nunca expuesto al frontend público**
- `moneda` → default `MXN`
- `productos_b2b_id` → **null** (no mapear todavía)
- `updated_at`, `last_seen_at` → `now()`

### 1.3 `producto_precio_escalas` (N filas por oferta)

Por cada `<escala>` del producto:

- `oferta_id` → id de la oferta recién upsertada
- `rango_min`, `rango_max` → parseados de `rango` (`"1-49"`, `"50-99"`, `">=1000"` → `min=1000, max=null`)
- `precio` → `precio` de la escala
- `moneda` → `MXN`

Antes del insert por batch: `delete where oferta_id = X` para reemplazar escalas viejas (evita duplicar cuando G4 cambia escalones).

### 1.4 `producto_proveedor_stock` (1 fila por variante)

Clave lógica: `(proveedor_id, variant_sku)` — misma composición que la oferta.

- `existencias` → int de `existencias`
- `updated_at` → `now()`
- `source` → `'getProductStock'`

### 1.5 `provider_import_batches`

- `proveedor_id`, `started_at`, `finished_at`
- `mode` → `full` | `stock_only` | `dry_run`
- `items_seen`, `items_upserted`, `items_failed`, `offers_upserted`, `stock_updated`
- `error_message` truncado
- Se cierra al final del bloque (aunque falle) con `finished_at`.

## 2. Estrategia `getProduct` sin SKU → catálogo completo

- Una sola llamada SOAP a `getProduct` con `<user>` y `<key>` (sin `<sku>`).
- Respuesta = XML Base64 en `*Result`. Decodificar una vez y **cachear en memoria de la invocación** (no re-llamar en cada bloque).
- Parsear a un array plano de "ofertas" (una entrada por combinación producto × color).
- Aplicar paginación **interna** (`limit`/`offset` sobre el array plano), igual que ya hicimos en `sync-cdo-products`. Esto evita depender de paginación del proveedor (G4 no la ofrece).
- Problema: la llamada SOAP inicial puede ser pesada (varios MB). Mitigación:
  - Timeout HTTP de fetch con `AbortController` a 60 s.
  - Si el XML supera un umbral (p. ej. 8 MB), reportar `payload_too_large` en el batch y sugerir bajar `limit` externo (no aplica: la respuesta viene completa igual). Alternativa futura: intentar `getProduct` filtrado por `linea` si G4 lo soporta — **no confirmado, no diseñar hoy**.
- Guardar el XML crudo en memoria; **nunca** persistirlo en BD.

## 3. Estrategia `getProductStock` → refresco de existencias

Dos submodos:

- **Barrido completo** (`sync_stock=true` sin `sku`): llamar `getProductStock` sin SKU si G4 lo permite (confirmado por el usuario: sí acepta solo `user`+`key`). Recorrer array plano `(codigo_producto, codigo_color, existencias)` y `UPSERT` en `producto_proveedor_stock` por `(proveedor_id, variant_sku)`.
- **Por SKU** (`sync_stock=true` con `sku=...` en query): llamar `getProductStock` con ese SKU y actualizar solo las variantes de ese producto.

Reglas:

- No borrar filas de stock existentes: solo upsert. Si una variante desaparece de G4, marcar `existencias=0` **solo** cuando venga explícitamente en la respuesta.
- Aplicar la misma paginación interna que en el catálogo.
- Stock puede correrse en modo `stock_only` sin tocar catálogo (útil para cron diario más agresivo).

## 4. Procesamiento por bloques (evitar timeout de 150 s)

Igual patrón que `sync-cdo-products`:

- Parámetros: `limit` (default 30 ofertas) y `offset` (default 0).
- La función:
  1. Llama SOAP una vez.
  2. Decodifica y aplana a array `offers[]` y `stocks[]`.
  3. Toma slice `offers.slice(offset, offset+limit)`.
  4. Upsert oferta + reemplazo de escalas + (si `sync_stock`) upsert de stock de esa variante.
  5. Devuelve `total_offers_detected`, `processed`, `next_offset`, `next_url_suggested`.
- El caller (cron/usuario) llama repetidamente avanzando `offset` hasta que `next_offset === null`.
- Cooldown por proveedor: si hay un batch `full` iniciado hace <10 min y no cerrado, rechazar nuevo `full`.

Costo de la llamada SOAP repetida: **alto** si cada bloque re-llama. Mitigación posible (documentar, **no** implementar aún):

- Opción A (simple, recomendada para Build 1): re-llamar SOAP en cada bloque. Cada llamada devuelve todo, solo se procesa el slice. Aceptable si el WSDL responde en <15 s.
- Opción B (futura): cachear el XML decodificado en una tabla `provider_raw_snapshots` durante el batch. Fuera de alcance de este Build.

## 5. Parámetros de la función

Query params (GET):


| Param        | Valores                           | Default                                           | Descripción                                                                                                        |
| ------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `mode`       | `dry_run` | `full` | `stock_only` | requerido                                         | `dry_run` no escribe BD; `full` cataloga + escalas + stock opcional; `stock_only` solo `producto_proveedor_stock`. |
| `limit`      | int                               | 30                                                | Ofertas a procesar en esta invocación.                                                                             |
| `offset`     | int                               | 0                                                 | Índice inicial en el array plano de ofertas.                                                                       |
| `sync_stock` | `true` | `false`                  | `false` en `full`, `true` forzado en `stock_only` | Si true en `full`, además de catálogo actualiza stock de las variantes del slice.                                  |
| `sku`        | string opcional                   | null                                              | Solo aplica a `stock_only`: refresca stock de un `codigo_producto` puntual.                                        |
| `test_key`   | string                            | requerido                                         | Debe coincidir con `PROVIDERS_TEST_KEY` o `G4_TEST_KEY`.                                                           |


Respuesta JSON (segura, sin costos ni secrets):

```
{
  ok, mode, provider: "g4",
  batch_id,
  total_offers_detected,
  total_stock_detected,
  processed, offers_upserted, stock_updated, failed,
  next_offset, next_url_suggested,
  errors_sample: [ ... primeros 5 ... ],
  dry_run_shape?: { firstOfferKeys, coverage: {price,stock,image} }
}
```

## 6. Riesgos antes de Build

1. **Tamaño del payload SOAP sin SKU**: si G4 devuelve varios MB, el parser XML en Deno puede degradar; probar primero con `mode=dry_run&limit=1` y medir tamaño real antes de correr `full`.
2. **Parseo de `rango` de escalas**: formatos como `"1-49"`, `"50 a 99"`, `">=1000"`, `"1000+"` requieren regex tolerante. Riesgo de escalas mal cargadas → precios incorrectos. Mitigación: si no parsea, guardar la escala como `rango_min=null, rango_max=null, precio=X, raw_rango=texto` (agregar columna `raw_rango` si aún no existe **— revisar antes de Build**).
3. **Variantes sin `codigo_color**`: usar `""` en el composite `variant_sku` para no colisionar con conflict targets existentes; verificar que el índice único de `producto_proveedor_ofertas` acepte `variant_sku` sin `COALESCE` (recordar el bug de ForPromotional).
4. **Costos expuestos**: `precio_base` y `producto_precio_escalas.precio` son costos de distribuidor. Confirmar que ninguna vista pública (`productos_publicos`) los expone; RLS actual ya restringe a staff, pero validar antes de correr.
5. `**getProduct` sin SKU no soportado por G4**: aunque el usuario confirmó que funciona, si la respuesta viene vacía o con fault, la función debe cerrar el batch con `error_message` claro y no dejar rows huérfanas.
6. **Idempotencia**: sin `hash_payload`, cada corrida re-escribe todo. Recomendado incluirlo en `provider_raw_products` (ya existe la columna) para saltar upserts sin cambio.
7. **Cron y concurrencia**: dos invocaciones simultáneas en `full` pueden corromper el batch counter. Usar lock optimista por `proveedor_id + mode` en `provider_import_batches`.
8. **Secret `G4_WSDL_URL**`: si G4 rota el endpoint, la función falla en silencio. Log seguro del host (sin credenciales) al iniciar batch.

## 7. Archivos que se tocarían (si se aprueba Build)

- **Nuevo:** `supabase/functions/sync-g4-products/index.ts` — función principal.
- **Nada más** en frontend, tablas, RLS ni otros syncs.
- Posible **micro-migración previa** (a discutir en el propio Build, no ahora):
  - Añadir columna `raw_rango text` a `producto_precio_escalas` si queremos preservar el texto original de rangos no parseables.
  - Confirmar índice único `(proveedor_id, variant_sku)` en `producto_proveedor_ofertas` **sin `COALESCE**` para poder usar `ON CONFLICT` sin el bug conocido.

## 8. Checklist antes de Build

- Correr `test-g4-connection?mode=sample` una vez y guardar el payload de ejemplo para fijar el parser.
- Confirmar existencia de la fila G4 en `proveedores` (si no, sembrarla en una mini-migración aparte).
- Confirmar índice único correcto en `producto_proveedor_ofertas`.
- Decidir si añadimos `raw_rango` a `producto_precio_escalas` (recomendado sí).
- Definir `PROVIDERS_TEST_KEY` como la única vía de autenticación de la función (ya está en secrets).

Cuando aprueben, ejecuto Build tocando solo `supabase/functions/sync-g4-products/index.ts` (y opcionalmente la migración mínima del punto 7).  
  
  
BUILD MÍNIMO.

Crea únicamente una nueva Edge Function:

supabase/functions/sync-g4-products/index.ts

No cambies nada que no se te pida explícitamente.

No rediseñes.

No refactorices archivos no relacionados.

No toques frontend.

No toques productos_b2b.

No toques productos_publicos.

No toques carrito, checkout, CRM, assistant ni funciones no relacionadas.

No modifiques tablas.

No modifiques RLS.

No toques sync-forpromotional-products.

No toques sync-cdo-products.

No escribas en tablas distintas a las tablas proveedor.

No ejecutes sincronización automáticamente.

Contexto validado:

- Proveedor existente en tabla proveedores: code = 'g4_mx'

- G4 usa SOAP WSDL desde secret G4_WSDL_URL

- getProduct funciona con params: user, key, sku

- getProductStock funciona con params: user, key, sku

- Para consultar todos los productos, getProduct debe enviarse solo con user y key, sin sku.

- La respuesta viene en XML base64.

- Producto trae atributos:

  codigo_producto, model, nombre_producto, descripcion, linea, codigo_color, nombre_color, material, activo

- Producto trae imágenes:

  imagenes.principal url, imagenes.ambientada url, imagenes.adicionales

- Producto trae precios:

  precios.escala con rango y precio

- Stock trae:

  codigo_producto, nombre_producto, codigo_color, nombre_color, existencias

Objetivo:

Sincronizar G4 México hacia las tablas proveedor existentes:

- provider_import_batches

- provider_raw_products

- producto_proveedor_ofertas

- producto_precio_escalas

- producto_proveedor_stock

Parámetros de la función:

- mode=dry_run|full, default dry_run

- limit, default 100

- offset, default 0

- sync_stock=true|false, default false

- test_key

Seguridad:

- Validar test_key con PROVIDERS_TEST_KEY.

- Usar G4_USER, G4_KEY y G4_WSDL_URL solo server-side.

- No exponer secrets.

- No devolver XML completo.

- No exponer costos al frontend.

- Mantener productos_b2b_id en null.

Mapeo exacto:

1. proveedores

- Buscar proveedor con code = 'g4_mx'

- Si no existe, devolver error claro. No crear proveedor.

2. provider_import_batches

- Crear batch al iniciar full.

- status: running|ok|error

- mode: full o dry_run

- items_received: total productos detectados en XML de getProduct sin sku

- items_upserted: total ofertas upserted

- items_failed: total errores por item

- error_message si aplica

3. provider_raw_products

- proveedor_id: id de g4_mx

- provider_sku: producto.@attributes.codigo_producto

- batch_id: batch actual

- raw_payload: JSON seguro del producto parseado

- nombre: nombre_producto

- descripcion: descripcion

- categoria: linea

- subcategoria: null

- productos_b2b_id: null

- activo: activo == "1"

- last_seen_at: now()

Upsert:

on conflict proveedor_id, provider_sku

4. producto_proveedor_ofertas

- provider_raw_product_id: id del raw product

- proveedor_id: id de g4_mx

- variant_sku: codigo_producto

- color_code: codigo_color o ''

- color_nombre: nombre_color

- talla: ''

- material: material

- modelo: model

- imagen_url: imagen principal si existe, si no ambientada

- atributos: JSON con medidas, peso, impresión, area_impresion, caja, ventajas, marca, origen, activo

- activo: activo == "1"

Upsert:

on conflict provider_raw_product_id, variant_sku, color_code, talla

5. producto_precio_escalas

Por cada producto.precios.escala:

- oferta_id

- proveedor_id

- min_qty: escala.@attributes.rango como integer

- max_qty: null

- unit_cost: escala.@attributes.precio como numeric

- currency: 'MXN'

- source_field: 'g4_precios_escala'

Importante:

Antes de insertar precios de una oferta, borrar precios existentes de esa oferta para evitar duplicados por escala.

6. producto_proveedor_stock

Si sync_stock=true:

- llamar getProductStock por cada oferta procesada en el bloque actual

- sku = codigo_producto

- cantidad: existencias como integer

- disponibilidad: 'available' si cantidad > 0, si no 'out_of_stock'

- upsert por oferta_id

Si sync_stock=false:

- no llamar getProductStock

- no tocar stock existente

Paginación:

- getProduct sin sku puede traer todo el catálogo.

- Parsear todos los productos.

- Aplicar products.slice(offset, offset + limit)

- Procesar solo ese bloque.

- Responder:

  - total_received

  - offset_applied

  - limit_applied

  - items_processed

  - items_upserted

  - items_failed

  - next_offset

  - has_more

  - failed_sample

  - coverage:

    - with_price

    - with_image

    - active

    - inactive

  - next_url_suggested sin incluir test_key real

Dry run:

- No escribir en base.

- No crear batch.

- No llamar stock salvo que sea estrictamente necesario; default no.

- Debe devolver coverage real del bloque.

Full:

- Escribir solo tablas proveedor.

- Crear batch.

- Manejar errores por item sin tumbar toda la carga.

- Si falla globalmente, cerrar batch con status error.

No activar soft-delete.

No vincular con productos_b2b.

No crear productos_publicos.

No tocar frontend.

Al terminar dime:

- archivos tocados

- si quedó desplegada

- URL dry_run limit=100 offset=0 sync_stock=false

- URL full limit=100 offset=0 sync_stock=false