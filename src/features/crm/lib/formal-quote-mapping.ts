// Mapea partidas del lead público a insertables en formal_quote_items.
// Sólo pasa campos whitelisted. No expone proveedor, costos, margen,
// raw_payload, provider_sku ni provider_code.

import type { Database, Json } from "@/integrations/supabase/types";
import { calcItemSubtotal } from "@/features/crm/lib/formal-quote-calc";

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
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function toBoolOrNull(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return null;
}

export function mapLeadArticulosToItems(raw: unknown): ItemInsert[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((it, idx) => {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;

    const cantidad = Math.max(1, Math.round(toNum(o["cantidad"] ?? o["quantity"] ?? o["qty"], 1)));

    // precio_unitario_estimado tiene prioridad (viene del catálogo público)
    const precio = toNum(
      o["precio_unitario_estimado"] ??
        o["precio_unitario"] ??
        o["unit_price"] ??
        o["price"] ??
        o["precio"],
      0,
    );

    const modelo =
      toStr(o["modelo_comercial"] ?? o["nombre"] ?? o["name"] ?? o["titulo"] ?? o["title"]) ??
      "Producto";

    // Personalización solicitada: puede venir como string legible u objeto
    const personalizacionRaw = o["personalizacion"];
    const personalizacionSolicitada = (o["personalizacion_solicitada_cliente"] ?? null) as
      | Record<string, unknown>
      | null;
    const sugeridaEconomica = (o["personalizacion_sugerida_economica"] ?? null) as
      | Record<string, unknown>
      | null;

    const personalizacionLabel =
      typeof personalizacionRaw === "string"
        ? personalizacionRaw
        : toStr(
            personalizacionSolicitada && typeof personalizacionSolicitada === "object"
              ? (personalizacionSolicitada["label"] as unknown)
              : null,
          );

    const personalizacionTipo = toStr(
      (personalizacionSolicitada && (personalizacionSolicitada["tipo"] as unknown)) ??
        o["logo_format"],
    );

    // Precio y subtotal de referencia que vio el cliente (para comparar en CRM)
    const precioReferencia = toNumOrNull(o["precio_unitario_estimado"] ?? o["precio_unitario"]);
    const subtotalReferencia = toNumOrNull(o["subtotal"]);

    const personalizacion = {
      label: personalizacionLabel,
      tipo: personalizacionTipo,
      requiere_revision_tecnica: toBoolOrNull(o["requiere_revision_tecnica"]),
      publica: toStr(o["personalizacion_publica"]),
      sugerida_economica:
        sugeridaEconomica && typeof sugeridaEconomica === "object"
          ? {
              label: toStr(sugeridaEconomica["label"]),
              incluida: toBoolOrNull(sugeridaEconomica["incluida"]),
            }
          : null,
      compatibilidad: toStr(o["compatibilidad_personalizacion"]),
      material: toStr(o["material"]),
      logo_format: toStr(o["logo_format"]),
      entrega_estimada: toStr(o["entrega_estimada"]),
      muestra_virtual: toBoolOrNull(o["muestra_virtual"]),
      producto_id: (() => {
        const v = o["producto_id"];
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number" || typeof v === "string") return v;
        return null;
      })(),
      precio_referencia_cliente: precioReferencia,
      subtotal_referencia_cliente: subtotalReferencia,
    };

    // Calcular subtotal inicial (sin descuento ni impresión)
    const subtotal = calcItemSubtotal({
      cantidad,
      precio_unitario: precio,
      descuento_pct: 0,
      setup_fee: 0,
      print_unit_price: 0,
    });

    return {
      position: idx + 1,
      source: "CATALOG",
      clave_producto: toStr(o["clave_producto"] ?? o["clave"] ?? o["sku"]),
      modelo_comercial: modelo,
      descripcion: null,
      color: toStr(o["color"]),
      imagen_url: toStr(o["imagen_url"] ?? o["image"] ?? o["image_url"] ?? o["imagen"]),
      cantidad,
      unidad: "PZA",
      precio_unitario: precio,
      descuento_pct: 0,
      subtotal,
      personalizacion: personalizacion as unknown as Json,
      print_method: null,
      print_colors: null,
      setup_fee: 0,
      print_unit_price: 0,
      notes: null,
    } satisfies ItemInsert;
  });
}
