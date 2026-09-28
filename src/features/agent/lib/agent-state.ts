import type { PublicPriceQuote } from "@/features/catalog/lib/public-product-price";
import type { CompanyProfile, SectorPlaybook } from "./agent-intelligence";

export interface SectorContext {
  sector?: string; subsector?: string; useCases?: string[]; audiences?: string[];
  preferredCategories?: string[]; preferredProducts?: string[]; productsToAvoid?: string[];
  kits?: string[]; suggestedQuestions?: string[]; objections?: string[]; crossSell?: string[];
  style?: string; formality?: string; source?: string; confidence?: number; lastVerified?: string;
}
export interface CompanyContext {
  profileId?: string; name?: string; domain?: string; sector?: string; website?: string;
  brandAttributes?: string[]; context?: string; sources?: string[]; audiences?: string[];
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

export type ProductLineStatus = "considering" | "selected" | "rejected" | "removed" | "requires_review";
export type PersonalizationStatus = "not_requested" | "requested_review" | "no_print_requested";

/** Una necesidad comercial independiente, con catálogo, precio, stock y personalización propios. */
export interface AgentProductLine {
  lineId: string;
  productInterest: string;
  quantity: number | null;
  candidates: AgentProduct[];
  selectedProductId: string | null;
  selectedVariant: string | null;
  color: string | null;
  status: ProductLineStatus;
  personalizationRequested: boolean;
  personalizationStatus: PersonalizationStatus;
  personalizationNotes?: string;
}

export interface OpportunityState {
  schemaVersion: 2; sessionId: string;
  customer: { name?: string; email?: string; phone?: string };
  company: CompanyContext;
  opportunity: {
    useCase?: string; eventType?: string; eventDate?: string; requiredDate?: string;
    deliveryCity?: string; audience?: string; quantityPeople?: number;
    budgetTotal?: number; budgetPerPerson?: number; urgency?: string;
    /** Legacy single-line projection retained for existing consumers. */
    productInterest?: string; quantity?: number; color?: string; style?: string;
  };
  sectorContext?: SectorContext;
  /** Structured layers remain separate from the live opportunity context. */
  sectorPlaybook?: SectorPlaybook;
  companyProfile?: CompanyProfile;
  productLines: AgentProductLine[];
  activeProductLineId: string | null;
  /** Legacy current-line candidate projection; new consumers use productLines. */
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
  schemaVersion: 2, sessionId, customer: {}, company: { intelligenceStatus: "not_requested" },
  opportunity: {}, productLines: [], activeProductLineId: null, products: [],
  art: { logoReceived: false, technicalReviewRequired: false },
  commercial: { humanReviewReasons: [] }, crm: {}, trace: [],
});

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const lineIsActive = (line: AgentProductLine) => line.status !== "removed" && line.status !== "rejected";

function statusForProduct(product: AgentProduct, quantity: number | null): ProductLineStatus {
  if (product.price.status !== "priced" || product.price.unitPriceBeforeTaxMxn === null || !product.price.isValidQuantity) return "requires_review";
  if (quantity !== null && product.observedStock !== null && product.observedStock < quantity) return "requires_review";
  return "selected";
}

export function selectedProductLine(state: OpportunityState): AgentProductLine | null {
  const active = state.productLines.find((line) => line.lineId === state.activeProductLineId && lineIsActive(line));
  if (active) return active;
  return state.productLines.find((line) => lineIsActive(line) && line.selectedProductId !== null) ?? null;
}

export function selectedLineProduct(line: AgentProductLine | null | undefined): AgentProduct | null {
  if (!line || !line.selectedProductId) return null;
  return line.candidates.find((product) => product.id === line.selectedProductId && product.state === "selected") ?? null;
}

export function selectedProduct(state: OpportunityState): AgentProduct | null {
  const line = selectedProductLine(state);
  return selectedLineProduct(line) ?? state.products.find((product) => product.state === "selected") ?? null;
}

export function selectedProductLines(state: OpportunityState): AgentProductLine[] {
  return state.productLines.filter((line) => line.status === "selected" && selectedLineProduct(line) !== null);
}

export function setActiveProductLine(state: OpportunityState, lineId: string | null): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId && lineIsActive(item));
  if (!line) return { ...state, activeProductLineId: null, products: [] };
  return {
    ...state, activeProductLineId: line.lineId, products: line.candidates,
    opportunity: { ...state.opportunity, productInterest: line.productInterest,
      quantity: line.quantity ?? undefined, color: line.color ?? undefined },
  };
}

export function createProductLine(
  state: OpportunityState, productInterest: string, quantity: number | null = null, lineId = crypto.randomUUID(),
): OpportunityState {
  const line: AgentProductLine = {
    lineId, productInterest: productInterest.trim(), quantity, candidates: [], selectedProductId: null,
    selectedVariant: null, color: null, status: "considering", personalizationRequested: false,
    personalizationStatus: "not_requested",
  };
  return setActiveProductLine({ ...state, productLines: [...state.productLines, line] }, lineId);
}

export function restoreProductLine(state: OpportunityState, lineId: string): OpportunityState {
  const productLines = state.productLines.map((line) => line.lineId === lineId && line.status === "removed"
    ? { ...line, status: "considering" as const, candidates: [], selectedProductId: null, selectedVariant: null, color: null }
    : line);
  return setActiveProductLine({ ...state, productLines }, lineId);
}

export function setProductLineCandidates(
  state: OpportunityState, lineId: string, candidates: AgentProduct[], preserveProductId?: string | null,
): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return state;
  candidates = [...new Map(candidates.map((product) => [product.id, product])).values()];
  const selectedId = preserveProductId && candidates.some((product) => product.id === preserveProductId)
    ? preserveProductId : null;
  const normalized = candidates.map((product) => ({ ...product, quantity: line.quantity ?? product.quantity,
    color: selectedId === product.id ? line.color : null,
    state: selectedId === product.id ? "selected" as const : product.state === "rejected" ? "rejected" as const : "considering" as const }));
  const nextLine: AgentProductLine = { ...line, candidates: normalized, selectedProductId: selectedId,
    selectedVariant: selectedId ? line.selectedVariant : null,
    status: selectedId ? statusForProduct(normalized.find((product) => product.id === selectedId)!, line.quantity) : "considering" };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function selectProduct(state: OpportunityState, id: string, lineId = state.activeProductLineId): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId && lineIsActive(item));
  if (!line) {
    if (!state.products.some((product) => product.id === id && product.state !== "rejected")) return state;
    return { ...state, products: state.products.map((product) => ({ ...product,
      state: product.id === id ? "selected" : product.state === "selected" ? "considering" : product.state })) };
  }
  if (!line.candidates.some((product) => product.id === id && product.state !== "rejected")) return state;
  const candidates = line.candidates.map((product) => ({ ...product,
    state: product.id === id ? "selected" as const : product.state === "selected" ? "considering" as const : product.state }));
  const chosen = candidates.find((product) => product.id === id)!;
  const nextLine = { ...line, candidates, selectedProductId: id, selectedVariant: null,
    status: statusForProduct(chosen, line.quantity) };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === line.lineId ? nextLine : item) }, line.lineId);
}

export function rejectProduct(state: OpportunityState, id: string, lineId = state.activeProductLineId): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return { ...state, products: state.products.map((product) => product.id === id ? { ...product, state: "rejected" } : product) };
  const candidates = line.candidates.map((product) => product.id === id ? { ...product, state: "rejected" as const } : product);
  const selectedProductId = line.selectedProductId === id ? null : line.selectedProductId;
  const nextLine = { ...line, candidates, selectedProductId, selectedVariant: selectedProductId ? line.selectedVariant : null,
    status: selectedProductId ? line.status : "considering" as const };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function updateProductLineQuantity(state: OpportunityState, lineId: string, quantity: number): OpportunityState {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return state;
  const line = state.productLines.find((item) => item.lineId === lineId && lineIsActive(item));
  if (!line) return state;
  const nextLine = { ...line, quantity, candidates: [], selectedVariant: null, status: "considering" as const };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function removeProductLine(state: OpportunityState, lineId: string): OpportunityState {
  const productLines = state.productLines.map((line) => line.lineId === lineId
    ? { ...line, status: "removed" as const }
    : line);
  const next = { ...state, productLines };
  if (state.activeProductLineId !== lineId) return next;
  const fallback = productLines.find((line) => lineIsActive(line))?.lineId ?? null;
  return setActiveProductLine(next, fallback);
}

export function replaceProductLine(state: OpportunityState, lineId: string, productInterest: string, quantity?: number | null): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return state;
  const nextLine: AgentProductLine = { ...line, productInterest: productInterest.trim(), quantity: quantity ?? line.quantity,
    candidates: [], selectedProductId: null, selectedVariant: null, color: null, status: "considering",
    personalizationRequested: false, personalizationStatus: "not_requested", personalizationNotes: undefined };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function setProductLinePersonalization(state: OpportunityState, lineId: string, message: string): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return state;
  const noPrint = /\b(sin impresi[oó]n|sin personalizaci[oó]n|sin logo|no imprimir)\b/i.test(message);
  const nextLine: AgentProductLine = { ...line, personalizationRequested: !noPrint,
    personalizationStatus: noPrint ? "no_print_requested" : "requested_review",
    personalizationNotes: message.trim().slice(0, 300) };
  return { ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) };
}

export function setProductLineColor(state: OpportunityState, lineId: string, requestedColor: string): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return state;
  const product = line.candidates.find((candidate) => candidate.id === line.selectedProductId);
  if (!product) return { ...state, productLines: state.productLines.map((item) => item.lineId === lineId
    ? { ...item, color: requestedColor, selectedVariant: null } : item) };
  const variant = findRequestedVariant(product.variants, requestedColor);
  const candidates = line.candidates.map((candidate) => candidate.id === product.id
    ? { ...candidate, color: variant?.color ?? null,
      observedStock: variant?.stock ?? null, stockStatus: variant?.stock === null || !variant ? "unknown" as const : "observed" as const }
    : candidate);
  const nextLine = { ...line, candidates, color: variant?.color ?? requestedColor,
    selectedVariant: variant?.color ?? null,
    status: variant ? statusForProduct(candidates.find((candidate) => candidate.id === product.id)!, line.quantity) : "requires_review" as const };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function clearProductLineColor(state: OpportunityState, lineId: string): OpportunityState {
  const line = state.productLines.find((item) => item.lineId === lineId);
  if (!line) return state;
  const selected = line.candidates.find((product) => product.id === line.selectedProductId);
  const known = selected?.variants.map((variant) => variant.stock).filter((stock): stock is number => stock !== null) ?? [];
  const observedStock = known.length ? known.reduce((sum, stock) => sum + stock, 0) : null;
  const candidates = line.candidates.map((product) => product.id === line.selectedProductId
    ? { ...product, color: null, observedStock, stockStatus: observedStock === null ? "unknown" as const : "observed" as const }
    : product);
  const nextLine = { ...line, candidates, color: null, selectedVariant: null,
    status: selected ? statusForProduct({ ...selected, observedStock }, line.quantity) : line.status };
  return setActiveProductLine({ ...state, productLines: state.productLines.map((item) => item.lineId === lineId ? nextLine : item) }, lineId);
}

export function findRequestedVariant(variants: AgentProduct["variants"], requestedColor: string) {
  const wanted = normalize(requestedColor);
  const aliases = wanted === "azul" ? ["azul", "blue"] : wanted === "rojo" ? ["rojo", "red"] : [wanted];
  return variants.find((variant) => aliases.some((alias) => normalize(variant.color).includes(alias)));
}

export function updateQuantity(state: OpportunityState, quantity: number): OpportunityState {
  const line = selectedProductLine(state);
  if (line) return updateProductLineQuantity(state, line.lineId, quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return state;
  return { ...state, opportunity: { ...state.opportunity, quantity }, products: [] };
}

export function handoffReasons(state: OpportunityState): string[] {
  const reasons = [...state.commercial.humanReviewReasons];
  const lines = state.productLines.filter((line) => lineIsActive(line));
  if (lines.length === 0 && !selectedProduct(state)) reasons.push("Producto por seleccionar");
  if (!lines.length) {
    const legacy = selectedProduct(state);
    if (legacy && legacy.price.status !== "priced") reasons.push(`Precio ${legacy.price.status}`);
    if (legacy && legacy.stockStatus !== "observed") reasons.push("Stock no observado");
    if (legacy && legacy.observedStock !== null && legacy.observedStock < legacy.quantity) reasons.push("Stock observado insuficiente");
    if (state.art.technicalReviewRequired) reasons.push("Personalización sujeta a revisión técnica");
  }
  for (const line of lines) {
    const product = selectedLineProduct(line);
    if (!product) { reasons.push(`Producto por seleccionar: ${line.productInterest}`); continue; }
    if (line.status === "requires_review") reasons.push(`Línea requiere revisión: ${line.productInterest}`);
    if (product.price.status !== "priced") reasons.push(`Precio ${product.price.status}: ${line.productInterest}`);
    if (product.stockStatus !== "observed") reasons.push(`Stock no observado: ${line.productInterest}`);
    if (product.observedStock !== null && line.quantity !== null && product.observedStock < line.quantity) {
      reasons.push(`Stock observado insuficiente: ${line.productInterest}`);
    }
    if (line.personalizationStatus === "requested_review") reasons.push(`Personalización sujeta a revisión técnica: ${line.productInterest}`);
  }
  if (state.opportunity.urgency) reasons.push("Fecha crítica");
  if (state.commercial.requestedDiscount) reasons.push("Descuento especial");
  if (state.commercial.competitor) reasons.push("Cotización competidora");
  return [...new Set(reasons)];
}

export function nextQuestion(state: OpportunityState): string {
  const active = state.productLines.filter(lineIsActive);
  if (!active.length && state.opportunity.productInterest) {
    if (!state.opportunity.quantity) return "¿Cuántas piezas necesitas?";
    if (!selectedProduct(state)) return state.products.length
      ? "¿Cuál opción te interesa? Elige una tarjeta de producto."
      : "No hay una opción verificada todavía. Puedes cambiar el producto o pedir revisión humana.";
  }
  if (!active.length && !state.opportunity.productInterest) return "¿Qué productos promocionales necesitas? Puedes agregar cada producto y cantidad por separado.";
  const incomplete = active.find((line) => line.quantity === null || line.candidates.length === 0 || !selectedLineProduct(line));
  if (incomplete) {
    if (incomplete.quantity === null) return `¿Cuántas piezas de ${incomplete.productInterest} necesitas?`;
    if (!incomplete.candidates.length) return `Aún no tengo una opción verificada para ${incomplete.productInterest}. Puedes intentar otra búsqueda o pedir revisión humana.`;
    return `¿Qué opción de ${incomplete.productInterest} te interesa?`;
  }
  if (!state.opportunity.deliveryCity) return "¿A qué ciudad sería la entrega?";
  if (!state.customer.name) return "¿A nombre de quién preparo la revisión?";
  if (!state.customer.email && !state.customer.phone) return "¿Qué correo o teléfono podemos registrar?";
  if (!state.company.name) return "¿Cuál es el nombre de tu empresa?";
  return "La operación está lista para revisión humana. ¿Quieres agregar fecha, presupuesto, color o personalización por producto?";
}

export function captureMessage(state: OpportunityState, message: string): OpportunityState {
  const text = message.trim();
  if (!text) return state;
  const question = nextQuestion(state);
  const next: OpportunityState = {
    ...state, customer: { ...state.customer }, company: { ...state.company }, opportunity: { ...state.opportunity },
    art: { ...state.art }, commercial: { ...state.commercial, humanReviewReasons: [...state.commercial.humanReviewReasons] },
  };
  if (/\b(libretas?|cuadernos?|notebooks?)\b/i.test(text)) next.opportunity.productInterest = /cuadern/i.test(text) ? "cuaderno" : "libreta";
  else if (/\b(termos?|cilindros?)\b/i.test(text)) next.opportunity.productInterest = /cilindr/i.test(text) ? "cilindro" : "termo";
  else if (/\b(bolsas?)\b/i.test(text)) next.opportunity.productInterest = "bolsa";
  if (/evento corporativo/i.test(text)) { next.opportunity.useCase = "evento corporativo"; next.opportunity.eventType = "corporativo"; }
  const qty = text.match(/\b(\d{1,6})\s*(?:libretas?|cuadernos?|termos?|bolsas?|piezas?|unidades?)\b/i)
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
  const color = text.match(/\b(azul(?:es)?|rojos?|rojas?|negros?|negras?|blancos?|blancas?|verdes?|grises?|amarillos?|amarillas?)\b/i)?.[1].toLowerCase();
  if (color && !state.productLines.length) next.opportunity.color = color.startsWith("azul") ? "azul" : color.startsWith("roj") ? "rojo"
    : color.startsWith("negr") ? "negro" : color.startsWith("blanc") ? "blanco" : color.startsWith("verd") ? "verde" : color.startsWith("gris") ? "gris" : "amarillo";
  if (/\b(logo|personaliz|impres)/i.test(text) && state.productLines.length === 0) {
    next.art.technicalReviewRequired = !/\b(sin impresi[oó]n|sin personalizaci[oó]n|sin logo|no imprimir)\b/i.test(text);
    next.art.notes = text.slice(0, 300);
  }
  if (/\b(humano|asesor|persona)\b/i.test(text)) next.commercial.humanReviewReasons.push("Cliente solicita asesor");
  if (/\b(descuento)\b/i.test(text)) next.commercial.humanReviewReasons.push("Descuento solicitado");
  if (/cotizaci[oó]n competidora/i.test(text)) next.commercial.competitor = "Mencionado por el cliente";
  const name = text.match(/(?:me llamo|mi nombre es)\s+([\p{L}\s]{2,80})/iu);
  if (name) next.customer.name = name[1].trim();
  const company = text.match(/(?:empresa es|empresa\s*:)\s*([\p{L}0-9 .-]{2,100})/iu);
  if (company) next.company.name = company[1].trim();
  if (/m[aá]s elegante/i.test(text)) next.opportunity.style = "elegante";
  if (question.includes("ciudad") && !next.opportunity.deliveryCity && /^[\p{L}\s]{2,50}$/u.test(text)) next.opportunity.deliveryCity = text;
  if (question.includes("nombre") && !next.customer.name && /^[\p{L}\s]{2,80}$/u.test(text)
      && !/^(no|s[ií]|otra|segunda|primera)$/i.test(text)) next.customer.name = text;
  if (question.includes("empresa") && !next.company.name && /^[\p{L}0-9 .-]{2,100}$/u.test(text)) next.company.name = text;
  return next;
}

/** Migrates a stored schema-v1 single-product session without losing its current candidates. */
export function migrateOpportunityState(raw: unknown): OpportunityState | null {
  if (!raw || typeof raw !== "object") return null;
  const state = raw as Record<string, unknown>;
  if (state.schemaVersion === 2 && Array.isArray(state.productLines)) return state as unknown as OpportunityState;
  if (state.schemaVersion !== 1 || !state.opportunity || typeof state.opportunity !== "object") return null;
  const legacyOpportunity = state.opportunity as OpportunityState["opportunity"];
  const migrated = createOpportunityState(typeof state.sessionId === "string" ? state.sessionId : crypto.randomUUID());
  Object.assign(migrated, state, { schemaVersion: 2, productLines: [], activeProductLineId: null });
  const candidates = Array.isArray(state.products) ? state.products as AgentProduct[] : [];
  if (legacyOpportunity.productInterest || candidates.length) {
    const lineId = crypto.randomUUID();
    const selected = candidates.find((product) => product.state === "selected");
    const line: AgentProductLine = {
      lineId, productInterest: legacyOpportunity.productInterest ?? selected?.name ?? "producto",
      quantity: legacyOpportunity.quantity ?? selected?.quantity ?? null, candidates: candidates.map((product) => ({ ...product })),
      selectedProductId: selected?.id ?? null, selectedVariant: selected?.color ?? null, color: legacyOpportunity.color ?? selected?.color ?? null,
      status: selected ? "selected" : "considering", personalizationRequested: Boolean((state.art as OpportunityState["art"] | undefined)?.technicalReviewRequired),
      personalizationStatus: (state.art as OpportunityState["art"] | undefined)?.technicalReviewRequired ? "requested_review" : "not_requested",
    };
    migrated.productLines = [line]; migrated.activeProductLineId = lineId;
    migrated.products = line.candidates;
  }
  return migrated;
}
