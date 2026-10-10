# G4 Image Manifest — Phase 2

## CP-3 P1-C — Visual selection and Web optimization

Status: `PARTIAL — VISUAL REVIEW REQUIRED`

This document records the controlled Phase 2 preparation of the G4 visual
bank. It does not certify runtime publication, product availability, pricing,
SKU reconciliation, or catalog integration.

## Scope and inputs

- Frozen public input: `PUBLIC_G4_SNAPSHOT_281`.
- Phase 2 eligible identities: `134`.
- Certified exact bank matches: `106`.
- Certified multi-variant matches requiring visual review: `28`.
- Unresolved bank-match identities deferred from this phase: `147`.
- Source ZIPs: `/Users/macbookpro/Downloads/G4_Image_Bank_2026`.
- Source ZIPs were read only and were not renamed, edited, or repackaged.

## Selection result

| Metric | Result |
|---|---:|
| Public Phase 2 input | 134 |
| Products reviewed | 134 |
| MASTER_APPROVED | 106 |
| MASTER_REVIEW_REQUIRED | 28 |
| NO_VALID_MASTER | 0 |
| PHASE_3_READY | 106 |
| VISUAL_REVIEW_REQUIRED | 28 |
| Home category candidates | 0 certified candidates |
| Executive strong candidates | 0 certified candidates |
| Executive possible candidates | 48 certified candidates |
| Multi-variant products reviewed | 28 |

The 106 exact certified matches received one `MASTER` derivative. Where an
additional certified source view was available, it received the
`SECONDARY_1` role, producing 94 secondary derivatives. The 28 multi-variant
identities remain `MASTER_REVIEW_REQUIRED`; no generic or technically similar
image was promoted to a SKU-specific public master.

## Selection rules

The selected source view prioritizes product identity, completeness, usable
front/perspective/hero presentation, adequate source dimensions, and a crop
compatible with the existing square catalog/PDP containers. The frontend
continues to use `object-contain`; no image was distorted or converted into a
catalog card treatment.

Rights remain inherited from the certified G4 bank evidence. A visual master
is not, by itself, a declaration of stock, price, mapping, availability, or
public runtime eligibility.

## Web derivation policy

- Output format: WebP.
- Maximum derived dimensions: `1600 × 1600`.
- No upscaling.
- Aspect ratio preserved.
- Metadata stripped.
- Optimization quality target: WebP quality `88`.
- Public integration: `NOT_INTEGRATED`.

Derived output is local-only at:

`/Users/macbookpro/Downloads/G4_Web_Ready_2026`

The exact source-to-derived lineage, SHA-256, dimensions, byte size, role,
and non-integration status are recorded in:

`docs/brand-web/data/g4-web-assets-v1.csv`

## Derivation metrics

- Derived files: `200`.
- Masters: `106`.
- Secondary views: `94`.
- Source bytes represented by selected derivatives: `87,852,955`.
- Derived bytes: `17,318,808`.
- Byte reduction: `80.29%`.
- Master derived size: minimum `2,810` bytes; median `39,840` bytes; maximum
  `649,602` bytes.

## Public-truth boundaries

- `MAPPED PRODUCT` and `PUBLIC ELIGIBLE` remain distinct from visual approval.
- No database, runtime, provider, Supabase, or production writes were made.
- No provider was invoked.
- No frontend file was changed.
- No public image URL or catalog integration was published.
- `OFFER_WITHOUT_MAP` and runtime-only populations remain untouched.
- `LIVE_RUNTIME_PUBLIC_G4_COUNT` remains deferred for a later runtime
  revalidation gate.

## Phase outcome

Phase 2 is **PARTIAL**. The 106 exact certified products are ready for a
controlled Phase 3 integration review. The 28 certified multi-variant
products require explicit visual identity review before any master is locked.
The 147 unresolved bank-match identities remain deferred and are not silently
promoted.
