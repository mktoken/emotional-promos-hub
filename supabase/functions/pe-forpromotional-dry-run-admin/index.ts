/**
 * PE-FP-DIAG-01 — Temporary administrator-only ForPromotional dry-run proxy.
 * Scope: only POST -> sync-forpromotional-products-v2?mode=dry_run&limit=5000&offset=0.
 * No writes to business tables; no API tokens are returned, logged, or accepted from callers.
 * This code is PREPARED, NOT DEPLOYED. Remove after a completed diagnostic.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_REF = "unzfwdykdqotiwzihsvc";
const TARGET_FUNCTION = "sync-forpromotional-products-v2";
const TIMEOUT_MS = 110_000;

function reply(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply(405, { ok: false, error: "method_not_allowed" });

  // Authentication is mandatory. Do not provide an unauthenticated CORS preflight.
  const authHeader = request.headers.get("authorization") ?? "";
  const jwt = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1] ?? "";
  if (!jwt) return reply(401, { ok: false, error: "user_jwt_required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const testKey = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
  if (!supabaseUrl || !serviceRole || !testKey) {
    return reply(503, { ok: false, error: "required_server_configuration_missing" });
  }

  // Hard stop if configured against any project other than the authorized project.
  let baseUrl: URL;
  try {
    baseUrl = new URL(supabaseUrl);
  } catch {
    return reply(503, { ok: false, error: "invalid_backend_configuration" });
  }
  if (baseUrl.protocol !== "https:" || baseUrl.hostname !== `${PROJECT_REF}.supabase.co`) {
    return reply(503, { ok: false, error: "unexpected_project" });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return reply(401, { ok: false, error: "invalid_user_jwt" });

    const [profileRes, roleRes] = await Promise.all([
      admin.from("profiles").select("is_active").eq("id", userData.user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").limit(1),
    ]);
    if (profileRes.error || roleRes.error) {
      return reply(503, { ok: false, error: "authorization_check_unavailable" });
    }
    if (profileRes.data?.is_active !== true || (roleRes.data ?? []).length !== 1) {
      return reply(403, { ok: false, error: "administrator_access_required" });
    }

    // Fixed request: the caller cannot supply mode, URL, pagination or extra operations.
    const target = new URL(`/functions/v1/${TARGET_FUNCTION}`, baseUrl);
    target.searchParams.set("mode", "dry_run");
    target.searchParams.set("limit", "5000");
    target.searchParams.set("offset", "0");
    target.searchParams.set("test_key", testKey);

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return reply(504, { ok: false, error: "upstream_unreachable_or_timeout" });
    }
    if (!upstream.ok) {
      // Never echo upstream body; it may contain implementation details.
      return reply(502, { ok: false, error: "upstream_dry_run_failed", upstream_status: upstream.status });
    }

    let body: Record<string, unknown>;
    try {
      const value: unknown = await upstream.json();
      if (value === null || typeof value !== "object" || Array.isArray(value)) throw Error("response_not_object");
      body = value as Record<string, unknown>;
    } catch {
      return reply(502, { ok: false, error: "invalid_upstream_response" });
    }

    // Verify the result before declaring it a successful non-writing diagnostic.
    if (body.ok !== true || body.mode !== "dry_run" || body.provider !== "forpromotional" ||
        body.items_upserted !== 0 || body.offset_applied !== 0 || body.limit_applied !== 5000 ||
        !isNonnegativeInteger(body.items_processed) || !isNonnegativeInteger(body.unique_variants)) {
      return reply(502, { ok: false, error: "upstream_dry_run_contract_mismatch" });
    }

    const coverage = body.coverage && typeof body.coverage === "object" && !Array.isArray(body.coverage)
      ? body.coverage as Record<string, unknown> : {};
    return reply(200, {
      ok: true,
      mode: "dry_run",
      provider: "forpromotional",
      total_received: body.total_received,
      unique_variants: body.unique_variants,
      duplicate_records: body.duplicate_records,
      invalid_records: body.invalid_records,
      items_processed: body.items_processed,
      items_upserted: 0,
      has_more: body.has_more,
      source_fingerprint: body.source_fingerprint,
      coverage: {
        with_price: coverage.with_price,
        requires_review: coverage.requires_review,
        review_reasons: coverage.review_reasons,
        with_stock: coverage.with_stock,
        with_image: coverage.with_image,
        missing_sku: coverage.missing_sku,
      },
      note: "Administrator-only read-only diagnostic. No public catalog changes requested.",
    });
  } catch {
    return reply(500, { ok: false, error: "unexpected_diagnostic_error" });
  }
});
