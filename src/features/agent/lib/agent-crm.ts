import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { submitPublicQuoteRequest } from "@/features/quotes/lib/public-quote-request";
import { calcQuoteTotals } from "@/features/crm/lib/formal-quote-calc";
import { selectedProduct, handoffReasons, type OpportunityState } from "./agent-state";

export const QA_CONTACT = {
  name: "QA Automatizado", company: "QA PromoHub - NO CONTACTAR",
  email: "qa-promohub@example.com", phone: "5500000000",
} as const;

export interface QaOperationResult { prospectId: string; opportunityId: string; draftQuoteId: string }

async function assertQaStaff() {
  if (import.meta.env.VITE_ENABLE_AGENT_QA !== "true") throw new Error("Feature flag de QA desactivada.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Se requiere sesión CRM.");
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
  if (error || !(roles ?? []).some((r) => ["admin", "sales_manager", "sales_agent"].includes(r.role))) {
    throw new Error("Se requiere rol comercial de CRM.");
  }
  return auth.user.id;
}

function safeQaContext(state: OpportunityState): Json {
  return {
    schemaVersion: state.schemaVersion, sessionId: state.sessionId,
    customer: { name: QA_CONTACT.name, email: QA_CONTACT.email, phone: QA_CONTACT.phone },
    company: { name: QA_CONTACT.company, intelligenceStatus: state.company.intelligenceStatus },
    opportunity: state.opportunity as unknown as Json,
    products: state.products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, quantity: p.quantity,
      color: p.color, priceStatus: p.price.status, observedStock: p.observedStock, state: p.state })),
    art: state.art as unknown as Json,
    commercial: { nextAction: "Revisión humana", humanReviewReasons: handoffReasons(state) },
  } as Json;
}

export async function createOrUpdateOpportunity(state: OpportunityState): Promise<string> {
  await assertQaStaff();
  const p = selectedProduct(state);
  if (!p) throw new Error("Selecciona un producto real antes de guardar la oportunidad QA.");
  if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.price.status === "below_minimum" || p.price.status === "unavailable") {
    throw new Error("El producto o la cantidad no son válidos para una solicitud QA.");
  }
  const result = await submitPublicQuoteRequest({
    requestId: state.sessionId, contact: QA_CONTACT, quoteFormat: "individual",
    items: [{ product_id: p.id, quantity: p.quantity, color: p.color ?? undefined,
      personalization: state.art.technicalReviewRequired ? { type: "advisor_review", requires_review: true } : undefined,
      observation: `QA Super Agente. ${state.opportunity.useCase ?? ""} ${state.art.notes ?? ""}`.trim() }],
  });
  return result.quoteId;
}

export async function saveOpportunityContext(opportunityId: string, state: OpportunityState): Promise<void> {
  await assertQaStaff();
  const { data: current, error: readError } = await supabase.from("cotizaciones_leads")
    .select("datos_cliente,public_request_id").eq("id", opportunityId).single();
  if (readError || !current || current.public_request_id !== state.sessionId) throw new Error("La oportunidad QA no coincide con esta sesión.");
  const currentCustomer = current.datos_cliente && typeof current.datos_cliente === "object"
    ? current.datos_cliente as Record<string, unknown> : {};
  if (currentCustomer.email !== QA_CONTACT.email) throw new Error("Destino no QA; actualización rechazada.");
  const { error } = await supabase.from("cotizaciones_leads").update({
    datos_cliente: { ...currentCustomer, agent_qa_context: safeQaContext(state) } as Json,
  }).eq("id", opportunityId);
  if (error) throw new Error(error.message);
}

export async function createOrUpdateProspect(opportunityId: string, state: OpportunityState): Promise<string> {
  await assertQaStaff();
  const { data: existing, error: lookupError } = await supabase.from("crm_leads")
    .select("id,company_name,email").eq("web_lead_id", opportunityId).is("deleted_at", null).limit(1).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    if (existing.company_name !== QA_CONTACT.company || existing.email !== QA_CONTACT.email) {
      throw new Error("Existe un prospecto no QA para esta oportunidad.");
    }
    return existing.id;
  }
  const { data: knownQa, error: knownError } = await supabase.from("crm_leads")
    .select("id,company_name").eq("email", QA_CONTACT.email).is("deleted_at", null).limit(1).maybeSingle();
  if (knownError) throw new Error(knownError.message);
  if (knownQa) {
    if (knownQa.company_name !== QA_CONTACT.company) throw new Error("La identidad QA coincide con un prospecto de otra empresa.");
    return knownQa.id;
  }
  const { data, error } = await supabase.from("crm_leads").insert({
    source: "asistente_virtual", status: "interesado", web_lead_id: opportunityId,
    company_name: QA_CONTACT.company, contact_name: QA_CONTACT.name,
    email: QA_CONTACT.email, phone: QA_CONTACT.phone,
    product_interest: state.opportunity.productInterest ?? null,
    city: state.opportunity.deliveryCity ?? null,
    notes: `QA Super Agente ${state.sessionId}. Revisión humana requerida.`,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se creó prospecto QA.");
  return data.id;
}

export async function createDraftQuote(opportunityId: string, state: OpportunityState): Promise<string> {
  const userId = await assertQaStaff();
  const p = selectedProduct(state);
  if (!p || p.price.status !== "priced" || p.price.unitPriceBeforeTaxMxn === null || !p.price.isValidQuantity) {
    throw new Error("No hay precio autoritativo para una partida de cotización borrador.");
  }
  const { data: existing, error: lookupError } = await supabase.from("formal_quotes")
    .select("id,status,cliente").eq("cotizacion_lead_id", opportunityId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) {
    const client = existing.cliente && typeof existing.cliente === "object" ? existing.cliente as Record<string, unknown> : {};
    if (existing.status !== "BORRADOR" || client.email !== QA_CONTACT.email) throw new Error("Cotización existente fuera del alcance QA.");
    return existing.id;
  }
  const { data, error } = await supabase.from("formal_quotes").insert({
    cotizacion_lead_id: opportunityId, status: "BORRADOR", created_by: userId,
    cliente: { nombre: QA_CONTACT.name, empresa: QA_CONTACT.company, email: QA_CONTACT.email,
      telefono: QA_CONTACT.phone } as Json,
    notas_internas: `QA Super Agente ${state.sessionId}. No emitir ni enviar.`,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se creó borrador QA.");
  return data.id;
}

export async function addOrUpdateDraftQuoteItem(quoteId: string, state: OpportunityState): Promise<void> {
  await assertQaStaff();
  const p = selectedProduct(state);
  if (!p || p.price.status !== "priced" || p.price.unitPriceBeforeTaxMxn === null || !p.price.isValidQuantity) {
    throw new Error("Precio autoritativo no disponible.");
  }
  const { data: quote, error: quoteError } = await supabase.from("formal_quotes")
    .select("id,status,cliente").eq("id", quoteId).single();
  const client = quote?.cliente && typeof quote.cliente === "object" ? quote.cliente as Record<string, unknown> : {};
  if (quoteError || !quote || quote.status !== "BORRADOR" || client.email !== QA_CONTACT.email) {
    throw new Error("La cotización no es un borrador QA.");
  }
  const { data: items, error: itemError } = await supabase.from("formal_quote_items")
    .select("id,notes_internal").eq("formal_quote_id", quoteId).limit(2);
  if (itemError) throw new Error(itemError.message);
  if (items && (items.length > 1 || items.some((item) => !item.notes_internal?.includes(`QA Super Agente ${state.sessionId}`)))) {
    throw new Error("El borrador contiene partidas ajenas a esta sesión QA.");
  }
  const values = {
    position: 1, source: "CATALOG", modelo_comercial: p.name,
    clave_producto: p.sku, color: p.color, imagen_url: p.imageUrl,
    cantidad: p.quantity, precio_unitario: p.price.unitPriceBeforeTaxMxn,
    subtotal: Math.round(p.quantity * p.price.unitPriceBeforeTaxMxn * 100) / 100,
    personalizacion: { label: state.art.technicalReviewRequired ? "Sujeta a revisión técnica" : "Por confirmar",
      requiere_revision_tecnica: true, producto_id: p.id } as Json,
    notes_internal: `QA Super Agente ${state.sessionId}; stock observado, no confirmado.`,
  };
  const { error } = items?.length
    ? await supabase.from("formal_quote_items").update(values).eq("id", items[0].id)
    : await supabase.from("formal_quote_items").insert({ ...values, formal_quote_id: quoteId });
  if (error) throw new Error(error.message);
  const totals = calcQuoteTotals([{ cantidad: p.quantity, precio_unitario: p.price.unitPriceBeforeTaxMxn, descuento_pct: 0 }], 0.16);
  const { error: totalError } = await supabase.from("formal_quotes").update({ ...totals })
    .eq("id", quoteId).eq("status", "BORRADOR");
  if (totalError) throw new Error(totalError.message);
}

export async function requestHumanReview(prospectId: string, state: OpportunityState): Promise<void> {
  await assertQaStaff();
  const { error } = await supabase.from("crm_leads").update({
    notes: `QA Super Agente ${state.sessionId}. Revisión humana: ${handoffReasons(state).join("; ") || "verificar operación"}.`,
  }).eq("id", prospectId).eq("email", QA_CONTACT.email);
  if (error) throw new Error(error.message);
}

export async function commitQaOperation(state: OpportunityState): Promise<QaOperationResult> {
  await assertQaStaff();
  const opportunityId = await createOrUpdateOpportunity(state);
  await saveOpportunityContext(opportunityId, state);
  const prospectId = await createOrUpdateProspect(opportunityId, state);
  const draftQuoteId = await createDraftQuote(opportunityId, state);
  await addOrUpdateDraftQuoteItem(draftQuoteId, state);
  await requestHumanReview(prospectId, state);
  return { prospectId, opportunityId, draftQuoteId };
}
