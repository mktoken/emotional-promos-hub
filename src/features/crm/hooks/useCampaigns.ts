import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CrmCampaign = Database["public"]["Tables"]["crm_campaigns"]["Row"];

export function useCampaigns() {
  return useQuery({
    queryKey: ["crm_campaigns", "list"],
    queryFn: async (): Promise<CrmCampaign[]> => {
      const { data, error } = await supabase
        .from("crm_campaigns")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmCampaign[];
    },
  });
}
