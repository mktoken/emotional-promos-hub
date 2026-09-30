import { loadRealProductById, loadRealProducts, orderedProductOptions, recommendProducts } from "./agent-tools";
import { composeCommercialContext, crossSellSuggestions, recommendationRationale, type CommercialContext } from "./agent-intelligence";
import { captureMessage, createProductLine, createOpportunityState, findRequestedVariant, nextQuestion,
  removeProductLine, replaceProductLine, rejectProduct, restoreProductLine, selectProduct,
  selectedLineProduct, selectedProductLine, setActiveProductLine, setProductLineCandidates,
  setProductLineColor, setProductLinePersonalization, updateProductLineQuantity, migrateOpportunityState,
  type AgentProductLine, type OpportunityState } from "./agent-state";

export interface AgentMessage { role: "user" | "agent"; text: string }
export interface AgentSession {
  state: OpportunityState; messages: AgentMessage[]; operationStarted?: boolean;
  /** Local non-sensitive marker only; CRM IDs stay out of the Web Pilot storage. */
  draftPrepared?: boolean; draftFingerprint?: string;
}
export type ProductSearch = typeof loadRealProducts;
export type SelectedVisualProductLoader = typeof loadRealProductById;

export function newAgentSession(welcome = "Cuéntame qué producto y cantidad necesitas. Buscaré opciones reales del catálogo.",
  initialContext: Partial<Pick<OpportunityState, "company" | "sectorContext" | "sectorPlaybook" | "companyProfile">> = {}): AgentSession {
  return { state: { ...createOpportunityState(crypto.randomUUID()), ...initialContext }, messages: [{ role: "agent", text: welcome }] };
}

function contextualSearchMessage(state: OpportunityState, productInterest: string, count: number): string {
  const context: CommercialContext = composeCommercialContext(state);
  const base = count
    ? `Encontré ${count} productos reales para ${productInterest}. Selecciona una opción; precio V2 y stock se conservan por línea.`
    : `No encontré productos reales compatibles con ${productInterest}. Las demás líneas permanecen intactas.`;
  if (!count || !context.sector) return base;
  const rationale = recommendationRationale(context, productInterest);
  const crossSell = crossSellSuggestions(context, productInterest)[0];
  return `${base}${rationale ? ` ${rationale}` : ""}${crossSell ? ` Complemento conceptual sugerido: ${crossSell}; solo se mostrará si existe en catálogo.` : ""}`;
}

export function migrateAgentSession(raw: unknown): AgentSession | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const state = migrateOpportunityState(value.state);
  const messages = Array.isArray(value.messages) ? value.messages.filter((message): message is AgentMessage =>
    Boolean(message && typeof message === "object" && ["user", "agent"].includes(String((message as AgentMessage).role))
      && typeof (message as AgentMessage).text === "string")) : [];
  if (!state || !messages.length) return null;
  return { state, messages, operationStarted: value.operationStarted === true,
    draftPrepared: value.draftPrepared === true,
    draftFingerprint: typeof value.draftFingerprint === "string" ? value.draftFingerprint : undefined };
}

export function agentDraftFingerprint(state: OpportunityState): string {
  return JSON.stringify({
    opportunity: { useCase: state.opportunity.useCase, eventType: state.opportunity.eventType,
      eventDate: state.opportunity.eventDate, requiredDate: state.opportunity.requiredDate,
      deliveryCity: state.opportunity.deliveryCity, audience: state.opportunity.audience,
      quantityPeople: state.opportunity.quantityPeople, budgetTotal: state.opportunity.budgetTotal,
      budgetPerPerson: state.opportunity.budgetPerPerson, urgency: state.opportunity.urgency },
    productLines: state.productLines.map((line) => ({ lineId: line.lineId, productInterest: line.productInterest,
      quantity: line.quantity, selectedProductId: line.selectedProductId, selectedVariant: line.selectedVariant,
      color: line.color, status: line.status, personalizationStatus: line.personalizationStatus,
      personalizationRequested: line.personalizationRequested, personalizationNotes: line.personalizationNotes ?? null })),
    attachments: state.attachments.map((attachment) => ({ attachmentId: attachment.attachmentId, type: attachment.type,
      filename: attachment.filename, analysisStatus: attachment.analysisStatus, linkedProductLineIds: attachment.linkedProductLineIds,
      summary: attachment.analysis.summary?.value ?? null })),
  });
}

export function appendMessage(session: AgentSession, role: AgentMessage["role"], text: string): AgentSession {
  return { ...session, messages: [...session.messages, { role, text }] };
}

const productTerms = [
  { interest: "libreta", pattern: /\b(libretas?|cuadernos?|notebooks?)\b/i },
  { interest: "termo", pattern: /\b(termos?|cilindros?)\b/i },
  { interest: "bolsa", pattern: /\b(bolsas?)\b/i },
];

export function detectProductInterest(text: string): string | null {
  return productTerms.find((term) => term.pattern.test(text))?.interest ?? null;
}

function mentionsInterest(text: string, interest: string): boolean {
  const normalized = interest.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/libret|cuaderno/.test(normalized)) return /\b(libretas?|cuadernos?|notebooks?)\b/i.test(text);
  if (/termo|cilindro/.test(normalized)) return /\b(termos?|cilindros?)\b/i.test(text);
  if (/bolsa/.test(normalized)) return /\b(bolsas?)\b/i.test(text);
  return text.toLowerCase().includes(interest.toLowerCase());
}

function resolveLine(state: OpportunityState, text: string): { line: AgentProductLine | null; ambiguous: boolean } {
  const active = state.productLines.filter((line) => line.status !== "removed" && line.status !== "rejected");
  const mentions = active.filter((line) => mentionsInterest(text, line.productInterest));
  if (mentions.length === 1) return { line: mentions[0], ambiguous: false };
  if (mentions.length > 1) return { line: null, ambiguous: true };
  const selected = selectedProductLine(state);
  if (selected && /\b(esa|ese|la azul|el azul|la primera|la segunda|la tercera|esa opci[oó]n)\b/i.test(text)) {
    return { line: selected, ambiguous: false };
  }
  if (active.length === 1) return { line: active[0], ambiguous: false };
  if (active.length > 1) return { line: null, ambiguous: true };
  return { line: null, ambiguous: false };
}

function lineForInterest(state: OpportunityState, interest: string): AgentProductLine | null {
  return state.productLines.find((line) => mentionsInterest(interest, line.productInterest)) ?? null;
}

function extractQuantity(text: string, hasTarget: boolean): number | null {
  const explicit = text.match(/\b(\d{1,6})\s*(?:libretas?|cuadernos?|termos?|cilindros?|bolsas?|piezas?|unidades?)\b/i);
  if (explicit) return Number(explicit[1]);
  const ordinalOnly = /\b(?:primera|segunda|tercera|1a|2a|3a)\s+opci[oó]n\b/i.test(text);
  if (ordinalOnly) return null;
  const changed = text.match(/(?:mejor(?:\s+en)?|d[eé]jalo[s]?\s+en|d[eé]jala[s]?\s+en|pon(?:los|las)?\s+en|cot[ií]zame|cantidad\s*:|\ben|\bpero)\s*(\d{1,6})\b/i);
  if (changed) return Number(changed[1]);
  if (hasTarget && /^\d{1,6}$/.test(text.trim())) return Number(text.trim());
  return null;
}

function extractColor(text: string): string | null {
  const found = text.match(/\b(azul(?:es)?|rojos?|rojas?|negros?|negras?|blancos?|blancas?|verdes?|grises?|amarillos?|amarillas?)\b/i)?.[1]?.toLowerCase();
  if (!found) return null;
  if (found.startsWith("azul")) return "azul";
  if (found.startsWith("roj")) return "rojo";
  if (found.startsWith("negr")) return "negro";
  if (found.startsWith("blanc")) return "blanco";
  if (found.startsWith("verd")) return "verde";
  if (found.startsWith("gris")) return "gris";
  return "amarillo";
}

function optionOrdinal(text: string): number | null {
  const found = text.match(/\b(?:la\s+)?(?:opci[oó]n\s*)?(primera|segunda|tercera|1a|2a|3a|1|2|3)(?:\s+opci[oó]n)?\b/i);
  if (!found) return null;
  const value = found[1].toLowerCase();
  return ({ primera: 0, segunda: 1, tercera: 2, "1a": 0, "2a": 1, "3a": 2, "1": 0, "2": 1, "3": 2 } as Record<string, number>)[value] ?? null;
}

function optionLabel(text: string): string | null {
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/\b(economica|economico|mas barata|menor precio)\b/.test(normalized)) return "económica";
  if (/\b(recomendada|recomendado)\b/.test(normalized)) return "recomendada";
  if (/\b(premium|mayor precio)\b/.test(normalized)) return "premium";
  if (/\b(alternativa)\b/.test(normalized)) return "alternativa";
  return null;
}

function isAddRequest(text: string): boolean {
  return /\b(tambi[eé]n|agrega(?:r)?|a[nñ]ade|incluye|sumemos)\b/i.test(text)
    || /^\s*y\s+/i.test(text);
}

function parseReplacement(text: string): { from: string; to: string } | null {
  if (!/\b(cambia|cambiar|reemplaza|sustituye)\b/i.test(text)) return null;
  const terms = [...productTerms];
  for (const from of terms) for (const to of terms) {
    if (from.interest !== to.interest && from.pattern.test(text) && to.pattern.test(text)) {
      const fromAt = text.search(from.pattern);
      const toAt = text.search(to.pattern);
      if (fromAt < toAt) return { from: from.interest, to: to.interest };
    }
  }
  return null;
}

function capturePersonalization(state: OpportunityState, line: AgentProductLine, text: string): OpportunityState {
  if (/\b(logo|personaliz|impres|sin logo|sin impresi[oó]n)\b/i.test(text)) {
    return setProductLinePersonalization(state, line.lineId, text);
  }
  return state;
}

export async function advanceAgent(
  session: AgentSession, text: string, searchProducts: ProductSearch = loadRealProducts,
  loadSelectedVisualProduct: SelectedVisualProductLoader = loadRealProductById,
): Promise<{ session: AgentSession; searchFailed: boolean }> {
  const normalizedText = text.trim();
  let current = appendMessage(session, "user", normalizedText);
  let state = captureMessage(session.state, normalizedText);
  let searchFailed = false;
  if (!normalizedText) return { session: current, searchFailed };

  const pendingVisualSelection = state.attachments.find((attachment) =>
    attachment.selectedVisualCandidateId && attachment.visualCandidates?.some((candidate) =>
      candidate.productId === attachment.selectedVisualCandidateId));
  const visualCandidate = pendingVisualSelection?.visualCandidates?.find((candidate) =>
    candidate.productId === pendingVisualSelection.selectedVisualCandidateId);
  const visualQuantity = extractQuantity(normalizedText, true);
  if (pendingVisualSelection && visualCandidate && visualQuantity !== null) {
    const minimum = visualCandidate.minimumQuantity;
    if (minimum !== null && visualQuantity < minimum) {
      const message = `El mínimo de compra de ${visualCandidate.name} es ${minimum} piezas. No consulté precio ni suficiencia de stock. ¿Necesitas al menos ${minimum} piezas?`;
      return { session: appendMessage({ ...current, state }, "agent", message), searchFailed: false };
    }
    const linkedPendingLines = state.productLines.filter((line) =>
      pendingVisualSelection.linkedProductLineIds.includes(line.lineId)
      && line.quantity === null && !["removed", "rejected"].includes(line.status));
    if (linkedPendingLines.length > 1) {
      const message = "La referencia está vinculada a varias líneas sin cantidad. Indica a cuál línea corresponde antes de continuar.";
      return { session: appendMessage({ ...current, state }, "agent", message), searchFailed: false };
    }
    try {
      const product = await loadSelectedVisualProduct(visualCandidate.productId, visualQuantity);
      if (!product) throw new Error("La ficha del producto ya no está disponible.");
      if (product.price.status === "below_minimum" && product.price.minimumQuantity !== null) {
        const message = `El mínimo de compra vigente de ${product.name} es ${product.price.minimumQuantity} piezas. No se creó la línea; indica una cantidad que cumpla ese mínimo.`;
        return { session: appendMessage({ ...current, state }, "agent", message), searchFailed: false };
      }
      let nextState = state;
      let lineId: string;
      if (linkedPendingLines.length === 1) {
        lineId = linkedPendingLines[0].lineId;
        nextState = updateProductLineQuantity(nextState, lineId, visualQuantity);
      } else {
        nextState = createProductLine(nextState, visualCandidate.category, visualQuantity);
        lineId = selectedProductLine(nextState)!.lineId;
      }
      nextState = setProductLineCandidates(nextState, lineId, [product]);
      nextState = selectProduct(nextState, product.id, lineId);
      nextState = { ...nextState, attachments: nextState.attachments.map((attachment) =>
        attachment.attachmentId === pendingVisualSelection.attachmentId
          ? { ...attachment, linkedProductLineIds: [...new Set([...attachment.linkedProductLineIds, lineId])] }
          : attachment) };
      const finalLine = nextState.productLines.find((line) => line.lineId === lineId);
      const statusMessage = finalLine?.status === "requires_review"
        ? `${product.name} tiene cantidad y precio verificados, pero requiere revisión de elegibilidad o stock.`
        : `${product.name} quedó asociado a la cantidad de ${visualQuantity} piezas tras tu selección explícita.`;
      return { session: appendMessage({ ...current, state: nextState }, "agent", `${statusMessage} ${nextQuestion(nextState)}`), searchFailed: false };
    } catch {
      return { session: appendMessage({ ...current, state }, "agent", "No pude verificar el producto para esa cantidad. La referencia visual sigue guardada; intenta de nuevo o pide revisión humana."), searchFailed: true };
    }
  }

  const replacement = parseReplacement(normalizedText);
  const detectedInterest = detectProductInterest(normalizedText);
  const mentionsSeveralKinds = productTerms.filter((term) => term.pattern.test(normalizedText)).length > 1;
  const additive = isAddRequest(normalizedText);
  let line = null as AgentProductLine | null;
  let creatingNewLine = false;

  if (mentionsSeveralKinds && !replacement) {
    current = appendMessage(current, "agent", "Mencionaste más de un tipo de producto. Indica cada línea por separado para no mezclar cantidades ni referencias.");
    return { session: current, searchFailed };
  }

  if (replacement) {
    const matches = state.productLines.filter((item) => mentionsInterest(replacement.from, item.productInterest)
      && item.status !== "removed" && item.status !== "rejected");
    if (matches.length > 1) {
      current = appendMessage(current, "agent", `Hay varias líneas de ${replacement.from}. Indica cuál quieres reemplazar; no cambiaré ninguna por suposición.`);
      return { session: current, searchFailed };
    }
    const oldLine = matches[0] ?? lineForInterest(state, replacement.from);
    if (!oldLine) {
      current = appendMessage(current, "agent", `No identifiqué una línea de ${replacement.from} que pueda reemplazar.`);
      return { session: current, searchFailed };
    }
    const quantity = extractQuantity(normalizedText, true) ?? oldLine.quantity;
    state = replaceProductLine(state, oldLine.lineId, replacement.to, quantity);
    line = state.productLines.find((item) => item.lineId === oldLine.lineId) ?? null;
  } else if (detectedInterest) {
    const matchingLines = state.productLines.filter((item) => mentionsInterest(detectedInterest, item.productInterest));
    const existing = matchingLines.find((item) => item.status === "removed") ?? matchingLines[0] ?? null;
    const restoring = existing?.status === "removed" && /\b(restaur|nuevamente|otra vez|reagrega)\b/i.test(normalizedText);
    if (matchingLines.filter((item) => item.status !== "removed" && item.status !== "rejected").length > 1 && !additive && !restoring) {
      current = appendMessage(current, "agent", `Hay más de una línea de ${detectedInterest}. Indica cuál quieres cambiar; no modificaré ninguna por suposición.`);
      return { session: current, searchFailed };
    }
    if (existing?.status === "removed" && restoring) {
      state = restoreProductLine(state, existing.lineId);
      line = state.productLines.find((item) => item.lineId === existing.lineId) ?? null;
    } else if (existing && additive && existing.status !== "removed") {
      if (!/\b(otra l[ií]nea|l[ií]nea adicional|por separado)\b/i.test(normalizedText)) {
        current = appendMessage(current, "agent", `Ya hay una línea de ${detectedInterest}. ¿Quieres cambiar su cantidad o agregar explícitamente otra línea por separado?`);
        return { session: current, searchFailed };
      }
      creatingNewLine = true;
      const quantity = extractQuantity(normalizedText, true);
      state = createProductLine(state, detectedInterest, quantity);
      line = selectedProductLine(state);
    } else if (existing) {
      line = existing;
      state = setActiveProductLine(state, line.lineId);
    } else {
      creatingNewLine = true;
      state = createProductLine(state, detectedInterest, extractQuantity(normalizedText, true));
      line = selectedProductLine(state);
    }
  } else {
    const needsProductLine = extractQuantity(normalizedText, true) !== null
      || extractColor(normalizedText) !== null
      || optionOrdinal(normalizedText) !== null
      || optionLabel(normalizedText) !== null
      || /\b(quita|elimina|retira|borra|logo|personaliz|impres|esa|ese)\b/i.test(normalizedText);
    if (!needsProductLine) {
      current = { ...current, state };
      return { session: appendMessage(current, "agent", nextQuestion(state)), searchFailed };
    }
    const resolved = resolveLine(state, normalizedText);
    if (resolved.ambiguous) {
      current = appendMessage(current, "agent", "¿A cuál producto te refieres: libretas, termos o bolsas? No cambiaré ninguna línea hasta confirmarlo.");
      return { session: current, searchFailed };
    }
    line = resolved.line;
    if (line) state = setActiveProductLine(state, line.lineId);
  }

  if (line?.status === "removed" && !/\b(restaur|nuevamente|otra vez|reagrega)\b/i.test(normalizedText)) {
    current = { ...current, state };
    return { session: appendMessage(current, "agent", `La línea de ${line.productInterest} está eliminada. Di “agrega nuevamente ${line.productInterest}” para restaurarla.`), searchFailed };
  }

  if (!line && detectedInterest === null && !replacement) {
    current = { ...current, state };
    return { session: appendMessage(current, "agent", nextQuestion(state)), searchFailed };
  }

  if (line && /\b(quita|quita las|elimina|eliminar|retira|borra)\b/i.test(normalizedText)) {
    state = removeProductLine(state, line.lineId);
    current = { ...current, state };
    return { session: appendMessage(current, "agent", `Quité la línea de ${line.productInterest}. Las demás líneas se conservan.`), searchFailed };
  }

  if (!line) return { session: { ...current, state }, searchFailed };
  const oldLine = state.productLines.find((item) => item.lineId === line?.lineId) ?? line;
  const oldSelectedId = selectedLineProduct(oldLine)?.id ?? oldLine.selectedProductId;
  const quantity = extractQuantity(normalizedText, true);
  let quantityChanged = false;
  if (quantity !== null && quantity !== oldLine.quantity) {
    state = updateProductLineQuantity(state, oldLine.lineId, quantity);
    quantityChanged = true;
  }

  const color = extractColor(normalizedText);
  if (color) state = setProductLineColor(state, oldLine.lineId, color);
  state = capturePersonalization(state, oldLine, normalizedText);

  const rejectsCurrent = /\b(esa no|ese no|otra opci[oó]n)\b/i.test(normalizedText);
  if (rejectsCurrent && oldSelectedId) state = rejectProduct(state, oldSelectedId, oldLine.lineId);

  let currentLine = state.productLines.find((item) => item.lineId === oldLine.lineId);
  const needsSearch = Boolean(currentLine && currentLine.quantity !== null
    && (creatingNewLine || quantityChanged || !currentLine.candidates.length || oldLine.productInterest !== currentLine.productInterest));
  if (needsSearch && currentLine?.quantity !== null && currentLine) {
    try {
      const candidates = await searchProducts(currentLine.productInterest, currentLine.quantity);
      state = setProductLineCandidates(state, currentLine.lineId, candidates, quantityChanged ? oldSelectedId : currentLine.selectedProductId);
      currentLine = state.productLines.find((item) => item.lineId === oldLine.lineId);
      state = { ...state, trace: [...state.trace, { tool: `search_products:${currentLine?.productInterest ?? "line"}`, ok: true, timestamp: new Date().toISOString() }] };
      const resultMessage = contextualSearchMessage(state, currentLine?.productInterest ?? "producto", candidates.length);
      current = appendMessage(current, "agent", resultMessage);
    } catch {
      searchFailed = true;
      state = { ...state, trace: [...state.trace, { tool: `search_products:${currentLine?.productInterest ?? "line"}`, ok: false, timestamp: new Date().toISOString() }] };
      current = appendMessage(current, "agent", `No pude verificar el catálogo de ${currentLine?.productInterest}. No se modificaron las demás líneas; intenta de nuevo o pide revisión humana.`);
    }
  }

  currentLine = state.productLines.find((item) => item.lineId === oldLine.lineId);
  const ordinal = optionOrdinal(normalizedText);
  const label = optionLabel(normalizedText);
  if (currentLine && (ordinal !== null || label !== null)) {
    const candidate = ordinal !== null ? orderedProductOptions(currentLine.candidates)[ordinal]
      : recommendProducts(currentLine.candidates).find((item) => item.label.toLowerCase() === label)?.product;
    if (!candidate) {
      current = appendMessage(current, "agent", label
        ? `No tengo una opción ${label} verificada para ${currentLine.productInterest}.`
        : `No hay una opción ${ordinal! + 1} disponible para ${currentLine.productInterest}.`);
    } else {
      state = selectProduct(state, candidate.id, currentLine.lineId);
      currentLine = state.productLines.find((item) => item.lineId === oldLine.lineId);
    }
  }
  if (currentLine && color && currentLine.selectedProductId) {
    const product = selectedLineProduct(currentLine);
    if (product && !findRequestedVariant(product.variants, color)) {
      current = appendMessage(current, "agent", `No encontré una variante ${color} verificada en ${product.name}; la línea requiere revisión y no asumí equivalencias.`);
    }
  }

  currentLine = state.productLines.find((item) => item.lineId === oldLine.lineId);
  if (currentLine?.selectedProductId && currentLine.color && currentLine.selectedVariant === null) {
    const product = selectedLineProduct(currentLine);
    const variant = product ? findRequestedVariant(product.variants, currentLine.color) : undefined;
    if (variant) state = setProductLineColor(state, currentLine.lineId, currentLine.color);
  }

  state = setActiveProductLine(state, oldLine.lineId);
  current = { ...current, state };
  return { session: appendMessage(current, "agent", nextQuestion(state)), searchFailed };
}

export function chooseAgentProduct(session: AgentSession, id: string, lineId?: string): AgentSession {
  let state = selectProduct(session.state, id, lineId ?? session.state.activeProductLineId);
  let line = selectedProductLine(state);
  if (line?.color && line.selectedVariant === null) {
    const product = selectedLineProduct(line);
    if (product && findRequestedVariant(product.variants, line.color)) {
      state = setProductLineColor(state, line.lineId, line.color);
      line = selectedProductLine(state);
    }
  }
  return appendMessage({ ...session, state }, "agent", line
    ? `${selectedLineProduct(line)?.name ?? "La opción"} quedó seleccionada para ${line.productInterest}. ${nextQuestion(state)}`
    : nextQuestion(state));
}
