# CHK-CATGOV-05G — One-shot internal deployment contract

Classification: **controlled additive schema/RPC deployment package**
Execution status: **NOT EXECUTED by this checkpoint**
Project surface: **internal Lovable/Supabase only**

## Exact inputs

Use only these repository artifacts:

- [`supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`](../../supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql)
- [`CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V1.sql`](./CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V1.sql)
- [`CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V1.sql`](./CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V1.sql)
- [`CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql`](./CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql)
- [`CHK-CATGOV-05G_MODEL_PROJECTION_HASH_MANIFEST_V1.md`](./CHK-CATGOV-05G_MODEL_PROJECTION_HASH_MANIFEST_V1.md)

Do not create a Drizzle migration, journal entry, snapshot, query-executor
seed, second logical migration, or manually reconstructed SQL payload.

## Mandatory sequence

1. Confirm the internal project and repository baseline match the manifest.
2. Compute SHA-256 for every listed artifact and compare byte-for-byte with the
   manifest. The two RPC body hashes must also match the frozen values in the
   manifest.
3. Run the exact PRECHECK read-only file.
4. Stop unless the result is `READY_TO_DEPLOY = true` / `READY`, or a complete
   compatible `ALREADY_APPLIED` state. `BLOCKED` and `CONFLICT` are terminal for
   this intervention.
5. If `ALREADY_APPLIED`, do not replay the migration. Run POSTCHECK and the
   read-only certification only.
6. If `READY`, apply the unchanged 05F migration exactly once through the
   internal Lovable/Supabase migration workflow. Do not apply it from Work,
   external Supabase, CLI, dashboard, or service-role connection.
7. Run the exact POSTCHECK. Stop on any failed assertion; do not retry.
8. Run only the read-only certification tests below and report exact results.

## Hard safety boundary

This operation must not:

- assign any `is_public_default = true` value;
- alter the 8 models or 18 memberships;
- change existing `productos_publicos`, `catalog_search_products_v2`, or any
  public-view definition;
- modify frontend, pricing, stock, mappings, images, publication, Storage,
  schedulers, providers, or Edge Functions;
- invoke a provider, business RPC, Storage API, or write path outside the
  exact migration;
- expose provider IDs, Governance evidence, tokens, secrets, or private fields
  in the new public projection response.

## Read-only certification after POSTCHECK

Run both new functions with bounded inputs and confirm:

- search function is callable by its intended public roles;
- detail function is callable by its intended public roles;
- outputs carry `CATALOG_MODEL_PUBLIC_PROJECTION_V1`;
- no write side effect occurs;
- 8 models/18 memberships remain represented in Governance;
- no duplicate model result is introduced;
- blocked variants remain excluded;
- Jello weak-image cases remain unresolved/non-ready;
- Imperial/Border blocked image variants remain blocked;
- no default hallucination or random fallback occurs;
- price and MOQ remain in one product/variant authority context;
- existing product-level public catalog remains unchanged;
- PRECHECK and POSTCHECK public-object hashes match;
- model-status snapshot matches PRECHECK and no model becomes ready solely by
  deploying this package.

## Stop conditions and recovery

If hash verification, PRECHECK, migration application, POSTCHECK, or live QA
is ambiguous or fails, stop and report the exact condition. Do not retry the
apply. Use the frozen rollback file only after proving that the apply started
from `READY` and its fail-closed guards pass. Never broaden rollback to
models, memberships, products, pricing, stock, images, views, Storage, or
frontend.

## Required report

Return:

- `READY_TO_DEPLOY`, `ALREADY_APPLIED`, `BLOCKED`, or `CONFLICT`;
- artifact hashes and exact applied migration identifier, if any;
- precheck and postcheck results;
- model/membership/default/index counts;
- RPC security/grant results;
- public-object hash comparison;
- model-status snapshot comparison;
- any stop condition.

Do not claim runtime deployment or public readiness from repository preparation
alone.
