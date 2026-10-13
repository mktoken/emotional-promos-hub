# CHK-CDO-01I — Live Projection Plan (Apply Later, Not Executed)

**Estado:** PLAN DOCUMENTAL / NO EJECUTADO
**Gate:** `CHK-CDO-01I`
**Prerequisito:** evidencia runtime read-only interna de ofertas, mappings, contenido, precio, stock y proyección.

## Authority and target grain

Preserve `model -> variant -> provider offer -> commercial/public projection`. The canonical variant key and master SHA are the source identity; they are not a replacement for a live provider offer or a public product row.

## Read-only preflight required immediately before any future apply

For the exact 97 models / 354 variants, inspect existing runtime rows only:

1. `provider_raw_products` joined to `proveedores` with the CDO provider contract.
2. `producto_proveedor_ofertas` for the provider raw product and variant SKU.
3. `producto_b2b_oferta_map` for offer-to-product mapping.
4. `productos_b2b` for model content, variants and image JSON.
5. `producto_b2b_status` for current public eligibility, image gate, price gate and stock state.
6. `productos_publicos` and the existing `catalog_search_products_v2` read model.
7. `catalog_price_v2_current_prices` plus its current release/generation and provider pricing rules.

No row is eligible for a write if provider offer identity or current public product identity is ambiguous.

## Conditional order of operations

1. Freeze a read-only snapshot and hash the 354-row dry-run input.
2. Resolve exact provider offer and `producto_b2b_id` mapping.
3. Validate content, category, pricing compatibility, stock signal, MOQ/source rule and current public gates.
4. Produce a second changeset with only `NO_CHANGE`, `CREATE_MODEL_PROJECTION`, `CREATE_VARIANT_PROJECTION`, `LINK_PROVIDER_OFFER`, `SET_MASTER_IMAGE` or `UPDATE_MASTER_IMAGE` rows.
5. Require zero ambiguous mappings, zero duplicate masters and explicit approval of the changeset.
6. Apply only through the already approved internal project workflow; never through external Supabase tooling.
7. Re-read all touched relationships and `catalog_search_products_v2` after apply.

## Idempotency

Use the canonical `variant_candidate_key + master_asset_sha` as the deterministic identity for image reconciliation. Do not create duplicate provider offers or mappings. Existing rows must be compared before any update, and an unchanged exact match must remain `NO_CHANGE`.

## Pricing dependencies

Do not calculate prices in the frontend. Price readiness must come from the existing Pricing V2 release/current-price path and the applicable `provider_pricing_rules`; a missing or stale current price remains a commercial blocker. No cache generation or publication belongs to this dry run.

## Content dependencies

Descriptions, specifications, material, dimensions/capacity, available variants, category and customization data must come from existing provider raw evidence or an approved normalized content source. Do not fabricate missing values.

## Rollback and batching

Use a recorded inverse changeset keyed by exact IDs and the pre-apply SHA/state. Apply in small reviewed batches; stop on any identity or postcondition mismatch. Roll back only the exact rows created or changed by the approved apply, never by broad provider or model criteria.

## Current decision

This plan is not executable yet because the internal read-only runtime evidence channel was unavailable during CHK-CDO-01I. No rows, images, prices, stock or mappings were changed.
