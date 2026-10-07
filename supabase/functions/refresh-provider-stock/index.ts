// Edge Function: refresh-provider-stock
// Refresh incremental de stock/precios/raw llamando en lotes a las sync functions existentes.
// NUNCA llama a promote-provider-products-to-catalog.
// En full persiste stock_refresh_* y materializa el estado de catálogo.
// En materialization-only dry_run solo lee datos ya persistidos y no escribe.

import { createClient, type SupabaseClient as SupabaseClientGeneric } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { recomputeProductStockStatus } from "../_shared/catalog-stock-status.ts";
import { decideMaterializationRequest } from "../_shared/refresh-provider-stock-contract.ts";
import {
  ALL_PROVIDERS,
  advanceProviderCursor,
  assessProviderBatch,
  completedToday,
  createInitialProviderCursor,
  cycleStatus,
  MAX_BATCHES_PER_TICK,
  normalizeProvider,
  STOCK_REFRESH_LOCK_TTL_SECONDS,
  type Provider,
} from "../_shared/refresh-provider-stock-runtime.ts";
import { runMaterializationOnlyDryRun } from "./materialization-only.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-stock-refresh-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

type Mode = "dry_run" | "full";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  if (!raw) return def;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

interface CursorRow {
  provider: string;
  next_offset: number;
  next_page: number;
  next_offer_offset: number | null;
  cycle_count: number;
  last_run_at: string | null;
  last_completed_cycle_at: string | null;
}

type SupabaseClient = SupabaseClientGeneric<any, any, any>;

type AffectedScope = {
  offerIds: string[];
  productIds: string[];
};

async function acquireLock(
  supabase: SupabaseClient,
  scope: string,
  lockToken: string,
  runId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("acquire_stock_refresh_lock", {
    p_scope: scope,
    p_lock_token: lockToken,
    p_run_id: runId,
    p_ttl_seconds: STOCK_REFRESH_LOCK_TTL_SECONDS,
  });
  return !error && data === true;
}

async function renewLock(
  supabase: SupabaseClient,
  scope: string,
  lockToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("renew_stock_refresh_lock", {
    p_scope: scope,
    p_lock_token: lockToken,
    p_ttl_seconds: STOCK_REFRESH_LOCK_TTL_SECONDS,
  });
  return !error && data === true;
}

async function releaseLock(
  supabase: SupabaseClient,
  scope: string,
  lockToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_stock_refresh_lock", {
    p_scope: scope,
    p_lock_token: lockToken,
  });
  return !error && data === true;
}

async function releaseLocks(
  supabase: SupabaseClient,
  scopes: string[],
  lockToken: string | null,
): Promise<void> {
  if (!lockToken) return;
  await Promise.all(scopes.map((scope) => releaseLock(supabase, scope, lockToken)));
}

async function resolveAffectedScope(
  supabase: SupabaseClient,
  batchId: string,
): Promise<AffectedScope> {
  const { data: rawRows, error: rawError } = await supabase
    .from("provider_raw_products")
    .select("id")
    .eq("batch_id", batchId);
  if (rawError) throw new Error(`affected raw read: ${rawError.message}`);

  const rawIds = [...new Set((rawRows ?? []).map((row) => row.id as string).filter(Boolean))];
  if (rawIds.length === 0) return { offerIds: [], productIds: [] };

  const { data: offerRows, error: offerError } = await supabase
    .from("producto_proveedor_ofertas")
    .select("id")
    .in("provider_raw_product_id", rawIds);
  if (offerError) throw new Error(`affected offers read: ${offerError.message}`);

  const offerIds = [...new Set((offerRows ?? []).map((row) => row.id as string).filter(Boolean))];
  if (offerIds.length === 0) return { offerIds: [], productIds: [] };

  const { data: mapRows, error: mapError } = await supabase
    .from("producto_b2b_oferta_map")
    .select("producto_b2b_id")
    .in("oferta_id", offerIds);
  if (mapError) throw new Error(`affected products read: ${mapError.message}`);

  return {
    offerIds,
    productIds: [...new Set((mapRows ?? []).map((row) => row.producto_b2b_id as string).filter(Boolean))],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let stage = "init";
  let activeSupabase: SupabaseClient | null = null;
  let activeRunId: string | null = null;
  let heldLockScopes: string[] = [];
  let heldLockToken: string | null = null;
  let materializationLockHeld = false;

  try {
    stage = "env";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const CRON_KEY = Deno.env.get("STOCK_REFRESH_CRON_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY || !TEST_KEY) {
      return jsonResponse(500, {
        ok: false, stage,
        error_message: "Faltan secrets requeridos (SUPABASE_URL/SERVICE_ROLE/ANON_KEY/PROVIDERS_TEST_KEY).",
      });
    }

    stage = "auth";
    const url = new URL(req.url);
    const providedTest = url.searchParams.get("test_key");
    const providedHeaderCron = req.headers.get("x-stock-refresh-key") ?? "";
    const providedQueryCron = url.searchParams.get("cron_key") ?? "";
    const okTest = !!providedTest && providedTest === TEST_KEY;
    const okCron = !!CRON_KEY && (
      providedHeaderCron.length > 0
        ? providedHeaderCron === CRON_KEY
        : providedQueryCron === CRON_KEY
    );
    if (!okTest && !okCron) {
      return jsonResponse(401, { ok: false, stage, error_message: "credencial inválida (test_key o cron_key)" });
    }

    stage = "params";
    const rawMode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const mode: Mode = rawMode === "full" ? "full" : "dry_run";

    const rawProv = (url.searchParams.get("provider") ?? "all").toLowerCase();
    const providerParam = rawProv === "all" ? "all" : normalizeProvider(rawProv);
    if (!providerParam) {
      return jsonResponse(400, { ok: false, stage, error_message: `provider inválido: ${rawProv}` });
    }

    let providers: Provider[];
    if (providerParam === "all") providers = [...ALL_PROVIDERS];
    else providers = [providerParam];

    const limit = clampInt(url.searchParams.get("limit"), 100, 1, 200);
    const maxBatches = clampInt(url.searchParams.get("max_batches"), MAX_BATCHES_PER_TICK, 1, MAX_BATCHES_PER_TICK);
    const offsetOverride = url.searchParams.get("offset");
    const pageOverride = url.searchParams.get("page");
    const offerOffsetOverride = url.searchParams.get("offer_offset");
    const resetCursor = (url.searchParams.get("reset_cursor") ?? "false").toLowerCase() === "true";
    const materializeProductIds = [...new Set(
      (url.searchParams.get("materialize_product_ids") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )];
    const materializationOnly = (url.searchParams.get("materialization_only") ?? "false").toLowerCase() === "true";
    const confirmMaterializationWrite = (url.searchParams.get("confirm_materialization_write") ?? "false").toLowerCase() === "true";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    activeSupabase = supabase;

    if (mode === "full" && resetCursor) {
      return jsonResponse(400, {
        ok: false,
        mode,
        stage: "params",
        error: "reset_cursor_not_allowed_in_full_mode",
        error_message: "reset_cursor=true está prohibido para ejecuciones full productivas",
        writes: 0,
        provider_calls: 0,
      });
    }

    const materializationDecision = decideMaterializationRequest({
      mode,
      materializationOnly,
      confirmMaterializationWrite,
      productIds: materializeProductIds,
    });

    const zeroWriteResponse = {
      ok: false,
      mode,
      materialization_only: materializationOnly,
      write_scope: "none",
      requested_products: materializeProductIds.length,
      affected_products: 0,
      recomputed_products: 0,
      failed_products: 0,
      writes: 0,
      provider_calls: 0,
      cursor_writes: 0,
      run_table_writes: 0,
      source_stock_writes: 0,
      pricing_v2_writes: 0,
      mapping_writes: 0,
      products: [],
      errors: [],
      error: materializationDecision.kind === "reject"
        ? materializationDecision.reason
        : "invalid_materialization_request",
    };

    if (materializationDecision.kind === "reject") {
      return jsonResponse(400, zeroWriteResponse);
    }

    if (materializationDecision.kind === "dry_run") {
      return jsonResponse(
        200,
        await runMaterializationOnlyDryRun(
          supabase as unknown as Parameters<typeof runMaterializationOnlyDryRun>[0],
          materializeProductIds,
        ),
      );
    }

    if (materializationDecision.kind === "targeted_write") {
      const recompute = await recomputeProductStockStatus(
        supabase as unknown as Parameters<typeof recomputeProductStockStatus>[0],
        materializeProductIds,
        { dryRun: false },
      );
      const affectedOfferIds = new Set(
        recompute.products.flatMap((product) => product.affected_offer_ids),
      );

      return jsonResponse(200, {
        ok: recompute.failed_product_ids.length === 0,
        mode: "full",
        materialization_only: true,
        write_scope: "producto_b2b_status",
        requested_products: materializeProductIds.length,
        affected_offers: affectedOfferIds.size,
        affected_products: recompute.affected_product_ids.length,
        recomputed_products: recompute.recomputed_product_ids.length,
        failed_products: recompute.failed_product_ids.length,
        writes: recompute.recomputed_product_ids.length,
        products: recompute.products,
        errors: recompute.errors,
        provider_calls: 0,
        cursor_writes: 0,
        run_table_writes: 0,
        source_stock_writes: 0,
        pricing_v2_writes: 0,
        mapping_writes: 0,
      });
    }

    stage = "cursors_load";
    const { data: cursorsRaw, error: cursorsErr } = await supabase
      .from("stock_refresh_cursors")
      .select("provider,next_offset,next_page,next_offer_offset,cycle_count,last_run_at,last_completed_cycle_at")
      .in("provider", providers);
    if (cursorsErr) {
      return jsonResponse(500, { ok: false, stage, error_message: `cursors read: ${cursorsErr.message}` });
    }

    const cursorsMap: Record<string, CursorRow> = {};
    for (const p of providers) {
      const existing = (cursorsRaw ?? []).find((r: CursorRow) => r.provider === p);
      cursorsMap[p] = existing ?? {
        provider: p,
        ...createInitialProviderCursor(p),
        last_run_at: null,
      };
    }

    if (
      mode === "full" &&
      providerParam !== "all" &&
      !resetCursor &&
      completedToday(cursorsMap[providerParam].last_completed_cycle_at)
    ) {
      return jsonResponse(200, {
        ok: true,
        mode,
        provider: providerParam,
        cycle_status: "completed",
        already_completed_today: true,
        run_id: null,
        batches_executed: 0,
        cursors_before: cursorsMap,
        cursors_after: cursorsMap,
        errors: [],
        summary: {},
        note: "daily gate: provider cycle already completed for the Mexico City operational day",
      });
    }

    const cursorsBefore = JSON.parse(JSON.stringify(cursorsMap));

    const requestedRunId = crypto.randomUUID();
    const lockScopes = mode === "full"
      ? (providerParam === "all" ? [...ALL_PROVIDERS] : [providerParam])
      : [];
    const lockToken = mode === "full" ? crypto.randomUUID() : null;

    if (lockToken) {
      for (const scope of lockScopes) {
        const acquired = await acquireLock(supabase, scope, lockToken, requestedRunId);
        if (!acquired) {
          await releaseLocks(supabase, lockScopes, lockToken);
          return jsonResponse(409, {
            ok: false,
            mode,
            provider: providerParam,
            cycle_status: "in_progress",
            error_message: `refresh lock busy: ${scope}`,
          });
        }
        heldLockScopes.push(scope);
      }
      heldLockToken = lockToken;
    }

    stage = "run_open";
    const providerLabel = providerParam;
    const { data: runRow, error: runErr } = await supabase
      .from("stock_refresh_runs")
      .insert({
        id: requestedRunId,
        provider: providerLabel,
        mode,
        status: "running",
        params: {
          limit, max_batches: maxBatches, provider: providerLabel,
          offset_override: offsetOverride, page_override: pageOverride,
          reset_cursor: resetCursor,
        },
        started_at: startedAt,
      })
      .select("id")
      .single();
    if (runErr || !runRow?.id) {
      await releaseLocks(supabase, heldLockScopes, heldLockToken);
      heldLockScopes = [];
      heldLockToken = null;
      return jsonResponse(500, { ok: false, stage, error_message: `run insert: ${runErr?.message ?? "unknown"}` });
    }
    const runId = runRow.id as string;
    activeRunId = runId;

    stage = "batches";
    const functionsBase = `${SUPABASE_URL}/functions/v1`;
    const invokeHeaders = {
      "content-type": "application/json",
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    } as Record<string, string>;

    const errors: Array<{ provider: string; batch: number; message: string }> = [];
    const summary: Record<string, {
      batches: number; items_seen: number; stock_updated: number;
      cycles_completed: number; last_status: string | null;
      affected_offers: number; affected_products: number;
      recomputed_products: number; failed_products: number;
    }> = {};
    let batchesExecuted = 0;

    for (const provider of providers) {
      summary[provider] = {
        batches: 0,
        items_seen: 0,
        stock_updated: 0,
        cycles_completed: 0,
        last_status: null,
        affected_offers: 0,
        affected_products: 0,
        recomputed_products: 0,
        failed_products: 0,
      };
      const cur = cursorsMap[provider];

      for (let b = 1; b <= maxBatches && batchesExecuted < maxBatches; b++) {
        let endpoint = "";
        let pageUsed: number | null = null;
        let offsetUsed: number | null = null;
        let offerOffsetUsed: number | null = null;

        if (provider === "cdo_mx") {
          const pageParam = b === 1 && pageOverride != null
            ? parseInt(pageOverride, 10)
            : (cur.next_page ?? 1);
          pageUsed = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
          const offerOffsetParam = b === 1 && offerOffsetOverride != null
            ? parseInt(offerOffsetOverride, 10)
            : (cur.next_offer_offset ?? 0);
          offerOffsetUsed = Number.isFinite(offerOffsetParam) && offerOffsetParam >= 0
            ? offerOffsetParam
            : 0;
          const qs = new URLSearchParams({
            mode, env: "mx", limit: String(limit), page: String(pageUsed),
            offer_limit: "500", offer_offset: String(offerOffsetUsed), test_key: TEST_KEY,
          });
          endpoint = `${functionsBase}/sync-cdo-products?${qs.toString()}`;
        } else if (provider === "forpromotional") {
          const offParam = b === 1 && offsetOverride != null
            ? parseInt(offsetOverride, 10)
            : (cur.next_offset ?? 0);
          offsetUsed = Number.isFinite(offParam) && offParam >= 0 ? offParam : 0;
          const qs = new URLSearchParams({
            mode, limit: String(limit), offset: String(offsetUsed), test_key: TEST_KEY,
          });
          endpoint = `${functionsBase}/sync-forpromotional-products?${qs.toString()}`;
        } else {
          const offParam = b === 1 && offsetOverride != null
            ? parseInt(offsetOverride, 10)
            : (cur.next_offset ?? 0);
          offsetUsed = Number.isFinite(offParam) && offParam >= 0 ? offParam : 0;
          const qs = new URLSearchParams({
            mode, limit: String(limit), offset: String(offsetUsed),
            sync_stock: "true", test_key: TEST_KEY,
          });
          endpoint = `${functionsBase}/sync-g4-products?${qs.toString()}`;
        }

        batchesExecuted++;
        summary[provider].batches++;

        let respJson: Record<string, unknown> | null = null;
        let itemStatus: "success" | "failed" = "success";
        let itemErr: string | null = null;
        let httpStatus = 0;

        const locksHealthy = !heldLockToken || await Promise.all(
          heldLockScopes.map((scope) => renewLock(supabase, scope, heldLockToken as string)),
        ).then((results) => results.every(Boolean));

        if (!locksHealthy) {
          itemStatus = "failed";
          itemErr = "refresh lock expired or could not be renewed";
          respJson = { ok: false, error_message: itemErr };
        } else {
          try {
            const res = await fetch(endpoint, { method: "GET", headers: invokeHeaders });
            httpStatus = res.status;
            const text = await res.text();
            try { respJson = JSON.parse(text) as Record<string, unknown>; }
            catch { respJson = { raw: text.slice(0, 500) }; }
          } catch (e) {
            itemStatus = "failed";
            itemErr = e instanceof Error ? e.message : "fetch error";
            respJson = { fetch_error: itemErr };
          }
        }

        // Resumen del batch
        const itemsSeen = Number(
          (respJson as Record<string, unknown> | null)?.["items_processed"] ??
          (respJson as Record<string, unknown> | null)?.["total_received"] ?? 0
        ) || 0;
        const stockUpdated = Number(
          (respJson as Record<string, unknown> | null)?.["items_upserted"] ?? 0
        ) || 0;
        const hasMoreOffers = provider === "cdo_mx"
          ? Boolean((respJson as Record<string, unknown> | null)?.["has_more_offers"])
          : false;
        const hasMorePages = provider === "cdo_mx"
          ? Boolean((respJson as Record<string, unknown> | null)?.["has_more_pages"])
          : false;
        const hasMore = provider === "cdo_mx"
          ? hasMoreOffers || hasMorePages
          : Boolean((respJson as Record<string, unknown> | null)?.["has_more"]);
        const nextOffsetResp = (respJson as Record<string, unknown> | null)?.["next_offset"];
        const nextPageResp = (respJson as Record<string, unknown> | null)?.["next_page"];
        const nextOfferOffsetResp = (respJson as Record<string, unknown> | null)?.["next_offer_offset"];

        if (itemStatus === "success") {
          const assessment = assessProviderBatch(provider, respJson, httpStatus);
          if (!assessment.ok) {
            itemStatus = "failed";
            itemErr = assessment.reason;
          }
        }

        summary[provider].items_seen += itemsSeen;
        summary[provider].stock_updated += stockUpdated;
        summary[provider].last_status = itemStatus;

        let materialization: Record<string, unknown> = {
          dry_run: mode !== "full",
          affected_offers: 0,
          affected_products: 0,
          recomputed_products: 0,
          failed_products: 0,
          product_reports: mode === "dry_run" ? [] : undefined,
        };

        if (itemStatus === "success" && mode === "full") {
          const batchId = String((respJson as Record<string, unknown> | null)?.["batch_id"] ?? "");
          if (!batchId) {
            itemStatus = "failed";
            itemErr = "materialization requires provider batch_id";
          } else if (!heldLockToken || !(await acquireLock(supabase, "catalog_materialization", heldLockToken, runId))) {
            itemStatus = "failed";
            itemErr = "catalog materialization lock busy";
          } else {
            materializationLockHeld = true;
            try {
              const providerLocksHealthy = await Promise.all(
                heldLockScopes.map((scope) => renewLock(supabase, scope, heldLockToken as string)),
              ).then((results) => results.every(Boolean));
              if (!providerLocksHealthy) {
                throw new Error("provider lock expired or could not be renewed");
              }
              const affected = await resolveAffectedScope(supabase, batchId);
              const recompute = await recomputeProductStockStatus(
                supabase as unknown as Parameters<typeof recomputeProductStockStatus>[0],
                affected.productIds,
                { dryRun: false, affectedOfferIds: affected.offerIds },
              );
              summary[provider].affected_offers += recompute.affected_offer_ids.length;
              summary[provider].affected_products += recompute.affected_product_ids.length;
              summary[provider].recomputed_products += recompute.recomputed_product_ids.length;
              summary[provider].failed_products += recompute.failed_product_ids.length;
              materialization = {
                dry_run: false,
                affected_offers: recompute.affected_offer_ids.length,
                affected_products: recompute.affected_product_ids.length,
                recomputed_products: recompute.recomputed_product_ids.length,
                failed_products: recompute.failed_product_ids.length,
                product_reports: [],
              };
              if (recompute.failed_product_ids.length > 0) {
                itemStatus = "failed";
                itemErr = `status materialization failed for ${recompute.failed_product_ids.length} product(s)`;
              }
            } catch (e) {
              itemStatus = "failed";
              itemErr = e instanceof Error ? e.message.slice(0, 300) : "status materialization failed";
            } finally {
              const released = await releaseLock(supabase, "catalog_materialization", heldLockToken as string);
              materializationLockHeld = false;
              if (!released && itemStatus === "success") {
                itemStatus = "failed";
                itemErr = "catalog materialization lock release failed";
              }
            }
          }
        }

        // Resumen compacto para no guardar payloads gigantes
        const compactResp: Record<string, unknown> = {
          http_status: httpStatus,
          ok: (respJson as Record<string, unknown> | null)?.["ok"] ?? null,
          mode: (respJson as Record<string, unknown> | null)?.["mode"] ?? null,
          items_processed: itemsSeen,
          items_upserted: stockUpdated,
          items_failed: Number((respJson as Record<string, unknown> | null)?.["items_failed"] ?? 0) || 0,
          stock_failed: Number((respJson as Record<string, unknown> | null)?.["stock_failed"] ?? 0) || 0,
          has_more: hasMore,
          has_more_pages: hasMorePages,
          has_more_offers: hasMoreOffers,
          next_offset: nextOffsetResp ?? null,
          next_page: nextPageResp ?? null,
          next_offer_offset: nextOfferOffsetResp ?? null,
          batch_id: (respJson as Record<string, unknown> | null)?.["batch_id"] ?? null,
          status: (respJson as Record<string, unknown> | null)?.["status"] ?? null,
          error_message: (respJson as Record<string, unknown> | null)?.["error_message"] ?? null,
          materialization,
        };

        summary[provider].last_status = itemStatus;

        const { error: runItemError } = await supabase.from("stock_refresh_run_items").insert({
          run_id: runId,
          provider,
          batch_number: b,
          page_used: pageUsed,
          offset_used: offsetUsed,
          offer_offset_used: offerOffsetUsed,
          status: itemStatus,
          items_seen: itemsSeen,
          stock_updated: stockUpdated,
          response: compactResp,
          error: itemErr,
        });

        if (runItemError) {
          itemStatus = "failed";
          itemErr = `run item insert: ${runItemError.message}`;
        }

        if (itemStatus === "failed") {
          errors.push({ provider, batch: b, message: itemErr ?? "unknown" });
          break; // no seguir con más batches de este proveedor
        }

        const cursorAdvance = advanceProviderCursor(provider, {
          next_offset: cur.next_offset,
          next_page: cur.next_page,
          next_offer_offset: cur.next_offer_offset,
          cycle_count: cur.cycle_count,
          last_completed_cycle_at: cur.last_completed_cycle_at,
        }, respJson, pageUsed);
        if (!cursorAdvance.ok) {
          errors.push({ provider, batch: b, message: cursorAdvance.reason });
          break;
        }
        Object.assign(cur, cursorAdvance.cursor);
        if (cursorAdvance.completed) {
          summary[provider].cycles_completed++;
          break;
        }
      }

      cur.last_run_at = new Date().toISOString();
      if (batchesExecuted >= maxBatches) break;
    }

    stage = "run_close";
    const preCursorFailedCount = errors.length;
    const preCursorStatus: "success" | "partial_failed" | "failed" =
      preCursorFailedCount === 0 ? "success" :
      batchesExecuted > preCursorFailedCount ? "partial_failed" : "failed";
    const preCursorCycleStatus = cycleStatus({ providers, summaries: summary, errors });
    const preCursorRunUpdate = await supabase.from("stock_refresh_runs").update({
      status: preCursorStatus,
      finished_at: new Date().toISOString(),
      result: {
        batches_executed: batchesExecuted,
        cycle_status: preCursorCycleStatus,
        cursors_before: cursorsBefore,
        summary,
        cursors_after: cursorsMap,
        errors,
      },
      error: preCursorFailedCount > 0
        ? errors.map((e) => `${e.provider}#${e.batch}: ${e.message}`).join(" | ").slice(0, 1000)
        : null,
    }).eq("id", runId);
    if (preCursorRunUpdate.error) {
      await releaseLocks(supabase, heldLockScopes, heldLockToken);
      heldLockScopes = [];
      heldLockToken = null;
      return jsonResponse(500, {
        ok: false,
        stage,
        error_message: `run finalization: ${preCursorRunUpdate.error.message}`,
        writes: 0,
        provider_calls: batchesExecuted,
        cursor_writes: 0,
      });
    }

    // Los cursores se persisten después de que el run y cada batch tienen evidencia.
    stage = "cursors_save";
    if (mode === "full") {
      const cursorRows = providers.map((p) => {
        const c = cursorsMap[p];
        return {
          provider: p,
          next_offset: c.next_offset,
          next_page: c.next_page,
          next_offer_offset: c.next_offer_offset,
          cycle_count: c.cycle_count,
          last_run_at: c.last_run_at,
          last_completed_cycle_at: c.last_completed_cycle_at,
          updated_at: new Date().toISOString(),
        };
      });
      const { error: cursorUpsertError } = await supabase
        .from("stock_refresh_cursors")
        .upsert(cursorRows, { onConflict: "provider" });
      if (cursorUpsertError) {
        errors.push({
          provider: "runtime",
          batch: 0,
          message: `cursor upsert: ${cursorUpsertError.message}`,
        });
      }
    }

    const cursorWriteFailed = errors.length > preCursorFailedCount;
    const finalFailedCount = errors.length;
    const finalStatus: "success" | "partial_failed" | "failed" =
      finalFailedCount === 0 ? preCursorStatus : "failed";
    const finalCycleStatus = cycleStatus({ providers, summaries: summary, errors });

    if (cursorWriteFailed) {
      const correction = await supabase.from("stock_refresh_runs").update({
        status: finalStatus,
        error: errors.map((e) => `${e.provider}#${e.batch}: ${e.message}`).join(" | ").slice(0, 1000),
        result: {
          batches_executed: batchesExecuted,
          cycle_status: finalCycleStatus,
          cursors_before: cursorsBefore,
          summary,
          cursors_after: cursorsMap,
          errors,
        },
      }).eq("id", runId);
      if (correction.error) {
        errors.push({ provider: "runtime", batch: 0, message: `run failure finalization: ${correction.error.message}` });
      }
    }

    await releaseLocks(supabase, heldLockScopes, heldLockToken);
    heldLockScopes = [];
    heldLockToken = null;

    return jsonResponse(200, {
      ok: errors.length === 0,
      mode,
      provider: providerLabel,
      cycle_status: cycleStatus({ providers, summaries: summary, errors }),
      run_id: runId,
      batches_executed: batchesExecuted,
      providers,
      cursors_before: cursorsBefore,
      cursors_after: cursorsMap,
      errors,
      summary,
      note: mode === "dry_run"
        ? "dry_run: materialize_product_ids usa la ruta materialization-only zero-write; sin IDs se conserva el flujo de refresh existente."
        : "full: cursores actualizados; los productos afectados se materializaron desde producto_b2b_oferta_map.",
    });
  } catch (e) {
    if (activeSupabase) {
      if (activeRunId) {
        await activeSupabase.from("stock_refresh_runs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: e instanceof Error ? e.message.slice(0, 1000) : "fatal error",
          result: { cycle_status: "failed", stage },
        }).eq("id", activeRunId);
      }
      if (materializationLockHeld && heldLockToken) {
        await releaseLock(activeSupabase, "catalog_materialization", heldLockToken);
        materializationLockHeld = false;
      }
      await releaseLocks(activeSupabase, heldLockScopes, heldLockToken);
    }
    console.log("fatal", { stage, error: e instanceof Error ? e.message : "unknown" });
    return jsonResponse(500, {
      ok: false, stage,
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
