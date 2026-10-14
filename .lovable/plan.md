# CHK-CDO-01J — Recálculo de precios CDO: detenido antes del dry run

Solo se hicieron lecturas. No se recalculó nada ni se escribió nada.

```text
CHECKPOINT: CHK-CDO-01J
STATUS: BLOCKED (STOP en el paso 3, antes de escribir)

TARGET EXPECTED: 248
TARGET OBSERVED: 248
  (CDO activo + enlazado por producto_b2b_oferta_map + existe en
   productos_b2b + sin precio "valid")

SOURCE DATA COMPLETE: YES
  PRICE SOURCE PRESENT (escala con costo > 0): 248
  MOQ PRESENT (min_qty > 0): 248
  AMBIGUOUS (más de un proveedor): 0

HALLAZGO DE LA CAUSA:
  Los 248 no tienen NINGUNA fila de precio: ni en catalog_price_cache
  ni en la generación activa de Pricing V2 (818d824a…, 16-sep).
  No es un precio "inválido": nunca se calcularon (se crearon después
  del último ciclo de precios).

DRY RUN: NOT RUN
  Motivo: el mecanismo existente (recompute-catalog-price-cache-v2)
  - solo acepta: mode (dry_run / shadow_write), idempotency_key,
    batch_size, cursor;
  - no permite elegir productos concretos;
  - recorre únicamente productos que YA tienen fila en
    catalog_price_cache, así que estos 248 quedan fuera por diseño;
  - una ejecución sería global (todo el catálogo), lo que la orden prohíbe.

LIVE RECOMPUTE EXECUTED: NO
LIVE PRODUCTS PROCESSED: 0
POST-RUN PRICING V2 VALID: N/A
TOTAL CDO LINKED PRODUCTS: 403
TOTAL CDO LINKED PRICING VALID: 155 (sin cambio)

PRICE RULE CHANGES: 0
PRODUCT CREATION: 0
CATEGORY CHANGES: 0
VISIBILITY CHANGES: 0
IMAGE CHANGES: 0
PUBLICATION: NO

NEXT (una sola acción, requiere decisión de Work):
  Autorizar cómo incorporar los 248 al cálculo, por ejemplo:
  A) un cambio pequeño al recálculo para aceptar una lista exacta de
     productos (y no depender de que ya tengan fila previa), o
  B) un ciclo global de recálculo + nueva generación, aceptando que
     toca todo el catálogo.
STOP.
```
