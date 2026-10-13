# CHK-CDO-01G — StockSur Rights / Publication Readiness

**Date:** 2026-10-13
**Status:** `PASS`
**Scope:** CDO / StockSur product photographs and related presentation assets.

## Current status

- Human review: **353 / 353 complete**.
- Identity/source remediation: **complete**; open identity/source cases: **0**.
- Provider evidence cases: **0 open**.
- Current rights state before this gate: `PROVIDER_BANK_PROVENANCE_ONLY`.
- Current rights state after the owner attestation: `RIGHTS_ACCEPTABLE_FOR_PUBLICATION`.
- `MASTER_APPROVED`: **0**.
- Publication: **NO**.
- No database, governance-live, runtime, frontend, Lovable, provider-contact, or publication action occurred.

## Business owner attestation

The project owner / responsible commercial user explicitly attests that
Promocionales Emocionales / UNIONIZE has no image-usage restriction problem
with its suppliers and may use supplier-provided product images commercially
for website publication, digital catalogs, commercial presentations, digital
advertising, and promotion and sale of supplier products, without additional
publication restrictions.

This is recorded as `BUSINESS_OWNER_RIGHTS_ATTESTATION`. It is the decisive
project authorization for this gate. It does not set `MASTER_APPROVED` and does
not itself publish any asset.

## Evidence reviewed

### Existing project evidence

- `docs/catalog-governance/CHK-CDO-01D_CDO_HUMAN_REVIEW_CERTIFICATION.md` records the 353 visual decisions as `PROVIDER_BANK_PROVENANCE_ONLY` and explicitly keeps rights clearance separate from visual review.
- `docs/catalog-governance/CHK-CDO-01E2C_FINAL_IDENTITY_REMEDIATION_CLOSURE.md` records identity/variant closure while keeping rights, final master approval, and publication open.
- `docs/catalog-governance/CHK-CDO-01F_CANONICAL_ANALYTICAL_NORMALIZATION.md` records `MASTER_APPROVED = 0`, `publication = NO`, and `rights_status = PROVIDER_BANK_PROVENANCE_ONLY`.
- Before CHK-CDO-01G2, no agreement, contract, written authorization, or
  project decision had been recorded that expressly granted PE/UNIONIZE
  permission to reuse StockSur photographs in its own website, digital catalog,
  presentations, or advertising.
- The current owner attestation is an explicit project authorization for those
  uses and supersedes the prior need for a separate StockSur confirmation within
  this project governance scope.

### Official StockSur source evidence

Reviewed on **2026-10-13**:

- [StockSur México home](https://mexico.stocksur.com/) states that StockSur works exclusively through official distributors and presents its product catalog. This supports the distribution-channel relationship; it does **not** grant a photo-reuse license.
- [StockSur México user access page](https://mexico.stocksur.com/users/sign_in) repeats that products are commercialized exclusively through official distributors. This is channel evidence, not an explicit authorization for downstream image publication.
- [StockSur México “Conoce Stocksur”](https://mexico.stocksur.com/mision-vision-valores) describes tools and services for commercial allies and the product catalog, but no explicit permission for distributors to copy, rehost, crop, resize, or publish product photographs was found in the reviewed page.
- [Official StockSur product page example](https://mexico.stocksur.com/products/g313-botella-frost-1000) demonstrates that product photography and promotional product information are presented on the official site. Public visibility of those assets is evidence of existence only, not proof of PE/UNIONIZE publication rights.

No official StockSur-controlled terms, legal notice, or image-use policy reviewed in this pass contained an explicit license for the requested uses. The authenticated portal was not independently inspected in this session, so portal behavior cannot be treated as evidence here.

## Provider portal functional evidence

The requested functional labels—download low/high-resolution photo, add to presentation, and apply logo—were not independently verified in an authenticated StockSur session during this checkpoint. If later verified, they may show intended distributor workflow, but they still require applicable terms or written confirmation before being treated as a publication right.

## Existing project evidence and restrictions

- Source-bank provenance is established for the reviewed assets.
- Visual identity and commercial suitability were reviewed separately from rights.
- Historical or unassigned assets remain non-publicable under the prior analytical decisions.
- The owner attestation now establishes project permission for PE/UNIONIZE to
  rehost and publish the provider photographs in those commercial surfaces.
- No explicit provider prohibition was found in the reviewed sources. The
  project authorization is recorded without claiming that it is a provider
  contract or a legal opinion.

## Rights classification

`RIGHTS_ACCEPTABLE_FOR_PUBLICATION`

The classification is based on the explicit business owner attestation,
provider-bank provenance, and official distributor-channel context.

## Publication gate

`PASS`

The rights blocker is closed for project governance purposes. This does not
approve individual masters, alter image roles, or authorize publication in this
checkpoint.

## Exact residual gap

A separate provider confirmation is not required under the current owner
attestation. If the owner later changes or narrows that authorization, this gate
must be reopened.

## Recommended next action

Proceed only to the separate master-certification checkpoint. Do not set
`MASTER_APPROVED` or publish assets automatically from this rights gate.

## Scope counters

| Surface | Changes |
|---|---:|
| Database / governance live | 0 |
| Runtime / Edge Functions | 0 |
| Frontend / Lovable | 0 |
| Provider contact | 0 |
| Publication | 0 |
| `MASTER_APPROVED` | 0 |
