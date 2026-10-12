# CHK-CATGOV-05D — Model-Level Public Projection Contract

**Estado:** diseño documental aprobado; implementación deliberadamente pendiente
**Modo:** read-only architecture / no implementation
**Baseline:** `becdf44b3d525fdbe03dbedb313d399da18678e0`
**Fecha:** 2026-10-11

## 1. Decisión y límites

Este documento define el contrato futuro para proyectar al catálogo público un
modelo canónico con selector de variantes y ofertas por proveedor:

```text
MODEL
  └── approved VARIANT(s)
        └── provider OFFER(s)
              └── current pricing / stock / image / rights gates
                    └── explicit public projection
```

La arquitectura actual no cambia en este checkpoint. No se ejecutan SQL, writes,
deploys, llamadas a proveedores, cambios de frontend, rutas, analytics,
Pricing V2, stock, mappings ni publicación de assets.

La distinción obligatoria es:

- **Governance membership:** relación privada, todavía no publicación.
- **Variant/product identity:** identidad de `productos_b2b` y sus ofertas.
- **Public projection:** resultado explícito y auditable que el catálogo puede
  leer.
- **Public card:** representación UI de una fila de la proyección, no una
  autoridad nueva de precio o stock.

## 2. Estado real verificado

El estado vivo conocido al baseline es:

- `catalog_product_models`: 8 filas.
- `catalog_product_model_members`: 18 filas.
- 18 `producto_b2b_id` únicos.
- CHK-CATGOV-05C: `CLOSED / PASS`.
- Las memberships siguen siendo candidatas/review; los modelos no son todavía
  una autorización pública.
- El catálogo público no cambió y continúa operando con una fila por producto.

### 2.1 Contratos actuales inspeccionados

| Superficie | Contrato real actual | Consecuencia para 05D |
|---|---|---|
| `productos_publicos` | Vista pública con identidad de producto, `variantes`, `imagenes`, `updated_at` y precio heredado; la vista actual filtra el último `producto_b2b_status` por `public_visible`, `stock_status = disponible`, `price_valid`, `image_available` y `quote_mode = cotizable`. | No contiene `model_id`, membership ni oferta como grano público. |
| `catalog_search_products_v2` | Devuelve una fila por fila de `productos_publicos`; acepta filtros de precio, pero el frontend actual los envía como `NULL`; exige stock disponible en `variantes`; el `search_text` actual no incluye variantes, SKU de proveedor, membership ni oferta. | No puede agrupar modelos ni resolver directamente un SKU de variante sin una extensión futura. |
| `CatalogView` | Llama el RPC con `limit = 24`; muestra `nombre`, `imagenes`, `precio_desde_mxn`, `minimum_quantity`, categoría y `total_count`; la tarjeta se identifica por `prod.id`. | La tarjeta actual es de producto, no de modelo. |
| Ruta pública | El router actual usa `/?view=catalog` y `/?view=pdp&product=<uuid>`; no existe una ruta slug de producto/modelo. | La futura URL de modelo debe ser aditiva y mantener el query contract actual. |
| PDP | Lee `productos_publicos` por `product_id`; cambia localmente el índice de `variantes`; la identidad sigue siendo el producto; precio se obtiene por `get_public_product_price_quote(product_id, quantity)`. | La variante futura debe conservar el producto exacto y resolver la oferta sin sustituir la identidad. |
| Quote request | `buildQuoteRequestItems` envía `product_id` y, opcionalmente, nombre de color; no envía todavía SKU de variante ni `oferta_id`. | La compatibilidad exige agregar identidad exacta sin retirar `product_id`. |
| Governance | `catalog_product_models`, `catalog_product_model_members`, `catalog_governance_state`, assets, approvals e issues son superficies privadas. | Governance debe alimentar una proyección explícita; no debe convertirse en autoridad de precio/stock. |

Fuentes literales principales:

- `src/components/CatalogView.tsx:210-220, 698-701`.
- `src/pages/Index.tsx` — vistas `catalog`, `pdp`, `cart` y `brief` basadas en
  query params.
- `src/components/ProductDetailView.tsx:171-174, 249-262, 647-666`.
- `src/features/quotes/lib/quote-selection.ts` — payload actual por
  `product_id`/color.
- `supabase/migrations/20261009100000_cp3_public_catalog_canonical_visibility_v1.sql:23-53`.
- `supabase/migrations/20260803133000_expand_public_quote_v2_backend.sql:696-717, 891-917, 1019-1034`.
- `supabase/migrations/20261010213800_catalog_governance_shadow_foundation_v1.sql:144-218`.

## 3. Contrato de resultado público

### 3.1 Regla de grano

Una futura proyección pública puede emitir dos granos en la misma consulta:

1. **`MODEL`**: una fila por modelo canónico aprobado cuando existe al menos
   una variante publicable.
2. **`PRODUCT_VARIANT`**: una fila individual cuando no existe una agrupación
   aprobada, el modelo está bloqueado o la identidad de agrupación no es
   suficiente.

No se fuerza todo producto a un modelo. Tampoco se muestran simultáneamente
   las variantes individuales que ya están representadas por un modelo
   publicado; esa es la regla que evita duplicar Lobby como tres tarjetas.

La futura fila de proyección debe contener, como mínimo, de forma auditable:

| Campo conceptual | Regla |
|---|---|
| `projection_key` | ID estable de la fila pública. |
| `result_grain` | `MODEL` o `PRODUCT_VARIANT`. |
| `model_id` / `model_key` | Obligatorio para `MODEL`; nulo para standalone. |
| `default_producto_b2b_id` | Variante exacta usada para la tarjeta/PDP inicial; obligatorio para `MODEL`. |
| `eligible_variant_count` | Conteo de variantes elegibles, no conteo de memberships existentes. |
| `display_content` | Contenido aprobado para el grano proyectado. |
| `image_anchor` | Asset aprobado y su rol; nunca una URL arbitraria. |
| `commercial_anchor` | Tuple exacto producto/variante/oferta/precio/MOQ que explica la tarjeta. |
| `projection_version` / `projected_at` | Trazabilidad y reversibilidad. |

Estos son campos de contrato futuro, no columnas que se agreguen ahora.

### 3.2 Gate de modelo público

Un modelo podrá entrar como `MODEL` solamente si se cumplen simultáneamente:

1. `catalog_product_models.status = APPROVED`.
2. Existe contenido actual aprobado para el modelo, si el modelo sustituye el
   contenido de producto.
3. Existe al menos una membership `CONFIRMED`; `CANDIDATE` nunca basta.
4. La variante miembro tiene identidad/datos/contenido/imágenes/rights
   aprobados según Governance.
5. El producto/variante tiene pricing vigente y cotizable en la autoridad
   actual.
6. El estado canónico actual conserva `public_visible = true`,
   `stock_status = disponible`, `price_valid = true`, `image_available = true`
   y `quote_mode = cotizable`.
7. Existe una imagen válida para la representación modelo o un fallback
   explícitamente aprobado.
8. No hay issue/blocker vigente de modelo, membership, variante, asset o
   provenance.
9. La proyección se genera explícitamente, con versión, evidencia y operación
   reversible.

La existencia de una fila en `catalog_product_models` o una membership no
publica nada por sí sola.

### 3.3 Gate de variante

Cada variante se evalúa independientemente. Para ser seleccionable debe:

- pertenecer a una membership `CONFIRMED` de un modelo aprobado, o ser un
  producto standalone elegible;
- conservar su `producto_b2b_id` y el SKU/valor de variante exactos;
- pasar identidad, contenido, imagen, derechos, stock, precio, MOQ y
  `quote_mode` para ese producto/offer;
- tener un asset exacto o un fallback etiquetado como referencia y aprobado;
- no tener blocker de identidad o de asset.

Una variante `NO_VALID_MASTER`, `BANK_MATCH_REVIEW_REQUIRED` o con identidad
no resuelta queda en Governance y no se muestra como opción aprobada. No se
compensa con la imagen de un hermano.

## 4. Modelo → imagen → variante

### 4.1 Jerarquía determinista de imagen

Para la tarjeta modelo/PDP inicial:

1. asset `target_type = MODEL`, `role = MASTER`, con `link_status = PUBLIC_READY`
   y asset con identity, technical, visual, rights y approval compatibles;
2. `target_type = VARIANT`, `role = MASTER` de la variante default, con los
   mismos gates;
3. otro asset explícitamente aprobado como representante del modelo.

Nunca se utiliza automáticamente el primer asset, un derivado deformado, una
imagen de otro color, un sibling o un source débil no aprobado.

La schema actual sí expresa un master de modelo mediante
`target_type = MODEL, role = MASTER`. Sus roles son genéricos (`MASTER`,
`VARIANT`, `ALT`, `DETAIL`, `LIFESTYLE`); no existen strings separados
`MODEL_MASTER`, `VARIANT_MASTER`, `MODEL_ALT` o `VARIANT_ALT`. Por tanto, el
contrato futuro debe documentar la semántica de la combinación
`target_type + role`, no inventar esos valores en runtime. Para `VARIANT` y
`OFFER`, la constraint actual exige `oferta_id`; la implementación futura debe
resolver esa relación de forma explícita y no deducirla por nombre.

### 4.2 Cambio de variante en PDP

El objetivo es:

```text
Nombre canónico del modelo
  → selector color/acabado/dimensión aprobada
  → SKU exacto
  → imagen exacta
  → precio y MOQ de la variante
  → stock/disponibilidad exactos
  → oferta elegida por backend
```

Al seleccionar una variante se actualizan SKU, valor, imagen, precio, MOQ,
stock, disponibilidad, oferta y datos técnicos que sean variant-specific. El
nombre canónico del modelo permanece.

Si no existe `VARIANT_MASTER` exacto:

- no se muestra silenciosamente otra variante como si fuera la elegida;
- se mantiene una imagen de referencia únicamente si el asset/model gate la
  aprobó como tal;
- la UI futura debe distinguir visualmente “imagen de referencia del modelo”
  de una imagen exacta;
- si ni siquiera existe ese fallback aprobado, la variante no es publicable o
  queda seleccionable solo con estado `NEEDS_REVIEW`, según la política que se
  apruebe en 05E.

## 5. Default variant

La schema actual no tiene un campo de miembro preferido/default ni un orden
comercial explícito; `variant_label` no es suficiente. Por tanto, no son reglas
válidas: primera fila, UUID menor, orden del proveedor o azar.

### Contrato futuro mínimo recomendado

Agregar en una fase posterior un atributo explícito de preferencia, por
ejemplo `is_public_default`, con estas garantías:

- solo puede ser `true` para una membership `CONFIRMED`;
- índice único parcial: máximo un default por modelo;
- el miembro default debe pasar todos los gates de publicación;
- si no existe default explícito, el modelo no recibe una tarjeta pública
  completa; queda `PARTIAL`/`REQUIRES_REVIEW` hasta decisión humana;
- `display_order` puede ordenar el selector, pero no sustituye el default.

La alternativa de una tabla de preferencias de proyección es equivalente si
se mantiene el mismo contrato. 05E debe decidir el mecanismo; 05D no modifica
el esquema.

## 6. Price y MOQ

### 6.1 Tarjeta de modelo

La tarjeta futura conserva el copy aprobado:

```text
Desde $X.XX c/u + IVA
Personalización no incluida
Mínimo: N piezas
```

`X` y `N` deben provenir del mismo tuple comercial:

```text
eligible variant + selected offer/price authority + price snapshot + MOQ
```

Reglas:

- el “Desde” debe ser el menor precio entre variantes elegibles en una misma
  moneda y generación vigente, o la política comercial explícita que se
  apruebe;
- el MOQ mostrado junto a ese precio es el MOQ de esa misma variante/oferta,
  nunca el mínimo de otra variante;
- si dos variantes empatan, el tie-break debe ser estable y documentado, no
  UUID/provider order;
- la tarjeta puede decir “Mínimo desde N piezas” cuando la política lo permita,
  pero no debe ocultar que el MOQ cambia por variante;
- el PDP muestra el precio/MOQ de la variante seleccionada y vuelve a pedir el
  quote autoritativo para la cantidad solicitada.

Pricing V2/current pricing sigue siendo la autoridad. No se calcula
`cost * margin` en frontend ni se mezclan snapshots de variantes distintas.

### 6.2 Stock y disponibilidad

Un modelo se presenta como disponible si existe al menos una variante elegible
con el estado público actual. El PDP siempre muestra el estado exacto de la
variante seleccionada. No se crea una nueva tabla de stock de modelo: el
modelo deriva disponibilidad de las variantes y de la autoridad canónica de
stock existente.

## 7. Search, filtros y navegación

### 7.1 Search

La futura semántica de `catalog_search_products_v2` o de una proyección
compatible debe:

- devolver una fila por modelo aprobado cuando la agrupación aplica;
- devolver productos/variantes individualmente cuando no hay agrupación
  aprobada;
- indexar nombre de modelo, contenido de modelo, SKU de variante, SKU de
  proveedor, color/acabado y términos de variante;
- resolver `lob-sol-neg` a Lobby y conservar el valor NEGRO para el PDP;
- nunca resolver productos no aprobados solo porque comparten nombre.

El texto de búsqueda actual no incluye esos campos de variante/oferta; por eso
esto es `CHANGES_REQUIRED` en implementación.

### 7.2 Categoría y filtros

| Filtro | Regla de proyección |
|---|---|
| Categoría/subcategoría | Se aplica a la categoría canónica del modelo o a las variantes elegibles; una tarjeta por modelo. |
| Color/acabado | Un modelo aparece una vez si al menos una variante elegible coincide; el selector se preselecciona en la variante coincidente. |
| Material | Igual: filtra por miembros elegibles y no duplica la tarjeta. |
| Precio | Evalúa el rango de precios de variantes elegibles; la tarjeta explica el anchor que muestra. |
| Disponibilidad | `true` si al menos una variante elegible está disponible; el PDP detalla cada variante. |
| Sin coincidencias | Se excluye el modelo; no se muestra una variante bloqueada para mantener el conteo. |

La regla general es una tarjeta por modelo, salvo que la identidad no esté
aprobada y deba caer al grano `PRODUCT_VARIANT`.

### 7.3 URL y deep link

El contrato futuro debe conservar el route shell actual y agregar parámetros
estables, por ejemplo:

```text
/?view=pdp&model=<model_key>&variant=<variant_sku>
```

Una ruta SEO amigable como `/producto/<model-slug>` puede ser una capa posterior,
pero no se debe romper el contrato existente. Reglas:

- un modelo tiene una URL canónica estable;
- `variant` permite deep-link exacto y debe resolverlo contra el member/SKU
  aprobado;
- los links existentes `/?view=pdp&product=<uuid>` siguen abriendo el producto
  histórico;
- si el producto pertenece a un modelo aprobado, puede mostrarse dentro del
  modelo sin invalidar el link antiguo;
- `returnTo`, paginación, SEO canonical, social preview, Ads y shared links
  deben conservarse durante la transición.

## 8. Mixed providers

Un modelo puede tener offers equivalentes de más de un proveedor solamente
después de comprobar identidad canónica, variante y evidencia. El grafo sigue
siendo:

```text
MODEL → VARIANT → provider OFFER(s)
```

No se agrupan nombres parecidos. El proveedor no se muestra por defecto en la
card/PDP; la selección es una decisión comercial/backend. El `offer_id` se
conserva internamente para precio, stock, fulfillment, trazabilidad y quote.
Si una diferencia de proveedor cambia identidad, material, color o servicio,
las ofertas no son equivalentes y no se fusionan.

## 9. Publication gate y reversibilidad

La publicación futura requiere:

```text
approved model
  + confirmed memberships
  + eligible variants
  + approved content
  + approved image/provenance/rights
  + current pricing validity
  + current stock/public validity
  + no open blockers
      ↓
explicit versioned public model projection
      ↓
catalog search/cards/PDP
```

La proyección debe ser explícita, auditable y reversible. Ninguna tabla de
Governance escribe directamente en `productos_publicos`; tampoco se usa
Governance como autoridad paralela de precio o stock. La siguiente fase debe
definir preview, publicación, rollback y evidencia de cada versión.

## 10. Backwards compatibility y analytics

El cambio de grano puede afectar:

- URLs de producto y links guardados;
- indexación y landing pages de Google Ads;
- eventos GA4/analytics;
- WhatsApp y requests de cotización;
- atribución CRM;
- IDs de producto, cart-like flows y links administrativos;
- consumidores de RPC/API.

Contrato de transición:

1. Mantener `producto_b2b_id` como identificador exacto de la variante.
2. Agregar `model_id/model_key` sin retirar el ID de producto.
3. Mantener `product=<uuid>` mientras se introduce `model=<model_key>`.
4. Añadir `variant_sku` y, cuando sea seguro, `oferta_id` al payload de quote;
   mantener `product_id` obligatorio durante una ventana dual.
5. Recalcular precio/stock en backend con el identificador exacto, nunca con el
   texto de la tarjeta.
6. Mantener alias/canonical redirects y compatibilidad con Ads/SEO.
7. Medir una ventana dual antes de retirar eventos/product IDs antiguos.

Eventos futuros recomendados:

| Evento | Identificadores mínimos |
|---|---|
| `model_viewed` | `model_id`, `model_key`, projection version |
| `variant_selected` | `model_id`, `producto_b2b_id`, `variant_sku`, selected value |
| `quote_requested` | `model_id`, `producto_b2b_id`, `variant_sku`, `oferta_id` cuando aplique |
| `product_viewed_legacy` | `producto_b2b_id` para compatibilidad |

No se modifica GA4 ni quote payload en 05D.

## 11. G4 simulation — read-only

La simulación en `CHK-CATGOV-05D_G4_PUBLIC_PROJECTION_SIMULATION_V1.csv` usa
las 8 modelos/18 memberships del 05C. Es una proyección hipotética, no cambia
el catálogo y no afirma que exista publicación actual.

Convenciones:

- `variant_evidence_candidates` = variantes con evidencia suficiente para
  seguir evaluándolas bajo el gate futuro; no equivale a publicación.
- `public_eligible_now` = variante que podría entrar hoy al public projection
  completo; con el estado 05C es `NONE` porque memberships/modelos no están
  aprobados para publicación.
- `projection_readiness` separa forma estructural de readiness de publicación.

Resultado agregado:

| Estado de simulación | Modelos |
|---|---:|
| `READY` | 0 |
| `PARTIAL` | 2 — Imperial, Libreta Border |
| `BLOCKED` | 5 — Lobby, Jello Colors Bio, Jello Zen, Vaso Nomi, Splash |
| `INSUFFICIENT_EVIDENCE` | 1 — Koi Bio Translúcida Tinta Azul |

`PARTIAL` significa que existe una variante candidata potencialmente elegible
pero el modelo todavía no es publicable: approvals, content, image/rights y
projection gate siguen pendientes. No significa que haya cambios públicos.

### Jello

Jello Colors Bio (3 variantes) y Jello Zen (2 variantes) sí tienen forma de
familia, pero las fuentes siguen marcadas `SOURCE_MASTER_INSUFFICIENT` y las
geometrías heredadas no permiten declarar un `MODEL_MASTER` válido. La
consecuencia correcta es `BLOCKED`, con remediación de source/image pendiente;
no se usa una variante hermana como master del modelo.

### Imperial y Libreta Border

Imperial conserva `imp-neg-cro` como candidato PHASE_3_READY y
`imp-neg-oro` como `NO_VALID_MASTER`; Libreta Border conserva `lib-bor-azu` como
candidato y `lib-bor-gri` como `NO_VALID_MASTER`. El modelo puede ser
potencialmente parcial en el futuro, pero las variantes bloqueadas no aparecen
como selector aprobado ni se sustituyen con el sibling.

## 12. CDO / StockSur / ForPromotional

La misma proyección pública debe aplicarse conceptualmente antes de ampliar el
catálogo:

```text
provider SKU
  → base model candidate
  → variant dimension/value
  → Governance decision
  → explicit public model projection
```

Por tanto:

- cantidad de SKUs de CDO/StockSur no equivale a cantidad de tarjetas públicas;
- CDO/StockSur requieren normalización de familias, variante y evidence antes
  de deduplicar visualmente;
- ForPromotional debe auditar color-only duplication, model families y
  oportunidad de compresión antes de proyectar expansión pública;
- no se hacen writes ni cambios de proveedor en 05D.

## 13. Minimal future implementation plan

05D no implementa ninguna fase. El orden mínimo recomendado para 05E y
posteriores es:

1. **Projection/read model:** contrato versionado, preview, gates y rollback.
2. **Search grouping:** búsqueda por model/variant/provider SKU sin duplicados.
3. **Catalog cards:** una card modelo y metadata de variantes.
4. **PDP selector:** selección exacta con imágenes, precio, MOQ y stock.
5. **Backwards-compatible routing:** query contract, canonical URLs y aliases.
6. **Analytics/quote validation:** IDs duales, exact variant/offer payload.
7. **Controlled pilot:** pocos modelos aprobados, QA público y rollback.

Cada fase necesita evidencia separada y no debe inferir publicación por la
existencia de Governance rows.

## 14. Acceptance / no-change record

### Contrato definido en 05D

| Área | Estado del contrato | Estado de implementación actual |
|---|---|---|
| Public result grain | PASS | CHANGES_REQUIRED — actual es product-row |
| Model eligibility | PASS | CHANGES_REQUIRED |
| Variant eligibility | PASS | CHANGES_REQUIRED |
| Model image | PASS | CHANGES_REQUIRED |
| Default variant | PASS | CHANGES_REQUIRED — no default field actual |
| Card price | PASS | CHANGES_REQUIRED |
| MOQ | PASS | CHANGES_REQUIRED |
| Stock | PASS | CHANGES_REQUIRED — derivación futura, sin nueva autoridad |
| Search | PASS | CHANGES_REQUIRED |
| PDP variant selector | PASS | CHANGES_REQUIRED |
| URL/deep link | PASS | CHANGES_REQUIRED |
| Backwards compatibility | PASS | CHANGES_REQUIRED |
| Analytics | PASS | CHANGES_REQUIRED |
| CDO/StockSur | PASS | CHANGES_REQUIRED — future normalization |
| ForPromotional | PASS | CHANGES_REQUIRED — future audit |

### Superficies no tocadas

```text
Database changes:   0
Runtime changes:    0
Views/RPC changes:  0
Storage changes:    0
Frontend changes:   0
Route changes:      0
Analytics changes:  0
Lovable changes:    0
Provider calls:     0
```

## 15. Final gate

05D es **PASS como contrato documental** y **no es una certificación de
implementación pública**. El catálogo permanece con su comportamiento actual.

**Siguiente checkpoint si se acepta este contrato:**

`CHK-CATGOV-05E — MODEL-LEVEL PUBLIC PROJECTION IMPLEMENTATION DESIGN`

No implementar antes de ese checkpoint.
