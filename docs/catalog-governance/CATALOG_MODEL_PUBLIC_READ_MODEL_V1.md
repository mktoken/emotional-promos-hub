# Catalog Model Public Read Model V1

This document defines the compact response contract proposed in CHK-CATGOV-05E.
It is not SQL, a migration, or a production implementation.

## List/search response

The future catalog_search_model_projection_v1 RPC should return one row per
public result with this shape:

    result_grain: MODEL | PRODUCT_VARIANT
    result_id: stable projection identifier
    model_id: uuid | null
    model_key: text | null
    canonical_model_name: text
    default_producto_b2b_id: uuid
    selected_variant_sku: text | null
    selected_variant_value: text | null
    eligible_variant_count: integer
    variants: jsonb[]
    representative_image: jsonb | null
    card_price: jsonb | null
    card_moq: integer | null
    availability: available | request_quote | unavailable
    category: jsonb
    search_match: jsonb | null
    relevance: numeric | null
    total_count: integer
    projection_version: text

## Variant summary

    {
      "producto_b2b_id": "uuid",
      "sku": "exact SKU",
      "variant_type": "COLOR",
      "variant_value": "AZUL",
      "image": {
        "status": "PUBLIC_READY",
        "role": "VARIANT_MASTER",
        "url": "approved asset URL"
      },
      "price": {
        "status": "priced",
        "currency": "MXN",
        "unit_before_tax": 0,
        "pricing_generation_id": "uuid"
      },
      "minimum_quantity": 0,
      "stock_status": "disponible",
      "public_eligible": true,
      "technical_differences": {}
    }

Provider names, raw feeds, secret material and private Governance evidence are
not public fields. Offer resolution remains backend-only.

## Detail response

get_model_projection_detail_v1(model_key, variant_sku) should return the same
model identity plus the exact selected variant. A missing or blocked SKU must
fail safely; it must not fall back to a sibling variant.

## Eligibility invariants

- MODEL requires an approved model and at least one eligible confirmed member.
- PRODUCT_VARIANT covers standalone or not-yet-grouped public products.
- eligible_variant_count excludes blocked/candidate-only memberships.
- card_price and card_moq always come from one commercial anchor tuple.
- availability is derived from existing product status and stock authorities.
- the contract is read-only and versioned for rollback.
