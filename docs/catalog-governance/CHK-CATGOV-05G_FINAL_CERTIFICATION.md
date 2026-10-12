# CHK-CATGOV-05G — Final model public projection certification

Status: **CLOSED / PASS**
Date: `2026-10-12`

This is a documentation closure record. Live deployment and replay evidence is
identified as `LIVE_RUNTIME_EVIDENCE_FROM_LOVABLE`; no live SQL or runtime
action was executed by this checkpoint.

## Timeline

- **05F** — model-level public projection backend package designed and frozen.
- **05G-A** — one-shot deployment package and read-only guards prepared.
- **05G-R0** — remote deployment metadata drift reconciled and accepted.
- **05G-R1** — deployment blockers remediated; precheck/postcheck V2 package.
- **05G-B2** — first apply attempt failed transactionally on `42703` and
  rolled back with zero database side effects.
- **05G-R2** — corrected exactly two `public_products` joins; POSTCHECK V3,
  PRECHECK V3 and new hashes prepared.
- **05G-B3** — corrected canonical migration successfully applied through the
  internal `0007` deployment vehicle.
- **05G-C-A** — B3 metadata reconciled; byte identity certified; PRECHECK V3
  prepared for replay.
- **05G-C-B** — live read-only PRECHECK V3 replay returned `ALREADY_APPLIED`.

## Final certified state

- Canonical migration:
  `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`.
- Canonical SHA-256:
  `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca`.
- Internal vehicle:
  `drizzle/migrations/0007_catalog_model_public_projection_v1.sql`.
- Canonical/internal SQL: `BYTE-IDENTICAL`.
- Logical migration count: `1`.
- `drizzle/schema.ts`: unchanged.
- `POSTCHECK_V3`: `14/14 PASS`.
- PRECHECK V3 replay: `deployment_state = ALREADY_APPLIED`;
  `ready_to_deploy = false`.
- Models: `8`.
- Memberships: `18`.
- `is_public_default = true`: `0`.
- Duplicate defaults: `0`.
- `catalog_search_model_projection_v1`: compatible/live.
- `get_model_projection_detail_v1`: compatible/live.
- `productos_publicos`: present/unchanged.
- `catalog_search_products_v2`: present/unchanged.
- Certification writes: `0`.

## Public boundary

The model projection backend is deployed and certified, but no model-level
frontend cutover has occurred. The existing public catalog path remains
authoritative. `MODEL MEMBERSHIP != PUBLICATION`; no model is published by
membership alone, and no public default is active.

No frontend, route, pricing, stock, mapping, image, Storage, provider or
scheduler change is included in this closure.

## Final artifacts

- `CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V3.sql`
- `CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V3.sql`
- `CHK-CATGOV-05G_MODEL_PROJECTION_HASH_MANIFEST_V3.md`
- `CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT_V3.md`
- `CHK-CATGOV-05G_REPLAY_CERTIFICATION_MANIFEST_V1.md`
- `CHK-CATGOV-05G_C_MODEL_PROJECTION_DEPLOYMENT_CERTIFICATION.md`
- `CHK-CATGOV-05G_R2_MIGRATION_SQL_CORRECTION.md`

05G is formally closed. Future model → variant → provider-offer public UX
requires its own explicit readiness and frontend cutover checkpoint.
