# CHK-CDO-01C — CDO / StockSur Normalization Review Queue

Estado: `ANALYTICAL / PRE-SEED / NOT_EVALUATED_FOR_PUBLICATION`

Este checkpoint transforma la evidencia restaurada en claves, manifest,
revisión y batches. No crea Governance live, productos públicos, provider
offers ni masters aprobados.

## Source lineage

La fuente es la evidencia versionada por CHK-CDO-01B bajo
`docs/catalog-governance/data/cdo-stocksur/source/`, junto con las matrices
01B y el reporte de normalización previo. No se usaron recuerdos, consultas de
runtime, Supabase, proveedores ni imágenes crudas.

## Exact 977 → 967 reconciliation

El universo bruto de `CDO_StockSur_sku_overlap_v0.json` tiene 977 tokens. El
universo limpio de CDO-01A tiene 967 códigos. Los 10 adicionales son tokens de
raíz de archivo/carpeta, no códigos internos de producto:

| raw_token | normalized_token | source_archive | asset_count | disposition |
|---|---|---|---:|---|
| C1 | NOT_A_PRODUCT_TOKEN | Archivo(1).zip | 66 | FORMAT_ARTIFACT |
| C2 | NOT_A_PRODUCT_TOKEN | Archivo(1).zip | 205 | FORMAT_ARTIFACT |
| C4 | NOT_A_PRODUCT_TOKEN | Archivo(1).zip | 352 | FORMAT_ARTIFACT |
| EC1 | NOT_A_PRODUCT_TOKEN | EC1.zip | 335 | FORMAT_ARTIFACT |
| EC2 | NOT_A_PRODUCT_TOKEN | EC2.zip | 709 | FORMAT_ARTIFACT |
| T21 | NOT_A_PRODUCT_TOKEN | T21.zip | 711 | FORMAT_ARTIFACT |
| T22 | NOT_A_PRODUCT_TOKEN | T22.zip | 645 | FORMAT_ARTIFACT |
| T23 | NOT_A_PRODUCT_TOKEN | T23.zip | 1,000 | FORMAT_ARTIFACT |
| T24 | NOT_A_PRODUCT_TOKEN | T24.zip | 1,223 | FORMAT_ARTIFACT |
| T25 | NOT_A_PRODUCT_TOKEN | T25.zip | 622 | FORMAT_ARTIFACT |

Resultado: **967 códigos limpios + 10 tokens reconciliados = 977 tokens
brutos**. No quedan tokens sin explicar.

El detalle versionado está en
`cdo-raw-token-reconciliation-v1.csv`.

## Deterministic candidate keys

Las claves son analíticas, reproducibles y provider-scoped; no son UUIDs live:

```text
CDO_STOCKSUR_SOURCE::model::<provider_code>
CDO_STOCKSUR_SOURCE::model::<provider_code>::variant::<dimension>::<value>
```

Los valores desconocidos usan `unknown` o `asset-relationship::unresolved`,
nunca IDs aleatorios. Las claves están en las matrices y el manifest.

## Normalization status

| Estado | Model candidates | Interpretación |
|---|---:|---|
| `READY_FOR_ASSET_REVIEW` | 328 | Identidad/candidate color coherente; puede pasar a revisión de assets, no a publicación |
| `IDENTITY_REVIEW_REQUIRED` | 468 | Evidencia insuficiente para cerrar identidad |
| `VARIANT_STRUCTURE_REVIEW_REQUIRED` | 59 | Color/model candidate, pero requiere revisar dimensiones sustantivas o assets compartidos |
| `AMBIGUOUS_SOURCE_CODE` | 112 | Código débil con relación multi-SKU compartida |
| `SOURCE_CONFLICT` | 0 | No demostrado en las fuentes actuales |
| `INSUFFICIENT_EVIDENCE` | 0 | Absorbido por los estados específicos anteriores |
| **Total** | **967** | |

`READY_FOR_ASSET_REVIEW` significa únicamente que no hace falta otra
normalización de identidad antes de la revisión visual/asset. No es aprobación
de master ni elegibilidad pública.

## Variant relationship status

- `COLOR_ONLY_SUPPORTED`: **328** candidatos.
- `POSSIBLE_VARIANT`: **498** relaciones/modelos requieren comprobación
  adicional.
- `AMBIGUOUS_VARIANT`: **141** unidades con evidencia multi-SKU compartida.
- `NO_VARIANT_EVIDENCE`: **390** códigos sin valor de variante explícito.
- `SUBSTANTIVE_VARIANT_SUPPORTED`: **0**.
- `FINISH_ONLY_SUPPORTED`: **0**.

El número anterior de 350 familias de color de alta confianza no se usa como
reducción confirmada: 22 de esas familias tienen evidencia multi-SKU que obliga
a revisión estructural/relacional antes de avanzar.

## Canonical product / asset manifest

`cdo-canonical-product-asset-manifest-v1.csv` contiene **3,860** relaciones
derivadas del shortlist de assets. Conserva archive, path, SHA-256, rol
candidato y evidencia de naming. Los roles posibles incluyen:

- `PRIMARY_CANDIDATE`
- `ALTERNATE_VIEW`
- `COLOR_VARIANT_VIEW`
- `DETAIL_VIEW`
- `PACKAGING_VIEW`
- `FAMILY_IMAGE`
- `MULTI_PRODUCT_IMAGE`
- `MARKETING_ASSET`
- `LOW_INFORMATION`
- `AMBIGUOUS`

Los roles se derivan de naming/relación de fuente; `PRIMARY_CANDIDATE` nunca
significa `MASTER_APPROVED`.

Los estados `technical_master_status`, `geometric_integrity_status`,
`identity_status`, `visual_commercial_status` y `rights_provenance_status`
permanecen `NOT_EVALUATED`. El manifest mantiene `publication_status` en
`NOT_EVALUATED` para todas sus filas.

## Multi-SKU treatment

La fuente confirma **1,356** assets multi-SKU. Se clasificaron **141 unidades
de relación a nivel de código/familia** para revisión; no se presenta ese
número como 1,356 decisiones individuales. La pertenencia compartida no crea
membership de modelo.

Cada relación queda abierta para distinguir:

`COLOR_RANGE_IMAGE`, `FAMILY_IMAGE`, `COMPARISON_IMAGE`,
`MULTIPLE_DISTINCT_PRODUCTS`, `SHARED_MARKETING_ASSET` o `AMBIGUOUS`.

## Review queue and batches

`cdo-normalization-review-queue-v1.csv` contiene **1,545** unidades abiertas:

- Batch A / asset-role review: 328;
- Batch B / identity review: 468;
- Batch C / ambiguous source code: 112;
- Batch D / multi-SKU relationship: 141;
- Batch E / low-information naming: 496.

`cdo-review-batch-plan-v1.csv` divide estas unidades en **41 batches** de
aproximadamente 20–40 casos, conservando prioridad y especialista siguiente.

Prioridad:

- P0: conflictos de identidad o agrupación peligrosa;
- P1: estructura de variante no resuelta;
- P2: rol visual/asset pendiente;
- P3: metadata de baja información.

Todos los estados de la cola comienzan en `OPEN`.

## Safe-to-advance segment

Solo **328** candidatos pueden avanzar a revisión de assets sin otra revisión
de identidad. No son productos aprobados.

Seed-design readiness:

- `SEED_DESIGN_CANDIDATE`: 328;
- `NOT_READY_FOR_SEED`: 527;
- `BLOCKED`: 112 códigos ambiguos;
- Governance live writes: 0.

## Card reduction interpretation

- naive code cards: **967**;
- defensible current analytical range: **328–967**;
- confirmed public-card reduction: **0 / 0%**, porque publication permanece
  `NOT_EVALUATED`;
- safe analytical candidate-segment reduction: **639 / 66.1%**, solo como
  hipótesis de agrupación para revisión;
- additional potential reduction: hasta **639** códigos, pendiente de revisar
  identidad, variantes y multi-SKU.

No se presenta ninguna cifra como número final de cards públicas.

## Governance readiness

Los 328 `SEED_DESIGN_CANDIDATE` pueden alimentar un futuro diseño de seed
analítico, siempre que todavía pasen revisión de assets, identidad visual,
rights/provenance y provider offer. Los 112 ambiguos están `BLOCKED`; los
restantes permanecen `NOT_READY_FOR_SEED`.

No se generó seed SQL, no se asignaron defaults públicos y no se escribió
Governance.

## Protected surfaces and limitations

Database writes: **0**
Governance live writes: **0**
Runtime/provider/frontend changes: **0**
Final master approvals: **0**
Publication changes: **0**

Limitaciones abiertas:

1. No existe todavía una tabla runtime que vincule estos candidatos a provider
   offers reales.
2. El bundle no contiene una clasificación visual humana por asset.
3. Las relaciones multi-SKU requieren revisión dirigida por imagen/relación.
4. Las dimensiones sustantivas no pueden inferirse de color/naming solamente.

## Next checkpoint

`CHK-CDO-01D — VISUAL / GEOMETRIC MASTER AUDIT FOR READY_FOR_ASSET_REVIEW
FAMILIES ONLY`
