import { loadRealProducts, recommendProducts } from "./agent-tools";
import { captureMessage, createOpportunityState, findRequestedVariant, nextQuestion,
  rejectProduct, selectProduct, selectedProduct, updateQuantity, type OpportunityState } from "./agent-state";

export interface AgentMessage { role: "user" | "agent"; text: string }
export interface AgentSession { state: OpportunityState; messages: AgentMessage[]; operationStarted?: boolean }

export function newAgentSession(welcome = "Cuéntame qué producto y cantidad necesitas. Buscaré opciones reales del catálogo."): AgentSession {
  return { state: createOpportunityState(crypto.randomUUID()), messages: [{ role: "agent", text: welcome }] };
}

export function appendMessage(session: AgentSession, role: AgentMessage["role"], text: string): AgentSession {
  return { ...session, messages: [...session.messages, { role, text }] };
}

export async function advanceAgent(session: AgentSession, text: string,
  searchProducts: typeof loadRealProducts = loadRealProducts): Promise<{ session: AgentSession; searchFailed: boolean }> {
  let current = appendMessage(session, "user", text.trim());
  const before = current.state;
  const previousSelectedId = selectedProduct(before)?.id;
  const recommendations = recommendProducts(before.products);
  current = { ...current, state: captureMessage(before, text) };
  const ordinal = text.match(/(?:la|opci[oó]n)\s*(primera|segunda|tercera|1|2|3)/i);
  if (ordinal && recommendations.length) {
    const index = ({ primera: 0, segunda: 1, tercera: 2, "1": 0, "2": 1, "3": 2 } as Record<string, number>)[ordinal[1].toLowerCase()];
    if (recommendations[index]) current = { ...current, state: selectProduct(current.state, recommendations[index].product.id) };
  }
  if (/\b(esa no|otra opci[oó]n)\b/i.test(text) && previousSelectedId) {
    current = { ...current, state: rejectProduct(current.state, previousSelectedId) };
  }
  const quantityChanged = current.state.opportunity.quantity !== before.opportunity.quantity && Boolean(before.opportunity.quantity);
  if (quantityChanged) current = { ...current, state: updateQuantity(current.state, current.state.opportunity.quantity!) };
  let searchFailed = false;
  if (current.state.opportunity.productInterest && current.state.opportunity.quantity &&
    (!current.state.products.length || current.state.opportunity.quantity !== before.opportunity.quantity)) {
    try {
      const products = await searchProducts(current.state.opportunity.productInterest, current.state.opportunity.quantity);
      current = { ...current, state: { ...current.state, products,
        trace: [...current.state.trace, { tool: "search_products", ok: true, timestamp: new Date().toISOString() }] } };
      current = appendMessage(current, "agent", products.length
        ? `Encontré ${products.length} productos reales. Revisa precio y stock observados; selecciona una opción.`
        : "No encontré productos compatibles con esa cantidad. Puedo dejar la búsqueda para revisión humana.");
    } catch {
      searchFailed = true;
      current = { ...current, state: { ...current.state,
        trace: [...current.state.trace, { tool: "search_products", ok: false, timestamp: new Date().toISOString() }] } };
      current = appendMessage(current, "agent", "No pude consultar el catálogo. No recomendaré productos sin datos; intenta de nuevo o solicita revisión humana.");
    }
    if (previousSelectedId && current.state.products.some((p) => p.id === previousSelectedId)) {
      current = { ...current, state: selectProduct(current.state, previousSelectedId) };
    }
  }
  const requestedColor = current.state.opportunity.color;
  const selected = selectedProduct(current.state);
  if (selected && requestedColor && (quantityChanged || requestedColor !== before.opportunity.color || selected.id !== previousSelectedId)) {
    const variant = findRequestedVariant(selected.variants, requestedColor);
    current = { ...current, state: { ...current.state, products: current.state.products.map((p) => p.id === selected.id
      ? { ...p, color: variant?.color ?? null, observedStock: variant?.stock ?? null,
        stockStatus: variant?.stock === null || !variant ? "unknown" as const : "observed" as const } : p) } };
    if (!variant) current = appendMessage(current, "agent", `No tengo evidencia de variante ${requestedColor} para ese producto.`);
  }
  return { session: appendMessage(current, "agent", nextQuestion(current.state)), searchFailed };
}

export function chooseAgentProduct(session: AgentSession, id: string): AgentSession {
  const state = selectProduct(session.state, id);
  return appendMessage({ ...session, state }, "agent", nextQuestion(state));
}
