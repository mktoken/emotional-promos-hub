# CHK-CDO-01J-A — Targeted Pricing V2 Support

**Estado:** implementado y validado en repositorio; no ejecutado live
**Alcance:** soporte opcional para una lista explícita de `product_ids`.

## Contrato

- Sin `product_ids`, el universo global conserva `catalog_price_cache` y el
  comportamiento existente de generaciones, idempotencia y `shadow_write`.
- Con `product_ids`, la lista se valida contra `public.productos_b2b`, se
  deduplica y se procesa exclusivamente en ese conjunto.
- Los IDs inexistentes se reportan como `unknown_product_ids` antes de crear
  una generación.
- El targeted conserva `batch_size`, `cursor` y el límite de tiempo existentes;
  una reanudación continúa después del último ID procesado.
- Un `targeted + dry_run` no crea ni actualiza generaciones ni shadow rows:
  `writes = 0`.
- Un `targeted + shadow_write` conserva la generación/idempotencia y escribe
  únicamente en la superficie shadow existente.
- El cálculo continúa delegado exclusivamente a
  `public.calculate_product_price_v2`.

## Límites protegidos

No se modifican productos, categorías, imágenes, visibilidad, mappings,
stock, reglas de pricing, esquema ni publicación. No se incluyen IDs CDO
hardcodeados y no se ejecutó el recálculo live de los 248 productos.

## Validación

Las pruebas cubren aceptación de `product_ids`, deduplicación, aislamiento del
target, reporte de IDs inexistentes y la política de cero escrituras del
targeted dry run. `CHK-CDO-01J-B` permanece pendiente y no se ejecutó.
