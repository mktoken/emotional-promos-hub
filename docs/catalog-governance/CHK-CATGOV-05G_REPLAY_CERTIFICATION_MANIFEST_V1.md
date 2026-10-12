# CHK-CATGOV-05G-C-A — Replay certification manifest V1

Status: **READ-ONLY CERTIFICATION PACKAGE / LIVE REPLAY PENDING**
Baseline after B3 reconciliation: `e32fe830493db20941b63bbbb6bc8cd7ae904a85`
Hash algorithm: SHA-256 over exact repository bytes.

This manifest is for audit and replay certification only. It does not
authorize another migration, redeploy, rollback, or database write.

| Artifact | SHA-256 | Bytes | Lines |
|---|---|---:|---:|
| `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql` | `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca` | 36324 | 790 |
| `drizzle/migrations/0007_catalog_model_public_projection_v1.sql` | `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca` | 36324 | 790 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V3.sql` | `3ef848b46d80c214da87e0785e73aef2dd39d47001dfd743e8a70370af8b4aae` | 10352 | 245 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V3.sql` | `102481b31229fd2d6327714d7a33277e6c3f4c071baa3d1cca465ba736d0448a` | 9960 | 228 |
| `docs/catalog-governance/CHK-CATGOV-05G_C_MODEL_PROJECTION_DEPLOYMENT_CERTIFICATION.md` | `e58d86715a19e639d1ed600d2746bb4dc9619e7a3c7a8df84eacd5ace344a060` | 2208 | 61 |

## Replay rule

Recompute every listed hash and stop on mismatch. Run only the read-only
PRECHECK V3 against the live internal environment. Expected result:
`deployment_state = ALREADY_APPLIED` and `ready_to_deploy = false`.

Do not execute the migration, either projection RPC, public catalog content,
provider, Storage, or product write path as part of this package.
