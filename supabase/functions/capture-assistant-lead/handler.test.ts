import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  createCaptureAssistantLeadHandler,
  createCloudflareTurnstileVerifier,
  isAssistantCaptureEnabled,
  TURNSTILE_ACTION,
} from "./handler.ts";

const ORIGIN = "http://localhost:8080";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const HOSTNAME = "articulospromocionales.vip";
const ALLOWED_HOSTNAMES = new Set([HOSTNAME]);

function createHandler(
  overrides: Partial<Parameters<typeof createCaptureAssistantLeadHandler>[0]> = {},
) {
  return createCaptureAssistantLeadHandler({
    captureEnabled: true,
    rpc: async () => ({ data: [{ result: "created" }], error: null }),
    turnstileVerifier: async () => ({
      success: true,
      hostname: HOSTNAME,
      action: TURNSTILE_ACTION,
    }),
    turnstileAllowedHostnames: ALLOWED_HOSTNAMES,
    ...overrides,
  });
}

function validBody() {
  return {
    request_id: REQUEST_ID,
    privacy_consent: true,
    turnstile_token: "synthetic-turnstile-token",
    honeypot: "",
    captured: { contact_name: "Ana Pérez", whatsapp: "5512345678" },
    messages: [{ role: "user", message: "Busco termos" }],
  };
}

function post(body: unknown, options: {
  origin?: string;
  method?: string;
  contentType?: string;
  cfConnectingIp?: string | null;
  forwardedFor?: string;
} = {}) {
  const headers = new Headers({
    origin: options.origin ?? ORIGIN,
    "content-type": options.contentType ?? "application/json",
  });
  if (options.cfConnectingIp) headers.set("cf-connecting-ip", options.cfConnectingIp);
  if (options.forwardedFor) headers.set("x-forwarded-for", options.forwardedFor);
  return new Request("https://edge.test/capture-assistant-lead", {
    method: options.method ?? "POST",
    headers,
    body: options.method && options.method !== "POST" ? undefined : JSON.stringify(body),
  });
}

describe("assistant capture handler", () => {
  it("enables capture only when the environment value is exactly true", () => {
    expect(isAssistantCaptureEnabled(undefined)).toBe(false);
    expect(isAssistantCaptureEnabled("false")).toBe(false);
    expect(isAssistantCaptureEnabled("TRUE")).toBe(false);
    expect(isAssistantCaptureEnabled(" true ")).toBe(false);
    expect(isAssistantCaptureEnabled("true")).toBe(true);
  });

  it("wires activation to its own environment variable, not the Turnstile secret", async () => {
    const entrypoint = await readFile(new URL("./index.ts", import.meta.url), "utf8");
    expect(entrypoint).toMatch(/captureEnabled:\s*isAssistantCaptureEnabled\(Deno\.env\.get\("PE_ASSISTANT_CAPTURE_ENABLED"\)\)/);
    expect(entrypoint).not.toMatch(/captureEnabled:\s*[^,\n]*CLOUDFLARE_TURNSTILE_SECRET_KEY/);
  });

  it("returns 503 before Siteverify and RPC while capture is disabled", async () => {
    let siteverifyCalls = 0;
    let rpcCalls = 0;
    const handler = createHandler({
      captureEnabled: isAssistantCaptureEnabled(undefined),
      turnstileVerifier: async () => {
        siteverifyCalls += 1;
        return { success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION };
      },
      rpc: async () => {
        rpcCalls += 1;
        return { data: [{ result: "created" }], error: null };
      },
    });
    const response = await handler(post(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: "service_unavailable" });
    expect(siteverifyCalls).toBe(0);
    expect(rpcCalls).toBe(0);
  });

  it("fails closed when enabled but the RPC dependency is missing", async () => {
    let siteverifyCalls = 0;
    const handler = createHandler({
      captureEnabled: true,
      rpc: null,
      turnstileVerifier: async () => {
        siteverifyCalls += 1;
        return { success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION };
      },
    });
    const response = await handler(post(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: "service_unavailable" });
    expect(siteverifyCalls).toBe(0);
  });

  it("creates a valid prospect without returning CRM identifiers or logging contact data", async () => {
    const rpcCalls: unknown[] = [];
    const logs: string[] = [];
    const verificationOrder: string[] = [];
    const handler = createHandler({
      turnstileVerifier: async () => {
        verificationOrder.push("turnstile");
        return { success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION };
      },
      rpc: async (args) => {
        verificationOrder.push("rpc");
        rpcCalls.push(args);
        return { data: [{ result: "created" }], error: null };
      },
      now: () => new Date("2026-11-06T12:00:00.000Z"),
      log: (event, requestId) => logs.push(`${event}:${requestId}`),
    });
    const response = await handler(post(validBody()));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, result: "created" });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toMatchObject({
      p_privacy_consent: true,
      p_request_id: REQUEST_ID,
    });
    expect(rpcCalls[0]).not.toHaveProperty("p_client_ip");
    expect(verificationOrder).toEqual(["turnstile", "rpc"]);
    expect(JSON.stringify(logs)).not.toContain("Ana Pérez");
  });

  it("returns idempotent success for a repeated request and no prospect identifiers", async () => {
    const requests = new Map<string, string>();
    const handler = createHandler({
      rpc: async (args) => {
        const previous = requests.get(args.p_request_id);
        if (!previous) {
          requests.set(args.p_request_id, args.p_request_fingerprint);
          return { data: [{ result: "created" }], error: null };
        }
        if (previous !== args.p_request_fingerprint) {
          return { data: null, error: { message: "idempotency_key_conflict" } };
        }
        return { data: [{ result: "idempotent_replay" }], error: null };
      },
    });
    const first = await handler(post(validBody()));
    const second = await handler(post(validBody()));
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ success: true, result: "replay" });
  });

  it("does not reuse a request ID when the server sees a conflicting payload", async () => {
    const handler = createHandler({
      rpc: async () => ({ data: null, error: { message: "idempotency_key_conflict" } }),
    });
    const response = await handler(post(validBody()));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, error: "request_conflict" });
  });

  it("rejects invalid consent and honeypot submissions before CRM access", async () => {
    let rpcCalls = 0;
    const handler = createHandler({
      rpc: async () => {
        rpcCalls += 1;
        return { data: [{ result: "created" }], error: null };
      },
    });
    const noConsent = await handler(post({ ...validBody(), privacy_consent: false }));
    const honeypot = await handler(post({ ...validBody(), honeypot: "bot" }));
    expect(noConsent.status).toBe(400);
    expect(honeypot.status).toBe(400);
    expect(rpcCalls).toBe(0);
  });

  it("requires a Turnstile token before verification or CRM access", async () => {
    let verificationCalls = 0;
    let rpcCalls = 0;
    const handler = createHandler({
      turnstileVerifier: async () => {
        verificationCalls += 1;
        return { success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION };
      },
      rpc: async () => {
        rpcCalls += 1;
        return { data: [{ result: "created" }], error: null };
      },
    });
    const response = await handler(post({ ...validBody(), turnstile_token: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: "challenge_required" });
    expect(verificationCalls).toBe(0);
    expect(rpcCalls).toBe(0);
  });

  it("rejects invalid, expired, and already-used Turnstile tokens before CRM access", async () => {
    for (const errorCode of ["invalid-input-response", "timeout-or-duplicate"]) {
      let rpcCalls = 0;
      const handler = createHandler({
        turnstileVerifier: async () => ({ success: false, "error-codes": [errorCode] }),
        rpc: async () => {
          rpcCalls += 1;
          return { data: [{ result: "created" }], error: null };
        },
      });
      const response = await handler(post(validBody()));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ success: false, error: "challenge_failed" });
      expect(rpcCalls).toBe(0);
    }
  });

  it("rejects Turnstile responses for unexpected hostnames or actions", async () => {
    for (const result of [
      { success: true, hostname: "attacker.example", action: TURNSTILE_ACTION },
      { success: true, hostname: HOSTNAME, action: "other_action" },
    ]) {
      let rpcCalls = 0;
      const handler = createHandler({
        turnstileVerifier: async () => result,
        rpc: async () => {
          rpcCalls += 1;
          return { data: [{ result: "created" }], error: null };
        },
      });
      const response = await handler(post(validBody()));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ success: false, error: "challenge_failed" });
      expect(rpcCalls).toBe(0);
    }
  });

  it("fails closed when Turnstile configuration or Siteverify is unavailable", async () => {
    let rpcCalls = 0;
    const rpc = async () => {
      rpcCalls += 1;
      return { data: [{ result: "created" }], error: null };
    };
    const unconfigured = createHandler({ turnstileVerifier: null, rpc });
    const unavailable = createHandler({
      turnstileVerifier: async () => { throw new Error("network failure"); },
      rpc,
    });
    expect((await unconfigured(post(validBody()))).status).toBe(503);
    expect((await unavailable(post(validBody()))).status).toBe(503);
    expect(rpcCalls).toBe(0);
  });

  it("uses a fresh single-use token with the same idempotency key for a safe retry", async () => {
    const usedTokens = new Set<string>();
    const requests = new Map<string, string>();
    const rpcArguments: Array<{ p_request_id: string; p_request_fingerprint: string }> = [];
    const handler = createHandler({
      turnstileVerifier: async (token) => {
        if (usedTokens.has(token)) {
          return { success: false, "error-codes": ["timeout-or-duplicate"] };
        }
        usedTokens.add(token);
        return { success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION };
      },
      rpc: async (args) => {
        rpcArguments.push(args);
        const previousFingerprint = requests.get(args.p_request_id);
        if (!previousFingerprint) {
          requests.set(args.p_request_id, args.p_request_fingerprint);
          return { data: [{ result: "created" }], error: null };
        }
        if (previousFingerprint !== args.p_request_fingerprint) {
          return { data: null, error: { message: "idempotency_key_conflict" } };
        }
        return { data: [{ result: "idempotent_replay" }], error: null };
      },
    });

    const originalBody = validBody();
    const first = await handler(post(originalBody));
    const reusedToken = await handler(post(originalBody));
    const retryWithFreshToken = await handler(post({ ...originalBody, turnstile_token: "fresh-token" }));

    expect(first.status).toBe(201);
    expect(reusedToken.status).toBe(403);
    expect(retryWithFreshToken.status).toBe(200);
    expect(await retryWithFreshToken.json()).toEqual({ success: true, result: "replay" });
    expect(rpcArguments).toHaveLength(2);
    expect(rpcArguments[0].p_request_id).toBe(rpcArguments[1].p_request_id);
    expect(rpcArguments[0].p_request_fingerprint).toBe(rpcArguments[1].p_request_fingerprint);
  });

  it("calls Cloudflare Siteverify with the secret and token, without an untrusted remote IP", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const verifier = createCloudflareTurnstileVerifier("synthetic-secret-key", async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ success: true, hostname: HOSTNAME, action: TURNSTILE_ACTION }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    expect(verifier).not.toBeNull();
    const result = await verifier!("synthetic-token");
    const form = new URLSearchParams(String(requestInit?.body));
    expect(requestUrl).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(requestInit?.method).toBe("POST");
    expect(form.get("secret")).toBe("synthetic-secret-key");
    expect(form.get("response")).toBe("synthetic-token");
    expect(form.has("remoteip")).toBe(false);
    expect(result.success).toBe(true);
  });

  it("maps the persistent server-side contact limit to a generic 429", async () => {
    const handler = createHandler({
      rpc: async () => ({ data: null, error: { message: "rate_limit_exceeded" } }),
    });
    const response = await handler(post(validBody()));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ success: false, error: "rate_limit_exceeded" });
  });

  it("rejects untrusted origins, methods, media types, and oversized bodies", async () => {
    const handler = createHandler({
      rpc: async () => ({ data: [{ result: "created" }], error: null }),
    });
    expect((await handler(post(validBody(), { origin: "https://attacker.example" }))).status).toBe(403);
    expect((await handler(post(validBody(), { method: "GET" }))).status).toBe(405);
    expect((await handler(post(validBody(), { contentType: "text/plain" }))).status).toBe(415);
    const oversized = new Request("https://edge.test/capture-assistant-lead", {
      method: "POST",
      headers: {
        origin: ORIGIN,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...validBody(), extra: "x".repeat(20_000) }),
    });
    expect((await handler(oversized)).status).toBe(413);
  });

  it("accepts requests without IP and does not let spoofed IP headers change the RPC", async () => {
    const rpcCalls: unknown[] = [];
    const contactsSeen = new Set<string>();
    const handler = createHandler({
      rpc: async (args) => {
        rpcCalls.push(args);
        const phone = String(args.p_captured.whatsapp ?? "");
        if (contactsSeen.has(phone)) {
          return { data: null, error: { message: "rate_limit_exceeded" } };
        }
        contactsSeen.add(phone);
        return { data: [{ result: "created" }], error: null };
      },
    });
    const withoutIp = await handler(post(validBody()));
    const withSpoofedHeaders = await handler(post({
      ...validBody(),
      request_id: "22222222-2222-4222-8222-222222222222",
    }, {
      cfConnectingIp: "198.51.100.99",
      forwardedFor: "203.0.113.88",
    }));
    expect(withoutIp.status).toBe(201);
    expect(withSpoofedHeaders.status).toBe(429);
    expect(rpcCalls).toHaveLength(2);
    expect(rpcCalls[0]).not.toHaveProperty("p_client_ip");
    expect(rpcCalls[1]).not.toHaveProperty("p_client_ip");
    expect(rpcCalls[1]).toMatchObject({
      p_captured: { contact_name: "Ana Pérez", whatsapp: "5512345678" },
    });
  });

  it("keeps contact advisory locks before the transactional limit count", async () => {
    const migration = await readFile(
      new URL("../../migrations/20261106150000_secure_public_assistant_lead_capture_v1.sql", import.meta.url),
      "utf8",
    );
    const emailLock = migration.indexOf("PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock)");
    const phoneLock = migration.indexOf("PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock)");
    const contactCount = migration.indexOf("SELECT count(*)::integer");
    const contactLimit = migration.indexOf("IF v_recent_count >= 3");
    const leadInsert = migration.indexOf("INSERT INTO public.crm_leads");

    expect(emailLock).toBeGreaterThanOrEqual(0);
    expect(phoneLock).toBeGreaterThanOrEqual(0);
    expect(emailLock).toBeLessThan(contactCount);
    expect(phoneLock).toBeLessThan(contactCount);
    expect(contactCount).toBeLessThan(contactLimit);
    expect(contactLimit).toBeLessThan(leadInsert);
  });

  it("removes all IP/cron dependencies while keeping the RPC private and insert-only", async () => {
    const migration = await readFile(
      new URL("../../migrations/20261106150000_secure_public_assistant_lead_capture_v1.sql", import.meta.url),
      "utf8",
    );

    expect(migration).not.toMatch(/p_client_ip|assistant_capture_private|assistant_lead_ip_events|cron\.(schedule|unschedule)|cf-connecting-ip|x-forwarded-for/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.crm_leads|DELETE\s+FROM\s+public\.crm_leads/i);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.capture_assistant_lead_internal\([\s\S]*?\) FROM PUBLIC, anon, authenticated;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.capture_assistant_lead_internal\([\s\S]*?\) TO service_role;/);
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.capture_assistant_lead_internal\([\s\S]*?\) TO (?:PUBLIC|anon|authenticated)/i);
  });

  it("does not expose database errors or identifiers", async () => {
    const handler = createHandler({
      rpc: async () => ({ data: null, error: { message: "permission denied; email=ana@example.com" } }),
    });
    const response = await handler(post(validBody()));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).toBe('{"success":false,"error":"submission_failed"}');
    expect(text).not.toContain("ana@example.com");
  });
});
