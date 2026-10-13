# CHK-CDO-01G — StockSur Rights / Publication Readiness

**Date:** 2026-10-13
**Status:** `BLOCKED_PENDING_CONFIRMATION`
**Scope:** CDO / StockSur product photographs and related presentation assets.

## Current status

- Human review: **353 / 353 complete**.
- Identity/source remediation: **complete**; open identity/source cases: **0**.
- Provider evidence cases: **0 open**.
- Current rights state before this gate: `PROVIDER_BANK_PROVENANCE_ONLY`.
- `MASTER_APPROVED`: **0**.
- Publication: **NO**.
- No database, governance-live, runtime, frontend, Lovable, provider-contact, or publication action occurred.

## Evidence reviewed

### Existing project evidence

- `docs/catalog-governance/CHK-CDO-01D_CDO_HUMAN_REVIEW_CERTIFICATION.md` records the 353 visual decisions as `PROVIDER_BANK_PROVENANCE_ONLY` and explicitly keeps rights clearance separate from visual review.
- `docs/catalog-governance/CHK-CDO-01E2C_FINAL_IDENTITY_REMEDIATION_CLOSURE.md` records identity/variant closure while keeping rights, final master approval, and publication open.
- `docs/catalog-governance/CHK-CDO-01F_CANONICAL_ANALYTICAL_NORMALIZATION.md` records `MASTER_APPROVED = 0`, `publication = NO`, and `rights_status = PROVIDER_BANK_PROVENANCE_ONLY`.
- No agreement, contract, written authorization, or project decision was found that expressly grants PE/UNIONIZE permission to reuse StockSur photographs in its own website, digital catalog, presentations, or advertising.

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
- No current evidence establishes permission for PE/UNIONIZE to rehost or publish the provider photographs in a commercial website, digital catalog/presentation, or advertising used to sell StockSur products.
- No explicit provider prohibition was found in the reviewed sources; the blocker is the absence of affirmative permission, not a proven prohibition.

## Rights classification

`RIGHTS_NOT_EXPLICITLY_ESTABLISHED`

This is a rights-evidence result, not a statement that use is prohibited. The evidence supports provenance and a distributor channel, but not the requested downstream publication rights.

## Publication gate

`BLOCKED_PENDING_CONFIRMATION`

Do not publish StockSur images, rehost them, or mark individual assets `MASTER_APPROVED` until StockSur or an applicable governing agreement confirms the permitted scope and any attribution or other restrictions.

## Exact residual gap

A concise affirmative confirmation is missing for this exact question: whether an authorized StockSur customer/distributor, specifically UNIONIZE / Promocionales Emocionales, may use photographs downloaded from the StockSur portal on its commercial website, digital catalog/presentations, and advertising used to promote and sell StockSur products, and whether attribution or other restrictions apply.

## Recommended next action

Obtain owner approval before sending the prepared request in:
`docs/catalog-governance/CHK-CDO-01G_STOCKSUR_RIGHTS_CONFIRMATION_REQUEST_ES.md`.

After a response is received, register it in a separate evidence checkpoint. Do not execute the next checkpoint automatically.

## Scope counters

| Surface | Changes |
|---|---:|
| Database / governance live | 0 |
| Runtime / Edge Functions | 0 |
| Frontend / Lovable | 0 |
| Provider contact | 0 |
| Publication | 0 |
| `MASTER_APPROVED` | 0 |
