import { supabase } from "@/integrations/supabase/client";

/* Read-only client for the staff-only Catalog Governance RPCs. No writes. */

export class GovernanceError extends Error {
  unauthorized: boolean;
  constructor(message: string, unauthorized: boolean) {
    super(message);
    this.unauthorized = unauthorized;
  }
}

type RpcName =
  | "catalog_governance_admin_dashboard_v1"
  | "catalog_governance_admin_queue_v1"
  | "catalog_governance_admin_detail_v1";

async function call<T>(fn: RpcName, args: Record<string, unknown> = {}): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) {
    const unauthorized = error.code === "42501" || /staff only|JWT|permission/i.test(error.message ?? "");
    throw new GovernanceError(error.message ?? "Error", unauthorized);
  }
  return data as T;
}

export interface DashboardData {
  generated_at: string;
  total_products: number;
  census: {
    readiness_row_count: number;
    distinct_product_count: number;
    duplicate_product_count: number;
    runtime_product_count: number;
  };
  readiness: Record<string, number>;
  governance_status: Record<string, number>;
  public_eligibility: { eligible: number; not_eligible: number };
  publication: { published: number; not_published: number };
  pricing: Record<string, number>;
  gates: Record<string, number>;
  open_issues: Record<string, number>;
  providers: Record<string, number>;
  governance_rows: Record<string, number>;
}

export interface QueueFilters {
  search: string;
  provider: string;
  provider_sku: string;
  governance_status: string;
  readiness: string;
  source_type: string;
  rights_status: string;
  visual_status: string;
  issue_code: string;
  asset_role: string;
  pricing_status: string;
  stock_eligibility: "" | "true" | "false";
}

export const EMPTY_FILTERS: QueueFilters = {
  search: "",
  provider: "",
  provider_sku: "",
  governance_status: "",
  readiness: "",
  source_type: "",
  rights_status: "",
  visual_status: "",
  issue_code: "",
  asset_role: "",
  pricing_status: "",
  stock_eligibility: "",
};

export interface QueueRow {
  producto_b2b_id: string;
  id_interno: string | null;
  sku_base: string | null;
  provider: string | null;
  name: string | null;
  updated_at: string | null;
  governance_status: string;
  readiness: string;
  stock_eligible: boolean;
  pricing_status: string;
  pricing_pass: boolean;
  published: boolean;
  blocking_issue_count: number;
}

export interface QueueData {
  total: number;
  limit: number;
  offset: number;
  rows: QueueRow[];
  providers: string[];
}

export const fetchDashboard = () => call<DashboardData>("catalog_governance_admin_dashboard_v1");

export const fetchQueue = (f: QueueFilters, sort: string, dir: "asc" | "desc", limit: number, offset: number) =>
  call<QueueData>("catalog_governance_admin_queue_v1", {
    p_search: f.search || null,
    p_provider: f.provider || null,
    p_provider_sku: f.provider_sku || null,
    p_governance_status: f.governance_status || null,
    p_readiness: f.readiness || null,
    p_source_type: f.source_type || null,
    p_rights_status: f.rights_status || null,
    p_visual_status: f.visual_status || null,
    p_issue_code: f.issue_code || null,
    p_asset_role: f.asset_role || null,
    p_pricing_status: f.pricing_status || null,
    p_stock_eligibility: f.stock_eligibility === "" ? null : f.stock_eligibility === "true",
    p_sort: sort,
    p_sort_dir: dir,
    p_limit: limit,
    p_offset: offset,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DetailData = Record<string, any> | null;

export const fetchDetail = (id: string) =>
  call<DetailData>("catalog_governance_admin_detail_v1", { p_producto_b2b_id: id });
