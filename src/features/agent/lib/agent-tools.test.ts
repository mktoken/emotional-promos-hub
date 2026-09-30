import { describe, expect, it } from "vitest";
import { loadRealProductById, loadRealProducts, planVisualCatalogQueries, type CatalogTools } from "./agent-tools";

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
  it("plans the canonical category first and keeps visual terms in separate queries", () => {
    expect(planVisualCatalogQueries("taza taza con cuerpo asa taza blanco o gris claro rojo"))
      .toEqual(["taza", "taza blanco gris claro rojo"]);
  });
  it("caps visual retrieval at three unique queries and removes generic structural words", () => {
    const planned = planVisualCatalogQueries("taza taza con cuerpo asa taza con borde tapa taza exterior interior rojo azul");
    expect(planned[0]).toBe("taza");
    expect(planned.length).toBeLessThanOrEqual(3);
    expect(new Set(planned).size).toBe(planned.length);
    expect(planned.slice(1).join(" ")).not.toMatch(/cuerpo|asa|borde|tapa|exterior|interior/i);
  });
  it.each([
    ["libreta", ["libreta", "cuaderno"]],
    ["termo", ["termo", "termos", "cilindro"]],
    ["bolsa", ["bolsa", "bolsas"]],
  ])("keeps the existing deterministic expansions for %s", (query, expected) => {
    expect(planVisualCatalogQueries(query)).toEqual(expected);
  });
  it("does not query when visual criteria are null", async () => {
    let calls = 0;
    const result = await loadRealProducts(null, 50, tools({ searchProducts: async () => { calls++; return []; } }));
    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
  it("retrieves category first, deduplicates real candidates and stops after enough results", async () => {
    const calls: string[] = [];
    const rows = Array.from({ length: 12 }, (_, index) => ({ id: `real-${index}`, nombre: `Taza ${index}`, sku_base: `T-${index}`, minimum_quantity: 1, imagenes: null, public_price_status: "priced" }));
    const result = await loadRealProducts("taza taza con cuchara taza rojo", 50, tools({
      searchProductsExact: async (query) => { calls.push(query); return [...rows, rows[0]]; },
      getProductDetails: async (id) => ({ id, id_interno: id, sku_base: id, datos_generales: { modelo_comercial: id }, variantes: [], imagenes: null, activo: true }),
    }));
    expect(calls).toEqual(["taza"]);
    expect(result.map((product) => product.id)).toEqual(rows.map((row) => row.id));
    expect(result.every((product) => product.state === "considering")).toBe(true);
  });
  it("uses up to three separate queries when earlier searches return too few candidates", async () => {
    const calls: string[] = [];
    await loadRealProducts("taza taza con cuchara taza rojo taza cerámica", 50, tools({
      searchProductsExact: async (query) => { calls.push(query); return []; },
    }));
    expect(calls).toEqual(["taza", "taza cuchara", "taza rojo"]);
    expect(calls.length).toBeLessThanOrEqual(3);
  });
  it("returns the controlled no-results fallback after exhausting the bounded plan", async () => {
    const calls: string[] = [];
    const result = await loadRealProducts("taza taza con cuchara taza rojo", 50, tools({
      searchProductsExact: async (query) => { calls.push(query); return []; },
    }));
    expect(calls.length).toBeLessThanOrEqual(3);
    expect(result).toEqual([]);
  });
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
  it("revalidates the selected real product and public price for the exact changed quantity", async () => {
    const calls: Array<[string, number]> = [];
    const result = await loadRealProductById("real-1", 80, tools({
      getAuthoritativePrice: async (id, quantity) => {
        calls.push([id, quantity]);
        return { ...price, requestedQuantity: quantity, unitPriceBeforeTaxMxn: 31.25 };
      },
    }));
    expect(calls).toEqual([["real-1", 80]]);
    expect(result).toMatchObject({ id: "real-1", quantity: 80, price: { status: "priced", requestedQuantity: 80, unitPriceBeforeTaxMxn: 31.25 } });
  });
  it("uses the public catalog key when sku_base is absent", async () => {
    const result = await loadRealProductById("real-1", 50, tools({
      getProductDetails: async () => ({ id: "real-1", id_interno: "pp-internal", sku_base: null,
        datos_generales: { modelo_comercial: "Libreta real", clave_producto: "T671" },
        variantes: [], imagenes: null, activo: true }),
    }));
    expect(result?.sku).toBe("T671");
  });
});
