import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyFull {
  id: string;
  nombre_empresa: string | null;
  email_general: string | null;
  whatsapp_general: string | null;
  telefono: string | null;
  direccion: string | null;
  firma_default: string | null;
  logo_url: string | null;
}

export function useCompanyFull() {
  return useQuery({
    queryKey: ["company_settings", "full"],
    queryFn: async (): Promise<CompanyFull | null> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select(
          "id, nombre_empresa, email_general, whatsapp_general, telefono, direccion, firma_default, logo_url",
        )
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as CompanyFull | null) ?? null;
    },
  });
}
