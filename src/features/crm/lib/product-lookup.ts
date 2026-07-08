// Búsqueda y prefill de productos por clave/modelo/SKU.
// USO INTERNO CRM. Nunca copiar campos internos de proveedor
// (proveedor, costeo, provider_sku, provider_code, raw_payload,
// datos_logistica_b2b, notas internas). Sólo se retornan campos
// comerciales seguros para prellenar una partida.
import { supabase } from "@/integrations/supabase/client";

export type ProductLookupSource = "publico" | "b2b";

export interface SafeProductMatch {
  source: ProductLookupSource;
  ref_id: string; // productos_publicos.id | productos_b2b.id
  id_interno: string | null;
  sku_base: string | null;
  nombre: string | null;
  descripcion: string | null;
  categoria: string | null;
  imagen_url: string | null;
  precio_desde_mxn: number | null;
  color_default: string | null;
  unidad: string | null;
  // Escalas de precio DERIVADAS (customer-safe). Nunca contiene cost/margin.
  scales: Array<{
    min_qty: number;
    max_qty: number | null;
    unit_price_mxn: number;
  }>;
  has_scales: boolean;
}

// -------------- helpers ----------------

function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const p = Number(v);
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

function s(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

function extractImage(imgs: unknown): string | null {
  if (!imgs) return null;
  if (Array.isArray(imgs)) {
    for (const x of imgs) {
      if (typeof x === "string" && x.trim()) return x.trim();
      if (x && typeof x === "object") {
        const obj = x as Record<string, unknown>;
        const u = s(obj.url) ?? s(obj.src) ?? s(obj.imagen) ?? s(obj.href);
        if (u) return u;
      }
    }
  }
  if (typeof imgs === "object") {
    const obj = imgs as Record<string, unknown>;
    return s(obj.url) ?? s(obj.src) ?? s(obj.principal) ?? null;
  }
  return null;
}

function extractName(dg: unknown, fallback: string | null): string | null {
  if (dg && typeof dg === "object") {
    const obj = dg as Record<string, unknown>;
    return (
      s(obj.nombre_comercial) ??
      s(obj.modelo_comercial) ??
      s(obj.nombre) ??
      s(obj.titulo) ??
      s(obj.modelo) ??
      fallback
    );
  }
  return fallback;
}

function extractDescription(dg: unknown): string | null {
  if (dg && typeof dg === "object") {
    const obj = dg as Record<string, unknown>;
    return (
      s(obj.descripcion) ??
      s(obj.descripcion_larga) ??
      s(obj.descripcion_comercial) ??
      s(obj.detalle) ??
      null
    );
  }
  return null;
}

function extractUnit(dg: unknown): string | null {
  if (dg && typeof dg === "object") {
    const obj = dg as Record<string, unknown>;
    return s(obj.unidad) ?? s(obj.unidad_medida) ?? null;
  }
  return null;
}

function extractDefaultColor(variantes: unknown): string | null {
  if (!Array.isArray(variantes) || variantes.length === 0) return null;
  const first = variantes[0];
  if (first && typeof first === "object") {
    const obj = first as Record<string, unknown>;
    return s(obj.color_nombre) ?? s(obj.color) ?? s(obj.nombre) ?? null;
  }
  return null;
}

// Extrae escalas seguras (unit_price_mxn) desde variantes públicas si existen.
// productos_publicos no expone costos; sólo unit_price/precio si vienen.
function extractPublicScales(
  variantes: unknown,
): SafeProductMatch["scales"] {
  const out: SafeProductMatch["scales"] = [];
  if (!Array.isArray(variantes)) return out;
  for (const v of variantes) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    const escalas = obj.escalas ?? obj.precio_escalas ?? obj.precios;
    if (!Array.isArray(escalas)) continue;
    for (const e of escalas) {
      if (!e || typeof e !== "object") continue;
      const eo = e as Record<string, unknown>;
      const min = n(eo.min_qty) ?? n(eo.min) ?? n(eo.desde);
      const max = n(eo.max_qty) ?? n(eo.max) ?? n(eo.hasta);
      const unit =
        n(eo.unit_price_mxn) ??
        n(eo.precio_unitario_mxn) ??
        n(eo.precio_unitario) ??
        n(eo.precio) ??
        null;
      if (min != null && unit != null && unit > 0) {
        out.push({ min_qty: min, max_qty: max, unit_price_mxn: unit });
      }
    }
  }
  out.sort((a, b) => a.min_qty - b.min_qty);
  return out;
}

export function pickPriceForQty(
  match: Pick<SafeProductMatch, "scales" | "precio_desde_mxn">,
  qty: number,
): { unit_price_mxn: number; used_scale: boolean } | null {
  const q = Math.max(1, Math.floor(qty || 0));
  if (match.scales && match.scales.length > 0) {
    let picked: SafeProductMatch["scales"][number] | null = null;
    for (const sc of match.scales) {
      if (q >= sc.min_qty && (sc.max_qty == null || q <= sc.max_qty)) {
        picked = sc;
      }
    }
    if (picked) return { unit_price_mxn: picked.unit_price_mxn, used_scale: true };
    // Si la cantidad es menor al primer tramo, tomar el primero como referencia.
    const first = match.scales[0];
    if (first) return { unit_price_mxn: first.unit_price_mxn, used_scale: true };
  }
  if (match.precio_desde_mxn != null && match.precio_desde_mxn > 0) {
    return { unit_price_mxn: match.precio_desde_mxn, used_scale: false };
  }
  return null;
}

// -------------- búsqueda ----------------

/**
 * Busca un producto por clave/modelo/SKU en:
 *  1) productos_publicos (vista segura del catálogo)
 *  2) productos_b2b (sólo campos comerciales)
 * Devuelve como máximo `limit` resultados combinados.
 */
export async function searchProductByClave(
  query: string,
  limit = 5,
): Promise<SafeProductMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const results: SafeProductMatch[] = [];

  // 1) productos_publicos
  try {
    const { data: pubs } = await supabase
      .from("productos_publicos")
      .select(
        "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,precio_desde_mxn",
      )
      .or(`id_interno.ilike.${like},sku_base.ilike.${like}`)
      .limit(limit);
    for (const row of pubs ?? []) {
      if (!row || typeof row !== "object") continue;
      const id = s((row as Record<string, unknown>).id);
      if (!id) continue;
      const dg = (row as Record<string, unknown>).datos_generales;
      const vars_ = (row as Record<string, unknown>).variantes;
      const scales = extractPublicScales(vars_);
      results.push({
        source: "publico",
        ref_id: id,
        id_interno: s((row as Record<string, unknown>).id_interno),
        sku_base: s((row as Record<string, unknown>).sku_base),
        nombre: extractName(dg, s((row as Record<string, unknown>).id_interno)),
        descripcion: extractDescription(dg),
        categoria: s((row as Record<string, unknown>).categoria_principal),
        imagen_url: extractImage((row as Record<string, unknown>).imagenes),
        precio_desde_mxn: n((row as Record<string, unknown>).precio_desde_mxn),
        color_default: extractDefaultColor(vars_),
        unidad: extractUnit(dg),
        scales,
        has_scales: scales.length > 0,
      });
    }
  } catch (e) {
    console.warn("[product-lookup] productos_publicos search failed", e);
  }

  // 2) productos_b2b — NUNCA leer costeo, datos_logistica_b2b, proveedor.
  try {
    const remaining = Math.max(0, limit - results.length);
    if (remaining > 0) {
      const { data: b2b } = await supabase
        .from("productos_b2b")
        .select(
          "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,activo",
        )
        .or(`id_interno.ilike.${like},sku_base.ilike.${like}`)
        .limit(remaining);
      for (const row of b2b ?? []) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        if (r.activo === false) continue;
        const id = s(r.id);
        if (!id) continue;
        const dg = r.datos_generales;
        const vars_ = r.variantes;
        const scales = extractPublicScales(vars_); // sólo si públicamente disponibles en variantes
        results.push({
          source: "b2b",
          ref_id: id,
          id_interno: s(r.id_interno),
          sku_base: s(r.sku_base),
          nombre: extractName(dg, s(r.id_interno)),
          descripcion: extractDescription(dg),
          categoria: s(r.categoria_principal),
          imagen_url: extractImage(r.imagenes),
          precio_desde_mxn: null, // b2b no expone precio público de forma directa
          color_default: extractDefaultColor(vars_),
          unidad: extractUnit(dg),
          scales,
          has_scales: scales.length > 0,
        });
      }
    }
  } catch (e) {
    console.warn("[product-lookup] productos_b2b search failed", e);
  }

  return results;
}
