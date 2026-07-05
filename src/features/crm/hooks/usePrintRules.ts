// Uso interno del CRM. No exponer en catálogo público ni en PDF cliente.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PrintMethodRow =
  Database["public"]["Tables"]["print_methods"]["Row"];
export type PrintPricingRuleRow =
  Database["public"]["Tables"]["print_pricing_rules"]["Row"];
export type PrintCompatRuleRow =
  Database["public"]["Tables"]["print_product_compatibility_rules"]["Row"];

export function usePrintMethods() {
  return useQuery({
    queryKey: ["print_methods", "active"],
    queryFn: async (): Promise<PrintMethodRow[]> => {
      const { data, error } = await supabase
        .from("print_methods")
        .select("id, code, name, description, active, sort_order, created_at, updated_at")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PrintMethodRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrintPricingRules() {
  return useQuery({
    queryKey: ["print_pricing_rules", "active"],
    queryFn: async (): Promise<PrintPricingRuleRow[]> => {
      const { data, error } = await supabase
        .from("print_pricing_rules")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as PrintPricingRuleRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrintCompatibilityRules() {
  return useQuery({
    queryKey: ["print_product_compatibility_rules", "active"],
    queryFn: async (): Promise<PrintCompatRuleRow[]> => {
      const { data, error } = await supabase
        .from("print_product_compatibility_rules")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as PrintCompatRuleRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrintRules() {
  const methods = usePrintMethods();
  const pricing = usePrintPricingRules();
  const compat = usePrintCompatibilityRules();
  return {
    methods,
    pricing,
    compat,
    isLoading: methods.isLoading || pricing.isLoading || compat.isLoading,
    error: methods.error ?? pricing.error ?? compat.error ?? null,
  };
}
