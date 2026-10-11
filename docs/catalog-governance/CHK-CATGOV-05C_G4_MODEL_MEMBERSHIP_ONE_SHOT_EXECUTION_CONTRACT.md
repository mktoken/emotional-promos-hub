# CHK-CATGOV-05C-A — One-Shot Lovable Internal Execution Contract

**Status:** preparation only; do not execute from this checkpoint
**Mode:** data-only Governance seed
**Baseline:** `2f55f4d505750a58e79a0b496d9c67531c4b8419`

## Execution boundary

When separately authorized, run this package only through the Lovable internal database query executor for the project. Do not use external Supabase, the Supabase CLI, a service-role connection, a provider endpoint, a runtime function, or a second database connection.

The only permitted write tables are:

- `public.catalog_product_models`
- `public.catalog_product_model_members`

No other table or surface may be written. This seed does not approve a model, variant, image, right, quality issue, content record, product, offer, stock state, price, mapping, visibility state, or public catalog record.

## Exact controlled sequence

1. Verify the SHA-256 values in `CHK-CATGOV-05C_G4_MODEL_MEMBERSHIP_HASH_MANIFEST_V1.md` for every listed artifact.
2. Run `CHK-CATGOV-05C_G4_MODEL_SEED_PRECHECK_V2.sql` in read-only mode.
3. Continue only when the single precheck result has `ready_to_apply = true` and `state = READY`.
4. If the precheck returns `state = ALREADY_APPLIED`, skip APPLY and run POSTCHECK only.
5. If `ready_to_apply = false` for any other state, stop. Do not retry, repair, reinterpret, or apply partial data.
6. When `ready_to_apply = true`, run `CHK-CATGOV-05C_G4_MODEL_MEMBERSHIP_APPLY_V1.sql` exactly once. It inserts models before memberships and uses `ON CONFLICT DO NOTHING`; it never overwrites an existing row.
7. Run `CHK-CATGOV-05C_G4_MODEL_SEED_POSTCHECK_V2.sql`.
8. Accept the seed only if all required postcheck rows are `PASS` and the exact counts are models `8`, memberships `18`, unique products `18`, family differences `0`, orphan memberships `0`, assignment conflicts `0`, duplicate active memberships `0`, and operation-scoped unexpected rows `0`.

## Fail-safe behavior

- Do not run APPLY when PRECHECK is `BLOCKED` or `ALREADY_APPLIED`.
- Do not use a destructive upsert, broad cleanup, name-based delete, provider-wide delete, or dynamic SKU/colour inference.
- Do not run rollback unless APPLY became partial or POSTCHECK proves the state is unsafe.
- If rollback is separately authorized, run `CHK-CATGOV-05B_G4_MODEL_SEED_ROLLBACK_V1.sql` only after review. It deletes memberships first, then models, by deterministic IDs and seed reason, and must stop on protected/reviewed/dependent rows.
- Do not retry after a schema, permission, constraint, or policy error without a new review.

## Required report from the executor

Return the raw non-sensitive result summaries for:

- hash reconciliation;
- PRECHECK state and `ready_to_apply`;
- model rows inserted, if any;
- membership rows inserted, if any;
- POSTCHECK counts and family counts;
- blocker-preservation boundary;
- any error or stop reason.

Do not return secrets, credentials, unrelated row contents, or PII.

## Blocker preservation

The 05B states remain independent of model membership. In particular:

- Jello variants with `SOURCE_MASTER_INSUFFICIENT` remain unresolved;
- `imp-neg-oro` remains `NO_VALID_MASTER`;
- `lib-bor-gri` remains `NO_VALID_MASTER`;
- `kbi-tra-ama` remains `BANK_MATCH_REVIEW_REQUIRED` / `KEEP_SEPARATE`.

Membership creation is not `APPROVED`, `EDITORIAL_READY`, `PUBLIC_READY`, or `MASTER_APPROVED`.

## Version note

05B artifacts remain unchanged. This 05C package adds `PRECHECK_V2` because the certified 05B precheck did not expose the required explicit `READY_TO_APPLY` result. It adds `POSTCHECK_V2` because the certified 05B postcheck did not expose all required operation-scoped unexpected-row, exact family-count, and blocker-boundary outputs. No correction was silently applied to a certified 05B file.

**Next checkpoint only:** `CHK-CATGOV-05C-B — CONTROLLED GOVERNANCE MODEL/MEMBERSHIP SEED EXECUTION`.
