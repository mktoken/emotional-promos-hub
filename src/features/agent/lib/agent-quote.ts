import type { Database, Json } from "@/integrations/supabase/types";
import { calcItemSubtotal, calcQuoteTotals } from "@/features/crm/lib/formal-quote-calc";
import { selectedLineProduct, selectedProductLines, type AgentProductLine, type OpportunityState } from "./agent-state";

type QuoteItemInsert = Database["public"]["Tables"]["formal_quote_items"]["Insert"];
export type DraftQuoteLineValues = Omit<QuoteItemInsert, "formal_quote_id">;
export interface DesiredDraftQuoteItem { lineId: string; values: DraftQuoteLineValues }
export interface ExistingDraftQuoteItem { id: string; notes_internal: string | null }

export interface DraftQuotePlan {
  items: DesiredDraftQuoteItem[];
  totals: { subtotal: number; tax_amount: number; total: number };
}

/** Conserva el SKU autoritativo enriquecido por la solicitud pública cuando la ficha pública no lo expone. */
export function enrichDraftQuotePlanWithOpportunityItems(plan: DraftQuotePlan, rawItems: unknown): DraftQuotePlan {
  if (!Array.isArray(rawItems)) return plan;
  const skuByProduct = new Map<string, string>();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const productId = typeof item.producto_id === "string" ? item.producto_id : null;
    const sku = typeof item.clave_producto === "string" && item.clave_producto.trim()
      ? item.clave_producto.trim()
      : typeof item.sku === "string" && item.sku.trim() ? item.sku.trim() : null;
    if (productId && sku) skuByProduct.set(productId, sku);
  }
  return { ...plan, items: plan.items.map((item) => {
    const productId = item.values.product_ref_id;
    const sku = productId ? skuByProduct.get(productId) : null;
    return sku && !item.values.clave_producto
      ? { ...item, values: { ...item.values, clave_producto: sku } }
      : item;
  }) };
}

const marker = (sessionId: string) => `QA Super Agente ${sessionId}`;

function personalizationForLine(line: AgentProductLine, productId: string) {
  if (line.personalizationStatus === "requested_review") return {
    label: line.personalizationNotes?.slice(0, 160) ?? "Sujeta a revisión técnica", tipo: "advisor_review",
    requiere_revision_tecnica: true, producto_id: productId,
  };
  if (line.personalizationStatus === "no_print_requested") return {
    label: "Sin impresión solicitada", tipo: "no_print", requiere_revision_tecnica: false, producto_id: productId,
  };
  return { label: "Por confirmar", tipo: "not_specified", requiere_revision_tecnica: true, producto_id: productId };
}

export function buildDraftQuotePlan(state: OpportunityState): DraftQuotePlan {
  const active = state.productLines.filter((line) => !["removed", "rejected"].includes(line.status));
  const selected = selectedProductLines(state);
  if (!active.length || selected.length !== active.length) {
    throw new Error("Cada línea activa debe tener un producto seleccionado antes de crear el borrador.");
  }
  const items = selected.map((line, index) => {
    const product = selectedLineProduct(line);
    if (!product || line.status !== "selected" || line.quantity === null || line.quantity < 1
        || product.quantity !== line.quantity || product.price.status !== "priced"
        || product.price.unitPriceBeforeTaxMxn === null || !product.price.isValidQuantity) {
      throw new Error(`La línea ${line.productInterest} no tiene un precio V2 y una cantidad válidos.`);
    }
    if (product.observedStock !== null && product.observedStock < line.quantity) {
      throw new Error(`El stock observado de ${line.productInterest} no cubre la cantidad solicitada.`);
    }
    const price = product.price.unitPriceBeforeTaxMxn;
    const values: DraftQuoteLineValues = {
      position: index + 1, source: "CATALOG", modelo_comercial: product.name,
      clave_producto: product.sku, descripcion: product.name, color: line.color ?? product.color,
      imagen_url: product.imageUrl, product_ref_id: product.id, cantidad: line.quantity,
      precio_unitario: price, descuento_pct: 0,
      subtotal: calcItemSubtotal({ cantidad: line.quantity, precio_unitario: price, descuento_pct: 0 }),
      personalizacion: personalizationForLine(line, product.id) as unknown as Json,
      print_method: null, print_colors: null, setup_fee: 0, print_unit_price: 0, print_status: "sin_impresion",
      notes_internal: `${marker(state.sessionId)}; line:${line.lineId}; stock observado, no confirmado.`,
    };
    return { lineId: line.lineId, values };
  });
  const totals = calcQuoteTotals(items.map(({ values }) => ({ cantidad: values.cantidad,
    precio_unitario: values.precio_unitario, descuento_pct: values.descuento_pct,
    setup_fee: values.setup_fee, print_unit_price: values.print_unit_price })), 0.16);
  return { items, totals };
}

export interface DraftQuoteReconciliation {
  upserts: Array<{ lineId: string; existingId: string | null; values: DraftQuoteLineValues }>;
  deleteIds: string[];
}

/** Solo reconcilia filas etiquetadas con la sesión propietaria; nunca adopta partidas ajenas. */
export function planDraftQuoteReconciliation(
  existingRows: ExistingDraftQuoteItem[], desiredItems: DesiredDraftQuoteItem[], sessionId: string,
): DraftQuoteReconciliation {
  const prefix = marker(sessionId);
  if (new Set(desiredItems.map((item) => item.lineId)).size !== desiredItems.length) {
    throw new Error("La operación contiene líneas QA duplicadas.");
  }
  if (existingRows.some((row) => !row.notes_internal?.includes(prefix))) {
    throw new Error("El borrador contiene partidas que no pertenecen a esta sesión QA.");
  }
  const byLine = new Map<string, ExistingDraftQuoteItem>();
  const legacyRows: ExistingDraftQuoteItem[] = [];
  for (const row of existingRows) {
    const lineId = row.notes_internal?.match(/; line:([\w-]+)/)?.[1];
    if (!lineId) { legacyRows.push(row); continue; }
    if (byLine.has(lineId)) throw new Error("El borrador tiene partidas duplicadas para una línea QA.");
    byLine.set(lineId, row);
  }
  if (legacyRows.length) {
    if (legacyRows.length !== 1 || desiredItems.length !== 1 || byLine.size) {
      throw new Error("No se puede asociar una partida anterior sin marcador de línea sin ambigüedad.");
    }
    byLine.set(desiredItems[0].lineId, legacyRows[0]);
  }
  const desiredIds = new Set(desiredItems.map((item) => item.lineId));
  return {
    upserts: desiredItems.map((item) => ({ lineId: item.lineId, existingId: byLine.get(item.lineId)?.id ?? null, values: item.values })),
    deleteIds: [...byLine].filter(([lineId]) => !desiredIds.has(lineId)).map(([, row]) => row.id),
  };
}
