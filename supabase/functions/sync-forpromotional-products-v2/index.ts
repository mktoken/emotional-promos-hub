// Edge Function: sync-forpromotional-products
// Build 2 — sincronización ForPromotional / 4Promotional hacia tablas multi-proveedor.
// - default mode = dry_run (no escribe).
// - soft-delete DESACTIVADO (pendiente confirmar 2 corridas exitosas).
// - vínculo a productos_b2b: siempre null.
// - no expone tokens, payloads completos, costos, URLs ni proveedor en la respuesta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveForPromotionalApiCost } from "../_shared/forpromotional-api-cost.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROVIDER_CODE = "forpromotional";
const ENDPOINT = "https://api-external-clients.4promotional.net/api/products";

// Columnas esperadas (validación previa a escribir)
const EXPECTED_COLUMNS: Record<string, string[]> = {
  provider_raw_products: [
    "id","proveedor_id","provider_sku","batch_id","raw_payload",
    "nombre","descripcion","categoria","subcategoria",
    "productos_b2b_id","activo","last_seen_at",
  ],
  producto_proveedor_ofertas: [
    "id","provider_raw_product_id","proveedor_id","variant_sku",
    "color_code","color_nombre","talla","material","modelo",
    "imagen_url","atributos","activo",
  ],
  producto_precio_escalas: [
    "id","oferta_id","proveedor_id","min_qty","max_qty",
    "unit_cost","currency","source_field",
  ],
  producto_proveedor_stock: [
    "id","oferta_id","proveedor_id","cantidad","disponibilidad",
  ],
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.trim().replace(/[^0-9.-]/g, "");
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

function pickFirstImage(p: Record<string, unknown>): string | null {
  const arr = p["images"];
  if (Array.isArray(arr)) {
    for (const it of arr) {
      if (it && typeof it === "object") {
        const u = (it as Record<string, unknown>)["url_imagen"];
        if (typeof u === "string" && u.trim()) return u.trim();
      } else if (typeof it === "string" && it.trim()) {
        return it.trim();
      }
    }
  }
  const single = p["url_imagen"];
  if (typeof single === "string" && single.trim()) return single.trim();
  return null;
}

function pickPrice(
  p: Record<string, unknown>,
): ReturnType<typeof resolveForPromotionalApiCost> {
  return resolveForPromotionalApiCost(p);
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
    const candidates = ["products","productos","data","items","results","articulos"];
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

function buildOfertaAtributos(p: Record<string, unknown>) {
  const keys = [
    "composicion","capacidad","peso_unitario","caja_peso",
    "alto_caja","ancho_caja","largo_caja","piezas",
    "producto_promocion","producto_nuevo","precio_unico",
    "precio","precio_desc","opc_promo","opc_unico","desc_promo",
    "metodos_impresion","area_impresion","keywords",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}

function normalizeKeyPart(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim().toUpperCase().replace(/\s+/g, "_");
  return s;
}

function buildVariantSku(p: Record<string, unknown>): string {
  const parts = [
    "FP",
    normalizeKeyPart(p["id_articulo"]),
    normalizeKeyPart(p["id_artd"]),
    normalizeKeyPart(p["modelo"]),
    normalizeKeyPart(p["color"]),
    normalizeKeyPart(p["talla"]),
  ];
  return parts.join("|");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let stage = "init";

  try {
    stage = "env";
    const TOKEN = Deno.env.get("FORPROMOTIONAL_API_TOKEN") ?? "";
    const TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const WRITE_KEY = Deno.env.get("STOCK_REFRESH_CRON_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!TOKEN || !TEST_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return jsonResponse(500, {
        ok: false,
        stage,
        error_message: "Faltan secrets requeridos (FORPROMOTIONAL_API_TOKEN, PROVIDERS_TEST_KEY o credenciales Supabase).",
      });
    }

    stage = "auth";
    const url = new URL(req.url);
    if (url.searchParams.get("test_key") !== TEST_KEY) {
      return jsonResponse(401, { ok: false, stage, error_message: "test_key inválido" });
    }

    const rawMode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const allowedModes = new Set(["dry_run", "shadow_write"]);
    const mode = allowedModes.has(rawMode) ? rawMode : "dry_run";

    if (mode !== "dry_run") {
      const providedWriteKey = req.headers.get("x-stock-refresh-key") ?? "";
      if (!WRITE_KEY || providedWriteKey !== WRITE_KEY) {
        return jsonResponse(403, {
          ok: false,
          stage: "auth",
          error_message: "Los modos de escritura v2 solo pueden ser invocados por el orquestador autorizado",
        });
      }
    }

    const limitRaw = url.searchParams.get("limit");
    const limit = (() => {
      if (!limitRaw) return null;
      const n = parseInt(limitRaw, 10);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.min(n, 5000);
    })();

    const offsetRaw = url.searchParams.get("offset");
    const offset = (() => {
      if (!offsetRaw) return 0;
      const n = parseInt(offsetRaw, 10);
      if (!Number.isFinite(n) || n < 0) return 0;
      return n;
    })();

    const candidateId = cleanText(url.searchParams.get("candidate_id"));
    if (mode === "shadow_write" && !candidateId) {
      return jsonResponse(400, {
        ok: false,
        stage: "params",
        error_message: "candidate_id es obligatorio para shadow_write",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Validación de columnas esperadas
    stage = "schema_check";
    const tableNames = Object.keys(EXPECTED_COLUMNS);
    const { data: cols, error: colsErr } = await supabase
      .from("information_schema.columns" as never)
      .select("table_name,column_name")
      .in("table_name", tableNames as never)
      .eq("table_schema", "public");

    // information_schema no es accesible directamente vía PostgREST — usar RPC alternativa con select directo.
    // Hacemos un check ligero: SELECT 0 row de cada tabla con las columnas esperadas.
    if (colsErr) {
      // Fallback: probar acceso real seleccionando columnas esperadas (limit 0).
      for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
        const { error: probeErr } = await supabase
          .from(table)
          .select(columns.join(","))
          .limit(0);
        if (probeErr) {
          return jsonResponse(500, {
            ok: false,
            stage,
            error_message: `Esquema inesperado en tabla ${table}: ${probeErr.message}`,
          });
        }
      }
    } else if (Array.isArray(cols)) {
      const present: Record<string, Set<string>> = {};
      for (const r of cols as Array<{ table_name: string; column_name: string }>) {
        if (!present[r.table_name]) present[r.table_name] = new Set();
        present[r.table_name].add(r.column_name);
      }
      for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
        const have = present[table];
        if (!have) {
          return jsonResponse(500, {
            ok: false, stage,
            error_message: `Tabla ausente: ${table}`,
          });
        }
        const missing = expected.filter((c) => !have.has(c));
        if (missing.length > 0) {
          return jsonResponse(500, {
            ok: false, stage,
            error_message: `Columnas faltantes en ${table}: ${missing.join(",")}`,
          });
        }
      }
    }

    // Resolver proveedor
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

    // Fetch API
    stage = "fetch_api";
    const apiRes = await fetch(ENDPOINT, {
      method: "GET",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        accept: "application/json",
      },
    });
    const apiText = await apiRes.text();
    if (!apiRes.ok) {
      return jsonResponse(apiRes.status, {
        ok: false, stage,
        provider: PROVIDER_CODE,
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
    const sliceEnd = limit ? offset + limit : list.length;
    const slice = list.slice(offset, sliceEnd);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < itemsReceived;
    const nextUrlSuggested = hasMore
      ? `${url.pathname}?mode=${encodeURIComponent(url.searchParams.get("mode") ?? "dry_run")}&limit=${limit ?? slice.length}&offset=${nextOffset}&test_key=<PROVIDERS_TEST_KEY>`
      : null;
    const firstKeys = slice.length > 0 && slice[0] && typeof slice[0] === "object"
      ? Object.keys(slice[0] as Record<string, unknown>)
      : [];

    // Dry run: no escribe nada
    if (mode === "dry_run") {
      let withPrice = 0, requiresReview = 0, withStock = 0, withImage = 0, missingSku = 0;
      const reviewReasons = new Map<string, number>();
      const affectedSkuSample: string[] = [];
      const sampleCategoria = new Set<string>();
      for (const it of slice) {
        if (!it || typeof it !== "object") continue;
        const p = it as Record<string, unknown>;
        if (!cleanText(p["id_articulo"])) missingSku++;
        const priceInfo = pickPrice(p);
        if (!priceInfo.manual_review) {
          withPrice++;
        } else {
          requiresReview++;
          reviewReasons.set(
            priceInfo.review_reason,
            (reviewReasons.get(priceInfo.review_reason) ?? 0) + 1,
          );
          const sku = cleanText(p["id_articulo"]);
          if (sku && affectedSkuSample.length < 20) affectedSkuSample.push(sku);
        }
        if (toNum(p["inventario"]) !== null) withStock++;
        if (pickFirstImage(p)) withImage++;
        const cat = cleanText(p["categoria"]);
        if (cat && sampleCategoria.size < 10) sampleCategoria.add(cat);
      }
      return jsonResponse(200, {
        ok: true,
        mode,
        provider: PROVIDER_CODE,
        total_received: itemsReceived,
        offset_applied: offset,
        limit_applied: limit ?? null,
        items_processed: slice.length,
        items_upserted: 0,
        items_failed: 0,
        next_offset: hasMore ? nextOffset : null,
        has_more: hasMore,
        next_url_suggested: nextUrlSuggested,
        topLevelKeys,
        firstProductKeys: firstKeys,
        coverage: {
          with_price: withPrice,
          requires_review: requiresReview,
          review_reasons: Object.fromEntries(reviewReasons),
          affected_sku_sample: affectedSkuSample,
          with_stock: withStock,
          with_image: withImage,
          missing_sku: missingSku,
        },
        sample_categorias: Array.from(sampleCategoria),
        note: "dry_run: no se escribió en la base. Soft-delete desactivado.",
      });
    }

    if (mode === "shadow_write") {
      stage = "shadow_candidate";
      const { data: candidate, error: candidateError } = await supabase
        .from("forpromotional_atomic_candidates")
        .select("id,status,provider_id,base_generation_id,catalog_generation_id,api_complete")
        .eq("id", candidateId)
        .maybeSingle();
      if (candidateError || !candidate || candidate.status !== "building") {
        return jsonResponse(409, {
          ok: false,
          stage,
          error_message: "candidate_id no existe o no está en estado building",
        });
      }
      if (candidate.provider_id !== proveedor_id) {
        return jsonResponse(409, {
          ok: false,
          stage,
          error_message: "candidate_id pertenece a otro proveedor",
        });
      }

      let staged = 0;
      let exceptions = 0;
      const exceptionReasons = new Map<string, number>();

      const recordException = async (
        providerSku: string,
        variantKey: string,
        reason: string,
        details: Record<string, unknown>,
      ) => {
        exceptions++;
        exceptionReasons.set(reason, (exceptionReasons.get(reason) ?? 0) + 1);
        const { error } = await supabase
          .from("forpromotional_atomic_exceptions")
          .upsert({
            candidate_id: candidateId,
            provider_sku: providerSku,
            variant_key: variantKey,
            reason,
            details,
          }, { onConflict: "candidate_id,provider_sku,variant_key,reason" });
        if (error) throw new Error(`shadow exception write: ${error.message}`);
      };

      stage = "shadow_stage";
      for (const it of slice) {
        if (!it || typeof it !== "object") {
          await recordException("<missing>", "<missing>", "invalid_api_item", {});
          continue;
        }
        const p = it as Record<string, unknown>;
        const skuRaw = cleanText(p["id_articulo"]);
        const providerSku = skuRaw?.toUpperCase() ?? "<missing>";
        const variantSku = buildVariantSku(p);
        const priceInfo = pickPrice(p);
        if (!skuRaw || priceInfo.manual_review || priceInfo.unit_cost <= 0) {
          await recordException(providerSku, variantSku, priceInfo.review_reason || "invalid_api_cost", {
            source: priceInfo.source,
            commercial_mode: priceInfo.commercial_mode,
          });
          continue;
        }

        const { data: rawRows, error: rawError } = await supabase
          .from("provider_raw_products")
          .select("id")
          .eq("proveedor_id", proveedor_id)
          .eq("provider_sku", providerSku)
          .limit(2);
        if (rawError) throw new Error(`shadow raw lookup: ${rawError.message}`);
        if ((rawRows ?? []).length !== 1) {
          await recordException(providerSku, variantSku, "raw_product_not_unique", {
            matches: (rawRows ?? []).length,
          });
          continue;
        }

        const tallaNorm = normalizeKeyPart(p["talla"]);
        const { data: offerRows, error: offerError } = await supabase
          .from("producto_proveedor_ofertas")
          .select("id,activo")
          .eq("provider_raw_product_id", rawRows![0].id)
          .eq("proveedor_id", proveedor_id)
          .eq("variant_sku", variantSku)
          .eq("color_code", "")
          .eq("talla", tallaNorm)
          .limit(2);
        if (offerError) throw new Error(`shadow offer lookup: ${offerError.message}`);
        if ((offerRows ?? []).length !== 1 || offerRows![0].activo !== true) {
          await recordException(providerSku, variantSku, "active_offer_not_unique", {
            matches: (offerRows ?? []).length,
          });
          continue;
        }

        const offerId = offerRows![0].id as string;
        const { data: scaleRows, error: scaleError } = await supabase
          .from("producto_precio_escalas")
          .select("id,min_qty,max_qty")
          .eq("oferta_id", offerId)
          .eq("proveedor_id", proveedor_id)
          .limit(2);
        if (scaleError) throw new Error(`shadow scale lookup: ${scaleError.message}`);
        if ((scaleRows ?? []).length !== 1
            || Number(scaleRows![0].min_qty) < 1
            || scaleRows![0].max_qty !== null) {
          await recordException(providerSku, variantSku, "live_scale_not_atomic_compatible", {
            matches: (scaleRows ?? []).length,
          });
          continue;
        }

        const { data: stockRows, error: stockError } = await supabase
          .from("producto_proveedor_stock")
          .select("id")
          .eq("oferta_id", offerId)
          .eq("proveedor_id", proveedor_id)
          .limit(2);
        if (stockError) throw new Error(`shadow stock lookup: ${stockError.message}`);
        if ((stockRows ?? []).length !== 1) {
          await recordException(providerSku, variantSku, "live_stock_not_unique", {
            matches: (stockRows ?? []).length,
          });
          continue;
        }

        const { data: mapRows, error: mapError } = await supabase
          .from("producto_b2b_oferta_map")
          .select("producto_b2b_id,provider_code")
          .eq("oferta_id", offerId)
          .eq("provider_code", PROVIDER_CODE)
          .limit(2);
        if (mapError) throw new Error(`shadow mapping lookup: ${mapError.message}`);
        if ((mapRows ?? []).length !== 1) {
          await recordException(providerSku, variantSku, "public_mapping_not_unique", {
            matches: (mapRows ?? []).length,
          });
          continue;
        }

        const stockRaw = toNum(p["inventario"]);
        if (stockRaw === null || stockRaw < 0) {
          await recordException(providerSku, variantSku, "invalid_api_stock", {});
          continue;
        }
        const stockQty = Math.floor(stockRaw);
        const { error: stageError } = await supabase
          .from("forpromotional_atomic_cost_shadow")
          .upsert({
            candidate_id: candidateId,
            offer_id: offerId,
            scale_id: scaleRows![0].id,
            stock_id: stockRows![0].id,
            product_id: mapRows![0].producto_b2b_id,
            provider_sku: providerSku,
            variant_sku: variantSku,
            unit_cost: priceInfo.unit_cost,
            currency: "MXN",
            source_field: priceInfo.source,
            factor: 1,
            supplier_moq: scaleRows![0].min_qty,
            stock_qty: stockQty,
            stock_status: stockBucket(stockQty),
            commercial_mode: priceInfo.commercial_mode,
            control_data: {
              precio: p["precio"] ?? null,
              precio_desc: p["precio_desc"] ?? null,
              opc_promo: p["opc_promo"] ?? null,
              opc_unico: p["opc_unico"] ?? null,
              desc_promo: p["desc_promo"] ?? null,
            },
            api_seen_at: new Date().toISOString(),
          }, { onConflict: "candidate_id,offer_id" });
        if (stageError) throw new Error(`shadow cost write: ${stageError.message}`);
        staged++;
      }

      if (!hasMore) {
        const { error: completeError } = await supabase
          .from("forpromotional_atomic_candidates")
          .update({ api_complete: true, api_completed_at: new Date().toISOString() })
          .eq("id", candidateId)
          .eq("status", "building");
        if (completeError) throw new Error(`shadow completion: ${completeError.message}`);
      }

      return jsonResponse(200, {
        ok: exceptions === 0,
        mode,
        candidate_id: candidateId,
        total_received: itemsReceived,
        offset_applied: offset,
        limit_applied: limit ?? null,
        items_processed: slice.length,
        staged,
        exceptions,
        exception_reasons: Object.fromEntries(exceptionReasons),
        next_offset: hasMore ? nextOffset : null,
        has_more: hasMore,
        public_writes: 0,
        note: "shadow_write solo escribe tablas de candidato; no modifica costos, stock ni precios públicos",
      });
    }

    // Los modos productivos live quedan deliberadamente fuera de v2. Toda
    // escritura nueva debe pasar por shadow_write y publicación atómica.
    return jsonResponse(400, {
      ok: false,
      mode,
      stage: "params",
      error_message: "Modo no permitido en v2; use dry_run o shadow_write",
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
