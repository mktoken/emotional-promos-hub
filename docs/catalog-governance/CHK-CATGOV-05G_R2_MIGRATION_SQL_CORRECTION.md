# CHK-CATGOV-05G-R2 — Migration SQL correction

Status: **PRE-DEPLOYMENT CORRECTION / NOT EXECUTED**
Baseline: `15a299812efb7d1214b375aadd6839fed280c5bf`

## Failure record

- Failed deployment: CHK-CATGOV-05G-B2.
- Database error: `42703 column pp.stock_status does not exist`.
- Transaction result: rolled back automatically and completely.
- Database side effects: `0`.
- Schema column after rollback: `is_public_default` absent.
- Projection RPCs after rollback: not deployed.

## Root cause

Both RPC-local `model_members` CTEs joined the physical relation
`public.productos_publicos pp`, while referencing calculated fields that are
defined by the same statement's `public_products` CTE. The physical view does
not expose `stock_status`, `stock_qty`, `product_name`, category fields, or
the other calculated projection fields used by `model_members`.

Static inspection confirmed that each RPC has a `public_products` CTE in the
same `WITH` scope, that the CTE exposes every `pp.*` field referenced by its
`model_members`, and that the intended identity join is preserved:
`pp.id = m.producto_b2b_id`. The replacement does not introduce a cartesian
join or recursive dependency.

## Minimal correction

In the existing canonical migration only, exactly two joins were changed:

```text
LEFT JOIN public.productos_publicos pp
→ LEFT JOIN public_products pp
```

No other SQL behavior, public object, schema object, projection contract,
pricing logic, stock logic, image logic, Governance data, or runtime file was
changed.

## Reference validation

For both `model_members` CTEs:

- referenced calculated `pp.*` columns: all resolved by `public_products`;
- missing columns after correction: `0`;
- incorrect join occurrences before correction: `2`;
- corrected join occurrences: `2`;
- unresolved alias references found: `0`.

The correction preserves the existing CTE ordering, aliases, return columns,
aggregation, filters, price/MOQ atomicity, stock eligibility, image
readiness, and default-variant logic. No local runtime or database execution
was performed.

## Hash transition

- Old canonical migration SHA-256: `b9c78e772203564e13453abbdebe4462dde7c46041a98ceea14b187b52ba7fb4`.
- New corrected canonical migration SHA-256: `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca`.
- Reason the in-place correction is valid: the logical migration was never
  successfully applied; the failed attempt was transactionally rolled back,
  so no applied migration history or runtime schema depended on the failed
  bytes.

## Validation package

- PRECHECK: `CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V2.sql`, unchanged.
- POSTCHECK: `CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V3.sql`, created only
  to replace the two frozen function-body MD5 expectations.
- Rollback: `CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql`, reviewed and
  reused unchanged.
- One-shot contract: `CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT_V3.md`.
- Hash manifest: `CHK-CATGOV-05G_MODEL_PROJECTION_HASH_MANIFEST_V3.md`.
- Canonical logical migrations: `1`.
- Drizzle schema changes: `0`.
- Live DB changes: `0`.
- Lovable execution: `0`.
