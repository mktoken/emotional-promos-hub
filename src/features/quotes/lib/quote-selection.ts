import type { QuoteItem } from "@/data/mockData";
import type { PublicPriceQuote } from "@/features/catalog/lib/public-product-price";
import type { QuoteRequestItem } from "@/features/quotes/lib/public-quote-request";

/**
 * Selección temporal de productos para la solicitud de cotización.
 * Los datos visuales (nombre, imagen, clave, último precio consultado) no son
 * autoridad y nunca se envían al backend como precio.
 */
export type QuoteSelectionItem = QuoteItem & {
  /** Último resultado autoritativo conocido. Solo estimación visual. */
  pricing?: PublicPriceQuote | null;
};

export type NewQuoteSelectionItem = Omit<QuoteSelectionItem, "cartId">;

function normalizeColor(item: QuoteSelectionItem): string | undefined {
  const name = item.color?.name?.trim();
  return name && name.length > 0 ? name : undefined;
}

/** Whitelist estricta: solo los campos que el RPC admite. */
export function buildQuoteRequestItems(items: QuoteSelectionItem[]): QuoteRequestItem[] {
  return items.map((item) => {
    const requestItem: QuoteRequestItem = {
      product_id: item.productId,
      quantity: Math.trunc(item.quantity),
    };

    const color = normalizeColor(item);
    if (color) requestItem.color = color;

    const requested = item.personalizacionSolicitadaCliente;
    if (requested || item.logoFormat) {
      const personalization: QuoteRequestItem["personalization"] = {};
      const type = requested?.tipo ?? item.logoFormat;
      if (type) personalization.type = type;
      if (requested?.label) personalization.label = requested.label;
      if (requested?.message) personalization.message = requested.message;
      if (typeof item.requiereRevisionTecnica === "boolean") {
        personalization.requires_review = item.requiereRevisionTecnica;
      }
      if (Object.keys(personalization).length > 0) requestItem.personalization = personalization;
    }

    return requestItem;
  });
}
