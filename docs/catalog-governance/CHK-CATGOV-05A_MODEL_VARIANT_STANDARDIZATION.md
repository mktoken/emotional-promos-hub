# CHK-CATGOV-05A — Catalog Model / Variant Standardization

**Mode:** read-only design + G4 pilot

**Baseline:** `4862282fcdaf44126d8ebc0a8b8a5db7b250436a`

**Runtime / database / publication changes:** 0

## Decision boundary

This checkpoint defines a model/variant contract and records a G4 pilot matrix. It does not create or update models, memberships, offers, product rows, images, stock, pricing, mappings, visibility, or public catalog output.

The following states remain distinct:

| State | Meaning | What it does not prove |
|---|---|---|
| `MODEL IDENTITY` | The underlying design/function family appears to be the same. | Public readiness, rights, stock, price, or a valid master for every variant. |
| `PUBLIC COMMERCIAL GROUPING` | A future UX may present variants under one model card. | That the grouping is approved for publication now. |
| `PROVIDER OFFER` | A provider-specific sellable offer, SKU, price, MOQ, stock, and customization context. | That the offer defines the canonical model. |
| `PHASE_3_READY` | An image-bank readiness state in the existing G4 manifest. | Human governance approval or public integration. |

`MODEL_COMPATIBLE` in this document is a design-pilot conclusion from the available family, SKU, color, and source evidence. It is not a `catalog_product_model_members` write and is not a public eligibility decision.

## Canonical architecture

```text
MODEL IDENTITY
  └── VARIANT (color / finish / other governed attribute)
        └── PROVIDER OFFER (provider SKU, price, MOQ, stock, customization)
```

The model is the canonical underlying product identity. A member is a sellable `producto_b2b` variant associated with a model. Offers remain attached to the sellable variant/product and are not collapsed merely because two SKUs share a model.

The existing shadow authority is sufficient for this design:

- `public.catalog_product_models` stores the model key, label, family key, status, and review metadata.
- `public.catalog_product_model_members` connects a `producto_b2b_id` (and, when needed, `oferta_id`) to a model with a variant label, membership status, evidence, and review metadata.
- The schema is defined in `supabase/migrations/20261010213800_catalog_governance_shadow_foundation_v1.sql`.
- Prior G4 pilot packages explicitly expected zero model and membership inserts; this checkpoint preserves that boundary.

## G4 pilot result

| Family | Current variant records | Proposed model key | Proposed model-level cards | Model decision | Future public grouping | Confidence |
|---|---:|---|---:|---|---|---|
| Lobby | 3 | `G4_LOBBY` | 1 | `MODEL_COMPATIBLE` | `ONE_MODEL_CARD` + variant-specific commercial logic | HIGH |
| Jello Colors Bio | 3 | `G4_JELLO_COLORS_BIO` | 1 | `MODEL_COMPATIBLE` | `ONE_MODEL_CARD` + variant-specific commercial logic | HIGH |
| Jello Zen | 2 | `G4_JELLO_ZEN` | 1 | `MODEL_COMPATIBLE` | `ONE_MODEL_CARD` + variant-specific commercial logic | HIGH |
| Vaso Nomi | 3 | `G4_VASO_NOMI` | 1 | `MODEL_COMPATIBLE` | `ONE_MODEL_CARD` + variant-specific commercial logic | HIGH |
| Splash | 2 | `G4_SPLASH` | 1 | `MODEL_COMPATIBLE` | `ONE_MODEL_CARD` + variant-specific commercial logic | HIGH |
| Imperial | 2 | `G4_IMPERIAL` | 1 | `MODEL_COMPATIBLE` | `PENDING` until the blocked gold variant clears its asset gate | MEDIUM |
| Libreta Border | 2 | `G4_LIBRETA_BORDER` | 1 | `MODEL_COMPATIBLE` | `PENDING` until the blocked gray variant clears its asset gate | MEDIUM |
| Koi | 1 | `G4_KOI_TRA_AMA` | 1 | `KEEP_SEPARATE` | `KEEP_SEPARATE` / `PENDING` | LOW |

**Pilot count:** 18 current variant records → 8 proposed model-level cards; projected reduction 10 records (55.56%). This is a design projection for the reviewed family set, not a runtime count and not a command to consolidate records.

### Family decisions

- **Lobby:** `lob-sol-azu`, `lob-sol-neg`, and `lob-sol-bla` share the exact normalized family name and the prior `G4_LOBBY` model candidate. The suffixes are governed color tokens, not a global suffix-strip rule.
- **Jello Colors Bio:** `jbi-con-azu`, `jbi-con-neg`, and `jbi-con-ros` have exact family names and exact color-bearing source filenames. The 04G recovery confirms same-model/color evidence; weak source resolution remains an image issue, not a reason to substitute another model.
- **Jello Zen:** `jel-zen-azu` and `jel-zen-ver` have exact family names and exact color-bearing source filenames. The 04G recovery confirms the sibling relationship while leaving source quality and rights gates separate.
- **Vaso Nomi:** `vas-nom-az1`, `vas-nom-ro1`, and `vas-nom-ve1` are certified as a multi-variant family with explicit filename color/model evidence.
- **Splash:** `spl-sol-azu` and `spl-sol-roj` are certified as a multi-variant family with explicit filename color/model evidence.
- **Imperial:** `imp-neg-cro` and `imp-neg-oro` share an exact certified bank family with multiple provider SKUs. The gold SKU remains `NO_VALID_MASTER`; that blocks public asset readiness, not the family-level model proposal.
- **Libreta Border:** `lib-bor-azu` and `lib-bor-gri` share an exact certified bank family with multiple provider SKUs. The gray SKU remains `NO_VALID_MASTER`; that blocks public asset readiness, not the family-level model proposal.
- **Koi:** `kbi-tra-ama` remains separate because the current evidence says `BANK_MATCH_REVIEW_REQUIRED` and no deterministic bank identity has been established. No sibling is inferred.

## Model compatibility rule

Two variants may share a model only when the evidence supports all of the following at the model-design level:

1. same design and function;
2. same dimensional/capacity family;
3. same material and core features, unless the difference is an explicitly governed finish or cosmetic attribute;
4. color, finish, or equivalent visual token is the only evidenced variant dimension; and
5. no contradictory provider or source evidence identifies a different product family.

The current G4 packet directly supports family/name/color relationships for the eight rows in the pilot decision table. It does **not** provide complete material, dimensions, capacity, feature, price, MOQ, stock, or customization evidence for every row. Those fields are therefore recorded as `NOT_VERIFIED` in the matrix and remain a pre-publication data gate.

`MODEL_COMPATIBLE` does not mean “same offer.” A model may contain variants with different provider SKUs, stock, prices, MOQs, personalization constraints, or active offers. Those differences must remain variant/offer-specific.

## Provider-aware SKU normalization

Provider SKU is preserved exactly as received. Normalization is a governed projection:

1. retain the full provider SKU and source name;
2. identify a base model only from exact canonical family evidence, not from string similarity alone;
3. map a variant token only when the provider-specific evidence supports it (`azu`/`azul`, `neg`/`negra`, `bla`/`blanco`, `ros`/`rosa`, `roj`/`rojo`, `ver`/`verde`, `oro`, `cro`/`plata` as applicable);
4. do not strip suffixes globally across providers;
5. preserve ambiguous or unsupported tokens as `NEEDS_MORE_EVIDENCE`;
6. require human confirmation before any membership status becomes `CONFIRMED`.

For CDO, ForPromotional, StockSur, and future providers, the contract is the same in shape but not in token vocabulary: `provider_sku`, `base_model`, `variant_type`, and `variant_value` must remain separate fields. No provider normalization is implemented in this checkpoint.

## Commercial behavior required by a future model-level catalog

A future model card may expose a variant selector. Selecting a variant must resolve the exact sellable context:

- provider SKU and offer;
- color/finish or other governed variant value;
- image set appropriate to that variant;
- current price and MOQ;
- current stock/availability evidence;
- personalization/customization constraints;
- any provider-specific qualification or lead-time wording.

The future `catalog_search_products_v2` projection may operate at model level only after the underlying memberships, readiness, assets, and commercial logic are approved. This checkpoint does not modify that function or the public UX.

## Image governance under a model/variant architecture

The image roles are separate:

- `MODEL_MASTER`: representative image for the shared design family;
- `VARIANT_MASTER`: exact color/finish/SKU image;
- `MODEL_ALT`: alternate view of the shared design;
- `VARIANT_ALT`: alternate view tied to one variant;
- `DETAIL`: close-up or detail view;
- `LIFESTYLE`: contextual use image.

A valid `MODEL_MASTER` does not prove that every `VARIANT_MASTER` exists, is correctly identified, has acceptable geometry, or has cleared rights. The existing G4 manifest retains those gates. In particular, `imp-neg-oro` and `lib-bor-gri` remain blocked as exact assets and are not made public by this model proposal.

## Evidence register

| Evidence | Finding | Status |
|---|---|---|
| `docs/brand-web/data/g4-image-manifest.csv` | Exact provider SKU, `producto_b2b_id`, family/name and existing identity/phase status for the pilot rows. | `VERIFIED` for recorded identity scope |
| `docs/brand-web/data/g4-web-assets-v1.csv` | Derived asset roles, hashes, source members, and inherited bank rights status for available assets. | `VERIFIED` as an asset register; not rights clearance |
| `docs/catalog-governance/CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md` | Five prior G4 model candidates and exact member IDs; model/membership inserts were 0. | `VERIFIED` as prior design evidence |
| `docs/catalog-governance/CHK-CATGOV-04D_G4_GEOMETRIC_INTEGRITY_MATRIX_V1.csv` | Source geometry and prior asset quality findings. | `VERIFIED` as image-quality evidence only |
| `docs/catalog-governance/CHK-CATGOV-04G_G4_JELLO_SOURCE_RECOVERY.md` | Exact Jello sibling source evidence; no substitution of near-name variants. | `VERIFIED` for Jello source relationships |
| `supabase/migrations/20261010213800_catalog_governance_shadow_foundation_v1.sql` | Existing model/member authority and review statuses. | `VERIFIED` schema evidence |
| Material, dimensions, capacity, features, pricing, MOQ, stock, customization | Not complete in the authorized packet for all pilot rows. | `NEEDS VERIFICATION` |
| Rights / provenance | Existing image manifest carries inherited/pending bank status, not a new rights grant. | `NEEDS VERIFICATION` before publication |

## No-write boundary

| Surface | Change |
|---|---:|
| Database rows | 0 |
| `catalog_product_models` | 0 |
| `catalog_product_model_members` | 0 |
| Product / offer / mapping data | 0 |
| Stock / pricing / visibility | 0 |
| Runtime / frontend / public catalog | 0 |
| Provider calls / Supabase writes / Lovable actions | 0 |

## Recommendation

**GO for documentation-only model/variant design pilot.**

**NO-GO for runtime model writes, memberships, public catalog consolidation, or publication** until the `NEEDS VERIFICATION` fields and rights/readiness gates are closed per variant. The next safe step is a human-reviewed attribute evidence pass, followed by a separate approval checkpoint before any model/member records are created.

**Specialist verdict — PE Evidence & Claims:** the safe claim is “proposed model grouping supported by current family evidence.” Do not claim “single public product,” “same commercial offer,” “available in all colors,” or “rights cleared.”

**Specialist verdict — PE Visual & Image Director:** the grouping is visually coherent for the five exact multi-variant families and defensible at family level for Imperial/Libreta Border, but image roles and rights remain variant-specific gates. Koi must not be grouped without deterministic identity evidence.
