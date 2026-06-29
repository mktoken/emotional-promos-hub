# Plan Build 2 — `sync-forpromotional-products`

Edge Function que normaliza el feed REST de ForPromotional/4Promotional hacia las tablas multi-proveedor de Build 1. **No** toca frontend, carrito, checkout, CRM, `productos_publicos` ni `productos_b2b`.

---

## 1. Objetivo y comportamiento

- Una Edge Function `sync-forpromotional-products` que:
  1. Valida `PROVIDERS_TEST_KEY` (mismo patrón que `test-*-connection`).
  2. Soporta `?mode=dry_run|incremental|full` (default `full`).
  3. Crea un registro `provider_import_batches` con `status='running'`.
  4. Hace `GET https://api-external-clients.4promotional.net/api/products` con `Authorization: Bearer <FORPROMOTIONAL_API_TOKEN>`.
  5. Itera el array (o `data[]`/`products[]` según shape real) y upsertea en cascada: `provider_raw_products` → `producto_proveedor_ofertas` → `producto_precio_escalas` → `producto_proveedor_stock`.
  6. Marca soft-delete (`activo=false`) en filas no vistas en esta corrida.
  7. Cierra el batch con `status='ok'`/`'partial'`/`'error'`, contadores y `error_message` si aplica.
  8. Devuelve JSON resumen sin datos sensibles: `{ ok, batch_id, mode, items_received, items_upserted, items_failed }`.
- Usa **service_role** (no JWT de usuario) — la función es disparada por staff/CRON, no por anon.
- Lectura paginada: la API parece devolver todo en una respuesta; si trae paginación se detecta por presencia de `next`/`page`/`total_pages` y se itera.

---

## 2. SQL adicional necesario

Mínimo. Build 1 ya cubre el esquema. Solo se proponen ajustes opcionales:

- **Índice de búsqueda por `last_seen_at**` para detectar productos no vistos rápido:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_raw_products_proveedor_last_seen
    ON public.provider_raw_products(proveedor_id, last_seen_at);
  ```
- **Nada más**. No se crean tablas, vistas, enums, ni se altera `productos_b2b` o `productos_publicos`. La normalización al catálogo maestro queda explícitamente fuera de Build 2.

> Por qué NO se toca `productos_b2b`: el plan aprobado dice "normalizar hacia tablas proveedor". El mapeo `provider_raw_products.productos_b2b_id` se hará manualmente en una fase posterior por un humano. Sincronizar automáticamente al maestro podría duplicar SKUs o contaminar el catálogo público (que sigue calculando precios con `costeo->>'precio_neto_distribuidor' × 1.35`).

---

## 3. Mapeo campo por campo ForPromotional → modelo común

### `provider_raw_products`


| Destino        | Origen                              | Notas                                         |
| -------------- | ----------------------------------- | --------------------------------------------- |
| `proveedor_id` | (lookup `code='forpromotional'`)    | cacheado al inicio del run                    |
| `provider_sku` | `id_articulo`                       | requerido; si falta → `items_failed++` y skip |
| `batch_id`     | id del run actual                   | &nbsp;                                        |
| `raw_payload`  | objeto completo del producto        | jsonb, último payload por SKU                 |
| `nombre`       | `nombre_artd`                       | trim                                          |
| `descripcion`  | `descripcion`                       | trim, null si vacío                           |
| `categoria`    | `categoria`                         | &nbsp;                                        |
| `subcategoria` | `sub_categoria`                     | &nbsp;                                        |
| `activo`       | true (mientras aparezca en el feed) | soft-delete posterior                         |
| `last_seen_at` | `now()`                             | &nbsp;                                        |


### `producto_proveedor_ofertas`

ForPromotional entrega 1 producto = 1 combinación variante (color+talla). Cada fila se mapea como **una sola oferta**:


| Destino                   | Origen                                                                                                                                                                                                 | Notas                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `provider_raw_product_id` | id devuelto por upsert raw                                                                                                                                                                             | &nbsp;                                  |
| `proveedor_id`            | (cache)                                                                                                                                                                                                | &nbsp;                                  |
| `variant_sku`             | `id_articulo`                                                                                                                                                                                          | mismo SKU; ForPromotional no diferencia |
| `color_code`              | null                                                                                                                                                                                                   | la API no entrega código separado       |
| `color_nombre`            | `color`                                                                                                                                                                                                | &nbsp;                                  |
| `talla`                   | `talla`                                                                                                                                                                                                | &nbsp;                                  |
| `material`                | `material`                                                                                                                                                                                             | &nbsp;                                  |
| `modelo`                  | `modelo`                                                                                                                                                                                               | &nbsp;                                  |
| `imagen_url`              | `images[0].url_imagen` ?? `url_imagen`                                                                                                                                                                 | primer asset disponible                 |
| `atributos`               | `{composicion, capacidad, peso_unitario, caja_peso, alto_caja, ancho_caja, largo_caja, piezas, producto_promocion, producto_nuevo, precio_unico, metodos_impresion, area_impresion, keywords, images}` | jsonb                                   |
| `activo`                  | true                                                                                                                                                                                                   | &nbsp;                                  |


> Si el mismo `id_articulo` se repite con distinto color/talla en el feed (no debería pero por seguridad), el UNIQUE de Build 1 `(provider_raw_product_id, coalesce(variant_sku,''), coalesce(color_code,''), coalesce(talla,''))` lo cubre.

### `producto_precio_escalas`

1 sola escala (ForPromotional no maneja tiers):


| Destino        | Origen                                         | Notas                   |
| -------------- | ---------------------------------------------- | ----------------------- |
| `oferta_id`    | id de la oferta                                | &nbsp;                  |
| `proveedor_id` | (cache)                                        | &nbsp;                  |
| `min_qty`      | 1                                              | &nbsp;                  |
| `max_qty`      | null                                           | abierto                 |
| `unit_cost`    | `precio_desc` si numérico > 0; si no `precio`  | preferente/respaldo     |
| `currency`     | `'MXN'`                                        | (validar — ver riesgos) |
| `source_field` | `'precio_desc'` o `'precio'` según cuál se usó | &nbsp;                  |


Si ambos faltan o ≤ 0 → **no se crea escala**, la oferta queda registrada pero sin precio. Esto evita basura cuando se conecte `calculate-quote`.

### `producto_proveedor_stock`


| Destino          | Origen                                                                      | Notas                              |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `oferta_id`      | id de la oferta                                                             | &nbsp;                             |
| `proveedor_id`   | (cache)                                                                     | &nbsp;                             |
| `cantidad`       | `inventario` numérico (parseInt seguro)                                     | si no parseable → 0                |
| `disponibilidad` | derivada: `cantidad >= 50 → 'disponible'`, `1–49 → 'bajo'`, `0 → 'agotado'` | reglas confirmadas en plan Build 1 |
| `updated_at`     | `now()`                                                                     | &nbsp;                             |


---

## 4. Estrategia de upsert

Orden por producto (transaccional por ítem, **no** por batch para no perder progreso):

1. `INSERT ... ON CONFLICT (proveedor_id, provider_sku) DO UPDATE SET nombre=EXCLUDED.nombre, ..., raw_payload=EXCLUDED.raw_payload, activo=true, last_seen_at=now(), batch_id=EXCLUDED.batch_id RETURNING id` sobre `provider_raw_products`.
2. `INSERT ... ON CONFLICT` sobre `producto_proveedor_ofertas` usando el índice único `ofertas_unique_variant`. `DO UPDATE` de campos descriptivos + `activo=true`.
3. Precio: si hay unit_cost válido →
  - `DELETE FROM producto_precio_escalas WHERE oferta_id=$1` (siempre 1 tier para este proveedor)
  - `INSERT` la nueva escala.
  - Más simple y correcto que upsert porque no hay clave natural para tiers.
4. Stock: `INSERT ... ON CONFLICT (oferta_id) DO UPDATE SET cantidad=EXCLUDED.cantidad, disponibilidad=EXCLUDED.disponibilidad, updated_at=now()`.

Procesamiento en chunks de 100 productos con `Promise.all` limitado para no saturar Postgrest (o serial si la API devuelve <500 productos). Se prefiere serial por simplicidad y trazabilidad inicial.

**Soft-delete al final**: tras procesar todo, marcar como inactivos los que no se vieron:

```sql
UPDATE public.provider_raw_products
   SET activo=false, updated_at=now()
 WHERE proveedor_id=$1 AND last_seen_at < $batch_started_at;
UPDATE public.producto_proveedor_ofertas o
   SET activo=false, updated_at=now()
  FROM public.provider_raw_products r
 WHERE o.provider_raw_product_id=r.id AND r.activo=false;
```

Solo si `mode='full'`. En `incremental` no se aplica soft-delete.

---

## 5. Manejo de errores

- Try/catch global con CORS y respuesta JSON estructurada (mismo patrón de `capture-assistant-lead`).
- Stages explícitos: `env`, `auth`, `batch_open`, `fetch_api`, `parse`, `upsert`, `soft_delete`, `batch_close`.
- Fallo HTTP de la API → batch `status='error'`, `error_message='HTTP <code>'`, sin tocar tablas.
- Fallo parcial: errores por ítem se cuentan en `items_failed` y se loguean con `safeLog({stage, provider_sku, error_code})` sin payload completo. El batch cierra como `'partial'` si `items_failed > 0 && items_upserted > 0`.
- Timeout de Edge Function (≈150 s): si el feed crece, agregar `?since=<batch_id>` o `?offset=` y paginar. Por ahora, asumir feed completo < 5k productos.
- **Nunca** loguear el token, ni `raw_payload` completo, ni `unit_cost` real. Solo metadatos (longitudes, conteos, SKU).

---

## 6. Batch logging

- `INSERT INTO provider_import_batches (proveedor_id, mode, status, triggered_by)` al inicio → guarda `batch_id`.
- Al final: `UPDATE ... SET finished_at=now(), status=$s, items_received=$r, items_upserted=$u, items_failed=$f, error_message=$e WHERE id=$batch_id`.
- También se actualiza `proveedores.last_sync_at=now()` solo si `status IN ('ok','partial')`.
- `triggered_by`: lee el JWT si llega por staff; si es service-role/cron queda `null`.

---

## 7. Evitar duplicados

- UNIQUE `(proveedor_id, provider_sku)` en `provider_raw_products` — única ancla.
- UNIQUE `(provider_raw_product_id, coalesce(variant_sku,''), coalesce(color_code,''), coalesce(talla,''))` en `producto_proveedor_ofertas` — bloquea variantes repetidas.
- UNIQUE `oferta_id` en `producto_proveedor_stock` — 1 stock por oferta.
- Precio: borrar-e-insertar por oferta evita acumular tiers obsoletos.
- Idempotencia: dos corridas seguidas producen el mismo estado.
- Defensa extra: normalizar `provider_sku` (trim, upper) antes del upsert para no romper por whitespace.

---

## 8. Productos sin precio / sin stock / sin imagen

- **Sin precio válido** (`precio_desc` y `precio` ausentes o ≤0): oferta y raw quedan registrados, **sin** fila en `producto_precio_escalas`. `items_upserted++` con flag interno `missing_price`. Se contabilizan en logs para revisión humana.
- **Sin stock** (`inventario` ausente o no numérico): se inserta stock con `cantidad=0, disponibilidad='agotado'`. No bloquea sync.
- **Sin imagen** (`images[]` vacío y `url_imagen` null): `imagen_url=null`. Frontend ya degrada a placeholder (no se toca).
- **Sin variantes** (color/talla null): se crea oferta única con esos campos en null. UNIQUE sigue funcionando porque usa `coalesce(..,'')`.
- **SKU duplicado en el feed**: el segundo upsert pisa al primero. Se acumula en `items_received` pero solo cuenta 1 en `items_upserted`.

---

## 9. Archivos a tocar en Build 2

Nuevos:

- `supabase/functions/sync-forpromotional-products/index.ts`

Migración opcional (si se acepta el índice extra):

- 1 migración con `CREATE INDEX IF NOT EXISTS idx_raw_products_proveedor_last_seen ...`

No se toca:

- `productos_b2b`, `productos_publicos`, vistas, RLS existente, enums.
- Frontend completo (Landing/Catalog/PDP/Cart/Checkout/CRM/asistente).
- `capture-assistant-lead`, `test-g4-connection`, `test-forpromotional-connection`, `test-cdo-connection` (se conservan).
- `supabase/config.toml`.
- `src/integrations/supabase/types.ts` se regenera solo si se acepta la migración del índice; no se edita a mano.

---

## 10. Riesgos técnicos

- **Shape real del feed desconocido**: el endpoint pudo devolver `[]` directo o un objeto envoltorio. `test-forpromotional-connection` ya inspecciona `topLevelKeys` y `firstProductKeys`; antes de Build 2 conviene correrlo y confirmar.
- **Moneda**: la API no parece declarar moneda. Asumir MXN podría ser incorrecto si el proveedor expone USD. Verificar con el equipo o leer un campo `moneda`/`currency` si existe en `raw_payload`.
- **Tipos numéricos como string**: `precio` y `precio_desc` pueden venir como string `"123.45"`. Necesita parser tolerante (idéntico al usado en la vista `productos_publicos`).
- **Imágenes HTTP plano**: si llegan `http://` el navegador del cliente puede bloquearlas. Mitigación: dejar tal cual; reescritura HTTPS se evalúa después (no en este Build).
- **Timeout de Edge Function**: si el feed crece > 5k items, hay que paginar/segmentar. Plan: medir en primera corrida `dry_run`.
- **Soft-delete demasiado agresivo**: si la API falla parcialmente y devuelve solo 200 productos en lugar de 3000, soft-delete masivo. Mitigación: solo aplicar soft-delete cuando `items_received >= 80% del último batch exitoso` (regla interna en función).
- **Race conditions**: dos invocaciones simultáneas pueden pisarse. Mitigación: revisar si existe `status='running'` reciente (< 10 min) y abortar con 409.
- **Tipos generados**: tras Build 1 se regeneraron tipos pero ningún código frontend los consume todavía. Sigue sin afectar.

---

## 11. Checklist antes de Build 2

- Confirmar que `FORPROMOTIONAL_API_TOKEN` y `PROVIDERS_TEST_KEY` están vigentes (ya configurados).
- Correr `test-forpromotional-connection` y compartir `topLevelKeys` + `firstProductKeys` reales para fijar el parser sin adivinar.
- Confirmar moneda asumida `MXN` (o leer campo del feed si existe).
- Confirmar umbral de disponibilidad: `disponible ≥ 50`, `bajo 1–49`, `agotado 0` (definido en plan Build 1 — repetir confirmación).
- Aceptar/rechazar el índice opcional `idx_raw_products_proveedor_last_seen`.
- Aceptar regla de seguridad anti-borrado masivo (≥80% del último batch).
- Confirmar política: cuando `precio_desc` y `precio` faltan, ¿se inserta la oferta sin escala (recomendado) o se omite el ítem completo?
- Confirmar que Build 2 **NO** intentará vincular automáticamente a `productos_b2b.id`. Vinculación quedará en `null` para mapeo manual posterior.
- Confirmar que la función se ejecuta vía CRON / botón staff posterior — Build 2 solo entrega la función; **no** crea UI ni job programado.
- Confirmar que `productos_publicos` y catálogo público quedan **sin cambios** en Build 2.

Esperando aprobación explícita para ejecutar **solo Build 2** (Edge Function + índice opcional). No se sincroniza datos hasta que el usuario lo dispare manualmente tras revisar el dry run.  
  
Plan aprobado para Build 2 con ajustes obligatorios.

No cambies nada que no se te pida explícitamente.

No rediseñes.

No refactorices archivos no relacionados.

No toques frontend.

No toques carrito.

No toques checkout.

No toques CRM.

No toques productos_b2b.

No toques productos_publicos.

No modifiques funciones existentes.

No ejecutes sincronización automática.

No crees cron jobs.

No crees UI.

Alcance aprobado:

- Crear únicamente supabase/functions/sync-forpromotional-products/index.ts

- Crear índice opcional idx_raw_products_proveedor_last_seen si no existe

Ajustes requeridos:

1. El modo default debe ser dry_run.

Si no se manda mode, usar mode=dry_run.

2. En dry_run NO debe escribir en tablas.

Debe solo:

- conectar API

- contar productos

- validar campos

- simular mapeo

- devolver resumen seguro

3. Agrega parámetro limit para pruebas:

?mode=dry_run&limit=10

?mode=full&limit=50

4. Antes de escribir, valida que existan las columnas reales de:

- provider_raw_products

- producto_proveedor_ofertas

- producto_precio_escalas

- producto_proveedor_stock

Si falta alguna columna esperada, detener y reportar. No inventar columnas.

5. No aplicar soft-delete en la primera corrida full.

El soft-delete queda desactivado hasta que confirmemos dos sincronizaciones exitosas.

6. No borrar precios existentes todavía.

Para ForPromotional usa una sola escala:

min_qty=1

max_qty=null

unit_cost=precio_desc preferente, precio respaldo.

Pero si hay estructura existente que no coincide, detener y reportar.

7. No vincular automáticamente con productos_b2b.

productos_b2b_id debe quedar null si aplica.

8. No devolver precios, costos, payload completo, tokens ni URLs completas en la respuesta.

Solo conteos, nombres de campos y resumen seguro.

9. La función debe estar protegida con PROVIDERS_TEST_KEY.

10. Al terminar, reporta:

- archivos creados

- índice creado o no

- cómo probar dry_run

- cómo probar full limitado

- qué no se tocó

Ejecuta únicamente Build 2 con ese alcance.