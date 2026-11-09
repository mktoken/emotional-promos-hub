import {
  AssistantCaptureContractError,
  createAssistantCaptureFingerprint,
  MAX_BODY_BYTES,
  normalizeAssistantCaptureInput,
} from "./contract.ts";

const ALLOWED_ORIGINS = new Set([
  "https://articulospromocionales.vip",
  "https://www.articulospromocionales.vip",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

type RpcArguments = {
  p_request_id: string;
  p_request_fingerprint: string;
  p_captured: Record<string, string | number | boolean | null>;
  p_messages: Array<{ role: "visitor" | "assistant"; message: string }>;
  p_summary: string;
  p_budget_range: string;
  p_next_follow_up_at: string;
  p_privacy_consent: boolean;
};

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

export type TurnstileSiteverifyResult = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileVerifier = (token: string) => Promise<TurnstileSiteverifyResult>;

export function isAssistantCaptureEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const TURNSTILE_ACTION = "assistant_lead_capture";
const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Dependencies = {
  captureEnabled: boolean;
  rpc: ((args: RpcArguments) => Promise<RpcResult>) | null;
  turnstileVerifier: TurnstileVerifier | null;
  turnstileAllowedHostnames: ReadonlySet<string>;
  log?: (event: string, requestId?: string) => void;
  now?: () => Date;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createCloudflareTurnstileVerifier(
  secretKey: string,
  fetcher: typeof fetch = fetch,
): TurnstileVerifier | null {
  if (!secretKey.trim()) return null;

  return async (token) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetcher(TURNSTILE_SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: secretKey, response: token }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error("turnstile_siteverify_unavailable");
    const payload: unknown = await response.json();
    if (!isObjectRecord(payload) || typeof payload.success !== "boolean") {
      throw new Error("turnstile_siteverify_invalid_response");
    }

    return {
      success: payload.success,
      ...(typeof payload.hostname === "string" ? { hostname: payload.hostname } : {}),
      ...(typeof payload.action === "string" ? { action: payload.action } : {}),
      ...(Array.isArray(payload["error-codes"]) && payload["error-codes"].every((code) => typeof code === "string")
        ? { "error-codes": payload["error-codes"] as string[] }
        : {}),
    };
  };
}

function responseHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function reply(request: Request, status: number, body: Record<string, unknown>): Response {
  const origin = request.headers.get("origin") ?? "";
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function nextBusinessDayISO(now: Date): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + 1);
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 2);
  else if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(10, 0, 0, 0);
  return date.toISOString();
}

async function readJsonLimited(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw new Error("invalid_content_length");
    if (Number(contentLength) > MAX_BODY_BYTES) throw new Error("body_too_large");
  }
  if (!request.body) throw new Error("invalid_json");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("invalid_json");
  }
}

function safeLog(dependencies: Dependencies, event: string, requestId?: string) {
  (dependencies.log ?? ((name, id) => console.log(JSON.stringify({ event: name, request_id: id ?? null }))))(
    event,
    requestId,
  );
}

export function createCaptureAssistantLeadHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? "";
    if (request.method === "OPTIONS") {
      return ALLOWED_ORIGINS.has(origin)
        ? new Response("ok", { status: 200, headers: responseHeaders(origin) })
        : reply(request, 403, { success: false, error: "origin_not_allowed" });
    }
    if (!ALLOWED_ORIGINS.has(origin)) return reply(request, 403, { success: false, error: "origin_not_allowed" });
    if (request.method !== "POST") return reply(request, 405, { success: false, error: "method_not_allowed" });
    if (!dependencies.captureEnabled) {
      safeLog(dependencies, "assistant_capture_disabled");
      return reply(request, 503, { success: false, error: "service_unavailable" });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
      return reply(request, 415, { success: false, error: "unsupported_media_type" });
    }
    let body: unknown;
    try {
      body = await readJsonLimited(request);
    } catch (error) {
      const code = error instanceof Error ? error.message : "invalid_json";
      return code === "body_too_large"
        ? reply(request, 413, { success: false, error: "request_too_large" })
        : reply(request, 400, { success: false, error: "invalid_request" });
    }

    let requestId: string | undefined;
    try {
      const normalized = normalizeAssistantCaptureInput(body);
      requestId = normalized.requestId;
      if (!dependencies.rpc) {
        safeLog(dependencies, "assistant_capture_unavailable", requestId);
        return reply(request, 503, { success: false, error: "service_unavailable" });
      }
      if (!dependencies.turnstileVerifier || dependencies.turnstileAllowedHostnames.size === 0) {
        safeLog(dependencies, "assistant_capture_turnstile_unavailable", requestId);
        return reply(request, 503, { success: false, error: "service_unavailable" });
      }

      let turnstileResult: TurnstileSiteverifyResult;
      try {
        turnstileResult = await dependencies.turnstileVerifier(normalized.turnstileToken);
      } catch {
        safeLog(dependencies, "assistant_capture_turnstile_unavailable", requestId);
        return reply(request, 503, { success: false, error: "service_unavailable" });
      }
      const verifiedHostname = turnstileResult.hostname?.toLowerCase();
      if (
        turnstileResult.success !== true ||
        !verifiedHostname ||
        !dependencies.turnstileAllowedHostnames.has(verifiedHostname) ||
        turnstileResult.action !== TURNSTILE_ACTION
      ) {
        safeLog(dependencies, "assistant_capture_turnstile_rejected", requestId);
        return reply(request, 403, { success: false, error: "challenge_failed" });
      }

      const fingerprint = await createAssistantCaptureFingerprint(normalized);

      let rpcResult: RpcResult;
      try {
        rpcResult = await dependencies.rpc({
          p_request_id: normalized.requestId,
          p_request_fingerprint: fingerprint,
          p_captured: normalized.captured,
          p_messages: normalized.messages,
          p_summary: normalized.summary,
          p_budget_range: normalized.budgetRange,
          p_next_follow_up_at: nextBusinessDayISO((dependencies.now ?? (() => new Date()))()),
          p_privacy_consent: true,
        });
      } catch {
        safeLog(dependencies, "assistant_capture_failed", requestId);
        return reply(request, 500, { success: false, error: "submission_failed" });
      }

      if (rpcResult.error) {
        const rpcError = rpcResult.error.message ?? "";
        if (rpcError.includes("rate_limit_exceeded")) {
          safeLog(dependencies, "assistant_capture_rate_limited", requestId);
          return reply(request, 429, { success: false, error: "rate_limit_exceeded" });
        }
        if (rpcError.includes("idempotency_key_conflict")) {
          safeLog(dependencies, "assistant_capture_conflict", requestId);
          return reply(request, 409, { success: false, error: "request_conflict" });
        }
        if (rpcError.includes("invalid_request")) {
          safeLog(dependencies, "assistant_capture_rejected", requestId);
          return reply(request, 400, { success: false, error: "invalid_request" });
        }
        safeLog(dependencies, "assistant_capture_failed", requestId);
        return reply(request, 500, { success: false, error: "submission_failed" });
      }

      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : null;
      const result = row && typeof row === "object" && "result" in row
        ? String((row as { result?: unknown }).result)
        : "";
      if (result !== "created" && result !== "idempotent_replay") {
        safeLog(dependencies, "assistant_capture_invalid_result", requestId);
        return reply(request, 500, { success: false, error: "submission_failed" });
      }

      const replay = result === "idempotent_replay";
      safeLog(dependencies, replay ? "assistant_capture_replay" : "assistant_capture_created", requestId);
      return reply(request, replay ? 200 : 201, { success: true, result: replay ? "replay" : "created" });
    } catch (error) {
      if (error instanceof AssistantCaptureContractError) {
        const publicError = error.code === "honeypot_triggered"
          ? "invalid_request"
          : error.code === "turnstile_token_required"
          ? "challenge_required"
          : error.code;
        safeLog(dependencies, "assistant_capture_invalid", requestId);
        return reply(request, 400, { success: false, error: publicError });
      }
      safeLog(dependencies, "assistant_capture_failed", requestId);
      return reply(request, 500, { success: false, error: "submission_failed" });
    }
  };
}
