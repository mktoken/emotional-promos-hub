import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { catalogTools, loadRealProductById, loadRealProducts, loadVisualCatalogCandidates, planVisualCatalogQueries, type CatalogTools } from "./agent-tools";

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

const candidateRow = (id: string, values: Partial<{
  sku_base: string | null; minimum_quantity: number | null;
  nombre: string | null; descripcion: string | null; categoria_nombre: string | null;
  subcategoria_nombre: string | null;
}> = {}) => ({ id, nombre: "SKU comercial", sku_base: id, minimum_quantity: 1,
  imagenes: null, public_price_status: "priced", descripcion: null,
  categoria_nombre: null, subcategoria_nombre: null, ...values });

const loadCandidates = (query: string, row: ReturnType<typeof candidateRow>) => loadRealProducts(query, 50, tools({
  searchProducts: async () => [row],
  getProductDetails: async (id) => ({ id, id_interno: id, sku_base: id,
    datos_generales: { modelo_comercial: row.nombre }, variantes: [], imagenes: null, activo: true }),
}));

describe("Super Agente catalog tools", () => {
  afterEach(() => vi.restoreAllMocks());
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
  it("returns null-quantity visual candidates without detail, stock, or pricing calls", async () => {
    const calls: Array<[string, number | null]> = [];
    let detailCalls = 0;
    let priceCalls = 0;
    const rows = [
      candidateRow("ab296a25-8ccc-44a9-9e2b-8411a401b77b", { nombre: "CONCA", sku_base: "CONCA", descripcion: "Taza de ceramica.", minimum_quantity: 21 }),
      candidateRow("08dcd02c-5e8c-4099-8f18-f326e36641d2", { nombre: "TOKAI", sku_base: "TOKAI", descripcion: "Taza de ceramica corrugada.", minimum_quantity: 20 }),
      candidateRow("3f0c42c4-71c8-4195-90f5-8a2f3c730aca", { nombre: "MOKA", sku_base: "MOKA", descripcion: "Taza de acero inoxidable.", minimum_quantity: 17 }),
    ];
    const results = await loadVisualCatalogCandidates("taza", tools({
      searchProductsExact: async (query, quantity) => { calls.push([query, quantity]); return rows; },
      getProductDetails: async () => { detailCalls++; return null; },
      getAuthoritativePrice: async () => { priceCalls++; return price; },
    }));
    expect(calls).toEqual([["taza", null]]);
    expect(results.map(({ name }) => name)).toEqual(["CONCA", "TOKAI", "MOKA"]);
    expect(results.map(({ minimumQuantity }) => minimumQuantity)).toEqual([21, 20, 17]);
    expect(results.every((candidate) => candidate.quantity === null && candidate.price === null
      && candidate.pricingStatus === "pending_quantity" && candidate.status === "considering")).toBe(true);
    expect(detailCalls).toBe(0);
    expect(priceCalls).toBe(0);
  });
  it("does not search visual catalog when the criteria are null", async () => {
    let calls = 0;
    const result = await loadVisualCatalogCandidates(null, tools({
      searchProductsExact: async () => { calls++; return []; },
    }));
    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
  it.each([
    [null, ["CONCA"]],
    [50, ["CONCA"]],
    [10, []],
    [1, []],
  ] as const)("applies MOQ only to known quantity %s", async (quantity, expected) => {
    const rows = [candidateRow("CONCA", { nombre: "CONCA", descripcion: "Taza de ceramica.", minimum_quantity: 21 })];
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: rows, error: null } as never);
    const result = await catalogTools.searchProductsExact!("taza", quantity);
    expect(result.map((row) => row.nombre)).toEqual(expected);
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
  it.each([
    ["CONCA", "Taza de ceramica."],
    ["TOKAI", "Taza de ceramica corrugada."],
    ["MOKA", "Taza de acero inoxidable acabado mate y asa de plástico."],
  ])("retains a generic commercial SKU when its product description identifies it as a taza (%s)", async (name, description) => {
    const result = await loadCandidates("taza", candidateRow(name, { nombre: name, descripcion: description }));
    expect(result.map((item) => item.id)).toEqual([name]);
    expect(result[0].state).toBe("considering");
  });
  it("uses an authoritative catalog category label to retain a candidate", async () => {
    const result = await loadCandidates("taza", candidateRow("CATALOG-TAXONOMY", {
      nombre: "CONCA", categoria_nombre: "Bebidas", subcategoria_nombre: "Tazas promocionales",
    }));
    expect(result.map((item) => item.id)).toEqual(["CATALOG-TAXONOMY"]);
  });
  it("rejects an incidental category word later in an unrelated product description", async () => {
    const result = await loadCandidates("taza", candidateRow("OTHER", {
      nombre: "Llavero", descripcion: "Llavero metálico ideal para acompañar tu taza.",
      categoria_nombre: "Accesorios",
    }));
    expect(result).toEqual([]);
  });
  it("handles null description and category fields without crashing", async () => {
    const result = await loadCandidates("taza", candidateRow("NULL-FIELDS", {
      nombre: "MUG-01", descripcion: null, categoria_nombre: null, subcategoria_nombre: null,
    }));
    expect(result.map((item) => item.id)).toEqual(["NULL-FIELDS"]);
  });
  it("matches case-insensitively, normalizes accents, and accepts the existing mug alias", async () => {
    const result = await loadCandidates("taza", candidateRow("MUG-ACCENT", {
      nombre: "MUG-ACCENT", descripcion: "MUG térmico de cerámica.", categoria_nombre: null,
    }));
    expect(result.map((item) => item.id)).toEqual(["MUG-ACCENT"]);
    const accented = await loadCandidates("libreta", candidateRow("ACCENT-NOTEBOOK", {
      nombre: "SKU-42", descripcion: "LIBRÉTA de notas.",
    }));
    expect(accented.map((item) => item.id)).toEqual(["ACCENT-NOTEBOOK"]);
  });
  it.each([
    ["libreta", "Cuaderno de pasta rígida."],
    ["termo", "Cilindro de acero inoxidable."],
    ["bolsa", "Tote de algodón reutilizable."],
  ])("retains existing category behavior for %s based on catalog description", async (query, description) => {
    const result = await loadCandidates(query, candidateRow(`REAL-${query}`, {
      nombre: `SKU-${query}`, descripcion: description,
    }));
    expect(result.map((item) => item.id)).toEqual([`REAL-${query}`]);
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
