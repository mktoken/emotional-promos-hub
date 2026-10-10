# CATALOG GOVERNANCE & PRODUCT EXPERIENCE DIRECTIVE

**Status:** DOCUMENTATION FOUNDATION / ARCHITECTURE DESIGN
**Date:** 2026-10-10
**Scope:** Catalog Intelligence & Governance Hub, product model and public product experience
**Implementation status:** NOT STARTED

This directive is architectural guidance only. It does not implement tables,
RPCs, Edge Functions, frontend changes, migrations, storage changes, pricing,
stock, mappings, categories, schedulers, or publication.

## 1. PURPOSE

Define the canonical direction for catalog governance and the commercial
presentation of products without replacing the runtime authorities already used
by Promocionales Emocionales.

The target is a lightweight PIM/PXM/DAM governance layer that can preserve
provider truth, normalize product information, apply human approval, and expose
only approved content to the public catalog.

## 2. NON-NEGOTIABLE ARCHITECTURAL BOUNDARIES

- Supabase remains internal to Lovable. No external Supabase or parallel runtime.
- Original provider data is never destroyed.
- Governance never publishes directly to the public web.
- Governance is not a second stock, pricing, mapping, category, or publication authority.
- AI may extract, normalize, draft, and suggest; it may not invent factual specifications.
- A hash, HTTP success, mapping, or provider image does not by itself approve a master or a public product.
- Public implementation remains blocked until the shadow foundation and pilot pass.
- All future changes remain gradual, reversible, auditable, and separately checkpointed.

## 3. CURRENT RUNTIME AUTHORITIES

The following existing surfaces remain authoritative and are not replaced:

| Concern | Current authority | Governance role |
|---|---|---|
| Raw provider data | `provider_raw_products.raw_payload` and provider records | Preserve and reference |
| Product identity | `productos_b2b` | Existing canonical identity |
| Provider offers and variants | `producto_proveedor_ofertas` | Existing source/offer layer |
| Offer mapping | `producto_b2b_oferta_map` | Do not duplicate |
| Stock | `producto_proveedor_stock`, `producto_b2b_status`, refresh runtime | Read and gate |
| Pricing | Pricing V2 and its current release/cache chain | Read and gate |
| Categories | Existing category/subcategory tables and assignments | Reuse |
| Public eligibility | Current `producto_b2b_status.public_visible` contract and public view | Runtime gate |
| Public projection | `productos_publicos` | Existing public projection |
| Public search | `catalog_search_products_v2` | Public catalog entry |
| Image storage | `catalog-product-images` | Existing storage authority |
| Image administration | `catalog-image-admin` | Controlled asset operations |

`productos_b2b.activo` must not be treated alone as the canonical public
eligibility decision.

## 4. GOVERNANCE TARGET ARCHITECTURE

```text
PROVEEDORES / PDFs / APIs / FEEDS / ZIP
                ↓
        RAW SOURCE EXISTENTE
 provider_raw_products
 documentos y assets con provenance
                ↓
   GOVERNANCE + NORMALIZATION
 atributos · contenido · assets · evidence
                ↓
        HUMAN APPROVAL
                ↓
      READINESS CALCULADO
 identity · data · content · image
 pricing · stock/public eligibility
                ↓
     PUBLICATION GATE EXPLÍCITO
                ↓
   PROYECCIÓN CONTROLADA AL RUNTIME
                ↓
 productos_b2b · imagenes · status
                ↓
        productos_publicos
                ↓
     catalog_search_products_v2
                ↓
          WEB PÚBLICA
```

The direction is unidirectional. Governance may propose and approve; a later,
controlled publication integration may project approved fields to the runtime.

## 5. PRODUCT MODEL / VARIANT / OFFER CONTRACT

```text
PRODUCT MODEL
→ PRODUCT / VARIANT
→ PROVIDER OFFER
→ STOCK / PRICING
```

The model/variant abstraction must not destroy current IDs.

Group a model when differences are mainly color, ink, finish, visual variant,
or equivalent presentation. Use separate commercial cards when construction,
material, size, capacity, function, price, MOQ, or buying configuration changes.

Pilot families include Lobby, Koi, Jello, and FLAMENCO. Future conceptual
relations may use `catalog_product_models` and
`catalog_product_model_members`, while current identities remain intact.

## 6. RAW → NORMALIZED → APPROVED → PUBLIC PROJECTION

The data layers are:

1. **RAW:** provider payloads, original names, source attributes, documents, URLs, timestamps, and assets.
2. **NORMALIZED:** proposed taxonomy, dimensions, materials, colors, family attributes, and canonical content.
3. **APPROVED:** human-reviewed fields and assets with evidence.
4. **PUBLIC PROJECTION:** controlled, idempotent projection to current runtime authorities.

There is no bidirectional synchronization between governance and raw data.
Public runtime data is never used to silently overwrite source evidence.

## 7. PRODUCT ATTRIBUTE STANDARD

Every family defines required and optional attributes. Common normalized fields
include material, dimensions, capacity, color, composition, characteristics,
and family-specific properties.

Each value preserves:

```text
raw_value
normalized_value
source
confidence
review_status
```

Non-applicable attributes are not counted as missing. Unsupported attributes
remain unresolved rather than being inferred.

## 8. CONTENT STANDARD

Every public product should feel written by Promocionales Emocionales rather
than by a different supplier.

Target structure:

- `canonical_name`
- `short_description`
- `structured_features`
- `technical_specifications`
- `available_colors`

Supplier copy is evidence input, not automatically publishable copy. Claims
about performance, sustainability, certifications, durability, delivery, or
availability require separate evidence.

## 9. IMAGE GOVERNANCE STANDARD

```text
RAW ASSET
→ IDENTIFIED
→ CANDIDATE
→ MASTER CANDIDATE
→ TECHNICAL QA
→ VISUAL COMMERCIAL QA
→ APPROVED MASTER
→ OPTIMIZED
→ PUBLIC READY
```

Required asset metadata includes provider, source path, filename, hash,
dimensions, MIME, rights, variant, role, quality, visual status, approval, and
public URL.

`HTTP_OK` is not `VISUAL_PASS`. `HASH_MATCH` is not `MASTER_APPROVED`.
Mapping is not `PUBLIC_READY`.

The existing `catalog-product-images`, `catalog-image-admin`, and
hash-addressed immutable paths remain the infrastructure direction. The current
admin function separates preflight/validation from application and uses the
current `producto_b2b_status.public_visible` authority for eligibility.

An approved asset may later be projected through the controlled image-admin
contract to `productos_b2b.imagenes`; that action is not authorized by this
document.

## 10. PRICE DISPLAY CONTRACT

### Card

```text
Desde $X.XX c/u + IVA
Personalización no incluida
Mínimo: N piezas
```

`X` is the best valid public unit price applicable to the product according to
Pricing V2 and approved commercial policies. “Desde” does not imply that the
price applies at the MOQ.

Never expose supplier cost, margin, private formula, or provider internals.

### PDP

The frontend must call the authorized pricing engine. It must not reproduce a
financial formula. Display the current quantity-dependent public result with
high hierarchy:

```text
$X.XX MXN c/u + IVA
Personalización, impresión o grabado no incluidos.
```

If applicable, secondary wording may state that personalization is quoted
separately according to product, design, and quantity.

## 11. MOQ / QUANTITY CONTRACT

`initial_quantity = current_product_MOQ`.

Presets are the real MOQ plus commercially relevant next tiers. Examples:

```text
329 | 500 | 1,000 | 2,500
50  | 100 | 250   | 500
```

These are examples, not universal constants. The CTA must not begin in an
invalid state. If a user enters less than the current MOQ, show:

```text
Ajustar a N piezas
```

where `N` is the current MOQ. Pricing remains owned by Pricing V2.

## 12. DELIVERY CONTRACT

The business rules currently defined for future evaluation are:

- without printing or engraving: 24 to 48 hours after deposit confirmation;
- with printing or engraving: 10 to 12 business days;
- urgent work: consult delivery time.

The 24–48 hour rule must not gain “hábiles” without a later decision.

These rules are not a universal runtime promise yet. Future architecture must
support `default_rule`, `provider_override`, `family_override`, and
`product_override`, with scope, evidence, expiry, and exception conditions.

## 13. PERSONALIZATION PUBLIC / INTERNAL SEPARATION

The future public PDP must not make the following a dominant block:

- one ink;
- two inks;
- three-plus inks;
- full color;
- engraving;
- other internal production choices.

That intelligence remains in `product_personalization_capabilities`,
`product_print_profiles`, techniques, price books, tabulators, and quote
approval. Public presentation should be concise:

```text
Personalización disponible.
La técnica se confirma según producto, diseño y cantidad.
```

This wording is conditional and must not be used where the product has not
passed the relevant capability gate.

## 14. CATALOG CARD EXPERIENCE

Future card hierarchy:

1. approved image;
2. canonical name;
3. “Desde” price and IVA;
4. personalization exclusion;
5. MOQ;
6. variant count;
7. summarized availability;
8. one primary CTA.

The card should represent a model where appropriate, not every color as an
independent commercial product. The image must support scanning without
relegating the price and next decision below the fold.

## 15. PDP EXPERIENCE

The PDP is a commercial buybox, not a production specification sheet.

Desktop hierarchy:

1. name;
2. model/SKU;
3. short description;
4. price;
5. MOQ;
6. variant;
7. availability;
8. delivery;
9. quantity;
10. CTA.

Below the buybox: characteristics, specifications, colors, secondary images,
summarized personalization, and conditions.

## 16. MOBILE EXPERIENCE

Mobile-first order:

```text
image → name → price → MOQ → availability → delivery
→ variant → quantity → CTA → characteristics
```

Sticky actions must not conflict with WhatsApp, AssistantWidget, or other
floating controls. Touch targets, focus, labels, and error feedback remain
subject to the existing accessibility standards.

## 17. PUBLICATION GATE

At first, governance readiness is shadow/computed only. It does not modify
public visibility.

Required gates:

- `IDENTITY_PASS`
- `DATA_COMPLETENESS_PASS`
- `CONTENT_PASS`
- `IMAGE_PASS`

Derived runtime gates:

- `PRICING_PASS` from Pricing V2;
- `STOCK/PUBLIC_ELIGIBILITY` from the current runtime status contract.

Publication requires an explicit release decision. Governance never publishes
directly.

## 18. AI / PROVENANCE RULES

AI may extract, normalize, draft, and suggest. It may not invent technical
facts or claims.

Every suggestion retains source, source type, document, page, raw value,
normalized value, confidence, model/prompt version, reviewer, date, and review
status.

Suggested states:

`AUTO_EXTRACTED → AI_NORMALIZED → HUMAN_REVIEW_REQUIRED → APPROVED / REJECTED`.

Internal provenance, raw payloads, supplier identity, confidence, reviewer,
prompts, costs, and evidence are not public content.

## 19. MIGRATION STRATEGY

Do not rewrite the 1,139-product catalog blindly. Start with a read-only
snapshot and classify products as:

- `CANONICAL_READY`
- `NORMALIZATION_REQUIRED`
- `CONTENT_REQUIRED`
- `IMAGE_REVIEW_REQUIRED`
- `SOURCE_REQUIRED`
- `BLOCKED`

Migration order:

1. G4;
2. ForPromotional;
3. CDO/StockSur;
4. remaining providers.

Each phase must preserve current identity, stock, pricing, mappings,
categories, and public visibility until its own publication gate passes.

## 20. PROVIDER INGESTION STRATEGY

All sources use one governance contract. Provider-specific adapters may differ
in transport, but not in identity, provenance, QA, approval, or publication
rules.

Source priority is explicit per provider and may include web, API, feed, CSV,
Excel, PDF, ZIP, image bank, stock feed, and pricing feed. Unknown source
capabilities remain `NEEDS_VERIFICATION`.

## 21. G4 PILOT

G4 is the first provider pilot because its technical PDFs and image work expose
the required provenance, variant, visual, and content decisions.

The pilot should use 20–50 representative products, including PDF-rich items,
variant families, and image/content edge cases.

G4 Phase 3A image infrastructure is documented as closed in the current
baseline. G4 Phase 3B production image state is not demonstrated by the
current repository baseline and must not be declared complete from historical
reports alone.

## 22. FORPROMOTIONAL MIGRATION

ForPromotional follows the same model after the G4 pilot. Its existing source,
image-bank, offer, stock, pricing, and identity evidence must enter the shared
provenance and approval flow. No provider-specific public shortcut is allowed.

## 23. CDO / STOCKSUR MIGRATION

CDO/StockSur ZIPs are not ingested by this directive. When authorized, they use
the same raw, normalization, asset, approval, and publication contracts. A new
parallel pipeline is not permitted.

## 24. QA / ACCEPTANCE CRITERIA

Each pilot or build must demonstrate:

- identity traceability to provider/SKU;
- raw source preservation;
- field-level provenance;
- family-appropriate completeness;
- technical image QA;
- visual-commercial image QA;
- rights status;
- human approval audit trail;
- no unsupported claims;
- no accidental public publication;
- no stock, pricing, mapping, category, or scheduler regression;
- idempotent and reversible projection behavior when projection is later authorized.

## 25. BUILD PLAN

```text
CHK-CATGOV-00 — ARCHITECTURE RECONCILIATION
BUILD 1 — Shadow Governance Foundation
BUILD 2 — Catalog Governance Console READ-ONLY
BUILD 3 — G4 Pilot / Shadow
BUILD 4 — Publication Integration, only after pilot PASS
G4 FULL
ForPromotional
CDO/StockSur
remaining catalog
```

No build is authorized by this document.

## 26. CHECKPOINTS

- `CHK-CATGOV-00` — Architecture Reconciliation
- `CHK-CATGOV-01` — Shadow Foundation
- `CHK-CATGOV-02` — Governance Console
- `CHK-CATGOV-03` — G4 Pilot Data
- `CHK-CATGOV-04` — G4 Pilot Visual
- `CHK-CATGOV-05` — Commercial Product Experience
- `CHK-CATGOV-06` — Publication Gate
- `CHK-CATGOV-07` — G4 Full
- `CHK-CATGOV-08` — ForPromotional
- `CHK-CATGOV-09` — CDO/StockSur
- `CHK-CATGOV-10` — Catalog Migration Complete

The next checkpoint is `CHK-CATGOV-00 — ARCHITECTURE RECONCILIATION`.

## 27. DO-NOT-TOUCH LIST

Until separately authorized, do not modify:

- `productos_b2b` identity or active semantics;
- stock tables, refresh runtime, cursors, locks, and schedulers;
- Pricing V2, price caches, margins, or provider costs;
- offer mappings and category authorities;
- `productos_publicos` visibility contract;
- `catalog_search_products_v2`;
- `catalog-product-images` runtime policies;
- `catalog-image-admin` behavior;
- frontend cards or PDP;
- CRM, email, WhatsApp, or production;
- G4/ForPromotional/CDO assets or references without their own checkpoint.

## CURRENT STATUS

```text
CATALOG GOVERNANCE / PRODUCT EXPERIENCE:
DOCUMENTATION FOUNDATION / ARCHITECTURE DESIGN

PUBLIC IMPLEMENTATION: BLOCKED
GOVERNANCE BUILD: NOT STARTED
PRODUCT EXPERIENCE BUILD: NOT STARTED
G4_PHASE3B_RUNTIME_STATE: RECONCILIATION_REQUIRED
```
