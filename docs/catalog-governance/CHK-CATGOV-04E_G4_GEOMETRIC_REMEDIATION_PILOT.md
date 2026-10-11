# CHK-CATGOV-04E — G4 Geometric Remediation Pilot

**Mode:** local derivatives only / no DB / no runtime / no Lovable

**Baseline:** `05c40f4dce9262e6246aa82cebc7156d38e759e0`

## Scope

This pilot covers only:

1. `lob-sol-azu` — Lobby
2. `cen-met-neg` — Century
3. `vas-nom-az1` — Vaso Nomi

The three source originals were read from their authorized local provider ZIPs.
The previous Web Ready derivatives were read but not overwritten. No other 17
products were processed.

## Processing contract

The reproducible tool is:

`/Users/macbookpro/Projects/emotional-promos-hub/scripts/catalog-images/g4_geometric_remediation.py`

It is deterministic, local-only, and has no database, network, provider,
Supabase, Storage, or runtime dependency. It reads exact ZIP members, records
SHA-256 values, uses a new `__geomfix-v1.webp` name, and refuses to overwrite a
different existing output.

For each source:

- one scale factor is used for both axes;
- the scale is capped at `1.0` to enforce `NO_UPSCALE`;
- the product is resized proportionally to fit inside `1600×1600`;
- the rendered product is centered;
- white padding is used because these source images are opaque white-background
  product images;
- no crop, rotation, retouch, background removal, AI reconstruction, or
  generative fill is applied.

## Validation result

| SKU | Source original | Source immutable | Old derivative preserved | New candidate | Canvas | Proportional scale | Anisotropic resize | Upscale |
|---|---|---|---|---|---|---|---|---|
| `lob-sol-azu` | PASS | PASS | PASS | PASS | PASS | PASS | 0 | PASS |
| `cen-met-neg` | PASS | PASS | PASS | PASS | PASS | PASS | 0 | PASS |
| `vas-nom-az1` | PASS | PASS | PASS | PASS | PASS | PASS | 0 | PASS |

The intended `scale_x` and `scale_y` are exactly equal for all three rows. The
integer pixel dimensions of the rendered product can differ by one pixel after
rounding, without introducing an anisotropic transform.

### `lob-sol-azu`

- Source: `Boligrafos plastico.zip` / `Boligrafos plastico/lobby azul clip.jpg`
- Source SHA-256: `a3e4c33f3505b01a62645b8920512e13e9d066131b1fae3bbfd6523d00372e25`
- Source dimensions: `2012×265`, aspect `7.59245283`
- Old derivative: `lob-sol-azu/lob-sol-azu_master.webp`, SHA-256
  `b849d198375a283a19b8b88d53d4a6c0fb691c8e95e9e5d4b86327afd2ce6b6e`
- New candidate: `lob-sol-azu/lob-sol-azu__geomfix-v1.webp`
- New SHA-256: `3112401135ac076b5a66e1d7ef0196b2380990f0533bfe1a69888028a9f29a66`
- Rendered product: `1600×211`; padding `0 / 694 / 0 / 695` (L/T/R/B)
- Scale: `scale_x = scale_y = 0.7952286282306164`

### `cen-met-neg`

- Source: `Boligrafos metal.zip` / `Boligrafos metal/century negra costado.jpg`
- Source SHA-256: `9378298c7072397191a63fda57d64ede409a8e1e9a129d43f2e59c4a725f9c40`
- Source dimensions: `2674×381`, aspect `7.01837270`
- Old derivative: `cen-met-neg/cen-met-neg_master.webp`, SHA-256
  `9ea5a6af69d7ba0843e985493ebb47c678a0ad259822be070c70a967719208b8`
- New candidate: `cen-met-neg/cen-met-neg__geomfix-v1.webp`
- New SHA-256: `0f1a24aea8983e376fba44848a5a053aae3657f5da7bb971cd4ffbfcc6a9eedd`
- Rendered product: `1600×228`; padding `0 / 686 / 0 / 686` (L/T/R/B)
- Scale: `scale_x = scale_y = 0.5983545250560958`

### `vas-nom-az1`

- Source: `Bebidas y Alimentos.zip` / `Bebidas y Alimentos/Vaso Nomi Azul.jpg`
- Source SHA-256: `070cfe902ee48f1ad33b5d7655341367908056eaf4b9f7548e11e8d9bca6f9be`
- Source dimensions: `852×1575`, aspect `0.54095238`
- Old derivative: `vas-nom-az1/vas-nom-az1_master.webp`, SHA-256
  `501e6277cea23866a54886a2e97e899c74e20ead21a102e9e670f13b00bbe92a`
- New candidate: `vas-nom-az1/vas-nom-az1__geomfix-v1.webp`
- New SHA-256: `914e5ed7e3bc15448ae0ae8923bc07dad16bafaf49385db03a382bb3285ba06b`
- Rendered product: `852×1575`; padding `374 / 12 / 374 / 13` (L/T/R/B)
- Scale: `scale_x = scale_y = 1.0`; `NO_UPSCALE`

## Visual review artifact

The self-contained comparison pack is kept outside Git at:

`/Users/macbookpro/Downloads/G4_GEOMETRIC_REMEDIATION_PILOT_04E/CHK-CATGOV-04E_G4_GEOMETRIC_REVIEW_PACK.pdf`

It contains one page per product with:

- A. source original;
- B. old deformed derivative;
- C. new proportional candidate;
- `object-fit: contain`-equivalent proportional panel fitting;
- technical status and blank human-review fields.

The PDF was rendered and visually checked at three pages. It does not mark
identity, visual-commercial, rights/provenance, or final approval as passed.

## Human gate

For all three products:

- `GEOMETRIC INTEGRITY`: `TECHNICALLY_VERIFIED`
- `IDENTITY`: `PENDING HUMAN REVIEW`
- `VISUAL COMMERCIAL`: `PENDING HUMAN REVIEW`
- `RIGHTS / PROVENANCE`: `PENDING`
- `FINAL HUMAN DECISION`: `PENDING`

Technical geometry is not approval. The new candidates remain local evidence
only and are not Governance masters, public assets, or runtime references.

## CDO / StockSur safety requirement

This checkpoint documents the future pipeline requirement:

> No master candidate may receive `TECHNICAL_PASS` unless
> `GEOMETRIC_INTEGRITY_PASS = true`.

Any square catalog conversion must use proportional contain/padding. Forced
width-and-height resizing is prohibited. No CDO image was processed here.

## Change boundaries

- Database changes: `0`
- Governance writes: `0`
- Approvals: `0`
- Issues: `0`
- Runtime changes: `0`
- Storage uploads: `0`
- Existing images overwritten: `0`
- Lovable: `0`
- Provider calls: `0`
- Source files modified: `0`
- Old derivatives modified: `0`
- New local derivatives: `3`

## Final

**CHK-CATGOV-04E — G4 GEOMETRIC REMEDIATION PILOT: PASS**

Next action: human visual review of the three corrected candidates. Do not
scale this method to the other 17 products until that review passes.
