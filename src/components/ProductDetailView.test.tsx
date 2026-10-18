import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, priceMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  priceMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
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
      sku: null,
      variant_value: "Azul",
      stock_qty: 120,
      stock_status: "available",
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
    fromMock.mockReset();
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
    expect(screen.getByText("SKU: manga-azu")).toBeInTheDocument();
    expect(screen.getAllByText("Stock observado: 120 piezas").length).toBeGreaterThan(0);

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

  it("mantiene disponibilidad por confirmar cuando la variante no reporta stock confiable", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          ...modelRow,
          variants: modelRow.variants.map((variant, index) =>
            index === 0 ? { ...variant, stock_qty: 0, stock_status: "consultar" } : variant,
          ),
        },
      ],
      error: null,
    });

    render(
      <ProductDetailView
        productId="product-azu"
        modelKey="manga"
        onBack={vi.fn()}
        onAddToQuote={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("MANGA")).toBeInTheDocument());
    expect(screen.getAllByText("Disponibilidad por confirmar").length).toBeGreaterThan(0);
    expect(screen.queryByText("Stock observado: 0 piezas")).not.toBeInTheDocument();
  });

  it("resuelve SKU comercial y stock del offer exacto en un producto standalone", async () => {
    const onAddToQuote = vi.fn();
    const legacyProduct = {
      id: "product-goma",
      id_interno: "O 014",
      sku_base: null,
      categoria_principal: "Escritura",
      datos_generales: { nombre: "GOMA" },
      variantes: [{ oferta_id: "offer-goma", color_nombre: "BLANCO" }],
      imagenes: [],
      motor_de_personalizacion: null,
      activo: true,
      updated_at: null,
    };

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: legacyProduct, error: null }),
        }),
      }),
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          producto_b2b_id: "product-goma",
          oferta_id: "offer-goma",
          display_sku: "O 014",
          sku_scope: "PRODUCT",
          variant_value: "BLANCO",
          color_code: null,
          color_nombre: "BLANCO",
          material: null,
          stock_status: "disponible",
          stock_qty: 126514,
        },
      ],
      error: null,
    });

    render(
      <ProductDetailView
        productId="product-goma"
        onBack={vi.fn()}
        onAddToQuote={onAddToQuote}
      />,
    );

    await waitFor(() => expect(screen.getByText("GOMA")).toBeInTheDocument());
    expect(screen.getByText("SKU de producto: O 014")).toBeInTheDocument();
    expect(screen.getAllByText("Stock observado: 126,514 piezas").length).toBeGreaterThan(0);
    expect(screen.queryByText(/FP\|O_014/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Agregar a mi solicitud" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Agregar a mi solicitud" }));
    expect(onAddToQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-goma",
        sku: "O 014",
        quantity: 100,
        color: expect.objectContaining({ name: "BLANCO" }),
      }),
    );
  });

  it("mantiene los mensajes conservadores si no hay una relación pública exacta", async () => {
    const legacyProduct = {
      id: "product-unknown",
      id_interno: "UNKNOWN",
      sku_base: null,
      categoria_principal: null,
      datos_generales: { nombre: "Producto sin contexto" },
      variantes: [{ color_nombre: "AZUL" }],
      imagenes: [],
      motor_de_personalizacion: null,
      activo: true,
      updated_at: null,
    };

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: legacyProduct, error: null }),
        }),
      }),
    });
    rpcMock.mockResolvedValue({ data: null, error: { message: "function unavailable" } });

    render(
      <ProductDetailView
        productId="product-unknown"
        onBack={vi.fn()}
        onAddToQuote={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Producto sin contexto")).toBeInTheDocument());
    expect(screen.getByText("SKU por confirmar")).toBeInTheDocument();
    expect(screen.getAllByText("Disponibilidad por confirmar").length).toBeGreaterThan(0);
  });

  it("relaciona cada variante únicamente con su oferta exacta", async () => {
    const legacyProduct = {
      id: "product-multi-offer",
      id_interno: "MULTI",
      sku_base: null,
      categoria_principal: "Escritura",
      datos_generales: { nombre: "Producto multivariante" },
      variantes: [
        { oferta_id: "offer-a", color_nombre: "AZUL" },
        { oferta_id: "offer-b", color_nombre: "VERDE" },
      ],
      imagenes: [],
      motor_de_personalizacion: null,
      activo: true,
      updated_at: null,
    };

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: legacyProduct, error: null }),
        }),
      }),
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          producto_b2b_id: "product-multi-offer",
          oferta_id: "offer-b",
          display_sku: "SKU-B",
          sku_scope: "VARIANT",
          variant_value: "VERDE",
          color_code: null,
          color_nombre: "VERDE",
          material: null,
          stock_status: "disponible",
          stock_qty: 7,
        },
        {
          producto_b2b_id: "product-multi-offer",
          oferta_id: "offer-a",
          display_sku: "SKU-A",
          sku_scope: "VARIANT",
          variant_value: "AZUL",
          color_code: null,
          color_nombre: "AZUL",
          material: null,
          stock_status: "disponible",
          stock_qty: 5,
        },
      ],
      error: null,
    });

    render(
      <ProductDetailView
        productId="product-multi-offer"
        onBack={vi.fn()}
        onAddToQuote={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Producto multivariante")).toBeInTheDocument());
    expect(screen.getByText("SKU: SKU-A")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Color o variante" }), { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText("SKU: SKU-B")).toBeInTheDocument());
    expect(screen.getAllByText("Stock observado: 7 piezas").length).toBeGreaterThan(0);
  });

  it("mantiene disponibilidad por confirmar cuando cantidad y estado son inconsistentes", async () => {
    const legacyProduct = {
      id: "product-inconsistent-stock",
      id_interno: "INCONSISTENT",
      sku_base: null,
      categoria_principal: "Escritura",
      datos_generales: { nombre: "Producto con stock inconsistente" },
      variantes: [{ oferta_id: "offer-inconsistent", color_nombre: "ROJO" }],
      imagenes: [],
      motor_de_personalizacion: null,
      activo: true,
      updated_at: null,
    };

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: legacyProduct, error: null }),
        }),
      }),
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          producto_b2b_id: "product-inconsistent-stock",
          oferta_id: "offer-inconsistent",
          display_sku: "O 015",
          sku_scope: "PRODUCT",
          variant_value: "ROJO",
          color_code: null,
          color_nombre: "ROJO",
          material: null,
          stock_status: "agotado",
          stock_qty: 12,
        },
      ],
      error: null,
    });

    render(
      <ProductDetailView
        productId="product-inconsistent-stock"
        onBack={vi.fn()}
        onAddToQuote={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("Producto con stock inconsistente")).toBeInTheDocument());
    expect(screen.getAllByText("Disponibilidad por confirmar").length).toBeGreaterThan(0);
    expect(screen.queryByText("Stock observado: 12 piezas")).not.toBeInTheDocument();
  });
});
