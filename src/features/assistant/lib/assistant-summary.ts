import type { CapturedData } from "./assistant-flow";

const LABELS: Record<string, string> = {
  intent: "Intención",
  product_interest: "Producto",
  sku_or_key: "SKU/Clave",
  wants_proposals: "Quiere propuestas",
  quantity: "Cantidad",
  customization_required: "Personalización",
  customization_method: "Técnica",
  has_logo_or_artwork: "Cuenta con logo/arte",
  event_date: "Fecha de entrega",
  delivery_city: "Ciudad",
  delivery_state: "Estado",
  use_case: "Uso",
  budget_total: "Presupuesto",
  contact_name: "Contacto",
  company_name: "Empresa",
  whatsapp: "WhatsApp",
  email: "Email",
  comments: "Comentarios",
};

function fmtVal(v: unknown): string {
  if (v === true) return "Sí";
  if (v === false) return "No";
  return String(v);
}

export function buildSummary(data: CapturedData): string {
  const lines: string[] = ["Solicitud capturada desde asistente virtual:"];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    const label = LABELS[k] ?? k;
    lines.push(`• ${label}: ${fmtVal(v)}`);
  }
  return lines.join("\n");
}
