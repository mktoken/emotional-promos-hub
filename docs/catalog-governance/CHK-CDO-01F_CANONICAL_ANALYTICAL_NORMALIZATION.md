# CHK-CDO-01F — Canonical Analytical Normalization

**Date:** 2026-10-13
**Status:** `CLOSED / PASS — ANALYTICAL ONLY`
**Scope:** CDO / StockSur canonical analytical manifest and model/variant matrix.

## Boundary

This checkpoint applies final human-review and provider-site evidence to the
repository's analytical artifacts only. It does not approve masters, clear
rights, publish assets, update runtime tables, alter stock/pricing/mappings, or
contact a provider. The human review ledger remains preserved as the historical
source of decisions.

- Human review ledger: **353 / 353** reviewed; unreviewed **0**.
- Identity/source open: **0**.
- Provider evidence open: **0**.
- Rights: `PROVIDER_BANK_PROVENANCE_ONLY`.
- `MASTER_APPROVED`: **0**; publication: **NO**.
- Database/runtime/Lovable/frontend/provider calls: **0**.

## Applied analytical decisions

- Direct evidence reassignments: BP193 `azul+negro`; BP228 `celeste`; BP233,
  BP240, BP241, BP250, BP257 and BP307 `violeta`; BP311, C543, C549 and C556
  `azul_marino`; T555, T559 and T591 `celeste`; T592 `gris`; BP253 `grafito`.
- Split/relationship normalization: T622 `negro` and `rojo`; BP254
  `plata+negro` and `grafito`; existing T622 `verde` and BP254 `plata` remain
  independent.
- Provider literal structure: EC742 records `rosa`, `gris y negro`, `azul`,
  `gris` and `celeste`. The exact celeste asset is mapped analytically;
  generic imagery remains generic/alternate and is not forced into a color.
- Current finish boundary: T575 uses current `negro`; copper is preserved as
  historical `historical::finish::negro+cobre` and not current-certified.
  T625 keeps current silver/stainless-base `negro`; copper/gold assets are
  preserved under the same historical finish key and are not current.
- PASS_IDENTITY decisions remain preserved: BP298 `blanco`, C549 `negro`, and
  T559 `gris`.
- EX02 role selections remain preserved: BP253, G219, T592, T622 and U314
  selected candidates remain primary; their non-selected candidates remain
  alternates/supporting evidence.

## Artifact changes

- Canonical asset manifest: 45 rows normalized or role-preserved; source filenames and SHA-256 values retained.
- Canonical model/variant matrix: 20 changes, including exact canonical analytical values and provider-navy normalization.
- Post-visual remediation queue: five rows marked `canonical_normalization_status=COMPLETE`; original evidence columns unchanged.
- Human master-review ledger: **not rewritten**; original decisions, dates and sources remain intact.
- Change ledger: `docs/catalog-governance/data/cdo-01f-canonical-normalization-changeset-v1.csv`.

## Readiness boundary

Every action in this checkpoint is `publication_eligible=NO` and
`rights_status=PROVIDER_BANK_PROVENANCE_ONLY`. No row is `MASTER_APPROVED`,
`PUBLIC_READY`, or equivalent. The next independent gate is
`CHK-CDO-01G — rights / publication readiness`; it must not be executed
automatically from this checkpoint.
