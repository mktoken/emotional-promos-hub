import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PublicPriceQuote } from "@/features/catalog/lib/public-product-price";

/**
 * Adaptador de envío de solicitud de cotización.
 * Autoridad total del backend: el cliente nunca envía precios, totales ni estados.
 */

export type QuoteFormat = "individual" | "kit";

export const QUOTE_FORMATS: readonly QuoteFormat[] = ["individual", "kit"];

export function isQuoteFormat(value: unknown): value is QuoteFormat {
  return value === "individual" || value === "kit";
}

export interface QuoteContact {
  name: string;
  company: string;
  email: string;
  phone: string;
}

export interface QuoteRequestItemColor {
  name?: string;
  label?: string;
}

export interface QuoteRequestItemPersonalization {
  type?: string;
  label?: string;
  message?: string;
  requires_review?: boolean;
}

export interface QuoteRequestItem {
  product_id: string;
  quantity: number;
  color?: string | QuoteRequestItemColor;
  personalization?: QuoteRequestItemPersonalization;
}

export interface QuoteSubmissionResult {
  quoteId: string;
  reused: boolean;
  pricingMode: string;
  totalEstimated: number | null;
  itemCount: number;
  requestQuoteItemCount: number;
}

export type ContactField = keyof QuoteContact;

export type ContactErrors = Partial<Record<ContactField, string>>;

export const CONTACT_FIELD_ORDER: readonly ContactField[] = ["name", "company", "email", "phone"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Validación cliente coherente con el backend (el backend sigue siendo la autoridad). */
export function validateContact(contact: QuoteContact): ContactErrors {
  const errors: ContactErrors = {};
  const name = contact.name.trim();
  const company = contact.company.trim();
  const email = contact.email.trim();
  const phoneDigits = digitsOnly(contact.phone);

  if (name.length < 2 || name.length > 120) errors.name = "Ingresa un nombre válido (2 a 120 caracteres).";
  if (company.length < 2 || company.length > 160) errors.company = "Ingresa una empresa válida (2 a 160 caracteres).";
  if (!EMAIL_PATTERN.test(email) || email.length > 255) errors.email = "Ingresa un correo válido.";
  if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = "Ingresa un teléfono válido (10 a 15 dígitos).";

  return errors;
}

export function buildQuoteContact(contact: QuoteContact): QuoteContact {
  return {
    name: contact.name.trim(),
    company: contact.company.trim(),
    email: contact.email.trim(),
    phone: contact.phone.trim(),
  };
}

/** Estados que impiden enviar la solicitud. */
export function isBlockingPriceStatus(quote: PublicPriceQuote | null): boolean {
  if (!quote) return false;
  return quote.status === "below_minimum" || quote.status === "unavailable";
}

export interface SubmitQuoteRequestArgs {
  requestId: string;
  contact: QuoteContact;
  quoteFormat: QuoteFormat;
  items: QuoteRequestItem[];
}

export type QuoteSubmissionErrorKind =
  | "rate_limit_exceeded"
  | "product_below_minimum"
  | "product_unavailable"
  | "idempotency_key_conflict"
  | "invalid_contact_name"
  | "invalid_contact_company"
  | "invalid_contact_email"
  | "invalid_contact_phone"
  | "invalid_quote_format"
  | "items_count_out_of_range"
  | "invalid_quantity"
  | "network"
  | "unknown";

const ERROR_MESSAGES: Record<QuoteSubmissionErrorKind, string> = {
  rate_limit_exceeded:
    "Has enviado varias solicitudes recientemente. Espera unos minutos antes de intentarlo de nuevo.",
  product_below_minimum:
    "Uno de los productos requiere una cantidad mínima mayor. Revisa los productos seleccionados.",
  product_unavailable: "Uno de los productos ya no está disponible para cotización.",
  idempotency_key_conflict: "La solicitud cambió desde el intento anterior. Revisa los datos y vuelve a enviarla.",
  invalid_contact_name: "Ingresa un nombre válido.",
  invalid_contact_company: "Ingresa una empresa válida.",
  invalid_contact_email: "Ingresa un correo válido.",
  invalid_contact_phone: "Ingresa un teléfono válido.",
  invalid_quote_format: "Selecciona un formato de cotización válido.",
  items_count_out_of_range: "Selecciona entre 1 y 50 productos.",
  invalid_quantity: "Revisa las cantidades seleccionadas.",
  network: "Verifica tu conexión y vuelve a intentarlo.",
  unknown: "No pudimos enviar la solicitud. Inténtalo nuevamente.",
};

const ERROR_KINDS: readonly QuoteSubmissionErrorKind[] = [
  "rate_limit_exceeded",
  "product_below_minimum",
  "product_unavailable",
  "idempotency_key_conflict",
  "invalid_contact_name",
  "invalid_contact_company",
  "invalid_contact_email",
  "invalid_contact_phone",
  "invalid_quote_format",
  "items_count_out_of_range",
  "invalid_quantity",
];

export class QuoteSubmissionError extends Error {
  readonly kind: QuoteSubmissionErrorKind;
  readonly userMessage: string;

  constructor(kind: QuoteSubmissionErrorKind) {
    super(kind);
    this.name = "QuoteSubmissionError";
    this.kind = kind;
    this.userMessage = ERROR_MESSAGES[kind];
  }
}

/** El reintento automático nunca aplica a validaciones, rate limit ni bloqueos. */
export function isRetriableErrorKind(kind: QuoteSubmissionErrorKind): boolean {
  return kind === "network" || kind === "unknown";
}

function classifyRawError(raw: string): QuoteSubmissionErrorKind {
  const normalized = raw.toLowerCase();
  const match = ERROR_KINDS.find((kind) => normalized.includes(kind));
  if (match) return match;
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("timeout")
  ) {
    return "network";
  }
  return "unknown";
}

export function toQuoteSubmissionError(error: unknown): QuoteSubmissionError {
  if (error instanceof QuoteSubmissionError) return error;
  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const raw = [record.message, record.details, record.hint, record.code]
      .filter((part): part is string => typeof part === "string")
      .join(" ");
    if (raw) return new QuoteSubmissionError(classifyRawError(raw));
  }
  if (typeof error === "string") return new QuoteSubmissionError(classifyRawError(error));
  return new QuoteSubmissionError("unknown");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSubmissionRow(row: unknown): QuoteSubmissionResult {
  if (!isRecord(row) || typeof row.quote_id !== "string" || row.quote_id.length === 0) {
    throw new QuoteSubmissionError("unknown");
  }
  return {
    quoteId: row.quote_id,
    reused: row.reused === true,
    pricingMode: typeof row.pricing_mode === "string" ? row.pricing_mode : "unknown",
    totalEstimated: readNullableNumber(row.total_estimated),
    itemCount: readNullableNumber(row.item_count) ?? 0,
    requestQuoteItemCount: readNullableNumber(row.request_quote_item_count) ?? 0,
  };
}

export async function submitPublicQuoteRequest(args: SubmitQuoteRequestArgs): Promise<QuoteSubmissionResult> {
  if (!isQuoteFormat(args.quoteFormat)) {
    throw new QuoteSubmissionError("invalid_quote_format");
  }
  if (args.items.length < 1 || args.items.length > 50) {
    throw new QuoteSubmissionError("items_count_out_of_range");
  }
  if (args.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1_000_000)) {
    throw new QuoteSubmissionError("invalid_quantity");
  }

  let data: unknown;
  let error: unknown;
  try {
    const response = await supabase.rpc("submit_public_quote_request", {
      p_request_id: args.requestId,
      p_contact: buildQuoteContact(args.contact) as unknown as Json,
      p_quote_format: args.quoteFormat,
      p_items: args.items as unknown as Json,
    });
    data = response.data;
    error = response.error;
  } catch (thrown) {
    throw toQuoteSubmissionError(thrown);
  }

  if (error) {
    throw toQuoteSubmissionError(error);
  }

  const rows: unknown[] = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    throw new QuoteSubmissionError("unknown");
  }

  return normalizeSubmissionRow(rows[0]);
}
