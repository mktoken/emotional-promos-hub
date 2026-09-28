import { describe, expect, it } from "vitest";
import { createOpportunityState, createProductLine, selectProduct, setProductLineCandidates, setProductLinePersonalization } from "./agent-state";
import { buildDraftQuotePlan, planDraftQuoteReconciliation } from "./agent-quote";
import type { AgentProduct } from "./agent-state";

function pricedProduct(id: string, quantity: number, unitPrice: number): AgentProduct {
  return { id, sku: `SKU-${id}`, name: `Producto ${id}`, imageUrl: null, productUrl: `/product/${id}`,
    color: null, variants: [], observedStock: quantity * 3, stockStatus: "observed", quantity, state: "considering",
    price: { status: "priced", currency: "MXN", unitPriceBeforeTaxMxn: unitPrice, minimumQuantity: 1,
      pricingGenerationId: "v2-generation", requestedQuantity: quantity, isValidQuantity: true } };
}

function selectedState() {
  let state = createOpportunityState("qa-session");
  state = createProductLine(state, "libreta", 80, "line-book");
  state = setProductLineCandidates(state, "line-book", [pricedProduct("book", 80, 42.63)]);
  state = selectProduct(state, "book", "line-book");
  state = createProductLine(state, "termo", 50, "line-thermo");
  state = setProductLineCandidates(state, "line-thermo", [pricedProduct("thermo", 50, 19.99)]);
  state = selectProduct(state, "thermo", "line-thermo");
  return state;
}

describe("multi-line formal quote planning", () => {
  it("builds separate catalog quote items and calculates subtotal, 16% VAT and total", () => {
    const plan = buildDraftQuotePlan(selectedState());
    expect(plan.items).toHaveLength(2);
    expect(plan.items.map(({ values }) => [values.product_ref_id, values.cantidad, values.precio_unitario, values.subtotal]))
      .toEqual([["book", 80, 42.63, 3410.4], ["thermo", 50, 19.99, 999.5]]);
    expect(plan.totals).toEqual({ subtotal: 4409.9, tax_amount: 705.58, total: 5115.48 });
    expect(plan.items[0].values.print_unit_price).toBe(0);
    expect(plan.items[0].values.setup_fee).toBe(0);
  });

  it("keeps personalization intent isolated by line and never adds an invented print charge", () => {
    let state = selectedState();
    state = setProductLinePersonalization(state, "line-book", "Libreta con logo; revisar técnica");
    state = setProductLinePersonalization(state, "line-thermo", "Termos sin impresión");
    const plan = buildDraftQuotePlan(state);
    const first = plan.items[0].values.personalizacion as Record<string, unknown>;
    const second = plan.items[1].values.personalizacion as Record<string, unknown>;
    expect(first).toMatchObject({ tipo: "advisor_review", requiere_revision_tecnica: true });
    expect(second).toMatchObject({ tipo: "no_print", requiere_revision_tecnica: false });
    expect(plan.items.every(({ values }) => values.setup_fee === 0 && values.print_unit_price === 0)).toBe(true);
  });

  it("blocks a multiline draft if any active product line lacks a priced valid quantity", () => {
    const state = selectedState();
    const unpriced = { ...state, productLines: state.productLines.map((line) => line.lineId === "line-thermo"
      ? { ...line, status: "requires_review" as const, candidates: line.candidates.map((product) => ({ ...product,
        price: { ...product.price, status: "request_quote" as const, unitPriceBeforeTaxMxn: null, isValidQuantity: false } })) }
      : line) };
    expect(() => buildDraftQuotePlan(unpriced)).toThrow("Cada línea activa debe tener un producto seleccionado");
  });

  it("excludes removed lines from quote items while preserving other selected lines", () => {
    let state = selectedState();
    state = createProductLine(state, "bolsa", 100, "line-bag");
    state = setProductLineCandidates(state, "line-bag", [pricedProduct("bag", 100, 5)]);
    state = selectProduct(state, "bag", "line-bag");
    state = { ...state, productLines: state.productLines.map((line) => line.lineId === "line-bag" ? { ...line, status: "removed" } : line) };
    const plan = buildDraftQuotePlan(state);
    expect(plan.items.map(({ lineId }) => lineId)).toEqual(["line-book", "line-thermo"]);
  });

  it("updates matching quote-item rows, inserts new lines, and removes only stale owned lines", () => {
    const plan = buildDraftQuotePlan(selectedState());
    const result = planDraftQuoteReconciliation([
      { id: "item-book", notes_internal: "QA Super Agente qa-session; line:line-book; prior" },
      { id: "item-old-bag", notes_internal: "QA Super Agente qa-session; line:line-bag; prior" },
    ], plan.items, "qa-session");
    expect(result.upserts.map(({ lineId, existingId }) => [lineId, existingId])).toEqual([
      ["line-book", "item-book"], ["line-thermo", null],
    ]);
    expect(result.deleteIds).toEqual(["item-old-bag"]);
  });

  it("rejects duplicates, foreign rows and ambiguous legacy rows rather than adopting them", () => {
    const plan = buildDraftQuotePlan(selectedState());
    expect(() => planDraftQuoteReconciliation([
      { id: "1", notes_internal: "QA Super Agente qa-session; line:line-book" },
      { id: "2", notes_internal: "QA Super Agente qa-session; line:line-book" },
    ], plan.items, "qa-session")).toThrow("duplicadas");
    expect(() => planDraftQuoteReconciliation([{ id: "foreign", notes_internal: "created by advisor" }], plan.items, "qa-session"))
      .toThrow("no pertenecen");
    expect(() => planDraftQuoteReconciliation([{ id: "legacy", notes_internal: "QA Super Agente qa-session" }], plan.items, "qa-session"))
      .toThrow("sin marcador");
  });

  it("supports one-line migration by attaching the legacy owned item to its sole line", () => {
    const state = selectedState();
    const single = { ...state, productLines: [state.productLines[0]] };
    const plan = buildDraftQuotePlan(single);
    const result = planDraftQuoteReconciliation([{ id: "old-item", notes_internal: "QA Super Agente qa-session; stock observed" }],
      plan.items, "qa-session");
    expect(result.upserts).toMatchObject([{ lineId: "line-book", existingId: "old-item" }]);
    expect(result.deleteIds).toEqual([]);
  });
});
