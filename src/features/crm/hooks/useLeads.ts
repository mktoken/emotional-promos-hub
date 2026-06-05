import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];
export type CrmLeadInsert = Database["public"]["Tables"]["crm_leads"]["Insert"];

export function useLeads() {
  return useQuery({
    queryKey: ["crm_leads", "list"],
    queryFn: async (): Promise<CrmLead[]> => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CrmLead[];
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["crm_leads", id],
    enabled: !!id,
    queryFn: async (): Promise<CrmLead | null> => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as CrmLead | null) ?? null;
    },
  });
}
