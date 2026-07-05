// Mapea partidas del lead público a insertables en formal_quote_items.
// Sólo pasa campos whitelisted. No expone proveedor, costos, margen,
// raw_payload ni provider_sku.

import type { Database } from "@/integrations/supabase/types";

type ItemInsert = Omit<
  Database["public"]["Tables"]["formal_quote_items"]["Insert"],
  "formal_quote_id"
>;

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v : String(v);
  return s.trim() === "" ? null : s;
}
function toNum(v: unknown, def = 0): number {
  if (v === null || v === undefined || v === "") return def;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : def;
}

export function mapLeadArticulosToItems(raw: unknown): ItemInsert[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((it, idx) => {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const cantidad = Math.max(1, Math.round(toNum(o["cantidad"] ?? o["quantity"] ?? o["qty"], 1)));
    const precio = toNum(
      o["precio_unitario"] ?? o["unit_price"] ?? o["price"] ?? o["precio"],
      0,
    );
    const modelo =
      toStr(o["modelo_comercial"] ?? o["nombre"] ?? o["name"] ?? o["titulo"] ?? o["title"]) ??
      "Producto";
    const personalizacionRaw =
      o["personalizacion"] ?? o["personalization"] ?? o["opciones"] ?? o["options"] ?? {};
    const personalizacion =
      personalizacionRaw && typeof personalizacionRaw === "object"
        ? (personalizacionRaw as Record<string, unknown>)
        : {};

    return {
      position: idx + 1,
      source: "CATALOG",
      clave_producto: toStr(o["clave_producto"] ?? o["clave"]),
      modelo_comercial: modelo,
      descripcion: null,
      color: toStr(o["color"]),
      imagen_url: toStr(o["imagen_url"] ?? o["image"] ?? o["image_url"] ?? o["imagen"]),
      cantidad,
      unidad: "PZA",
      precio_unitario: precio,
      descuento_pct: 0,
      subtotal: 0,
      personalizacion,
      print_method: null,
      print_colors: null,
      setup_fee: 0,
      print_unit_price: 0,
      notes: null,
    } satisfies ItemInsert;
  });
}
