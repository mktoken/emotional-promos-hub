# Catalog Model / Variant Contract V1

## Purpose

Define one canonical vocabulary for product model identity, color/finish variants, and provider offers. This is a documentation contract only. It does not change runtime behavior, schema data, public catalog output, or provider integrations.

## Canonical levels

### Model

The stable underlying design/function family that a buyer would recognize as the same product concept. A model key is canonical governance data; it must not be derived by blindly stripping SKU suffixes.

### Variant

A governed, sellable difference within a model. Initial variant types are:

- `COLOR`
- `FINISH`
- `SIZE`
- `CAPACITY`
- `MATERIAL`
- `OTHER`

`variant_type` and `variant_value` are separate. A color token is not a model key.

### Provider offer

A provider-specific offer remains attached to the sellable product/variant. It carries the provider SKU and its own price, MOQ, stock, customization, and availability evidence. Provider offers may differ even when they belong to the same model.

## Grouping test

Use `MODEL_COMPATIBLE` only when current evidence supports the same design/function family and the observed difference is a governed variant attribute such as color or finish. If material, dimensions, capacity, function, or features may differ and the packet cannot resolve them, use `NEEDS_MORE_EVIDENCE`. Use `KEEP_SEPARATE` when identity evidence points to a different product or is unresolved.

Do not group on any one of the following alone:

- a shared prefix;
- a similar name;
- a similar image;
- a shared supplier;
- a shared price or MOQ;
- a shared category;
- a shared stock state.

## Provider-aware normalization

Every normalized row must retain:

```text
provider
provider_sku
base_model
variant_type
variant_value
source_evidence
normalization_status
```

The exact provider SKU is immutable evidence. Provider-specific token maps may be used only when documented by that provider's source evidence. Examples observed in the G4 pilot include `azu`/`azul`, `neg`/`negra`, `bla`/`blanco`, `ros`/`rosa`, `roj`/`rojo`, and `ver`/`verde`. `cro`/`plata` and `oro` are finish tokens in the Imperial family, not universal tokens for every provider.

Unknown, ambiguous, or conflicting values remain `NEEDS_MORE_EVIDENCE`; they are not silently normalized.

## Existing authority

Use the existing `catalog_product_models` and `catalog_product_model_members` authority defined by the catalog governance foundation. Do not introduce a parallel model table or a second membership authority.

- Model: `model_key`, canonical label, family key, lifecycle/review status.
- Membership: `model_id`, `producto_b2b_id`, optional `oferta_id`, `variant_label`, membership status, evidence, review metadata.
- Offer: remains in the existing provider-offer tables; model membership does not replace or merge offers.

The G4 05A pilot matrix is a proposed review artifact. It is not an insert package.

## Image roles

Image governance must distinguish:

- `MODEL_MASTER`: shared design representative;
- `VARIANT_MASTER`: exact variant/SKU representative;
- `MODEL_ALT`: alternate model view;
- `VARIANT_ALT`: alternate variant view;
- `DETAIL`: close-up/detail;
- `LIFESTYLE`: contextual view.

An approved model master cannot stand in for a missing or blocked variant master. Rights, provenance, identity, technical quality, and commercial visual fit remain independent gates.

## Future public projection

Once approved, a model-level card may expose variant selection. The selected variant must resolve its own provider SKU/offer, image, price, MOQ, stock/availability evidence, customization constraints, and any provider-specific wording. A model card must never imply that all variants share the same commercial terms.

The public projection remains outside this checkpoint. No `catalog_search_products_v2` change is authorized here.

## Evidence and approval statuses

Use the following distinctions:

- `FACT`: directly supported by a current source record;
- `INFERENCE`: a bounded design interpretation that still needs owner/governance confirmation;
- `HYPOTHESIS`: not suitable for catalog/public use.

For public use, the model and each member require the relevant identity, data, content, image, provenance/rights, commercial, stock, and publication gates. `PHASE_3_READY` is not equivalent to `PUBLIC_READY`.

## Cross-provider applicability

CDO, ForPromotional, StockSur, G4, and future providers must project into the same logical contract while preserving provider-specific source fields. The model authority is canonical; provider SKU is evidence; provider offer is commercial/runtime truth.
