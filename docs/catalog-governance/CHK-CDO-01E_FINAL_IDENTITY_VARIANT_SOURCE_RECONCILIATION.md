# CHK-CDO-01E — Final Identity / Variant Source Reconciliation

**Date:** 2026-10-13
**Scope:** CDO / StockSur, exactly the five post-visual remediation cases
**Mode:** analytical/documentation only

## Boundary and evidence standard

This checkpoint reconciles existing repository evidence only. It does not
create live variants, modify Supabase, change runtime/provider tables, publish
assets, select a public master, or set `MASTER_APPROVED`.

The evidence was evaluated in this order: canonical analytical CSVs, human
review ledgers, EX01/EX02 decisions, preserved source filenames and archives,
SHA relationships, same-model variant evidence, and candidate roles. A source
filename is evidence of a source literal and relationship, not proof of a
public SKU, rights clearance, or availability.

## Result summary

| Provider/model | Original issue | Proposed analytical result | Final analytical status |
|---|---|---|---|
| EC742 | `asset-relationship::unresolved` | No canonical reassignment; retain historical unresolved key | `NEEDS_PROVIDER_EVIDENCE` |
| T575 | `asset-relationship::unresolved` | `color::cobre` + `color::negro`, with generic primary relation still open | `PARTIALLY_RESOLVED` |
| T622 | `asset-relationship::unresolved` | `color::negro` + `color::rojo` | `RESOLVED_FROM_EXISTING_EVIDENCE` |
| BP254 | `asset-relationship::unresolved` | `color::plata+negro` + `color::grafito`; preserve `color::plata` | `RESOLVED_FROM_EXISTING_EVIDENCE` |
| T625 | `color::negro` | `color::negro+cobre` + provisional `color::negro+plata` | `PARTIALLY_RESOLVED` |

**Totals:** 2 resolved from existing evidence; 2 partially resolved; 1
requires provider evidence. `MASTER_APPROVED = 0` for all five and for the
CDO scope.

## Case 1 — EC742

### Original issue

`CDO_STOCKSUR_SOURCE::model::ec742::variant::asset-relationship::unresolved`.
EX01 recorded `NEEDS_SOURCE_EVIDENCE` after two primary candidates failed to
establish a single exact commercial color/variant relationship.

### Evidence examined

The canonical candidate summary and EX01 decision contain these primary
candidates:

- `EC2/EC742/EC742 cerrado frente.jpg` — `EC2.zip` — SHA-256
  `4d591ce5e52c7bda463c905385fd23ac089725c0049f31c83b941a44d28d4d03`.
- `EC2/EC742/alt=promocional_publicitario_organizador_cables_EC742_celeste_cerrado_frente.jpg`
  — `EC2.zip` — SHA-256
  `4f98c71dd465eb794a1f215ea840c03d750447cadfec0fb66f908d290d5eaef4`.

The same-model explicit source set contains:

- `EC2/EC742/alt=promocional_publicitario_organizador_cables_EC742_azul_cerrado_frente.jpg`
  — SHA-256 `a6a851b307e71b9c9408efd966264900ccc7dda5c79bb24d376fbf04ed3824a1`.
- `EC2/EC742/alt=promocional_publicitario_organizador_cables_EC742_gris_oscuro_cerrado_frente.jpg`
  — SHA-256 `c5f25c6c5786eea4d1d446819588529d5abc8922025be481f787bc08f67de424`.
- `EC2/EC742/alt=promocional_publicitario_organizador_cables_EC742_rosa_cerrado_frente.jpg`
  — SHA-256 `1ea5915bb349ff86590cadb893d4b23629fbbbc73540d0403ede2988ff5f3e0c`.

The matrix also records a `cyan` candidate, while the preserved source
filename says `celeste`. That vocabulary difference is not enough to equate
the candidates or create a canonical variant.

### Reconciliation

The generic filename does not identify a color. The `celeste` filename is a
literal color clue, but the existing evidence does not establish whether it is
an alias of the matrix `cyan`, a distinct commercial variant, or an alternate
view of a provider variant already represented by `azul`, `gris`, or `rosa`.
There is no exact source-SKU or provider alias in the repository that closes
that relationship.

**Proposed normalization:** none; preserve the historical unresolved key.
**Provider literal:** `EC742`.
**Sufficiency:** insufficient for canonical reassignment.
**Final status:** `NEEDS_PROVIDER_EVIDENCE`.
**Next action:** `CHK-CDO-01E2` must ask only whether the generic and celeste
candidates map to an existing color/variant or to a distinct commercial
variant.

## Case 2 — T575

### Original issue

`CDO_STOCKSUR_SOURCE::model::t575::variant::asset-relationship::unresolved`.
EX01 preserved two materially distinct candidates, `cobre` and `negro`, and
the source matrix already lists `azul`, `blanco`, `negro`, and `rojo` as model
variant evidence.

### Evidence examined

- `ttt2/tt3/T575/T575 cobre frente.jpg` — `ttt2.zip` — SHA-256
  `4aa27c9dcd4027a63135ab94ec16392059705fd329fbca79190d5508787483e7` —
  `PRIMARY_CANDIDATE` in the unresolved EX01 relationship.
- `ttt2/tt3/T575/T575 frente.jpg` — `ttt2.zip` — SHA-256
  `11ed25a9afc460ba36b70397e2bb4b36bae7b41015b04962dcc39b3e8b5a6ed4` —
  `PRIMARY_CANDIDATE`, but generic and not explicitly keyed to negro.
- `T21/tt2/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo_le.jpg`
  — `T21.zip` — SHA-256
  `2630d0b37fdf02a47efdd4621c9f75ad60419bcd6cf99725b200b64c0d7188f5` —
  controlled source-bank black literal, alternate/logo view.
- `ttt2/tt3/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo.jpg`
  — `ttt2.zip` — SHA-256
  `75035482fe30145e7fdd7fc975319897987fa57e6fccc6b2b168f9f5c58e05b7` —
  controlled source-bank black literal, alternate/logo view.
- Existing explicit primary references: `T575-azul-frente.jpg` — SHA-256
  `ce8b4b6ac110c2c7bbf89a6f1a4f8a55f831aad5adcaa5f7e92f352bc25f1777`;
  `T575 blanco frente.jpg` — SHA-256
  `11aaeb901043455bccfd7d8e17cbda59eaa8aaf332e9d2f2b678c9177a94bd2c`;
  `T575 rojo frente.jpg` — SHA-256
  `0e36b1d5b8edeaf559d20b33cec1d014fee15b7ca62f2f29208102f10c5cd919`.

### Reconciliation

The copper candidate is an exact primary source literal. Black is independently
represented by controlled source-bank filenames, but those black files are
alternate/logo assets, while the unresolved black-side primary candidate is
the generic `T575 frente.jpg`. Existing evidence therefore supports the
analytical split but does not prove that the generic primary is the same
commercial black variant.

**Proposed normalization:** `color::cobre` and `color::negro`, analytical only.
**Provider literal:** `T575`.
**Sufficiency:** copper is resolved; black-side primary relationship remains
open.
**Final status:** `PARTIALLY_RESOLVED`.
**Next action:** `CHK-CDO-01E2` must confirm the SKU/variant relationship of
generic `T575 frente.jpg` to the black source literals.

## Case 3 — T622

### Original issue

`CDO_STOCKSUR_SOURCE::model::t622::variant::asset-relationship::unresolved`.
EX01 preserved separate black and red candidates. EX02 independently selected
the green candidate and explicitly did not resolve this unresolved relation.

### Evidence examined

- `T21/T622/alt=promocional_publicitario_botella_aluminio_T622_negra_frente.jpg`
  — `T21.zip` — SHA-256
  `ab5715fd6f54d9e171ebe37b4c3e552320206506870c04dbdb1be60e8c22e91a` —
  `PRIMARY_CANDIDATE`.
- `T21/T622/alt=promocional_publicitario_botella_aluminio_T622_roja_frente.jpg`
  — `T21.zip` — SHA-256
  `f03e5ed3c28d0247c3edab2598bce03ab4e86bfdaa3c2099d085cd8e7732d180` —
  `PRIMARY_CANDIDATE`.
- Existing explicit blue reference:
  `T21/T622/alt=promocional_publicitario_botella_T622_azul_frente.jpg` —
  SHA-256 `0f2b96fdc086defa13a0c4b612f25f8cf6a7313ecdb7e3dac4b4faea34ccf011`.
- Existing green evidence includes
  `T21/T622/alt=promocional_publicitario_botella_aluminio_T622_verde_frente.jpg`
  — SHA-256 `77bca8e7a0173af354385fbdfd65a5c41dfcd16fdccfc80e3186838946125466`
  and the alternate selected in EX02,
  `T21/T622/alt=promocional_publicitario_botella_T622_verde_frente.jpg` —
  SHA-256 `4ac4c311cf02206c134925b9205e72e3bbb224bbdcde1136b203b9e8e6a2b121`.

### Reconciliation

The black and red candidates have distinct color literals, distinct SHA-256
values, separate primary roles, and the same-model matrix lists both colors.
This is sufficient to preserve two separate analytical relationships. The
green decision remains independent and is not merged into either unresolved
candidate.

**Proposed normalization:** `color::negro` and `color::rojo`.
**Provider literal:** `T622`.
**Candidate relationship:** black primary and red primary remain separate;
the green primary/alternate relationship stays on `color::verde`.
**Sufficiency:** sufficient for analytical normalization, not for publication
or rights clearance.
**Final status:** `RESOLVED_FROM_EXISTING_EVIDENCE`.
**Next action:** `CHK-CDO-01F` may apply the analytical normalization only;
no live/public change is authorized by this checkpoint.

## Case 4 — BP254

### Original issue

`CDO_STOCKSUR_SOURCE::model::bp254::variant::asset-relationship::unresolved`.
EX01 preserved two reversed bicolor labels and a visually distinct grafito
candidate; it explicitly prohibited collapsing all three into `plata`.

### Evidence examined

- `BP/BP254/BP254 plata+negro frente.jpg` —
  `BP-20261009T225340Z-1-001.zip` — SHA-256
  `3f042c5e24ff9d299a468becec36e61afc1a7592d371e37f4f6ebce9bfc33401` —
  `PRIMARY_CANDIDATE`, 3000x3000 in the audit.
- `BP/BP254/BP254 negro+plata frente.jpg` — same archive — SHA-256
  `fb171c3a5c11e23ec57220be91c52b60a088041336fb7aca011d883d7d95eb89` —
  `PRIMARY_CANDIDATE`.
- `BP/BP254/BP254 grafito frente.jpg` — same archive — SHA-256
  `620842d094579ad41a3875ca472e18e903b6ba3ccc1e0909ed5d1a8c871d426b` —
  `PRIMARY_CANDIDATE`.
- Existing single-color reference:
  `BP/BP254/BP254 plata frente.jpg` — same archive — SHA-256
  `1123976294823a1b365107d6c3d6730a58e9f5b2a0fda3e9e7b330e5be5d5d61`.

### Reconciliation

`plata+negro` and `negro+plata` are two filename orderings for the same
semantic bicolor composition and are normalized to one stable order,
`plata+negro`. `grafito` is a separate literal and separate primary asset.
The existing single-color `plata` asset is preserved as its own relationship;
it is not collapsed into the bicolor relationship.

**Proposed normalization:** `color::plata+negro` and `color::grafito`; preserve
existing `color::plata`.
**Provider literal:** `BP254`.
**Candidate relationship:** A/B are one bicolor relationship; C is a separate
primary variant; the existing plata primary remains separate.
**Sufficiency:** sufficient for analytical normalization, not for publication
or rights clearance.
**Final status:** `RESOLVED_FROM_EXISTING_EVIDENCE`.
**Next action:** `CHK-CDO-01F` may apply semantic bicolor normalization
analytically and preserve the historical unresolved key.

## Case 5 — T625

### Original issue

Current key `CDO_STOCKSUR_SOURCE::model::t625::variant::color::negro`.
EX01 identified a black body with copper/gold lower finish, a black body with
silver lower finish, and a marketing asset corresponding to the copper/gold
finish.

### Evidence examined

- `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente.jpg` —
  `T22.zip` — SHA-256
  `9f32973b7e1ba19af6a002aa040769b274a909ab2c3e937b62f2d9f3935bac80` —
  `PRIMARY_CANDIDATE`.
- `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente_logo.jpg`
  — `T22.zip` — SHA-256
  `ae1d016e86f4e2fd5a497ad116a1b72377189659333e490f94946c3321a0770e` —
  `MARKETING_ASSET`, same copper-literal family.
- `T22/T625/alt=promocional_publicitario_mug_T625_negro_frente.jpg` —
  `T22.zip` — SHA-256
  `bd8f676059f7863e548245e562a37b28219a796fb5bc8d2133e663fe695dc8dd` —
  `PRIMARY_CANDIDATE`.
- The same source bank contains many additional `T625_negro_cobre_*` and
  `T625_negro_*` views, but no source filename or provider alias containing
  `plata` or `silver` for T625.
- Existing white reference:
  `T22/T625/alt=promocional_publicitario_mug_T625_blanco_frente.jpg` —
  SHA-256 `e6044bbbfa7030465783d7851cb341d3eee3efbfeb0e76a16106c790e9125b47`.

### Reconciliation

The copper finish is source-confirmed by repeated `negro_cobre` literals and
its primary/marketing relationship. The generic `negro` primary is source-
confirmed only as black, not as silver. EX01 visual evidence describes a
silver-base candidate, but the preserved source manifest contains no literal
silver/plata alias or exact provider relation that identifies it. The two
finish relationships therefore cannot safely be collapsed or split into a
public canonical variant yet.

**Proposed normalization:** `color::negro+cobre`; provisional
`color::negro+plata` only if the provider confirms the silver relation.
**Provider literal:** `T625`.
**Sufficiency:** copper is supported; silver/plata identity is not source-
confirmed.
**Final status:** `PARTIALLY_RESOLVED`.
**Next action:** `CHK-CDO-01E2` must confirm whether the generic/silver-base
candidate and the copper-base candidate share one provider SKU or are separate
variants/finishes.

## Governance boundary and next checkpoint

- Human review universe: **353/353 complete**; unreviewed: **0**.
- This reconciliation covers **exactly five** rows and introduces no new
  cases.
- Rights remain `PROVIDER_BANK_PROVENANCE_ONLY`.
- `MASTER_APPROVED = 0`; no publication or public projection follows from this
  report.
- Database, runtime, provider calls, Lovable, frontend, and publication
  changes: **0**.

Because EC742, T575, and T625 still have bounded unresolved facts, the next
checkpoint is:

**CHK-CDO-01E2 — MINIMAL PROVIDER EVIDENCE REQUEST**

The request must contain only these three products and facts:

1. **EC742:** confirm whether generic `EC742 cerrado frente.jpg` and
   `EC742_celeste_cerrado_frente.jpg` map to an existing color/variant or a
   distinct commercial variant.
2. **T575:** confirm whether generic primary `T575 frente.jpg` is the same
   commercial black variant represented by the two controlled black alternate
   filenames, or a different variant.
3. **T625:** confirm whether the generic/silver-base candidate and the
   `negro_cobre` candidate share one provider SKU or are separate finishes/
   variants.

T622 and BP254 do not need new provider questions for analytical normalization,
subject to the separate analytical-only CHK-CDO-01F. This checkpoint does not
execute either next step.
