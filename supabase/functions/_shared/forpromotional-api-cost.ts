export type ForPromotionalCommercialMode =
  | "normal"
  | "promotion"
  | "unique";

export type ForPromotionalPriceResolution = {
  unit_cost: number;
  source: "forpromotional.api.precio_desc";
  commercial_mode: ForPromotionalCommercialMode;
  manual_review?: false;
  review_reason?: never;
} | {
  unit_cost: 0;
  source: "forpromotional.api.precio_desc";
  commercial_mode: "review";
  manual_review: true;
  review_reason:
    | "missing_or_invalid_precio_desc"
    | "conflicting_commercial_flags"
    | "precio_desc_above_precio";
};

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isEnabledFlag(value: unknown): boolean {
  return String(value ?? "").trim().toUpperCase() === "S";
}

export function resolveForPromotionalApiCost(
  product: Record<string, unknown>,
): ForPromotionalPriceResolution {
  const listPrice = toFiniteNumber(product["precio"]);
  const distributorPrice = toFiniteNumber(product["precio_desc"]);
  const isPromotion = isEnabledFlag(product["opc_promo"]);
  const isUnique = isEnabledFlag(product["opc_unico"]);

  if (isPromotion && isUnique) {
    return {
      unit_cost: 0,
      source: "forpromotional.api.precio_desc",
      commercial_mode: "review",
      manual_review: true,
      review_reason: "conflicting_commercial_flags",
    };
  }

  if (distributorPrice === null || distributorPrice <= 0) {
    return {
      unit_cost: 0,
      source: "forpromotional.api.precio_desc",
      commercial_mode: "review",
      manual_review: true,
      review_reason: "missing_or_invalid_precio_desc",
    };
  }

  if (
    (isPromotion || isUnique) &&
    listPrice !== null &&
    listPrice > 0 &&
    distributorPrice > listPrice
  ) {
    return {
      unit_cost: 0,
      source: "forpromotional.api.precio_desc",
      commercial_mode: "review",
      manual_review: true,
      review_reason: "precio_desc_above_precio",
    };
  }

  return {
    unit_cost: distributorPrice,
    source: "forpromotional.api.precio_desc",
    commercial_mode: isUnique ? "unique" : isPromotion ? "promotion" : "normal",
    manual_review: false,
  };
}
