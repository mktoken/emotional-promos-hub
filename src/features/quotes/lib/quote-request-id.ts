/**
 * Idempotencia de la solicitud de cotización.
 * Un `request_id` vive en memoria mientras el payload lógico no cambie.
 * Nunca se usan timestamps ni se persiste PII.
 */

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function computePayloadFingerprint(payload: unknown): string {
  return stableStringify(payload);
}

export class QuoteRequestIdManager {
  private fingerprint: string | null = null;
  private requestId: string | null = null;

  /** Devuelve el mismo id mientras el payload no cambie; genera uno nuevo si cambió. */
  getOrCreate(fingerprint: string): string {
    if (this.requestId !== null && this.fingerprint === fingerprint) {
      return this.requestId;
    }
    this.fingerprint = fingerprint;
    this.requestId = crypto.randomUUID();
    return this.requestId;
  }

  peek(): string | null {
    return this.requestId;
  }

  clear(): void {
    this.fingerprint = null;
    this.requestId = null;
  }
}
