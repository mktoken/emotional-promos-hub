import type { PublicPriceQuote } from "@/features/catalog/lib/public-product-price";

export interface SectorContext {
  sector?: string; subsector?: string; useCases?: string[]; audiences?: string[];
  preferredCategories?: string[]; preferredProducts?: string[]; productsToAvoid?: string[];
  kits?: string[]; suggestedQuestions?: string[]; objections?: string[]; crossSell?: string[];
  style?: string; formality?: string; source?: string; confidence?: number;
}
export interface CompanyContext {
  profileId?: string; name?: string; domain?: string; sector?: string; website?: string;
  brandAttributes?: string[]; context?: string; sources?: string[];
  confidence?: number; lastVerified?: string;
  intelligenceStatus: "not_requested" | "found" | "not_found" | "error";
}
export interface AgentProduct {
  id: string; sku: string | null; name: string; imageUrl: string | null; productUrl: string;
  color: string | null; variants: Array<{ color: string; stock: number | null }>;
  observedStock: number | null; stockStatus: "observed" | "unknown";
  price: PublicPriceQuote; quantity: number;
  state: "considering" | "selected" | "rejected";
}
export interface OpportunityState {
  schemaVersion: 1; sessionId: string;
  customer: { name?: string; email?: string; phone?: string };
  company: CompanyContext;
  opportunity: {
    useCase?: string; eventType?: string; eventDate?: string; requiredDate?: string;
    deliveryCity?: string; audience?: string; quantityPeople?: number;
    budgetTotal?: number; budgetPerPerson?: number; urgency?: string;
    productInterest?: string; quantity?: number; color?: string; style?: string;
  };
  sectorContext?: SectorContext;
  products: AgentProduct[];
  art: { logoReceived: boolean; fileReference?: string; notes?: string; technicalReviewRequired: boolean };
  commercial: {
    intentLevel?: string; competitor?: string; requestedDiscount?: number;
    nextAction?: string; humanReviewReasons: string[];
  };
  crm: { prospectId?: string; opportunityId?: string; draftQuoteId?: string };
  trace: Array<{ tool: string; ok: boolean; timestamp: string }>;
}
export const createOpportunityState = (sessionId: string): OpportunityState => ({
  schemaVersion: 1, sessionId, customer: {}, company: { intelligenceStatus: "not_requested" },
  opportunity: {}, products: [], art: { logoReceived: false, technicalReviewRequired: false },
  commercial: { humanReviewReasons: [] }, crm: {}, trace: [],
});
export const selectedProduct = (state: OpportunityState) => state.products.find((p) => p.state === "selected") ?? null;

const normalizeColor = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export function findRequestedVariant(variants: AgentProduct["variants"], requestedColor: string) {
  const aliases = normalizeColor(requestedColor) === "azul" ? ["azul", "blue"] : [normalizeColor(requestedColor)];
  return variants.find((variant) => aliases.some((alias) => normalizeColor(variant.color).includes(alias)));
}

export function selectProduct(state: OpportunityState, id: string): OpportunityState {
  if (!state.products.some((p) => p.id === id && p.state !== "rejected")) return state;
  return { ...state, products: state.products.map((p) => ({
    ...p, state: p.id === id ? "selected" : p.state === "selected" ? "considering" : p.state,
  })) };
}
export function rejectProduct(state: OpportunityState, id: string): OpportunityState {
  return { ...state, products: state.products.map((p) => p.id === id ? { ...p, state: "rejected" } : p) };
}
export function updateQuantity(state: OpportunityState, quantity: number): OpportunityState {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return state;
  return { ...state, opportunity: { ...state.opportunity, quantity }, products: [] };
}
export function handoffReasons(state: OpportunityState): string[] {
  const reasons = [...state.commercial.humanReviewReasons];
  const p = selectedProduct(state);
  if (!p) reasons.push("Producto por seleccionar");
  if (p && p.price.status !== "priced") reasons.push(`Precio ${p.price.status}`);
  if (p && p.stockStatus !== "observed") reasons.push("Stock no observado");
  if (p && p.observedStock !== null && p.observedStock < p.quantity) reasons.push("Stock observado insuficiente");
  if (state.art.technicalReviewRequired) reasons.push("Personalización sujeta a revisión técnica");
  if (state.opportunity.urgency) reasons.push("Fecha crítica");
  if (state.commercial.requestedDiscount) reasons.push("Descuento especial");
  if (state.commercial.competitor) reasons.push("Cotización competidora");
  return [...new Set(reasons)];
}
export function nextQuestion(s: OpportunityState): string {
  if (!s.opportunity.productInterest) return "¿Qué artículo promocional necesitas?";
  if (!s.opportunity.quantity) return "¿Cuántas piezas necesitas?";
  if (!selectedProduct(s)) return s.products.length
    ? "¿Cuál opción te interesa? Elige una tarjeta de producto."
    : "No hay una opción verificada todavía. Puedes cambiar el producto o pedir revisión humana.";
  if (!s.opportunity.deliveryCity) return "¿A qué ciudad sería la entrega?";
  if (!s.customer.name) return "¿A nombre de quién preparo la revisión?";
  if (!s.customer.email && !s.customer.phone) return "¿Qué correo o teléfono podemos registrar?";
  if (!s.company.name) return "¿Cuál es el nombre de tu empresa?";
  return "La operación está lista para revisión humana. ¿Quieres agregar fecha, presupuesto, color o logo?";
}
export function captureMessage(s: OpportunityState, message: string): OpportunityState {
  const text = message.trim();
  if (!text) return s;
  const question = nextQuestion(s);
  const next: OpportunityState = {
    ...s, customer: { ...s.customer }, company: { ...s.company }, opportunity: { ...s.opportunity },
    art: { ...s.art }, commercial: { ...s.commercial, humanReviewReasons: [...s.commercial.humanReviewReasons] },
  };
  if (/\b(libretas?|cuadernos?|notebooks?)\b/i.test(text)) next.opportunity.productInterest = /cuadern/i.test(text) ? "cuaderno" : "libreta";
  if (/evento corporativo/i.test(text)) { next.opportunity.useCase = "evento corporativo"; next.opportunity.eventType = "corporativo"; }
  const qty = text.match(/\b(\d{1,6})\s*(?:libretas?|cuadernos?|piezas?|unidades?)\b/i)
    ?? text.match(/(?:en|para|cantidad\s*:?)\s*(\d{1,6})\b/i)
    ?? text.match(/cot[ií]zame\s*(\d{1,6})\b/i);
  if (qty) next.opportunity.quantity = Number(qty[1]);
  else if (question.includes("piezas") && /^\d{1,6}$/.test(text)) next.opportunity.quantity = Number(text);
  const eventDate = text.match(/(?:evento|fecha del evento)\s*(?:el|:)?\s*(\d{4}-\d{2}-\d{2})/i);
  if (eventDate) next.opportunity.eventDate = eventDate[1];
  const email = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (email) next.customer.email = email[0].toLowerCase();
  const phone = text.replace(/\D/g, "");
  if (!email && phone.length >= 10 && phone.length <= 15 && /tel[eé]fono|whatsapp|contacto/i.test(text)) next.customer.phone = phone;
  const city = text.match(/(?:entrega (?:en|a)|ciudad(?: de entrega)?\s*:?\s*)([\p{L}\s]{2,50})/iu);
  if (city) next.opportunity.deliveryCity = city[1].trim();
  const budget = text.match(/presupuesto\s*(?:de|:)?\s*\$?([\d,]+)(?:\s*(mil|k))?/i);
  if (budget) next.opportunity.budgetTotal = Number(budget[1].replace(/,/g, "")) * (budget[2] ? 1000 : 1);
  const color = text.match(/\b(azul|rojo|negro|blanco|verde|gris|amarillo)\b/i);
  if (color) next.opportunity.color = color[1].toLowerCase();
  if (/\b(logo|personaliz|impres)/i.test(text)) { next.art.technicalReviewRequired = true; next.art.notes = text.slice(0, 300); }
  if (/\b(humano|asesor|persona)\b/i.test(text)) next.commercial.humanReviewReasons.push("Cliente solicita asesor");
  if (/\b(descuento)\b/i.test(text)) next.commercial.humanReviewReasons.push("Descuento solicitado");
  if (/cotizaci[oó]n competidora/i.test(text)) next.commercial.competitor = "Mencionado por el cliente";
  const name = text.match(/(?:me llamo|mi nombre es)\s+([\p{L}\s]{2,80})/iu);
  if (name) next.customer.name = name[1].trim();
  const company = text.match(/(?:empresa es|empresa\s*:)\s*([\p{L}0-9 .-]{2,100})/iu);
  if (company) next.company.name = company[1].trim();
  if (/m[aá]s elegante/i.test(text)) next.opportunity.style = "elegante";
  if (question.includes("ciudad") && !next.opportunity.deliveryCity && /^[\p{L}\s]{2,50}$/u.test(text)) {
    next.opportunity.deliveryCity = text;
  }
  if (question.includes("nombre") && !next.customer.name && /^[\p{L}\s]{2,80}$/u.test(text)
      && !/^(no|s[ií]|otra|segunda|primera)$/i.test(text)) next.customer.name = text;
  if (question.includes("empresa") && !next.company.name && /^[\p{L}0-9 .-]{2,100}$/u.test(text)) next.company.name = text;
  return next;
}
