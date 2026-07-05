import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MyProfile {
  id: string;
  full_name: string | null;
  cargo: string | null;
  phone: string | null;
  whatsapp: string | null;
  email_comercial: string | null;
  firma: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export type MyProfileUpdate = Partial<
  Pick<MyProfile, "full_name" | "cargo" | "phone" | "whatsapp" | "email_comercial" | "firma">
>;

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my_profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, cargo, phone, whatsapp, email_comercial, firma, avatar_url, is_active")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as MyProfile | null) ?? null;
    },
  });
}

export function useUpdateMyProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: MyProfileUpdate) => {
      if (!userId) throw new Error("No hay sesión activa");
      const { error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_profile", userId] });
      qc.invalidateQueries({ queryKey: ["crm_staff_profiles"] });
      qc.invalidateQueries({ queryKey: ["asesor_profile"] });
    },
  });
}
