# CHK-CATGOV-05H — G4 ACTIVATION PACKAGE V1

**Status:** `PREPARED / NOT APPLIED`

## Scope

This package activates only the records already created by
`20261015110000_g4_model_variant_governance_coverage_v1.sql`:

- 104 G4 models;
- 289 G4 memberships;
- exactly one deterministic public default per model.

The migration creates no model or membership rows and does not touch CDO,
ForPromotional, Pricing V2, stock, mappings, categories, frontend, schedulers,
provider data, Storage, or public product rows.

## Versioned artifacts

- Migration: `supabase/migrations/20261015130000_g4_model_variant_governance_activation_v1.sql`
- Default plan generator: `docs/catalog-governance/data/CHK-CATGOV-G4_DEFAULT_PLAN_V1.sql`
- Human decision source: `docs/catalog-governance/data/CHK-CATGOV-G4_GEOMETRIC_REPLACEMENT_MANIFEST_V1.csv`
- Approved image package: `/Users/macbookpro/Downloads/G4_GEOMFIX_APPROVED_16.zip`

The default-plan query is read-only and produces the required table:

| model_id | model_key | default_product_id | default_provider_sku | default_reason | image_source |
| --- | --- | --- | --- | --- | --- |

The migration stops unless the query can produce exactly 104 rows, one per
G4 model, with a public-eligible product and a valid current asset or official
G4 provider image. Existing valid defaults are preserved; otherwise the order
is approved geomfix, approved catalog master, official G4 fallback, then
lexicographically smallest provider SKU/product ID.

## Activation states

When later applied, the migration changes only:

- G4 `catalog_product_models.status` → `APPROVED`;
- G4 `catalog_product_model_members.membership_status` → `CONFIRMED`;
- G4 `is_public_default` flags → exactly one per model.

The 16 human-approved geometric decisions are recorded in the manifest as
`APPROVED_GEOMFIX`. The five decisions below remain provider fallback and are
not approved as masters:

`jbi-con-neg`, `jbi-con-azu`, `jbi-con-ros`, `jel-zen-aza`, `jel-zen-azu`.

This activation package does not upload or publish any image. Image apply is a
separate, later controlled operation after the 16-file package is revalidated.

## STOP conditions

Stop before any write if any of these is true:

- G4 model count is not 104;
- active G4 membership count is not 289;
- an existing G4 model/member has an unexpected state;
- a model has more than one current default;
- the default plan cannot produce exactly 104 valid defaults;
- a default candidate is not public-eligible or has no valid image source;
- any SQL object required by the projection contract is missing.

## Image package validation

- ZIP image count: 16;
- internal manifest rows: 16;
- SHA-256 matches: 16/16;
- no binary is included in Git;
- runtime upload/publication: not executed.

## Explicit non-actions

No runtime was applied. No image was uploaded. No provider was called. No
database write was performed. No frontend or Lovable action was performed.
