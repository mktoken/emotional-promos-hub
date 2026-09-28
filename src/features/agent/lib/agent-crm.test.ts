import { describe, expect, it } from "vitest";
import { createOpportunityState, createProductLine, selectProduct, setProductLineCandidates } from "./agent-state";
import { safeQaContext } from "./agent-crm";
import type { AgentProduct } from "./agent-state";

const product = (id: string, quantity: number): AgentProduct => ({
  id, sku: `SKU-${id}`, name: id, imageUrl: null, productUrl: `/product/${id}`, color: null, variants: [],
  observedStock: quantity * 2, stockStatus: "observed", quantity, state: "considering",
  price: { status: "priced", currency: "MXN", unitPriceBeforeTaxMxn: 42.63, minimumQuantity: 1,
    pricingGenerationId: "v2", requestedQuantity: quantity, isValidQuantity: true },
});

describe("QA CRM handoff context", () => {
  it("records the reused prospect and complete separate product-line context", () => {
    let state = createOpportunityState("qa-session");
    state = createProductLine(state, "libreta", 80, "line-book");
    state = setProductLineCandidates(state, "line-book", [product("book", 80)]);
    state = selectProduct(state, "book", "line-book");
    state = createProductLine(state, "termo", 50, "line-thermo");
    state = setProductLineCandidates(state, "line-thermo", [product("thermo", 50)]);
    state = selectProduct(state, "thermo", "line-thermo");

    const context = safeQaContext(state, "qa-prospect") as Record<string, unknown>;
    expect(context.crm).toEqual({ prospectId: "qa-prospect" });
    expect(context.sessionId).toBe("qa-session");
    expect(context.customer).toEqual({ name: "QA Automatizado", email: "qa-promohub@example.com", phone: "5500000000" });
    expect(context.productLines).toMatchObject([
      { lineId: "line-book", productId: "book", productName: "book", quantity: 80, pricingStatus: "priced" },
      { lineId: "line-thermo", productId: "thermo", productName: "thermo", quantity: 50, pricingStatus: "priced" },
    ]);
    expect(JSON.stringify(context)).not.toMatch(/cost|margin|provider/i);
  });
});
