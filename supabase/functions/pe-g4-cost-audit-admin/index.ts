/**
 * PE-G4-AUDIT-01. Read-only, administrator-only G4 source-cost evidence.
 * This endpoint does NOT certify that SOAP `precio` means "sin decorado".
 * It compares the stored imported prices with screenshot reference values.
 * Prepared only: deploy deliberately only with explicit, scoped authorization.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_REF = "unzfwdykdqotiwzihsvc";
const EXPECTED = [
  { label: "Libreta Skin", sku: "lib-ski-vec", screenshotLastCost: 46.84 },
  { label: "Century", sku: "cen-met-neg", screenshotLastCost: 63.79 },
  { label: "Funda Laptop Takayama IQ", sku: "fun-iiq-neg", screenshotLastCost: 172.63 },
  { label: "Block de Notas Fancy", sku: "blo-fan-neg", screenshotLastCost: 25.79 },
  { label: "Colors Elite", sku: "col-eli-azu", screenshotLastCost: 3.74 },
] as const;
const LINK_REFERENCE = { label: "Link Terra", screenshotLastCost: 121.05 };
const MAX_RAW_ROWS = 60;
const MAX_OFFERS = 200;
const MAX_SCALES = 800;

function respond(code: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function validPositiveNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : (typeof v === "string" && v.trim() ? Number(v) : NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function validQty(v: unknown): number | null {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function referenceMatch(value: unknown, ref: number): boolean {
  const num = validPositiveNumber(value);
  return num !== null && Math.abs(num - ref) < 0.005;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "post_required" });
  // No caller-selected SKU, URL, SQL, pagination, provider or execution mode.
  const jwt = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!jwt) return respond(401, { ok: false, error: "user_jwt_required" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return respond(503, { ok: false, error: "backend_config_missing" });
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); }
  catch { return respond(503, { ok: false, error: "invalid_backend_url" }); }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== `${PROJECT_REF}.supabase.co`) {
    return respond(503, { ok: false, error: "wrong_project" });
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: actor, error: authErr } = await db.auth.getUser(jwt);
    if (authErr || !actor.user) return respond(401, { ok: false, error: "invalid_user_jwt" });
    const [profile, roles] = await Promise.all([
      db.from("profiles").select("is_active").eq("id", actor.user.id).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", actor.user.id).eq("role", "admin").limit(1),
    ]);
    if (profile.error || roles.error) return respond(503, { ok: false, error: "auth_check_failed" });
    if (profile.data?.is_active !== true || (roles.data ?? []).length !== 1) {
      return respond(403, { ok: false, error: "admin_required" });
    }

    const { data: provider, error: provErr } = await db.from("proveedores")
      .select("id,code").eq("code", "g4_mx").maybeSingle();
    if (provErr || !provider?.id) return respond(503, { ok: false, error: "g4_provider_unavailable" });

    const skus = EXPECTED.map((p) => p.sku);
    const [bySku, linkByName] = await Promise.all([
      db.from("provider_raw_products")
        .select("id,provider_sku,nombre,last_seen_at,raw_payload,proveedor_id")
        .eq("proveedor_id", provider.id).in("provider_sku", skus).limit(MAX_RAW_ROWS + 1),
      db.from("provider_raw_products")
        .select("id,provider_sku,nombre,last_seen_at,raw_payload,proveedor_id")
        .eq("proveedor_id", provider.id).ilike("nombre", "%Link%Terra%").limit(11),
    ]);
    if (bySku.error || linkByName.error) return respond(503, { ok: false, error: "source_read_failed" });
    const candidateRaw = [...(bySku.data ?? []), ...(linkByName.data ?? [])];
    const dedup = new Map(candidateRaw.map((r) => [r.id, r]));
    const raws = [...dedup.values()];
    if ((bySku.data ?? []).length > MAX_RAW_ROWS || (linkByName.data ?? []).length > 10 || raws.length > MAX_RAW_ROWS) {
      return respond(409, { ok: false, error: "source_too_many_rows" });
    }
    if (raws.length === 0) return respond(200, {
      ok: true, status: "NOT_FOUND", provider: "g4_mx", rows: [],
      note: "No hubo coincidencias locales; no se infieren costos ni SKU",
    });
    const ids = raws.map((r) => r.id);
    const { data: offerRows, error: offerErr } = await db.from("producto_proveedor_ofertas")
      .select("id,provider_raw_product_id,variant_sku,color_code,activo,proveedor_id")
      .eq("proveedor_id", provider.id).in("provider_raw_product_id", ids).limit(MAX_OFFERS + 1);
    if (offerErr || !offerRows || offerRows.length > MAX_OFFERS) return respond(503, { ok: false, error: "offer_read_failed_or_incomplete" });
    const offerIds = offerRows.map((o) => o.id);
    const { data: priceRows, error: scaleErr } = offerIds.length
      ? await db.from("producto_precio_escalas")
        .select("oferta_id,proveedor_id,min_qty,max_qty,unit_cost,source_field,currency")
        .eq("proveedor_id", provider.id).in("oferta_id", offerIds).limit(MAX_SCALES + 1)
      : { data: [], error: null };
    if (scaleErr || !priceRows || priceRows.length > MAX_SCALES) {
      return respond(503, { ok: false, error: "scale_read_failed_or_incomplete" });
    }
    const results = raws.map((r) => {
      const match = EXPECTED.find((s) => s.sku === r.provider_sku);
      const isLinkCandidate = !match;
      const ref = match?.screenshotLastCost ?? LINK_REFERENCE.screenshotLastCost;
      const offers = offerRows.filter((o) => o.provider_raw_product_id === r.id).map((o) => {
        const scales = priceRows.filter((s) => s.oferta_id === o.id)
          .map((s) => ({
            min_qty: validQty(s.min_qty), max_qty: s.max_qty, unit_cost: validPositiveNumber(s.unit_cost),
            source_field: s.source_field, currency: s.currency,
          })).sort((a, b) => (a.min_qty ?? -1) - (b.min_qty ?? -1));
        const highestQty = Math.max(0, ...scales.map((s) => s.min_qty ?? 0));
        const highestRows = scales.filter((s) => s.min_qty === highestQty && highestQty > 0);
        const distinctHighestPrices = [...new Set(highestRows.map((s) => s.unit_cost))];
        const last = distinctHighestPrices.length === 1 && highestRows.length > 0 ? highestRows[0] : null;
        return {
          variant_sku: o.variant_sku, color_code: o.color_code, activo: o.activo,
          scales,
          last_qty: highestQty || null,
          last_cost: last?.unit_cost ?? null,
          last_source_field: last?.source_field ?? null,
          ambiguous_highest_cost: distinctHighestPrices.length > 1,
          screenshot_match: last === null ? false : referenceMatch(last.unit_cost, ref),
        };
      });
      const payload = r.raw_payload && typeof r.raw_payload === "object" && !Array.isArray(r.raw_payload)
        ? r.raw_payload as Record<string, unknown> : {};
      const sourcePrices = Array.isArray(payload.precios) ? payload.precios.slice(0, 30).map((p: unknown) => {
        const v = p && typeof p === "object" ? p as Record<string, unknown> : {};
        return { rango: String(v.rango ?? "").slice(0, 40), min_qty: validQty(v.min_qty), precio: validPositiveNumber(v.precio) };
      }) : [];
      return {
        provider_sku: r.provider_sku,
        nombre: r.nombre,
        last_seen_at: r.last_seen_at,
        reference_label: match?.label ?? LINK_REFERENCE.label,
        screenshot_last_cost: ref,
        identity_confirmed_by_allowlist: !isLinkCandidate,
        link_terra_candidate_only: isLinkCandidate,
        raw_payload_prices: sourcePrices,
        offers,
      };
    });
    return respond(200, {
      ok: true, status: "READ_ONLY_EVIDENCE", provider: "g4_mx", project: PROJECT_REF,
      expected_skus: skus, expected_skus_missing: skus.filter((sku) => !results.some((r) => r.provider_sku === sku)),
      link_terra_identity: "UNCONFIRMED_REQUIRES_EXACT_MATCH",
      reference_prices_are_screenshot_values_not_verified_contract: true,
      soap_semantics_certified: false,
      inspected_at: new Date().toISOString(), rows: results,
      note: "Sin escrituras. La igualdad numérica entre DB y captura NO acredita por sí sola la semántica SOAP para todo G4.",
    });
  } catch (_err) {
    return respond(500, { ok: false, error: "unexpected_read_only_audit_failure" });
  }
});
