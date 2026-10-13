# CHK-CDO-01E — Analytical Remediation Plan

**Status:** PLAN ONLY — no canonical or live changes executed
**Rights boundary:** `PROVIDER_BANK_PROVENANCE_ONLY`
**Public boundary:** `MASTER_APPROVED = 0`; no publication

This plan records future analytical key changes supported by the
CHK-CDO-01E reconciliation. It is not a migration, seed, provider update,
runtime update, or publication instruction. Every historical key must remain
queryable and auditable after a future implementation.

## Planned analytical changes

| Model | Current variant key | Proposed analytical key | Provider literal | Gate |
|---|---|---|---|---|
| T622 | `...::variant::asset-relationship::unresolved` | `...::variant::color::negro` | `T622` | Existing evidence sufficient; CHK-CDO-01F only |
| T622 | `...::variant::asset-relationship::unresolved` | `...::variant::color::rojo` | `T622` | Existing evidence sufficient; CHK-CDO-01F only |
| BP254 | `...::variant::asset-relationship::unresolved` | `...::variant::color::plata+negro` | `BP254` | Existing evidence sufficient; CHK-CDO-01F only |
| BP254 | `...::variant::asset-relationship::unresolved` | `...::variant::color::grafito` | `BP254` | Existing evidence sufficient; CHK-CDO-01F only |
| T575 | `...::variant::asset-relationship::unresolved` | `...::variant::color::cobre` | `T575` | Partial; provider confirmation remains required |
| T575 | `...::variant::asset-relationship::unresolved` | `...::variant::color::negro` | `T575` | Partial; generic primary relation remains open |
| T625 | `...::variant::color::negro` | `...::variant::color::negro+cobre` | `T625` | Partial; analytical only until finish gate |
| T625 | `...::variant::color::negro` | `...::variant::color::negro+plata` | `T625` | Provisional; provider confirmation required |

The existing `T622 ...::color::verde` relationship is not touched. The
existing `BP254 ...::color::plata` relationship is not touched. No key is
changed in this checkpoint.

## Relationship-level implementation ledger

### T622

- **Current key:**
  `CDO_STOCKSUR_SOURCE::model::t622::variant::asset-relationship::unresolved`.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::t622::variant::color::negro`.
- **Provider literal:** `T622`.
- **Asset relationship to move:**
  `T21/T622/alt=promocional_publicitario_botella_aluminio_T622_negra_frente.jpg`
  — SHA-256 `ab5715fd6f54d9e171ebe37b4c3e552320206506870c04dbdb1be60e8c22e91a`.
- **Primary candidate:** the black asset above, role `PRIMARY_CANDIDATE`.
- **Alternate candidates:** none in the unresolved EX01 relationship.
- **Marketing assets:** none in the unresolved EX01 relationship.
- **Historical preservation:** retain the unresolved key as an alias/history
  record pointing to the analytical reassignment; do not delete or overwrite
  the original EX01 decision.

- **Current key:** same T622 unresolved key.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::t622::variant::color::rojo`.
- **Provider literal:** `T622`.
- **Asset relationship to move:**
  `T21/T622/alt=promocional_publicitario_botella_aluminio_T622_roja_frente.jpg`
  — SHA-256 `f03e5ed3c28d0247c3edab2598bce03ab4e86bfdaa3c2099d085cd8e7732d180`.
- **Primary candidate:** the red asset above, role `PRIMARY_CANDIDATE`.
- **Alternate candidates:** none in the unresolved EX01 relationship.
- **Marketing assets:** none in the unresolved EX01 relationship.
- **Historical preservation:** same unresolved-key alias/history strategy.

The pre-existing `color::verde` relationship and its EX02 selected primary
remain separate. No green asset is moved by this plan.

### BP254

- **Current key:**
  `CDO_STOCKSUR_SOURCE::model::bp254::variant::asset-relationship::unresolved`.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::bp254::variant::color::plata+negro`.
- **Provider literal:** `BP254`.
- **Asset relationships to move:**
  `BP/BP254/BP254 plata+negro frente.jpg` — SHA-256
  `3f042c5e24ff9d299a468becec36e61afc1a7592d371e37f4f6ebce9bfc33401`; and
  `BP/BP254/BP254 negro+plata frente.jpg` — SHA-256
  `fb171c3a5c11e23ec57220be91c52b60a088041336fb7aca011d883d7d95eb89`.
- **Primary candidates:** both assets, role `PRIMARY_CANDIDATE`; the
  `plata+negro` file is the canonical semantic-order representative.
- **Alternate candidates:** the reversed-order file is an alternate naming
  relationship of the same bicolor variant, not a second public variant.
- **Marketing assets:** none identified for this unresolved relationship.
- **Historical preservation:** keep the unresolved key and both source
  filenames/SHA records; add the semantic canonical key without deleting the
  original labels.

- **Current key:** same BP254 unresolved key.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::bp254::variant::color::grafito`.
- **Provider literal:** `BP254`.
- **Asset relationship to move:** `BP/BP254/BP254 grafito frente.jpg` —
  SHA-256 `620842d094579ad41a3875ca472e18e903b6ba3ccc1e0909ed5d1a8c871d426b`.
- **Primary candidate:** the grafito asset, role `PRIMARY_CANDIDATE`.
- **Alternate candidates:** none identified for the grafito candidate.
- **Marketing assets:** none identified.
- **Historical preservation:** same unresolved-key alias/history strategy.

The existing `BP254 ...::color::plata` asset —
`BP/BP254/BP254 plata frente.jpg`, SHA-256
`1123976294823a1b365107d6c3d6730a58e9f5b2a0fda3e9e7b330e5be5d5d61` — remains
distinct and is not reassigned to the bicolor key.

### T575 — gated provisional split

- **Current key:**
  `CDO_STOCKSUR_SOURCE::model::t575::variant::asset-relationship::unresolved`.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::t575::variant::color::cobre`.
- **Provider literal:** `T575`.
- **Asset relationship to move:** `ttt2/tt3/T575/T575 cobre frente.jpg` —
  SHA-256 `4aa27c9dcd4027a63135ab94ec16392059705fd329fbca79190d5508787483e7`.
- **Primary candidate:** the copper asset, role `PRIMARY_CANDIDATE`.
- **Alternate candidates:** the source bank contains additional copper/logo
  views, but they are not promoted by this plan without the provider gate.
- **Marketing assets:** no marketing asset is assigned by this plan.
- **Historical preservation:** retain the unresolved key and EX01 decision;
  do not remove the generic primary relation.

- **Current key:** same T575 unresolved key.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::t575::variant::color::negro`.
- **Provider literal:** `T575`.
- **Asset relationships to review:**
  `T21/tt2/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo_le.jpg`
  — SHA-256 `2630d0b37fdf02a47efdd4621c9f75ad60419bcd6cf99725b200b64c0d7188f5`;
  `ttt2/tt3/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo.jpg`
  — SHA-256 `75035482fe30145e7fdd7fc975319897987fa57e6fccc6b2b168f9f5c58e05b7`;
  generic primary `ttt2/tt3/T575/T575 frente.jpg` — SHA-256
  `11ed25a9afc460ba36b70397e2bb4b36bae7b41015b04962dcc39b3e8b5a6ed4`.
- **Primary candidate:** generic `T575 frente.jpg` remains primary but is not
  assigned until provider confirmation.
- **Alternate candidates:** the two explicitly black-named source files are
  alternate/logo evidence.
- **Marketing assets:** none assigned.
- **Historical preservation:** no live split until `CHK-CDO-01E2` confirms
  the generic-primary relationship.

### T625 — gated finish split

- **Current key:** `CDO_STOCKSUR_SOURCE::model::t625::variant::color::negro`.
- **Proposed key:**
  `CDO_STOCKSUR_SOURCE::model::t625::variant::color::negro+cobre`.
- **Provider literal:** `T625`.
- **Asset relationship to move:**
  `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente.jpg` —
  SHA-256 `9f32973b7e1ba19af6a002aa040769b274a909ab2c3e937b62f2d9f3935bac80`.
- **Primary candidate:** copper-front asset, role `PRIMARY_CANDIDATE`.
- **Alternate candidates:** repeated `negro_cobre_*` views remain source
  alternates until a future implementation maps them explicitly.
- **Marketing assets:**
  `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente_logo.jpg`
  — SHA-256 `ae1d016e86f4e2fd5a497ad116a1b72377189659333e490f94946c3321a0770e`,
  role `MARKETING_ASSET`; preserve its role and do not use it as the master.
- **Historical preservation:** retain current `color::negro` as historical
  source key until the provider confirms the finish boundary.

- **Current key:** same T625 `color::negro` key.
- **Proposed key:** provisional
  `CDO_STOCKSUR_SOURCE::model::t625::variant::color::negro+plata`.
- **Provider literal:** `T625`.
- **Asset relationship to move:** generic black primary
  `T22/T625/alt=promocional_publicitario_mug_T625_negro_frente.jpg` — SHA-256
  `bd8f676059f7863e548245e562a37b28219a796fb5bc8d2133e663fe695dc8dd`.
- **Primary candidate:** generic black asset, role `PRIMARY_CANDIDATE`,
  described visually in EX01 as the silver-base candidate.
- **Alternate candidates:** other `T625_negro_*` views remain unassigned.
- **Marketing assets:** none for the silver-base hypothesis.
- **Historical preservation:** do not create this key until provider evidence
  confirms that the generic/silver-base asset is a distinct silver/plata
  finish or provides the appropriate provider literal.

## Execution guardrails for a future checkpoint

1. Preserve every original variant key, source path, SHA-256, role, and EX01/
   EX02 decision as historical evidence.
2. Add analytical relationships; do not delete or overwrite source evidence.
3. Do not set `MASTER_APPROVED`, `PUBLIC_READY`, or any equivalent publication
   flag as part of normalization.
4. Keep rights as `PROVIDER_BANK_PROVENANCE_ONLY` until a separate rights gate.
5. For the partial cases, do not execute any split before `CHK-CDO-01E2`.
6. Do not modify `productos_b2b`, runtime images, stock, pricing, mappings,
   categories, visibility, frontend, or provider runtime.

## Subsequent official-site evidence supersession

The provisional T575/T625 gates above were written before the current official
StockSur Mexico site evidence was registered. They remain historical planning
context and must not be executed as written. The current closure is recorded
in `CHK-CDO-01E2C_FINAL_IDENTITY_REMEDIATION_CLOSURE.md`.

- **EC742:** use provider literals `rosa`, `gris y negro`, `azul`, `gris`, and
  `celeste`; map the exact celeste source asset to `color::celeste`; retain
  generic imagery as generic/alternate unless independently determinable.
- **T575:** use current `color::negro`; preserve historical `cobre` as
  unassigned and not publication-certified. Do not create a current
  `color::cobre` from the historical bank alone.
- **T625:** retain current `color::negro` for the current silver/stainless-
  steel-base version; preserve copper/gold assets as historical and do not
  create current `negro+cobre` or `negro+dorado` keys.
- **T622/BP254:** existing analytical resolutions remain unchanged.

Identity/source remediation is now complete, but this plan does not clear
rights, approve masters, or authorize publication.
