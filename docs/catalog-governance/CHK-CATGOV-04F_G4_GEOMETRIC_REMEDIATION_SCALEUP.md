# CHK-CATGOV-04F — G4 Geometric Remediation Scale-Up

**Mode:** local derivatives only / no DB / no runtime / no Lovable
**Baseline:** `a88cf1244dbfcc8c6751751ee4185d977644f682`
**Scope:** remaining 17 G4 products in the frozen 04D `PHASE_3_READY / NEEDS_REVIEW` set

## Result

The certified 04E proportional-contain pipeline was applied to exactly 17
remaining products. The three 04E pilot products were excluded from the
scale-up and retained as previously certified candidates. All 17 candidates
passed the automated geometric checks; no remediation exception was produced.

| Measure | Result |
|---|---:|
| 04D frozen products | 20 |
| 04E pilot products excluded | 3 |
| Scale-up targets | 17 |
| New corrected candidates | 17 |
| Corrected candidates including pilots | 20 |
| Geometric pass | 17/17 |
| Geometric fail | 0 |
| Remediation exceptions | 0 |
| Anisotropic outputs | 0 |
| Upscale outputs | 0 |

## Certified transformation

Tool: `scripts/catalog-images/g4_geometric_remediation.py`.

The bounded extension adds a `--scope scale-up` mode that reads the frozen
04D matrix, verifies 20 unique rows and the unchanged governance state,
excludes exactly the three pilot SKUs, and requires exactly 17 remaining
targets. The default `--scope pilot` behavior remains intact; rerunning it
produced the same three 04E candidate SHA-256 values.

Each candidate is generated from the authorized ZIP member, never from the
old derivative. The transform uses one scalar factor for both axes, capped at
`1.0`, proportional contain behavior, centered placement on a `1600x1600`
opaque-white canvas, and no crop, stretch, retouch, background removal,
generative fill, AI reconstruction, or forced upscale. The script fails closed
if the intended `scale_x` and `scale_y` differ beyond tolerance.

The one-pixel differences that can appear in diagnostic rounded pixel ratios
are integer rounding effects; the transform scale itself is a single shared
factor and is recorded in the matrix.

## Scale-up traceability

The complete 20-product matrix is versioned at:
`docs/catalog-governance/CHK-CATGOV-04F_G4_GEOMETRIC_REMEDIATION_MATRIX_V1.csv`.
The 17 scale-up rows are reproduced below for quick review. The matrix also
records product identity, source member, source hash/dimensions, old hash and
status, corrected candidate hash/dimensions, canvas, scale, padding, human
status, rights status, and unchanged Governance state.

| SKU | Source SHA-256 | Source | Old SHA-256 | Corrected SHA-256 | Padding L/T/R/B | Geometry |
|---|---|---:|---|---|---|---|
| `jbi-con-azu` | `6d8505d405585d6eecd70e87d9eacb91266cda38888ba3dea7e3f6178ce4b763` | 82x1047 | `42f16da57b5adfc1f0cb74fa144db73e090724dfe27564eb4bc912b56735b04a` | `b1f368b2d0940363d308e5fd180502fa9cc398737716e6051473b9f4dd30ea87` | 759/276/759/277 | PASS |
| `jbi-con-neg` | `7f64814ec5a07cf3d10605af83274d2c651e0a8ed25d190e57ac92edc991f556` | 82x1047 | `8a576934ce8609c31cd3c21d8c721b0c85eb31ee9d25cf132fbeb8f3e3d067c4` | `d7bffc0f047c9d5f223bc69b860a480a19b405273282879ddaba7984aca50ddc` | 759/276/759/277 | PASS |
| `jbi-con-ros` | `9975523192c3299be2c062c66a3f53f46a1eabe22b5eeb931c386d827cec6cb4` | 63x629 | `b3e3616f28efed436fad6bd220d2ec108ee6ff73988b1227d26fb57d324dadf6` | `511a5c696237f859c7cd1de7fe3cc0cdcacc06106ad6d0d0d512d0395d5ad221` | 768/485/769/486 | PASS |
| `jel-zen-azu` | `9f6e5bd8b000cf2fd81275ba29174b40dea6047e15ce050c473b5a523822ff1c` | 1181x83 | `62ad2450ad92327d7dbbf3daf9e3582179996acc9dd7fc07abd98966493f4c3c` | `a11dd894987709b9ea9ab1ec931cfc7b7aabf8c2b47172cb7b25b2c0d0e1874d` | 209/758/210/759 | PASS |
| `jel-zen-ver` | `052c96a9dab60ec8bd720de81138349e56ea0adcc5663a3838f260b2b7b4a41c` | 1181x83 | `3c15b0454a361be90b276d80c7e41d971e5826020a5f55e0f0f1be2b33aa23cf` | `7d694503731a9de5e44e9e45c1bda5d3e7d9556f70ca16bf79948d0667cdcc66` | 209/758/210/759 | PASS |
| `lib-bor-azu` | `b10341bebc3b209e8d31947e8306bba8e60f4890de7bbace110169a834e0f5a0` | 1571x2480 | `a8511c53b7c1657371e898e6995e3a5cb6c14bf01d5a78b8e7a95c083668ae4f` | `6ed75a9200e3de734a7e701192899c0fa1085be5ec71c95f7f32c242b686743b` | 293/0/293/0 | PASS |
| `lib-pea-aob` | `eaf4627e9398e219d7f76b1f1a6b9d43a7d836538ee8ad287e8195c2693d36a0` | 991x1575 | `49439f06cb83aede2b9f0da1ab2273bb7d5e8f951408fd5a1b616eef12aa8ce5` | `8c6288dd57f355f111d377a85e5c90d7831f034b1ce2b2cb21bd58a0bb1fee29` | 304/12/305/13 | PASS |
| `lib-ski-vec` | `81f009ed56837d73214781bf4c5342036b45338f706d133e99282b8001acbea8` | 631x1181 | `f52444d7b628cbdd319990edf42501a49e52979898597249d7fb9cc4583f225e` | `87945466b2593ec81c8b9b9c1609d15994927aa13d5a47ce7616b062da798088` | 484/209/485/210 | PASS |
| `lob-sol-bla` | `99097e6401c98245a516d941fc2e0733b24491858276b5cb3f6815921c4fbf10` | 1960x227 | `ed3a58b24ee991270af6a0f9ec4e503d8e4acb401d3c1371c4d52073edd14514` | `9535c544c8b85fdd4fc7d3da8efd3885a24bb326383d338157af8bdaacae89a3` | 0/707/0/708 | PASS |
| `lob-sol-neg` | `09c6d8f01cc94b8400bd738d173cda585426fe69e2b761959a75d20680eb1eb0` | 1942x238 | `07fe117fe1b8b8118da9b093c7fc4ac4b5c01a671310c4fe7d0f5b6970d26d2e` | `a09dbebe4aab6a3953504c0c8efd42e7adaece73a7968a28b9b2c4386212e742` | 0/702/0/702 | PASS |
| `lon-del-gob` | `4b74f286ed707b818fe62fecb1d7291271668a25cfc9ef9b3391dd42b51b8675` | 1181x1122 | `2fc6d32fe72f14bd8bc444dfaebee409849b5b0e7b0f1005e08191583d75c6d9` | `6d3d9a8bfb2ac5f3cf516f8ee3b1d51892ede2b24f9121a770616915ff49d1cc` | 209/239/210/239 | PASS |
| `moc-dia-azu` | `86514f863b46b759b9674b653b3415382f1935e01bda86447dc91adb07fded1d` | 1181x1625 | `fabdffe5d887b6948e9d466f0aa42557ad18456bacd61a92137e69659e8a7cba` | `313db861902f3df70b5b4c2a9c46aca65da7510085f577f51061e50abae6aa47` | 218/0/219/0 | PASS |
| `imp-neg-cro` | `42e669e0d584a46776cc14234658f15ba534bb79bb8d28e270b24157944579f0` | 2438x230 | `936a3186deaf870b115c7a057ed66cf2c9198f5d92cf36e35aa762f8b5f3b3d5` | `ae60947a48b6f1afeb80bda04421491fbfe346c2effc966bc2a0aeb88d3b8631` | 0/724/0/725 | PASS |
| `spl-sol-azu` | `93a1d3b68e8847e20d164933c01266b35b167bc0f23ef076433ce223fe44b251` | 2572x496 | `d99604c33a6147c99015045ffa0fc450226d248334fae4275b200f92d43e162e` | `ea4cec15203216f8965b8635cc98302384a51df9379e0eee50761c91cfee17e4` | 0/645/0/646 | PASS |
| `spl-sol-roj` | `97354160aba167f20a7bb26354a3557b5fb3addf416f8639874bb6d270eaa065` | 2572x496 | `609784db451af9da33177b9aa5fed46bf029794e6a9086003fc1167fb26684c8` | `eb686d5854aa923871981353eb47671c2b0e8df6b83fbed263090689d957d94f` | 0/645/0/646 | PASS |
| `vas-nom-ro1` | `818f70e55ea5064b93e3365cbb5671e6e9551b01853b93b434980dcbc56e0af1` | 852x1575 | `e9a6a42913617e0ce80944770d1e3e2ad661331846ca7701909892a439706f99` | `03dd9a48b60d2f647b2f143cb5b31a6ce3a52bb22574182b17f6a73ed690c1e1` | 374/12/374/13 | PASS |
| `vas-nom-ve1` | `957bbac8a8e468c36b9d712dc1c1a8cd04b8efce8b242d80a171d81ad3f0d122` | 849x1575 | `74fa8be2ebc777116e76562e3c8819298b16b11397ecf9802ebfac8a1ea2ceaf` | `30eede756680b777290f2b4b0802311bebe2832aecea0a671a2c933cb437ec98` | 375/12/376/13 | PASS |

All source originals were read-only and all old derivatives were hash-checked
before and after generation. `old_derivative_status` is documentation-only:
`SUPERSEDED_GEOMETRICALLY_INVALID`. No old derivative was deleted or
overwritten.

## Visual review packs

The packs are external local artifacts; the binary imagery is intentionally
not committed to avoid repository bloat. Each pack uses aspect-preserving
panel fitting and shows source original, old derivative, and corrected
candidate. It makes no human approval decision.

- **Pack A (6 products):** `/Users/macbookpro/Downloads/G4_GEOMETRIC_REMEDIATION_04F/CHK-CATGOV-04F_G4_GEOMETRIC_REVIEW_PACK_A.pdf`
  - SHA-256: `a4b06dbc491e7451a54d97583d77a19c0eb60f535a9d10a11792f9e1e9eb2332`
  - Products: `jbi-con-azu`, `jbi-con-neg`, `jbi-con-ros`, `jel-zen-azu`, `jel-zen-ver`, `lib-bor-azu`
- **Pack B (6 products):** `/Users/macbookpro/Downloads/G4_GEOMETRIC_REMEDIATION_04F/CHK-CATGOV-04F_G4_GEOMETRIC_REVIEW_PACK_B.pdf`
  - SHA-256: `549a0b9b628a9837a7297fd2f55abae3a616afd166bcaaac2a7f66ba7ad25651`
  - Products: `lib-pea-aob`, `lib-ski-vec`, `lob-sol-bla`, `lob-sol-neg`, `lon-del-gob`, `moc-dia-azu`
- **Pack C (5 products):** `/Users/macbookpro/Downloads/G4_GEOMETRIC_REMEDIATION_04F/CHK-CATGOV-04F_G4_GEOMETRIC_REVIEW_PACK_C.pdf`
  - SHA-256: `ef538cbf93399d5eedbb17474e6d1498e41b78a7fe4f8b7de5aed29b6cdefbc7`
  - Products: `imp-neg-cro`, `spl-sol-azu`, `spl-sol-roj`, `vas-nom-ro1`, `vas-nom-ve1`

Review fields remain pending for the 17 scale-up products. The 04E pilot
products retain their prior human/visual calibration result in the consolidated
matrix. Rights/provenance remains a separate gate for all products.

## Governance boundaries

No `catalog_approvals`, `catalog_quality_issues`, `catalog_governance_state`,
or `audit_events` writes were made. The candidates are local evidence only and
are not runtime references, public assets, or approval decisions.

No database, storage, runtime, public catalog, frontend, scheduler, stock,
pricing, mapping, category, visibility, provider, or Lovable action was
performed. Source ZIPs and old derivatives remain unchanged.

## Prospective pipeline rule

For G4, CDO/StockSur, ForPromotional, and future providers, a candidate may
not become `MASTER_APPROVED` unless all of the following are separately
supported:

`TECHNICAL_PASS` + `GEOMETRIC_INTEGRITY_PASS` + `IDENTITY_PASS` +
`VISUAL_COMMERCIAL_PASS` + acceptable `RIGHTS / PROVENANCE`.

Any square output created by stretching source width and height is rejected.
This checkpoint processes G4 only and does not process CDO/StockSur or
ForPromotional assets.

## Accounting

| Boundary | Result |
|---|---:|
| Database changes | 0 |
| Governance changes | 0 |
| Runtime changes | 0 |
| Storage uploads | 0 |
| Public catalog changes | 0 |
| Source files modified | 0 |
| Old derivatives modified | 0 |
| Provider calls | 0 |
| Lovable actions | 0 |

## Final

**CHK-CATGOV-04F — G4 GEOMETRIC REMEDIATION SCALE-UP: PASS**

Next action: human visual review of the 17 corrected candidates. No candidate
is public-ready until the separate identity, visual-commercial, and
rights/provenance gates are decided.
