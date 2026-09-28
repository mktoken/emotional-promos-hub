import { describe, expect, it } from "vitest";
import { customerPrice, customerStock, isControlledQaContact, pilotEnabled } from "./agent-pilot";

describe("controlled web pilot", () => {
  it("defaults off and never opens on a production host", () => {
    expect(pilotEnabled("localhost", undefined)).toBe(false);
    expect(pilotEnabled("articulospromocionales.vip", "true")).toBe(false);
    expect(pilotEnabled("127.0.0.1", "true")).toBe(true);
  });
  it("requires the complete explicit QA identity before CRM preparation", () => {
    const contact = { name: "QA Automatizado", company: "QA PromoHub - NO CONTACTAR",
      email: "qa-promohub@example.com", phone: "5500000000" };
    expect(isControlledQaContact(contact)).toBe(true);
    expect(isControlledQaContact({ ...contact, email: "real@example.com" })).toBe(false);
    expect(isControlledQaContact({ ...contact, company: "" })).toBe(false);
  });
  it("never invents public price or confirmed stock", () => {
    expect(customerPrice("request_quote", null)).toContain("por confirmar");
    expect(customerPrice("priced", 12)).toContain("antes de IVA");
    expect(customerStock("unknown", null)).toBe("Disponibilidad por confirmar");
    expect(customerStock("observed", 80)).toContain("final por confirmar");
  });
});
