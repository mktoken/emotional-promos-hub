# CHK-CATGOV-05E — Model-Level Public Projection Implementation Design

**Estado:** diseño de implementación read-only; no implementado
**Baseline:** 83a73ab924e927496f946a5473e311ef57e06b43
**Current live Governance:** 8 models / 18 memberships
**Public projection:** NOT IMPLEMENTED
**Siguiente gate:** 05F — Read-only model public projection backend implementation

## 1. Alcance y decisión ejecutiva

Este checkpoint convierte el contrato 05D en un diseño técnico implementable,
pero no cambia código, SQL, vistas, RPCs, rutas, frontend, analytics, Storage,
Governance ni runtime.

### Recomendación única

**Superficie recomendada: una nueva RPC pública de lectura, versionada y
STABLE, respaldada por una consulta de proyección interna; no modificar
inicialmente productos_publicos ni catalog_search_products_v2.**

Nombre propuesto para lista/búsqueda:

    public.catalog_search_model_projection_v1

Nombre propuesto para detalle/PDP:

    public.get_model_projection_detail_v1

Ambas forman una sola superficie contractual MODEL_PUBLIC_PROJECTION_V1:

- la RPC de búsqueda entrega una fila normalizada por resultado;
- la RPC de detalle recibe model_key y una variante opcional;
- las dos reutilizan las autoridades existentes de precio, stock, imagen,
  elegibilidad y oferta;
- ningún cliente puede escribir mediante ellas.

La separación versionada evita romper consumidores actuales y permite rollback
reversible a la consulta product-grain vigente.

## 2. Evidencia del runtime actual

### 2.1 Flujo actual exacto

    productos_publicos_legacy_v1
            ↓
    productos_publicos
      (latest producto_b2b_status + public_visible + stock_status
       + price_valid + image_available + quote_mode)
            ↓
    catalog_search_products_v2
      (una fila por productos_publicos; total_count; precio/MOQ de Pricing V2)
            ↓
    CatalogView
      (key=prod.id; card; p_limit=24; p_offset; category/subcategory/eco/query)
            ↓
    Index.openProduct(prod.id)
      (/?view=pdp&product=<producto_b2b_id>&returnTo=<catalog URL>)
            ↓
    ProductDetailView
      (productos_publicos por id; variantes JSON; selectedColorIndex local)
            ↓
    get_public_product_price_quote(product_id, quantity)
            ↓
    QuoteSelectionItem / QuoteCartView
            ↓
    submitPublicQuoteRequest
      (product_id, quantity, color, personalization, observation)

Identificadores actuales:

- card key y navegación: productos_publicos.id;
- PDP loader: productos_publicos.id;
- variante visual: posición local en variantes[], con sku_variante o
  clave_variante cuando existe;
- precio: p_producto_b2b_id + p_quantity;
- cotización: product_id + quantity + color;
- WhatsApp: clave/product model/color/cantidad en texto, no model_id ni
  oferta_id.

### 2.2 Fuentes literales

| Área | Fuente actual | Hallazgo |
|---|---|---|
| Catálogo query | src/components/CatalogView.tsx:202-224 | Invoca catalog_search_products_v2 con limit=24, offset, query, categoría, subcategoría y colección; precio min/max llega como NULL. |
| Card | src/components/CatalogView.tsx:695-721 | Key/click por prod.id; imagen desde prod.imagenes; precio desde precio_desde_mxn; MOQ desde minimum_quantity. |
| Router | src/pages/Index.tsx:88-100, 188-193 | Solo query views; PDP actual usa product=<uuid>. |
| PDP loader | src/components/ProductDetailView.tsx:166-183 | Selecciona productos_publicos por id. |
| PDP variants/images | src/components/ProductDetailView.tsx:249-279 | Color e imagen se derivan de JSON; la galería concatena imágenes del producto y de todas las variantes. |
| Precio | src/features/catalog/lib/public-product-price.ts:112-150 | get_public_product_price_quote es la autoridad; el cliente no deriva precio. |
| Quote | src/features/quotes/lib/quote-selection.ts:27-57 y src/features/quotes/lib/public-quote-request.ts | Payload actual preserva product_id, cantidad, color y personalización; no SKU de variante ni oferta. |
| Public view | supabase/migrations/20261009100000_cp3_public_catalog_canonical_visibility_v1.sql:23-53 | Mantiene contrato product-grain y filtra el último status canónico. |
| Search RPC | supabase/migrations/20260803133000_expand_public_quote_v2_backend.sql:696-717, 891-917, 1019-1034 | Devuelve product rows; search_text no incluye membership, SKU de proveedor ni variante JSON. |
| Governance | supabase/migrations/20261010213800_catalog_governance_shadow_foundation_v1.sql:144-218 | Ya existe model/member/asset authority privada; no existe default explícito en membership. |

### 2.3 Flujo objetivo

    catalog_product_models (APPROVED)
      + catalog_product_model_members (CONFIRMED)
      + catalog_governance_state / approvals / issues
      + approved MODEL/VARIANT assets
      + existing producto_b2b + provider offers
      + producto_b2b_status / catalog_price_v2_current_prices
            ↓
    private projection CTE/read layer
            ↓
    catalog_search_model_projection_v1 / get_model_projection_detail_v1
            ↓
    model card OR standalone product/variant card
            ↓
    model PDP + exact selected variant
            ↓
    existing price/stock/offer authorities
            ↓
    additive quote/lead identity payload

## 3. Comparación de superficies

| Opción | Ventaja | Riesgo | Decisión |
|---|---|---|---|
| A. Nueva view pública | Auditable y composable. | Búsqueda, filtros, selección de variante y total_count quedarían duplicados o expuestos como lógica ad hoc. | No como superficie primaria. |
| B. Nueva RPC read-only | Encapsula gates, búsqueda, filtros, JSON de variantes y autorización; contrato versionado y rollback claro. | Requiere cuidar SECURITY DEFINER, search_path, RLS y coste de agregación. | **RECOMENDADA.** |
| C. Extender catalog_search_products_v2 | Un solo punto de consumo. | Rompe forma/semántica existente, tipos generados, agent tools y consumidores product-grain. | No en el primer rollout. |
| D. Agrupación en frontend | Rápida visualmente. | Duplica reglas de identidad, gates, precio, stock y search. | Rechazada. |

La RPC nueva debe ser SECURITY DEFINER, STABLE, con search_path fijo public,
pg_temp, grants públicos mínimos y sin exponer tablas de Governance directamente.

## 4. Read model público propuesto

El contrato compacto está en CATALOG_MODEL_PUBLIC_READ_MODEL_V1.md. La respuesta
mínima de lista debe contener:

| Campo | Tipo conceptual | Regla |
|---|---|---|
| result_grain | text | MODEL o PRODUCT_VARIANT. |
| result_id | uuid/text | ID estable de proyección. |
| model_id | uuid nullable | Obligatorio para MODEL; nulo para standalone. |
| model_key | text nullable | Clave estable; primera versión también URL key. |
| canonical_model_name | text | Nombre aprobado; standalone deriva del producto actual. |
| default_producto_b2b_id | uuid | Producto default/anchor exacto. |
| selected_variant_sku | text nullable | Match de búsqueda o deep link. |
| selected_variant_value | text nullable | Valor aprobado. |
| eligible_variant_count | integer | Solo miembros elegibles. |
| variants | jsonb | Resúmenes públicos exactos. |
| representative_image | jsonb nullable | URL/rol/status aprobado. |
| card_price | jsonb nullable | Precio y generación del mismo anchor. |
| card_moq | integer nullable | MOQ del mismo anchor. |
| availability | text | available, request_quote o unavailable. |
| category | jsonb | Categoría/subcategoría pública. |
| search_match | jsonb nullable | Variante/campo que justificó el match. |
| relevance / total_count | numeric/integer | Semántica compatible con lista actual. |
| projection_version | text | Auditoría y rollback. |

Cada elemento de variants contiene, como máximo, producto, SKU, tipo/valor,
imagen aprobada, price status/valor antes de IVA, MOQ, stock status,
public_eligible y diferencias técnicas. Provider, raw feeds y secretos no son
públicos; offer_id es backend-only.

## 5. Schema change assessment

**SCHEMA CHANGE REQUIRED: YES, solo para el default explícito.**

| Tabla/objeto | Cambio futuro | Por qué | Riesgo | Rollback |
|---|---|---|---|---|
| catalog_product_model_members | is_public_default boolean NOT NULL DEFAULT false y único índice parcial por model_id donde sea true | La schema actual no representa un miembro default; variant_label y el orden de filas no bastan. | Bajo/medio; validar que solo CONFIRMED pueda ser default. | Poner flags en false, retirar uso y luego quitar índice/columna. |

La RPC debe exigir que el default sea CONFIRMED y pase todos los gates. El orden
del selector puede ser determinista por valor normalizado y SKU, pero no
sustituye el default humano.

No se requiere public_slug para el primer piloto: model_key es estable y puede
ser el query key. Un slug SEO humanizado queda para routing posterior.

### Asset schema

No se requiere una nueva columna para MODEL_MASTER: la arquitectura vigente
permite target_type = MODEL + role = MASTER + link_status = PUBLIC_READY.
Para imagen exacta de variante, la constraint actual exige resolver
target_type = VARIANT/OFFER mediante oferta_id; si una membership no tiene oferta
exacta, no se afirma que la imagen sea exacta. Queda sin publicar o usa un
fallback de modelo aprobado.

## 6. Default, image, variant, stock y publication gates

### Default

is_public_default = true para una sola membership confirmada. Si no existe, el
resultado modelo no se publica como tarjeta completa; no se elige primera fila
ni UUID mínimo.

### Imagen

    MODEL MASTER aprobado
      → VARIANT MASTER exacto del default
      → representative asset explícitamente aprobado

Al cambiar variante se prefiere VARIANT_MASTER exacto. Si falta, la UI solo
puede mostrar una imagen de referencia si el fallback fue aprobado; nunca un
sibling como variante elegida. SOURCE_MASTER_INSUFFICIENT bloquea.

### Elegibilidad

    membership_status = CONFIRMED
    model.status = APPROVED
    governance identity/data/content/image/rights gates = PASS
    latest producto_b2b_status:
      public_visible = true
      stock_status = disponible
      price_valid = true
      image_available = true
      quote_mode = cotizable
    Pricing V2 current release = valid
    exact image / fallback = approved
    no open blocker

Un modelo es visible si al menos una variante cumple todo lo anterior. Los
miembros bloqueados permanecen en Governance, pero no entran en variants
públicas.

### Price y MOQ

El card selecciona un commercial_anchor atómico:

1. filtrar variantes elegibles con precio vigente;
2. elegir el menor precio unitario antes de IVA en la misma moneda/generación;
3. tomar el MOQ del mismo producto/variante/oferta/snapshot;
4. desempatar con valor normalizado y SKU exactos documentados;
5. si no existe anchor completo, card_price.status = request_quote y no se
   inventa MOQ.

El PDP vuelve a consultar get_public_product_price_quote con el producto exacto
y cantidad. Nunca mezcla precio de A con MOQ de B.

## 7. Search, filters and routing

### Search

catalog_search_model_projection_v1 debe buscar nombre/model key, contenido
aprobado, SKU exacto de variante, SKU de proveedor, color, acabado y términos
de variante. Devuelve el modelo una sola vez y marca el miembro coincidente en
search_match, preseleccionándolo en el detalle.

lob-sol-neg debe devolver Lobby con NEGRO como matching variant. Un SKU fuera de
un modelo aprobado devuelve PRODUCT_VARIANT.

### Filters

- categoría/subcategoría: filtra antes de deduplicar el modelo;
- color/material: coincide si al menos un miembro elegible coincide;
- precio: evalúa variantes elegibles, pero muestra el anchor exacto;
- MOQ: filtra sobre el MOQ de la variante/offer evaluada;
- disponibilidad: al menos una variante elegible disponible;
- sin coincidencias elegibles, se excluye el modelo.

### Routing

Primera versión compatible:

    /?view=pdp&model=G4_LOBBY
    /?view=pdp&model=G4_LOBBY&variant=lob-sol-neg
    /?view=pdp&product=<existing-product-uuid>

product=<uuid> permanece vigente. model se resuelve por model_key y variant por
SKU exacto; si no resuelve, falla seguro y no selecciona sibling. SEO
/producto/<slug> queda para una fase posterior.

## 8. PDP, quote/lead y analytics design

### PDP minimum delta

| Nivel modelo | Nivel variante |
|---|---|
| model_id, nombre, contenido, categoría, representative image | producto_b2b_id, SKU, tipo/valor, exact image, price, MOQ, stock, availability, technical differences |
| eligible_variant_count | offer resolution interna |
| projection version | selected match/deep link |

El actual ProductDetailView debe evolucionar a loader modelo/variante sin
retirar el loader legacy. El selector no depende de índices JSON.

### Quote / lead

Payload aditivo futuro:

    product_id: existing producto_b2b_id
    model_id: optional approved model id
    model_name: display snapshot
    variant_sku: exact SKU
    variant_type: COLOR
    variant_value: NEGRO
    quantity: 100
    offer_reference: internal/backend-only when applicable
    price_context: pricing_generation_id snapshot

product_id continúa requerido; el cliente nunca envía precio como autoridad.

### Analytics

No se implementa en 05E. Contrato futuro mínimo: catalog_model_view,
variant_selected y product_quote_requested, todos con model_id y
producto_b2b_id cuando existan. Standalone conserva producto_b2b_id.

## 9. G4 simulation reconciliation

El JSON CHK-CATGOV-05E_G4_TARGET_READ_MODEL_SIMULATION_V1.json representa la
forma del read model para los 8 modelos/18 memberships. No es una consulta a
producción ni publica filas.

- READY: 0.
- PARTIAL: 2 — Imperial y Libreta Border.
- BLOCKED: 5 — Lobby, Jello Colors Bio, Jello Zen, Vaso Nomi y Splash.
- INSUFFICIENT_EVIDENCE: 1 — Koi.

En Jello, SOURCE_MASTER_INSUFFICIENT bloquea modelo y variantes; no se inventa
un master. En Imperial y Libreta, el candidato potencial no borra el blocker
de Gold/Gray.

## 10. Frontend and compatibility impact

| Superficie | Archivo/objeto actual | Cambio futuro | Riesgo | Prueba mínima |
|---|---|---|---|---|
| Card | src/components/CatalogView.tsx | Consumir result_grain, variantes y anchor; una card por modelo. | Alto | model one-card; standalone one-card; no duplicados |
| Search | catalog_search_products_v2 / nueva RPC | Buscar model/variant/provider SKU y conservar matching variant. | Alto | exact SKU; color; no leakage |
| Filter | CatalogView.tsx + mobile filters | Filtrar members antes de dedupe. | Medio/alto | color/material/precio/MOQ/stock |
| PDP | src/components/ProductDetailView.tsx | Loader model + exact variant; no índice local como identidad. | Alto | selector; exact image/price/stock |
| Routing | src/pages/Index.tsx | Soportar model/variant, preservar product/returnTo. | Alto | legacy/model/deep link/back |
| CTA | PDP/quote cart | Adjuntar IDs exactos aditivamente. | Alto | payload exact variant |
| Quote | quote-selection.ts + public-quote-request.ts | Agregar model/SKU/offer context; mantener product_id. | Alto | old/new payloads |
| Analytics | no catalog model events found in source audit | Additive dual-grain events. | Medio | both IDs; standalone fallback |
| Agent links | src/features/agent/lib/agent-tools.ts | Preserve product URL; add model resolution later. | Medio | existing agent link |

## 11. Backward compatibility matrix

| Surface | Classification | Strategy |
|---|---|---|
| Existing product URLs | COMPATIBILITY LAYER REQUIRED | Keep product=<uuid> and legacy PDP. |
| SEO/canonical | COMPATIBILITY LAYER REQUIRED | Add model canonical only after pilot. |
| Google Ads landing URLs | COMPATIBILITY LAYER REQUIRED | Do not change destinations before dual-read QA. |
| GA4/analytics | COMPATIBILITY LAYER REQUIRED | Add model events, retain product IDs. |
| CRM attribution | COMPATIBILITY LAYER REQUIRED | Preserve product_id; enrich model/SKU. |
| WhatsApp | COMPATIBILITY LAYER REQUIRED | Append exact SKU/model after validation. |
| Quote requests | COMPATIBILITY LAYER REQUIRED | Add fields; backend remains authority. |
| Saved/share links | COMPATIBILITY LAYER REQUIRED | Legacy query links remain resolvable. |
| Browser back | COMPATIBILITY LAYER REQUIRED | Preserve returnTo and catalog state. |
| Search deep links | COMPATIBILITY LAYER REQUIRED | Matching SKU sets variant. |
| Public API consumers | UNKNOWN | Inventory before changing existing RPCs. |

## 12. Security and performance

- No public SELECT on Governance tables.
- New RPC must be SECURITY DEFINER, STABLE, fixed search_path = public, pg_temp,
  with minimum grants and no raw private evidence.
- Re-evaluate eligibility server-side; never trust client-sent model/variant
  status.
- Expensive work is member joins, latest status, price anchor, asset gates,
  JSON aggregation and exact-SKU search. Inspect EXPLAIN before pilot.
- Likely index review: active members (model_id, membership_status,
  producto_b2b_id), model key, exact SKU normalization, latest status joins.
  No index migration is authorized in 05E.
- List payloads stay compact; detail can carry fuller approved variant data.

## 13. CDO / StockSur / ForPromotional interface

The canonical ingestion manifest should capture:

    provider
    provider_sku
    base_model_candidate
    variant_type
    variant_value
    product_dimensions/specs
    asset_identity_reference
    commercial_difference_flag
    model_confidence
    normalization_status
    source_evidence

Provider SKU count is never public-card count. The shared future interface is:

    provider SKU → candidate model → normalized variant
    → Governance membership/evidence → publication gates
    → public model or standalone projection

ForPromotional needs the same interface plus an audit for color-only duplication
and model families. CDO/StockSur and ForPromotional remain unchanged here.

## 14. Gated implementation phases

1. Read-only backend projection: RPC family, default migration, gates, preview.
2. Automated contract tests: shape, eligibility, no duplicates, tuple safety.
3. G4 internal pilot: staff preview, no public switch.
4. Catalog cards: model cards and compact variant summaries.
5. PDP selector: exact variant image/price/MOQ/stock/offer.
6. Routing compatibility: model key, deep link and legacy product URL.
7. Quote + analytics: additive payload and dual-grain events.
8. Controlled public pilot: allow-listed models, monitoring and rollback.
9. G4 certification: evidence pack, QA and governance closeout.

## 15. Required test plan

| Test | Expected |
|---|---|
| one approved model → one card | Exactly one MODEL result. |
| standalone product | Exactly one PRODUCT_VARIANT result. |
| blocked variant | Hidden from public selector; remains Governance. |
| eligible sibling | Model may remain partial only under explicit policy. |
| price/MOQ | Same commercial anchor tuple. |
| stock | Model visible only with at least one eligible member. |
| exact image | No sibling image presented as exact. |
| SKU search | Exact SKU identifies matching variant. |
| color filter | One model card; matching variant selected/highlighted. |
| legacy/model/deep URLs | All resolve safely and browser back survives. |
| quote payload | Product ID plus exact model/SKU context. |
| no duplicate/cross-model leakage | Grouped member appears once and only in its model. |
| provider offer | Exact offer remains backend-controlled. |
| public eligibility | Candidate/blocked rows never leak. |
| rollback | Disable projection and restore product-grain reads without data loss. |

## 16. No-change record and final gate

    Database changes: 0
    Governance changes: 0
    Views: 0
    RPCs: 0
    Runtime changes: 0
    Storage changes: 0
    Frontend changes: 0
    Routes: 0
    Analytics: 0
    Lovable: 0
    Provider calls: 0

**05E — MODEL-LEVEL PUBLIC PROJECTION IMPLEMENTATION DESIGN: PASS** as a
read-only design. Public implementation remains pending.

Next, if approved:

    CHK-CATGOV-05F — READ-ONLY MODEL PUBLIC PROJECTION BACKEND IMPLEMENTATION
