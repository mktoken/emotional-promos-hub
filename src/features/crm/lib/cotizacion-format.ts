// Whitelist-only helpers to safely surface data from cotizaciones_leads
// WITHOUT exposing proveedor, costos, márgenes, raw_payload ni provider_sku.

export interface ClienteData {
  nombre?: string | null;
  empresa?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  ciudad?: string | null;
  notas?: string | null;
}

const CLIENT_KEYS: Record<keyof ClienteData, string[]> = {
  nombre: ["nombre", "name", "full_name", "contact_name", "contacto"],
  empresa: ["empresa", "company", "company_name", "razon_social"],
  email: ["email", "correo", "mail"],
  telefono: ["telefono", "phone", "tel"],
  whatsapp: ["whatsapp", "wa", "whats"],
  ciudad: ["ciudad", "city"],
  notas: ["notas", "notes", "mensaje", "message", "comentarios"],
};

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return null;
}

export function parseCliente(raw: unknown): ClienteData {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    nombre: pick(obj, CLIENT_KEYS.nombre),
    empresa: pick(obj, CLIENT_KEYS.empresa),
    email: pick(obj, CLIENT_KEYS.email),
    telefono: pick(obj, CLIENT_KEYS.telefono),
    whatsapp: pick(obj, CLIENT_KEYS.whatsapp),
    ciudad: pick(obj, CLIENT_KEYS.ciudad),
    notas: pick(obj, CLIENT_KEYS.notas),
  };
}

export interface ArticuloSafe {
  nombre: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  subtotal: number | null;
  personalizacion: string | null;
  imagen_url: string | null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.trim() === "" ? null : s;
}

export function parseArticulos(raw: unknown): ArticuloSafe[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((item) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const personalizacionRaw =
      o["personalizacion"] ?? o["personalization"] ?? o["opciones"] ?? o["options"];
    let personalizacion: string | null = null;
    if (personalizacionRaw && typeof personalizacionRaw === "object") {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(personalizacionRaw as Record<string, unknown>)) {
        if (v === null || v === undefined || v === "") continue;
        if (typeof v === "object") continue;
        parts.push(`${k}: ${String(v)}`);
      }
      personalizacion = parts.length ? parts.join(" · ") : null;
    } else {
      personalizacion = toStr(personalizacionRaw);
    }
    return {
      nombre: toStr(o["nombre"] ?? o["name"] ?? o["titulo"] ?? o["title"]),
      cantidad: toNum(o["cantidad"] ?? o["quantity"] ?? o["qty"]),
      precio_unitario: toNum(
        o["precio_unitario"] ?? o["price"] ?? o["unit_price"] ?? o["precio"],
      ),
      subtotal: toNum(o["subtotal"] ?? o["total"] ?? o["importe"]),
      personalizacion,
      imagen_url: toStr(o["imagen_url"] ?? o["image"] ?? o["image_url"] ?? o["imagen"]),
    };
  });
}

export function digits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatShortDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}
