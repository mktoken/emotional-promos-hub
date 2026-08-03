import { supabase } from "@/integrations/supabase/client";

/**
 * Contrato autoritativo de precio público por producto y cantidad.
 * Única fuente de verdad: RPC `get_public_product_price_quote`.
 * El cliente nunca calcula ni deriva precios.
 */

export type PublicPriceStatus = "priced" | "request_quote" | "below_minimum" | "unavailable";

const PUBLIC_PRICE_STATUSES: readonly PublicPriceStatus[] = [
  "priced",
  "request_quote",
  "below_minimum",
  "unavailable",
];

export interface PublicPriceQuote {
  status: PublicPriceStatus;
  currency: string;
  /** Precio unitario antes de IVA e impresión. Null cuando no hay precio autoritativo. */
  unitPriceBeforeTaxMxn: number | null;
  minimumQuantity: number | null;
  pricingGenerationId: string | null;
  requestedQuantity: number;
  isValidQuantity: boolean;
}

export class PublicPriceContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicPriceContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStatus(value: unknown): PublicPriceStatus {
  const raw = readNullableString(value);
  const match = PUBLIC_PRICE_STATUSES.find((status) => status === raw);
  if (!match) {
    // Un estado desconocido nunca puede interpretarse como `priced`.
    throw new PublicPriceContractError("Estado de precio desconocido en la respuesta del servidor.");
  }
  return match;
}

/**
 * Normaliza la fila real devuelta por el RPC. Los tipos generados declaran
 * varios campos como obligatorios, pero el SQL puede devolver null.
 */
export function normalizePublicPriceQuoteRow(row: unknown, fallbackQuantity: number): PublicPriceQuote {
  if (!isRecord(row)) {
    throw new PublicPriceContractError("Respuesta de precio inválida.");
  }

  const status = parseStatus(row.public_price_status);
  const unitPrice = readNullableNumber(row.price_before_tax_mxn);
  const requestedQuantity = readNullableNumber(row.requested_quantity) ?? fallbackQuantity;
  const minimumQuantity = readNullableNumber(row.minimum_quantity);

  if (status === "priced" && (unitPrice === null || unitPrice <= 0)) {
    throw new PublicPriceContractError("El servidor no devolvió un precio válido.");
  }

  return {
    status,
    currency: readNullableString(row.currency) ?? "MXN",
    unitPriceBeforeTaxMxn: status === "priced" ? unitPrice : null,
    minimumQuantity: minimumQuantity !== null && minimumQuantity > 0 ? Math.trunc(minimumQuantity) : null,
    pricingGenerationId: readNullableString(row.pricing_generation_id),
    requestedQuantity: Math.trunc(requestedQuantity),
    isValidQuantity: row.is_valid_quantity === true,
  };
}

export function isValidQuoteQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 1_000_000;
}

/** Subtotal visual. Solo existe cuando el servidor entregó precio autoritativo. */
export function estimatedLineTotal(quote: PublicPriceQuote | null, quantity: number): number | null {
  if (
    !quote ||
    quote.status !== "priced" ||
    quote.unitPriceBeforeTaxMxn === null ||
    quote.unitPriceBeforeTaxMxn <= 0 ||
    quote.isValidQuantity !== true ||
    quote.requestedQuantity !== quantity ||
    !isValidQuoteQuantity(quantity)
  ) {
    return null;
  }

  return quote.unitPriceBeforeTaxMxn * quantity;
}

export async function fetchPublicProductPriceQuote(
  productoB2bId: string,
  quantity: number,
): Promise<PublicPriceQuote> {
  if (!productoB2bId) {
    throw new PublicPriceContractError("Producto inválido.");
  }
  if (!isValidQuoteQuantity(quantity)) {
    throw new PublicPriceContractError("Cantidad inválida.");
  }

  const { data, error } = await supabase.rpc("get_public_product_price_quote", {
    p_producto_b2b_id: productoB2bId,
    p_quantity: quantity,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows: unknown[] = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return {
      status: "unavailable",
      currency: "MXN",
      unitPriceBeforeTaxMxn: null,
      minimumQuantity: null,
      pricingGenerationId: null,
      requestedQuantity: quantity,
      isValidQuantity: false,
    };
  }

  const quote = normalizePublicPriceQuoteRow(rows[0], quantity);
  if (quote.requestedQuantity !== quantity) {
    throw new PublicPriceContractError("La respuesta de precio no corresponde a la cantidad solicitada.");
  }

  return quote;
}
