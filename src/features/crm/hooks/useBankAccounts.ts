import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string | null;
  clabe: string | null;
  currency: string;
  reference_instructions: string | null;
  branch: string | null;
  is_active: boolean;
  is_default: boolean;
}

const COLS =
  "id, bank_name, account_holder, account_number, clabe, currency, reference_instructions, branch, is_active, is_default";

export function useBankAccounts() {
  return useQuery({
    queryKey: ["company_bank_accounts", "list"],
    queryFn: async (): Promise<BankAccount[]> => {
      const { data, error } = await supabase
        .from("company_bank_accounts")
        .select(COLS)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BankAccount[];
    },
  });
}

export function useDefaultBankAccount() {
  const q = useBankAccounts();
  return {
    ...q,
    data: (q.data ?? []).find((b) => b.is_default) ?? (q.data ?? [])[0] ?? null,
  };
}
