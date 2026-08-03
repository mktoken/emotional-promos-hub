import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

import {
  PublicPriceContractError,
  estimatedLineTotal,
  fetchPublicProductPriceQuote,
  isValidQuoteQuantity,
  normalizePublicPriceQuoteRow,
  type PublicPriceQuote,
} from "./public-product-price";

const pricedQuote = (overrides: Partial<PublicPriceQuote> = {}): PublicPriceQuote => ({
  status: "priced",
  currency: "MXN",
  unitPriceBeforeTaxMxn: 25,
  minimumQuantity: 1,
  pricingGenerationId: null,
  requestedQuantity: 100,
  isValidQuantity: true,
  ...overrides,
});

describe("public-product-price", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("normaliza priced con precio positivo", () => {
    expect(
      normalizePublicPriceQuoteRow(
        {
          public_price_status: "priced",
          currency: "MXN",
          price_before_tax_mxn: 25.5,
          minimum_quantity: 10,
          pricing_generation_id: "generation-1",
          requested_quantity: 100,
          is_valid_quantity: true,
        },
        100,
      ),
    ).toEqual({
      status: "priced",
      currency: "MXN",
      unitPriceBeforeTaxMxn: 25.5,
      minimumQuantity: 10,
      pricingGenerationId: "generation-1",
      requestedQuantity: 100,
      isValidQuantity: true,
    });
  });

  it.each(["request_quote", "below_minimum", "unavailable"] as const)(
    "%s conserva precio null",
    (status) => {
      const quote = normalizePublicPriceQuoteRow(
        {
          public_price_status: status,
          currency: "MXN",
          price_before_tax_mxn: 99,
          minimum_quantity: status === "below_minimum" ? 250 : null,
          pricing_generation_id: null,
          requested_quantity: 100,
          is_valid_quantity: status === "request_quote",
        },
        100,
      );

      expect(quote.status).toBe(status);
      expect(quote.unitPriceBeforeTaxMxn).toBeNull();
      expect(quote.minimumQuantity).toBe(status === "below_minimum" ? 250 : null);
    },
  );

  it("rechaza un estado desconocido", () => {
    expect(() =>
      normalizePublicPriceQuoteRow(
        {
          public_price_status: "mystery",
          requested_quantity: 100,
          is_valid_quantity: true,
        },
        100,
      ),
    ).toThrow(PublicPriceContractError);
  });

  it("rechaza priced sin precio positivo", () => {
    expect(() =>
      normalizePublicPriceQuoteRow(
        {
          public_price_status: "priced",
          price_before_tax_mxn: 0,
          requested_quantity: 100,
          is_valid_quantity: true,
        },
        100,
      ),
    ).toThrow("El servidor no devolvió un precio válido.");
  });

  it("calcula subtotal solo para la cantidad exacta y válida", () => {
    expect(estimatedLineTotal(pricedQuote(), 100)).toBe(2500);
    expect(estimatedLineTotal(pricedQuote(), 101)).toBeNull();
    expect(estimatedLineTotal(pricedQuote({ isValidQuantity: false }), 100)).toBeNull();
    expect(estimatedLineTotal(pricedQuote({ unitPriceBeforeTaxMxn: null }), 100)).toBeNull();
  });

  it.each([0, 1.5, -1, 1_000_001, Number.NaN])("rechaza cantidad inválida: %s", (quantity) => {
    expect(isValidQuoteQuantity(quantity)).toBe(false);
  });

  it.each([1, 100, 1_000_000])("acepta cantidad válida: %s", (quantity) => {
    expect(isValidQuoteQuantity(quantity)).toBe(true);
  });

  it("rechaza una respuesta para una cantidad distinta", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          public_price_status: "priced",
          currency: "MXN",
          price_before_tax_mxn: 25,
          minimum_quantity: 1,
          pricing_generation_id: null,
          requested_quantity: 99,
          is_valid_quantity: true,
        },
      ],
      error: null,
    });

    await expect(fetchPublicProductPriceQuote("product-1", 100)).rejects.toThrow(
      "La respuesta de precio no corresponde a la cantidad solicitada.",
    );
  });
});
