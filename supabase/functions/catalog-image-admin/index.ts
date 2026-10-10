import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "catalog-product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const ALLOWED_ORIGINS = new Set([
  "https://articulospromocionales.vip",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function responseHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function safePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveAdminKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { default?: unknown };
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy compatibility variable.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    const headers = responseHeaders(origin);
    headers["Access-Control-Allow-Headers"] = "authorization, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    return new Response("ok", { status: 200, headers });
  }
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = resolveAdminKey();
  if (!supabaseUrl || !adminKey) return json(503, { ok: false, error: "server_misconfigured" }, origin);

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "missing_authorization" }, origin);

  if (token !== adminKey) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json(401, { ok: false, error: "invalid_authorization" }, origin);
    const { data: isStaff, error: staffError } = await admin.rpc("is_staff", { _uid: data.user.id });
    if (staffError) return json(500, { ok: false, error: "authorization_check_failed" }, origin);
    if (isStaff !== true) return json(403, { ok: false, error: "forbidden" }, origin);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, origin);
  }

  const input = body as Record<string, unknown>;
  const ACTIONS = new Set(["upload", "preflight", "delete", "validate_image_update", "apply_image_update"]);
  const action = typeof input.action === "string" && ACTIONS.has(input.action) ? input.action : null;
  const productId = typeof input.producto_b2b_id === "string" ? input.producto_b2b_id : "";
  if (!action || !productId) return json(400, { ok: false, error: "invalid_payload" }, origin);

  // Only durable masters inside this product's namespace are accepted (no traversal, no other bucket).
  const masterPathFor = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const path = value.trim();
    const pattern = new RegExp(`^products/${safePathPart(productId)}/master-[0-9a-f]{16}\\.(webp|jpg|png)$`);
    return pattern.test(path) ? path : null;
  };
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;

  if (action === "delete") {
    if (input.bucket !== undefined && input.bucket !== BUCKET) return json(400, { ok: false, error: "bucket_not_allowed" }, origin);
    const objectPath = masterPathFor(input.object_path);
    if (!objectPath) return json(400, { ok: false, error: "invalid_object_path" }, origin);
    const { data: removed, error: removeError } = await admin.storage.from(BUCKET).remove([objectPath]);
    if (removeError) return json(500, { ok: false, error: "asset_delete_failed" }, origin);
    return json(200, {
      ok: true,
      action,
      producto_b2b_id: productId,
      bucket: BUCKET,
      object_path: objectPath,
      deleted: (removed ?? []).length === 1,
      image_reference_updated: false,
    }, origin);
  }

  const { data: product, error: productError } = await admin
    .from("productos_b2b")
    .select("id, activo, imagenes")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return json(500, { ok: false, error: "product_lookup_failed" }, origin);
  if (!product) return json(404, { ok: false, error: "product_not_found" }, origin);

  const { data: status, error: statusError } = await admin
    .from("producto_b2b_status")
    .select("id, public_visible, image_available, price_valid, quote_mode, stock_status, updated_at")
    .eq("producto_b2b_id", productId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (statusError) return json(500, { ok: false, error: "status_lookup_failed" }, origin);

  // CP-3 P0: canonical authority is the latest producto_b2b_status row (same ordering as
  // public.productos_publicos). productos_b2b.activo is NOT part of current public eligibility.
  const eligible = Boolean(status?.public_visible);
  if (action === "preflight") {
    return json(200, {
      ok: true,
      action,
      producto_b2b_id: productId,
      product_exists: true,
      current_status_exists: Boolean(status),
      public_visible: Boolean(status?.public_visible),
      image_available: Boolean(status?.image_available),
      canonical_eligibility: eligible,
    }, origin);
  }

  if (action === "validate_image_update" || action === "apply_image_update") {
    // validate_image_update: DRY RUN. apply_image_update: same contract, then writes ONLY productos_b2b.imagenes.
    const proposedUrl = typeof input.proposed_url === "string" ? input.proposed_url.trim() : "";
    const objectPath = proposedUrl.startsWith(publicPrefix) ? masterPathFor(proposedUrl.slice(publicPrefix.length)) : null;
    const current = Array.isArray(product.imagenes) ? product.imagenes as Record<string, unknown>[] : null;
    const contractOk = current !== null && current.every((item) => item && typeof item === "object" && typeof item.url === "string");
    const proposedUrlValid = Boolean(objectPath);
    const alreadyPresent = Boolean(current?.some((item) => item?.url === proposedUrl));
    // Contract: master first as "principal" (rank 0 + earliest order in normalizeProductImages);
    // all existing provider images (principal/ambientada/adicional hotlinks) kept, order preserved.
    const proposed = proposedUrlValid && current
      ? [{ url: proposedUrl, type: "principal", source: "catalog_master" }, ...current.filter((item) => item?.url !== proposedUrl)]
      : null;
    const wouldUpdate = eligible && contractOk && proposedUrlValid && !alreadyPresent;
    if (action === "validate_image_update") {
      return json(200, {
        ok: true,
        action,
        dry_run: true,
        producto_b2b_id: productId,
        product_exists: true,
        public_visible: Boolean(status?.public_visible),
        eligible,
        images_contract_valid: contractOk,
        proposed_url_valid: proposedUrlValid,
        would_update: wouldUpdate,
        current_images: current,
        proposed_images: proposed,
        database_write: false,
      }, origin);
    }
    if (!wouldUpdate || !proposed || !objectPath) {
      return json(409, { ok: false, action, error: "image_update_not_allowed", eligible, images_contract_valid: contractOk, proposed_url_valid: proposedUrlValid, already_present: alreadyPresent }, origin);
    }
    // The master must exist in storage before referencing it.
    const head = await fetch(proposedUrl, { method: "HEAD" });
    const headType = head.headers.get("content-type") ?? "";
    if (!head.ok || !headType.startsWith("image/")) {
      return json(409, { ok: false, action, error: "master_not_available", http_status: head.status }, origin);
    }
    const { error: updateError } = await admin.from("productos_b2b").update({ imagenes: proposed }).eq("id", productId);
    if (updateError) return json(500, { ok: false, action, error: "image_update_failed" }, origin);
    return json(200, {
      ok: true,
      action,
      producto_b2b_id: productId,
      images_before: current!.length,
      images_after: proposed.length,
      image_reference_updated: true,
    }, origin);
  }

  if (!eligible) return json(409, { ok: false, error: "product_not_currently_eligible" }, origin);
  const contentType = typeof input.content_type === "string" ? input.content_type.toLowerCase() : "";
  const encoded = typeof input.content_base64 === "string" ? input.content_base64 : "";
  if (!ALLOWED_TYPES.has(contentType) || !encoded) return json(400, { ok: false, error: "unsupported_image" }, origin);
  const bytes = decodeBase64(encoded);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return json(413, { ok: false, error: "image_size_invalid" }, origin);

  const digest = await sha256Hex(bytes);
  const requestedHash = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : "";
  if (requestedHash && requestedHash !== digest) return json(400, { ok: false, error: "sha256_mismatch" }, origin);
  const extension = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const objectPath = `products/${safePathPart(productId)}/master-${digest.slice(0, 16)}.${extension}`;
  const blob = new Blob([bytes], { type: contentType });
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, blob, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return json(409, { ok: false, error: "asset_upload_failed" }, origin);

  return json(201, {
    ok: true,
    action,
    producto_b2b_id: productId,
    bucket: BUCKET,
    object_path: objectPath,
    public_url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`,
    content_type: contentType,
    size_bytes: bytes.byteLength,
    sha256: digest,
    image_reference_updated: false,
  }, origin);
});
