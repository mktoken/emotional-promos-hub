# CHK-CATGOV-04I - G4 Geometric Apply Plan

Status: READY FOR CONTROLLED APPLY - NOT EXECUTED

## Scope

This plan records the human decisions from `CHK-CATGOV-04H_G4_GEOMETRIC_HUMAN_REVIEW_PACK.pdf`.
It covers 21 public products and 20 unique geometric assets. It does not reopen SOAP,
the parser, G4 sync, model governance, Pricing V2, stock, CDO, or 4Promotional.

| Decision | Products | Assets | Future action |
| --- | ---: | ---: | --- |
| `APPROVED_GEOMFIX` | 16 | 16 | Apply the existing candidate after live preflight |
| `PROVIDER_FALLBACK` | 5 | 4 | Keep the official G4 provider image as principal; do not apply candidate |

Approved geomfix SKUs:

`vas-nom-ve1`, `vas-nom-az1`, `cen-met-neg`, `moc-dia-azu`, `lib-ski-vec`,
`lob-sol-neg`, `imp-neg-cro`, `vas-nom-ro1`, `lob-sol-bla`, `lib-bor-azu`,
`jel-zen-ver`, `lib-pea-aob`, `spl-sol-azu`, `lon-del-gob`, `lob-sol-azu`,
`spl-sol-roj`.

Provider fallback SKUs:

`jbi-con-neg`, `jbi-con-azu`, `jbi-con-ros`, `jel-zen-aza`, `jel-zen-azu`.

The three `jbi-con` candidates are too thin/vertical for commercial master use.
The `jel-zen-aza` and `jel-zen-azu` candidates share one asset across two color
variants and are therefore not approved as a common master.

## Controlled apply order - future only

1. Apply the already approved model-governance/membership migration through the
   authorized runtime workflow.
2. Activate the model-level public projection.
3. Enable the required G4 memberships/defaults.
4. For the 16 approved SKUs, revalidate product identity, current live asset hash,
   candidate hash, and candidate provenance. Upload/apply only the matching geomfix.
5. For the 5 fallback SKUs, preserve or restore the official G4 provider image as
   principal. Do not upload or apply the rejected candidate.
6. Run the read-only postcheck.
7. Publish the frontend once, only after the postcheck passes.

## Required preflight gates

- The product id, SKU, model, and color must still match the manifest.
- The current live asset hash must still match the recorded asset before replacement.
- Every approved candidate must exist and match its recorded SHA-256.
- The authorized `catalog-image-admin` flow must report a successful preflight.
- Any mismatch, missing asset, identity drift, or partial failure is a STOP for that
  product only; do not force 16/16 or 21/21.
- No operation may change stock, pricing, mappings, categories, visibility, or
  unrelated products.

## Expected read-only postcheck

- G4 variants: 289.
- G4 model cards: approximately 104.
- Multivariate models: 53.
- The 21 affected products have no deformed master as principal.
- 16 products use the approved geomfix candidates.
- 5 products use the official G4 provider fallback.
- Variant selection preserves SKU, price, stock, MOQ, offer, and image.
- Pricing V2 is unchanged; CDO and 4Promotional are unaffected.

## Explicit non-actions in this checkpoint

No migration was applied. No upload, database write, image replacement, provider
call, Lovable operation, frontend publish, or runtime validation was executed.
