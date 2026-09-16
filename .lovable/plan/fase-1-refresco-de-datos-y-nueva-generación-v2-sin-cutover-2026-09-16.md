# Fase 1 — Refresco de datos y nueva generación V2 (sin cutover)

## Conflicto detectado antes de empezar (requiere tu decisión)

Tu instrucción incluye "Legacy debe permanecer intacto" como condición de paro, pero el refresco de stock **sí modifica datos que Legacy usa**:

- `refresh-provider-stock` en modo `full` llama a las funciones de sincronización de CDO, ForPromotional y G4, que reescriben `producto_proveedor_stock`, `producto_proveedor_ofertas` y `producto_precio_escalas`.
- El catálogo público Legacy (`productos_publicos` / `catalog_search_products`) filtra por `product_has_available_stock`, así que **productos pueden aparecer o desaparecer de la tienda pública** tras el refresco.

No modifica estructura, ni RLS, ni grants, ni `catalog_price_cache` (eso solo lo toca `promote-provider-products-to-catalog`, que no se ejecutará).

Interpretación propuesta: "Legacy intacto" = no tocar su estructura, su RPC, su caché de precios ni su rol como ruta pública. El movimiento natural de stock sí ocurre. Si no aceptas eso, la fase se detiene aquí.

## Estado inicial verificado (solo lectura, ya ejecutado)

| Dato | Valor |
|---|---|
| Ambiente | Lovable Cloud, ref `unzfwdykdqotiwzihsvc`, instancia única (preview = producción) |
| Stock CDO | 556 filas, último 18 jul 2026 |
| Stock ForPromotional | 1,085 filas, último 10 jul 2026 |
| Stock G4 | 4,156 filas, último 10 jul 2026 |
| Corridas de refresco | 8, la última 10 jul 2026 |
| `catalog_price_cache` (Legacy) | 1,524 filas, 1,506 válidas, actualizado 18 jul 2026 |
| Generación certificada | `45c79265…` shadow_write, 1524/1524/1505/19/0/0/0 |
| Último dry_run | `f54d9d1a…` (17 ago), idéntico: 1524/1524/1505/19/0/0/0 |
| Filas shadow | 1,524 (una sola generación) |
| Releases V2 | 0 · precios V2 vigentes: 0 |
| Rule set V2 | `2026-01-v2-draft` inactivo |

## Etapas

### Etapa A — Refresco de stock en seco (sin escrituras de proveedor)
Llamar `refresh-provider-stock` con `mode=dry_run`, proveedor `all`, autenticando con la credencial ya configurada. Registrar por proveedor: productos vistos, deltas detectados, errores. Si algún proveedor falla en seco, se detiene todo.

### Etapa B — Refresco real de stock (requiere tu autorización por el conflicto de arriba)
Llamar `refresh-provider-stock` con `mode=full`, por lotes y por proveedor, encadenando cursores hasta completar el ciclo. Sin `promote-provider-products-to-catalog`. Al terminar: conteos por proveedor, nuevas fechas de actualización, filas añadidas/actualizadas, errores.

### Etapa C — Verificación intermedia de Legacy
Confirmar que `catalog_price_cache` no cambió en estructura ni en número de filas, que `catalog_search_products` sigue respondiendo y que el conteo de productos públicos antes/después se reporta como delta explícito (no se corrige nada).

### Etapa D — Nueva generación V2 en seco
Ejecutar `recompute-catalog-price-cache-v2` en modo `dry_run` con clave `dryrun-2026-09-16-01`, lote 200, encadenando cursores. Reportar: candidatos, procesados, con precio, solicitar cotización, no disponibles, errores, sin resolver. Comparar contra 1524/1505/19/0/0.

### Etapa E — Nueva generación shadow (solo si D cierra sin errores)
Ejecutar `shadow_write` con clave `shadowwrite-2026-09-16-01`. Escribe únicamente en `catalog_price_cache_v2_generations` y `catalog_price_cache_v2_shadow`. **No publica release, no activa el rule set, no toca el frontend.**

Puerta de certificación: procesados = candidatos, errores = 0, sin resolver = 0. Si falla, la generación queda sin certificar y se reporta tal cual.

### Etapa F — Validación final y comparativa
Reportar tabla antes/después de todos los contadores, integridad de precios en shadow, que `catalog_price_v2_releases` sigue en 0 filas, que el rule set V2 sigue inactivo y que la generación histórica `45c79265…` permanece intacta.

## Condiciones de paro respetadas
Nada de publicar release, activar rule set, migrar `CatalogView`, crear migraciones, tocar RLS, grants, secretos, estructura de tablas, Edge Functions, ramas, commits ni publish.

## Detalle técnico
- Credenciales: se usan las ya configuradas (`PROVIDERS_TEST_KEY` / `STOCK_REFRESH_CRON_KEY` para stock; JWT de staff para recompute). No se crean ni se modifican secretos.
- Las llamadas a `recompute` sufren timeout de cliente ~60 s; se reanuda con el `next_cursor` leído de los logs, tal como en corridas anteriores.
- La generación anterior conserva sus filas shadow; la nueva se distingue por `generation_id`.

## Riesgo principal
La Etapa B puede cambiar qué productos ve el público (por stock), y la nueva generación V2 puede arrojar contadores distintos a 1505/19. Ninguno de los dos activa el cutover, pero ambos deben revisarse antes de la Fase 2.
