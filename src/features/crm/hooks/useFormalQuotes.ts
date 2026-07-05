import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FormalQuoteRow = Database["public"]["Tables"]["formal_quotes"]["Row"];
export type FormalQuoteUpdate = Database["public"]["Tables"]["formal_quotes"]["Update"];
export type FormalQuoteItemRow =
  Database["public"]["Tables"]["formal_quote_items"]["Row"];
export type FormalQuoteItemInsert =
  Database["public"]["Tables"]["formal_quote_items"]["Insert"];
export type FormalQuoteItemUpdate =
  Database["public"]["Tables"]["formal_quote_items"]["Update"];

// Columnas seguras (nunca proveedor/costos/margen/raw_payload/provider_sku)
const QUOTE_COLS =
  "id, folio, cotizacion_lead_id, status, cliente, assigned_to, created_by, currency, subtotal, tax_rate, tax_amount, total, condiciones_pago, condiciones_entrega, notas_publicas, notas_internas, valid_until, issued_at, sent_at, accepted_at, rejected_at, company_snapshot, advisor_snapshot, bank_account_snapshot, created_at, updated_at";

const ITEM_COLS =
  "id, formal_quote_id, position, source, clave_producto, modelo_comercial, descripcion, color, imagen_url, cantidad, unidad, precio_unitario, descuento_pct, subtotal, personalizacion, print_method, print_colors, setup_fee, print_unit_price, notes, is_kit_parent, parent_item_id, created_at, updated_at";

export function useFormalQuotes() {
  return useQuery({
    queryKey: ["formal_quotes", "list"],
    queryFn: async (): Promise<FormalQuoteRow[]> => {
      const { data, error } = await supabase
        .from("formal_quotes")
        .select(QUOTE_COLS)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FormalQuoteRow[];
    },
  });
}

export function useFormalQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["formal_quotes", id],
    enabled: !!id,
    queryFn: async (): Promise<FormalQuoteRow | null> => {
      const { data, error } = await supabase
        .from("formal_quotes")
        .select(QUOTE_COLS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as FormalQuoteRow | null) ?? null;
    },
  });
}

export function useFormalQuoteItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["formal_quote_items", quoteId],
    enabled: !!quoteId,
    queryFn: async (): Promise<FormalQuoteItemRow[]> => {
      const { data, error } = await supabase
        .from("formal_quote_items")
        .select(ITEM_COLS)
        .eq("formal_quote_id", quoteId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FormalQuoteItemRow[];
    },
  });
}

export function useFormalQuoteByLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ["formal_quotes", "by_lead", leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<FormalQuoteRow | null> => {
      const { data, error } = await supabase
        .from("formal_quotes")
        .select(QUOTE_COLS)
        .eq("cotizacion_lead_id", leadId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as FormalQuoteRow | null) ?? null;
    },
  });
}

export function useUpdateFormalQuote(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: FormalQuoteUpdate) => {
      if (!id) throw new Error("Falta id");
      const { error } = await supabase
        .from("formal_quotes")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formal_quotes"] });
    },
  });
}

export function useInsertFormalQuoteItem(quoteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<FormalQuoteItemInsert, "formal_quote_id">) => {
      if (!quoteId) throw new Error("Falta quoteId");
      const { error } = await supabase
        .from("formal_quote_items")
        .insert({ ...values, formal_quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formal_quote_items", quoteId] });
    },
  });
}

export function useUpdateFormalQuoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FormalQuoteItemUpdate }) => {
      const { error } = await supabase
        .from("formal_quote_items")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["formal_quote_items"] });
      void vars;
    },
  });
}

export function useDeleteFormalQuoteItem(quoteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formal_quote_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formal_quote_items", quoteId] });
    },
  });
}

export async function logFormalQuoteEvent(
  formal_quote_id: string,
  event_type: string,
  payload: Record<string, unknown> = {},
) {
  const { data: userRes } = await supabase.auth.getUser();
  await supabase.from("formal_quote_events").insert({
    formal_quote_id,
    event_type,
    payload,
    actor_id: userRes.user?.id ?? null,
  });
}
