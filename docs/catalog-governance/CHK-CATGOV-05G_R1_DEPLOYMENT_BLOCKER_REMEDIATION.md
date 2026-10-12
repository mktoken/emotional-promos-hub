# CHK-CATGOV-05G-R1 — Deployment blocker remediation

Status: **repository remediation package ready / not deployed**
Baseline: `55b14f3c345b0151d478a550d61a03bf5c864c10`
R0 reconciliation: **CLOSED / PASS**

## Blocker 1 — precheck permission

### Original failure

The V1 precheck counted rows from `public.productos_publicos`. That view
depends on a runtime function for stock eligibility, and the internal
read-only execution user does not have permission to execute that dependency.
The precheck therefore could not produce a trustworthy `READY` result.

### Remediation

`PRECHECK_V2` and `POSTCHECK_V2` remove all content reads from
`public.productos_publicos`. They verify only:

- relation identity through `to_regclass`;
- existing search-function identity through `to_regprocedure`;
- view/function definitions and metadata through `pg_catalog` helpers;
- definition hashes for before/after comparison.

They do not invoke the view, the public search function, or any stock
eligibility dependency. No permission is broadened.

Result: **RESOLVED BY DESIGN**.

## Blocker 2 — internal migration vehicle

### Original failure

The internal Lovable migration tool does not apply an already-existing
`supabase/migrations/` file directly. It accepts a SQL payload and records one
internal Drizzle migration plus journal metadata.

### Remediation

The package explicitly authorizes that existing internal workflow for the
future apply:

- the canonical logical migration remains
  `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`;
- the payload sent to Lovable must be byte-identical and hash-equal;
- exactly one generated internal Drizzle migration is allowed as the runtime
  deployment vehicle;
- its journal entry is deployment metadata, not a second schema authority;
- `drizzle/schema.ts` remains untouched;
- the migration is applied exactly once.

Result: **RESOLVED BY CONTRACT**.

## Frozen implementation integrity

The 05F migration and both RPC definitions remain unchanged. The package does
not alter schema scope, does not backfill defaults, and does not modify public
objects. Expected post-apply values remain:

- models: 8;
- memberships: 18;
- public defaults true: 0;
- duplicate defaults: 0.

The existing V1 rollback is reused unchanged because its guards are bounded:
it refuses rollback when defaults exist, verifies the frozen RPC bodies and
uniqueness index, and removes only the two projection RPCs, the two exact 05F
indexes, and the new column.

## R0 reconciliation

R0 fast-forwarded two remote Lovable commits. They changed only
`supabase/functions/catalog-image-admin/index.ts` with three compile-time
TypeScript casts. Runtime JavaScript behavior remained equivalent. No 05F/05G
artifact, frontend, Drizzle schema, database schema, public catalog, or runtime
contract changed.

## Static package boundary

| Item | Result |
|---|---|
| public catalog content queries in PRECHECK_V2 | 0 |
| public catalog content queries in POSTCHECK_V2 | 0 |
| unavailable stock-function execution dependency | 0 |
| logical migrations | 1 |
| canonical migration changed | NO |
| RPC SQL changed | NO |
| backfill/default assignment | 0 |
| frontend/runtime/provider execution | 0 |
| Drizzle schema modification required | NO |
| internal migration vehicle | AUTHORIZED FOR FUTURE EXECUTION |
| rollback | BOUNDED |

No live database, runtime, Lovable, frontend, provider, or migration action
was performed by this checkpoint.
