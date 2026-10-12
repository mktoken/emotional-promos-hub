# CHK-CATGOV-05G-A — Controlled internal deployment package

Status: **REPOSITORY PACKAGE READY / NOT DEPLOYED**
Baseline: `0aa853af231b771f3bc3208806891bad8489b9b3`
Projection: `CATALOG_MODEL_PUBLIC_PROJECTION_V1`

## Decision

**Canonical deployment vehicle: C — the existing `supabase/migrations/` path,
consumed later by the internal Lovable/Supabase migration workflow.**

This is based on repository evidence, not convenience:

- The 05F backend package is already the exact artifact
  [`supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`](../../supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql).
- The repository's `drizzle/schema.ts` is intentionally blank and the 05F
  implementation explicitly records that it is not a second schema authority.
- Prior runtime DDL is versioned in `supabase/migrations/`, including the
  catalog visibility and scheduler migrations.
- Prior internal migration contracts instruct the integrated Lovable workflow
  to generate/apply one internal Supabase migration from an unchanged SQL
  artifact, without creating a Drizzle migration, journal entry, or snapshot.
- The internal query executor is the certified path for bounded Governance
  DML, not for this additive runtime schema/RPC DDL package.

Therefore 05F is **DEPLOYABLE_AS_IS as the repository source artifact**. It
still requires a later controlled internal migration application; this
checkpoint does not apply it.

## Frozen scope

The future apply may create or alter only:

1. `public.catalog_product_model_members.is_public_default boolean NOT NULL DEFAULT false`;
2. the partial unique index
   `public.catalog_model_members_one_public_default_idx` on `model_id` where
   `is_public_default = true`;
3. `public.catalog_model_members_public_projection_idx`;
4. `public.catalog_search_model_projection_v1(...)`;
5. `public.get_model_projection_detail_v1(...)`;
6. grants/revokes for those two new functions.

The existing 18 memberships are not backfilled. No default is assigned. No
model status is changed. Existing public search/view authorities are not
replaced or redefined.

The second lookup index is part of the exact 05F artifact and is included in
the hash-frozen deployment source; it does not change public truth or choose a
default.

## Precheck gate

Run the exact `CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V1.sql` through the
internal read-only surface. Stop before apply when the result is `BLOCKED` or
`CONFLICT`. Continue only when the result is `READY` with
`ready_to_deploy = true`, or when it is `ALREADY_APPLIED` and all compatibility
checks pass. Capture the public-product count, existing search RPC definition
hash, public-view definition hash, and model-status snapshot for comparison
afterward.

Expected current state before a first apply:

- models: 8;
- memberships: 18;
- `is_public_default`: missing or compatible, with 0 true defaults;
- projection RPCs: missing or exact compatible definitions;
- no conflicting uniqueness index;
- public catalog/search/view objects present and unchanged.

## Apply boundary

The exact apply input is the already committed 05F migration. Do not copy,
rewrite, split, regenerate, or “repair” it. Apply once through the internal
Lovable/Supabase migration workflow only. Do not run it from Work, via an
external Supabase CLI/dashboard, or through an external connection.

No backfill, default assignment, data rewrite, frontend change, provider
call, scheduler change, Storage action, stock/pricing/mapping change, or
public catalog cutover is authorized.

## Postcheck gate

Run the exact `CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V1.sql` read-only file
once after a successful apply. It must return `postcheck_pass = true`, with:

- 8 models and 18 memberships;
- 18 intact model relationships;
- 0 true public defaults;
- exactly one semantic/name-matching uniqueness index;
- both projection RPCs present with frozen bodies;
- SQL/STABLE/SECURITY DEFINER and safe search path;
- PUBLIC execute revoked and anon/authenticated grants present;
- existing public objects present;
- public-product and existing-public-object hashes equal to PRECHECK;
- model status snapshot equal to PRECHECK.

Then perform the future read-only RPC certification listed in the one-shot
contract. This package does not perform those live checks.

## Rollback boundary

Use the exact rollback file only if the controlled apply requires reversal and
the pre-apply state was `READY`. It refuses to continue when any default is
true, when the frozen functions do not match, or when the frozen index is
absent. It removes only the two new functions, the frozen uniqueness index,
and the `is_public_default` column. It never deletes models, memberships,
pricing, stock, images, public views, frontend state, or existing runtime
catalog rows.

The rollback also drops the exact additive lookup index created by 05F. It
does not remove any data and does not touch unrelated indexes or constraints.

## Static result for this checkpoint

| Gate | Result |
|---|---|
| migration path reconciliation | PASS — existing `supabase/migrations/` authority |
| schema authority | PASS — no Drizzle artifact created |
| migration scope | PASS — 05F artifact unchanged |
| RPC search/detail | PASS — frozen source reviewed |
| precheck/postcheck | PASS — prepared read-only, no business RPC execution |
| rollback | PASS — bounded and fail-closed |
| hashes | PASS — manifest generated after artifact freeze |
| backfill/defaults | PASS — 0 authorized |
| frontend/runtime/provider execution | 0 |
