// Uso interno del CRM. No exponer en catálogo público ni en PDF cliente.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PrintSettingsRow =
  Database["public"]["Tables"]["print_settings"]["Row"];

const COLS =
  "id, default_margin_pct, minimum_profit_mxn, operational_buffer_pct, default_logistics_fee_mxn, default_logistics_job_count, default_sample_fee_mxn, default_urgency_pct";

export function usePrintSettings() {
  return useQuery({
    queryKey: ["print_settings", "singleton"],
    queryFn: async (): Promise<PrintSettingsRow | null> => {
      const { data, error } = await supabase
        .from("print_settings")
        .select(COLS)
        .eq("singleton", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PrintSettingsRow | null) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
