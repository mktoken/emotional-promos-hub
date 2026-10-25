import { resolveForPromotionalApiCost } from "./forpromotional-api-cost.ts";

export type ApiObject = Record<string, unknown>;

export type ReconciledForPromotionalVariant = {
  variantKey: string;
  providerSku: string;
  variantSku: string;
  categories: string[];
  subcategories: string[];
  apiOccurrences: number;
  item: ApiObject;
  unitCost: number | null;
  stockQty: number | null;
  commercialMode: string;
  costSource: string;
  invalidReason: string | null;
  conflictFields: string[];
};

export type ForPromotionalReconciliation = {
  sourceRecords: number;
  uniqueVariants: number;
  duplicateRecords: number;
  invalidRecords: number;
  variants: ReconciledForPromotionalVariant[];
  sourceFingerprintInput: string;
};

export type LocalOfferIdentity = {
  providerSku: string;
  variantSku: string;
  publicMappingCount: number;
};

export type LocalAbsenceSummary = {
  absentVariants: LocalOfferIdentity[];
  absentVariantCount: number;
  absentBaseSkuCount: number;
  variantsWithBasePresent: number;
  affectedPublicOffers: number;
  affectedPublicLinks: number;
  baseAndVariantAbsenceSameSet: boolean;
};

export function cleanForPromotionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function normalizeForPromotionalKeyPart(value: unknown): string {
  return cleanForPromotionalText(value)?.toUpperCase().replace(/\s+/g, "_") ?? "";
}

export function buildForPromotionalVariantSku(item: ApiObject): string {
  return [
    "FP",
    normalizeForPromotionalKeyPart(item["id_articulo"]),
    normalizeForPromotionalKeyPart(item["id_artd"]),
    normalizeForPromotionalKeyPart(item["modelo"]),
    normalizeForPromotionalKeyPart(item["color"]),
    normalizeForPromotionalKeyPart(item["talla"]),
  ].join("|");
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sorted(values: Set<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return [...new Set(values.filter((value): value is number => value !== null))]
    .sort((left, right) => left - right);
}

/**
 * Reconciles one complete provider response before pagination. Category fields
 * are evidence, not identity. Conflicting commercial values are reported and
 * never resolved by choosing whichever duplicate happened to arrive last.
 */
export function reconcileForPromotionalItems(items: unknown[]): ForPromotionalReconciliation {
  const groups = new Map<string, ApiObject[]>();
  let invalidRecords = 0;

  for (const raw of items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      invalidRecords += 1;
      continue;
    }
    const item = raw as ApiObject;
    const providerSku = cleanForPromotionalText(item["id_articulo"]);
    if (!providerSku) {
      invalidRecords += 1;
      continue;
    }
    const variantKey = buildForPromotionalVariantSku(item);
    const existing = groups.get(variantKey) ?? [];
    existing.push(item);
    groups.set(variantKey, existing);
  }

  const variants: ReconciledForPromotionalVariant[] = [];
  for (const [variantKey, records] of groups) {
    const categories = new Set<string>();
    const subcategories = new Set<string>();
    const costs: Array<number | null> = [];
    const stocks: Array<number | null> = [];
    const sources = new Set<string>();
    const modes = new Set<string>();
    const invalidReasons = new Set<string>();

    for (const record of records) {
      const category = cleanForPromotionalText(record["categoria"]);
      const subcategory = cleanForPromotionalText(
        record["sub_categoria"] ?? record["subcategoria"],
      );
      if (category) categories.add(category);
      if (subcategory) subcategories.add(subcategory);

      const price = resolveForPromotionalApiCost(record);
      costs.push(price.manual_review ? null : price.unit_cost);
      sources.add(price.source);
      modes.add(price.commercial_mode);
      if (price.manual_review) invalidReasons.add(price.review_reason);

      const stock = toNumber(record["inventario"]);
      stocks.push(stock === null || stock < 0 ? null : Math.floor(stock));
      if (stock === null || stock < 0) invalidReasons.add("invalid_api_stock");
    }

    const validCosts = uniqueNumbers(costs);
    const validStocks = uniqueNumbers(stocks);
    const conflictFields: string[] = [];
    if (validCosts.length > 1) conflictFields.push("unit_cost");
    if (validStocks.length > 1) conflictFields.push("stock_qty");
    if (sources.size > 1) conflictFields.push("cost_source");
    if (modes.size > 1) conflictFields.push("commercial_mode");

    const representative = records[0];
    const representativePrice = resolveForPromotionalApiCost(representative);
    const representativeStock = toNumber(representative["inventario"]);
    variants.push({
      variantKey,
      providerSku: cleanForPromotionalText(representative["id_articulo"])!.toUpperCase(),
      variantSku: variantKey,
      categories: sorted(categories),
      subcategories: sorted(subcategories),
      apiOccurrences: records.length,
      item: representative,
      unitCost: representativePrice.manual_review ? null : representativePrice.unit_cost,
      stockQty: representativeStock === null || representativeStock < 0
        ? null
        : Math.floor(representativeStock),
      commercialMode: representativePrice.commercial_mode,
      costSource: representativePrice.source,
      invalidReason: invalidReasons.size > 0 ? sorted(invalidReasons).join(",") : null,
      conflictFields,
    });
  }

  variants.sort((left, right) => left.variantKey.localeCompare(right.variantKey));
  const sourceFingerprintInput = JSON.stringify(variants.map((variant) => ({
    variant_key: variant.variantKey,
    categories: variant.categories,
    subcategories: variant.subcategories,
    api_occurrences: variant.apiOccurrences,
    unit_cost: variant.unitCost,
    stock_qty: variant.stockQty,
    commercial_mode: variant.commercialMode,
    cost_source: variant.costSource,
    invalid_reason: variant.invalidReason,
    conflict_fields: variant.conflictFields,
  })));

  return {
    sourceRecords: items.length,
    uniqueVariants: variants.length,
    duplicateRecords: items.length - invalidRecords - variants.length,
    invalidRecords,
    variants,
    sourceFingerprintInput,
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Pure equivalent of the database absence-set report, used by local tests. */
export function summarizeLocalOfferAbsences(
  apiVariants: Array<Pick<ReconciledForPromotionalVariant, "providerSku" | "variantSku">>,
  localOffers: LocalOfferIdentity[],
): LocalAbsenceSummary {
  const apiVariantKeys = new Set(
    apiVariants.map((variant) => `${variant.providerSku}\u0000${variant.variantSku}`),
  );
  const apiBaseSkus = new Set(apiVariants.map((variant) => variant.providerSku));
  const absentVariants = localOffers.filter((offer) =>
    !apiVariantKeys.has(`${offer.providerSku}\u0000${offer.variantSku}`)
  );
  const absentBaseSkus = new Set(
    absentVariants
      .filter((offer) => !apiBaseSkus.has(offer.providerSku))
      .map((offer) => offer.providerSku),
  );
  const variantsWithBasePresent = absentVariants.filter((offer) =>
    apiBaseSkus.has(offer.providerSku)
  ).length;

  return {
    absentVariants,
    absentVariantCount: absentVariants.length,
    absentBaseSkuCount: absentBaseSkus.size,
    variantsWithBasePresent,
    affectedPublicOffers: absentVariants.filter((offer) => offer.publicMappingCount > 0).length,
    affectedPublicLinks: absentVariants.reduce(
      (sum, offer) => sum + Math.max(0, offer.publicMappingCount),
      0,
    ),
    baseAndVariantAbsenceSameSet: variantsWithBasePresent === 0,
  };
}
