# PRICING Y CATÁLOGO V2

## Autoridad y límites

Este documento consolida el contrato y la evidencia técnica versionada de Pricing V2 y Catálogo V2. No declara que el stock, los precios, las imágenes o la impresión actuales sean confiables para operación comercial sin una validación nueva.

## Estado actual resumido

- Pricing V2: activo en la arquitectura y documentado como release vigente.
- `CatalogView`: alineado a búsqueda V2.
- Legacy: conservado como respaldo.
- Rollback: disponible y no ejecutado en la evidencia histórica.
- Estado operativo global de proveedores y stock: **PARCIALMENTE CERTIFICADO**.
  ForPromotional tiene `PASS OPERATIVO / PENDING ONLY SCHEDULER-LINEAGE
  CONFIRMATION`; CDO y G4 permanecen **NO COMPROBADO**. Este documento no
  certifica la verdad pública global del catálogo.

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

## Pricing de Conversión México — separación shadow

El módulo `src/lib/pricing-conversion-shadow.ts` es un simulador read-only independiente. No reemplaza `public.calculate_product_price_v2`, no cambia `catalog_price_cache`, no altera `catalog_price_v2_releases`, no modifica cotizaciones y no ejecuta recompute, publish o sincronización.

Su comparación conserva dos columnas conceptuales: **Current V2** y **Conversion Pricing Recommendation**. El motor recibe el costo ajustado ya resuelto para impedir doble aplicación de CDO/ForPromotional `×1.03`; Legacy `×1.35` no participa. G4 no se modifica y su mapeo de escala sigue pendiente.

La recomendación usa `purchase_base = adjusted_cost × quantity`, una curva configurable de margen económico, una transición continua de influencia de mercado entre `$4,500` y `$7,500`, corredor competitivo configurable, piso de rentabilidad y estados `COMPETITIVE`, `VERY_COMPETITIVE`, `ABOVE_MARKET`, `NOT_COMPETITIVE`, `NO_MARKET_DATA` y `BELOW_MINIMUM`. Sin benchmark suficiente se conserva el precio interno.

No se agregan observaciones competitivas reales ni scraping en esta ejecución. La estructura admite posteriormente una canasta curada de 30–50 SKUs. Los parámetros actuales están marcados como valores técnicos de simulación; la activación pública requiere aprobación, evidencia de mercado y un checkpoint posterior.

## Evidencia detallada

- [Dry run V2](../supabase/qa/recompute_v2_dry_run_report.md)
- [Shadow write V2](../supabase/qa/recompute_v2_shadow_write_report.md)
- [Rollback específico](../supabase/qa/rollback_recompute_v2_function.md)
- [Assertions de release V2](../supabase/qa/catalog_price_v2_release_preparation_assertions.sql)
- [Assertions de precio público](../supabase/qa/public_product_price_quote_assertions.sql)

## CHK-CATALOG-QUALITY-MASTER-AUDIT-V1 — Cierre documental

**Estado:** **CLOSED / PASS**.

Este PASS significa que la auditoría read-only fue completada. No significa que el catálogo esté listo para Ads, ni certifica la disponibilidad actual, la frescura del stock, la trazabilidad completa de proveedores, la calidad visual real o la readiness comercial/SEO.

### Evidencia consolidada

| Control | Resultado |
|---|---:|
| Productos públicos | 992 |
| Productos con nombre | 992 |
| Productos con categoría | 992 |
| Productos con descripción | 990 |
| Productos con metadata de imagen | 992 |
| Productos con múltiples imágenes | 936 |
| Grupos de URLs de imagen compartidas | 141 |
| Productos con Pricing V2 público válido | 985 |
| Productos públicos sin Pricing V2 válido | 7 |
| Filas V2 actuales | 1,524 |
| Filas V2 sin producto público | 539 |
| De esas filas V2 huérfanas: `priced` | 521 |
| De esas filas V2 huérfanas: `request_quote` | 18 |
| Productos públicos con exactamente un vínculo raw | 97 |
| Productos públicos con múltiples vínculos raw | 0 |
| Productos públicos sin vínculo raw/provider | 895 |
| Productos públicos con stock observado conocido | 990 |
| Productos públicos con stock desconocido | 2 |
| Productos públicos con stock cero/agotado observado | 0 |
| Productos públicos con stock observado stale >30 días | 990 |

Última sincronización del corte histórico documentado: `2026-07-28`. Sincronización observada más antigua en ese corte: `2026-06-29`. Estos valores requieren revalidación y no describen por sí solos el estado runtime actual.

**Regla de interpretación:** stock observado no equivale a disponibilidad actual. La frescura actual del stock queda **NO CERTIFICADA / STALE**.

### Productos públicos sin Pricing V2 válido

| `id_interno` | Nombre |
|---|---|
| `CDO_C578` | Mochila Trip Ligera |
| `CDO_T164` | Libreta Ecológica con Pluma |
| `CDO_T702` | Mug Termico Magno |
| `CDO_T723` | Libreta Medium PU |
| `CDO_T731` | Mug Tommy Doble Pared |
| `promo_001` | Set de Herramientas Hércules |
| `promo_002` | Navaja Multiusos Inoxidable |

### Corrección de interpretación de metadata

No se registra como defecto real la lectura heurística de 985 productos con metadata crítica incompleta. La evidencia observada fue:

- nombre: `992/992`;
- categoría: `992/992`;
- descripción: `990/992`;
- `sku_base`: `7/992`.

La obligatoriedad de `sku_base` no está demostrada por el contrato público actual. No se abre remediación masiva de esos 985 registros.

### Regalos ejecutivos

La categoría formal es **Premios y regalos ejecutivos** y tiene actualmente `0` productos asignados. El detector textual amplio encontró `456` candidatos. No se autoriza autoasignación; requiere curaduría comercial posterior.

### Risk register

| ID | Riesgo | Estado |
|---|---|---|
| P0-1 | Frescura de stock | Hallazgo histórico: `990` productos públicos tenían stock observado stale >30 días. **HISTORICAL ISSUE — REVALIDATION REQUIRED**. |
| P0-2 | Trazabilidad de proveedor | Hallazgo histórico: `895/992` productos públicos no tenían vínculo `provider_raw_products`; esto no prueba que sean inválidos. **HISTORICAL ISSUE — REVALIDATION REQUIRED**. |
| P0-3 | Gaps de precio público | Hallazgo histórico: `7` productos públicos no tenían Pricing V2 válido. **HISTORICAL ISSUE — REVALIDATION REQUIRED**. |
| P1-1 | Calidad visual | Metadata de imagen `100%`, pero calidad visual real no certificada; `141` grupos de URLs compartidas requieren evaluación. |
| P1-2 | Regalos ejecutivos | Categoría vacía en el corte histórico; `456` candidatos requieren curaduría comercial. **OPEN GATE — REVALIDATION REQUIRED**. |

### Readiness

- Estructura de datos de catálogo: **SUBSTANTIALLY PRESENT**.
- Readiness comercial del catálogo: **NOT CERTIFIED**.
- Readiness SEO: **NOT CERTIFIED**.
- Readiness Ads: **BLOCKED**.
- Bloqueadores principales de Ads: frescura de stock y trazabilidad de proveedor.
- No se inventan porcentajes de readiness sin una métrica canónica aprobada.

### Siguiente checkpoint autorizado

`CHK-CATALOG-P0-STOCK-PROVIDER-TRACEABILITY-V1` deberá determinar por qué `895` productos públicos no tienen vínculo `provider_raw_products` y cuál es la fuente/mecanismo real de refresh de stock. No forma parte de este cierre y no queda ejecutado por esta documentación.

## Canonical closure reconciliation — 2026-10-08

La evidencia runtime suministrada para ForPromotional confirma un ciclo
operativo completo: `14/14` runs exitosos, `4135` items vistos, `4135` stocks
actualizados, `0` fallos, `0` errores y cursor `0 → 300 → ... → 3900 → 0`
con `cycle_count = 3` y cierre completado. El estado es
**PASS OPERATIVO / PENDING ONLY SCHEDULER-LINEAGE CONFIRMATION**.

La diferencia `affected_products = 16` frente a
`recomputed_products = 15`, con `failed_products = 0`, queda como
**OBSERVATION / NON-BLOCKING**. No se identificó un decimosexto producto
reconstruible con stock stale actual.

Los conteos históricos `895/992`, `7` gaps de Pricing V2 y `990` productos
stale no se convierten en blockers actuales sin revalidación. CDO y G4 siguen
**NO COMPROBADO**.
