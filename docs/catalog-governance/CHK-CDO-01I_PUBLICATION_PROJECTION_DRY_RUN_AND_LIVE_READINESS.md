# CHK-CDO-01I — Publication Projection Dry Run and Live Catalog Readiness

**Fecha:** 2026-10-13
**Baseline:** `e1c09fc4b7aba607871673e201524b5d49e0ea4c`
**Estado:** **PARTIAL — DRY RUN REPOSITORY-COMPLETE / LIVE RUNTIME EVIDENCE BLOCKED**

## Pre-flight y alcance

- Branch: `main`.
- Baseline Git: `HEAD = origin/main`, divergence `0/0`, working tree limpio al inicio.
- El alcance de este documento es read-only. No se ejecutó SQL, no se consultó una base externa, no se llamó a proveedores y no se modificó runtime.
- En esta sesión no existe un canal utilizable del query executor interno de Lovable/Supabase para leer el estado live. El uso de CLI, dashboard o conexión externa estaba prohibido por el checkpoint.
- Por lo tanto, los campos runtime se registran como `NOT_OBSERVED_LIVE`, nunca como ausencia confirmada.

## Imagen versus readiness comercial

**IMAGE MASTER CERTIFICATION: COMPLETE**

- Variantes canónicas: **354**.
- `MASTER_APPROVED`: **354**.
- `PUBLIC_ELIGIBLE`: **354**.
- Image blocked: **0**.
- Variants without master: **0**.
- Conflicting masters: **0**.
- Rights: **PASS**.
- Live publication: **NO**.

**COMMERCIAL CATALOG READINESS: NOT CERTIFIABLE IN THIS SESSION**

No se debe interpretar `MASTER_APPROVED = 354` como `READY_TO_SELL = 354`.

## Conteos del dry run

| Métrica | Resultado verificable | Lectura segura |
|---|---:|---|
| Canonical models | **97** | Calculado desde el registry canónico 01H3 |
| Canonical variants | **354** | Calculado desde el registry canónico 01H3 |
| Master approved | **354** | Certificación 01H3 |
| Provider offer matched | **0 verificados / 354 no observados** | No equivale a 354 unmatched |
| Provider offer unmatched | **0 comprobados** | Requiere lectura live |
| Content ready | **0 verificados / 354 no observados** | Los artefactos locales no prueban contenido comercial live |
| Content derivable from available provider evidence | **0 verificables** | Los artefactos locales contienen identidad/asset, no ficha comercial completa |
| Content source missing | **354 no observados live** | No se puede distinguir missing de source-not-normalized sin runtime |
| Price ready | **0 verificados / 354 no observados** | No se calculó ni recomputó Pricing V2 |
| Price blocked | **0 comprobados** | No convertir falta de observación en falta de precio |
| Stock ready | **0 verificados / 354 no observados** | No se ejecutó sync ni se leyó stock live |
| Stock unknown/blocked | **354 no observados** | Estado de evidencia, no afirmación de stock inexistente |
| Category ready | **0 verificados / 354 no observados** | Requiere proyección/catalog read model live |
| Public projection ready | **0 verificados / 354 no observados** | No se inspeccionó el mapping live |
| Ready to sell | **0 verificables** | No se certifica sin oferta, precio, stock, contenido y proyección |
| Ready to project | **0 verificables** | No se certifica sin mapping live |
| Explicitly blocked in this dry run | **354** | `OTHER_EXPLICIT_BLOCKER`: runtime read-only unavailable |

## Clasificación por variante

`docs/catalog-governance/data/cdo-01i-publication-projection-dryrun-v1.csv` contiene exactamente una fila por cada una de las 354 variantes actuales.

Cada fila conserva el SHA master canónico y clasifica el estado comercial como:

- `overall_readiness = OTHER_EXPLICIT_BLOCKER`.
- `blocking_reason = INTERNAL_LOVABLE_SUPABASE_READ_ONLY_CHANNEL_UNAVAILABLE`.
- `proposed_live_action = BLOCK`.

Esto evita afirmar que una oferta, precio, stock o mapping no existe cuando simplemente no pudo observarse por el canal aprobado.

## Reconciliación a nivel modelo

`docs/catalog-governance/data/cdo-01i-model-commercial-readiness-v1.csv` contiene exactamente **97 modelos**. Sus variantes tienen master certificado, pero sus conteos comerciales permanecen no observados; por eso cada modelo tiene `sellable_variant_count = 0` verificable y `blocked_variant_count` igual a su número de variantes, por bloqueo de evidencia runtime, no por defecto de imagen.

- Modelos con todas las variantes comercialmente listas: **0 verificables**.
- Modelos parcialmente listos: **0 verificables**.
- Modelos con cero variantes vendibles verificadas: **97**.
- La distribución de variantes por modelo queda preservada en la matriz, sin aplanar modelo, variante y oferta.

## Contenido

Los artefactos canónicos contienen nombres/códigos de modelo, valores de variante, provenance y master SHA. No contienen una exportación live de `provider_raw_products.descripcion`, especificaciones, material, dimensiones/capacidad, MOQ ni reglas de personalización para estas 354 variantes.

Por ello no se generaron descripciones ni se afirmó que falte definitivamente la fuente. El siguiente runtime read-only debe separar:

1. `CONTENT_READY`: contenido público ya presente.
2. `CONTENT_DERIVABLE_FROM_PROVIDER_EVIDENCE`: fuente raw presente pero aún no normalizada.
3. `CONTENT_SOURCE_MISSING`: ninguna fuente suficiente.

## Comercial, precio y stock

La arquitectura versionada sí tiene superficies para `producto_proveedor_ofertas`, `producto_proveedor_stock`, `producto_b2b_oferta_map`, `provider_raw_products`, `producto_b2b_status`, `catalog_price_cache_v2_generations`, `catalog_price_cache_v2_shadow`, `catalog_price_v2_current_prices`, `pricing_rule_sets` y `provider_pricing_rules`. La existencia del contrato no prueba que las 354 variantes tengan filas live correspondientes.

No se calcularon precios, no se ejecutó `calculate_product_price_v2`, no se publicó cache, no se ejecutó sync y no se alteró stock.

## Proyección de imágenes

No se puede decidir `INSERT`, `UPDATE` o `NO_CHANGE` sin leer las relaciones live actuales. Los masters certificados quedan preservados en el dry run; no se introducen assets históricos, alternativos o marketing en una proyección pública.

## Resultado de readiness

**CDO / StockSur NO está certificable como listo para publicación live en esta sesión.** La imagen está completamente certificada; el bloqueo es exclusivamente la falta de evidencia runtime read-only aprobada.

## Próximo paso mínimo

1. Restablecer el mecanismo interno Lovable/Supabase read-only aprobado.
2. Ejecutar una lectura sin escritura de las tablas y RPC existentes, limitada a los 97 modelos/354 variant keys.
3. Regenerar 01I reemplazando únicamente `NOT_OBSERVED_LIVE` por evidencia actual.
4. Solo después decidir entre contenido, comercial o proyección live.

No se autoriza publicación ni se debe crear un seed o migration para resolver este bloqueo.

## Cambios realizados

- `docs/catalog-governance/data/cdo-01i-publication-projection-dryrun-v1.csv`: creado, 354 filas.
- `docs/catalog-governance/data/cdo-01i-model-commercial-readiness-v1.csv`: creado, 97 filas.
- Este reporte: creado.
- No hubo cambios en runtime, base de datos, Supabase, Lovable, frontend, imágenes productivas, stock, pricing, mappings, categorías, visibilidad, schedulers o proveedores.

**NEXT:** restablecer evidencia runtime read-only interna y rerun de `CHK-CDO-01I`; no ejecutar publicación automáticamente.
