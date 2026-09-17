import { describe, expect, it } from "vitest";
import type { ProductColor } from "@/data/mockData";
import type { PublicPriceQuote } from "@/features/catalog/lib/public-product-price";
import { buildQuoteRequestItems, type QuoteSelectionItem } from "./quote-selection";

const color: ProductColor = {
  id: "color-1",
  name: "Azul",
  hex: "#0000ff",
  stock: 20,
  imgAlt: "Producto azul",
};

const requestQuotePricing: PublicPriceQuote = {
  status: "request_quote",
  currency: "MXN",
  unitPriceBeforeTaxMxn: null,
  minimumQuantity: 1,
  pricingGenerationId: null,
  requestedQuantity: 100,
  isValidQuantity: true,
};

const item: QuoteSelectionItem = {
  cartId: 1,
  productId: "product-1",
  name: "Producto visual",
  sku: "SKU-VISUAL",
  claveProducto: "CLAVE-VISUAL",
  color,
  quantity: 100,
  logoFormat: "logo_1_ink",
  personalizacionSolicitadaCliente: {
    tipo: "logo_1_ink",
    label: "Logo a 1 tinta",
    message: "Mensaje permitido",
  },
  requiereRevisionTecnica: true,
  pricing: requestQuotePricing,
  hasVirtualSample: false,
};

describe("buildQuoteRequestItems", () => {
  it("envía únicamente la whitelist admitida por el RPC", () => {
    const [payload] = buildQuoteRequestItems([item]);

    expect(payload).toEqual({
      product_id: "product-1",
      quantity: 100,
      color: "Azul",
      personalization: {
        type: "logo_1_ink",
        label: "Logo a 1 tinta",
        message: "Mensaje permitido",
        requires_review: true,
      },
    });

    expect(Object.keys(payload).sort()).toEqual(
      ["color", "personalization", "product_id", "quantity"].sort(),
    );

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(
      /price|precio|subtotal|total|status|generation|sku|nombre|name|estado|assigned_to/i,
    );
    expect(payload).not.toHaveProperty("notes");
    expect(payload).not.toHaveProperty("note");
    expect(payload).not.toHaveProperty("comment");
  });

  it("transporta observaciones normalizadas por cartId y conserva saltos de línea", () => {
    const secondItem: QuoteSelectionItem = {
      ...item,
      cartId: 2,
      productId: "product-2",
      name: "Segundo producto",
    };

    const payload = buildQuoteRequestItems([item, secondItem], {
      1: "  Logo centrado\nEmpaque individual  ",
      2: "Entrega urgente",
    });

    expect(payload).toEqual([
      expect.objectContaining({
        product_id: "product-1",
        observation: "Logo centrado\nEmpaque individual",
      }),
      expect.objectContaining({
        product_id: "product-2",
        observation: "Entrega urgente",
      }),
    ]);
    expect(payload[0]).not.toHaveProperty("notes");
    expect(payload[0]).not.toHaveProperty("comment");
  });

  it("omite observaciones vacías, de solo espacios y limita a 500 caracteres", () => {
    const payload = buildQuoteRequestItems([item], {
      1: ` ${"x".repeat(600)} `,
    });

    expect(payload[0].observation).toHaveLength(500);
    expect(payload[0].observation).toBe("x".repeat(500));
    expect(buildQuoteRequestItems([item], { 1: "" })[0]).not.toHaveProperty("observation");
    expect(buildQuoteRequestItems([item], { 1: "   " })[0]).not.toHaveProperty("observation");
  });

  it("asocia la observación por cartId y no por productId", () => {
    const sameProductDifferentLine: QuoteSelectionItem = {
      ...item,
      cartId: 9,
      name: "Otra línea del mismo producto",
    };

    const [first, second] = buildQuoteRequestItems([item, sameProductDifferentLine], {
      1: "Primera línea",
      9: "Segunda línea",
    });

    expect(first.observation).toBe("Primera línea");
    expect(second.observation).toBe("Segunda línea");
  });

  it("request_quote no genera ni almacena precio cero", () => {
    expect(item.pricing?.status).toBe("request_quote");
    expect(item.pricing?.unitPriceBeforeTaxMxn).toBeNull();
    expect(item).not.toHaveProperty("estimatedUnit");
    expect(item).not.toHaveProperty("estimatedTotal");
  });
});
