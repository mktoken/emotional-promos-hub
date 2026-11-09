export type NormalizedAssistantCapture = {
  requestId: string;
  turnstileToken: string;
  captured: Record<string, string | number | boolean | null>;
  messages: Array<{ role: "visitor" | "assistant"; message: string }>;
  summary: string;
  budgetRange: BudgetRange;
  fingerprintPayload: {
    captured: Record<string, string | number | boolean | null>;
    messages: Array<{ role: "visitor" | "assistant"; message: string }>;
    privacy_version: string;
  };
};

export class AssistantCaptureContractError extends Error {
  constructor(
    public readonly code:
      | "invalid_request"
      | "privacy_consent_required"
      | "turnstile_token_required"
      | "contact_required"
      | "honeypot_triggered",
  ) {
    super(code);
    this.name = "AssistantCaptureContractError";
  }
}

export const PRIVACY_VERSION = "PE-PRIVACY-V1";
export const MAX_BODY_BYTES = 20_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CAPTURE_KEYS = new Set([
  "intent",
  "product_interest",
  "sku_or_key",
  "wants_proposals",
  "quantity",
  "customization_required",
  "customization_method",
  "has_logo_or_artwork",
  "event_date",
  "delivery_city",
  "delivery_state",
  "use_case",
  "budget_total",
  "contact_name",
  "company_name",
  "whatsapp",
  "email",
  "comments",
]);
const INTENTS = [
  "producto_especifico",
  "propuestas",
  "evento",
  "regalo_corporativo",
  "onboarding",
  "otro",
];
const CUSTOMIZATION_METHODS = [
  "serigrafia",
  "tampografia",
  "sublimacion",
  "grabado_laser",
  "bordado",
  "full_color",
  "por_definir",
];
const USE_CASES = [
  "evento",
  "campana",
  "clientes",
  "empleados",
  "regalo_corporativo",
  "lanzamiento",
  "comunicacion_interna",
];

type BudgetRange =
  | "menos_10000"
  | "10000_30000"
  | "30000_75000"
  | "75000_150000"
  | "mas_150000"
  | "por_definir";

function invalid(): never {
  throw new AssistantCaptureContractError("invalid_request");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | null {
  const value = input[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maxLength) invalid();
  const normalized = value.replace(/\s+/g, " ").trim();
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) invalid();
  if (normalized.length > maxLength) invalid();
  return normalized || null;
}

function readEnum(
  input: Record<string, unknown>,
  key: string,
  allowed: string[],
): string | null {
  const value = readText(input, key, 80);
  if (value === null) return null;
  if (!allowed.includes(value)) invalid();
  return value;
}

function readBoolean(input: Record<string, unknown>, key: string): boolean | null {
  const value = input[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") invalid();
  return value;
}

function readQuantity(input: Record<string, unknown>): number | null {
  const value = input.quantity;
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) invalid();
    if (value < 1 || value > 1_000_000) invalid();
    return value;
  }
  if (typeof value !== "string" || !/^\d{1,7}$/.test(value.trim())) invalid();
  const quantity = Number(value.trim());
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000) invalid();
  return quantity;
}

function readDate(input: Record<string, unknown>): string | null {
  const value = readText(input, "event_date", 10);
  if (!value) return null;
  if (!DATE_RE.test(value)) invalid();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid();
  return value;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) invalid();
  return digits;
}

function sanitizeProductInterest(value: string | null): string | null {
  if (!value) return null;
  let result = value.toLowerCase();
  result = result.replace(
    /\b(hola|buenas|buen d[ií]a|quiero|quisiera|necesito|busco|me interesa(?:n)?|me gustar[ií]a|para|por\s*favor|cotizar|cotizaci[oó]n|gracias)\b/g,
    " ",
  );
  result = result.replace(/\$?\s*\d+(?:[.,]\d+)?\s*(k|mil(?:es)?|pzs?|piezas?|unidades?|mxn|pesos?)?/g, " ");
  result = result.replace(
    /\b(evento|campa[nñ]a|entrega|fecha|hoy|ma[nñ]ana|semana|mes|cdmx|edomex|m[eé]xico|guadalajara|monterrey)\b/g,
    " ",
  );
  result = (result.split(/[,.;\n]|(?:\s-\s)/)[0] ?? result).replace(/\s+/g, " ").trim();
  if (!result) return value.slice(0, 120);
  return `${result.charAt(0).toUpperCase()}${result.slice(1)}`.slice(0, 120);
}

function inferBudgetRange(value: string | null): BudgetRange {
  if (!value) return "por_definir";
  const raw = value.toLowerCase();
  if (/(por\s*definir|no\s*s[eé]|sin\s*presupuesto|no\s*tengo|n\/?a)/.test(raw)) {
    return "por_definir";
  }
  const regex = /(\d+(?:[.,]\d+)?)\s*(k|mil(?:es)?)?/gi;
  const amounts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const number = Number.parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isFinite(number)) continue;
    const suffix = (match[2] ?? "").toLowerCase();
    amounts.push(number * (suffix === "k" || suffix.startsWith("mil") ? 1_000 : 1));
  }
  if (!amounts.length) return "por_definir";
  const amount = Math.max(...amounts);
  if (amount <= 0) return "por_definir";
  if (amount < 10_000) return "menos_10000";
  if (amount <= 30_000) return "10000_30000";
  if (amount <= 75_000) return "30000_75000";
  if (amount <= 150_000) return "75000_150000";
  return "mas_150000";
}

function normalizeMessages(value: unknown): Array<{ role: "visitor" | "assistant"; message: string }> {
  if (!Array.isArray(value) || value.length > 50) invalid();
  let totalLength = 0;
  return value.map((entry) => {
    if (!isRecord(entry) || Object.keys(entry).some((key) => !["role", "message"].includes(key))) {
      invalid();
    }
    if (entry.role !== "assistant" && entry.role !== "user") invalid();
    if (typeof entry.message !== "string" || entry.message.length > 500) invalid();
    const message = entry.message.replace(/\s+/g, " ").trim();
    if (!message || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)) invalid();
    totalLength += message.length;
    if (totalLength > 10_000) invalid();
    return { role: entry.role === "user" ? "visitor" : "assistant", message };
  });
}

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

function buildSafeSummary(captured: Record<string, string | number | boolean | null>): string {
  const lines = ["Solicitud capturada desde asistente virtual:"];
  for (const [key, value] of Object.entries(captured)) {
    if (value === null || value === "") continue;
    const displayValue = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
    lines.push(`• ${LABELS[key]}: ${displayValue}`);
  }
  return lines.join("\n");
}

export function normalizeAssistantCaptureInput(input: unknown): NormalizedAssistantCapture {
  if (!isRecord(input)) invalid();
  if (Object.keys(input).some((key) => !["request_id", "privacy_consent", "honeypot", "captured", "messages", "turnstile_token"].includes(key))) invalid();

  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    invalid();
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_BODY_BYTES) invalid();

  const requestId = input.request_id;
  if (typeof requestId !== "string" || !UUID_RE.test(requestId.trim())) invalid();
  if (input.privacy_consent !== true) {
    throw new AssistantCaptureContractError("privacy_consent_required");
  }
  const turnstileToken = input.turnstile_token;
  if (
    typeof turnstileToken !== "string" ||
    !turnstileToken.trim() ||
    turnstileToken.length > 2_048 ||
    turnstileToken !== turnstileToken.trim()
  ) {
    throw new AssistantCaptureContractError("turnstile_token_required");
  }
  const honeypot = input.honeypot;
  if (honeypot !== undefined && honeypot !== null && (typeof honeypot !== "string" || honeypot.trim())) {
    throw new AssistantCaptureContractError("honeypot_triggered");
  }

  if (!isRecord(input.captured) || Object.keys(input.captured).some((key) => !CAPTURE_KEYS.has(key))) invalid();
  const raw = input.captured;
  const contactName = readText(raw, "contact_name", 120);
  const email = readText(raw, "email", 254)?.toLowerCase() ?? null;
  const whatsappRaw = readText(raw, "whatsapp", 40);
  const whatsapp = normalizePhone(whatsappRaw);
  if (!contactName || contactName.length < 2) invalid();
  if (email && (email.length < 5 || !EMAIL_RE.test(email))) invalid();
  if (!email && !whatsapp) throw new AssistantCaptureContractError("contact_required");

  const captured: Record<string, string | number | boolean | null> = {
    intent: readEnum(raw, "intent", INTENTS),
    product_interest: sanitizeProductInterest(readText(raw, "product_interest", 240)),
    sku_or_key: readText(raw, "sku_or_key", 100),
    wants_proposals: readBoolean(raw, "wants_proposals"),
    quantity: readQuantity(raw),
    customization_required: readBoolean(raw, "customization_required"),
    customization_method: readEnum(raw, "customization_method", CUSTOMIZATION_METHODS),
    has_logo_or_artwork: readBoolean(raw, "has_logo_or_artwork"),
    event_date: readDate(raw),
    delivery_city: readText(raw, "delivery_city", 80),
    delivery_state: readText(raw, "delivery_state", 80),
    use_case: readEnum(raw, "use_case", USE_CASES),
    budget_total: readText(raw, "budget_total", 160),
    contact_name: contactName,
    company_name: readText(raw, "company_name", 160),
    whatsapp,
    email,
    comments: readText(raw, "comments", 1_000),
  };
  const messages = normalizeMessages(input.messages);
  const requestIdNormalized = requestId.trim().toLowerCase();
  const fingerprintPayload = { captured, messages, privacy_version: PRIVACY_VERSION };

  return {
    requestId: requestIdNormalized,
    turnstileToken,
    captured,
    messages,
    summary: buildSafeSummary(captured),
    budgetRange: inferBudgetRange(captured.budget_total as string | null),
    fingerprintPayload,
  };
}

export async function createAssistantCaptureFingerprint(
  normalized: NormalizedAssistantCapture,
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(normalized.fingerprintPayload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
