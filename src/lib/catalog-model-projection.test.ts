import { describe, expect, it } from "vitest";

import {
  hasModelResults,
  hasOnlyModelResults,
  isCatalogModelProjectionPayload,
  modelProjectionToCatalogCard,
  projectionToCatalogCard,
  projectionImageUrls,
} from "@/lib/catalog-model-projection";

describe("model-level catalog projection adapter", () => {
  it("accepts only explicit model results and preserves the variant count", () => {
    const row = {
      result_grain: "MODEL_RESULT",
      result_id: "model-id",
      model_key: "G4_EBC_TRN",
      canonical_model_name: "Modelo EBC",
      default_producto_b2b_id: "product-id",
      eligible_variant_count: 11,
      variants: [{ producto_b2b_id: "product-id", sku: "EBC-TRN-A", public_eligible: true }],
      representative_image: { url: "https://example.test/model.webp" },
      card_price: { status: "priced", amount_mxn: 18.5, currency: "MXN" },
      card_moq: 100,
      category: { slug: "escritura", name: "Escritura" },
      relevance: 120,
      total_count: 104,
    };

    expect(hasOnlyModelResults([row])).toBe(true);
    expect(hasModelResults([row])).toBe(true);
    expect(modelProjectionToCatalogCard(row)).toMatchObject({
      id: "product-id",
      model_key: "G4_EBC_TRN",
      eligible_variant_count: 11,
      precio_desde_mxn: 18.5,
      categoria_slug: "escritura",
    });
  });

  it("rejects the current variant fallback as a model result", () => {
    const row = {
      result_grain: "VARIANT_RESULT",
      result_id: "product-id",
      default_producto_b2b_id: "product-id",
      selected_variant_sku: "SKU-1",
      canonical_model_name: "Producto legacy",
      representative_image: { value: ["https://example.test/a.webp"] },
      card_price: { status: "request_quote", amount_mxn: null, currency: "MXN" },
      category: null,
      card_moq: null,
    };
    expect(hasOnlyModelResults([row])).toBe(false);
    expect(hasModelResults([row])).toBe(false);
    expect(projectionToCatalogCard(row)).toMatchObject({ id: "product-id", model_key: null });
  });

  it("keeps a valid V2 page made only of standalone variants authoritative", () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({
      result_grain: "VARIANT_RESULT",
      result_id: `product-${index}`,
      default_producto_b2b_id: `product-${index}`,
      selected_variant_sku: `SKU-${index}`,
      canonical_model_name: "Standalone product",
      representative_image: { value: [`https://example.test/${index}.webp`] },
      card_price: { status: "request_quote", amount_mxn: null, currency: "MXN" },
      category: null,
      card_moq: null,
      total_count: 1340,
    }));

    expect(isCatalogModelProjectionPayload(rows)).toBe(true);
    expect(rows.map(projectionToCatalogCard)).toHaveLength(24);
    expect(projectionToCatalogCard(rows[0])?.total_count).toBe(1340);
  });

  it("rejects a malformed projection payload so the caller can use the safe fallback", () => {
    expect(isCatalogModelProjectionPayload([{ result_grain: "UNKNOWN_RESULT" }])).toBe(false);
    expect(isCatalogModelProjectionPayload(null)).toBe(false);
  });

  it("normalizes representative and variant image shapes without inventing URLs", () => {
    expect(projectionImageUrls({ url: "https://example.test/a.webp" })).toEqual([
      "https://example.test/a.webp",
    ]);
    expect(projectionImageUrls({ url: null })).toEqual([]);
    expect(projectionImageUrls({ value: ["https://example.test/value.webp"] })).toEqual([
      "https://example.test/value.webp",
    ]);
  });
});
