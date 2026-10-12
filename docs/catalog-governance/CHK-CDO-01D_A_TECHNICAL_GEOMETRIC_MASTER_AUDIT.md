# CHK-CDO-01D-A-R1 — CDO / StockSur technical, geometric, identity and visual master-candidate audit

**Scope:** exactly the 328 models classified in CHK-CDO-01C as `READY_FOR_ASSET_REVIEW`. No blocked model entered this audit. No image is approved, published or projected to runtime.

## Source and integrity

- Verified transfer package: `CDO_StockSur_READY_ASSET_TRANSFER_v2`, 13/13 package files accessible.
- Asset relationships audited: **1615**.
- Unique source assets audited: **1609**.
- Local SHA-256 recheck: **1609/1609 PASS**.
- Decodable images: **1609/1609 PASS**.
- Source archives: **22**.
- Raw source images remain outside Git.

Required source ZIP names:

`Archivo(1).zip`, `BP-20261009T225340Z-1-001.zip`, `EC1.zip`, `EC2.zip`, `G-20261009T225541Z-1-001(1).zip`, `GATO-20261009T225629Z-1-001(1).zip`, `GG1.zip`, `GG2.zip`, `S-20261009T225721Z-1-001(1).zip`, `T21.zip`, `T22.zip`, `T23.zip`, `T24.zip`, `T25.zip`, `U-20261009T225750Z-1-001(1).zip`, `cc1.zip`, `cc2.zip`, `cc3.zip`, `tt5.zip`, `ttt1.zip`, `ttt2.zip`, `tttt1.zip`.

## Technical screening

- Unique-source technical screening: `TECHNICAL_PASS` 1608; `TECHNICAL_WEAK` 1; `TECHNICAL_FAIL` 0.
- Relationship-level projection: 1614 pass relationships and 1 weak relationship.
- Formats: 1607 JPG, 2 PNG.
- Every unique-asset row records bytes, dimensions, aspect ratio, alpha and decode status. Technical pass is not visual approval.

## Candidate state

- Variant rows: **969** (expected 969).
- `MASTER_CANDIDATE_READY_FOR_VISUAL_REVIEW`: **353** variants.
- `NO_VALID_PRIMARY_CANDIDATE`: **616** variants.
- Human visual decisions: **0**.
- All `public_runtime_status` values remain `NOT_CERTIFIED`.
- All provenance is recorded as `PROVIDER_BANK_PROVENANCE`; rights clearance is not inferred.
- Geometry, identity, visual-commercial and rights acceptance remain human gates. First pack: 20 decisions.

## Relationship role counts

- `ALTERNATE_VIEW`: 69
- `LOW_INFORMATION`: 1059
- `MARKETING_ASSET`: 87
- `PACKAGING_VIEW`: 15
- `PRIMARY_CANDIDATE`: 385

## Derived files

- `data/cdo-asset-master-audit-v1.csv` — 1609 unique asset rows; 1615 relationships are retained as counts/linked keys.
- `data/cdo-master-candidate-summary-v1.csv` — 969 variant rows.
- `data/cdo-visual-master-review-queue-v1.csv` — 969 human-decision rows.
- `data/cdo-visual-review-pack-plan-v1.csv` — 20 first-pack rows.
- Temporary visual pack: `/private/tmp/cdo-r1.R0lWW8/review-pack/CHK-CDO-01D-A-R1_visual-review-pack-01.jpg`; it embeds source imagery and is intentionally not committed.

## Decision boundary

This checkpoint produces only `MASTER_CANDIDATE_READY_FOR_VISUAL_REVIEW` or review/block states. It never produces `MASTER_APPROVED`, does not alter normalization, does not create a Governance seed, and does not modify runtime/public catalog data.
