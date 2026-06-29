// Edge Function: sync-forpromotional-products
// Build 2 — sincronización ForPromotional / 4Promotional hacia tablas multi-proveedor.
// - default mode = dry_run (no escribe).
// - soft-delete DESACTIVADO (pendiente confirmar 2 corridas exitosas).
// - vínculo a productos_b2b: siempre null.
// - no expone tokens, payloads completos, costos, URLs ni proveedor en la respuesta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function pickPrice(p: Record<string, unknown>): { unit_cost: number; source: string } | null {
  const desc = toNum(p["precio_desc"]);
  if (desc !== null && desc > 0) return { unit_cost: desc, source: "precio_desc" };
  const base = toNum(p["precio"]);
  if (base !== null && base > 0) return { unit_cost: base, source: "precio" };
  return null;
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
    const allowedModes = new Set(["dry_run","incremental","full"]);
    const mode = allowedModes.has(rawMode) ? rawMode : "dry_run";

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
      let withPrice = 0, withStock = 0, withImage = 0, missingSku = 0;
      const sampleCategoria = new Set<string>();
      for (const it of slice) {
        if (!it || typeof it !== "object") continue;
        const p = it as Record<string, unknown>;
        if (!cleanText(p["id_articulo"])) missingSku++;
        if (pickPrice(p)) withPrice++;
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
          with_stock: withStock,
          with_image: withImage,
          missing_sku: missingSku,
        },
        sample_categorias: Array.from(sampleCategoria),
        note: "dry_run: no se escribió en la base. Soft-delete desactivado.",
      });
    }

    // Modos full / incremental: abrir batch
    stage = "batch_open";
    // Anti race: rechazar si hay batch running reciente (<10 min)
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

    // Upsert por ítem
    stage = "upsert";
    let upserted = 0, failed = 0;
    const failedSkus: string[] = [];

    for (const it of slice) {
      if (!it || typeof it !== "object") { failed++; continue; }
      const p = it as Record<string, unknown>;
      const skuRaw = cleanText(p["id_articulo"]);
      if (!skuRaw) { failed++; continue; }
      const sku = skuRaw.toUpperCase();

      try {
        // 1. raw_products upsert
        const { data: rawRow, error: rawErr } = await supabase
          .from("provider_raw_products")
          .upsert({
            proveedor_id,
            provider_sku: sku,
            batch_id: batchId,
            raw_payload: p,
            nombre: cleanText(p["nombre_artd"]),
            descripcion: cleanText(p["descripcion"]),
            categoria: cleanText(p["categoria"]),
            subcategoria: cleanText(p["sub_categoria"]),
            productos_b2b_id: null,
            activo: true,
            last_seen_at: new Date().toISOString(),
          }, { onConflict: "proveedor_id,provider_sku" })
          .select("id")
          .single();
        if (rawErr || !rawRow?.id) throw new Error(rawErr?.message ?? "raw upsert failed");
        const rawId = rawRow.id as string;

        // 2. oferta upsert
        const variantSku = buildVariantSku(p);
        const tallaNorm = normalizeKeyPart(p["talla"]);
        const { data: ofertaRow, error: ofertaErr } = await supabase
          .from("producto_proveedor_ofertas")
          .upsert({
            provider_raw_product_id: rawId,
            proveedor_id,
            variant_sku: variantSku,
            color_code: "",
            color_nombre: cleanText(p["color"]),
            talla: tallaNorm,
            material: cleanText(p["material"]),
            modelo: cleanText(p["modelo"]),
            imagen_url: pickFirstImage(p),
            atributos: buildOfertaAtributos(p),
            activo: true,
          }, { onConflict: "provider_raw_product_id,variant_sku,color_code,talla" })
          .select("id")
          .single();
        if (ofertaErr || !ofertaRow?.id) throw new Error(ofertaErr?.message ?? "oferta upsert failed");
        const ofertaId = ofertaRow.id as string;

        // 3. escala (solo si existe precio válido)
        const priceInfo = pickPrice(p);
        if (priceInfo) {
          const { data: existingTiers, error: tiersErr } = await supabase
            .from("producto_precio_escalas")
            .select("id, min_qty, max_qty, source_field")
            .eq("oferta_id", ofertaId);
          if (tiersErr) throw new Error(`escalas read: ${tiersErr.message}`);

          const hasUnexpected = (existingTiers ?? []).some((t: { min_qty: number; max_qty: number | null }) =>
            t.min_qty !== 1 || t.max_qty !== null
          );
          if (hasUnexpected) {
            throw new Error("escalas pre-existentes con estructura distinta a 1-null; abortar por seguridad");
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
        const invNum = toNum(p["inventario"]);
        const qty = invNum !== null && invNum >= 0 ? Math.floor(invNum) : 0;
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

        upserted++;
      } catch (e) {
        failed++;
        if (failedSkus.length < 20) failedSkus.push(sku);
        console.log("item_failed", { sku, error: e instanceof Error ? e.message : "unknown" });
      }
    }

    // Soft-delete DESACTIVADO en esta fase
    stage = "soft_delete_skipped";

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
      mode,
      provider: PROVIDER_CODE,
      batch_id: batchId,
      status: finalStatus,
      items_received: itemsReceived,
      items_upserted: upserted,
      items_failed: failed,
      limit_applied: limit ?? null,
      failed_sample: failedSkus.slice(0, 20),
      note: "soft-delete desactivado en esta fase; vínculo a productos_b2b queda en null.",
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
