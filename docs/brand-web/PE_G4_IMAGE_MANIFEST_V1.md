# G4 Image Manifest V1 — Phase 1B Public Identity Reconciliation

Estado: `PHASE 1B PARTIAL / PUBLIC IDENTITY REVIEW REQUIRED`

Este documento conserva el inventario técnico del banco G4 y añade un snapshot
read-only de la identidad pública. No autoriza publicación, reemplazo de
imágenes, cambio de URLs, cambios de runtime, mappings, precios o stock.

## Specialist pre-flight

- Orchestrator: `pe-specialist-orchestrator` — AVAILABLE / LOADED.
- Lead: `pe-evidence-claims` — AVAILABLE / LOADED.
- Support: `pe-visual-image-director`, `pe-brand-strategist` — AVAILABLE / LOADED.

## Fuente y preservación

- Directorio fuente: `/Users/macbookpro/Downloads/G4_Image_Bank_2026`.
- ZIP fuente: 9; raster: 1,839.
- Método: lectura directa del inventario técnico; no se conserva extracción completa.
- ZIP originales modificados: no.
- PDF dirigido: no se utilizó todavía; no se hizo OCR masivo.

## Inventario técnico preservado

- Grupos deterministas: 346.
- SHA-256 completo: 1,839/1,839.
- Dimensiones completas: 1,839/1,839.
- Grupos exact duplicate: 6; archivos: 12.
- Near/perceptual duplicate: no calculado.

## Snapshot público congelado

La exportación disponible contiene 281 registros no vacíos, con 281
`producto_b2b_id` y 281 `offer_id` únicos. Se congela como:

`PUBLIC_G4_SNAPSHOT_281`

Este número es evidencia de snapshot, no afirmación de cardinalidad live. La
revalidación contra runtime queda requerida antes del cierre final de CP-3.

El conteo previamente mencionado de 280 no está respaldado por el artefacto
disponible y no se usa.

## Estado de identidad del snapshot

| Estado final | Productos |
|---|---:|
| `CERTIFIED_BANK_MATCH` | 106 |
| `CERTIFIED_MULTI_VARIANT_BANK_MATCH` | 0 |
| `BANK_MATCH_REVIEW_REQUIRED` | 175 |
| `NO_BANK_ASSET_FOUND` | 0 |
| **Total snapshot** | **281** |

Las 106 certificaciones conservan evidencia explícita ya presente en el
manifiesto anterior: identidad runtime y asociación con el banco. Los otros
175 productos no se promueven por similitud visual o por nombre parcial.

### Revisión pendiente

- Múltiples matches reportados previamente: 14; permanecen como
  `BANK_MATCH_REVIEW_REQUIRED` porque no se conserva en el snapshot una
  relación inequívoca SKU/variante para cada caso.
- Sin coincidencia exacta reportados previamente: 147; permanecen como
  `BANK_MATCH_REVIEW_REQUIRED`. La ausencia de coincidencia nominal no prueba
  que no exista un asset en el banco.
- Casos adicionales del snapshot sin evidencia row-level preservada: 14.

No se asigna `NO_BANK_ASSET_FOUND` sin evidencia negativa suficiente.

## Phase 2 eligibility

| Estado | Productos |
|---|---:|
| `PUBLIC_PHASE_2_READY` | 106 |
| `PUBLIC_REVIEW_REQUIRED` | 175 |
| `PUBLIC_NO_BANK_ASSET` | 0 |

La tabla completa de los 281 productos públicos congelados está en
`data/g4-image-manifest.csv` como registros `PUBLIC_SNAPSHOT`, con:

- `snapshot_public_product_id`;
- `snapshot_offer_id`;
- `public_snapshot_status`;
- `identity_certification_method`;
- `variant_family_id`;
- `variant_relationship`;
- `phase2_eligibility`;
- `review_reason`.

No se agregaron claims de master, optimización, ruta pública, stock, precio o
disponibilidad.

## Evidencia previa de contexto

- Public certified bank match previo: 120.
- Public multiple matches previo: 14.
- Public no exact bank match previo: 147.

Esas cifras se conservan como métricas de entrada del checkpoint; el estado
final de esta reconciliación se reporta sobre `PUBLIC_G4_SNAPSHOT_281` y sobre
la evidencia row-level actualmente preservada.

## Invariantes

- Database writes: 0.
- Runtime writes: 0.
- Provider calls: 0.
- Public image changes: 0.
- Optimization: no.
- Renaming: no.
- Mappings, stock y precios: sin cambios.
- `public_runtime_status`: no certificado.

## Deferred final gate

`LIVE_RUNTIME_PUBLIC_G4_COUNT: REVALIDATION REQUIRED BEFORE CP-3 FINAL CLOSURE`

Esta verificación se difiere; no bloquea esta reconciliación snapshot-based,
pero sí el cierre final de CP-3.
