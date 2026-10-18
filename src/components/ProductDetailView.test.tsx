import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, priceMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  priceMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/features/catalog/lib/public-product-price", () => ({
  fetchPublicProductPriceQuote: priceMock,
  estimatedLineTotal: (quote: { status?: string; unitPriceBeforeTaxMxn?: number | null } | null, quantity: number) =>
    quote?.status === "priced" && quote.unitPriceBeforeTaxMxn ? quote.unitPriceBeforeTaxMxn * quantity : null,
  isValidQuoteQuantity: (quantity: number) => Number.isInteger(quantity) && quantity >= 1,
}));

vi.mock("@/components/catalog/SafeProductImage", () => ({
  default: ({ images, alt }: { images: string[]; alt: string }) => (
    <div role="img" aria-label={alt} data-image={images[0] ?? "placeholder"} />
  ),
}));

vi.mock("@/components/catalog/ProductImageLightbox", () => ({
  default: () => null,
}));

import ProductDetailView from "./ProductDetailView";

const modelRow = {
  result_grain: "MODEL_RESULT",
  model_key: "manga",
  default_producto_b2b_id: "product-azu",
  canonical_model_name: "MANGA",
  selected_variant_sku: "manga-azu",
  variants: [
    {
      producto_b2b_id: "product-azu",
      sku: "manga-azu",
      variant_value: "Azul",
      stock_qty: 120,
      stock_status: "disponible",
      material: "Plástico",
      image: ["https://images.example/manga-azu.webp"],
      public_eligible: true,
    },
    {
      producto_b2b_id: "product-rojo",
      sku: "manga-rojo",
      variant_value: "Rojo",
      stock_qty: 80,
      stock_status: "disponible",
      material: "Plástico",
      image: ["https://images.example/manga-rojo.webp"],
      public_eligible: true,
    },
  ],
  representative_image: ["https://images.example/manga-azu.webp"],
};

const pricedQuote = {
  status: "priced" as const,
  currency: "MXN",
  unitPriceBeforeTaxMxn: 12,
  minimumQuantity: 50,
  pricingGenerationId: "pricing-v2",
  requestedQuantity: 100,
  isValidQuantity: true,
};

describe("ProductDetailView PDP simplificada", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    priceMock.mockReset();
    rpcMock.mockResolvedValue({ data: [modelRow], error: null });
    priceMock.mockImplementation((_productId: string, quantity: number) =>
      Promise.resolve({ ...pricedQuote, requestedQuantity: quantity }),
    );
  });

  it("mantiene SKU, cantidad y variante al agregar a Mi solicitud", async () => {
    const onAddToQuote = vi.fn();
    render(
      <ProductDetailView
        productId="product-azu"
        modelKey="manga"
        onBack={vi.fn()}
        onAddToQuote={onAddToQuote}
      />,
    );

    await waitFor(() => expect(screen.getByText("MANGA")).toBeInTheDocument());

    const quantity = screen.getByDisplayValue("100");
    fireEvent.change(quantity, { target: { value: "250" } });
    await waitFor(() => expect(priceMock).toHaveBeenCalledWith("product-azu", 250));

    fireEvent.change(screen.getByRole("combobox", { name: "Color o variante" }), { target: { value: "1" } });
    await waitFor(() => expect(priceMock).toHaveBeenCalledWith("product-rojo", 250));
    fireEvent.click(screen.getByRole("button", { name: /Con mi logo/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Agregar a mi solicitud" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Agregar a mi solicitud" }));

    expect(onAddToQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-rojo",
        sku: "manga-rojo",
        quantity: 250,
        logoFormat: "advisor_review",
        personalizacionSolicitadaCliente: expect.objectContaining({
          tipo: "advisor_review",
          label: "Con mi logo",
          requiereRevision: true,
        }),
      }),
    );
  });

  it("ofrece únicamente decisiones comerciales de personalización y no técnicas de impresión", async () => {
    render(
      <ProductDetailView
        productId="product-azu"
        modelKey="manga"
        onBack={vi.fn()}
        onAddToQuote={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Personalización deseada")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Sin personalización/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Con mi logo/ })).toBeInTheDocument();
    expect(screen.queryByText("Logo a 1 tinta")).not.toBeInTheDocument();
    expect(screen.queryByText("Full color")).not.toBeInTheDocument();
    expect(screen.queryByText("Grabado")).not.toBeInTheDocument();
  });
});
