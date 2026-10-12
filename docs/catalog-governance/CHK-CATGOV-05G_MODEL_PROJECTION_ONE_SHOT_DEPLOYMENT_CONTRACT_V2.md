# CHK-CATGOV-05G-R1 — One-shot internal deployment contract V2

Status: **repository package only / not executed**
Baseline: `55b14f3c345b0151d478a550d61a03bf5c864c10`
Logical migration count: **1**

## Logical migration and runtime vehicle

The only logical migration is:

`supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`

The runtime deployment vehicle is one Lovable-generated internal Drizzle
migration artifact containing byte-identical executable SQL. The generated
Drizzle migration and journal entry are deployment metadata only; they are not
a second schema authority. `drizzle/schema.ts` must remain unchanged.

Do not use external Supabase, CLI, dashboard, login/link, service-role
connection, Work SQL, or a second query-executor data path.

## Exact sequence for a future intervention

1. Verify the baseline and recompute every SHA-256 in
   `CHK-CATGOV-05G_MODEL_PROJECTION_HASH_MANIFEST_V2.md`.
2. Submit and run the exact `PRECHECK_V2` through the internal read-only
   surface. It must return `deployment_state = READY` and
   `ready_to_deploy = true`. Stop on `BLOCKED` or `CONFLICT`.
3. Capture BEFORE metadata for `public.productos_publicos` and
   `public.catalog_search_products_v2`: identity/signature and definition
   hashes. The precheck does not execute the view or either public function.
4. Submit the canonical migration SQL unchanged to the internal migration
   tool. Independently verify that the payload SHA-256 equals the canonical
   migration hash before applying.
5. Allow exactly one internal Drizzle migration artifact and journal entry to
   be generated as the deployment vehicle. Do not add schema logic or a second
   logical migration. Apply once; do not retry after an ambiguous result.
6. Confirm `drizzle/schema.ts` is unchanged.
7. Run the exact `POSTCHECK_V2` read-only file.
8. Compare BEFORE and AFTER metadata hashes for both existing public objects.
   Any difference is a failure and rollback condition.
9. Run the new projection RPC read-only certification only after postcheck
   passes. Confirm no writes, no automatic defaults, no duplicate model result,
   blocked variants remain blocked, and price/MOQ atomicity remains intact.
10. Rerun `PRECHECK_V2`; expected state is `ALREADY_APPLIED`. Stop.

## Required invariants

- 8 models preserved;
- 18 memberships preserved;
- `is_public_default = true` rows: 0;
- duplicate defaults: 0;
- no default is selected automatically;
- existing public object identities and definition hashes unchanged;
- no frontend, pricing, stock, mappings, images, publication, Storage,
  scheduler, provider, or unrelated RPC changes;
- only the two new read-only projection RPCs are created/managed;
- the migration remains the exact 05F source artifact.

## Stop and rollback

Stop immediately on hash mismatch, failed precheck/postcheck, changed public
object definition, changed model-status snapshot, unexpected Drizzle schema
change, ambiguous apply result, or any unrelated write. Do not retry.

Use `CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql` only after proving the
apply started from `READY` and its fail-closed guards pass. It removes only the
two projection RPCs, the two exact 05F indexes, and `is_public_default`; it
never removes models, memberships, Governance relationships, products,
pricing, stock, images, public views, or frontend state.

## Report required

Return the internal migration identifier, canonical/payload hashes, generated
Drizzle artifact and journal metadata, PRECHECK/POSTCHECK results, before/after
public-object hashes, model/membership/default/index counts, RPC certification,
and any stop condition. Do not claim deployment or public readiness from this
repository package alone.
