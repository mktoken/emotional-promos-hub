# CHK-CATGOV-05G-C-A — Model projection deployment certification record

Status: **B3 DEPLOYMENT CERTIFIED / PRECHECK V3 REPLAY PENDING**

This document records the successful B3 result supplied by the internal
deployment workflow. It does not execute or authorize another migration and
does not close CHK-CATGOV-05G.

## Deployment evidence

- B3 deployment: `PASS`.
- Canonical logical migration:
  `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`.
- Canonical migration SHA-256:
  `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca`.
- Internal vehicle:
  `drizzle/migrations/0007_catalog_model_public_projection_v1.sql`.
- Canonical/internal SQL comparison: `BYTE-IDENTICAL`.
- PostgreSQL deployment error: `NONE`.
- Transaction side effects outside the intended migration: `0`.

## Postcheck result

- POSTCHECK V3: `14/14 PASS`.
- `is_public_default`: present.
- Public defaults: `0`.
- Models preserved: `8`.
- Memberships preserved: `18`.
- `catalog_search_model_projection_v1`: `PASS`.
- `get_model_projection_detail_v1`: `PASS`.
- Existing `productos_publicos`: unchanged.
- Existing `catalog_search_products_v2`: unchanged.
- Security contract: `PASS`.
- Read-only RPC certification writes: `0`.

## Scope invariants

- `drizzle/schema.ts`: unchanged.
- Frontend: unchanged.
- Routes: unchanged.
- Storage: unchanged.
- Provider calls: `0`.
- Pricing, stock, mappings, images, and Governance data: unchanged.

## Replay issue and remediation

The first PRECHECK V2 replay returned `CONFLICT` because its function-body
fingerprints predated the R2 correction. The live RPC bodies match the
corrected migration, POSTCHECK V3, and HASH MANIFEST V3. This is a package
fingerprint defect, not a deployment defect.

No rollback and no redeploy are authorized or required.

PRECHECK V3 was created with only the corrected live-compatible fingerprints:

- search RPC body MD5: `4c78fdf1555d6ec080d651071bd70bed`;
- detail RPC body MD5: `5d88ba4848f04c39e99600cda8bc4702`.

The required final step is a live read-only PRECHECK V3 replay. Until that
replay returns `ALREADY_APPLIED`, this checkpoint remains open and
MASTER-STATE must not be marked fully closed.
