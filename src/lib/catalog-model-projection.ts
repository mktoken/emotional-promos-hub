import { normalizeProductImages } from "@/lib/product-images";

export interface CatalogModelProjectionVariant {
  producto_b2b_id?: string | null;
  sku?: string | null;
  variant_value?: string | null;
  material?: string | null;
  image?: unknown;
  card_price?: unknown;
  minimum_quantity?: number | null;
  stock_status?: string | null;
  stock_qty?: number | null;
  public_eligible?: boolean;
}

export interface CatalogModelProjectionRow {
  result_grain?: string | null;
  result_id?: string | null;
  model_id?: string | null;
  model_key?: string | null;
  canonical_model_name?: string | null;
  default_producto_b2b_id?: string | null;
  selected_variant_sku?: string | null;
  selected_variant_value?: string | null;
  eligible_variant_count?: number | null;
  variants?: unknown;
  representative_image?: unknown;
  card_price?: unknown;
  card_moq?: number | null;
  availability?: string | null;
  category?: unknown;
  relevance?: number | null;
  total_count?: number | null;
}

export interface CatalogModelCard {
  id: string;
  id_interno: string;
  sku_base: string | null;
  nombre: string | null;
  descripcion: string | null;
  imagenes: unknown;
  precio_desde_mxn: number | null;
  public_price_status: string | null;
  currency: string | null;
  minimum_quantity: number | null;
  categoria_slug: string | null;
  categoria_nombre: string | null;
  subcategoria_slug: string | null;
  subcategoria_nombre: string | null;
  relevance: number | null;
  total_count: number | null;
  model_key: string | null;
  eligible_variant_count: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asText = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

export const isModelResult = (value: unknown): value is CatalogModelProjectionRow => {
  const row = asRecord(value);
  return row?.result_grain === "MODEL_RESULT" && typeof row.model_key === "string" && Array.isArray(row.variants);
};

export const hasOnlyModelResults = (rows: unknown[]): rows is CatalogModelProjectionRow[] =>
  rows.length > 0 && rows.every(isModelResult);

export const hasModelResults = (rows: unknown[]): boolean => rows.some(isModelResult);

const isProjectionResultGrain = (value: unknown): value is "MODEL_RESULT" | "VARIANT_RESULT" =>
  value === "MODEL_RESULT" || value === "VARIANT_RESULT";

/**
 * A valid V2 page is authoritative even when it contains no model rows.
 * A page made only of standalone VARIANT_RESULT rows is still a valid
 * projection response and must not fall back to the legacy product RPC.
 */
export const isCatalogModelProjectionPayload = (value: unknown): value is CatalogModelProjectionRow[] => {
  if (!Array.isArray(value)) return false;

  return value.every((entry) => {
    const row = asRecord(entry);
    if (!row || !isProjectionResultGrain(row.result_grain)) return false;
    if (typeof row.result_id !== "string") return false;

    const totalCount = row.total_count;
    return totalCount === null || totalCount === undefined || Number.isFinite(Number(totalCount));
  });
};

export const projectionVariants = (row: CatalogModelProjectionRow): CatalogModelProjectionVariant[] =>
  Array.isArray(row.variants)
    ? row.variants.filter((variant): variant is CatalogModelProjectionVariant => asRecord(variant) !== null)
    : [];

export const projectionImageUrls = (image: unknown): string[] => {
  const record = asRecord(image);
  if (record && Array.isArray(record.ordered_sources)) {
    return normalizeProductImages(image);
  }
  return normalizeProductImages(record && "value" in record ? record.value : image);
};

const containsImageRole = (value: unknown, roles: ReadonlySet<string>): boolean => {
  if (Array.isArray(value)) return value.some((item) => containsImageRole(item, roles));
  const record = asRecord(value);
  if (!record) return false;
  if (typeof record.role === "string" && roles.has(record.role)) return true;
  return "value" in record && containsImageRole(record.value, roles);
};

/**
 * Extracts only explicitly model-scoped image sources. Variant and unverified
 * runtime alternatives are intentionally excluded from this set.
 */
export const projectionImageUrlsByRole = (image: unknown, roles: readonly string[]): string[] => {
  const allowedRoles = new Set(roles);
  const record = asRecord(image);
  const orderedSources = record && Array.isArray(record.ordered_sources) ? record.ordered_sources : [image];
  return normalizeProductImages(orderedSources.filter((source) => containsImageRole(source, allowedRoles)));
};

export const modelProjectionToCatalogCard = (row: CatalogModelProjectionRow): CatalogModelCard | null => {
  const modelKey = asText(row.model_key);
  const id = asText(row.default_producto_b2b_id) || asText(row.result_id);
  if (!modelKey || !id) return null;

  const category = asRecord(row.category);
  const price = asRecord(row.card_price);
  const amount = asNumber(price?.amount_mxn);
  const eligibleVariantCount = asNumber(row.eligible_variant_count) ?? projectionVariants(row).length;

  return {
    id,
    id_interno: modelKey,
    sku_base: asText(row.selected_variant_sku),
    nombre: asText(row.canonical_model_name) || modelKey,
    descripcion: null,
    imagenes: row.representative_image ?? null,
    precio_desde_mxn: amount,
    public_price_status: asText(price?.status),
    currency: asText(price?.currency) || "MXN",
    minimum_quantity: asNumber(row.card_moq),
    categoria_slug: asText(category?.slug),
    categoria_nombre: asText(category?.name),
    subcategoria_slug: asText(category?.subcategory_slug),
    subcategoria_nombre: asText(category?.subcategory_name),
    relevance: asNumber(row.relevance),
    total_count: asNumber(row.total_count),
    model_key: modelKey,
    eligible_variant_count: eligibleVariantCount,
  };
};

export const projectionToCatalogCard = (row: CatalogModelProjectionRow): CatalogModelCard | null => {
  if (row.result_grain === "MODEL_RESULT") return modelProjectionToCatalogCard(row);
  if (row.result_grain !== "VARIANT_RESULT") return null;

  const id = asText(row.default_producto_b2b_id) || asText(row.result_id);
  if (!id) return null;

  const category = asRecord(row.category);
  const price = asRecord(row.card_price);
  return {
    id,
    id_interno: asText(row.selected_variant_sku) || id,
    sku_base: asText(row.selected_variant_sku),
    nombre: asText(row.canonical_model_name) || id,
    descripcion: null,
    imagenes: row.representative_image ?? null,
    precio_desde_mxn: asNumber(price?.amount_mxn),
    public_price_status: asText(price?.status),
    currency: asText(price?.currency) || "MXN",
    minimum_quantity: asNumber(row.card_moq),
    categoria_slug: asText(category?.slug),
    categoria_nombre: asText(category?.name),
    subcategoria_slug: asText(category?.subcategory_slug),
    subcategoria_nombre: asText(category?.subcategory_name),
    relevance: asNumber(row.relevance),
    total_count: asNumber(row.total_count),
    model_key: null,
    eligible_variant_count: 1,
  };
};
