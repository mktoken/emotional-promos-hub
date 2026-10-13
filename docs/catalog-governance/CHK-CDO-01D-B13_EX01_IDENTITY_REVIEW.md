# CHK-CDO-01D-B13 — EX01 identity review and EX02 preparation

## EX01 outcome

- Decisions reviewed: **26**
- `REASSIGN_VARIANT`: **18**
- `PASS_IDENTITY`: **3**
- Still open: **5**
- Cumulative unique human-reviewed decisions: **348**
- Unreviewed routing decisions: **5**
- `MASTER_APPROVED`: **0**

The 18 reassignment decisions are represented in the separate analytical
normalization CSV. Historical unresolved keys, source hashes, source paths,
provider codes, and prior evidence are preserved. The analytical status is
`ANALYTICAL_ONLY_NOT_PUBLISHED`; no live Governance or runtime mapping was
changed.

The five still-open identity/source cases are:

1. EC742 `asset-relationship::unresolved`
2. T575 `asset-relationship::unresolved` — proposed split `cobre|negro`
3. T622 `asset-relationship::unresolved` — proposed split `negro|rojo`
4. BP254 `asset-relationship::unresolved` — proposed split `negro+plata|grafito`
5. T625 `color::negro` — finish evidence `cobre/dorado` vs `plata`

No master was approved. Rights remain `PROVIDER_BANK_PROVENANCE_ONLY` and
resolved identities remain subject to the existing rights gate.

## EX02 prepared

EX02 contains exactly **5** remaining `MULTIPLE_PRIMARY_SELECTION_REQUIRED`
decisions:

- BP253 azul
- G219 negro
- T592 azul
- T622 verde
- U314 azul

Candidate A/B/C evidence is shown with filenames, dimensions, hashes, roles,
and context. All human fields are blank. EX01 open cases are excluded from
EX02 and remain in the identity/source remediation queue.

## Scope controls

DB: **0**; Governance live: **0**; runtime: **0**; Lovable: **0**;
frontend: **0**; providers: **0**; publication: **0**; master approvals: **0**.

Next step: human review of EX02.
