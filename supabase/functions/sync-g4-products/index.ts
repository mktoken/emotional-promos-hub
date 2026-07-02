// Edge Function: sync-g4-products
// Sincroniza catálogo G4 México (SOAP WSDL) hacia tablas multi-proveedor.
// - default mode = dry_run (no escribe).
// - vinculo a productos_b2b: siempre null.
// - no expone secrets ni XML completo.
// - no expone costos al frontend público (solo devuelve counters).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROVIDER_CODE = "g4_mx";
const NAMESPACES = [
  "http://tempuri.org/",
  "http://www.4promotional.net/",
  "urn:G4",
];

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(/[^0-9.\-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  const n = toNum(v);
  return n === null ? null : Math.floor(n);
}

function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function buildSoapEnvelope(
  method: "getProduct" | "getProductStock",
  user: string,
  key: string,
  sku: string | null,
  namespace: string,
): string {
  const skuNode = sku !== null && sku !== ""
    ? `<tns:sku>${escapeXml(sku)}</tns:sku>`
    : "";
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">
  <soap:Body>
    <tns:${method}>
      <tns:user>${escapeXml(user)}</tns:user>
      <tns:key>${escapeXml(key)}</tns:key>
      ${skuNode}
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
}

function tryDecodeBase64Inner(text: string): string {
  const inner = text.match(
    /<[^>]*(?:Result|Return)[^>]*>([\s\S]*?)<\/[^>]*(?:Result|Return)[^>]*>/i,
  );
  const candidate = (inner?.[1] ?? text).trim();
  const stripped = candidate.replace(/\s+/g, "");
  if (/^[A-Za-z0-9+/=]+$/.test(stripped) && stripped.length > 16) {
    try {
      const bin = atob(stripped);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      /* not base64 */
    }
  }
  // Puede venir HTML-escapado dentro del *Result
  if (candidate.includes("&lt;")) {
    return decodeHtmlEntities(candidate);
  }
  return candidate;
}

// ---------- XML helpers (regex, tolerantes) ----------

function extractAttributes(openTag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_][\w:-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(openTag)) !== null) {
    out[m[1]] = decodeHtmlEntities(m[2]);
  }
  return out;
}

function extractChildText(xml: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`,
    "i",
  );
  const m = xml.match(re);
  if (!m) return null;
  const inner = m[1].trim();
  if (!inner) return null;
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1].trim() : decodeHtmlEntities(inner);
}

function extractAllElements(xml: string, tag: string): Array<{ open: string; inner: string; attrs: Record<string, string> }> {
  const out: Array<{ open: string; inner: string; attrs: Record<string, string> }> = [];
  // Self-closing
  const selfRe = new RegExp(`<${tag}\\b([^>]*)\\/>`, "gi");
  let m: RegExpExecArray | null;
  const withOpen = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi");
  while ((m = withOpen.exec(xml)) !== null) {
    out.push({ open: m[1], inner: m[2], attrs: extractAttributes(m[1]) });
  }
  while ((m = selfRe.exec(xml)) !== null) {
    out.push({ open: m[1], inner: "", attrs: extractAttributes(m[1]) });
  }
  return out;
}

// Extrae valor combinando @attribute y hijo con el mismo nombre
function getField(
  attrs: Record<string, string>,
  inner: string,
  name: string,
): string | null {
  if (attrs[name] !== undefined && attrs[name] !== "") return attrs[name];
  return extractChildText(inner, name);
}

// ---------- Parser G4 ----------

type G4Product = {
  codigo_producto: string;
  model: string | null;
  nombre_producto: string | null;
  descripcion: string | null;
  linea: string | null;
  codigo_color: string;
  nombre_color: string | null;
  material: string | null;
  activo: boolean;
  imagen_principal: string | null;
  imagen_ambientada: string | null;
  imagenes_adicionales: string[];
  escalas: Array<{ rango: string | null; precio: number | null; min_qty: number | null }>;
  extras: Record<string, unknown>;
};

function parseRangoToMinQty(rango: string | null): number | null {
  if (!rango) return null;
  const s = String(rango).trim();
  // "1-49", "1 a 49", ">=1000", "1000+", "1000"
  const range = s.match(/(\d+)\s*(?:-|a)\s*\d+/i);
  if (range) return Number(range[1]);
  const gte = s.match(/(?:>=|>|\+)\s*(\d+)/);
  if (gte) return Number(gte[1]);
  const plus = s.match(/(\d+)\s*\+/);
  if (plus) return Number(plus[1]);
  const single = s.match(/(\d+)/);
  if (single) return Number(single[1]);
  return null;
}

function parseG4Product(open: string, inner: string): G4Product {
  const attrs = extractAttributes(open);
  const codigo_producto =
    getField(attrs, inner, "codigo_producto") ??
    getField(attrs, inner, "sku") ??
    getField(attrs, inner, "code") ??
    "";
  const codigo_color = getField(attrs, inner, "codigo_color") ?? "";
  const activoRaw = getField(attrs, inner, "activo");
  const activo = activoRaw === null
    ? true
    : /^(1|true|si|sí|yes)$/i.test(String(activoRaw).trim());

  // Imágenes: <imagenes><principal>..</principal><ambientada>..</ambientada><adicionales>..</adicionales></imagenes>
  const imagenesBlock = inner.match(/<imagenes\b[^>]*>([\s\S]*?)<\/imagenes\s*>/i);
  const imagesXml = imagenesBlock?.[1] ?? "";
  const principal = extractChildText(imagesXml, "principal");
  const ambientada = extractChildText(imagesXml, "ambientada");
  const adicionales: string[] = [];
  const adBlock = imagesXml.match(/<adicionales\b[^>]*>([\s\S]*?)<\/adicionales\s*>/i);
  if (adBlock) {
    const imgRe = /<(?:imagen|adicional|url|item)\b[^>]*>([\s\S]*?)<\/(?:imagen|adicional|url|item)\s*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(adBlock[1])) !== null) {
      const v = decodeHtmlEntities(m[1]).trim();
      if (v) adicionales.push(v);
    }
  }

  // Precios: <precios><escala rango="1-49" precio="10.00"/>...</precios> (o hijos)
  const preciosBlock = inner.match(/<precios\b[^>]*>([\s\S]*?)<\/precios\s*>/i);
  const escalas: G4Product["escalas"] = [];
  if (preciosBlock) {
    const escEls = extractAllElements(preciosBlock[1], "escala");
    for (const e of escEls) {
      const rango = e.attrs["rango"] ?? extractChildText(e.inner, "rango");
      const precioRaw = e.attrs["precio"] ?? extractChildText(e.inner, "precio");
      const precio = toNum(precioRaw);
      const min = parseRangoToMinQty(rango);
      escalas.push({ rango: rango ?? null, precio, min_qty: min });
    }
  }

  // Extras: preservar campos varios en payload
  const extras: Record<string, unknown> = {};
  for (const k of [
    "medidas",
    "peso",
    "impresion",
    "area_impresion",
    "caja",
    "ventajas",
    "marca",
    "origen",
  ]) {
    const v = getField(attrs, inner, k);
    if (v !== null) extras[k] = v;
  }
  extras["activo_raw"] = activoRaw;

  return {
    codigo_producto,
    model: getField(attrs, inner, "model"),
    nombre_producto: getField(attrs, inner, "nombre_producto"),
    descripcion: getField(attrs, inner, "descripcion"),
    linea: getField(attrs, inner, "linea"),
    codigo_color,
    nombre_color: getField(attrs, inner, "nombre_color"),
    material: getField(attrs, inner, "material"),
    activo,
    imagen_principal: principal,
    imagen_ambientada: ambientada,
    imagenes_adicionales: adicionales,
    escalas,
    extras,
  };
}

function parseG4Xml(xml: string): G4Product[] {
  // Buscar todos los <producto ...>...</producto>
  const els = extractAllElements(xml, "producto");
  const out: G4Product[] = [];
  for (const el of els) {
    const p = parseG4Product(el.open, el.inner);
    if (p.codigo_producto) out.push(p);
  }
  return out;
}

// ---------- Stock parser ----------

type G4Stock = {
  codigo_producto: string;
  codigo_color: string;
  existencias: number;
};

function parseG4Stock(xml: string): G4Stock[] {
  const els = extractAllElements(xml, "producto");
  const out: G4Stock[] = [];
  for (const el of els) {
    const cp = getField(el.attrs, el.inner, "codigo_producto") ?? "";
    const cc = getField(el.attrs, el.inner, "codigo_color") ?? "";
    const ex = toInt(getField(el.attrs, el.inner, "existencias")) ?? 0;
    if (cp) out.push({ codigo_producto: cp, codigo_color: cc, existencias: ex });
  }
  return out;
}

// ---------- SOAP call ----------

async function callSoap(
  endpoint: string,
  method: "getProduct" | "getProductStock",
  user: string,
  key: string,
  sku: string | null,
): Promise<{ ok: boolean; decoded: string; status: number; ns: string; error?: string }> {
  let last: { status: number; text: string; ns: string } = { status: 0, text: "", ns: "" };
  for (const ns of NAMESPACES) {
    const envelope = buildSoapEnvelope(method, user, key, sku, ns);
    const soapAction = `${ns}${ns.endsWith("/") ? "" : "/"}${method}`;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": `"${soapAction}"`,
        },
        body: envelope,
        signal: controller.signal,
      });
      const text = await res.text();
      last = { status: res.status, text, ns };
      const isFault = /<(?:\w+:)?Fault[\s>]/i.test(text);
      if (res.ok && !isFault) {
        const decoded = tryDecodeBase64Inner(text);
        return { ok: true, decoded, status: res.status, ns };
      }
    } catch (err) {
      last = {
        status: 0,
        text: err instanceof Error ? err.message : String(err),
        ns,
      };
    } finally {
      clearTimeout(to);
    }
  }
  return {
    ok: false,
    decoded: "",
    status: last.status,
    ns: last.ns,
    error: `SOAP ${method} sin respuesta válida (status ${last.status})`,
  };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const G4_USER = Deno.env.get("G4_USER") ?? "";
    const G4_KEY = Deno.env.get("G4_KEY") ?? "";
    const G4_WSDL_URL = Deno.env.get("G4_WSDL_URL") ?? "";
    const PROVIDERS_TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!G4_USER || !G4_KEY || !G4_WSDL_URL) {
      return jsonResponse(500, { ok: false, error: "Faltan secrets G4_USER, G4_KEY o G4_WSDL_URL" });
    }
    if (!PROVIDERS_TEST_KEY) {
      return jsonResponse(500, { ok: false, error: "Falta PROVIDERS_TEST_KEY" });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(500, { ok: false, error: "Faltan secrets de Supabase" });
    }

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? "100")));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));
    const syncStock = (url.searchParams.get("sync_stock") ?? "false").toLowerCase() === "true";
    const testKey = url.searchParams.get("test_key") ?? "";

    if (testKey !== PROVIDERS_TEST_KEY) {
      return jsonResponse(401, { ok: false, error: "test_key inválido" });
    }
    if (!["dry_run", "full"].includes(mode)) {
      return jsonResponse(400, { ok: false, error: "mode debe ser dry_run o full" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Buscar proveedor g4_mx
    const { data: prov, error: provErr } = await supabase
      .from("proveedores")
      .select("id, code, activo")
      .eq("code", PROVIDER_CODE)
      .maybeSingle();

    if (provErr || !prov) {
      return jsonResponse(500, {
        ok: false,
        error: `Proveedor '${PROVIDER_CODE}' no existe en tabla proveedores`,
        detail: provErr?.message,
      });
    }
    const proveedor_id = prov.id as string;

    // 2. Llamar getProduct sin sku
    const endpoint = G4_WSDL_URL.replace(/\?wsdl.*$/i, "");
    const soap = await callSoap(endpoint, "getProduct", G4_USER, G4_KEY, null);
    if (!soap.ok) {
      return jsonResponse(502, {
        ok: false,
        mode,
        provider: PROVIDER_CODE,
        error: soap.error ?? "SOAP getProduct falló",
      });
    }

    const allProducts = parseG4Xml(soap.decoded);
    const total_received = allProducts.length;
    const block = allProducts.slice(offset, offset + limit);

    // Cobertura del bloque
    const coverage = {
      with_price: 0,
      with_image: 0,
      active: 0,
      inactive: 0,
    };
    for (const p of block) {
      if (p.escalas.some((e) => e.precio !== null && e.precio > 0)) coverage.with_price++;
      if (p.imagen_principal || p.imagen_ambientada) coverage.with_image++;
      if (p.activo) coverage.active++;
      else coverage.inactive++;
    }

    // ---------- dry_run ----------
    if (mode === "dry_run") {
      const sample = block.slice(0, 3).map((p) => ({
        codigo_producto: p.codigo_producto,
        codigo_color: p.codigo_color,
        nombre_producto: p.nombre_producto,
        linea: p.linea,
        precio_min: p.escalas.reduce<number | null>(
          (acc, e) => (e.precio !== null && (acc === null || e.precio < acc) ? e.precio : acc),
          null,
        ),
        escalas: p.escalas.length,
        activo: p.activo,
        has_image: Boolean(p.imagen_principal || p.imagen_ambientada),
      }));
      const next_offset = offset + block.length < total_received ? offset + block.length : null;
      return jsonResponse(200, {
        ok: true,
        mode,
        provider: PROVIDER_CODE,
        total_received,
        offset_applied: offset,
        limit_applied: limit,
        items_in_block: block.length,
        coverage,
        sample,
        next_offset,
        has_more: next_offset !== null,
        next_url_suggested: next_offset === null
          ? null
          : `?mode=dry_run&limit=${limit}&offset=${next_offset}&sync_stock=${syncStock}`,
      });
    }

    // ---------- full ----------
    // Crear batch
    const { data: batch, error: batchErr } = await supabase
      .from("provider_import_batches")
      .insert({
        proveedor_id,
        started_at: new Date().toISOString(),
        status: "running",
        mode: "full",
        items_received: total_received,
        items_upserted: 0,
        items_failed: 0,
      })
      .select("id")
      .single();

    if (batchErr || !batch) {
      return jsonResponse(500, {
        ok: false,
        error: "No se pudo crear provider_import_batches",
        detail: batchErr?.message,
      });
    }
    const batch_id = batch.id as string;

    let items_upserted = 0;
    let items_failed = 0;
    let stock_attempted = 0;
    let stock_found = 0;
    let stock_updated = 0;
    let stock_failed = 0;
    const failed_sample: Array<{ codigo_producto: string; error: string }> = [];
    const stock_failed_sample: Array<{ codigo_producto: string; codigo_color: string; error: string }> = [];

    try {
      for (const p of block) {
        try {
          // 3.1 upsert provider_raw_products
          const rawPayload = {
            codigo_producto: p.codigo_producto,
            model: p.model,
            nombre_producto: p.nombre_producto,
            descripcion: p.descripcion,
            linea: p.linea,
            codigo_color: p.codigo_color,
            nombre_color: p.nombre_color,
            material: p.material,
            activo: p.activo,
            imagenes: {
              principal: p.imagen_principal,
              ambientada: p.imagen_ambientada,
              adicionales: p.imagenes_adicionales,
            },
            precios: p.escalas.map((e) => ({
              rango: e.rango,
              precio: e.precio,
              min_qty: e.min_qty,
            })),
            extras: p.extras,
          };

          const { data: rawRow, error: rawErr } = await supabase
            .from("provider_raw_products")
            .upsert(
              {
                proveedor_id,
                provider_sku: p.codigo_producto,
                batch_id,
                raw_payload: rawPayload,
                nombre: p.nombre_producto,
                descripcion: p.descripcion,
                categoria: p.linea,
                subcategoria: null,
                productos_b2b_id: null,
                activo: p.activo,
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "proveedor_id,provider_sku" },
            )
            .select("id")
            .single();

          if (rawErr || !rawRow) {
            throw new Error(`raw upsert: ${rawErr?.message ?? "sin id"}`);
          }
          const provider_raw_product_id = rawRow.id as string;

          // 3.2 upsert oferta
          const imagen_url = p.imagen_principal ?? p.imagen_ambientada ?? null;
          const atributos = {
            ...p.extras,
            imagenes_adicionales: p.imagenes_adicionales,
            activo: p.activo,
          };

          const { data: ofertaRow, error: ofertaErr } = await supabase
            .from("producto_proveedor_ofertas")
            .upsert(
              {
                provider_raw_product_id,
                proveedor_id,
                variant_sku: p.codigo_producto,
                color_code: p.codigo_color ?? "",
                color_nombre: p.nombre_color,
                talla: "",
                material: p.material,
                modelo: p.model,
                imagen_url,
                atributos,
                activo: p.activo,
              },
              { onConflict: "provider_raw_product_id,variant_sku,color_code,talla" },
            )
            .select("id")
            .single();

          if (ofertaErr || !ofertaRow) {
            throw new Error(`oferta upsert: ${ofertaErr?.message ?? "sin id"}`);
          }
          const oferta_id = ofertaRow.id as string;

          // 3.3 reemplazar escalas
          await supabase
            .from("producto_precio_escalas")
            .delete()
            .eq("oferta_id", oferta_id);

          const escalasRows = p.escalas
            .filter((e) => e.precio !== null && e.precio > 0)
            .map((e) => ({
              oferta_id,
              proveedor_id,
              min_qty: e.min_qty ?? 1,
              max_qty: null,
              unit_cost: e.precio as number,
              currency: "MXN",
              source_field: "g4_precios_escala",
            }));

          if (escalasRows.length > 0) {
            const { error: escErr } = await supabase
              .from("producto_precio_escalas")
              .insert(escalasRows);
            if (escErr) throw new Error(`escalas insert: ${escErr.message}`);
          }

          // 3.4 stock (opcional)
          if (syncStock) {
            stock_attempted++;
            try {
              const stockSoap = await callSoap(
                endpoint,
                "getProductStock",
                G4_USER,
                G4_KEY,
                p.codigo_producto,
              );
              if (!stockSoap.ok) {
                throw new Error(`SOAP getProductStock: ${stockSoap.error ?? "sin respuesta"}`);
              }
              const stocks = parseG4Stock(stockSoap.decoded);
              const targetColor = (p.codigo_color ?? "").toLowerCase();
              const match =
                stocks.find((s) => (s.codigo_color ?? "").toLowerCase() === targetColor) ??
                stocks.find(
                  (s) =>
                    (s.codigo_producto ?? "").toLowerCase() ===
                    (p.codigo_producto ?? "").toLowerCase(),
                ) ??
                stocks[0] ??
                null;
              if (!match) {
                throw new Error("stock XML sin <producto> con existencias");
              }
              stock_found++;
              const cantidad = Number.isFinite(match.existencias) ? match.existencias : 0;
              const disponibilidad = cantidad > 0 ? "available" : "out_of_stock";

              // Estrategia segura: delete + insert (además cubre casos sin constraint)
              await supabase
                .from("producto_proveedor_stock")
                .delete()
                .eq("oferta_id", oferta_id);

              const { error: stInsErr } = await supabase
                .from("producto_proveedor_stock")
                .insert({
                  oferta_id,
                  proveedor_id,
                  cantidad,
                  disponibilidad,
                  updated_at: new Date().toISOString(),
                });
              if (stInsErr) throw new Error(`stock insert: ${stInsErr.message}`);
              stock_updated++;
            } catch (stockErr) {
              stock_failed++;
              if (stock_failed_sample.length < 5) {
                stock_failed_sample.push({
                  codigo_producto: p.codigo_producto,
                  codigo_color: p.codigo_color ?? "",
                  error:
                    stockErr instanceof Error
                      ? stockErr.message.slice(0, 240)
                      : String(stockErr).slice(0, 240),
                });
              }
            }
          }

          items_upserted++;
        } catch (itemErr) {
          items_failed++;
          if (failed_sample.length < 5) {
            failed_sample.push({
              codigo_producto: p.codigo_producto,
              error: itemErr instanceof Error ? itemErr.message.slice(0, 240) : String(itemErr).slice(0, 240),
            });
          }
        }
      }

      // Cerrar batch OK
      await supabase
        .from("provider_import_batches")
        .update({
          finished_at: new Date().toISOString(),
          status: items_failed === 0 ? "ok" : "ok",
          items_upserted,
          items_failed,
        })
        .eq("id", batch_id);

      // touch proveedor.last_sync_at
      await supabase
        .from("proveedores")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", proveedor_id);
    } catch (fatal) {
      await supabase
        .from("provider_import_batches")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          items_upserted,
          items_failed,
          error_message: fatal instanceof Error ? fatal.message.slice(0, 500) : String(fatal).slice(0, 500),
        })
        .eq("id", batch_id);
      return jsonResponse(500, {
        ok: false,
        mode,
        provider: PROVIDER_CODE,
        batch_id,
        error: fatal instanceof Error ? fatal.message : String(fatal),
        items_upserted,
        items_failed,
      });
    }

    const next_offset = offset + block.length < total_received ? offset + block.length : null;
    return jsonResponse(200, {
      ok: true,
      mode,
      provider: PROVIDER_CODE,
      batch_id,
      total_received,
      offset_applied: offset,
      limit_applied: limit,
      items_processed: block.length,
      items_upserted,
      items_failed,
      stock_attempted,
      stock_found,
      stock_updated,
      stock_failed,
      stock_failed_sample,
      failed_sample,
      coverage,
      next_offset,
      has_more: next_offset !== null,
      next_url_suggested: next_offset === null
        ? null
        : `?mode=full&limit=${limit}&offset=${next_offset}&sync_stock=${syncStock}`,
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});
