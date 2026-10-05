import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSubmitProjectBriefPayload,
  emptyBrief,
  validateBrief,
  type ProjectBriefDraft,
} from "./project-brief";

const valid = (o: Partial<ProjectBriefDraft> = {}): ProjectBriefDraft => ({
  ...emptyBrief(),
  project_objective: "Regalos para evento anual",
  contact_name: "Ana",
  email: "ana@empresa.com",
  quantity: "100",
  target_date: "2026-12-01",
  privacy_consent: true,
  ...o,
});
const src = (p: string) => readFileSync(resolve(__dirname, "../../../..", p), "utf8");

describe("Project Brief validation", () => {
  it("acepta un brief válido", () => expect(validateBrief(valid())).toEqual({}));
  it("requiere email O teléfono", () => {
    expect(validateBrief(valid({ email: "" })).contact).toBeTruthy();
    expect(validateBrief(valid({ email: "", phone: "55 3031 1686" }))).toEqual({});
    expect(validateBrief(valid({ email: "x@" })).email).toBeTruthy();
    expect(validateBrief(valid({ email: "", phone: "123" })).phone).toBeTruthy();
  });
  it("cantidad positiva O desconocida, nunca ambas", () => {
    expect(validateBrief(valid({ quantity: "" })).quantity).toBeTruthy();
    expect(validateBrief(valid({ quantity: "0" })).quantity).toBeTruthy();
    expect(validateBrief(valid({ quantity: "", quantity_unknown: true }))).toEqual({});
    expect(validateBrief(valid({ quantity: "5", quantity_unknown: true })).quantity).toBeTruthy();
  });
  it("fecha válida O desconocida, nunca ambas", () => {
    expect(validateBrief(valid({ target_date: "" })).target_date).toBeTruthy();
    expect(validateBrief(valid({ target_date: "2026-02-31" })).target_date).toBeTruthy();
    expect(validateBrief(valid({ target_date: "", target_date_unknown: true }))).toEqual({});
    expect(validateBrief(valid({ target_date_unknown: true })).target_date).toBeTruthy();
  });
  it("consentimiento requerido", () => {
    expect(validateBrief(valid({ privacy_consent: false })).privacy_consent).toBeTruthy();
  });
  it("construye el payload real sin metadata controlada por servidor", () => {
    const payload = buildSubmitProjectBriefPayload(valid({ company: "Empresa SA" }), "11111111-1111-4111-8111-111111111111");
    expect(payload).toMatchObject({
      request_id: "11111111-1111-4111-8111-111111111111",
      privacy_consent: true,
      quantity: 100,
      target_date: "2026-12-01",
      company: "Empresa SA",
      honeypot: "",
    });
    for (const key of [
      "privacy_version",
      "privacy_url",
      "consent_at",
      "marketing_consent",
      "public_request_type",
      "public_submission",
      "email_hash",
      "phone_hash",
      "total_estimado",
      "estado_cotizacion",
      "assigned_to",
    ]) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it("no inventa cantidad ni fecha cuando son desconocidas", () => {
    const payload = buildSubmitProjectBriefPayload(
      valid({ quantity: "", quantity_unknown: true, target_date: "", target_date_unknown: true }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(payload).toMatchObject({ quantity_unknown: true, target_date_unknown: true });
    expect(payload).not.toHaveProperty("quantity");
    expect(payload).not.toHaveProperty("target_date");
  });
});

describe("Route B RB3-C contract", () => {
  it("conecta la vista al adaptador real sin tocar el Edge Function desde el cliente", () => {
    expect(src("src/features/project-brief/lib/project-brief.ts")).not.toMatch(/supabase|fetch\(|localStorage|wa\.me|mailto:/);
    expect(src("src/components/ProjectBriefView.tsx")).toContain("submitProjectBrief");
    expect(src("src/components/ProjectBriefView.tsx")).not.toContain("mockSubmitBrief");
  });
  it("entry points navegan a Route B", () => {
    for (const p of ["HomeHero", "HomeSolutions", "HomeFinalCta"]) {
      const s = src(`src/components/home/${p}.tsx`);
      expect(s).toContain("onTellProject");
      expect(s).not.toMatch(/disabled\s*\n\s*aria-disabled/);
    }
    expect(src("src/pages/Index.tsx")).toContain('"brief"');
    expect(src("src/components/ProjectBriefView.tsx")).toContain(
      "Recibimos tu solicitud. La revisaremos y te contactaremos para continuar. Enviar esta solicitud no confirma pedido, precio, disponibilidad ni producción.",
    );
  });
});
