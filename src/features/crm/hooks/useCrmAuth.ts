import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface CrmProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface CrmAuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: CrmProfile | null;
  roles: AppRole[];
  error: string | null;
}

export function useCrmAuth(): CrmAuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<CrmAuthState>({
    loading: true,
    session: null,
    user: null,
    profile: null,
    roles: [],
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadExtras = async (user: User | null) => {
      if (!user) {
        if (mounted)
          setState({
            loading: false,
            session: null,
            user: null,
            profile: null,
            roles: [],
            error: null,
          });
        return;
      }

      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, phone, is_active")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (!mounted) return;

      setState((prev) => ({
        ...prev,
        loading: false,
        user,
        profile: (profileRes.data as CrmProfile | null) ?? null,
        roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
        error: profileRes.error?.message ?? rolesRes.error?.message ?? null,
      }));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      // Defer Supabase calls to avoid deadlocks in the callback
      setTimeout(() => loadExtras(session?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      loadExtras(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
