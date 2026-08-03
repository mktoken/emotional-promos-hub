// Edge Function: recompute-catalog-price-cache-v2
// Sub-Build B — Backend Shadow V2.
//
// Autoridad de negocio ÚNICA: public.calculate_product_price_v2.
// Esta función NO duplica multiplicadores, niveles, costos, MOQ ni lógica
// por proveedor. Sólo orquesta, mapea al contrato público y audita.
//
// Modos: dry_run (no escribe shadow) y shadow_write (escribe shadow).
// No activa V2, no toca la caché pública ni el frontend.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  BASE_QUANTITY,
  BATCH_SIZE_DEFAULT,
  CALCULATION_VERSION,
  canCertify,
  Counters,
  DRAFT_RULE_SET_VERSION,
  emptyCounters,
  EngineRow,
  mapEngineResult,
  needsMoqRetry,
  RequestSchema,
  sanitizeError,
} from "./logic.ts";

const ALLOWED_ORIGINS = new Set<string>([
  "https://promocionalesemocionales.lovable.app",
  "https://www.articulospromocionales.vip",
  "https://articulospromocionales.vip",
]);

const TIME_BUDGET_MS = 50_000;

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json(405, { ok: false, request_id: requestId, error: "method_not_allowed" }, origin);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { ok: false, request_id: requestId, error: "server_misconfigured" }, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ---------------- AUTENTICACIÓN / AUTORIZACIÓN ----------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return json(401, { ok: false, request_id: requestId, error: "missing_jwt" }, origin);
    }

    let actorId: string | null = null;
    let authorizedVia: "service_role" | "staff" | null = null;

    if (token === SERVICE_ROLE_KEY) {
      authorizedVia = "service_role";
    } else if (ANON_KEY && token === ANON_KEY) {
      return json(401, { ok: false, request_id: requestId, error: "anon_not_allowed" }, origin);
    } else {
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) {
        return json(401, { ok: false, request_id: requestId, error: "invalid_jwt" }, origin);
      }
      actorId = userData.user.id;
      const { data: isStaff, error: staffErr } = await admin.rpc("is_staff", { _uid: actorId });
      if (staffErr) {
        return json(500, { ok: false, request_id: requestId, error: "authorization_check_failed" }, origin);
      }
      if (isStaff !== true) {
        return json(403, { ok: false, request_id: requestId, error: "forbidden" }, origin);
      }
      authorizedVia = "staff";
    }

    // ---------------- CONTRATO DE ENTRADA ----------------
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json(400, { ok: false, request_id: requestId, error: "invalid_json" }, origin);
    }
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(
        400,
        {
          ok: false,
          request_id: requestId,
          error: "invalid_payload",
          details: parsed.error.flatten().fieldErrors,
        },
        origin,
      );
    }
    const { mode, idempotency_key } = parsed.data;
    const batchSize = parsed.data.batch_size ?? BATCH_SIZE_DEFAULT;
    let cursor: string | null = parsed.data.cursor ?? null;

    // ---------------- RULE SET DRAFT (resuelto en servidor) ----------------
    const { data: ruleSets, error: rsErr } = await admin
      .from("pricing_rule_sets")
      .select("id, version, is_active")
      .eq("version", DRAFT_RULE_SET_VERSION)
      .eq("is_active", false);
    if (rsErr) {
      return json(500, { ok: false, request_id: requestId, error: "rule_set_lookup_failed" }, origin);
    }
    if (!ruleSets || ruleSets.length !== 1) {
      return json(
        409,
        {
          ok: false,
          request_id: requestId,
          error: "draft_rule_set_not_unique",
          found: ruleSets?.length ?? 0,
        },
        origin,
      );
    }
    const ruleSetId = ruleSets[0].id as string;

    // ---------------- GENERACIÓN (idempotencia + concurrencia) ----------------
    const { data: existing } = await admin
      .from("catalog_price_cache_v2_generations")
      .select("*")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();

    let generation = existing;

    if (generation) {
      if (generation.mode !== mode || generation.rule_set_id !== ruleSetId) {
        return json(409, { ok: false, request_id: requestId, error: "idempotency_key_conflict" }, origin);
      }
      if (generation.status !== "running") {
        // Repetición de una key ya terminada: no duplicar trabajo.
        return json(
          200,
          {
            ok: true,
            request_id: requestId,
            reused: true,
            generation_id: generation.id,
            mode,
            status: generation.status,
            candidate_count: generation.candidate_count,
            processed_count: generation.processed_count,
            priced_count: generation.priced_count,
            request_quote_count: generation.request_quote_count,
            unavailable_count: generation.unavailable_count,
            error_count: generation.error_count,
            unresolved_count: generation.unresolved_count,
          },
          origin,
        );
      }
    } else {
      // Impedir dos generaciones running simultáneas para el mismo rule set + modo.
      const { count: runningCount } = await admin
        .from("catalog_price_cache_v2_generations")
        .select("id", { count: "exact", head: true })
        .eq("rule_set_id", ruleSetId)
        .eq("mode", mode)
        .eq("status", "running");
      if ((runningCount ?? 0) > 0) {
        return json(409, { ok: false, request_id: requestId, error: "generation_already_running" }, origin);
      }

      // Universo de candidatos certificado por el preflight B:
      // productos con entrada en catalog_price_cache (1 fila por producto).
      const { count: candidateCount, error: candErr } = await admin
        .from("catalog_price_cache")
        .select("producto_b2b_id", { count: "exact", head: true })
        .not("producto_b2b_id", "is", null);
      if (candErr) {
        return json(500, { ok: false, request_id: requestId, error: "candidate_count_failed" }, origin);
      }

      const { data: created, error: genErr } = await admin
        .from("catalog_price_cache_v2_generations")
        .insert({
          rule_set_id: ruleSetId,
          status: "running",
          mode,
          idempotency_key,
          candidate_count: candidateCount ?? 0,
          request_id: requestId,
          created_by: actorId,
        })
        .select("*")
        .single();
      if (genErr || !created) {
        // Carrera con otra ejecución que insertó la misma key.
        return json(409, { ok: false, request_id: requestId, error: "generation_insert_failed" }, origin);
      }
      generation = created;
    }

    const generationId = generation.id as string;
    const candidateCount = generation.candidate_count as number;

    const totals: Counters = {
      processed_count: generation.processed_count ?? 0,
      priced_count: generation.priced_count ?? 0,
      request_quote_count: generation.request_quote_count ?? 0,
      unavailable_count: generation.unavailable_count ?? 0,
      error_count: generation.error_count ?? 0,
      unresolved_count: generation.unresolved_count ?? 0,
      moq_resolved_count: 0,
    };

    const batchCounters = emptyCounters();
    const issues: Array<{ product_id: string; reason: string }> = [];
    let batches = 0;
    let done = false;

    // ---------------- PROCESAMIENTO POR BATCHES ----------------
    while (!done) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;

      let q = admin
        .from("catalog_price_cache")
        .select("producto_b2b_id")
        .not("producto_b2b_id", "is", null)
        .order("producto_b2b_id", { ascending: true })
        .limit(batchSize);
      if (cursor) q = q.gt("producto_b2b_id", cursor);

      const { data: rows, error: batchErr } = await q;
      if (batchErr) throw new Error("candidate_batch_failed");
      if (!rows || rows.length === 0) {
        done = true;
        break;
      }
      batches += 1;

      const shadowRows: Record<string, unknown>[] = [];

      for (const row of rows) {
        const productId = row.producto_b2b_id as string;
        cursor = productId;
        try {
          const { data: firstData, error: firstErr } = await admin.rpc("calculate_product_price_v2", {
            p_producto_b2b_id: productId,
            p_quantity: BASE_QUANTITY,
            p_rule_set_id: ruleSetId,
          });
          if (firstErr) throw new Error("engine_call_failed");

          let engineRow: EngineRow | null = Array.isArray(firstData) ? (firstData[0] ?? null) : (firstData ?? null);
          let requestedQty = BASE_QUANTITY;
          let resolvedViaMoq = false;

          if (engineRow && needsMoqRetry(engineRow)) {
            const moq = engineRow.minimum_quantity as number;
            const { data: retryData, error: retryErr } = await admin.rpc("calculate_product_price_v2", {
              p_producto_b2b_id: productId,
              p_quantity: moq,
              p_rule_set_id: ruleSetId,
            });
            if (retryErr) throw new Error("engine_retry_failed");
            engineRow = Array.isArray(retryData) ? (retryData[0] ?? null) : (retryData ?? null);
            requestedQty = moq;
            resolvedViaMoq = true;
          }

          const mapped = mapEngineResult(engineRow, requestedQty, resolvedViaMoq);
          batchCounters.processed_count += 1;

          if (!mapped.ok) {
            batchCounters.unresolved_count += 1;
            if (issues.length < 50) issues.push({ product_id: productId, reason: mapped.reason });
            continue;
          }
          if (mapped.resolved_via_moq) batchCounters.moq_resolved_count += 1;
          if (mapped.public_price_status === "priced") batchCounters.priced_count += 1;
          else if (mapped.public_price_status === "request_quote") batchCounters.request_quote_count += 1;
          else batchCounters.unavailable_count += 1;

          if (mode === "shadow_write") {
            shadowRows.push({
              generation_id: generationId,
              product_id: productId,
              rule_set_id: ruleSetId,
              public_price_status: mapped.public_price_status,
              minimum_quantity: mapped.minimum_quantity,
              price_before_tax_mxn: mapped.price_before_tax_mxn,
              currency: "MXN",
              computed_at: new Date().toISOString(),
              calculation_version: CALCULATION_VERSION,
            });
          }
        } catch (err) {
          batchCounters.processed_count += 1;
          batchCounters.error_count += 1;
          if (issues.length < 50) issues.push({ product_id: productId, reason: sanitizeError(err) });
        }
      }

      // dry_run NUNCA escribe en shadow.
      if (mode === "shadow_write" && shadowRows.length > 0) {
        const { error: upsertErr } = await admin
          .from("catalog_price_cache_v2_shadow")
          .upsert(shadowRows, { onConflict: "generation_id,product_id" });
        if (upsertErr) throw new Error("shadow_upsert_failed");
      }

      // Persistir progreso acumulado tras cada batch (resultados previos sobreviven).
      totals.processed_count = (generation.processed_count ?? 0) + batchCounters.processed_count;
      totals.priced_count = (generation.priced_count ?? 0) + batchCounters.priced_count;
      totals.request_quote_count = (generation.request_quote_count ?? 0) + batchCounters.request_quote_count;
      totals.unavailable_count = (generation.unavailable_count ?? 0) + batchCounters.unavailable_count;
      totals.error_count = (generation.error_count ?? 0) + batchCounters.error_count;
      totals.unresolved_count = (generation.unresolved_count ?? 0) + batchCounters.unresolved_count;
      totals.moq_resolved_count = batchCounters.moq_resolved_count;

      await admin
        .from("catalog_price_cache_v2_generations")
        .update({
          processed_count: Math.min(totals.processed_count, candidateCount),
          priced_count: totals.priced_count,
          request_quote_count: totals.request_quote_count,
          unavailable_count: totals.unavailable_count,
          error_count: totals.error_count,
          unresolved_count: totals.unresolved_count,
        })
        .eq("id", generationId);

      console.log(
        JSON.stringify({
          request_id: requestId,
          generation_id: generationId,
          mode,
          batch: batches,
          cursor,
          processed: totals.processed_count,
          candidate_count: candidateCount,
        }),
      );

      if (rows.length < batchSize) done = true;
    }

    // ---------------- CIERRE ----------------
    let finalStatus: "running" | "completed" | "failed" | "certified" = "running";
    if (done) {
      const certifiable = canCertify(candidateCount, totals);
      if (!certifiable) finalStatus = "failed";
      else finalStatus = mode === "dry_run" ? "completed" : "certified";

      await admin
        .from("catalog_price_cache_v2_generations")
        .update({ status: finalStatus, completed_at: new Date().toISOString() })
        .eq("id", generationId);
    }

    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        request_id: requestId,
        generation_id: generationId,
        mode,
        status: finalStatus,
        batches,
        cursor,
        duration_ms: durationMs,
        counts: totals,
      }),
    );

    return json(
      200,
      {
        ok: finalStatus !== "failed",
        request_id: requestId,
        generation_id: generationId,
        mode,
        authorized_via: authorizedVia,
        status: finalStatus,
        done,
        next_cursor: done ? null : cursor,
        batch_size: batchSize,
        batches,
        candidate_count: candidateCount,
        ...totals,
        issues,
        duration_ms: durationMs,
      },
      origin,
    );
  } catch (e) {
    const msg = sanitizeError(e);
    console.error(JSON.stringify({ request_id: requestId, error: msg }));
    return json(500, { ok: false, request_id: requestId, error: msg }, origin);
  }
});
