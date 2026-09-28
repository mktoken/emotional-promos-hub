import { describe, expect, it } from "vitest";
import { captureMessage, createOpportunityState, findRequestedVariant, handoffReasons, rejectProduct,
  selectProduct, selectedProduct, updateQuantity, type AgentProduct } from "./agent-state";
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
});
