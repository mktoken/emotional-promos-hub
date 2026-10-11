# CHK-CATGOV-04D — G4 Geometric Integrity Audit

**Mode:** read-only audit

**Baseline:** `d8a226587d97a6eb46b6c256474ae750c9ce5e68`

**Scope:** the frozen 20-product G4 pilot set currently recorded as
`PHASE_3_READY / NEEDS_REVIEW`.

**Runtime and governance changes:** 0

**Database writes:** 0

**Provider calls:** 0

**Image modifications:** 0

## Executive result

The geometric issue is not limited to the three previously observed human
review references. The same derived-file pattern is present in **20/20**
pilot products.

For every audited product:

- the provider original is available locally;
- the prepared Governance master candidate is a local WebP at `1600×1600`;
- the original has a non-square stored aspect ratio;
- a direct forced resize of the original to `1600×1600` is materially closer
  to the derived WebP than an aspect-preserving resize with white padding;
- the derived file therefore has evidence of anisotropic scaling, not merely a
  browser/PDF display artifact.

This audit does **not** approve, publish, integrate, or rewrite any asset.
All 20 Governance rows remain `PHASE_3_READY / NEEDS_REVIEW`.

## Decision rule audited

The proposed geometric gate was treated as an audit rule, not as a Governance
write:

`MASTER = TECHNICAL_PASS + GEOMETRIC_INTEGRITY_PASS + IDENTITY_PASS + VISUAL_COMMERCIAL_PASS + RIGHTS/PROVENANCE_ACCEPTABLE`

Geometric integrity requires preserved proportions. Proportional scaling and
padding are acceptable; forced square stretching or compression is not.

## Evidence sources

Only local evidence was used:

- original provider archives under `/Users/macbookpro/Downloads/G4_Image_Bank_2026`;
- derived candidates under `/Users/macbookpro/Downloads/G4_Web_Ready_2026`;
- `docs/brand-web/data/g4-web-assets-v1.csv`;
- `docs/brand-web/data/g4-image-manifest.csv`;
- `docs/catalog-governance/CHK-CATGOV-04A_G4_PILOT_REVIEW_MATRIX_V1.csv`;
- the five-product 04B evidence pack;
- the existing local 04C render builder and local frontend source.

No web request, provider call, Lovable operation, or runtime read was made.

The local manifest describes the derived files as aspect-preserving and
`object-contain` compatible, but direct file comparison does not support that
claim for this 20-product set. The manifest remains historical evidence; this
audit does not rewrite it.

## Static/rendering controls

The local 04C PDF builder uses proportional fitting with
`preserveAspectRatio=True`. The public catalog and PDP source use CSS
`object-contain` for product images (`src/components/CatalogView.tsx` and
`src/components/ProductDetailView.tsx`). Those paths do not explain the
observed deformation.

The pixel comparison was performed against the files themselves:

1. `FORCE`: source resized directly to `1600×1600`;
2. `CONTAIN`: source resized proportionally and centered on a white
   `1600×1600` canvas;
3. mean absolute error and RMSE were calculated against the prepared WebP.

All 20 products selected `FORCE` by a wide margin. Examples:

| SKU | force MAE | contain MAE | source AR | derived AR |
|---|---:|---:|---:|---:|
| `cen-met-neg` | 1.08 | 100.53 | 7.0184 | 1.0000 |
| `lob-sol-azu` | 0.65 | 63.62 | 7.5925 | 1.0000 |
| `vas-nom-az1` | 1.09 | 50.19 | 0.5410 | 1.0000 |
| `lon-del-gob` | 0.94 | 8.25 | 1.0526 | 1.0000 |

The three known human-review failures (`lob-sol-azu`, `cen-met-neg`, and
`vas-nom-az1`) are therefore confirmed as **actual derived-file geometry
issues**, not only presentation issues.

## Root-cause classification

**Overall classification: LIKELY.**

The output operation is strongly evidenced as a forced resize to a square
canvas. The exact generating script or pipeline file cannot be identified from
the repository: no image-preparation script is versioned there. Therefore the
operation is proven at the file-output level, while the exact producer location
remains undetermined.

### Per-layer conclusion

| Layer | Result | Evidence |
|---|---|---|
| Provider original | AVAILABLE / unchanged | Local archive members exist for all 20 rows. |
| Prepared candidate file | GEOMETRIC_FAIL | 20/20 derived files are square and match forced-resize output. |
| 04C PDF rendering | NOT THE CAUSE | Local builder preserves aspect ratio. |
| Public catalog/PDP rendering | NOT THE CAUSE | Local source uses `object-contain`. |
| Current runtime master | NOT_VERIFIED | The manifest says `NOT_INTEGRATED`; no runtime fetch was made. |

## Affected candidates and severity

All 20 local master candidates are affected. For triage only (not a
Governance decision), severity is based on the difference between the source
aspect ratio and the forced square output:

- **HIGH:** `12` products with source aspect ratio below `0.20` or above `5.00`;
- **MEDIUM:** `7` products with source aspect ratio between `0.20–0.80` or
  `1.25–5.00`;
- **LOW:** `1` product (`lon-del-gob`) with a near-square source and a smaller,
  but still non-zero, forced deformation.

The strict proposed rule still marks `lon-del-gob` as a geometry failure,
because its source was not square and the output was forced to square.

## Known human findings

These remain documentation-only findings and were not written back to the
04A/04B forms:

- `lob-sol-azu`: `NEEDS_CORRECTION` — long Lobby source compressed into a square
  candidate.
- `cen-met-neg`: `NEEDS_CORRECTION` — long Century source compressed into a
  square candidate.
- `vas-nom-az1`: `NEEDS_CORRECTION` — Vaso Nomi source widened into a square
  candidate.

No human approval was made for any product.

## Recommended controlled remediation

Do not modify these files in this checkpoint. The minimum safe next design is:

1. regenerate candidates from the unchanged provider originals using
   aspect-preserving scaling with padding or an original-aspect bounded output;
2. preserve the original product geometry and do not force a square canvas;
3. compute new hashes and dimensions;
4. rerun technical and identity checks;
5. perform a fresh visual-commercial and rights/provenance review;
6. update manifests only after the human gate authorizes it;
7. keep runtime/public integration disabled until the corrected candidates are
   explicitly approved.

This recommendation is not an implementation authorization.

## Full matrix

The complete 20-row matrix is versioned separately at:

`docs/catalog-governance/CHK-CATGOV-04D_G4_GEOMETRIC_INTEGRITY_MATRIX_V1.csv`

All rows carry `geometry_status=GEOMETRIC_FAIL`,
`distortion_type=ACTUAL_FILE`, `runtime_reference=NOT_VERIFIED`, and
`governance_state_unchanged=PHASE_3_READY / NEEDS_REVIEW`.

## Final gate

**ACTION REQUIRED**

The 20 local G4 master candidates should not be treated as geometrically
certified. The next step is a controlled remediation design for
aspect-preserving derivatives followed by human review. No runtime or
Governance decision was changed by this audit.
