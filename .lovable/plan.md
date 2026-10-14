# Reportes CDO / StockSur — resultados de las tres órdenes (solo lectura)

Las tres órdenes se ejecutaron solo con lecturas. Cero escrituras, nada publicado.

## 1. CHK-CDO-01I-R1 — Los 97 modelos / 354 variantes certificados

```text
STATUS: PARTIAL
MODELS FOUND LIVE: 38 de 97 (59 no vienen en la API)
VARIANTS FOUND LIVE: 67 de 354 (287 sin oferta viva)
PROVIDER OFFER MATCHED/UNMATCHED/AMBIGUOUS: 67 / 287 / 0
MASTER ALREADY LINKED: 0 | LINK REQUIRED: 67 | TARGET MISSING: 287
FULLY / PARTIAL / BLOCKED MODELS: 0 / 25 / 72
```

## 2. Universo completo CDO en la API

```text
LATEST COMPLETE CYCLE: 2026-10-13 12:41 UTC, páginas 1-5, 0 errores
API INGESTION COMPLETE: YES
MODELS: 446 | OFFERS: 1192 (vs. histórico 408/1085: INCREASE, por la fuente actual)
MODELS LINKED / NOT LINKED: 403 / 43
OFFERS LINKED / NOT LINKED: 1061 / 131 | AMBIGUOUS: 0
PUBLIC_VISIBLE CDO PRODUCTS: 104 (98 visibles y disponibles)
PRICING V2 VALID: 155 | SIN PRECIO: 248
STOCK / MOQ / COSTO: 1192 / 1192 / 1192
CATEGORY ASSIGNED: 285 | MISSING: 118
CERTIFIED MASTER MATCH: 67 | PROVIDER IMAGE FALLBACK: 1125 | WITHOUT IMAGE: 0
CONCLUSIÓN: la ingesta está completa; la pérdida está en precio y visibilidad.
```

## 3. CHK-CDO-01J — Recálculo de precios

```text
STATUS: BLOCKED (detenido antes del dry run, sin escribir)
TARGET OBSERVED: 248 (= esperado)
SOURCE DATA COMPLETE: YES (costo 248, MOQ 248, ambiguos 0)
CAUSA: los 248 nunca tuvieron precio; el recálculo existente solo recorre
  productos que ya tienen precio previo, no permite elegir productos y
  siempre corre sobre todo el catálogo.
LIVE RECOMPUTE EXECUTED: NO | TOTAL CDO PRICING VALID: 155 (sin cambio)
CHANGES (precio/productos/categorías/visibilidad/imágenes): 0
PUBLICATION: NO
NEXT: Work debe decidir entre (A) ajustar el recálculo para aceptar una
  lista exacta de productos, o (B) un recálculo global con nueva versión.
```
