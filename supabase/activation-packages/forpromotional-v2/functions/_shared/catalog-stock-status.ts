export type StockSourceState = "active" | "inactive" | "unknown";
export type PriceState = "valid" | "manual_review" | "unavailable";
export type PublicStockStatus = "disponible" | "bajo" | "agotado" | "consultar";
export type QuoteMode = "cotizable" | "consultar_disponibilidad" | "no_cotizable";

export type StockSourceRow = {
  cantidad: number | string | null | undefined;
  updated_at: string | null | undefined;
};

export type DerivedCatalogStockStatus = {
  public_visible: boolean;
  stock_status: PublicStockStatus;
  stock_qty: number | null;
  quote_mode: QuoteMode;
  kit_eligible: boolean;
  price_valid: boolean;
  image_available: boolean;
  last_stock_sync_at: string | null;
};

function finiteNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestSourceTimestamp(rows: readonly StockSourceRow[]): string | null {
  let latest: { value: string; epoch: number } | null = null;

  for (const row of rows) {
    if (!row.updated_at) continue;
    const epoch = Date.parse(row.updated_at);
    if (!Number.isFinite(epoch)) continue;
    if (!latest || epoch > latest.epoch) {
      latest = { value: row.updated_at, epoch };
    }
  }

  return latest?.value ?? null;
}

/**
 * Single authority for the existing product-level stock rules.
 * It deliberately does not calculate or write pricing.
 */
export function deriveCatalogStockStatus(input: {
  sourceState: StockSourceState;
  sourceSufficient: boolean;
  stockRows: readonly StockSourceRow[];
  priceState: PriceState;
  imageAvailable: boolean;
}): DerivedCatalogStockStatus {
  const { sourceState, sourceSufficient, stockRows, priceState, imageAvailable } = input;
  const priceValid = priceState === "valid";
  const lastStockSyncAt = latestSourceTimestamp(stockRows);
  const stockQty = sourceSufficient
    ? stockRows.reduce((total, row) => total + finiteNumber(row.cantidad), 0)
    : null;

  if (sourceState === "inactive") {
    return {
      public_visible: false,
      stock_status: "agotado",
      stock_qty: stockQty,
      quote_mode: "no_cotizable",
      kit_eligible: false,
      price_valid: priceValid,
      image_available: imageAvailable,
      last_stock_sync_at: lastStockSyncAt,
    };
  }

  if (sourceState === "unknown" || !sourceSufficient) {
    return {
      public_visible: false,
      stock_status: "consultar",
      stock_qty: null,
      quote_mode: "consultar_disponibilidad",
      kit_eligible: false,
      price_valid: priceValid,
      image_available: imageAvailable,
      last_stock_sync_at: lastStockSyncAt,
    };
  }

  if (priceState === "unavailable") {
    return {
      public_visible: false,
      stock_status: "consultar",
      stock_qty: stockQty,
      quote_mode: "no_cotizable",
      kit_eligible: false,
      price_valid: false,
      image_available: imageAvailable,
      last_stock_sync_at: lastStockSyncAt,
    };
  }

  if (priceState === "manual_review") {
    return {
      public_visible: false,
      stock_status: "consultar",
      stock_qty: stockQty,
      quote_mode: "consultar_disponibilidad",
      kit_eligible: false,
      price_valid: false,
      image_available: imageAvailable,
      last_stock_sync_at: lastStockSyncAt,
    };
  }

  if (stockQty === 0) {
    return {
      public_visible: false,
      stock_status: "agotado",
      stock_qty: 0,
      quote_mode: "consultar_disponibilidad",
      kit_eligible: false,
      price_valid: true,
      image_available: imageAvailable,
      last_stock_sync_at: lastStockSyncAt,
    };
  }

  const lowStock = (stockQty ?? 0) < 50;
  return {
    public_visible: imageAvailable,
    stock_status: lowStock ? "bajo" : "disponible",
    stock_qty: stockQty,
    quote_mode: "cotizable",
    kit_eligible: imageAvailable,
    price_valid: true,
    image_available: imageAvailable,
    last_stock_sync_at: lastStockSyncAt,
  };
}

type SupabaseLike = {
  from: (table: string) => SupabaseLikeQuery;
};

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type SupabaseLikeQuery = {
  select: (...args: unknown[]) => SupabaseLikeQuery;
  in: (column: string, values: string[]) => SupabaseLikeQuery;
  eq: (column: string, value: unknown) => SupabaseLikeQuery;
  order: (column: string, options: { ascending: boolean }) => SupabaseLikeQuery;
  update: (values: Record<string, unknown>) => SupabaseLikeQuery;
  insert: (values: Record<string, unknown>) => SupabaseLikeQuery;
  then: PromiseLike<QueryResult>["then"];
};

type MappingRow = {
  producto_b2b_id: string;
  oferta_id: string;
  provider_code: string | null;
  id_interno: string | null;
};

type OfferRow = {
  id: string;
  provider_raw_product_id: string | null;
  imagen_url: string | null;
  activo: boolean | null;
};

type RawRow = {
  id: string;
  activo: boolean | null;
};

type ExistingStatusRow = DerivedCatalogStockStatus & {
  id: string;
  producto_b2b_id: string;
  id_interno: string | null;
  updated_at: string | null;
};

type MaterializerProductReport = {
  product_id: string;
  provider_codes: string[];
  affected_offer_ids: string[];
  current_stock_qty: number | null;
  computed_stock_qty: number | null;
  current_stock_status: string | null;
  computed_stock_status: PublicStockStatus;
  current_last_stock_sync_at: string | null;
  computed_last_stock_sync_at: string | null;
  changed: boolean;
};

export type MaterializerResult = {
  dry_run: boolean;
  affected_offer_ids: string[];
  affected_product_ids: string[];
  recomputed_product_ids: string[];
  failed_product_ids: string[];
  products: MaterializerProductReport[];
  errors: Array<{ product_id: string; message: string }>;
};

function statusChanged(
  current: ExistingStatusRow | undefined,
  computed: DerivedCatalogStockStatus,
): boolean {
  if (!current) return true;
  return [
    "public_visible",
    "stock_status",
    "stock_qty",
    "quote_mode",
    "kit_eligible",
    "price_valid",
    "image_available",
    "last_stock_sync_at",
  ].some((field) => current[field as keyof ExistingStatusRow] !== computed[field as keyof DerivedCatalogStockStatus]);
}

function toStatusWrite(
  computed: DerivedCatalogStockStatus,
  idInterno: string | null,
): Record<string, unknown> {
  return {
    id_interno: idInterno,
    public_visible: computed.public_visible,
    stock_status: computed.stock_status,
    stock_qty: computed.stock_qty,
    quote_mode: computed.quote_mode,
    kit_eligible: computed.kit_eligible,
    price_valid: computed.price_valid,
    image_available: computed.image_available,
    last_stock_sync_at: computed.last_stock_sync_at,
  };
}

/**
 * Recomputes only mapped products. With dryRun=true it performs no writes.
 * The caller supplies the affected product set discovered by a refresh batch.
 */
export async function recomputeProductStockStatus(
  sb: SupabaseLike,
  productIds: string[],
  options: { dryRun: boolean; affectedOfferIds?: string[] } = { dryRun: true },
): Promise<MaterializerResult> {
  const uniqueProductIds = [...new Set(productIds)].filter(Boolean);
  const result: MaterializerResult = {
    dry_run: options.dryRun,
    affected_offer_ids: [...new Set(options.affectedOfferIds ?? [])],
    affected_product_ids: uniqueProductIds,
    recomputed_product_ids: [],
    failed_product_ids: [],
    products: [],
    errors: [],
  };

  if (uniqueProductIds.length === 0) return result;

  try {
    const { data: mappings, error: mappingError } = await sb
      .from("producto_b2b_oferta_map")
      .select("producto_b2b_id, oferta_id, provider_code, id_interno")
      .in("producto_b2b_id", uniqueProductIds);
    if (mappingError) throw new Error(`mapping read failed: ${mappingError.message}`);

    const mappingRows = (mappings ?? []) as MappingRow[];
    const offerIds = [...new Set(mappingRows.map((row) => row.oferta_id).filter(Boolean))];
    const { data: offers, error: offerError } = offerIds.length > 0
      ? await sb.from("producto_proveedor_ofertas").select("id, provider_raw_product_id, imagen_url, activo").in("id", offerIds)
      : { data: [], error: null };
    if (offerError) throw new Error(`offer read failed: ${offerError.message}`);

    const offerRows = (offers ?? []) as OfferRow[];
    const rawIds = [...new Set(offerRows.map((row) => row.provider_raw_product_id).filter((id): id is string => Boolean(id)))];
    const { data: rawProducts, error: rawError } = rawIds.length > 0
      ? await sb.from("provider_raw_products").select("id, activo").in("id", rawIds)
      : { data: [], error: null };
    if (rawError) throw new Error(`raw read failed: ${rawError.message}`);

    const { data: stockRows, error: stockError } = offerIds.length > 0
      ? await sb.from("producto_proveedor_stock").select("oferta_id, cantidad, updated_at").in("oferta_id", offerIds)
      : { data: [], error: null };
    if (stockError) throw new Error(`stock read failed: ${stockError.message}`);

    const { data: statuses, error: statusError } = await sb
      .from("producto_b2b_status")
      .select("id, producto_b2b_id, id_interno, public_visible, stock_status, stock_qty, quote_mode, kit_eligible, price_valid, image_available, last_stock_sync_at, updated_at")
      .in("producto_b2b_id", uniqueProductIds)
      .order("updated_at", { ascending: false });
    if (statusError) throw new Error(`status read failed: ${statusError.message}`);

    const offerById = new Map(offerRows.map((row) => [row.id, row]));
    const rawRows = (rawProducts ?? []) as RawRow[];
    const rawById = new Map(rawRows.map((row) => [row.id, row]));
    const stockByOffer = new Map<string, StockSourceRow[]>();
    for (const row of (stockRows ?? []) as Array<{ oferta_id: string; cantidad: number | string | null; updated_at: string | null }>) {
      const current = stockByOffer.get(row.oferta_id) ?? [];
      current.push({ cantidad: row.cantidad, updated_at: row.updated_at });
      stockByOffer.set(row.oferta_id, current);
    }

    const statusByProduct = new Map<string, ExistingStatusRow>();
    for (const row of (statuses ?? []) as ExistingStatusRow[]) {
      if (!statusByProduct.has(row.producto_b2b_id)) statusByProduct.set(row.producto_b2b_id, row);
    }

    for (const productId of uniqueProductIds) {
      try {
        const productMappings = mappingRows.filter((row) => row.producto_b2b_id === productId);
        const mappedOfferIds = [...new Set(productMappings.map((row) => row.oferta_id).filter(Boolean))];
        const sourceRows = productMappings.map((mapping) => {
          const offer = offerById.get(mapping.oferta_id);
          const raw = offer?.provider_raw_product_id
            ? rawById.get(offer.provider_raw_product_id)
            : undefined;
          return { mapping, offer, raw };
        });
        const knownSources = sourceRows.filter((row) => row.offer && row.raw);
        const activeSources = knownSources.filter((row) => row.offer?.activo !== false && row.raw?.activo !== false);
        const sourceState: StockSourceState = knownSources.length === 0
          ? "unknown"
          : activeSources.length > 0
          ? "active"
          : "inactive";
        const activeOfferIds = activeSources.map((row) => row.offer!.id);
        const productStockRows = activeOfferIds.flatMap((offerId) => stockByOffer.get(offerId) ?? []);
        const current = statusByProduct.get(productId);
        const imageAvailable = current?.image_available ?? activeSources.some((row) => Boolean(row.offer?.imagen_url));
        const priceState: PriceState = current?.price_valid
          ? "valid"
          : current?.quote_mode === "no_cotizable"
          ? "unavailable"
          : "manual_review";
        const computed = deriveCatalogStockStatus({
          sourceState,
          sourceSufficient: sourceState === "active" && productStockRows.length > 0,
          stockRows: productStockRows,
          priceState,
          imageAvailable,
        });
        const changed = statusChanged(current, computed);
        const providerCodes = [...new Set(productMappings.map((row) => row.provider_code).filter((code): code is string => Boolean(code)))];

        result.products.push({
          product_id: productId,
          provider_codes: providerCodes,
          affected_offer_ids: mappedOfferIds,
          current_stock_qty: current?.stock_qty ?? null,
          computed_stock_qty: computed.stock_qty,
          current_stock_status: current?.stock_status ?? null,
          computed_stock_status: computed.stock_status,
          current_last_stock_sync_at: current?.last_stock_sync_at ?? null,
          computed_last_stock_sync_at: computed.last_stock_sync_at,
          changed,
        });

        if (options.dryRun || !changed) continue;
        const write = toStatusWrite(computed, current?.id_interno ?? productMappings[0]?.id_interno ?? null);
        if (current) {
          const { error } = await sb.from("producto_b2b_status").update(write).eq("id", current.id);
          if (error) throw new Error(`status update failed: ${error.message}`);
        } else {
          const { error } = await sb.from("producto_b2b_status").insert({
            producto_b2b_id: productId,
            ...write,
          });
          if (error) throw new Error(`status insert failed: ${error.message}`);
        }
        result.recomputed_product_ids.push(productId);
      } catch (error) {
        result.failed_product_ids.push(productId);
        result.errors.push({
          product_id: productId,
          message: error instanceof Error ? error.message.slice(0, 300) : "unknown_error",
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "unknown_error";
    result.failed_product_ids = uniqueProductIds;
    result.errors.push({ product_id: "*", message });
  }

  return result;
}
