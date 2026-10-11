# CHK-CATGOV-03D — G4 Governance Pilot SQL Deployment Specification V1

**Status:** repository preparation only. This is a canonical specification for Lovable to turn into one internal migration; it is not a Drizzle migration and it has not been executed.

## Inputs and authority

- Operation identifier: `G4_GOVERNANCE_PILOT_V1`.
- Baseline: `0fb9bf4dd4aa54f2c75f5d5d107cc777916dbf54`.
- Exact payload: [CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json](./CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json).
- Schema authority: `drizzle/migrations/0001_catalog_governance_shadow_foundation_v1.sql` plus later governance contract fixes already present in the repository.
- Scope: exactly the 30 frozen G4 product IDs in the payload.

## Non-negotiable boundaries

The generated migration may write only the Governance tables listed in the payload. It must not write or alter `productos_b2b`, `productos_b2b.imagenes`, `producto_b2b_status`, `producto_b2b_oferta_map`, `producto_proveedor_ofertas`, `provider_raw_products`, stock, pricing, categories, `productos_publicos`, `catalog_search_products_v2`, Storage, schedulers, or provider systems.

No model or model-membership rows are inserted: the five model families are candidates only and require human confirmation. No approvals are inserted.

## Required transaction and preconditions

The eventual migration must run in one transaction and fail closed:

```sql
BEGIN;

-- Verify every authorized table exists with the expected columns/check-compatible contract.
-- Verify all 30 producto_b2b_id values exist exactly once in productos_b2b.
-- Verify the payload product set has 30 distinct IDs.
-- Verify the operation identifier is exactly G4_GOVERNANCE_PILOT_V1.
-- Verify no non-package Governance rows already exist for any package ID or scoped
-- product that would collide with the planned semantic keys.
-- Verify every existing row with a planned deterministic ID is content-equivalent;
-- otherwise RAISE EXCEPTION and stop before any INSERT.
-- Verify source documents, evidence, content, assets, links, issues, and state
-- counts are zero or exact compatible replays before any INSERT.

-- Embed the companion payload as literal VALUES/JSON rows here.
-- Never generate UUIDs in the migration. Use explicit IDs from the payload.
```

The implementation must check schema compatibility through `information_schema` before DML, including:

- `catalog_governance_state`: unique `producto_b2b_id`, five status columns.
- `catalog_source_documents`: `source_type`, URI/name, SHA-256, rights status, metadata.
- `catalog_source_evidence`: subject type/id, field path, raw value, excerpt, confidence/status.
- `catalog_product_content`: exactly one target, version/current, non-public status.
- `catalog_asset_registry`: required SHA-256, dimensions, identity/technical/visual/approval statuses.
- `catalog_product_asset_links`: exactly one typed target and schema-valid role/status.
- `catalog_quality_issues`: schema-valid issue code/severity/status.
- `catalog_approvals` and `audit_events`.

If any required table/column/check contract is absent, abort before any insert.

## Deterministic insertion order

Use the exact literal rows from the companion payload and the following FK-safe order:

1. `catalog_source_documents` — 2.
2. `catalog_source_evidence` — 61.
3. `catalog_product_content` — 30.
4. `catalog_asset_registry` — 31.
5. `catalog_product_asset_links` — 31.
6. `catalog_quality_issues` — 10.
7. `catalog_governance_state` — 30.
8. `audit_events` — 4.

`catalog_attribute_definitions`, `catalog_attribute_values`, `catalog_product_models`, `catalog_product_model_members`, and `catalog_approvals` receive 0 rows.

Use explicit column lists. Use `INSERT ... ON CONFLICT DO NOTHING` only after a deterministic-ID and semantic-content equality guard. If a same-ID or same-semantic-key row exists with different content, raise an exception; never overwrite it. There are no blind updates.

## Status mapping

- 20 manifest rows with `PHASE_3_READY` → all five governance statuses `NEEDS_REVIEW`.
- 4 `NO_VALID_MASTER` rows → all five governance statuses `BLOCKED`, issue `WRONG_MASTER/BLOCKER/OPEN`.
- 6 `BANK_MATCH_REVIEW_REQUIRED` rows → all five governance statuses `BLOCKED`, issue `IDENTITY_AMBIGUOUS/BLOCKER/OPEN`.
- Product content is `HUMAN_REVIEW_REQUIRED`, current version 1, with canonical name only.
- The 31 asset registry rows are non-public candidates: identity `MATCHED`, technical `PASS`, visual `PASS`, rights `PENDING`, approval `CANDIDATE`; links are `REVIEW_REQUIRED`.
- No `public_url`, no Storage object, and no runtime image reference is written.

## Audit events

Insert only the four deterministic package events from the payload:

- `PILOT_PACKAGE_PREPARED`
- `SOURCE_REGISTRATION_PLANNED`
- `SOURCE_EVIDENCE_PLANNED`
- `GOVERNANCE_STATE_INITIALIZATION_PLANNED`

They are package lineage events, not provider or runtime execution events.

## Post-insert assertions

Before committing, assert exact counts for rows owned by the package IDs:

```sql
-- Assert 2 source documents, 61 evidence rows, 30 content rows,
-- 31 assets, 31 links, 10 issues, 30 governance states, 4 audit events.
-- Assert 20 state rows are NEEDS_REVIEW and 10 are BLOCKED.
-- Assert 0 approvals, 0 models, 0 memberships, 0 attribute definitions,
-- and 0 attribute values were created by this package.
-- Assert every scoped product appears exactly once in governance_state.
-- Assert no runtime table was touched.
```

Only after all assertions pass may the generated Lovable migration commit. This repository package itself performs no SQL.

## Deferred negative-gate QA

The package inserts no supplemental products. Cases for request_quote/unresolved, stock bajo, and agotado/consultar are deferred to Lovable read-only QA because no safe runtime observation is available in this repository-only checkpoint.
