import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CotizacionRow =
  Database["public"]["Tables"]["cotizaciones_leads"]["Row"];
export type CotizacionNote =
  Database["public"]["Tables"]["cotizacion_lead_notes"]["Row"];
export type CotizacionStatusHistory =
  Database["public"]["Tables"]["cotizacion_status_history"]["Row"];
export type ProposalEmailEvent =
  Database["public"]["Tables"]["proposal_email_events"]["Row"];

export function useCotizaciones() {
  return useQuery({
    queryKey: ["cotizaciones_leads", "list"],
    queryFn: async (): Promise<CotizacionRow[]> => {
      const { data, error } = await supabase
        .from("cotizaciones_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CotizacionRow[];
    },
  });
}

export function useCotizacion(id: string | undefined) {
  return useQuery({
    queryKey: ["cotizaciones_leads", id],
    enabled: !!id,
    queryFn: async (): Promise<CotizacionRow | null> => {
      const { data, error } = await supabase
        .from("cotizaciones_leads")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as CotizacionRow | null) ?? null;
    },
  });
}

export function useCotizacionNotes(id: string | undefined) {
  return useQuery({
    queryKey: ["cotizacion_lead_notes", id],
    enabled: !!id,
    queryFn: async (): Promise<CotizacionNote[]> => {
      const { data, error } = await supabase
        .from("cotizacion_lead_notes")
        .select("*")
        .eq("cotizacion_lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CotizacionNote[];
    },
  });
}

export function useCotizacionStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["cotizacion_status_history", id],
    enabled: !!id,
    queryFn: async (): Promise<CotizacionStatusHistory[]> => {
      const { data, error } = await supabase
        .from("cotizacion_status_history")
        .select("*")
        .eq("cotizacion_lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CotizacionStatusHistory[];
    },
  });
}

export function useCotizacionEmailEvents(id: string | undefined) {
  return useQuery({
    queryKey: ["proposal_email_events", id],
    enabled: !!id,
    queryFn: async (): Promise<ProposalEmailEvent[]> => {
      const { data, error } = await supabase
        .from("proposal_email_events")
        .select("*")
        .eq("cotizacion_lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProposalEmailEvent[];
    },
  });
}

export interface StaffProfile {
  id: string;
  full_name: string | null;
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ["crm_staff_profiles"],
    queryFn: async (): Promise<StaffProfile[]> => {
      // Roles considered "staff" (admin, sales_manager, sales_agent).
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "sales_manager", "sales_agent"]);
      if (rolesErr) throw rolesErr;
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, is_active")
        .in("id", ids);
      if (profErr) throw profErr;
      return (profiles ?? [])
        .filter((p) => p.is_active !== false)
        .map((p) => ({ id: p.id, full_name: p.full_name }));
    },
  });
}
