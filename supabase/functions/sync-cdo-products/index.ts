// Edge Function: sync-cdo-products
// Sincroniza catálogo CDO / StockSur México hacia tablas multi-proveedor.
// - default mode = dry_run (no escribe).
// - soft-delete DESACTIVADO.
// - vínculo a productos_b2b: siempre null.
// - no expone tokens ni payloads completos al frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROVIDER_CODE = "cdo_mx"; // code seedeado en tabla proveedores
const ENDPOINT_MX = "http://api.mexico.cdopromocionales.com/v2/products";
const ENDPOINT_TEST = "http://api.argentina.cdo.dev.yellowspot.com.ar/v2/products";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.trim().replace(/[^0-9.\-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeKeyPart(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().toUpperCase().replace(/\s+/g, "_");
}

function pickProviderSku(p: Record<string, unknown>): string | null {
  return (
    cleanText(p["code"]) ??
    cleanText(p["sku"]) ??
    cleanText(p["id"])
  );
}

function pickPriceFrom(src: Record<string, unknown>, prefix: string): { unit_cost: number; source: string } | null {
  const net = toNum(src["net_price"]);
  if (net !== null && net > 0) return { unit_cost: net, source: `${prefix}.net_price` };
  const list = toNum(src["list_price"]);
  if (list !== null && list > 0) return { unit_cost: list, source: `${prefix}.list_price` };
  return null;
}

function pickPrice(p: Record<string, unknown>, variant?: Record<string, unknown>): { unit_cost: number; source: string } | null {
  if (variant) {
    const v = pickPriceFrom(variant, "variant");
    if (v) return v;
  }
  return pickPriceFrom(p, "product");
}

function pickStockFrom(src: Record<string, unknown>): number | null {
  const a = toNum(src["stock_available"]);
  if (a !== null) return a;
  const b = toNum(src["quantity"]);
  if (b !== null) return b;
  const c = toNum(src["stock_existent"]);
  if (c !== null) return c;
  return null;
}

function pickStock(p: Record<string, unknown>, variant?: Record<string, unknown>): number | null {
  if (variant) {
    const v = pickStockFrom(variant);
    if (v !== null) return v;
  }
  return pickStockFrom(p);
}

function pickImageFrom(src: Record<string, unknown>): string | null {
  const candidates: unknown[] = [src["picture"], src["detail_picture"]];
  for (const c of candidates) {
    if (c && typeof c === "object") {
      const url =
        (c as Record<string, unknown>)["url"] ??
        (c as Record<string, unknown>)["original"] ??
        (c as Record<string, unknown>)["medium"] ??
        (c as Record<string, unknown>)["small"];
      if (typeof url === "string" && url.trim()) return url.trim();
    } else if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  const others = src["other_pictures"];
  if (Array.isArray(others)) {
    for (const it of others) {
      if (it && typeof it === "object") {
        const url =
          (it as Record<string, unknown>)["url"] ??
          (it as Record<string, unknown>)["original"] ??
          (it as Record<string, unknown>)["medium"];
        if (typeof url === "string" && url.trim()) return url.trim();
      } else if (typeof it === "string" && it.trim()) {
        return it.trim();
      }
    }
  }
  const icons = src["icons"];
  if (Array.isArray(icons) && icons.length > 0) {
    const it = icons[0];
    if (typeof it === "string" && it.trim()) return it.trim();
    if (it && typeof it === "object") {
      const url = (it as Record<string, unknown>)["url"];
      if (typeof url === "string" && url.trim()) return url.trim();
    }
  }
  return null;
}

function pickFirstImage(p: Record<string, unknown>, variant?: Record<string, unknown>): string | null {
  if (variant) {
    const v = pickImageFrom(variant);
    if (v) return v;
  }
  return pickImageFrom(p);
}

function pickCategoria(p: Record<string, unknown>): { categoria: string | null; subcategoria: string | null } {
  const cats = p["categories"];
  if (Array.isArray(cats) && cats.length > 0) {
    const flat: string[] = [];
    for (const c of cats) {
      if (typeof c === "string") flat.push(c);
      else if (c && typeof c === "object") {
        const name = (c as Record<string, unknown>)["name"];
        if (typeof name === "string") flat.push(name);
      }
    }
    return {
      categoria: flat[0] ?? null,
      subcategoria: flat[1] ?? null,
    };
  }
  return { categoria: null, subcategoria: null };
}

function buildOfertaAtributos(p: Record<string, unknown>) {
  const keys = [
    "packing", "width", "height", "depth", "volume",
    "quantity", "weight", "material", "printing_types",
    "printing_area", "box_quantity",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}

function buildVariantSku(p: Record<string, unknown>, variant?: Record<string, unknown>): string {
  const productKey = normalizeKeyPart(p["code"] ?? p["sku"] ?? p["id"]);
  if (variant) {
    const vSku = cleanText(variant["sku"]) ?? cleanText(variant["code"]);
    if (vSku) return `CDO|${normalizeKeyPart(vSku)}`;
    const discriminator = normalizeKeyPart(
      variant["id"] ?? variant["color_code"] ?? variant["color"] ?? variant["color_name"],
    );
    return `CDO|${productKey}|${discriminator}`;
  }
  return `CDO|${productKey}`;
}

function stockBucket(qty: number): "disponible" | "bajo" | "agotado" {
  if (qty >= 50) return "disponible";
  if (qty >= 1) return "bajo";
  return "agotado";
}

function locateProductList(data: unknown): { list: unknown[]; topLevelKeys: string[] } {
  if (Array.isArray(data)) return { list: data, topLevelKeys: ["<root_array>"] };
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    const candidates = ["products", "productos", "data", "items", "results"];
    for (const k of candidates) {
      const arr = obj[k];
      if (Array.isArray(arr)) return { list: arr, topLevelKeys: keys };
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
        return { list: v, topLevelKeys: keys };
      }
    }
    return { list: [], topLevelKeys: keys };
  }
  return { list: [], topLevelKeys: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let stage = "init";

  try {
    stage = "env";
    const TOKEN_MX = Deno.env.get("CDO_MEXICO_API_TOKEN") ?? "";
    const TOKEN_TEST = Deno.env.get("CDO_TEST_API_TOKEN") ?? "";
    const TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!TEST_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return jsonResponse(500, {
        ok: false, stage,
        error_message: "Faltan secrets requeridos (PROVIDERS_TEST_KEY o credenciales backend).",
      });
    }

    stage = "auth";
    const url = new URL(req.url);
    if (url.searchParams.get("test_key") !== TEST_KEY) {
      return jsonResponse(401, { ok: false, stage, error_message: "test_key inválido" });
    }

    const env = (url.searchParams.get("env") ?? "mx").toLowerCase();
    const endpoint = env === "test" ? ENDPOINT_TEST : ENDPOINT_MX;
    const token = env === "test" ? TOKEN_TEST : TOKEN_MX;
    if (!token) {
      return jsonResponse(500, {
        ok: false, stage,
        error_message: env === "test"
          ? "Falta CDO_TEST_API_TOKEN"
          : "Falta CDO_MEXICO_API_TOKEN",
      });
    }

    const rawMode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const allowedModes = new Set(["dry_run", "full"]);
    const mode = allowedModes.has(rawMode) ? rawMode : "dry_run";

    const limitRaw = url.searchParams.get("limit");
    const limit = (() => {
      const n = limitRaw ? parseInt(limitRaw, 10) : 100;
      if (!Number.isFinite(n) || n <= 0) return 100;
      return Math.min(n, 500);
    })();

    const pageRaw = url.searchParams.get("page");
    const page = (() => {
      const n = pageRaw ? parseInt(pageRaw, 10) : 1;
      if (!Number.isFinite(n) || n < 1) return 1;
      return n;
    })();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Validar proveedor
    stage = "lookup_proveedor";
    const { data: prov, error: provErr } = await supabase
      .from("proveedores")
      .select("id, code")
      .eq("code", PROVIDER_CODE)
      .maybeSingle();
    if (provErr || !prov?.id) {
      return jsonResponse(500, {
        ok: false, stage,
        error_message: `Proveedor ${PROVIDER_CODE} no encontrado en tabla proveedores`,
      });
    }
    const proveedor_id = prov.id as string;

    // Fetch CDO
    stage = "fetch_api";
    const apiUrl =
      `${endpoint}?auth_token=${encodeURIComponent(token)}` +
      `&page_size=${limit}&page_number=${page}`;
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const apiText = await apiRes.text();
    if (!apiRes.ok) {
      return jsonResponse(apiRes.status, {
        ok: false, stage,
        provider: PROVIDER_CODE,
        env,
        status: apiRes.status,
        error_message: `HTTP ${apiRes.status}`,
      });
    }

    stage = "parse";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(apiText);
    } catch {
      return jsonResponse(502, {
        ok: false, stage,
        error_message: "Respuesta no-JSON del proveedor",
      });
    }

    const { list, topLevelKeys } = locateProductList(parsed);
    const itemsReceived = list.length;
    const hasMore = itemsReceived >= limit;
    const nextPage = hasMore ? page + 1 : null;

    // Coverage a nivel oferta (producto raíz o cada variant)
    let withPrice = 0, withStock = 0, withImage = 0, missingSku = 0;
    let variantCountDetected = 0;
    let itemsProcessed = 0;
    let firstVariantKeys: string[] = [];

    for (const it of list) {
      if (!it || typeof it !== "object") continue;
      const p = it as Record<string, unknown>;
      if (!pickProviderSku(p)) missingSku++;
      const variants = Array.isArray(p["variants"]) ? (p["variants"] as unknown[]).filter(v => v && typeof v === "object") as Array<Record<string, unknown>> : [];
      if (variants.length > 0) {
        variantCountDetected += variants.length;
        if (firstVariantKeys.length === 0) {
          firstVariantKeys = Object.keys(variants[0]);
        }
        for (const v of variants) {
          itemsProcessed++;
          if (pickPrice(p, v)) withPrice++;
          if (pickStock(p, v) !== null) withStock++;
          if (pickFirstImage(p, v)) withImage++;
        }
      } else {
        itemsProcessed++;
        if (pickPrice(p)) withPrice++;
        if (pickStock(p) !== null) withStock++;
        if (pickFirstImage(p)) withImage++;
      }
    }

    if (mode === "dry_run") {
      const sampleItem = list.length > 0 && list[0] && typeof list[0] === "object"
        ? Object.keys(list[0] as Record<string, unknown>)
        : [];
      return jsonResponse(200, {
        ok: true,
        provider: PROVIDER_CODE,
        env,
        mode,
        page,
        limit,
        items_received: itemsReceived,
        items_processed: itemsProcessed,
        items_upserted: 0,
        items_failed: 0,
        has_more: hasMore,
        next_page: nextPage,
        failed_sample: [],
        coverage: {
          with_price: withPrice,
          with_stock: withStock,
          with_image: withImage,
          missing_sku: missingSku,
        },
        topLevelKeys,
        firstProductKeys: sampleItem,
        firstVariantKeys,
        variantCountDetected,
        note: "dry_run: no se escribió en la base. Coverage calculada a nivel oferta (variant o producto raíz).",
      });
    }

    // Modo full: abrir batch
    stage = "batch_open";
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: running } = await supabase
      .from("provider_import_batches")
      .select("id, started_at")
      .eq("proveedor_id", proveedor_id)
      .eq("status", "running")
      .gte("started_at", tenMinAgo)
      .limit(1);
    if (running && running.length > 0) {
      return jsonResponse(409, {
        ok: false, stage,
        error_message: "Otro batch en ejecución reciente. Reintenta en unos minutos.",
      });
    }

    const { data: batch, error: batchErr } = await supabase
      .from("provider_import_batches")
      .insert({
        proveedor_id,
        mode,
        status: "running",
        started_at: startedAt,
      })
      .select("id")
      .single();
    if (batchErr || !batch?.id) {
      return jsonResponse(500, {
        ok: false, stage,
        error_message: `No se pudo crear batch: ${batchErr?.message ?? "desconocido"}`,
      });
    }
    const batchId = batch.id as string;

    stage = "upsert";
    let upserted = 0, failed = 0;
    const failedSkus: string[] = [];

    for (const it of list) {
      if (!it || typeof it !== "object") { failed++; continue; }
      const p = it as Record<string, unknown>;
      const skuRaw = pickProviderSku(p);
      if (!skuRaw) { failed++; continue; }
      const sku = skuRaw.toUpperCase();

      try {
        const cat = pickCategoria(p);

        // 1. raw
        const { data: rawRow, error: rawErr } = await supabase
          .from("provider_raw_products")
          .upsert({
            proveedor_id,
            provider_sku: sku,
            batch_id: batchId,
            raw_payload: p,
            nombre: cleanText(p["name"]),
            descripcion: cleanText(p["description"]),
            categoria: cat.categoria,
            subcategoria: cat.subcategoria,
            productos_b2b_id: null,
            activo: true,
            last_seen_at: new Date().toISOString(),
          }, { onConflict: "proveedor_id,provider_sku" })
          .select("id")
          .single();
        if (rawErr || !rawRow?.id) throw new Error(rawErr?.message ?? "raw upsert failed");
        const rawId = rawRow.id as string;

        // Iterar variantes (si las hay), si no, un solo registro
        const variants = Array.isArray(p["variants"]) ? (p["variants"] as unknown[]) : [];
        const variantList: Array<Record<string, unknown> | undefined> =
          variants.length > 0
            ? variants.filter((v) => v && typeof v === "object") as Array<Record<string, unknown>>
            : [undefined];

        for (const variant of variantList) {
          const variantSku = buildVariantSku(p, variant);
          const colorNombre = variant
            ? cleanText(variant["color"] ?? variant["color_name"])
            : cleanText(p["color"]);
          const colorCode = variant
            ? (cleanText(variant["color_code"] ?? variant["id"]) ?? "")
            : "";

          // 2. oferta
          const { data: ofertaRow, error: ofertaErr } = await supabase
            .from("producto_proveedor_ofertas")
            .upsert({
              provider_raw_product_id: rawId,
              proveedor_id,
              variant_sku: variantSku,
              color_code: colorCode,
              color_nombre: colorNombre,
              talla: "",
              material: cleanText(p["material"]),
              modelo: cleanText(p["model"] ?? p["modelo"]),
              imagen_url: pickFirstImage(p),
              atributos: buildOfertaAtributos(p),
              activo: true,
            }, { onConflict: "provider_raw_product_id,variant_sku,color_code,talla" })
            .select("id")
            .single();
          if (ofertaErr || !ofertaRow?.id) throw new Error(ofertaErr?.message ?? "oferta upsert failed");
          const ofertaId = ofertaRow.id as string;

          // 3. precio (escala única 1-null)
          const priceInfo = pickPrice(p);
          if (priceInfo) {
            const { data: existingTiers, error: tiersErr } = await supabase
              .from("producto_precio_escalas")
              .select("id, min_qty, max_qty")
              .eq("oferta_id", ofertaId);
            if (tiersErr) throw new Error(`escalas read: ${tiersErr.message}`);

            const hasUnexpected = (existingTiers ?? []).some(
              (t: { min_qty: number; max_qty: number | null }) =>
                t.min_qty !== 1 || t.max_qty !== null,
            );
            if (hasUnexpected) {
              throw new Error("escalas pre-existentes con estructura distinta; abortar por seguridad");
            }

            if (!existingTiers || existingTiers.length === 0) {
              const { error: insErr } = await supabase
                .from("producto_precio_escalas")
                .insert({
                  oferta_id: ofertaId,
                  proveedor_id,
                  min_qty: 1,
                  max_qty: null,
                  unit_cost: priceInfo.unit_cost,
                  currency: "MXN",
                  source_field: priceInfo.source,
                });
              if (insErr) throw new Error(`escalas insert: ${insErr.message}`);
            } else {
              const { error: updErr } = await supabase
                .from("producto_precio_escalas")
                .update({
                  unit_cost: priceInfo.unit_cost,
                  currency: "MXN",
                  source_field: priceInfo.source,
                })
                .eq("id", existingTiers[0].id);
              if (updErr) throw new Error(`escalas update: ${updErr.message}`);
            }
          }

          // 4. stock
          const stockVal = pickStock(p);
          const qty = stockVal !== null && stockVal >= 0 ? Math.floor(stockVal) : 0;
          const { error: stockErr } = await supabase
            .from("producto_proveedor_stock")
            .upsert({
              oferta_id: ofertaId,
              proveedor_id,
              cantidad: qty,
              disponibilidad: stockBucket(qty),
              updated_at: new Date().toISOString(),
            }, { onConflict: "oferta_id" });
          if (stockErr) throw new Error(`stock upsert: ${stockErr.message}`);
        }

        upserted++;
      } catch (e) {
        failed++;
        if (failedSkus.length < 20) failedSkus.push(sku);
        console.log("item_failed", { sku, error: e instanceof Error ? e.message : "unknown" });
      }
    }

    // Cerrar batch
    stage = "batch_close";
    const finalStatus =
      failed === 0 ? "ok" :
      upserted > 0 ? "partial" : "error";

    await supabase
      .from("provider_import_batches")
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        items_received: itemsReceived,
        items_upserted: upserted,
        items_failed: failed,
      })
      .eq("id", batchId);

    if (finalStatus !== "error") {
      await supabase
        .from("proveedores")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", proveedor_id);
    }

    return jsonResponse(200, {
      ok: finalStatus !== "error",
      provider: PROVIDER_CODE,
      env,
      mode,
      page,
      limit,
      batch_id: batchId,
      status: finalStatus,
      items_received: itemsReceived,
      items_processed: list.length,
      items_upserted: upserted,
      items_failed: failed,
      has_more: hasMore,
      next_page: nextPage,
      failed_sample: failedSkus,
      coverage: {
        with_price: withPrice,
        with_stock: withStock,
        with_image: withImage,
        missing_sku: missingSku,
      },
      note: "soft-delete desactivado; productos_b2b_id queda en null. Avanza paginando con page hasta has_more=false.",
    });
  } catch (e) {
    console.log("fatal", { stage, error: e instanceof Error ? e.message : "unknown" });
    return jsonResponse(500, {
      ok: false,
      stage,
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
