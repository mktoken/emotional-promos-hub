import { describe, expect, it } from "vitest";
import { selectedLineProduct, selectedProductLines } from "./agent-state";
import { advanceAgent, chooseAgentProduct, newAgentSession } from "./agent-workflow";
import type { AgentProduct } from "./agent-state";

function catalogProduct(category: string, index: number, quantity: number): AgentProduct {
  const id = `${category}-${index}`;
  return {
    id, sku: `${category.toUpperCase()}-${index}`, name: `${category} real ${index}`,
    imageUrl: null, productUrl: `/?view=pdp&product=${id}`, color: null,
    variants: [{ color: "Royal Blue", stock: quantity * 4 }, { color: "Negro", stock: quantity * 5 }],
    observedStock: quantity * 10, stockStatus: "observed", quantity, state: "considering",
    price: { status: "priced", currency: "MXN", unitPriceBeforeTaxMxn: 10 * index + quantity / 100,
      minimumQuantity: 1, pricingGenerationId: "public-v2", requestedQuantity: quantity, isValidQuantity: true },
  };
}

const realSearch = async (interest: string, quantity: number) => {
  const category = interest === "libreta" ? "libreta" : interest === "termo" ? "termo" : "bolsa";
  return [1, 2, 3].map((index) => catalogProduct(category, index, quantity));
};

describe("shared multi-product agent workflow", () => {
  it("keeps the original mono-product request and searches its real line", async () => {
    const calls: Array<[string, number]> = [];
    const result = await advanceAgent(newAgentSession(), "Quiero 50 libretas para un evento corporativo", async (interest, quantity) => {
      calls.push([interest, quantity]); return [];
    });
    expect(calls).toEqual([["libreta", 50]]);
    expect(result.session.state.opportunity).toMatchObject({ productInterest: "libreta", quantity: 50, eventType: "corporativo" });
    expect(result.session.state.productLines).toHaveLength(1);
    expect(result.session.messages.at(-1)?.text).toContain("opción verificada");
  });

  it("runs the requested three-line E2E dialogue while editing each line independently", async () => {
    const calls: Array<[string, number]> = [];
    const search = async (interest: string, quantity: number) => { calls.push([interest, quantity]); return realSearch(interest, quantity); };
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas para un evento corporativo", search)).session;
    const notebook = session.state.productLines[0];
    session = chooseAgentProduct(session, "libreta-1", notebook.lineId);

    session = (await advanceAgent(session, "También necesito 50 termos.", search)).session;
    const thermos = session.state.productLines.find((line) => line.productInterest === "termo")!;
    session = chooseAgentProduct(session, "termo-1", thermos.lineId);

    session = (await advanceAgent(session, "Y 100 bolsas.", search)).session;
    const bags = session.state.productLines.find((line) => line.productInterest === "bolsa")!;
    session = chooseAgentProduct(session, "bolsa-1", bags.lineId);

    session = (await advanceAgent(session, "De las libretas deja la segunda opción.", search)).session;
    expect(selectedLineProduct(session.state.productLines.find((line) => line.productInterest === "libreta"))?.id).toBe("libreta-2");

    session = (await advanceAgent(session, "Los termos mejor 80.", search)).session;
    expect(session.state.productLines.find((line) => line.productInterest === "termo")).toMatchObject({ quantity: 80, selectedProductId: "termo-1", status: "selected" });
    expect(selectedLineProduct(session.state.productLines.find((line) => line.productInterest === "termo"))?.price.requestedQuantity).toBe(80);

    session = (await advanceAgent(session, "Quita las bolsas.", search)).session;
    expect(session.state.productLines.find((line) => line.productInterest === "bolsa")?.status).toBe("removed");
    expect(selectedLineProduct(session.state.productLines.find((line) => line.productInterest === "termo"))?.id).toBe("termo-1");

    session = (await advanceAgent(session, "Agrega nuevamente las bolsas pero 150.", search)).session;
    const restored = session.state.productLines.find((line) => line.productInterest === "bolsa")!;
    expect(restored).toMatchObject({ lineId: bags.lineId, quantity: 150, status: "considering" });
    session = chooseAgentProduct(session, "bolsa-2", restored.lineId);

    session = (await advanceAgent(session, "Las libretas las quiero azules.", search)).session;
    const notebookFinal = session.state.productLines.find((line) => line.productInterest === "libreta")!;
    expect(notebookFinal).toMatchObject({ selectedVariant: "Royal Blue", color: "Royal Blue", status: "selected" });
    expect(selectedLineProduct(notebookFinal)?.observedStock).toBe(200);
    expect(session.state.productLines).toHaveLength(3);
    expect(selectedProductLines(session.state).map((line) => line.quantity)).toEqual([50, 80, 150]);
    expect(calls).toEqual([["libreta", 50], ["termo", 50], ["bolsa", 100], ["termo", 80], ["bolsa", 150]]);
  });

  it("does not guess which line to change when there are several active products", async () => {
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas", realSearch)).session;
    session = chooseAgentProduct(session, "libreta-1", session.state.productLines[0].lineId);
    session = (await advanceAgent(session, "También 50 termos", realSearch)).session;
    const before = session.state.productLines.map((line) => line.quantity);
    const result = await advanceAgent(session, "Mejor 80", realSearch);
    expect(result.session.state.productLines.map((line) => line.quantity)).toEqual(before);
    expect(result.session.messages.at(-1)?.text).toContain("No cambiaré ninguna línea");
  });

  it("asks before changing duplicate same-category lines instead of picking the first", async () => {
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas", realSearch)).session;
    session = (await advanceAgent(session, "Agrega otra línea de 20 libretas por separado", realSearch)).session;
    const result = await advanceAgent(session, "Las libretas mejor 80", realSearch);
    expect(result.session.state.productLines.map((line) => line.quantity)).toEqual([50, 20]);
    expect(result.session.messages.at(-1)?.text).toContain("más de una línea");
  });

  it("resolves economic and recommended option labels against the visible real candidates", async () => {
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas", realSearch)).session;
    const lineId = session.state.productLines[0].lineId;
    session = (await advanceAgent(session, "Las libretas prefiero la opción económica", realSearch)).session;
    expect(selectedLineProduct(session.state.productLines[0])?.id).toBe("libreta-1");
    session = (await advanceAgent(session, "De las libretas elige la recomendada", realSearch)).session;
    expect(selectedLineProduct(session.state.productLines[0])?.id).toBe("libreta-2");
    expect(session.state.activeProductLineId).toBe(lineId);
  });

  it("preserves other selected lines and records a line-scoped tool failure", async () => {
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas", realSearch)).session;
    session = chooseAgentProduct(session, "libreta-1", session.state.productLines[0].lineId);
    const result = await advanceAgent(session, "También necesito 50 termos", async () => { throw new Error("private database detail"); });
    expect(result.searchFailed).toBe(true);
    expect(selectedLineProduct(result.session.state.productLines[0])?.id).toBe("libreta-1");
    expect(result.session.state.productLines[1]).toMatchObject({ productInterest: "termo", candidates: [], status: "considering" });
    expect(JSON.stringify(result.session.messages)).not.toContain("private database detail");
  });

  it("reuses a line for a change and replaces only the requested line", async () => {
    let session = (await advanceAgent(newAgentSession(), "Quiero 50 libretas", realSearch)).session;
    session = chooseAgentProduct(session, "libreta-1", session.state.productLines[0].lineId);
    const originalLineId = session.state.productLines[0].lineId;
    session = (await advanceAgent(session, "Las libretas mejor 80", realSearch)).session;
    expect(session.state.productLines).toHaveLength(1);
    expect(session.state.productLines[0]).toMatchObject({ lineId: originalLineId, quantity: 80 });
    session = (await advanceAgent(session, "Reemplaza las libretas por termos en 80", realSearch)).session;
    expect(session.state.productLines).toHaveLength(1);
    expect(session.state.productLines[0]).toMatchObject({ lineId: originalLineId, productInterest: "termo", quantity: 80 });
  });

  it("does not expose raw catalog failures", async () => {
    const result = await advanceAgent(newAgentSession(), "Quiero 50 libretas", async () => { throw new Error("secret db details"); });
    expect(result.searchFailed).toBe(true);
    expect(JSON.stringify(result.session.messages)).not.toContain("secret db details");
  });
});
