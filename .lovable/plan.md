# CHK-CDO-01I-R1 — Reporte de preparación comercial CDO/StockSur (solo lectura)

Solo se hicieron lecturas. Cero escrituras, cero cambios, nada publicado.

```text
CHECKPOINT: CHK-CDO-01I-R1
STATUS: PARTIAL
READ-ONLY CHANNEL: PASS
LIVE PRODUCTS TOTAL: 1815
STOCKSUR CANONICAL MODELS: 97
STOCKSUR CANONICAL VARIANTS: 354

MATCHING METHOD (exacto, sin fuzzy):
  modelo  = upper(provider_raw_products.provider_sku) = provider_code
            (proveedor cdo_mx)
  variante = split_part(variant_sku,'|',2) = CODE_COLOR
  oferta -> producto: producto_b2b_oferta_map

MODELS FOUND LIVE (en el feed del proveedor): 38   | NOT FOUND: 59
MODELS LINKED TO A CATALOG PRODUCT: 25
VARIANTS FOUND LIVE: 67                          | NOT FOUND: 287
  (77 colores de modelos que sí existen no vienen en el feed actual)

PROVIDER OFFER MATCHED: 67 | UNMATCHED: 287 | AMBIGUOUS: 0

CONTENT READY (producto en catálogo): 25 modelos
CONTENT DERIVABLE (nombre+descripción+categoría en el feed): 13 modelos
CONTENT SOURCE MISSING: 59 modelos

PRICE SOURCE READY (escalas de costo): 67 variantes
PRICING V2 READY (precio calculado "valid"): 32
PRICE CACHE/COMPUTATION REQUIRED: 35
PRICE BLOCKED (sin fuente): 287

STOCK READY (cantidad numérica): 67
STOCK UNKNOWN/BLOCKED: 287
  (status: 23 disponible; 24 visibles al público)

MOQ READY (min_qty de escalas): 67 | MOQ NOT MODELED/BLOCKED: 287
CATEGORY READY (asignada): 57 variantes | BLOCKED: 297
  (los 38 modelos del feed traen categoría del proveedor)

MASTER APPROVED: 354
MASTER ALREADY LINKED: 0
MASTER LINK REQUIRED (destino existe): 67
MASTER LINK TARGET MISSING: 287

COHORTES (354, sin doble conteo, aproximadas):
  READY TO SELL (visible+disponible+precio, sin master): <=23  (intersección exacta NOT VERIFIED)
  READY TO PROJECT (producto existe, falta precio/visibilidad/master): ~44
  PROVIDER_OFFER_BLOCKED (sin oferta viva): 287

FULLY READY MODELS: 0 (ningún master StockSur vinculado)
PARTIALLY READY MODELS: 25
BLOCKED MODELS: 72 (59 sin fuente en vivo, 13 sin producto creado)

TOP 5 BLOCKERS:
1. 59 modelos no existen en el feed CDO actual (no llegan por la API).
2. 77 colores de modelos existentes no vienen como oferta viva.
3. 13 modelos en el feed sin producto de catálogo creado.
4. 35 variantes con producto pero sin precio calculado.
5. 0 masters StockSur vinculados a productos.

MINIMUM CRITICAL PATH:
1. B — Confirmar con CDO por qué 59 modelos y 77 colores no salen en la API
   (catálogo distinto, descontinuados o cuenta). Sin esto 287 variantes no
   tienen precio, stock ni MOQ verificables. Requiere decisión humana/proveedor.
2. A+C — Crear los 13 productos faltantes desde el feed (automatizable por lote).
3. B — Recalcular precios de las 35 variantes sin precio (lote automático).
4. C+D — Vincular los 67 masters con destino existente, revisar visibilidad y QA.

ESTIMATED LIVE CHANGE TYPES:
  creación de productos desde feed; recálculo de precios; vinculación de
  imágenes master; ajuste de visibilidad; QA de solo lectura.

WRITE OPERATIONS: 0
PUBLICATION: NO
NEXT: CHK-CDO-01J — Confirmación con CDO de cobertura de API (59 modelos / 77 colores)
      antes de cualquier escritura. No ejecutado.
```
