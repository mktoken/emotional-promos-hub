import { describe, expect, it } from "vitest";
import { loadRealProducts, type CatalogTools } from "./agent-tools";

const price = {
  status: "priced" as const, currency: "MXN", unitPriceBeforeTaxMxn: 29.5,
  minimumQuantity: 1, pricingGenerationId: "QA", requestedQuantity: 50, isValidQuantity: true,
};
const tools = (overrides: Partial<CatalogTools> = {}): CatalogTools => ({
  searchProducts: async () => [{ id: "real-1", nombre: "Libreta real", sku_base: "REAL-1",
    minimum_quantity: 1, imagenes: null, public_price_status: "priced" }],
  getProductDetails: async () => ({ id: "real-1", id_interno: "REAL-1", sku_base: "REAL-1",
    datos_generales: { modelo_comercial: "Libreta real" },
    variantes: [{ color_nombre: "Azul", stock_total: null }], imagenes: null, activo: true }),
  getProductVariants: async () => [],
  getProductStock: async () => ({ observedStock: null, status: "unknown" }),
  getProductImages: async () => [],
  getProductUrl: (id) => `/?view=pdp&product=${id}`,
  getAuthoritativePrice: async () => price,
  findSimilarProducts: async () => [],
  ...overrides,
});

describe("Super Agente catalog tools", () => {
  it("preserves missing image and stock instead of inventing them", async () => {
    const result = await loadRealProducts("libreta", 50, tools());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "real-1", imageUrl: null, observedStock: null,
      stockStatus: "unknown", productUrl: "/?view=pdp&product=real-1" });
    expect(result[0].price).toEqual(price);
  });
  it("returns no candidates when the catalog has none", async () => {
    expect(await loadRealProducts("libreta", 50, tools({ searchProducts: async () => [] }))).toEqual([]);
  });
  it("surfaces a catalog failure", async () => {
    await expect(loadRealProducts("libreta", 50, tools({ searchProducts: async () => { throw new Error("RPC unavailable"); } })))
      .rejects.toThrow("RPC unavailable");
  });
  it("does not return an unverified product if all price checks fail", async () => {
    await expect(loadRealProducts("libreta", 50, tools({ getAuthoritativePrice: async () => { throw new Error("price unavailable"); } })))
      .rejects.toThrow("No se pudieron verificar");
  });
});
