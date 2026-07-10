// Edge Function: refresh-provider-stock
// Refresh incremental de stock/precios/raw llamando en lotes a las sync functions existentes.
// NUNCA llama a promote-provider-products-to-catalog.
// NUNCA modifica tablas de productos directamente: solo lee/escribe stock_refresh_*.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

type Mode = "dry_run" | "full";
type Provider = "cdo_mx" | "forpromotional" | "g4_mx";

const ALL_PROVIDERS: Provider[] = ["cdo_mx", "forpromotional", "g4_mx"];

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
  next_offset: number | null;
  next_page: number | null;
  cycle_count: number | null;
  last_run_at: string | null;
  last_completed_cycle_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let stage = "init";

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
    const providedCron = url.searchParams.get("cron_key");
    const okTest = !!providedTest && providedTest === TEST_KEY;
    const okCron = !!CRON_KEY && !!providedCron && providedCron === CRON_KEY;
    if (!okTest && !okCron) {
      return jsonResponse(401, { ok: false, stage, error_message: "credencial inválida (test_key o cron_key)" });
    }

    stage = "params";
    const rawMode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const mode: Mode = rawMode === "full" ? "full" : "dry_run";

    const rawProv = (url.searchParams.get("provider") ?? "all").toLowerCase();
    let providers: Provider[];
    if (rawProv === "all") providers = [...ALL_PROVIDERS];
    else if ((ALL_PROVIDERS as string[]).includes(rawProv)) providers = [rawProv as Provider];
    else return jsonResponse(400, { ok: false, stage, error_message: `provider inválido: ${rawProv}` });

    const limit = clampInt(url.searchParams.get("limit"), 100, 1, 200);
    const maxBatches = clampInt(url.searchParams.get("max_batches"), 1, 1, 3);
    const offsetOverride = url.searchParams.get("offset");
    const pageOverride = url.searchParams.get("page");
    const resetCursor = (url.searchParams.get("reset_cursor") ?? "false").toLowerCase() === "true";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    stage = "cursors_load";
    const { data: cursorsRaw, error: cursorsErr } = await supabase
      .from("stock_refresh_cursors")
      .select("provider,next_offset,next_page,cycle_count,last_run_at,last_completed_cycle_at")
      .in("provider", providers);
    if (cursorsErr) {
      return jsonResponse(500, { ok: false, stage, error_message: `cursors read: ${cursorsErr.message}` });
    }

    const cursorsMap: Record<string, CursorRow> = {};
    for (const p of providers) {
      const existing = (cursorsRaw ?? []).find((r: CursorRow) => r.provider === p);
      cursorsMap[p] = existing ?? {
        provider: p,
        next_offset: p === "cdo_mx" ? null : 0,
        next_page: p === "cdo_mx" ? 1 : null,
        cycle_count: 0,
        last_run_at: null,
        last_completed_cycle_at: null,
      };
    }

    if (resetCursor && mode === "full") {
      for (const p of providers) {
        cursorsMap[p].next_offset = p === "cdo_mx" ? null : 0;
        cursorsMap[p].next_page = p === "cdo_mx" ? 1 : null;
      }
    }

    const cursorsBefore = JSON.parse(JSON.stringify(cursorsMap));

    stage = "run_open";
    const providerLabel = rawProv === "all" ? "all" : (providers[0] as string);
    const { data: runRow, error: runErr } = await supabase
      .from("stock_refresh_runs")
      .insert({
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
      return jsonResponse(500, { ok: false, stage, error_message: `run insert: ${runErr?.message ?? "unknown"}` });
    }
    const runId = runRow.id as string;

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
    }> = {};
    let batchesExecuted = 0;

    for (const provider of providers) {
      summary[provider] = { batches: 0, items_seen: 0, stock_updated: 0, cycles_completed: 0, last_status: null };
      const cur = cursorsMap[provider];

      for (let b = 1; b <= maxBatches; b++) {
        let endpoint = "";
        let pageUsed: number | null = null;
        let offsetUsed: number | null = null;

        if (provider === "cdo_mx") {
          const pageParam = b === 1 && pageOverride != null
            ? parseInt(pageOverride, 10)
            : (cur.next_page ?? 1);
          pageUsed = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
          const qs = new URLSearchParams({
            mode, env: "mx", limit: String(limit), page: String(pageUsed),
            offer_limit: "500", offer_offset: "0", test_key: TEST_KEY,
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

        try {
          const res = await fetch(endpoint, { method: "GET", headers: invokeHeaders });
          httpStatus = res.status;
          const text = await res.text();
          try { respJson = JSON.parse(text) as Record<string, unknown>; }
          catch { respJson = { raw: text.slice(0, 500) }; }
          if (!res.ok || respJson?.ok === false) {
            itemStatus = "failed";
            itemErr = `HTTP ${res.status}: ${String((respJson as { error_message?: string })?.error_message ?? "").slice(0, 300)}`;
          }
        } catch (e) {
          itemStatus = "failed";
          itemErr = e instanceof Error ? e.message : "fetch error";
          respJson = { fetch_error: itemErr };
        }

        // Resumen del batch
        const itemsSeen = Number(
          (respJson as Record<string, unknown> | null)?.["items_processed"] ??
          (respJson as Record<string, unknown> | null)?.["total_received"] ?? 0
        ) || 0;
        const stockUpdated = Number(
          (respJson as Record<string, unknown> | null)?.["items_upserted"] ?? 0
        ) || 0;
        const hasMore = Boolean((respJson as Record<string, unknown> | null)?.["has_more"]);
        const nextOffsetResp = (respJson as Record<string, unknown> | null)?.["next_offset"];
        const nextPageResp = (respJson as Record<string, unknown> | null)?.["next_page"];

        summary[provider].items_seen += itemsSeen;
        summary[provider].stock_updated += stockUpdated;
        summary[provider].last_status = itemStatus;

        // Resumen compacto para no guardar payloads gigantes
        const compactResp: Record<string, unknown> = {
          http_status: httpStatus,
          ok: (respJson as Record<string, unknown> | null)?.["ok"] ?? null,
          mode: (respJson as Record<string, unknown> | null)?.["mode"] ?? null,
          items_processed: itemsSeen,
          items_upserted: stockUpdated,
          has_more: hasMore,
          next_offset: nextOffsetResp ?? null,
          next_page: nextPageResp ?? null,
          batch_id: (respJson as Record<string, unknown> | null)?.["batch_id"] ?? null,
          status: (respJson as Record<string, unknown> | null)?.["status"] ?? null,
          error_message: (respJson as Record<string, unknown> | null)?.["error_message"] ?? null,
        };

        await supabase.from("stock_refresh_run_items").insert({
          run_id: runId,
          provider,
          batch_number: b,
          page_used: pageUsed,
          offset_used: offsetUsed,
          status: itemStatus,
          items_seen: itemsSeen,
          stock_updated: stockUpdated,
          response: compactResp,
          error: itemErr,
        });

        if (itemStatus === "failed") {
          errors.push({ provider, batch: b, message: itemErr ?? "unknown" });
          break; // no seguir con más batches de este proveedor
        }

        // Avanzar cursor en memoria
        if (provider === "cdo_mx") {
          if (hasMore && typeof nextPageResp === "number") {
            cur.next_page = nextPageResp;
          } else {
            // ciclo completo
            cur.next_page = 1;
            cur.cycle_count = (cur.cycle_count ?? 0) + 1;
            cur.last_completed_cycle_at = new Date().toISOString();
            summary[provider].cycles_completed++;
            break;
          }
        } else {
          if (hasMore && typeof nextOffsetResp === "number") {
            cur.next_offset = nextOffsetResp;
          } else {
            cur.next_offset = 0;
            cur.cycle_count = (cur.cycle_count ?? 0) + 1;
            cur.last_completed_cycle_at = new Date().toISOString();
            summary[provider].cycles_completed++;
            break;
          }
        }
      }

      cur.last_run_at = new Date().toISOString();
    }

    // Persistir cursores SOLO en modo full
    stage = "cursors_save";
    if (mode === "full") {
      for (const p of providers) {
        const c = cursorsMap[p];
        const { error: upErr } = await supabase
          .from("stock_refresh_cursors")
          .upsert({
            provider: p,
            next_offset: c.next_offset,
            next_page: c.next_page,
            cycle_count: c.cycle_count,
            last_run_at: c.last_run_at,
            last_completed_cycle_at: c.last_completed_cycle_at,
            updated_at: new Date().toISOString(),
          }, { onConflict: "provider" });
        if (upErr) {
          errors.push({ provider: p, batch: 0, message: `cursor upsert: ${upErr.message}` });
        }
      }
    }

    stage = "run_close";
    const failedCount = errors.length;
    const finalStatus: "success" | "partial_failed" | "failed" =
      failedCount === 0 ? "success" :
      batchesExecuted > failedCount ? "partial_failed" : "failed";

    await supabase.from("stock_refresh_runs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      result: {
        batches_executed: batchesExecuted,
        summary,
        cursors_after: cursorsMap,
        errors,
      },
      error: failedCount > 0 ? errors.map((e) => `${e.provider}#${e.batch}: ${e.message}`).join(" | ").slice(0, 1000) : null,
    }).eq("id", runId);

    return jsonResponse(200, {
      ok: finalStatus !== "failed",
      mode,
      provider: providerLabel,
      run_id: runId,
      batches_executed: batchesExecuted,
      providers,
      cursors_before: cursorsBefore,
      cursors_after: cursorsMap,
      errors,
      summary,
      note: mode === "dry_run"
        ? "dry_run: cursores NO se actualizaron; las sync functions ejecutaron en su propio modo dry_run."
        : "full: cursores actualizados. No se llamó a promote-provider-products-to-catalog.",
    });
  } catch (e) {
    console.log("fatal", { stage, error: e instanceof Error ? e.message : "unknown" });
    return jsonResponse(500, {
      ok: false, stage,
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
