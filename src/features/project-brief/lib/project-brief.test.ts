import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { emptyBrief, validateBrief, mockSubmitBrief, type ProjectBriefDraft } from "./project-brief";

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
  it("submit mock no hace peticiones de red", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    await expect(mockSubmitBrief(valid())).resolves.toEqual({ ok: true, demo: true });
    expect(f).not.toHaveBeenCalled();
    f.mockRestore();
  });
});

describe("Route B RB2 contract", () => {
  it("sin escrituras en la lógica ni la vista", () => {
    for (const p of ["src/features/project-brief/lib/project-brief.ts", "src/components/ProjectBriefView.tsx"]) {
      const s = src(p);
      expect(s).not.toMatch(/supabase|fetch\(|localStorage|functions\.invoke|wa\.me|mailto:/);
    }
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
