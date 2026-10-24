// Edge Function: run-forpromotional-atomic-cycle-v1
// One complete ForPromotional cycle: create candidate, shadow-sync all API
// pages, certify, then publish through one server-side atomic RPC.
// It never writes live costs, stock, flags or releases directly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stock-refresh-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROVIDER = "forpromotional";
const CRON_NAME = "catalog-stock-refresh-forpromotional";
const CYCLE_ROUTE = "/run-forpromotional-atomic-cycle-v1";
const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_MAX_PAGES = 1000;

type SupabaseClient = ReturnType<typeof createClient>;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function slotKey(now: Date): string {
  const slot = Math.floor(now.getTime() / (5 * 60 * 1000));
  return `${PROVIDER}:atomic-cycle:${slot}`;
}

async function failCandidate(
  supabase: SupabaseClient,
  candidateId: string | null,
  reason: string,
): Promise<void> {
  if (!candidateId) return;
  await supabase
    .from("forpromotional_atomic_candidates")
    .update({
      status: "failed",
      validation_report: { automatic_cycle: true, failure: reason.slice(0, 2000) },
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .in("status", ["building", "certified"]);
}

async function finishRun(
  supabase: SupabaseClient,
  runId: string | null,
  status: "succeeded" | "failed" | "skipped",
  result: Record<string, unknown>,
  failure: string | null,
): Promise<void> {
  if (!runId) return;
  await supabase.rpc("pe_forpromotional_cycle_finish_v1", {
    p_run_id: runId,
    p_status: status,
    p_result: result,
    p_error: failure,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  const startedAt = new Date().toISOString();
  let supabase: SupabaseClient | null = null;
  let runId: string | null = null;
  let candidateId: string | null = null;
  let stage = "init";
  const pageResults: Array<Record<string, unknown>> = [];

  try {
    stage = "env";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const syncTestKey = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const cronKey = Deno.env.get("STOCK_REFRESH_CRON_KEY") ?? "";
    if (!supabaseUrl || !serviceRole || !anonKey || !syncTestKey || !cronKey) {
      return jsonResponse(500, { ok: false, stage, error_message: "faltan secrets del ciclo automático" });
    }

    stage = "auth";
    const url = new URL(req.url);
    const suppliedHeader = req.headers.get("x-stock-refresh-key") ?? "";
    const suppliedQuery = url.searchParams.get("cron_key") ?? "";
    if ((suppliedHeader || suppliedQuery) !== cronKey) {
      return jsonResponse(401, { ok: false, stage, error_message: "credencial de cron inválida" });
    }

    const pageSize = Math.max(1, Math.min(
      Number.parseInt(url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
      5000,
    ));
    const maxPages = Math.max(1, Math.min(
      Number.parseInt(url.searchParams.get("max_pages") ?? String(DEFAULT_MAX_PAGES), 10) || DEFAULT_MAX_PAGES,
      DEFAULT_MAX_PAGES,
    ));

    supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: state, error: stateError } = await supabase
      .from("forpromotional_atomic_cycle_state")
      .select("automatic_enabled,status,last_success_at,last_attempt_at,last_error")
      .eq("provider_code", PROVIDER)
      .maybeSingle();
    if (stateError) throw new Error(`cycle state read: ${stateError.message}`);
    if (!state || state.automatic_enabled !== true) {
      return jsonResponse(200, {
        ok: true,
        skipped: true,
        reason: "automatic_cycle_disabled",
        state: state ?? null,
      });
    }

    stage = "begin";
    const begin = await supabase.rpc("pe_forpromotional_cycle_begin_v1", {
      p_idempotency_key: slotKey(new Date()),
      p_trigger: "cron",
    });
    if (begin.error) throw new Error(`cycle begin: ${begin.error.message}`);
    const beginResult = asObject(begin.data);
    runId = typeof beginResult.run_id === "string" ? beginResult.run_id : null;
    candidateId = typeof beginResult.candidate_id === "string" ? beginResult.candidate_id : null;
    if (!runId || !candidateId) {
      if (beginResult.idempotent && beginResult.status === "succeeded") {
        return jsonResponse(200, { ok: true, skipped: true, reason: "idempotent_success", run: beginResult });
      }
      throw new Error("cycle begin returned no run or candidate");
    }
    if (beginResult.idempotent) {
      const existingStatus = String(beginResult.status ?? "unknown");
      if (existingStatus === "running") {
        return jsonResponse(409, { ok: false, skipped: true, reason: "idempotent_run_still_running", run_id: runId });
      }
      return jsonResponse(200, {
        ok: existingStatus === "succeeded" || existingStatus === "skipped",
        skipped: true,
        reason: "idempotent_existing_run",
        run_id: runId,
        status: existingStatus,
      });
    }

    stage = "shadow_sync";
    const functionsBase = `${supabaseUrl}/functions/v1`;
    const syncHeaders = {
      "content-type": "application/json",
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "x-stock-refresh-key": cronKey,
    };
    let offset = 0;
    let expectedTotal: number | null = null;
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      page += 1;
      if (page > maxPages) throw new Error(`maximum API pages exceeded: ${maxPages}`);
      const query = new URLSearchParams({
        mode: "shadow_write",
        candidate_id: candidateId,
        limit: String(pageSize),
        offset: String(offset),
        test_key: syncTestKey,
      });
      const response = await fetch(`${functionsBase}/sync-forpromotional-products-v2?${query}`, {
        method: "GET",
        headers: syncHeaders,
      });
      const body = asObject(await response.json().catch(() => ({})));
      const total = Number(body.total_received ?? 0);
      const currentOffset = Number(body.offset_applied ?? offset);
      const currentPage = {
        page,
        http_status: response.status,
        ok: body.ok === true && response.ok,
        offset: currentOffset,
        items_processed: Number(body.items_processed ?? 0),
        staged: Number(body.staged ?? 0),
        exceptions: Number(body.exceptions ?? 0),
        has_more: body.has_more === true,
        next_offset: body.next_offset ?? null,
      };
      pageResults.push(currentPage);
      if (!response.ok || body.ok !== true || Number(body.exceptions ?? 0) !== 0) {
        throw new Error(`shadow sync failed at page ${page}: ${String(body.error_message ?? "unresolved API exception")}`);
      }
      if (expectedTotal === null) expectedTotal = total;
      if (total !== expectedTotal) throw new Error(`API total changed during cycle: ${expectedTotal} -> ${total}`);
      hasMore = body.has_more === true;
      if (hasMore) {
        const nextOffset = Number(body.next_offset);
        if (!Number.isInteger(nextOffset) || nextOffset <= offset) {
          throw new Error(`invalid next_offset at page ${page}`);
        }
        offset = nextOffset;
      }
    }

    stage = "certify";
    const certification = await supabase.rpc("pe_forpromotional_cycle_certify_v1", {
      p_candidate_id: candidateId,
    });
    if (certification.error) throw new Error(`candidate certification: ${certification.error.message}`);

    stage = "activate";
    const activation = await supabase.rpc("pe_forpromotional_cycle_activate_v1", {
      p_candidate_id: candidateId,
    });
    if (activation.error) throw new Error(`atomic activation: ${activation.error.message}`);

    const result = {
      pages: pageResults,
      api_items: expectedTotal,
      started_at: startedAt,
      certified: asObject(certification.data),
      activated: asObject(activation.data),
      live_write_scope: "forpromotional candidate rows, factor, policy flag and release pointer only",
      g4_cdo_write_scope: "none",
    };
    await finishRun(supabase, runId, "succeeded", result, null);
    return jsonResponse(200, { ok: true, status: "succeeded", run_id: runId, candidate_id: candidateId, ...result });
  } catch (error) {
    const message = errorMessage(error);
    if (supabase) {
      await failCandidate(supabase, candidateId, `${stage}: ${message}`);
      await finishRun(supabase, runId, "failed", {
        stage,
        pages: pageResults,
        candidate_id: candidateId,
        last_valid_generation_remains: true,
      }, message);
    }
    console.error("forpromotional automatic cycle failed", { stage, message });
    return jsonResponse(500, {
      ok: false,
      status: "failed",
      stage,
      error_message: message,
      run_id: runId,
      candidate_id: candidateId,
      last_valid_generation_remains: true,
      pages: pageResults,
    });
  }
});
