import { describe, expect, it } from "vitest";
import {
  createProjectBriefFingerprint,
  mapRpcError,
  normalizeProjectBriefInput,
} from "../../../../supabase/functions/submit-project-brief/contract";

const requestId = "11111111-1111-4111-8111-111111111111";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    request_id: requestId,
    privacy_consent: true,
    project_objective: "Regalos para evento anual",
    contact_name: "Ana",
    email: "ANA@EMPRESA.COM ",
    quantity: "100",
    quantity_unknown: false,
    target_date: "2026-12-01",
    target_date_unknown: false,
    company: "Empresa SA",
    audience: "Colaboradores",
    comments: "Revisar opciones",
    ...overrides,
  };
}

describe("Route B RB3-B server contract", () => {
  it("acepta un payload válido con email únicamente", () => {
    const result = normalizeProjectBriefInput(valid({ phone: undefined }));
    expect(result.email).toBe("ana@empresa.com");
    expect(result.phone).toBeNull();
  });

  it("acepta un payload válido con teléfono únicamente", () => {
    const result = normalizeProjectBriefInput(valid({ email: undefined, phone: "+52 55 3031 1686" }));
    expect(result.email).toBeNull();
    expect(result.phone).toBe("525530311686");
  });

  it("acepta ambos contactos", () => {
    const result = normalizeProjectBriefInput(valid({ phone: "55 3031 1686" }));
    expect(result.email).toBe("ana@empresa.com");
    expect(result.phone).toBe("5530311686");
  });

  it("rechaza la ausencia de ambos contactos", () => {
    expect(() => normalizeProjectBriefInput(valid({ email: undefined, phone: undefined }))).toThrow("contact_required");
  });

  it("rechaza consentimiento falso", () => {
    expect(() => normalizeProjectBriefInput(valid({ privacy_consent: false }))).toThrow("privacy_consent_required");
  });

  it("rechaza un request_id que no sea UUID", () => {
    expect(() => normalizeProjectBriefInput(valid({ request_id: "not-a-uuid" }))).toThrow("invalid_request");
  });

  it("rechaza honeypot con valor y no lo transforma en datos persistibles", () => {
    expect(() => normalizeProjectBriefInput(valid({ honeypot: "bot" }))).toThrow("honeypot_triggered");
  });

  it("normaliza texto, email y teléfono server-side", () => {
    const result = normalizeProjectBriefInput(valid({ project_objective: "  Evento  ", contact_name: " Ana ", email: " ANA@EMPRESA.COM " }));
    expect(result.datosCliente.project_objective).toBe("Evento");
    expect(result.datosCliente.contact_name).toBe("Ana");
    expect(result.email).toBe("ana@empresa.com");
  });

  it("preserva quantity_unknown sin convertirla en uno", () => {
    const result = normalizeProjectBriefInput(valid({ quantity: "", quantity_unknown: true }));
    expect(result.datosCliente.quantity).toBeNull();
    expect(result.datosCliente.quantity_unknown).toBe(true);
  });

  it("genera un fingerprint determinista de 32 caracteres", async () => {
    const first = normalizeProjectBriefInput(valid());
    const second = normalizeProjectBriefInput(valid());
    await expect(createProjectBriefFingerprint(first)).resolves.toHaveLength(32);
    await expect(createProjectBriefFingerprint(first)).resolves.toBe(await createProjectBriefFingerprint(second));
  });

  it("ignora metadata sensible controlada por el cliente", () => {
    const result = normalizeProjectBriefInput(valid({
      source: "attacker",
      public_submission: false,
      public_request_type: "quote",
      public_request_fingerprint: "attacker-fingerprint",
      email_hash: "attacker-email-hash",
      privacy_url: "https://attacker.invalid",
      marketing_consent: true,
      estado_cotizacion: "EMITIDA",
      assigned_to: "attacker",
    }));
    expect(result.datosCliente.source).toBe("route_b");
    expect(result.datosCliente).not.toHaveProperty("public_submission");
    expect(result.datosCliente).not.toHaveProperty("public_request_type");
    expect(result.datosCliente).not.toHaveProperty("public_request_fingerprint");
    expect(result.datosCliente).not.toHaveProperty("privacy_url");
    expect(result.datosCliente).not.toHaveProperty("marketing_consent");
    expect(result.datosCliente).not.toHaveProperty("estado_cotizacion");
    expect(result.datosCliente).not.toHaveProperty("assigned_to");
  });

  it("sanitiza el mapeo público de errores", () => {
    expect(mapRpcError({ message: "rate_limit_exceeded" })).toEqual({ status: 429, error: "rate_limit_exceeded" });
    expect(mapRpcError({ message: "privacy_not_active" })).toEqual({ status: 503, error: "privacy_not_active" });
    expect(mapRpcError({ message: "idempotency_key_conflict with internal detail" })).toEqual({ status: 409, error: "idempotency_conflict" });
    expect(mapRpcError({ message: "Bearer secret stack trace" })).toEqual({ status: 500, error: "submission_failed" });
  });
});
