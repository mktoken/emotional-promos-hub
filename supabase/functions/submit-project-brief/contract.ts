export type SubmitProjectBriefInput = Record<string, unknown>;

export type NormalizedProjectBrief = {
  requestId: string;
  email: string | null;
  phone: string | null;
  privacyConsent: true;
  datosCliente: Record<string, unknown>;
  fingerprintPayload: Record<string, unknown>;
};

export class ProjectBriefContractError extends Error {
  constructor(
    public readonly code:
      | "invalid_request"
      | "privacy_consent_required"
      | "contact_required"
      | "honeypot_triggered"
      | "attachments_not_supported",
  ) {
    super(code);
    this.name = "ProjectBriefContractError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAYLOAD_CHARS = 20_000;

function invalid(): never {
  throw new ProjectBriefContractError("invalid_request");
}

function readOptionalString(
  input: SubmitProjectBriefInput,
  keys: string[],
  maxLength: number,
): string | null {
  const key = keys.find((candidate) => input[candidate] !== undefined && input[candidate] !== null);
  if (!key) return null;
  if (typeof input[key] !== "string") invalid();
  const value = input[key].trim();
  if (value.length > maxLength) invalid();
  return value || null;
}

function readBoolean(input: SubmitProjectBriefInput, key: string, fallback: boolean): boolean {
  if (input[key] === undefined || input[key] === null) return fallback;
  if (typeof input[key] !== "boolean") invalid();
  return input[key] as boolean;
}

function readQuantity(input: SubmitProjectBriefInput): number | null {
  const raw = input.quantity;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isInteger(raw)) invalid();
    return raw;
  }
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) invalid();
  const quantity = Number(raw.trim());
  if (!Number.isSafeInteger(quantity)) invalid();
  return quantity;
}

function readDate(input: SubmitProjectBriefInput): string | null {
  const date = readOptionalString(input, ["target_date", "date"], 10);
  if (!date) return null;
  if (!DATE_RE.test(date)) invalid();
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) invalid();
  return date;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) invalid();
  return digits;
}

export function normalizeProjectBriefInput(input: unknown): NormalizedProjectBrief {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const body = input as SubmitProjectBriefInput;

  let payloadSize = 0;
  try {
    payloadSize = JSON.stringify(body).length;
  } catch {
    invalid();
  }
  if (payloadSize > MAX_PAYLOAD_CHARS) invalid();

  const requestId = body.request_id;
  if (typeof requestId !== "string" || !UUID_RE.test(requestId.trim())) invalid();

  if (body.privacy_consent !== true) {
    throw new ProjectBriefContractError("privacy_consent_required");
  }

  const honeypot = body.honeypot;
  if (honeypot !== undefined && honeypot !== null) {
    if (typeof honeypot !== "string" || honeypot.trim()) {
      throw new ProjectBriefContractError("honeypot_triggered");
    }
  }

  if (body.attachments !== undefined && body.attachments !== null) {
    if (!Array.isArray(body.attachments) || body.attachments.length > 0) {
      throw new ProjectBriefContractError("attachments_not_supported");
    }
  }

  const projectObjective = readOptionalString(
    body,
    ["project_objective", "objective", "necesidad"],
    1000,
  );
  const contactName = readOptionalString(body, ["contact_name", "nombre"], 120);
  const company = readOptionalString(body, ["company", "empresa"], 160);
  const email = readOptionalString(body, ["email"], 254)?.toLowerCase() ?? null;
  const phone = normalizePhone(readOptionalString(body, ["phone"], 40));
  const audience = readOptionalString(body, ["audience"], 500);
  const occasion = readOptionalString(body, ["occasion"], 300);
  const budget = readOptionalString(body, ["budget"], 160);
  const city = readOptionalString(body, ["city"], 160);
  const productInterest = readOptionalString(body, ["product_interest"], 300);
  const personalization = readOptionalString(body, ["personalization"], 500);
  const comments = readOptionalString(body, ["comments", "notes"], 2000);
  const quantityUnknown = readBoolean(body, "quantity_unknown", false);
  const targetDateUnknown = readBoolean(body, "target_date_unknown", false);
  const companyNotApplicable = readBoolean(body, "company_not_applicable", false);
  const quantity = readQuantity(body);
  const targetDate = readDate(body);

  if (!projectObjective || !contactName || (projectObjective.length < 1 || contactName.length < 2)) invalid();
  if (email && (email.length < 5 || !EMAIL_RE.test(email))) invalid();
  if (!email && !phone) {
    throw new ProjectBriefContractError("contact_required");
  }
  if (quantityUnknown && quantity !== null) invalid();
  if (!quantityUnknown && (quantity === null || quantity <= 0 || quantity > 1_000_000)) invalid();
  if (targetDateUnknown && targetDate !== null) invalid();
  if (!targetDateUnknown && targetDate === null) invalid();

  const normalizedData: Record<string, unknown> = {
    source: "route_b",
    project_objective: projectObjective,
    contact_name: contactName,
    quantity,
    quantity_unknown: quantityUnknown,
    target_date: targetDate,
    target_date_unknown: targetDateUnknown,
    company: companyNotApplicable ? null : company,
    company_not_applicable: companyNotApplicable,
    occasion,
    audience,
    budget,
    city,
    product_interest: productInterest,
    personalization,
    comments,
    email,
    phone,
  };

  return {
    requestId: requestId.trim().toLowerCase(),
    email,
    phone,
    privacyConsent: true,
    datosCliente: normalizedData,
    fingerprintPayload: {
      ...normalizedData,
      privacy_consent: true,
    },
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createProjectBriefFingerprint(
  normalized: NormalizedProjectBrief,
): Promise<string> {
  const encoded = new TextEncoder().encode(stableStringify(normalized.fingerprintPayload));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest)).slice(0, 32);
}

export function mapRpcError(error: unknown): { status: number; error: string } {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error ?? "");

  if (message.includes("privacy_not_active")) return { status: 503, error: "privacy_not_active" };
  if (message.includes("idempotency_key_conflict")) return { status: 409, error: "idempotency_conflict" };
  if (message.includes("rate_limit_exceeded")) return { status: 429, error: "rate_limit_exceeded" };
  if (/request_id_required|invalid_request_fingerprint|contact_required|invalid_contact_|privacy_consent_required|datos_cliente_must_be_object/.test(message)) {
    return { status: 400, error: "invalid_request" };
  }
  return { status: 500, error: "submission_failed" };
}
