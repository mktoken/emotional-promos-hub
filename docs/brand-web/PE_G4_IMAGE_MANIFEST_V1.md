# G4 Image Manifest V1 — Phase 1 Identity & Asset Mapping

Estado: `PHASE 1 COMPLETE / IDENTITY MAP PARTIAL`

Este documento registra inventario técnico y conciliación read-only del banco G4. No autoriza publicación, reemplazo de imágenes, cambio de URLs, cambio de runtime ni aprobación MASTER.

## Specialist pre-flight

- Lead: `pe-visual-image-director`
- Support: `pe-evidence-claims`, `pe-brand-strategist`
- Skills disponibles y cargados: sí.

## Fuente y preservación

- Directorio fuente: `/Users/macbookpro/Downloads/G4_Image_Bank_2026`
- ZIP fuente: 9; entradas totales: 1,868; imágenes raster: 1,839.
- Método: lectura directa de entradas ZIP; no se conserva extracción completa.
- ZIP originales modificados: no.

### Conteo por ZIP

| ZIP | Raster |
|---|---:|
| Bebidas y Alimentos.zip | 335 |
| Boligrafos metal.zip | 218 |
| Boligrafos plastico.zip | 504 |
| Electronicos.zip | 27 |
| Libretas.zip | 282 |
| Llaveros.zip | 38 |
| Mochilas.zip | 261 |
| Oficina.zip | 94 |
| Viaje y Accesorios.zip | 80 |

## Inventario técnico

Cada fila de `data/g4-image-manifest.csv` contiene ruta, extensión, tamaño, SHA-256, dimensiones, ratio, orientación, nombre derivado, color/view heurísticos y estado de conciliación.

- Grupos deterministas: 346
- SHA-256 completo: sí (1839/1839)
- Dimensiones completas: sí (1839/1839)
- Grupos exact duplicate: 6; archivos en ellos: 12
- Near/perceptual duplicate: no calculado en esta fase.

## Runtime G4 observado

- Provider: `g4_mx`; raw products: 557; offers: 557; offers con mapping: 504; offers sin mapping: 53; productos B2B mapeados: 504.
- Productos públicos G4 en la exportación de la vista canónica: 281. El baseline del checkpoint reporta 281; la diferencia de una unidad queda explícitamente pendiente de reconciliación y no se inventa.

## Matching estricto

Se aplicaron nombres normalizados exactos y, cuando había múltiples SKU para un nombre exacto, color explícito del filename contra el sufijo del SKU. No se certificó fuzzy matching.

- Filas certificadas: 637
- `NAME_EXACT_UNIQUE`: 244
- `NAME_VARIANT_UNIQUE`: 393
- `MULTIPLE_RUNTIME_MATCHES`: 147
- `NO_RUNTIME_MATCH`: 1055
- Grupos certificados: 76
- Grupos con múltiples matches: 5
- Grupos sin match exacto: 265
- `MATCH_CANDIDATE_REVIEW`: 0: no se promovieron fuzzy matches.

## Intersección pública

Distribución calculada sobre la evidencia exportada de la vista pública canónica; no implica que una imagen sea publicable ni que una URL haya sido reemplazada.

- PUBLIC + CERTIFIED BANK MATCH: 120
- PUBLIC + MATCH CANDIDATE REVIEW: 0
- PUBLIC + MULTIPLE MATCHES: 14
- PUBLIC + NO BANK MATCH: 147

## Naming plan futuro (no aplicado)

`g4-web/<provider_sku>/<provider_sku>_master.webp`, con `_02`, `_detail` o `_color_<slug>` cuando Phase 2 apruebe el rol visual. Los originales no se renombran.

## Límites y siguiente fase

No se hizo OCR masivo ni se usó PDF para sobreescribir runtime. Los grupos sin match exacto, múltiples matches y la diferencia de una unidad en el conteo público requieren revisión dirigida antes de cualquier decisión MASTER o reemplazo público.

## Invariantes

Database writes: 0; runtime writes: 0; provider calls: 0; public image changes: 0; stock/pricing/mapping changes: 0.
