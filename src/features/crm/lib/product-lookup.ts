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
    const normalized = v.replace(/[$,\s]/g, "");
    const p = Number(normalized);
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

function s(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function norm(v: unknown): string {
  return (s(v) ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractImage(imgs: unknown): string | null {
  if (!imgs) return null;
  if (Array.isArray(imgs)) {
    for (const x of imgs) {
      if (typeof x === "string" && x.trim()) return x.trim();
      if (x && typeof x === "object") {
        const obj = x as Record<string, unknown>;
        const u = s(obj.url) ?? s(obj.src) ?? s(obj.imagen) ?? s(obj.href) ?? s(obj.imagen_url);
        if (u) return u;
      }
    }
  }
  if (typeof imgs === "object") {
    const obj = imgs as Record<string, unknown>;
    return s(obj.url) ?? s(obj.src) ?? s(obj.principal) ?? s(obj.imagen_url) ?? null;
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
      s(obj.product_name) ??
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
      s(obj.description) ??
      null
    );
  }
  return null;
}

function extractUnit(dg: unknown): string | null {
  if (dg && typeof dg === "object") {
    const obj = dg as Record<string, unknown>;
    return s(obj.unidad) ?? s(obj.unidad_medida) ?? s(obj.unit) ?? null;
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

const MIN_KEYS = ["min_qty", "min", "desde", "cantidad_minima", "qty_min", "rango_desde"];
const MAX_KEYS = ["max_qty", "max", "hasta", "cantidad_maxima", "qty_max", "rango_hasta"];
const SAFE_PRICE_KEYS = [
  "unit_price_mxn",
  "precio_unitario_mxn",
  "precio_unitario",
  "precio_venta_mxn",
  "precio_venta",
  "precio_publico_mxn",
  "precio_publico",
  "precio_lista_mxn",
  "precio_lista",
  "precio_mxn",
  "precio",
  "price",
  "sale_price",
];

function firstNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = n(obj[k]);
    if (v != null) return v;
  }
  return null;
}

function collectScales(value: unknown, out: SafeProductMatch["scales"], depth = 0) {
  if (depth > 5 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectScales(item, out, depth + 1);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;

  const min = firstNumber(obj, MIN_KEYS);
  const max = firstNumber(obj, MAX_KEYS);
  const unit = firstNumber(obj, SAFE_PRICE_KEYS);

  if (min != null && unit != null && unit > 0) {
    out.push({ min_qty: min, max_qty: max, unit_price_mxn: unit });
  }

  // Recorrer estructuras comunes, sin leer campos de costo/proveedor.
  for (const key of ["escalas", "precio_escalas", "precios", "tiers", "rango_precios", "variantes"]) {
    if (key in obj) collectScales(obj[key], out, depth + 1);
  }
}

// Extrae escalas seguras (unit_price_mxn) desde variantes/datos públicos si existen.
// Nunca usa claves de costo: cost, costeo, costo, unit_cost, margen, proveedor.
function extractPublicScales(...values: unknown[]): SafeProductMatch["scales"] {
  const out: SafeProductMatch["scales"] = [];
  for (const v of values) collectScales(v, out);

  const dedup = new Map<string, SafeProductMatch["scales"][number]>();
  for (const sc of out) {
    if (sc.min_qty <= 0 || sc.unit_price_mxn <= 0) continue;
    dedup.set(`${sc.min_qty}-${sc.max_qty ?? ""}-${sc.unit_price_mxn}`, sc);
  }
  return Array.from(dedup.values()).sort((a, b) => a.min_qty - b.min_qty);
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

function rowToSafeMatch(source: ProductLookupSource, row: Record<string, unknown>): SafeProductMatch | null {
  const id = s(row.id);
  if (!id) return null;
  const dg = row.datos_generales;
  const vars_ = row.variantes;
  const scales = extractPublicScales(vars_, dg);
  const precioDesde = n(row.precio_desde_mxn);

  return {
    source,
    ref_id: id,
    id_interno: s(row.id_interno),
    sku_base: s(row.sku_base),
    nombre: extractName(dg, s(row.id_interno) ?? s(row.sku_base)),
    descripcion: extractDescription(dg),
    categoria: s(row.categoria_principal),
    imagen_url: extractImage(row.imagenes),
    precio_desde_mxn: precioDesde ?? scales[0]?.unit_price_mxn ?? null,
    color_default: extractDefaultColor(vars_),
    unidad: extractUnit(dg) ?? "PZA",
    scales,
    has_scales: scales.length > 0,
  };
}

function matchSearchText(row: Record<string, unknown>, query: string): boolean {
  const qn = norm(query);
  if (!qn) return false;
  const dg =
    row.datos_generales && typeof row.datos_generales === "object"
      ? (row.datos_generales as Record<string, unknown>)
      : {};
  const values = [
    row.id_interno,
    row.sku_base,
    dg.nombre_comercial,
    dg.modelo_comercial,
    dg.nombre,
    dg.titulo,
    dg.modelo,
    dg.descripcion,
    dg.descripcion_comercial,
  ];
  return values.some((v) => {
    const vn = norm(v);
    return vn.length > 0 && (vn.includes(qn) || qn.includes(vn));
  });
}

export function isExactProductMatch(match: SafeProductMatch, query: string): boolean {
  const qn = norm(query);
  if (!qn) return false;
  return [match.id_interno, match.sku_base, match.nombre].some((v) => norm(v) === qn);
}

function dedupeMatches(matches: SafeProductMatch[]): SafeProductMatch[] {
  const seen = new Set<string>();
  const out: SafeProductMatch[] = [];
  for (const m of matches) {
    const key = `${m.source}-${m.ref_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

const FALLBACK_LIMIT = 100;
const IS_DEV = typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

function warnDev(scope: string, err: unknown) {
  if (IS_DEV) console.warn(`[product-lookup:${scope}]`, err);
}

async function searchPublicos(query: string, limit: number): Promise<SafeProductMatch[]> {
  const like = `%${query}%`;
  const fields = "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,precio_desde_mxn,updated_at";

  const results: SafeProductMatch[] = [];

  const { data, error } = await supabase
    .from("productos_publicos")
    .select(fields)
    .or(
      [
        `id_interno.ilike.${like}`,
        `sku_base.ilike.${like}`,
        `categoria_principal.ilike.${like}`,
        `datos_generales->>modelo_comercial.ilike.${like}`,
        `datos_generales->>nombre_comercial.ilike.${like}`,
        `datos_generales->>nombre.ilike.${like}`,
        `datos_generales->>modelo.ilike.${like}`,
        `datos_generales->>descripcion.ilike.${like}`,
      ].join(","),
    )
    .limit(Math.max(limit, 10));

  if (error) warnDev("publicos", error);
  else for (const row of data ?? []) {
    const m = rowToSafeMatch("publico", row as Record<string, unknown>);
    if (m) results.push(m);
  }

  if (results.length === 0 && query.length >= 3) {
    const { data: fallback, error: fErr } = await supabase
      .from("productos_publicos")
      .select(fields)
      .order("updated_at", { ascending: false })
      .limit(FALLBACK_LIMIT);
    if (fErr) warnDev("publicos_fallback", fErr);
    for (const row of fallback ?? []) {
      const r = row as Record<string, unknown>;
      if (!matchSearchText(r, query)) continue;
      const m = rowToSafeMatch("publico", r);
      if (m) results.push(m);
      if (results.length >= limit) break;
    }
  }

  return dedupeMatches(results).slice(0, limit);
}

async function searchB2B(query: string, limit: number): Promise<SafeProductMatch[]> {
  const like = `%${query}%`;
  const fields = "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,updated_at";

  const results: SafeProductMatch[] = [];

  const { data, error } = await supabase
    .from("productos_b2b")
    .select(fields)
    .or(
      [
        `id_interno.ilike.${like}`,
        `sku_base.ilike.${like}`,
        `categoria_principal.ilike.${like}`,
        `datos_generales->>modelo_comercial.ilike.${like}`,
        `datos_generales->>nombre_comercial.ilike.${like}`,
        `datos_generales->>nombre.ilike.${like}`,
        `datos_generales->>modelo.ilike.${like}`,
        `datos_generales->>descripcion.ilike.${like}`,
      ].join(","),
    )
    .limit(Math.max(limit, 10));

  if (error) warnDev("b2b", error);
  else for (const row of data ?? []) {
    const m = rowToSafeMatch("b2b", row as Record<string, unknown>);
    if (m) results.push(m);
  }

  if (results.length === 0 && query.length >= 3) {
    const { data: fallback, error: fErr } = await supabase
      .from("productos_b2b")
      .select(fields)
      .order("updated_at", { ascending: false })
      .limit(FALLBACK_LIMIT);
    if (fErr) warnDev("b2b_fallback", fErr);
    for (const row of fallback ?? []) {
      const r = row as Record<string, unknown>;
      if (!matchSearchText(r, query)) continue;
      const m = rowToSafeMatch("b2b", r);
      if (m) results.push(m);
      if (results.length >= limit) break;
    }
  }

  return dedupeMatches(results).slice(0, limit);
}

// Búsqueda staff interna por payload de proveedor. Retorna sólo productos_b2b_id
// vinculados; luego se hidratan como SafeProductMatch desde productos_b2b (whitelist).
async function searchByProviderRaw(query: string, limit: number): Promise<string[]> {
  if (query.length < 2) return [];
  const like = `%${query}%`;
  const { data, error } = await supabase
    .from("provider_raw_products")
    .select("productos_b2b_id")
    .not("productos_b2b_id", "is", null)
    .or(
      [
        `provider_sku.ilike.${like}`,
        `nombre.ilike.${like}`,
        `descripcion.ilike.${like}`,
        `categoria.ilike.${like}`,
      ].join(","),
    )
    .limit(limit * 3);
  if (error) {
    warnDev("provider_raw", error);
    return [];
  }
  return ((data ?? []) as Array<{ productos_b2b_id: string | null }>)
    .map((r) => r.productos_b2b_id)
    .filter((v): v is string => !!v);
}

async function searchByProviderOfertas(query: string, limit: number): Promise<string[]> {
  if (query.length < 2) return [];
  const like = `%${query}%`;
  const { data, error } = await supabase
    .from("producto_proveedor_ofertas")
    .select("id")
    .or(
      [
        `variant_sku.ilike.${like}`,
        `modelo.ilike.${like}`,
        `color_nombre.ilike.${like}`,
        `material.ilike.${like}`,
      ].join(","),
    )
    .limit(limit * 3);
  if (error) {
    warnDev("ofertas", error);
    return [];
  }
  const ofertaIds = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ofertaIds.length === 0) return [];

  const { data: mapRows, error: mapErr } = await supabase
    .from("producto_b2b_oferta_map")
    .select("producto_b2b_id")
    .in("oferta_id", ofertaIds);
  if (mapErr) {
    warnDev("oferta_map", mapErr);
    return [];
  }
  return ((mapRows ?? []) as Array<{ producto_b2b_id: string | null }>)
    .map((r) => r.producto_b2b_id)
    .filter((v): v is string => !!v);
}

async function hydrateB2BByIds(ids: string[], limit: number): Promise<SafeProductMatch[]> {
  if (ids.length === 0) return [];
  const uniq = Array.from(new Set(ids)).slice(0, Math.max(limit * 2, 20));
  const fields = "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,updated_at";
  const { data, error } = await supabase.from("productos_b2b").select(fields).in("id", uniq);
  if (error) {
    warnDev("hydrate_b2b", error);
    return [];
  }
  const out: SafeProductMatch[] = [];
  for (const row of data ?? []) {
    const m = rowToSafeMatch("b2b", row as Record<string, unknown>);
    if (m) out.push(m);
  }
  return out;
}

/**
 * Busca un producto por clave/modelo/SKU en:
 *  1) productos_publicos (vista segura del catálogo)
 *  2) productos_b2b (sólo campos comerciales whitelisted)
 *  3) provider_raw_products + producto_proveedor_ofertas → productos_b2b
 * Devuelve como máximo `limit` resultados combinados. Nunca expone
 * provider_sku, raw_payload, costos, proveedor interno ni datos_logistica_b2b.
 */
export async function searchProductByClave(query: string, limit = 5): Promise<SafeProductMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [publicMatches, b2bMatches, rawIds, ofertaIds] = await Promise.all([
    searchPublicos(q, limit),
    searchB2B(q, limit),
    searchByProviderRaw(q, limit),
    searchByProviderOfertas(q, limit),
  ]);

  const providerMatches = await hydrateB2BByIds([...rawIds, ...ofertaIds], limit);

  const combined = dedupeMatches([...publicMatches, ...b2bMatches, ...providerMatches]);

  combined.sort((a, b) => {
    const exactA = isExactProductMatch(a, q) ? 0 : 1;
    const exactB = isExactProductMatch(b, q) ? 0 : 1;
    if (exactA !== exactB) return exactA - exactB;
    // Preferir la fuente pública (tiene precio comercial).
    const srcA = a.source === "publico" ? 0 : 1;
    const srcB = b.source === "publico" ? 0 : 1;
    if (srcA !== srcB) return srcA - srcB;
    const priceA = a.has_scales || (a.precio_desde_mxn ?? 0) > 0 ? 0 : 1;
    const priceB = b.has_scales || (b.precio_desde_mxn ?? 0) > 0 ? 0 : 1;
    if (priceA !== priceB) return priceA - priceB;
    return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
  });

  return combined.slice(0, limit);
}
