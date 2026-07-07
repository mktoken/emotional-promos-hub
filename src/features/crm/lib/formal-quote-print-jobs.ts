// Servicios de datos para trabajos de impresión de cotizaciones formales.
// USO INTERNO DEL CRM. No exponer en catálogo público, PDF cliente ni email cliente.
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  validatePrintJob,
  validatePrintJobComponent,
  type PrintJobComponentType,
  type PrintJobPricingStatus,
} from "./formal-quote-validation";

export type FormalQuotePrintJob =
  Database["public"]["Tables"]["formal_quote_print_jobs"]["Row"] & {
    pricing_status: PrintJobPricingStatus;
  };
export type FormalQuotePrintJobInsert =
  Database["public"]["Tables"]["formal_quote_print_jobs"]["Insert"];
export type FormalQuotePrintJobUpdate =
  Database["public"]["Tables"]["formal_quote_print_jobs"]["Update"];

export type FormalQuotePrintJobItem =
  Database["public"]["Tables"]["formal_quote_print_job_items"]["Row"];
export type FormalQuotePrintJobItemInsert =
  Database["public"]["Tables"]["formal_quote_print_job_items"]["Insert"];

export type FormalQuotePrintJobComponent =
  Database["public"]["Tables"]["formal_quote_print_job_components"]["Row"] & {
    component_type: PrintJobComponentType;
  };
export type FormalQuotePrintJobComponentInsert =
  Database["public"]["Tables"]["formal_quote_print_job_components"]["Insert"];
export type FormalQuotePrintJobComponentUpdate =
  Database["public"]["Tables"]["formal_quote_print_job_components"]["Update"];

const JOB_COLS =
  "id, formal_quote_id, position, job_label, print_method_id, print_method_name_snapshot, print_colors, print_positions, pricing_status, logistics_fee_default_mxn, logistics_fee_mxn, logistics_override_reason, internal_print_cost_mxn, customer_print_price_mxn, customer_unit_price_mxn, override_reason, calculation_snapshot, created_at, updated_at";

const ITEM_COLS =
  "id, print_job_id, formal_quote_item_id, quantity, allocation_mode, allocation_amount_mxn";

const COMPONENT_COLS =
  "id, print_job_id, component_type, label, description, quantity, unit_cost_mxn, amount_mxn, applies, is_manual, is_conditional, condition_note, include_in_customer_price, is_visible_to_client, sort_order, created_at, updated_at";

// ---------- Fetchers ----------

export async function listPrintJobs(
  formalQuoteId: string,
): Promise<FormalQuotePrintJob[]> {
  const { data, error } = await supabase
    .from("formal_quote_print_jobs")
    .select(JOB_COLS)
    .eq("formal_quote_id", formalQuoteId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FormalQuotePrintJob[];
}

export async function listPrintJobItems(
  formalQuoteId: string,
): Promise<FormalQuotePrintJobItem[]> {
  // Se filtra por los jobs de la cotización usando IN.
  const jobs = await listPrintJobs(formalQuoteId);
  const ids = jobs.map((j) => j.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("formal_quote_print_job_items")
    .select(ITEM_COLS)
    .in("print_job_id", ids);
  if (error) throw error;
  return (data ?? []) as FormalQuotePrintJobItem[];
}

export async function listPrintJobComponents(
  formalQuoteId: string,
): Promise<FormalQuotePrintJobComponent[]> {
  const jobs = await listPrintJobs(formalQuoteId);
  const ids = jobs.map((j) => j.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("formal_quote_print_job_components")
    .select(COMPONENT_COLS)
    .in("print_job_id", ids)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FormalQuotePrintJobComponent[];
}

// ---------- Print jobs ----------

export async function createPrintJob(
  formalQuoteId: string,
  values: Partial<FormalQuotePrintJobInsert> = {},
): Promise<FormalQuotePrintJob> {
  const insert: FormalQuotePrintJobInsert = {
    formal_quote_id: formalQuoteId,
    job_label: values.job_label ?? "Trabajo de impresión",
    position: values.position ?? 0,
    logistics_fee_default_mxn: values.logistics_fee_default_mxn ?? 350,
    logistics_fee_mxn: values.logistics_fee_mxn ?? values.logistics_fee_default_mxn ?? 350,
    logistics_override_reason: values.logistics_override_reason ?? null,
    pricing_status: (values.pricing_status ?? "pendiente") as string,
    print_method_id: values.print_method_id ?? null,
    print_method_name_snapshot: values.print_method_name_snapshot ?? null,
    print_colors: values.print_colors ?? null,
    print_positions: values.print_positions ?? null,
    override_reason: values.override_reason ?? null,
    calculation_snapshot: values.calculation_snapshot ?? ({} as Json),
  };

  const check = validatePrintJob({
    logistics_fee_default_mxn: insert.logistics_fee_default_mxn ?? 350,
    logistics_fee_mxn: insert.logistics_fee_mxn ?? 350,
    logistics_override_reason: insert.logistics_override_reason ?? null,
    print_colors: insert.print_colors ?? null,
    print_positions: insert.print_positions ?? null,
    pricing_status: (insert.pricing_status ?? "pendiente") as PrintJobPricingStatus,
    override_reason: insert.override_reason ?? null,
    job_label: insert.job_label ?? "Trabajo de impresión",
  });
  if (!check.ok) throw new Error(check.errors.join(" · "));

  const { data, error } = await supabase
    .from("formal_quote_print_jobs")
    .insert(insert)
    .select(JOB_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJob;
}

export async function updatePrintJob(
  id: string,
  values: FormalQuotePrintJobUpdate,
): Promise<FormalQuotePrintJob> {
  // Validación superficial cuando llegan los campos relevantes.
  if (
    values.logistics_fee_mxn != null ||
    values.logistics_fee_default_mxn != null ||
    values.logistics_override_reason !== undefined ||
    values.pricing_status !== undefined ||
    values.override_reason !== undefined
  ) {
    const { data: current, error: e0 } = await supabase
      .from("formal_quote_print_jobs")
      .select(JOB_COLS)
      .eq("id", id)
      .single();
    if (e0) throw e0;
    const merged = { ...(current as FormalQuotePrintJob), ...values };
    const check = validatePrintJob({
      logistics_fee_default_mxn: merged.logistics_fee_default_mxn ?? 350,
      logistics_fee_mxn: merged.logistics_fee_mxn ?? 350,
      logistics_override_reason: merged.logistics_override_reason ?? null,
      print_colors: merged.print_colors ?? null,
      print_positions: merged.print_positions ?? null,
      pricing_status: (merged.pricing_status ?? "pendiente") as PrintJobPricingStatus,
      override_reason: merged.override_reason ?? null,
      job_label: merged.job_label ?? "Trabajo de impresión",
    });
    if (!check.ok) throw new Error(check.errors.join(" · "));
  }

  const { data, error } = await supabase
    .from("formal_quote_print_jobs")
    .update(values)
    .eq("id", id)
    .select(JOB_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJob;
}

export async function deletePrintJob(id: string): Promise<void> {
  const { error } = await supabase
    .from("formal_quote_print_jobs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- Job ↔ items ----------

export async function assignItemToPrintJob(
  values: FormalQuotePrintJobItemInsert,
): Promise<FormalQuotePrintJobItem> {
  const { data, error } = await supabase
    .from("formal_quote_print_job_items")
    .insert(values)
    .select(ITEM_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJobItem;
}

export async function removeItemFromPrintJob(id: string): Promise<void> {
  const { error } = await supabase
    .from("formal_quote_print_job_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type FormalQuotePrintJobItemUpdate =
  Database["public"]["Tables"]["formal_quote_print_job_items"]["Update"];

export async function updatePrintJobItem(
  id: string,
  values: FormalQuotePrintJobItemUpdate,
): Promise<FormalQuotePrintJobItem> {
  if (values.allocation_mode === "fijo") {
    if (values.allocation_amount_mxn == null) {
      throw new Error("Si allocation_mode = 'fijo', allocation_amount_mxn es obligatorio.");
    }
    const amount = Number(values.allocation_amount_mxn);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("El precio manual debe ser mayor o igual a 0.");
    }
  }
  const { data, error } = await supabase
    .from("formal_quote_print_job_items")
    .update(values)
    .eq("id", id)
    .select(ITEM_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJobItem;
}

// ---------- Components ----------

export async function createPrintJobComponent(
  values: FormalQuotePrintJobComponentInsert,
): Promise<FormalQuotePrintJobComponent> {
  const insert: FormalQuotePrintJobComponentInsert = {
    ...values,
    is_visible_to_client: false, // FORZADO: nunca visible al cliente.
  };
  const check = validatePrintJobComponent({
    component_type: insert.component_type as PrintJobComponentType,
    label: insert.label,
    description: insert.description ?? null,
    amount_mxn: Number(insert.amount_mxn ?? 0),
    quantity: insert.quantity ?? null,
    unit_cost_mxn: insert.unit_cost_mxn ?? null,
    is_manual: insert.is_manual ?? false,
    include_in_customer_price: insert.include_in_customer_price ?? true,
    is_visible_to_client: false,
  });
  if (!check.ok) throw new Error(check.errors.join(" · "));

  const { data, error } = await supabase
    .from("formal_quote_print_job_components")
    .insert(insert)
    .select(COMPONENT_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJobComponent;
}

export async function updatePrintJobComponent(
  id: string,
  values: FormalQuotePrintJobComponentUpdate,
): Promise<FormalQuotePrintJobComponent> {
  const patch: FormalQuotePrintJobComponentUpdate = {
    ...values,
    is_visible_to_client: false, // FORZADO
  };
  const { data, error } = await supabase
    .from("formal_quote_print_job_components")
    .update(patch)
    .eq("id", id)
    .select(COMPONENT_COLS)
    .single();
  if (error) throw error;
  return data as FormalQuotePrintJobComponent;
}

export async function deletePrintJobComponent(id: string): Promise<void> {
  const { error } = await supabase
    .from("formal_quote_print_job_components")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Atajo tipado para crear un cargo adicional manual (visible sólo internamente).
 */
export async function createAdditionalCharge(
  printJobId: string,
  input: {
    label: string;
    description: string;
    amount_mxn: number;
    sort_order?: number;
    include_in_customer_price?: boolean;
  },
): Promise<FormalQuotePrintJobComponent> {
  return createPrintJobComponent({
    print_job_id: printJobId,
    component_type: "additional_charge",
    label: input.label,
    description: input.description,
    amount_mxn: input.amount_mxn,
    is_manual: true,
    is_visible_to_client: false,
    include_in_customer_price: input.include_in_customer_price ?? true,
    sort_order: input.sort_order ?? 0,
    applies: true,
  });
}
