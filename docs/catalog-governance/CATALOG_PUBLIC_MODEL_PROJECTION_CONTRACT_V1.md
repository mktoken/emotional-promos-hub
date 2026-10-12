# Catalog Public Model Projection Contract V1

This is the compact cross-check for the 05D architecture. It is a contract
summary, not an implementation specification and not a public-catalog change.

## Public projection rule

```text
approved MODEL with >=1 eligible VARIANT
    → one MODEL result/card
    → exact VARIANT selector
    → provider OFFER selected by backend

no approved grouping
    → one PRODUCT_VARIANT result/card
```

The projection must never deduplicate by similar name alone, never turn a
candidate membership into publication, and never create a second price or stock
authority.

## Minimum model gate

`APPROVED` model + `CONFIRMED` membership + exact variant identity + approved
content + approved image/rights/provenance + current price/stock/quote gates +
no blocker + explicit versioned projection.

At least one eligible variant is sufficient for a potentially partial model,
but blocked variants remain excluded from the selector and remain visible to
Governance as blocked evidence.

## Commercial and visual rules

- Model-card price and MOQ come from the same eligible variant/offer tuple.
- The PDP resolves price, MOQ and stock for the selected exact variant.
- Default variant is human-defined; current schema has no explicit default.
- Image order is approved model master, approved default-variant master, then
  explicitly approved representative. No sibling substitution.
- Mixed providers remain separate offers under the same exact variant only when
  identity evidence proves equivalence.

## Current implementation delta

The current catalog still returns one row per `productos_publicos` product and
the current PDP is opened with `product=<uuid>`. Search does not yet index
model memberships or provider/variant SKU. Therefore the contract is defined,
but implementation remains the scope of 05E and later.

## Simulation

The read-only G4 simulation is in:

`docs/catalog-governance/CHK-CATGOV-05D_G4_PUBLIC_PROJECTION_SIMULATION_V1.csv`

It records 8 structural model candidates from 18 memberships, with readiness
separated from structural compression:

- `READY`: 0
- `PARTIAL`: 2
- `BLOCKED`: 5
- `INSUFFICIENT_EVIDENCE`: 1
- structural reduction: 18 → 8, or 10 cards / 55.56%

This does not alter the 18 existing public/product records and does not publish
any of the eight models.
