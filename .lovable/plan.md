## Objetivo
Ejecutar UNA sola generación en modo `shadow_write` con la Edge Function existente `recompute-catalog-price-cache-v2`. Sin cambios de código, sin migraciones, sin frontend, sin activar V2, sin tocar la caché pública, sin Publish.

## Prechequeos solo lectura — ya ejecutados: PASS
- Generaciones `running`: 0
- `idempotency_key` `shadowwrite-2026-08-02-v2-01`: no existe
- `catalog_price_cache_v2_shadow`: 0 filas
- `catalog_price_cache` con `producto_b2b_id` no nulo: 1524; distintos: 1524; duplicados: 0
- Rule sets activos: exactamente 1
- `2026-01-v2-draft`: inactivo
- Código de la función: sin cambios pendientes (se re-verifica el despliegue antes de invocar)

## Alcance de escritura (única permitida)
1. Fila de generación en `catalog_price_cache_v2_generations` (insert + updates de contadores/estado).
2. Filas de resultado en `catalog_price_cache_v2_shadow` para esa `generation_id`.

Prohibida cualquier escritura en `catalog_price_cache`, `pricing_rule_sets`, `productos_publicos`, `catalog_search_products` o cualquier otra tabla.

## Pasos
1. Verificar que la función desplegada corresponde al código existente; si no está desplegada, desplegar solo esa función sin modificar archivos.
2. Invocar con el JWT de la sesión ADMIN inyectada (nunca mostrado):
   `{"mode":"shadow_write","idempotency_key":"shadowwrite-2026-08-02-v2-01","batch_size":100,"cursor":null}`
3. Mientras haya `next_cursor`: reinvocar con la misma key, `batch_size: 100` y el cursor devuelto, hasta `completed` o `failed`. Sin crear otra generación.
4. Prueba de idempotencia: una sola reinvocación con la misma key; debe devolver la generación existente sin crear otra ni duplicar filas.
5. Ejecutar las assertions aplicables de `supabase/qa/recompute_v2_assertions.sql` (A1, A4–A7) más verificaciones específicas de shadow_write: filas totales de la generación, productos distintos, duplicados, cuadre por status, precio > 0 y MOQ > 0 en `priced`, precio NULL en `request_quote`/`unavailable`, rule set correcto, caché pública intacta, draft inactivo.

## Gates obligatorios
`status=completed`; candidate=processed=1524; priced=1505; request_quote=19; unavailable=0; error=0; unresolved=0; suma de estados=1524; 1524 filas shadow y 1524 productos distintos con 0 duplicados; integridad de precio/MOQ; todas las filas con rule set `2026-01-v2-draft`; draft inactivo; 1 rule set activo; `catalog_price_cache` con 1524 filas; `productos_publicos` y `catalog_search_products` sin cambios; sin Publish.

Si algún gate falla: detenerse de inmediato, sin corregir código, sin borrar filas, sin rollback automático, sin reintentar con otra key. Reportar `generation_id`, status, cursor, contadores, filas shadow escritas, gate exacto fallido, diferencia observada y rollback propuesto (no ejecutado).

## Entrega
Tabla con: función preexistente/desplegada, idempotency_key, generation_id, status, todos los contadores, filas shadow, productos distintos, duplicados, integridad de precios, resultado de idempotencia, estado del rule set V2, estado de la caché pública, resultado de assertions y confirmación de No Publish.
