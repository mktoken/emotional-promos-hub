## Objetivo
Ejecutar únicamente el `dry_run` de la Edge Function `recompute-catalog-price-cache-v2`. Sin escrituras en shadow, sin activar V2, sin Publish, sin cambios de código.

## Alcance de escritura (única permitida)
La ÚNICA escritura permitida es crear y actualizar la fila de generación de este dry_run en `catalog_price_cache_v2_generations` (insert inicial + updates de contadores/estado). Prohibida cualquier escritura en `catalog_price_cache_v2_shadow`, `catalog_price_cache`, `pricing_rule_sets` o cualquier otra tabla. Si algo intentara escribir fuera de ese alcance, se detiene la ejecución.

## Pre-chequeos (solo lectura) — PASS
- Generaciones `running`: 0
- `idempotency_key` `dryrun-2026-08-02-subbuild-b-01`: no existe
- `catalog_price_cache`: 1524 filas, 1524 `producto_b2b_id` no nulos, 1524 distintos, 0 duplicados
- `2026-01-v2-draft`: inactivo
- Rule sets activos: exactamente 1
- `catalog_price_cache_v2_shadow`: 0 filas

## Pasos
1. Verificar si `recompute-catalog-price-cache-v2` está desplegada; si no, desplegar solo esa función desde los archivos existentes (sin modificar código).
2. Invocar con el JWT de la sesión staff inyectada:
   `{"mode":"dry_run","idempotency_key":"dryrun-2026-08-02-subbuild-b-01","batch_size":100,"cursor":null}`
3. Mientras haya `next_cursor`: reinvocar con la misma `idempotency_key`, `batch_size: 100` y el cursor devuelto, hasta `completed` o `failed`. No crear otra generación.
4. Ejecutar `supabase/qa/recompute_v2_assertions.sql` (A1–A7) con la key correspondiente, en modo lectura.

## Gates obligatorios
`status=completed`; `processed_count=candidate_count`; `error_count=0`; `unresolved_count=0`; suma de estados = `candidate_count`; shadow = 0 filas; `catalog_price_cache` = 1524 e intacta; `productos_publicos` y `catalog_search_products` sin cambios; 1 rule set activo; draft V2 inactivo; sin Publish.

Si algún gate falla: detener sin remediar y reportar `generation_id`, cursor, contador y diferencia exacta.

## Entrega
Estado de despliegue, `idempotency_key`, `generation_id`, `status`, todos los contadores, MOQ resueltos, resultados A1–A7, filas shadow, confirmación de caché pública intacta, V2 inactivo y No Publish.