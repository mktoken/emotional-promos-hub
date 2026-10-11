# CHK-CATGOV-05B — G4 Model + Variant Membership Seed Design

**Mode:** read-only design artifact; no apply SQL

**Baseline:** `910d9ce4915e7455fce321a592557f17458c0f00`

**Scope:** 8 proposed model rows and 18 candidate membership rows from the frozen 05A matrix.

## Boundary

This package defines a deterministic, replay-safe seed and its read-only precheck, postcheck, and bounded rollback design. It is not an apply package. No SQL in this checkpoint is executed.

If later authorized, the apply must be a separate checkpoint and must use:

```text
precheck → exact insert of missing rows only → postcheck
```

No destructive upsert is allowed. An equivalent existing row must never be overwritten merely to make its ID or review metadata match this package.

## Canonical sources

The package uses the exact rows from:

- `CHK-CATGOV-05A_MODEL_VARIANT_STANDARDIZATION.md`
- `CHK-CATGOV-05A_G4_MODEL_VARIANT_MATRIX_V1.csv`
- `CATALOG_MODEL_VARIANT_CONTRACT_V1.md`

The 05A set is frozen at 18 `producto_b2b_id` values and 8 proposed model keys. No SKU was reinterpreted from memory and no additional product was added.

## Schema inspected

The current schema is `supabase/migrations/20261010213800_catalog_governance_shadow_foundation_v1.sql`.

### `catalog_product_models` columns used by the payload

`id`, `model_key`, `label`, `family_key`, `status`, `reason`, `created_by`, `reviewed_by`, `reviewed_at`.

`created_at` and `updated_at` are intentionally omitted so the database defaults can apply during a separately authorized future insert.

### `catalog_product_model_members` columns used by the payload

`id`, `model_id`, `producto_b2b_id`, `oferta_id`, `variant_label`, `membership_status`, `evidence_id`, `reason`, `reviewed_by`, `reviewed_at`.

`created_at` and `updated_at` are intentionally omitted for the same reason. `oferta_id` is `null`: this seed defines model membership, not a provider-offer consolidation.

No invented column is present in the payload, matrix, or SQL checks.

## Deterministic ID algorithm

No established UUID-v5 helper was found in the repository. The package therefore documents one explicit RFC 4122 UUID v5 algorithm:

```text
namespace = UUID_Namespace_DNS
           = 6ba7b810-9dad-11d1-80b4-00c04fd430c8

model_id      = UUIDv5(namespace, "catalog-model-v1:<model_key>")
membership_id = UUIDv5(namespace,
                        "catalog-model-member-v1:<model_key>:<producto_b2b_id>")
```

The exact resulting IDs are frozen in the JSON payload and CSV matrix. Replaying the algorithm produces the same IDs. The algorithm does not call the database and has no random component.

## Model seed decisions

All model rows use `status = REVIEW_REQUIRED`; none is approved by this package.

| Model key | Canonical name | Family key | Decision | Reason boundary |
|---|---|---|---|---|
| `G4_LOBBY` | Lobby | `lobby` | `MODEL_COMPATIBLE` | Prior 05A family decision; color variants remain commercial-specific. |
| `G4_JELLO_COLORS_BIO` | Jello Colors Bio | `jello_colors_bio` | `MODEL_COMPATIBLE` | Exact family/color evidence; weak source images remain separate asset gates. |
| `G4_JELLO_ZEN` | Jello Zen | `jello_zen` | `MODEL_COMPATIBLE` | Exact family/color evidence; weak source images remain separate asset gates. |
| `G4_VASO_NOMI` | Vaso Nomi | `vaso_nomi` | `MODEL_COMPATIBLE` | Certified multi-variant family and explicit color/model evidence. |
| `G4_SPLASH` | Splash | `splash` | `MODEL_COMPATIBLE` | Certified multi-variant family and explicit color/model evidence. |
| `G4_IMPERIAL` | Imperial | `imperial` | `MODEL_COMPATIBLE` | Family identity is supported; gold exact asset remains blocked. |
| `G4_LIBRETA_BORDER` | Libreta Border | `libreta_border` | `MODEL_COMPATIBLE` | Family identity is supported; gray exact asset remains blocked. |
| `G4_KOI_TRA_AMA` | Koi Bio Translúcida Tinta Azul | `koi_tra_ama` | `KEEP_SEPARATE` | Single-member candidate only; bank identity is unresolved. |

## Membership semantics

All 18 rows use `membership_status = CANDIDATE`. This preserves the distinction between model identity and public eligibility.

- `imp-neg-oro` remains `NO_VALID_MASTER`.
- `lib-bor-gri` remains `NO_VALID_MASTER`.
- Jello variants retain their existing weak/source-master limitations.
- `kbi-tra-ama` remains `BANK_MATCH_REVIEW_REQUIRED` and is not inferred into another family.

Membership does not clear image blockers, rights status, technical quality, visual quality, stock, pricing, MOQ, mapping, visibility, or publication gates.

## Precheck contract

The read-only precheck must verify:

1. the two target tables exist;
2. all 18 product IDs exist;
3. all product IDs exactly equal the frozen 05A set;
4. model keys and deterministic IDs are unique;
5. evidence IDs are valid source-evidence references;
6. no deterministic ID is already occupied by a conflicting row;
7. no compatible row exists under a different deterministic ID that would be silently overwritten;
8. no expected product is already assigned to another active/incompatible model;
9. current model/member counts and states are reported without mutation.

Classifications are explicit: `EXACT_MATCH`, `COMPATIBLE_EXISTING`, `CONFLICT`, `UNEXPECTED`, or `NONE`.

## Idempotency and replay

The future apply must insert only absent deterministic IDs after a passing precheck. A second execution must report zero new rows and zero mutations. Existing human-reviewed rows must not be downgraded, renamed, reassigned, or replaced.

## Postcheck contract

The read-only postcheck verifies exact model IDs, exact membership IDs, one expected membership per reviewed product, zero unexpected members, zero duplicate active memberships, zero orphan references, zero incompatible assignments, and exact family membership against the 05A matrix.

It also reports the design projection only:

```text
VARIANT RECORDS: 18
MODEL RECORDS: 8
PROJECTED PUBLIC CARDS: 8
PROJECTED DUPLICATE CARD REDUCTION: 10 / 55.56%
```

These values do not change a public view.

## Bounded rollback contract

The rollback file targets only the 18 deterministic membership IDs and 8 deterministic model IDs in this package. It requires the operation/version token in `reason`, removes memberships before models, and skips rows whose membership/model review status or reason no longer proves that this seed created them. It never deletes by provider, name, family, or broad product criteria.

If a later operation has created dependent content or approved human decisions, the bounded rollback must stop rather than bypass foreign keys or remove reviewed work.

## Image and UX consequences (design only)

Future model-level assets may use `MODEL_MASTER`/`MODEL_ALT`; exact variants may use `VARIANT_MASTER`/`VARIANT_ALT`; `DETAIL` and `LIFESTYLE` remain separate roles. No asset registry or link is changed here.

Future public UX may show one card per eligible model and a PDP variant selector that updates SKU, color, image, price, MOQ, stock, and provider offer. No frontend, search view, or `catalog_search_products_v2` change is made here.

## Provider normalization notes

CDO, StockSur, ForPromotional, G4, and future providers must project into:

```text
PROVIDER SKU → candidate BASE MODEL → VARIANT TYPE → VARIANT VALUE
             → canonical Governance model review
```

SKU prefixes/suffixes remain evidence, never the model authority. No CDO, StockSur, or ForPromotional data or runtime change is included.

## No-write statement

```text
DATABASE WRITES: 0
MODELS CREATED: 0
MEMBERSHIPS CREATED: 0
APPROVALS: 0
ISSUES CHANGED: 0
RUNTIME: 0
STORAGE: 0
PUBLIC CATALOG: 0
LOVABLE: 0
PROVIDER CALLS: 0
```

**Next authorized checkpoint only:** `CHK-CATGOV-05C — CONTROLLED GOVERNANCE MODEL/MEMBERSHIP SEED EXECUTION`.
