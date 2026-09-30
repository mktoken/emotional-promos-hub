import { supabase } from "@/integrations/supabase/client";
import { normalizeProductImages } from "@/lib/product-images";
import { fetchPublicProductPriceQuote } from "@/features/catalog/lib/public-product-price";
import type { AgentProduct } from "./agent-state";

interface SearchRow {
  id: string; nombre: string | null; sku_base: string | null;
  minimum_quantity: number | null; imagenes: unknown; public_price_status: string | null;
}
interface ProductRow {
  id: string; id_interno: string; sku_base: string | null;
  datos_generales: unknown; variantes: unknown; imagenes: unknown; activo: boolean | null;
}

export interface CatalogTools {
  searchProducts(query: string, quantity: number): Promise<SearchRow[]>;
  searchProductsExact?(query: string, quantity: number): Promise<SearchRow[]>;
  getProductDetails(id: string): Promise<ProductRow | null>;
  getProductVariants(id: string): Promise<AgentProduct["variants"]>;
  getProductStock(id: string): Promise<{ observedStock: number | null; status: "observed" | "unknown" }>;
  getProductImages(id: string): Promise<string[]>;
  getProductUrl(id: string): string;
  getAuthoritativePrice(id: string, quantity: number): ReturnType<typeof fetchPublicProductPriceQuote>;
  findSimilarProducts(query: string, quantity: number): Promise<SearchRow[]>;
}

const toVariants = (raw: unknown): AgentProduct["variants"] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const v = item as Record<string, unknown>;
    const stock = v.stock_total === null || v.stock_total === undefined || v.stock_total === ""
      ? null : Number(v.stock_total);
    return [{ color: typeof v.color_nombre === "string" ? v.color_nombre : "Sin color especificado",
      stock: stock !== null && Number.isFinite(stock) && stock >= 0 ? stock : null }];
  });
};

function publicSku(detail: ProductRow, general: Record<string, unknown>): string | null {
  if (detail.sku_base?.trim()) return detail.sku_base.trim();
  return typeof general.clave_producto === "string" && general.clave_producto.trim()
    ? general.clave_producto.trim() : null;
}

export const catalogTools: CatalogTools = {
  async searchProductsExact(query, quantity) {
    const { data, error } = await supabase.rpc("catalog_search_products_v2", {
      p_query: query.trim(), p_limit: 24, p_offset: 0, p_category_slug: null, p_collection_slug: null,
      p_subcategory_slug: null, p_min_price: null, p_max_price: null,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as SearchRow[]).filter((row) => row.id && (!row.minimum_quantity || row.minimum_quantity <= quantity));
  },
  async searchProducts(query, quantity) {
    const normalized = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const terms = /libreta|cuaderno|notebook/.test(normalized) ? ["libreta", "cuaderno"]
      : /termo|cilindro/.test(normalized) ? ["termo", "termos", "cilindro"]
        : /bolsa/.test(normalized) ? ["bolsa", "bolsas"] : [query.trim()];
    const responses = await Promise.all(terms.map((term) => supabase.rpc("catalog_search_products_v2", {
      p_query: term, p_limit: 24, p_offset: 0, p_category_slug: null, p_collection_slug: null,
      p_subcategory_slug: null, p_min_price: null, p_max_price: null,
    })));
    const found = new Map<string, SearchRow>();
    for (const response of responses) {
      if (response.error) throw new Error(response.error.message);
      for (const row of (response.data ?? []) as SearchRow[]) {
        if (row.id && (!row.minimum_quantity || row.minimum_quantity <= quantity)) found.set(row.id, row);
      }
    }
    const results = [...found.values()];
    const categoryPattern = /libreta|cuaderno|notebook/.test(normalized) ? /libret|cuadern|notebook/i
      : /termo|cilindro/.test(normalized) ? /termo|cilindro/i
        : /bolsa/.test(normalized) ? /bolsa/i : null;
    return categoryPattern ? results.filter((row) => categoryPattern.test(row.nombre ?? "")) : results;
  },
  async getProductDetails(id) {
    const { data, error } = await supabase.from("productos_publicos")
      .select("id,id_interno,sku_base,datos_generales,variantes,imagenes,activo")
      .eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as ProductRow | null;
  },
  async getProductVariants(id) { return toVariants((await this.getProductDetails(id))?.variantes); },
  async getProductStock(id) {
    const variants = await this.getProductVariants(id);
    const known = variants.map((v) => v.stock).filter((v): v is number => v !== null);
    return known.length ? { observedStock: known.reduce((a, b) => a + b, 0), status: "observed" } : { observedStock: null, status: "unknown" };
  },
  async getProductImages(id) { return normalizeProductImages((await this.getProductDetails(id))?.imagenes); },
  getProductUrl(id) { return `/?view=pdp&product=${encodeURIComponent(id)}`; },
  getAuthoritativePrice(id, quantity) { return fetchPublicProductPriceQuote(id, quantity); },
  findSimilarProducts(query, quantity) { return this.searchProducts(query, quantity); },
};

export async function loadRealProducts(
  query: string | null, quantity: number, tools: CatalogTools = catalogTools,
): Promise<AgentProduct[]> {
  if (!query?.trim()) return [];
  const queries = planVisualCatalogQueries(query);
  const categoryPattern = visualCategoryPatterns[queries[0]];
  const rowsById = new Map<string, SearchRow>();
  const exactSearch = tools.searchProductsExact?.bind(tools) ?? tools.searchProducts.bind(tools);
  for (const term of queries) {
    const results = queries.length > 1 ? await exactSearch(term, quantity) : await tools.searchProducts(term, quantity);
    for (const row of results) {
      if (!row.id || rowsById.has(row.id) || (categoryPattern && !categoryPattern.test(row.nombre ?? ""))) continue;
      rowsById.set(row.id, row);
    }
    if (rowsById.size >= 12) break;
  }
  const rows = [...rowsById.values()];
  const hydrated = await Promise.all(rows.slice(0, 12).map(async (row): Promise<AgentProduct | null> => {
    try {
      const detail = await tools.getProductDetails(row.id);
      if (!detail || detail.activo === false) return null;
      const price = await tools.getAuthoritativePrice(row.id, quantity);
      const variants = toVariants(detail.variantes);
      const known = variants.map((v) => v.stock).filter((v): v is number => v !== null);
      const observedStock = known.length ? known.reduce((a, b) => a + b, 0) : null;
      const general = detail.datos_generales && typeof detail.datos_generales === "object"
        ? detail.datos_generales as Record<string, unknown> : {};
      const name = typeof general.modelo_comercial === "string" && general.modelo_comercial.trim()
        ? general.modelo_comercial.trim() : row.nombre?.trim() || detail.id_interno;
      return { id: detail.id, sku: publicSku(detail, general), name,
        imageUrl: normalizeProductImages(detail.imagenes)[0] ?? normalizeProductImages(row.imagenes)[0] ?? null,
        productUrl: tools.getProductUrl(detail.id), color: null, variants,
        observedStock, stockStatus: observedStock === null ? "unknown" : "observed",
        price, quantity, state: "considering" };
    } catch { return null; }
  }));
  if (rows.length > 0 && hydrated.every((item) => item === null)) {
    throw new Error("No se pudieron verificar las fichas o los precios del catálogo.");
  }
  return hydrated.filter((item): item is AgentProduct => item !== null);
}

const visualCategoryAliases: Record<string, string[]> = {
  libreta: ["cuaderno"], termo: ["termos", "cilindro"], bolsa: ["bolsas"],
};
const visualCategories = ["libreta", "termo", "botella", "bolsa", "mochila", "pluma", "taza"];
const visualCategoryPatterns: Record<string, RegExp> = {
  libreta: /libret|cuadern|notebook/i, termo: /termo|cilindro/i, botella: /botell/i,
  bolsa: /bolsa|tote/i, mochila: /mochila|backpack/i, pluma: /pluma|boligrafo|lapicero/i, taza: /taza|mug/i,
};
const queryOnlyNoise = new Set(["cuerpo", "asa", "borde", "tapa", "exterior", "interior", "con", "de", "del", "para", "color"]);

/** Splits the existing serialized visual criteria into a bounded category-first retrieval plan. */
export function planVisualCatalogQueries(criteria: string): string[] {
  const normalized = criteria.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const category = visualCategories.find((candidate) => normalized === candidate || normalized.startsWith(`${candidate} `));
  if (!category) return [criteria.trim()].filter(Boolean);

  const suffix = normalized === category ? "" : normalized.slice(category.length).trim();
  const phrases = suffix.split(new RegExp(`\\b${category}\\b`, "g"))
    .map((phrase) => phrase.split(/\s+/).filter((word) => word && word !== "o" && !queryOnlyNoise.has(word)).join(" ").trim())
    .filter(Boolean);
  const planned = [category, ...phrases.map((phrase) => `${category} ${phrase}`)];
  for (const alias of visualCategoryAliases[category] ?? []) planned.push(alias);
  return [...new Set(planned.map((term) => term.trim()).filter(Boolean))].slice(0, 3);
}

/** Revalida un producto ya seleccionado sin depender del orden o límite de una nueva búsqueda. */
export async function loadRealProductById(
  id: string, quantity: number, tools: CatalogTools = catalogTools,
): Promise<AgentProduct | null> {
  const detail = await tools.getProductDetails(id);
  if (!detail || detail.activo === false) return null;
  const price = await tools.getAuthoritativePrice(id, quantity);
  const variants = toVariants(detail.variantes);
  const known = variants.map((variant) => variant.stock).filter((stock): stock is number => stock !== null);
  const general = detail.datos_generales && typeof detail.datos_generales === "object"
    ? detail.datos_generales as Record<string, unknown> : {};
  const name = typeof general.modelo_comercial === "string" && general.modelo_comercial.trim()
    ? general.modelo_comercial.trim() : detail.id_interno;
  return { id: detail.id, sku: publicSku(detail, general), name,
    imageUrl: normalizeProductImages(detail.imagenes)[0] ?? null,
    productUrl: tools.getProductUrl(detail.id), color: null, variants,
    observedStock: known.length ? known.reduce((a, b) => a + b, 0) : null,
    stockStatus: known.length ? "observed" : "unknown", price, quantity, state: "considering" };
}

export function recommendProducts(products: AgentProduct[]): Array<{ label: string; product: AgentProduct }> {
  const eligible = products.filter((p) => p.state !== "rejected" && p.price.status === "priced"
    && p.price.unitPriceBeforeTaxMxn !== null && p.price.isValidQuantity
    && (p.observedStock === null || p.observedStock >= p.quantity));
  const sorted = [...eligible].sort((a, b) => (a.price.unitPriceBeforeTaxMxn ?? 0) - (b.price.unitPriceBeforeTaxMxn ?? 0));
  const distinctPriceTiers = sorted.filter((product, index) => index === 0
    || product.price.unitPriceBeforeTaxMxn !== sorted[index - 1].price.unitPriceBeforeTaxMxn);
  if (!distinctPriceTiers.length) return [];
  if (distinctPriceTiers.length === 1) return [{ label: "Opción disponible", product: distinctPriceTiers[0] }];
  if (distinctPriceTiers.length === 2) return [{ label: "Económica", product: distinctPriceTiers[0] },
    { label: "Alternativa", product: distinctPriceTiers[1] }];
  return [
    { label: "Económica", product: distinctPriceTiers[0] },
    { label: "Recomendada", product: distinctPriceTiers[Math.floor((distinctPriceTiers.length - 1) / 2)] },
    { label: "Premium", product: distinctPriceTiers[distinctPriceTiers.length - 1] },
  ];
}

/** El mismo orden se usa para presentar tarjetas y resolver “la primera/segunda opción”. */
export function orderedProductOptions(products: AgentProduct[]): AgentProduct[] {
  const recommended = recommendProducts(products).map(({ product }) => product);
  const ids = new Set(recommended.map((product) => product.id));
  return [...recommended, ...products.filter((product) => product.state !== "rejected" && !ids.has(product.id))];
}
