# CHK-CDO-01B — CDO / StockSur Model → Variant Normalization Audit

Estado: `ANALYTICAL / NOT_EVALUATED_FOR_PUBLICATION`

Este documento es una capa de análisis derivada del bundle canónico restaurado.
No crea productos públicos, no aprueba masters, no modifica Governance y no
es evidencia de stock, precio, disponibilidad, derechos o publicación.

## Source restoration

El bundle `CDO_StockSur_CANONICAL_SOURCE_BUNDLE_v1.zip` fue leído desde
Descargas y extraído únicamente en una carpeta temporal. El manifiesto incluido
se verificó por nombre, bytes y SHA-256:

- fuentes analíticas esperadas: **11**;
- fuentes presentes: **11**;
- SHA-256 PASS: **11/11**;
- ZIP contenedor persistido en Git: **0**;
- ZIPs proveedores e imágenes crudas persistidos en Git: **0**.

Las copias verificadas están en
`docs/catalog-governance/data/cdo-stocksur/source/`. El bundle completo no se
persiste en el repositorio.

## Canonical contract applied

La normalización respeta el contrato ya certificado:

```text
MODEL → VARIANT / PRODUCT → PROVIDER OFFER
```

La membresía de un modelo no equivale a publicación. La presencia de color en
un nombre de archivo es evidencia de variante candidata, no prueba suficiente
para agrupar públicamente. La regla de master permanece:

```text
TECHNICAL_PASS
+ GEOMETRIC_INTEGRITY_PASS
+ IDENTITY_PASS
+ VISUAL_COMMERCIAL_PASS
+ acceptable RIGHTS / PROVENANCE
```

## Method

1. Se usó `CDO_StockSur_CDO-01A_model_variant_candidates_v1.csv` como universo
   de 967 códigos candidatos y `CDO_StockSur_product_asset_summary_v1.csv`
   para assets, archivos y evidencia multi-SKU.
2. Los códigos con estado `STRONG_COLOR_VARIANT_MODEL_CANDIDATE` se clasificaron
   como `BASE_MODEL` candidato, sin convertirlos en productos.
3. Los códigos sin evidencia suficiente se conservaron como
   `POSSIBLE_MODEL_REQUIRES_REVIEW`.
4. Los códigos con evidencia débil y assets compartidos multi-SKU se marcaron
   `AMBIGUOUS_CODE`.
5. No se declaró ningún código como `STANDALONE_PRODUCT` ni
   `FALSE_OR_NON_PRODUCT_TOKEN`, porque el bundle no contiene evidencia
   suficiente para esas conclusiones.
6. Cada valor de color detectado produce una relación candidata. Los códigos
   sin valor explícito producen una relación `UNKNOWN` para no perder cobertura.
7. Todas las filas llevan `publication_status=NOT_EVALUATED`.

## Verified source universe and discrepancies

| Métrica | Resultado | Alcance / nota |
|---|---:|---|
| ZIP recibidos | 27 | Manifiesto ZIP |
| ZIP únicos por SHA-256 | 26 | Un par exacto duplicado |
| Imágenes válidas, incluyendo duplicado ZIP | 16,836 | CDO-00 inventory |
| Imágenes válidas, excluyendo duplicado ZIP | 16,266 | CDO-00B normalization |
| Assets únicos por SHA-256 | 15,577 | CDO-00 inventory |
| Grupos/extra duplicados en inventario bruto | 1,064 / 1,259 | Incluye el alcance bruto |
| Grupos/extra tras excluir el ZIP duplicado | 494 / 689 | Alcance usado por CDO-00B |
| Imágenes asignables a un SKU | 14,870 | CDO-00B cleaned assignment |
| Imágenes multi-SKU | 1,356 | CDO-00B cleaned assignment |
| Imágenes sin SKU recuperable | 40 | CDO-00B / overlap |
| Códigos CDO-01A | 967 | Universo limpio usado para esta auditoría |
| Tokens SKU-like en overlap bruto | 977 | Universo preliminar más amplio |

La diferencia `977 - 967 = 10` no se reconcilia silenciosamente: el overlap
bruto contiene tokens de naming que no forman parte del universo limpio de
CDO-01A. El manifest JSONL conserva tokens crudos y no sustituye la asignación
limpia de CDO-00B; por eso los conteos de CDO-00B se reportan con su alcance
explícito en vez de volver a contar tokens crudos con una regla distinta.

## Identity classification

| Clasificación | Códigos | Regla aplicada |
|---|---:|---|
| `BASE_MODEL` | 387 | Evidencia repetida de color bajo un mismo código |
| `STANDALONE_PRODUCT` | 0 | No demostrado por las fuentes restauradas |
| `POSSIBLE_MODEL_REQUIRES_REVIEW` | 468 | Evidencia insuficiente sin conflicto multi-SKU determinante |
| `AMBIGUOUS_CODE` | 112 | Evidencia débil y assets compartidos multi-SKU |
| `FALSE_OR_NON_PRODUCT_TOKEN` | 0 | No demostrado como falso dentro del universo limpio |
| **Total** | **967** | Cobertura completa |

Los 387 `BASE_MODEL` son candidatos de identidad, no decisiones de publicación.
De ellos, 350 tienen confianza alta y 37 confianza media.

## Variant dimensions

- Observaciones explícitas de variante detectadas: **1,761**.
- Relaciones en la matriz, incluyendo 496 filas `UNKNOWN`: **2,257**.
- Evidencia de color: **387** códigos con valores explícitos o posibles.
- Familias color-only de alta confianza: **350** como candidatos, pendientes de
  comprobar diferencias sustantivas.
- Familias no-color/substantive confirmadas: **0**.
- Familias que requieren revisión: **617**.

Las dimensiones `SIZE`, `CAPACITY`, `MATERIAL`, `FUNCTION`, `CONSTRUCTION`,
`KIT_INCLUDED_COMPONENTS` y `GENERATION_ACTUAL_MODEL` no se declaran como
confirmadas por este bundle. Su ausencia de evidencia no equivale a ausencia
del atributo; obliga a revisión.

## Multi-SKU handling

Las **1,356** instancias multi-SKU del alcance CDO-00B se mantienen como
evidencia compartida. No se convierten en membresía de modelo automáticamente.
Las categorías aplicables son `COLOR_RANGE_IMAGE`, `FAMILY_IMAGE`,
`COMPARISON_IMAGE`, `MULTIPLE_DISTINCT_PRODUCTS`, `SHARED_MARKETING_ASSET` y
`AMBIGUOUS`.

El bundle restaurado no incluye una tabla limpia, por instancia, con la
clasificación final de esas seis relaciones. Por seguridad, los casos no
demostrables quedan en revisión/ambiguos; la matriz solo conserva el conteo
`multi_sku_asset_count` y no usa esa pertenencia como prueba de identidad.

## Output artifacts

- `docs/catalog-governance/data/cdo-model-variant-candidate-matrix-v1.csv`
  - 2,257 relaciones candidatas;
  - una fila por relación model/variant candidata;
  - `publication_status=NOT_EVALUATED` en todas las filas.
- `docs/catalog-governance/data/cdo-model-normalization-summary-v1.csv`
  - 967 filas, una por código/base-model candidate;
  - sin aprobación de producto ni master.

## Quantification

- códigos preliminares: **967**;
- candidate models: **967**;
- candidate variant relationships: **2,257**;
- naive code-to-card count: **967**;
- escenario inferior provisional: **350** cards candidatas si las 350 familias
  de alta confianza fueran realmente color-only;
- rango de trabajo: **350–967**, no estimación aprobada;
- reducción provisional frente a 967: **0–617** cards, hasta **63.8%**, no
  certificada.

No es posible dar un número final de public cards sin revisar identidad,
dimensiones sustantivas, masters, derechos y elegibilidad pública.

## Confidence and known gaps

- `HIGH`: 350 códigos con evidencia repetida de color.
- `MEDIUM`: 37 códigos con patrón de color menos fuerte.
- `LOW`: 580 códigos sin evidencia suficiente para cerrar identidad/agrupación.
- El nombre del proveedor en las matrices es `CDO_STOCKSUR_SOURCE`, una etiqueta
  de procedencia analítica; no crea ni altera un provider offer runtime.
- No hay mapping contra productos runtime en este checkpoint.
- No hay consulta de stock, precio, publicación ni derechos.
- Los candidatos de master siguen sin aprobación visual.

## Review queue

1. Verificar las 617 familias marcadas para revisión, empezando por los 112
   códigos ambiguos con evidencia multi-SKU.
2. Confirmar dimensiones sustantivas antes de agrupar colores.
3. Separar `COLOR_RANGE_IMAGE`/`FAMILY_IMAGE` de imágenes de producto
   individual y de comparativas.
4. Cruzar candidatos contra la autoridad runtime MODEL → VARIANT → OFFER.
5. Ejecutar una revisión visual/humana de master y provenance/rights solamente
   después de cerrar identidad.

## G4 contract compatibility

La salida es compatible con el contrato G4 existente porque solo produce
evidencia candidata y conserva la secuencia MODEL → VARIANT → PROVIDER OFFER.
No crea una segunda autoridad de modelo, precio, stock o publicación.

## Protected-surface result

Database writes: **0**
Governance live writes: **0**
Runtime changes: **0**
Frontend changes: **0**
Provider calls/writes: **0**
Storage changes: **0**
Final master approvals: **0**
Publication changes: **0**

## Recommended next checkpoint

`CHK-CDO-01C — NORMALIZATION REVIEW QUEUE + CANONICAL PRODUCT/ASSET MANIFEST`

Debe resolver primero los 617 casos de revisión y mantener separados los
casos sin evidencia suficiente. No debe publicar ni aprobar masters por la
sola existencia de estas matrices.
