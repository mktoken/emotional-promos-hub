# CHK-CATGOV-03E-R3 — One-Shot Lovable Query-Executor Contract V4

## Operation

`G4_GOVERNANCE_PILOT_V1`

Classification: **CONTROLLED GOVERNANCE SEED / SHADOW IMPORT**.

This is repository-versioned DML over Governance shadow tables. It is not a
schema migration, runtime catalog migration, or publication operation. The
operation is permitted only through the internal Lovable query surface using
repository files. Do not use external Supabase, an external CLI, Work SQL, or
manual copy/paste of the large SQL payload.

## R1 incident and package resolution

CHK-CATGOV-03F-R1 stopped before APPLY after PostgreSQL returned error `42601`
at the first product UUID in PRECHECK_V1. The confirmed cause was invalid
PostgreSQL `VALUES` syntax: scalar expressions were supplied without row
constructors. APPLY was not executed and database writes were `0`.

PRECHECK_V1 is preserved byte-identically as historical evidence of the failed
runtime attempt. Package V2 replaces only the PRECHECK artifact with
PRECHECK_V2, which adds the required row constructors and preserves the same
semantic intent, IDs, guards, counts, collision checks, and PASS conditions.

## Exact inputs

- Repository baseline: `0bc7b1d55f799353226483134919c1904023aed6`
- Payload: `docs/catalog-governance/CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json`
- Expected matrix: `docs/catalog-governance/CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md`
- Precheck V2: `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_PRECHECK_V2.sql`
- Apply V1: `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_APPLY_INSERTS_V1.sql`
- Postcheck V1: `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_POSTCHECK_V1.sql`
- Rollback V1: `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_ROLLBACK_V1.sql`
- Hash manifest: `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_QUERY_PACKAGE_HASH_MANIFEST_V2.md`

Before execution, compare every Package V2 artifact byte-for-byte with the
approved V2 hash manifest. If any hash, path, baseline, or file content differs,
STOP.

## Syntax validation status

No PostgreSQL parser, `psql`, or database connection was available in Work for
this checkpoint. The package was therefore validated with a reproducible
PostgreSQL-oriented static lexer/parser that ignores comments and quoted
literals and checks statement types, parenthesis balance, `VALUES` row
constructors, explicit INSERT arity, and deterministic row counts. This is not
runtime evidence and does not replace the next internal Lovable execution.

## Package V2 composition

- PRECHECK: `CHK-CATGOV-03F_G4_PILOT_PRECHECK_V2.sql`
- APPLY: `CHK-CATGOV-03F_G4_PILOT_APPLY_INSERTS_V1.sql`
- POSTCHECK: `CHK-CATGOV-03F_G4_PILOT_POSTCHECK_V1.sql`
- ROLLBACK: `CHK-CATGOV-03F_G4_PILOT_ROLLBACK_V1.sql`

Previous V1 artifacts remain historical references. Do not modify or replace
PRECHECK_V1, APPLY_INSERTS_V1, POSTCHECK_V1, or ROLLBACK_V1.

## Step A — internal read-only preflight

1. Confirm the project and repository baseline are the expected ones.
2. Confirm the Governance shadow tables exist with the columns required by the
   package.
3. Confirm runtime catalog authorities are readable but are not targets of this
   operation.
4. Confirm the query surface can read repository SQL files.
5. Do not call a provider, Edge Function, Storage API, scheduler, or runtime
   catalog write path.

## Step B — PRECHECK_V2

Run the exact PRECHECK_V2 file through the supported internal query-executor
file path. It must return `precheck_pass = true` and all of the following:

- `runtime_products_found = 30`;
- all pre-existing pilot Governance counts are 0;
- every deterministic-ID collision count is 0;
- all expected semantic-collision counts are 0.

If PRECHECK fails, STOP. Do not submit APPLY.

Operational replay safety is **REPLAY-SAFE BY PRECONDITION GUARD**. A second
attempt after a successful seed must stop because PRECHECK detects the pilot,
not silently replay inserts.

## Step C — APPLY capability and execution

Submit the exact APPLY V1 file through the supported repository-file execution
path. The first attempt is also the capability check for query-executor DML.

- The file is INSERT-only.
- It inserts exactly 2 source documents, 61 evidence rows, 30 content rows,
  31 assets, 31 links, 10 issues, 30 Governance-state rows, and 4 audit rows.
- It inserts 0 attribute definitions, 0 attribute values, 0 models, 0
  memberships, and 0 approvals.
- It does not use random IDs, DDL, updates, deletes, network calls, Storage,
  provider calls, or runtime catalog tables.
- It is **compensatable, not assumed atomic**. The query surface may execute
  statements without a multi-statement transaction.
- Do not retry APPLY automatically and do not submit it a second time.

If the executor rejects DML before any INSERT, classify the result as
`QUERY_EXECUTOR_DML_UNAVAILABLE`, STOP, and return for architectural decision.
Do not fall back automatically to a migration tool and do not create
`drizzle/migrations/0007*`.

## Step D — POSTCHECK

Run the exact POSTCHECK V1 file through the same internal query surface. It must
return `postcheck_pass = true` and prove:

- every expected row matches the payload field-by-field;
- all deterministic IDs are present exactly once;
- counts are 2/61/30/31/31/10/30/4;
- Governance states are 20 `NEEDS_REVIEW`, 10 `BLOCKED`, 0 `EDITORIAL_READY`;
- 30 canonical product IDs are represented exactly once;
- duplicate product count is 0;
- all expected FK relationships are valid;
- models, memberships, approvals, and scoped attribute values remain 0;
- no unexpected pilot IDs exist.

If POSTCHECK passes, continue to live QA. Do not run APPLY again.

## Step E — same-session recovery

If APPLY partially executes and then errors, first run a read-only partial-state
inspection. Execute the approved ROLLBACK V1 file in the same Lovable session
only if all conditions hold:

1. every detected inserted row belongs to an explicit deterministic pilot ID;
2. no unrelated Governance row changed during the session;
3. the rollback file hash equals the approved manifest hash;
4. FK-safe reverse ordering is preserved.

After rollback, run the PRECHECK-equivalent zero-state verification. If any
condition is uncertain, STOP and report; do not broaden the delete scope.

If POSTCHECK fails after an apparently successful APPLY, inspect first. Do not
automatically retry. Roll back only when the same deterministic and
no-unrelated-change conditions are proven.

## Step F — live QA after POSTCHECK PASS

Read-only QA only:

- Governance console queue: PASS;
- detail for one `PHASE_3_READY`, one `NO_VALID_MASTER`, and one
  `BANK_MATCH_REVIEW_REQUIRED` product;
- sources/evidence, content, assets, issues, and Governance state visible and
  consistent;
- D4 `readiness_row_count = distinct_product_count`;
- D4 `duplicate_product_count = 0`.

Record current values. Confirm unchanged runtime authorities:

- catalog product data;
- pricing;
- stock;
- publication/visibility;
- images and mappings;
- Storage;
- provider data and schedulers.

No provider call, Storage upload, frontend change, or runtime catalog mutation
is authorized by this operation.

## Step G — final report

Report the internal query-executor operation identifier, artifact hashes, actual
counts, PRECHECK/POSTCHECK results, whether DML was accepted, whether rollback
was required, and live-QA evidence. State explicitly that this was a controlled
Governance seed and not a schema migration.

After PASS, Work may document the execution in the canonical state. Do not
update `docs/MASTER-STATE.md` as part of this package preparation.

## Capability and safety gates

Current capability state:

- SELECT file execution: **CONFIRMED**;
- INSERT file execution: **NOT YET TESTED**.

The next step is one Lovable session only:

`HASH VERIFY → PRECHECK_V2 → only if PASS, APPLY_V1 → POSTCHECK_V1 → LIVE QA`.

No automatic retry, second APPLY, migration fallback, or `0007` migration is
permitted.

## Forbidden actions

- No external Supabase project, CLI, dashboard, login, or link.
- No migration tool fallback and no `0007` migration.
- No schema, journal, snapshot, frontend, backend, Edge Function, Storage,
  scheduler, provider, stock, pricing, mapping, category, visibility, or
  publication changes.
- No automatic retry, second apply, broad rollback, or silent conflict ignore.

DB execution for this checkpoint: `0`.
Lovable execution for this checkpoint: `0`.
