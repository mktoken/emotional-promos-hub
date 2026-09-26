# PRICING Y CATÁLOGO V2

## Autoridad y límites

Este documento consolida el contrato y la evidencia técnica versionada de Pricing V2 y Catálogo V2. No declara que el stock, los precios, las imágenes o la impresión actuales sean confiables para operación comercial sin una validación nueva.

## Estado actual resumido

- Pricing V2: activo en la arquitectura y documentado como release vigente.
- `CatalogView`: alineado a búsqueda V2.
- Legacy: conservado como respaldo.
- Rollback: disponible y no ejecutado en la evidencia histórica.
- Estado operativo actual de proveedores y stock: **NO COMPROBADO**.

## Contrato de precio

La autoridad de cálculo versionada es `public.calculate_product_price_v2(product_id, qty, rule_set_id)`. La Edge Function de recomputación no replica en TypeScript los multiplicadores, niveles, costos, MOQ o reglas por proveedor.

Estados documentados:

| Estado de cálculo | Estado publicable/persistible |
|---|---|
| `valid` | `priced` |
| `manual_review` | `request_quote` |
| `request_quote` | `request_quote` |
| `unavailable` | `unavailable` |
| desconocido/no resuelto | `unresolved` y bloqueante |

Para `priced` se exige precio positivo y MOQ positivo. Para `request_quote` y `unavailable` el precio público debe ser `NULL`.

## Release y shadow

La evidencia histórica registra:

- release V2: `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b`;
- generación de origen: `818d824a…`;
- generación shadow certificada: `45c79265-77bc-416b-b6e0-96d2b37a6e1c`;
- 1,524 candidatos;
- 1,505 productos con precio;
- 19 en solicitud de cotización;
- 0 no disponibles;
- 0 errores;
- 0 no resueltos;
- 1,524 filas shadow sin duplicados.

El dry run mantuvo la caché pública intacta y el shadow write escribió únicamente generaciones y resultados shadow. V2 no fue activado por esos reportes.

## Caché y catálogo público

- `catalog_price_cache` es la caché pública Legacy documentada.
- `catalog_price_cache_v2_generations` registra generaciones.
- `catalog_price_cache_v2_shadow` registra resultados shadow.
- `catalog_price_v2_releases` registra el puntero de release.
- `catalog_search_products_v2` alimenta el catálogo V2.
- `get_public_product_price_quote` expone la cotización pública de precio según cantidad.

El corte de auditoría comercial de producción reportó 992 productos visibles y 42 páginas. Ese conteo público no debe confundirse automáticamente con las 1,524 filas de las generaciones internas históricas: pertenecen a capas y cortes de evidencia distintos.

## Proveedores

Proveedores identificados en código y migraciones:

- `cdo_mx` — CDO Promocionales México;
- `forpromotional` — ForPromotional / 4Promotional;
- `g4_mx` — G4 México.

Funciones de sincronización y coordinación:

- `sync-cdo-products`;
- `sync-forpromotional-products`;
- `sync-g4-products`;
- `refresh-provider-stock`;
- `promote-provider-products-to-catalog`.

La última fecha, estado, error y volumen de sincronización de cada proveedor no están documentados como estado actual. No se deben afirmar existencias o precios operativos sin una comprobación nueva.

## MOQ, impresión y personalización

- MOQ participa en la resolución de precio.
- Productos por debajo del mínimo pueden requerir recálculo usando `minimum_quantity`.
- La solicitud pública transporta observaciones por producto.
- La cotización formal tiene trabajos de impresión y campos de personalización.
- El costo, proveedor y precio final de impresión siguen **PENDIENTES / NO COMPROBADOS**.

## Publish, rollback y Legacy

- `publish_catalog_price_v2_generation(uuid)` publica una generación con controles de staff y concurrencia.
- `rollback_catalog_price_v2_to_legacy()` permite volver a Legacy según el contrato versionado.
- Legacy no debe retirarse sin un checkpoint nuevo y evidencia actual.
- Los reportes de rollback de `supabase/qa/` son específicos de sus ejecuciones y no autorizan ejecutarlo por sí mismos.

## Límites conocidos

- La confiabilidad operativa actual de stock y precios no está certificada por este documento.
- La disponibilidad actual de imágenes y fichas no está certificada.
- Persisten observaciones históricas de hotlink 403 y fallback de imágenes.
- Las reglas de descuentos y aprobación de excepciones no están documentadas como contrato vigente.
- Los reportes detallados deben consultarse en `supabase/qa/`.

## Evidencia detallada

- [Dry run V2](../supabase/qa/recompute_v2_dry_run_report.md)
- [Shadow write V2](../supabase/qa/recompute_v2_shadow_write_report.md)
- [Rollback específico](../supabase/qa/rollback_recompute_v2_function.md)
- [Assertions de release V2](../supabase/qa/catalog_price_v2_release_preparation_assertions.sql)
- [Assertions de precio público](../supabase/qa/public_product_price_quote_assertions.sql)
