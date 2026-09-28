import { describe, expect, it } from "vitest";
import { captureMessage, createOpportunityState, createProductLine, findRequestedVariant, handoffReasons,
  migrateOpportunityState, rejectProduct, removeProductLine, replaceProductLine, restoreProductLine,
  selectProduct, selectedLineProduct, selectedProduct, setProductLineCandidates, setProductLineColor,
  setProductLinePersonalization, updateProductLineQuantity, updateQuantity, type AgentProduct } from "./agent-state";
import { recommendProducts } from "./agent-tools";

const product = (id: string, price: number): AgentProduct => ({
  id, sku: `SKU-${id}`, name: `Libreta ${id}`, imageUrl: `https://example.com/${id}.jpg`,
  productUrl: `/?view=pdp&product=${id}`, color: null, variants: [],
  observedStock: 100, stockStatus: "observed", quantity: 50, state: "considering",
  price: { status: "priced", currency: "MXN", unitPriceBeforeTaxMxn: price,
    minimumQuantity: 1, pricingGenerationId: "test", requestedQuantity: 50, isValidQuantity: true },
});

describe("Super Agente QA structured state", () => {
  it("extracts the initial 50 notebook request without guessing a product", () => {
    const state = captureMessage(createOpportunityState("session"), "Quiero 50 libretas para un evento corporativo");
    expect(state.opportunity).toMatchObject({ productInterest: "libreta", quantity: 50, eventType: "corporativo" });
    expect(state.products).toEqual([]);
  });
  it("keeps context and understands a direct city answer", () => {
    const state = createOpportunityState("session");
    state.opportunity = { productInterest: "libreta", quantity: 50 };
    state.products = [{ ...product("a", 20), state: "selected" }];
    expect(captureMessage(state, "Monterrey").opportunity.deliveryCity).toBe("Monterrey");
  });
  it("accepts a quantity-only answer to the quantity question", () => {
    const state = createOpportunityState("session");
    state.opportunity.productInterest = "libreta";
    expect(captureMessage(state, "50").opportunity.quantity).toBe(50);
  });
  it("understands a changed quantity in the natural follow-up", () => {
    const state = captureMessage(createOpportunityState("session"), "Quiero 50 libretas para un evento corporativo");
    expect(captureMessage(state, "Mejor cotízame 80.").opportunity.quantity).toBe(80);
  });
  it("matches an observed Royal Blue variant when the buyer asks for azul", () => {
    expect(findRequestedVariant([{ color: "Royal Blue", stock: 6010 }], "azul"))
      .toEqual({ color: "Royal Blue", stock: 6010 });
  });
  it("selects and replaces a product, preserving other candidates", () => {
    const state = createOpportunityState("session");
    state.products = [product("a", 20), product("b", 30)];
    const first = selectProduct(state, "a");
    expect(selectedProduct(first)?.id).toBe("a");
    expect(selectedProduct(selectProduct(first, "b"))?.id).toBe("b");
    expect(selectedProduct(rejectProduct(first, "a"))).toBeNull();
  });
  it("invalidates product price and stock evidence after changing quantity", () => {
    const state = createOpportunityState("session");
    state.products = [product("a", 20)];
    const changed = updateQuantity(state, 80);
    expect(changed.opportunity.quantity).toBe(80);
    expect(changed.products).toEqual([]);
  });
  it("never fabricates three recommendation tiers from fewer products", () => {
    expect(recommendProducts([product("a", 20)])).toHaveLength(1);
    expect(recommendProducts([product("a", 20), product("b", 30)])).toHaveLength(2);
  });
  it("does not label equal-price color variants as separate price tiers", () => {
    const recommendations = recommendProducts([product("a", 20), product("b", 30), product("c", 30)]);
    expect(recommendations.map((item) => item.label)).toEqual(["Económica", "Alternativa"]);
  });
  it("does not recommend an unpriced or insufficient-stock item", () => {
    const unpriced = product("a", 20);
    unpriced.price = { ...unpriced.price, status: "request_quote", unitPriceBeforeTaxMxn: null };
    const insufficient = { ...product("b", 30), observedStock: 10 };
    expect(recommendProducts([unpriced, insufficient])).toEqual([]);
  });
  it("requires human review for uncertain price, stock and personalization", () => {
    const state = createOpportunityState("session");
    const p = product("a", 20);
    p.state = "selected";
    p.price = { ...p.price, status: "request_quote", unitPriceBeforeTaxMxn: null };
    p.observedStock = null;
    p.stockStatus = "unknown";
    state.products = [p];
    state.art.technicalReviewRequired = true;
    expect(handoffReasons(state)).toEqual(expect.arrayContaining([
      "Precio request_quote", "Stock no observado", "Personalización sujeta a revisión técnica",
    ]));
  });
  it("captures requests for a human and logo without claiming it was uploaded", () => {
    const state = captureMessage(createOpportunityState("session"), "Quiero hablar con un asesor y poner mi logo");
    expect(state.commercial.humanReviewReasons).toContain("Cliente solicita asesor");
    expect(state.art.technicalReviewRequired).toBe(true);
    expect(state.art.logoReceived).toBe(false);
  });

  it("keeps product lines, selections, prices and stock independent", () => {
    let state = createOpportunityState("session");
    state = createProductLine(state, "libreta", 50, "line-notebook");
    state = setProductLineCandidates(state, "line-notebook", [product("book", 20)]);
    state = selectProduct(state, "book", "line-notebook");
    state = createProductLine(state, "termo", 80, "line-thermos");
    const bottle = product("bottle", 35);
    state = setProductLineCandidates(state, "line-thermos", [{ ...bottle, quantity: 80,
      price: { ...bottle.price, requestedQuantity: 80 } }]);
    state = selectProduct(state, "bottle", "line-thermos");

    const changed = updateProductLineQuantity(state, "line-thermos", 100);
    expect(changed.productLines[0]).toMatchObject({ quantity: 50, status: "selected", selectedProductId: "book" });
    expect(changed.productLines[0].candidates[0].price.requestedQuantity).toBe(50);
    expect(changed.productLines[1]).toMatchObject({ quantity: 100, status: "considering", candidates: [] });
    expect(changed.productLines[1].selectedProductId).toBe("bottle");
  });

  it("removes, restores and replaces only the addressed line", () => {
    let state = createOpportunityState("session");
    state = createProductLine(state, "libreta", 50, "book-line");
    state = setProductLineCandidates(state, "book-line", [product("book", 20)]);
    state = selectProduct(state, "book", "book-line");
    state = createProductLine(state, "bolsa", 100, "bag-line");
    state = setProductLineCandidates(state, "bag-line", [product("bag", 30)]);
    state = selectProduct(state, "bag", "bag-line");
    const removed = removeProductLine(state, "bag-line");
    expect(removed.productLines[1]).toMatchObject({ status: "removed", selectedProductId: "bag" });
    expect(selectedLineProduct(removed.productLines[0])?.id).toBe("book");
    const restored = restoreProductLine(removed, "bag-line");
    expect(restored.productLines[1]).toMatchObject({ status: "considering", candidates: [], selectedProductId: null });
    const replaced = replaceProductLine(restored, "bag-line", "termo", 120);
    expect(replaced.productLines[1]).toMatchObject({ lineId: "bag-line", productInterest: "termo", quantity: 120, candidates: [], status: "considering" });
    expect(replaced.productLines[0]).toMatchObject({ productInterest: "libreta", selectedProductId: "book", status: "selected" });
  });

  it("applies color and personalization only to the selected product line", () => {
    let state = createOpportunityState("session");
    state = createProductLine(state, "libreta", 50, "book-line");
    const book = { ...product("book", 20), variants: [{ color: "Royal Blue", stock: 75 }] };
    state = setProductLineCandidates(state, "book-line", [book]);
    state = selectProduct(state, "book", "book-line");
    state = createProductLine(state, "bolsa", 80, "bag-line");
    state = setProductLineCandidates(state, "bag-line", [product("bag", 30)]);
    state = selectProduct(state, "bag", "bag-line");
    state = setProductLineColor(state, "book-line", "azul");
    state = setProductLinePersonalization(state, "book-line", "Libreta con logo del evento");
    state = setProductLinePersonalization(state, "bag-line", "Bolsas sin impresión");
    expect(state.productLines[0]).toMatchObject({ color: "Royal Blue", selectedVariant: "Royal Blue", personalizationStatus: "requested_review" });
    expect(selectedLineProduct(state.productLines[0])).toMatchObject({ color: "Royal Blue", observedStock: 75 });
    expect(state.productLines[1]).toMatchObject({ color: null, personalizationStatus: "no_print_requested" });
  });

  it("migrates a stored v1 single-product session without losing its selected candidate", () => {
    const legacy = createOpportunityState("session");
    const selected = { ...product("book", 20), state: "selected" as const };
    const migrated = migrateOpportunityState({ ...legacy, schemaVersion: 1,
      opportunity: { productInterest: "libreta", quantity: 50, color: null }, products: [selected] });
    expect(migrated?.productLines).toHaveLength(1);
    expect(migrated?.schemaVersion).toBe(2);
    expect(selectedLineProduct(migrated!.productLines[0])?.id).toBe("book");
  });
});
