import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createProjectBriefFingerprint,
  mapRpcError,
  normalizeProjectBriefInput,
  ProjectBriefContractError,
} from "./contract.ts";

const allowedOrigins = new Set([
  "https://articulospromocionales.vip",
  "https://www.articulospromocionales.vip",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

function headers(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function reply(request: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

function safeLog(requestId: string | null, event: string, error?: string) {
  console.log(JSON.stringify({ event, request_id: requestId, ...(error ? { error } : {}) }));
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (request.method === "OPTIONS") {
    return allowedOrigins.has(origin)
      ? new Response("ok", { status: 200, headers: headers(request) })
      : reply(request, 403, { ok: false, error: "origin_not_allowed" });
  }

  if (!allowedOrigins.has(origin)) return reply(request, 403, { ok: false, error: "origin_not_allowed" });
  if (request.method !== "POST") return reply(request, 405, { ok: false, error: "method_not_allowed" });

  let requestId: string | null = null;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply(request, 400, { ok: false, error: "invalid_request" });
    }

    if (body && typeof body === "object" && !Array.isArray(body)) {
      const candidate = (body as Record<string, unknown>).request_id;
      requestId = typeof candidate === "string" ? candidate.trim().toLowerCase() : null;
    }

    const normalized = normalizeProjectBriefInput(body);
    requestId = normalized.requestId;
    const fingerprint = await createProjectBriefFingerprint(normalized);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    let adminKey = "";

    if (secretKeysRaw) {
      try {
        const secretKeys = JSON.parse(secretKeysRaw);
        adminKey = typeof secretKeys.default === "string" ? secretKeys.default : "";
      } catch {
        adminKey = "";
      }
    }

    if (!adminKey) {
      adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    }

    if (!supabaseUrl || !adminKey) {
      safeLog(requestId, "submit_project_brief_misconfigured");
      return reply(request, 503, { ok: false, error: "service_unavailable" });
    }

    const admin = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.rpc("submit_project_brief_internal", {
      p_request_id: normalized.requestId,
      p_request_fingerprint: fingerprint,
      p_datos_cliente: normalized.datosCliente,
      p_email: normalized.email,
      p_phone: normalized.phone,
      p_privacy_consent: normalized.privacyConsent,
    });

    if (error) {
      const mapped = mapRpcError(error);
      safeLog(requestId, "submit_project_brief_rejected", mapped.error);
      return reply(request, mapped.status, { ok: false, error: mapped.error });
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const result = row && typeof row === "object" && "result" in row
      ? String((row as { result?: unknown }).result)
      : "";
    if (result !== "created" && result !== "idempotent_replay") {
      safeLog(requestId, "submit_project_brief_invalid_result");
      return reply(request, 500, { ok: false, error: "submission_failed" });
    }

    const replay = result === "idempotent_replay";
    safeLog(requestId, replay ? "submit_project_brief_replay" : "submit_project_brief_created");
    return reply(request, replay ? 200 : 201, {
      ok: true,
      result: replay ? "replay" : "created",
      request_id: normalized.requestId,
    });
  } catch (error) {
    if (error instanceof ProjectBriefContractError) {
      const publicError = error.code === "honeypot_triggered" ? "invalid_request" : error.code;
      safeLog(requestId, "submit_project_brief_invalid", publicError);
      return reply(request, 400, { ok: false, error: publicError });
    }
    safeLog(requestId, "submit_project_brief_failed", "submission_failed");
    return reply(request, 500, { ok: false, error: "submission_failed" });
  }
});
