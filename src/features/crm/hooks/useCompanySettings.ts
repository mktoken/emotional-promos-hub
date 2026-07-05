import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  nombre_empresa: string | null;
  email_general: string | null;
  whatsapp_general: string | null;
  telefono: string | null;
  direccion: string | null;
  firma_default: string | null;
}

export type CompanySettingsUpdate = Partial<
  Pick<
    CompanySettings,
    "nombre_empresa" | "email_general" | "whatsapp_general" | "telefono" | "direccion" | "firma_default"
  >
>;

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company_settings"],
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, nombre_empresa, email_general, whatsapp_general, telefono, direccion, firma_default")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as CompanySettings | null) ?? null;
    },
  });
}

export function useUpdateCompanySettings(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CompanySettingsUpdate) => {
      if (!id) throw new Error("No hay configuración de empresa cargada");
      const { error } = await supabase
        .from("company_settings")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
  });
}
