# CDO / StockSur — Universo comercial completo en vivo (auditoría final, solo lectura)

Solo lecturas. Cero escrituras, nada publicado.

```text
CDO SOURCE OF TRUTH: API
READ-ONLY CHANNEL: PASS
PROVIDER: cdo_mx (d8b267ff…), "CDO Promocionales México", activo=true,
          last_sync_at 2026-10-13 12:41 UTC

LATEST COMPLETE CDO API CYCLE: 2026-10-13 12:41:16 UTC
  run e3950584… success; cursor cycle_count=8, next_page=1, next_offer_offset=0
  último recorrido páginas 1→5: 343+181+273+286+94 = 1177 items vistos,
  página 5 has_more_pages=false, has_more_offers=false; 0 lotes fallidos, 0 errores
API INGESTION COMPLETE: YES (paginación agotada, ciclo cerrado)

IDENTITY STRUCTURE (campos reales):
  MODELO   provider_raw_products.provider_sku   (1 fila por SKU, sin históricos)
  VARIANTE producto_proveedor_ofertas.variant_sku = 'CDO|<SKU>_<COLOR>'
  COLOR    sufijo de variant_sku (color_nombre llega como objeto sin texto útil)
  CATEGORÍA provider_raw_products.categoria -> productos_b2b.categoria_principal
           + product_category_assignments
  STOCK    producto_proveedor_stock.cantidad
  MOQ      producto_precio_escalas.min_qty (mínimo de la escala)
  PRECIO   producto_precio_escalas.unit_cost -> catalog_price_cache.price_status

CURRENT CDO COMMERCIAL MODELS: 446 (446 activos, 0 inactivos, 446 filas: sin duplicados)
CURRENT CDO COMMERCIAL VARIANTS/OFFERS: 1192 activas (1192 variant_sku distintos)
  colores distintos: 180; modelos sin oferta: 0

MODELS LINKED TO productos_b2b: 403
MODELS NOT LINKED: 43
VARIANTS/OFFERS LINKED: 1061   (mecanismo: producto_b2b_oferta_map)
VARIANTS/OFFERS NOT LINKED: 131
AMBIGUOUS: 0

PUBLIC CDO MODELS (producto visible): 104
PUBLIC_VISIBLE CDO PRODUCTS: 104   | NOT PUBLIC: 299   (de 403 enlazados)
  visibles y "disponible": 98

PRICE SOURCE READY (ofertas con escala de costo): 1192
PRICING V2 VALID (productos): 155 de 403
PRICE BLOCKED / RECOMPUTE REQUIRED (productos enlazados sin precio): 248
STOCK READY (cantidad numérica): 1192
STOCK UNKNOWN: 0   (15 filas sin refrescar >7 días: no vistas en el último ciclo)
MOQ READY: 1192 | MOQ MISSING: 0
CATEGORY READY (productos con categoría principal): 403
  con asignación de categoría pública: 285 | CATEGORY MISSING (asignación): 118

CERTIFIED MASTER MATCH (código + color exacto): 67 variantes
API VARIANTS WITHOUT CERTIFIED MASTER: 1125
  usando imagen del proveedor: 1125 | sin imagen utilizable: 0
CERTIFIED MASTERS WITHOUT CURRENT API MATCH: 287 (59 modelos no vienen en la API)

HISTORICAL REFERENCE: 408 raw / 1085 offers
CURRENT VS HISTORICAL: INCREASE (446 / 1192). Explicado por la fuente actual:
  el ciclo completo de hoy entrega más SKUs; no hay filas históricas duplicadas
  ni ciclo incompleto.

TOP 5 ACTUAL BLOCKERS:
1. 299 de 403 productos CDO enlazados no están visibles al público.
2. 248 productos enlazados sin precio Pricing V2 válido.
3. 43 modelos / 131 ofertas de la API sin producto de catálogo.
4. 118 productos sin asignación de categoría pública.
5. 287 masters certificados no corresponden a ninguna variante actual de la API.

MOST IMPORTANT CONCLUSION:
La ingesta CDO está completa y sana (446 modelos, 1192 ofertas, ciclo cerrado
sin errores, stock/MOQ/costo al 100%). La pérdida no está en la API sino en la
proyección: solo 104 de 446 modelos están a la venta, limitados sobre todo por
precio sin calcular y visibilidad. El banco de 354 masters solo enriquece 67
variantes actuales; no debe usarse para definir el catálogo.

NEXT EXECUTION ACTION:
Recalcular Pricing V2 para los 248 productos CDO enlazados sin precio válido
(lote), como prerrequisito para hacerlos visibles. No ejecutado.

WRITE OPERATIONS: 0
PUBLICATION: NO
```
