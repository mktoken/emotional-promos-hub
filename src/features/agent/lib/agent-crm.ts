import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { submitPublicQuoteRequest } from "@/features/quotes/lib/public-quote-request";
import { buildDraftQuotePlan, enrichDraftQuotePlanWithOpportunityItems, planDraftQuoteReconciliation } from "./agent-quote";
import { findRequestedVariant, handoffReasons, selectedLineProduct, selectedProductLines,
  setActiveProductLine, type AgentProduct, type AgentProductLine, type OpportunityState } from "./agent-state";
import { loadRealProductById } from "./agent-tools";
import { composeCommercialContext, conceptualKit, crossSellSuggestions } from "./agent-intelligence";
import { QA_CONTACT } from "./agent-qa-contact";

export { QA_CONTACT } from "./agent-qa-contact";

export interface QaOperationResult { prospectId: string; opportunityId: string; draftQuoteId: string }
const ownershipMarker = (sessionId: string) => `QA Super Agente ${sessionId}`;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

async function assertQaStaff() {
  const localPilot = import.meta.env.VITE_ENABLE_AGENT_WEB_PILOT === "true"
    && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (import.meta.env.VITE_ENABLE_AGENT_QA !== "true" && !localPilot) throw new Error("Feature flag de QA desactivada.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Se requiere sesión CRM.");
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
  if (error || !(roles ?? []).some((row) => ["admin", "sales_manager", "sales_agent"].includes(row.role))) {
    throw new Error("Se requiere rol comercial de CRM.");
  }
  return auth.user.id;
}

function activeLines(state: OpportunityState): AgentProductLine[] {
  return state.productLines.filter((line) => line.status !== "removed" && line.status !== "rejected");
}

function assertSelectedLines(state: OpportunityState): Array<{ line: AgentProductLine; product: AgentProduct }> {
  const active = activeLines(state);
  const selected = selectedProductLines(state);
  if (!active.length || selected.length !== active.length) {
    throw new Error("Selecciona una opción verificada para cada línea activa; las líneas incompletas no se guardarán.");
  }
  return selected.map((line) => {
    const product = selectedLineProduct(line);
    if (!product || !line.quantity || product.quantity !== line.quantity) throw new Error(`La cantidad o selección de ${line.productInterest} requiere revisión.`);
    if (line.status !== "selected" || product.price.status !== "priced" || product.price.unitPriceBeforeTaxMxn === null
        || !product.price.isValidQuantity) throw new Error(`El precio de ${line.productInterest} no está verificado para cotizar.`);
    if (product.observedStock !== null && product.observedStock < line.quantity) throw new Error(`El stock observado de ${line.productInterest} es menor a la cantidad solicitada.`);
    return { line, product };
  });
}

async function revalidateSelectedLines(state: OpportunityState): Promise<OpportunityState> {
  const selected = assertSelectedLines(state);
  let next = state;
  for (const { line } of selected) {
    const product = selectedLineProduct(line)!;
    const fresh = await loadRealProductById(product.id, line.quantity!);
    if (!fresh || fresh.price.status !== "priced" || fresh.price.unitPriceBeforeTaxMxn === null || !fresh.price.isValidQuantity) {
      throw new Error(`No pude revalidar precio V2 de ${line.productInterest}; no se guardó la cotización.`);
    }
    let verified: AgentProduct = { ...fresh, state: "selected" };
    const requestedColor = line.selectedVariant ?? line.color;
    if (requestedColor) {
      const variant = findRequestedVariant(fresh.variants, requestedColor);
      if (!variant) throw new Error(`La variante ${requestedColor} de ${line.productInterest} ya no está verificada.`);
      verified = { ...verified, color: variant.color, observedStock: variant.stock,
        stockStatus: variant.stock === null ? "unknown" : "observed" };
      if (variant.stock !== null && variant.stock < line.quantity!) throw new Error(`El stock observado de la variante de ${line.productInterest} es insuficiente.`);
    }
    const candidates = line.candidates.map((candidate) => candidate.id === verified.id ? verified : candidate);
    if (!candidates.some((candidate) => candidate.id === verified.id)) candidates.push(verified);
    const updatedLine = { ...line, candidates, selectedProductId: verified.id,
      selectedVariant: verified.color, color: verified.color ?? line.color, status: "selected" as const };
    next = { ...next, productLines: next.productLines.map((item) => item.lineId === line.lineId ? updatedLine : item) };
  }
  const currentLine = next.productLines.find((line) => line.lineId === next.activeProductLineId);
  if (currentLine) next = setActiveProductLine(next, currentLine.lineId);
  return next;
}

function selectedSnapshot(line: AgentProductLine) {
  const product = selectedLineProduct(line) ?? line.candidates.find((candidate) => candidate.id === line.selectedProductId) ?? null;
  return {
    lineId: line.lineId, productInterest: line.productInterest, productId: product?.id ?? null,
    sku: product?.sku ?? null, productName: product?.name ?? null, quantity: line.quantity,
    selectedVariant: line.selectedVariant, color: line.color ?? product?.color ?? null,
    pricingStatus: product?.price.status ?? "not_quoted", unitPriceBeforeTaxMxn: product?.price.unitPriceBeforeTaxMxn ?? null,
    stockObserved: product?.observedStock ?? null, stockStatus: product?.stockStatus ?? "unknown",
    status: line.status, personalizationRequested: line.personalizationRequested,
    personalizationStatus: line.personalizationStatus, personalizationNotes: line.personalizationNotes ?? null,
  };
}

export function safeQaContext(state: OpportunityState, prospectId: string): Json {
  const intelligence = composeCommercialContext(state);
  return {
    schemaVersion: state.schemaVersion, sessionId: state.sessionId,
    crm: { prospectId },
    customer: { name: QA_CONTACT.name, email: QA_CONTACT.email, phone: QA_CONTACT.phone },
    company: { name: QA_CONTACT.company, intelligenceStatus: state.company.intelligenceStatus },
    commercialIntelligence: {
      sector: intelligence.sector ? { id: intelligence.sector.id, sector: intelligence.sector.sector,
        subsector: intelligence.sector.subsector, confidence: intelligence.sector.provenance.confidence,
        source: intelligence.sector.provenance.reference, lastVerified: intelligence.sector.provenance.lastVerified } : null,
      company: intelligence.company ? { profileId: intelligence.company.profileId, companyName: intelligence.company.companyName,
        confidence: intelligence.company.provenance[0]?.confidence, source: intelligence.company.provenance[0]?.reference,
        lastVerified: intelligence.company.provenance[0]?.lastVerified } : null,
      conceptualKit: conceptualKit(intelligence), crossSell: intelligence.sector
        ? [...new Set(intelligence.sector.productAffinities.flatMap((item) => crossSellSuggestions(intelligence, item)))].slice(0, 6) : [],
    },
    opportunity: state.opportunity as unknown as Json,
    activeProductLineId: state.activeProductLineId,
    productLines: state.productLines.map(selectedSnapshot),
    products: state.productLines.filter((line) => line.status !== "removed" && line.status !== "rejected")
      .flatMap((line) => line.candidates.filter((product) => product.id === line.selectedProductId)
        .map((product) => ({ lineId: line.lineId, id: product.id, sku: product.sku, name: product.name,
          quantity: line.quantity, color: line.color ?? product.color, priceStatus: product.price.status,
          unitPriceBeforeTaxMxn: product.price.unitPriceBeforeTaxMxn, observedStock: product.observedStock, state: line.status }))),
    art: { ...state.art, technicalReviewRequired: state.productLines.length
      ? state.productLines.some((line) => line.personalizationStatus === "requested_review")
      : state.art.technicalReviewRequired } as unknown as Json,
    commercial: { nextAction: "Revisión humana", humanReviewReasons: handoffReasons(state) },
  } as Json;
}

function publicRequestItems(state: OpportunityState, lines: Array<{ line: AgentProductLine; product: AgentProduct }>) {
  return lines.map(({ line, product }) => ({
    product_id: product.id, quantity: line.quantity!, color: line.color ?? product.color ?? undefined,
    personalization: line.personalizationStatus === "requested_review"
      ? { type: "advisor_review", label: line.personalizationNotes?.slice(0, 160), requires_review: true }
      : line.personalizationStatus === "no_print_requested"
        ? { type: "no_print", label: "Sin impresión solicitada", requires_review: false }
        : undefined,
    observation: `${ownershipMarker(state.sessionId)}; ${line.productInterest}; ${state.opportunity.useCase ?? ""}`.trim(),
  }));
}

function publicLeadItems(lines: Array<{ line: AgentProductLine; product: AgentProduct }>) {
  return lines.map(({ line, product }, index) => {
    const price = product.price.unitPriceBeforeTaxMxn!;
    const subtotal = roundMoney(price * line.quantity!);
    const personalization = line.personalizationStatus === "requested_review"
      ? { type: "advisor_review", label: line.personalizationNotes?.slice(0, 160) ?? "Revisión técnica requerida", requires_review: true }
      : line.personalizationStatus === "no_print_requested"
        ? { type: "no_print", label: "Sin impresión solicitada", requires_review: false }
        : { type: "not_specified", label: "Por definir con asesor", requires_review: true };
    return {
      line_number: index + 1, producto_id: product.id, id_interno: product.sku ?? product.id,
      nombre: product.name, sku: product.sku ?? product.id, clave_producto: product.sku ?? product.id,
      modelo_comercial: product.name, descripcion: product.name, color: line.color ?? product.color,
      cantidad: line.quantity, public_price_status: product.price.status, precio_unitario_estimado: price,
      subtotal, currency: product.price.currency, minimum_quantity: product.price.minimumQuantity,
      pricing_generation_id: product.price.pricingGenerationId, requested_quantity: product.price.requestedQuantity,
      is_valid_quantity: product.price.isValidQuantity, personalizacion_solicitada_cliente: personalization,
      personalizacion: personalization.label, requiere_revision_tecnica: personalization.requires_review,
    };
  });
}

export async function createOrUpdateOpportunity(state: OpportunityState): Promise<string> {
  await assertQaStaff();
  const lines = assertSelectedLines(state);
  const { data: existing, error: lookupError } = await supabase.from("cotizaciones_leads")
    .select("id,public_request_id,datos_cliente,estado_cotizacion").eq("public_request_id", state.sessionId).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    const customer = existing.datos_cliente && typeof existing.datos_cliente === "object"
      ? existing.datos_cliente as Record<string, unknown> : {};
    if (existing.public_request_id !== state.sessionId || customer.email !== QA_CONTACT.email
        || (existing.estado_cotizacion && !["NUEVA", "BORRADOR"].includes(existing.estado_cotizacion))) {
      throw new Error("La oportunidad existente no es editable por esta sesión QA.");
    }
    const items = publicLeadItems(lines);
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const { error } = await supabase.from("cotizaciones_leads").update({
      articulos_cotizados: items as unknown as Json, total_estimado: subtotal,
      datos_cliente: { ...customer, pricing_mode: "v2", formato_propuesta: "individual",
        modalidad_cotizacion: "INDIVIDUAL", modalidad_cotizacion_label: "Cotizar por separado" } as Json,
    }).eq("id", existing.id).eq("public_request_id", state.sessionId);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const result = await submitPublicQuoteRequest({ requestId: state.sessionId, contact: QA_CONTACT,
    quoteFormat: "individual", items: publicRequestItems(state, lines) });
  return result.quoteId;
}

export async function saveOpportunityContext(opportunityId: string, state: OpportunityState, prospectId: string): Promise<void> {
  await assertQaStaff();
  const { data: current, error: readError } = await supabase.from("cotizaciones_leads")
    .select("datos_cliente,public_request_id").eq("id", opportunityId).single();
  if (readError || !current || current.public_request_id !== state.sessionId) throw new Error("La oportunidad QA no coincide con esta sesión.");
  const currentCustomer = current.datos_cliente && typeof current.datos_cliente === "object"
    ? current.datos_cliente as Record<string, unknown> : {};
  if (currentCustomer.email !== QA_CONTACT.email) throw new Error("Destino no QA; actualización rechazada.");
  const { error } = await supabase.from("cotizaciones_leads").update({
    datos_cliente: { ...currentCustomer, agent_qa_context: safeQaContext(state, prospectId) } as Json,
  }).eq("id", opportunityId).eq("public_request_id", state.sessionId);
  if (error) throw new Error(error.message);
}

export async function createOrUpdateProspect(opportunityId: string, state: OpportunityState): Promise<string> {
  await assertQaStaff();
  const { data: existing, error: lookupError } = await supabase.from("crm_leads")
    .select("id,company_name,email").eq("web_lead_id", opportunityId).is("deleted_at", null).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    if (existing.company_name !== QA_CONTACT.company || existing.email !== QA_CONTACT.email) throw new Error("Existe un prospecto no QA para esta oportunidad.");
    return existing.id;
  }
  const { data: knownQa, error: knownError } = await supabase.from("crm_leads")
    .select("id,company_name").eq("email", QA_CONTACT.email).is("deleted_at", null).maybeSingle();
  if (knownError) throw new Error(knownError.message);
  if (knownQa) {
    if (knownQa.company_name !== QA_CONTACT.company) throw new Error("La identidad QA coincide con un prospecto de otra empresa.");
    return knownQa.id;
  }
  const productInterest = activeLines(state).map((line) => `${line.productInterest}${line.quantity ? ` (${line.quantity})` : ""}`).join(", ");
  const { data, error } = await supabase.from("crm_leads").insert({
    source: "asistente_virtual", status: "interesado", web_lead_id: opportunityId,
    company_name: QA_CONTACT.company, contact_name: QA_CONTACT.name,
    email: QA_CONTACT.email, phone: QA_CONTACT.phone, product_interest: productInterest,
    city: state.opportunity.deliveryCity ?? null,
    notes: `${ownershipMarker(state.sessionId)}. Revisión humana requerida.`,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se creó prospecto QA.");
  return data.id;
}

export async function createDraftQuote(opportunityId: string, state: OpportunityState): Promise<string> {
  const userId = await assertQaStaff();
  assertSelectedLines(state);
  const { data: existing, error: lookupError } = await supabase.from("formal_quotes")
    .select("id,status,cliente,notas_internas").eq("cotizacion_lead_id", opportunityId).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    const client = existing.cliente && typeof existing.cliente === "object" ? existing.cliente as Record<string, unknown> : {};
    if (existing.status !== "BORRADOR" || client.email !== QA_CONTACT.email
        || !existing.notas_internas?.includes(ownershipMarker(state.sessionId))) {
      throw new Error("La cotización existente está fuera de esta sesión QA.");
    }
    return existing.id;
  }
  const { data, error } = await supabase.from("formal_quotes").insert({
    cotizacion_lead_id: opportunityId, status: "BORRADOR", created_by: userId,
    cliente: { nombre: QA_CONTACT.name, empresa: QA_CONTACT.company, email: QA_CONTACT.email, telefono: QA_CONTACT.phone } as Json,
    notas_internas: `${ownershipMarker(state.sessionId)}. No emitir ni enviar.`,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se creó borrador QA.");
  return data.id;
}

export async function syncDraftQuoteItems(quoteId: string, state: OpportunityState): Promise<void> {
  await assertQaStaff();
  assertSelectedLines(state);
  let plan = buildDraftQuotePlan(state);
  const { data: quote, error: quoteError } = await supabase.from("formal_quotes")
    .select("id,status,cliente,notas_internas,cotizacion_lead_id").eq("id", quoteId).single();
  const client = quote?.cliente && typeof quote.cliente === "object" ? quote.cliente as Record<string, unknown> : {};
  if (quoteError || !quote || quote.status !== "BORRADOR" || client.email !== QA_CONTACT.email
      || !quote.notas_internas?.includes(ownershipMarker(state.sessionId))) {
    throw new Error("La cotización no es un borrador QA de esta sesión.");
  }
  if (quote.cotizacion_lead_id) {
    const { data: opportunity, error: opportunityError } = await supabase.from("cotizaciones_leads")
      .select("articulos_cotizados").eq("id", quote.cotizacion_lead_id).single();
    if (opportunityError) throw new Error(opportunityError.message);
    plan = enrichDraftQuotePlanWithOpportunityItems(plan, opportunity.articulos_cotizados);
  }
  const { data: existing, error: itemError } = await supabase.from("formal_quote_items")
    .select("id,notes_internal").eq("formal_quote_id", quoteId);
  if (itemError) throw new Error(itemError.message);
  const reconciliation = planDraftQuoteReconciliation(existing ?? [], plan.items, state.sessionId);
  for (const id of reconciliation.deleteIds) {
    const { error } = await supabase.from("formal_quote_items").delete()
      .eq("id", id).eq("formal_quote_id", quoteId);
    if (error) throw new Error(error.message);
  }
  for (const item of reconciliation.upserts) {
    const { error } = item.existingId
      ? await supabase.from("formal_quote_items").update(item.values).eq("id", item.existingId).eq("formal_quote_id", quoteId)
      : await supabase.from("formal_quote_items").insert({ ...item.values, formal_quote_id: quoteId });
    if (error) throw new Error(error.message);
  }

  const { error: totalError } = await supabase.from("formal_quotes").update({ ...plan.totals })
    .eq("id", quoteId).eq("status", "BORRADOR");
  if (totalError) throw new Error(totalError.message);
}

export const addOrUpdateDraftQuoteItem = syncDraftQuoteItems;

export async function requestHumanReview(prospectId: string, state: OpportunityState): Promise<void> {
  await assertQaStaff();
  const summaries = state.productLines.map((line) => {
    const product = selectedLineProduct(line) ?? line.candidates.find((item) => item.id === line.selectedProductId);
    return `${line.productInterest}: ${line.status}${product ? `, ${product.name}, qty ${line.quantity}, ${product.price.status}, stock ${product.observedStock ?? "no observado"}` : ""}`;
  }).join("; ");
  const { error } = await supabase.from("crm_leads").update({
    notes: `${ownershipMarker(state.sessionId)}. Revisión humana: ${handoffReasons(state).join("; ") || "verificar operación"}. Líneas: ${summaries}`,
  }).eq("id", prospectId).eq("email", QA_CONTACT.email);
  if (error) throw new Error(error.message);
}

export async function commitQaOperation(state: OpportunityState): Promise<QaOperationResult> {
  await assertQaStaff();
  const verifiedState = await revalidateSelectedLines(state);
  const opportunityId = await createOrUpdateOpportunity(verifiedState);
  const prospectId = await createOrUpdateProspect(opportunityId, verifiedState);
  await saveOpportunityContext(opportunityId, verifiedState, prospectId);
  const draftQuoteId = await createDraftQuote(opportunityId, verifiedState);
  await syncDraftQuoteItems(draftQuoteId, verifiedState);
  await requestHumanReview(prospectId, verifiedState);
  return { prospectId, opportunityId, draftQuoteId };
}
