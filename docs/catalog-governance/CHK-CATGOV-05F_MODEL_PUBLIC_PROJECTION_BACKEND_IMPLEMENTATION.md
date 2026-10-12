# CHK-CATGOV-05F — Model Public Projection Backend Implementation

**Mode:** repository implementation only / no live apply
**Status:** implementation package ready for a later controlled deployment
**Baseline:** `2e341955923d30c124c1de01b1e865c4a5436dcf`
**Projection version:** `CATALOG_MODEL_PUBLIC_PROJECTION_V1`

## Scope and safety boundary

This checkpoint adds a versioned backend read model. It does not apply SQL to
the internal Supabase runtime, invoke either RPC, change the public catalog,
or change frontend consumers.

| Surface | Result |
|---|---:|
| Live database writes | 0 |
| RPC live creation | 0 |
| Runtime calls | 0 |
| Provider calls | 0 |
| Frontend changes | 0 |
| Existing public RPCs modified | 0 |
| Existing public views modified | 0 |
| Governance data backfill | 0 |

The established runtime migration path is `supabase/migrations/`. The
repository's `drizzle/schema.ts` is intentionally blank and is not a second
schema authority; no Drizzle journal or snapshot was changed.

## Files

- `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql`
- `src/lib/catalog-model-public-projection-contract.test.ts`
- `docs/catalog-governance/CHK-CATGOV-05F_BACKEND_CONTRACT_TEST_MATRIX_V1.csv`

## Schema change

The migration adds exactly one field to
`public.catalog_product_model_members`:

```text
is_public_default boolean NOT NULL DEFAULT false
```

It also adds a partial unique index on `model_id` where
`is_public_default = true`, so a model can have at most one human-selected
anchor. Existing memberships are not assigned a default. The default flag does
not bypass membership, image, price, stock, or public-eligibility gates.

No automatic choice is made by UUID, row order, SKU order, provider order, or
alphabetical order. A later controlled data operation must explicitly assign a
default after human review.

## Public RPC 1 — search projection

Signature:

```text
public.catalog_search_model_projection_v1(
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_collection_slug text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_moq integer DEFAULT NULL,
  p_max_moq integer DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_material text DEFAULT NULL,
  p_availability text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
```

The RPC returns a mixed, bounded list with these fields:

| Field | Contract |
|---|---|
| `result_grain` | `MODEL_RESULT` or `VARIANT_RESULT` |
| `result_id` | Stable model or product UUID |
| `model_id` / `model_key` | Set only for a model result |
| `canonical_model_name` | Approved model label or current product name |
| `default_producto_b2b_id` | Explicit default product for a model, or standalone product ID |
| `selected_variant_sku` / `selected_variant_value` | Exact query match when present, otherwise the explicit default |
| `eligible_variant_count` | Count of members passing the public gates |
| `variants` | JSON summaries of eligible members only |
| `representative_image` | Approved model/default variant image state |
| `card_price` / `card_moq` | Same product/variant authority context |
| `availability` | Derived from current public eligibility, never a new stock authority |
| `category` | Existing public category/subcategory authority |
| `search_match` | Safe match metadata without provider identity |
| `projection_version` | `CATALOG_MODEL_PUBLIC_PROJECTION_V1` |
| `relevance` / `total_count` | Bounded list semantics |

Standalone rows remain representable. A public-ready model replaces its
eligible grouped members with one model result so the same eligible member is
not returned twice. A model that is not public-ready does not suppress the
existing standalone product projection.

## Public RPC 2 — detail projection

Signature:

```text
public.get_model_projection_detail_v1(
  p_model_key text,
  p_variant_sku text DEFAULT NULL
)
```

The detail response keeps the same model/variant fields and adds
`projection_readiness`. The readiness states are explicit:

- `PUBLIC_READY`
- `NO_ELIGIBLE_VARIANTS`
- `NO_EXPLICIT_DEFAULT`
- `DEFAULT_INELIGIBLE`
- `NOT_PUBLIC_READY`

The public detail response contains only `CONFIRMED` memberships of an
`APPROVED` model. A requested SKU must match a currently eligible member;
otherwise the function returns no row, preventing a blocked variant from
becoming selectable. The detail response does not expose `oferta_id`,
`proveedor_id`, provider names, raw feeds, or Governance evidence.

## Authority composition

The RPCs compose, rather than replace, current authorities:

- `productos_publicos` remains the canonical product-level public gate.
- `producto_b2b_status` supplies the latest product-level stock state.
- `producto_proveedor_ofertas` and `producto_proveedor_stock` are used only to
  resolve a membership's exact offer when the membership has `oferta_id`.
- `catalog_price_v2_current_prices` supplies price, currency, generation, and
  MOQ; there is no cost-times-markup calculation.
- Existing category, subcategory, and collection relations remain authoritative.
- `catalog_product_asset_links` and `catalog_asset_registry` must pass identity,
  technical, visual, rights, and approval gates before an image is represented
  as ready.

### Membership and stock

An eligible model member must be `CONFIRMED`, belong to an `APPROVED` model,
resolve to a current public product, and have an active/available exact offer
when `oferta_id` is present. The member JSON contains `public_eligible`,
`stock_status`, and `stock_qty`; it does not create a model-level stock table.

### Default behavior

Only `is_public_default = true` is accepted as the model anchor, and it must
also be eligible. Missing or ineligible defaults do not fall back to the first
member: the projection remains non-public with an explicit readiness state.
This preserves the 05E requirement for a separate human default decision.

### Image behavior

Image selection follows the approved hierarchy:

1. approved `MODEL` / `MASTER` asset;
2. approved exact default `VARIANT`/`OFFER` / `MASTER` asset;
3. otherwise explicit `NOT_READY` state.

The implementation never treats `SOURCE_MASTER_INSUFFICIENT` or an unapproved
asset as a valid public master, never chooses a random first image, and never
substitutes a wrong-color asset.

### Price and MOQ atomicity

The model card anchor's `card_price` and `card_moq` are read from the same
explicit default product context. Each variant JSON item carries its own price
status/amount and MOQ from that same product context. No sibling variant's MOQ
is combined with another variant's price.

## Security and performance

Both functions are `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, and pin
`search_path = public, pg_temp`. They use no dynamic SQL and contain no DML.
Only `anon` and `authenticated` receive `EXECUTE`; the default/public grant is
revoked first. Provider IDs and private Governance fields are omitted from the
return shape.

The migration includes only access paths justified by this projection:

- one partial unique index for the single default per model;
- one partial membership lookup index for confirmed members.

The projection groups members before pagination, bounds the page to 60 rows,
and uses lateral lookups for the current category, subcategory, price, and
image record rather than modifying the existing search RPC.

## Current G4 representation

The implementation does not make any of the current eight models public by
itself. The current 05E simulation remains authoritative:

| State | Count |
|---|---:|
| READY | 0 |
| PARTIAL | 2 |
| BLOCKED | 5 |
| INSUFFICIENT_EVIDENCE | 1 |

Jello Colors Bio remains one model with three memberships, and Jello Zen one
model with two memberships. Weak source masters remain unresolved. Imperial and
Libreta Border preserve their memberships while blocked/noneligible members
remain excluded from selectable model variants.

## Static validation performed

The contract test file contains 18 static assertions covering model grouping,
standalone representation, gates, default semantics, image readiness, exact
SKU/provider-SKU matching, filters, price/MOQ atomicity, offer resolution,
security, and write absence. No test connects to Supabase or executes SQL.

The next checkpoint may prepare a read-only precheck, apply plan, postcheck,
and rollback package. It must not apply this migration automatically.
