import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

import {
  QuoteSubmissionError,
  normalizeSubmissionRow,
  submitPublicQuoteRequest,
  toQuoteSubmissionError,
  validateContact,
  type QuoteContact,
} from "./public-quote-request";

const validContact: QuoteContact = {
  name: "Ana Pérez",
  company: "Empresa Demo",
  email: "ana@example.com",
  phone: "55 1234 5678",
};

describe("public-quote-request", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("acepta correo de 254 caracteres y rechaza 255", () => {
    const email254 = `${"a".repeat(242)}@example.com`;
    const email255 = `${"a".repeat(243)}@example.com`;

    expect(email254).toHaveLength(254);
    expect(email255).toHaveLength(255);
    expect(validateContact({ ...validContact, email: email254 }).email).toBeUndefined();
    expect(validateContact({ ...validContact, email: email255 }).email).toBeDefined();
  });

  it.each([0, 1.5, 1_000_001])("rechaza quantity inválida: %s", async (quantity) => {
    await expect(
      submitPublicQuoteRequest({
        requestId: "11111111-1111-4111-8111-111111111111",
        contact: validContact,
        quoteFormat: "individual",
        items: [{ product_id: "product-1", quantity }],
      }),
    ).rejects.toMatchObject({ kind: "invalid_quantity" });
  });

  it("solo acepta individual o kit", async () => {
    await expect(
      submitPublicQuoteRequest({
        requestId: "11111111-1111-4111-8111-111111111111",
        contact: validContact,
        quoteFormat: "otro" as "individual",
        items: [{ product_id: "product-1", quantity: 100 }],
      }),
    ).rejects.toMatchObject({ kind: "invalid_quote_format" });
  });

  it("normaliza total_estimated null como null", () => {
    expect(
      normalizeSubmissionRow({
        quote_id: "quote-1",
        reused: false,
        pricing_mode: "mixed",
        total_estimated: null,
        item_count: 2,
        request_quote_item_count: 1,
      }),
    ).toEqual({
      quoteId: "quote-1",
      reused: false,
      pricingMode: "mixed",
      totalEstimated: null,
      itemCount: 2,
      requestQuoteItemCount: 1,
    });
  });

  it.each([
    "rate_limit_exceeded",
    "product_below_minimum",
    "product_unavailable",
    "idempotency_key_conflict",
  ] as const)("mapea %s", (kind) => {
    expect(toQuoteSubmissionError(new Error(kind))).toMatchObject({ kind });
  });

  it("clasifica un fallo de red", () => {
    expect(toQuoteSubmissionError(new Error("Failed to fetch"))).toMatchObject({ kind: "network" });
  });

  it("envía solo contacto, formato, request_id e items permitidos", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          quote_id: "quote-1",
          reused: false,
          pricing_mode: "priced",
          total_estimated: 2500,
          item_count: 1,
          request_quote_item_count: 0,
        },
      ],
      error: null,
    });

    await submitPublicQuoteRequest({
      requestId: "11111111-1111-4111-8111-111111111111",
      contact: validContact,
      quoteFormat: "individual",
      items: [
        {
          product_id: "product-1",
          quantity: 100,
          color: "Azul",
          personalization: { type: "logo_1_ink" },
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith("submit_public_quote_request", {
      p_request_id: "11111111-1111-4111-8111-111111111111",
      p_contact: validContact,
      p_quote_format: "individual",
      p_items: [
        {
          product_id: "product-1",
          quantity: 100,
          color: "Azul",
          personalization: { type: "logo_1_ink" },
        },
      ],
    });
  });

  it("expone errores seguros", () => {
    const error = new QuoteSubmissionError("rate_limit_exceeded");
    expect(error.message).toBe("rate_limit_exceeded");
    expect(error.userMessage).not.toContain("SQL");
  });
});
