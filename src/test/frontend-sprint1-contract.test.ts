import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("contrato estático del frontend de solicitud de cotización", () => {
  const productDetail = readSource("src/components/ProductDetailView.tsx");
  const quoteView = readSource("src/components/QuoteCartView.tsx");
  const index = readSource("src/pages/Index.tsx");
  const selection = readSource("src/features/quotes/lib/quote-selection.ts");

  it("no renderiza el literal ctaLabel", () => {
    expect(productDetail).not.toMatch(/\(\s*ctaLabel\s*\)/);
    expect(productDetail).toContain("<span>{ctaLabel}</span>");
  });

  it("no usa ShoppingCart y muestra Mi solicitud", () => {
    expect(productDetail).not.toContain("ShoppingCart");
    expect(index).not.toContain("ShoppingCart");
    expect(index).toContain("Mi solicitud");
  });

  it("no consulta precio_desde_mxn en ProductDetailView", () => {
    expect(productDetail).not.toContain("precio_desde_mxn");
  });

  it("no conserva estimatedUnit ni estimatedTotal en la selección nueva", () => {
    expect(selection).toContain('Omit<QuoteItem, "estimatedUnit" | "estimatedTotal">');
    expect(productDetail).not.toMatch(/estimated(Unit|Total)\s*:/);
    expect(index).not.toContain("estimatedUnit");
  });

  it("no inserta directamente en cotizaciones_leads", () => {
    const publicFlow = [productDetail, quoteView, index, selection].join("\n");
    expect(publicFlow).not.toContain('from("cotizaciones_leads")');
    expect(publicFlow).not.toContain("from('cotizaciones_leads')");
  });

  it("usa lenguaje de solicitud y no de compra", () => {
    const publicFlow = [productDetail, quoteView, index].join("\n").toLowerCase();
    expect(publicFlow).not.toMatch(/comprar|pagar|checkout|finalizar compra|carrito de compras|pedido confirmado/);
    expect(publicFlow).toContain("solicitud de cotización");
  });

  it("conserva protección de doble envío y limpieza solo tras éxito", () => {
    expect(quoteView).toContain("if (submittingRef.current) return;");
    expect(quoteView).toContain("requestIdManagerRef.current.clear();");
    expect(quoteView.indexOf("requestIdManagerRef.current.clear();")).toBeGreaterThan(
      quoteView.indexOf("const submission = await submitPublicQuoteRequest"),
    );
    expect(quoteView).toContain("onSubmitted?.();");
  });

  it("muestra Total por confirmar cuando el total del servidor es null", () => {
    expect(quoteView).toContain('"Total por confirmar"');
  });
});
