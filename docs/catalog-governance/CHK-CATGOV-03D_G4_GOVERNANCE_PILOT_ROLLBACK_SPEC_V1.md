# CHK-CATGOV-03D — G4 Governance Pilot Rollback Specification V1

**Status:** specification only. Do not execute from Work.

Operation scope is the exact deterministic ID set in [the payload](./CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json). Rollback is allowed only after a failed or explicitly cancelled `G4_GOVERNANCE_PILOT_V1` apply and only after confirming the rows still match the package payload.

## Safety preconditions

- Confirm the package operation and exact deterministic IDs.
- Confirm every candidate row has package-owned content; if any row differs or is linked to later human work, abort.
- Confirm no pre-existing row is included.
- Confirm no runtime table or Storage object is targeted.
- If any guard fails, stop; do not delete.

## FK-safe order

The generated internal rollback must delete only these literal payload IDs, in this order:

1. `audit_events` (4 package lineage events).
2. `catalog_product_asset_links` (31 links).
3. `catalog_quality_issues` (10 issues).
4. `catalog_product_content` (30 content rows).
5. `catalog_asset_registry` (31 assets).
6. `catalog_source_evidence` (61 evidence rows).
7. `catalog_source_documents` (2 documents).
8. `catalog_governance_state` (30 state rows).

Use explicit `WHERE id IN (...)` lists from the payload and assert each delete count. Never delete by provider, product name, SKU, time range, or broad status. Never touch attributes, models, memberships, approvals, runtime product tables, pricing, stock, mappings, publication, or Storage.

If any count differs from the expected count, run no further delete and report the mismatch. Rollback is not idempotent against post-package human work; a non-empty later dependency is a hard stop.

## Expected rollback counts

| table | expected deletes |
|---|---:|
| audit_events | 4 |
| catalog_product_asset_links | 31 |
| catalog_quality_issues | 10 |
| catalog_product_content | 30 |
| catalog_asset_registry | 31 |
| catalog_source_evidence | 61 |
| catalog_source_documents | 2 |
| catalog_governance_state | 30 |

## Rollback result

After deletion, assert zero remaining rows for the exact deterministic package IDs and zero runtime-table changes. Do not restore or infer any prior runtime data.
