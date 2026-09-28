/**
 * Pure, repository-only simulator for the Mexico Conversion Pricing proposal.
 *
 * This module deliberately has no Supabase, network, route, cache, or release
 * dependency. It is a shadow comparator and is not the authority for public
 * pricing. Callers provide the adjusted cost so provider-specific rules (for
 * example CDO x1.03 or ForPromotional x1.03) cannot be applied twice here.
 */

export type PricingRegime = "SMALL_ORDER" | "MARKET_AWARE" | "ENTERPRISE";

export type MarketStatus =
  | "SUFFICIENT_DATA"
  | "INSUFFICIENT_DATA"
  | "NO_DATA";

export type CompetitiveStatus =
  | "COMPETITIVE"
  | "VERY_COMPETITIVE"
  | "ABOVE_MARKET"
  | "NOT_COMPETITIVE"
  | "NO_MARKET_DATA"
  | "BELOW_MINIMUM";

export type MinimumRule =
  | "PURCHASE_BASE"
  | "MINIMUM_CONTRIBUTION"
  | "SELF_SERVICE";

export type StockStatus =
  | "IN_STOCK"
  | "AVAILABLE"
  | "LIMITED"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE"
  | (string & {});

export interface BenchmarkObservation {
  competitor: string;
  sku: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  iva_included: boolean;
  print_included: boolean;
  shipping_included: boolean;
  stock_status: StockStatus;
  observed_at: string;
  source_url?: string | null;
  notes?: string | null;
  normalized_unit_price?: number | null;
}

export const INITIAL_BENCHMARK_COMPETITORS = [
  "Compudat",
  "Smart Promocionales",
  "Artículos Promocionales de México",
  "TodoPromocional",
] as const;

/** Shape reserved for later outcome telemetry; it is not persisted here. */
export interface ConversionPricingTelemetry {
  quoted_price?: number | null;
  benchmark_position?: number | null;
  requested_discount?: number | null;
  final_price?: number | null;
  won?: boolean | null;
  lost?: boolean | null;
  loss_reason?: string | null;
  gross_profit?: number | null;
  lead_source?: string | null;
}

export interface BenchmarkContext {
  sku: string;
  quantity: number;
  asOf: string;
  expectedIvaIncluded?: boolean;
  maxObservationAgeDays?: number;
  acceptableStockStatuses?: string[];
}

export interface NormalizedBenchmarkObservation
  extends BenchmarkObservation {
  normalized_unit_price: number;
}

export interface ExcludedBenchmarkObservation {
  observation: BenchmarkObservation;
  reason: string;
}

export interface BenchmarkNormalizationResult {
  comparable: NormalizedBenchmarkObservation[];
  excluded: ExcludedBenchmarkObservation[];
}

export interface CorridorPercentiles {
  low: number;
  target: number;
  high: number;
}

export interface ConversionPricingConfig {
  smallOrderStartPurchase: number;
  smallOrderEndPurchase: number;
  enterpriseStartPurchase: number;
  transitionStart: number;
  transitionEnd: number;
  smallOrderStartMargin: number;
  smallOrderEndMargin: number;
  marketAwareTargetMargin: number;
  enterpriseTargetMargin: number;
  marketWeightMax: number;
  minimumMarketObservations: number;
  corridorPercentiles: CorridorPercentiles;
  profitabilityFloorMargin?: number;
  acceptableStockStatuses: string[];
}

export type ConversionPricingConfigOverrides = Partial<
  Omit<ConversionPricingConfig, "corridorPercentiles" | "acceptableStockStatuses">
> & {
  corridorPercentiles?: Partial<CorridorPercentiles>;
  acceptableStockStatuses?: string[];
};

/**
 * These values are technical simulation defaults, not an approved permanent
 * commercial policy. Business activation requires a later checkpoint.
 */
export const DEFAULT_CONVERSION_PRICING_CONFIG: ConversionPricingConfig = {
  smallOrderStartPurchase: 1_500,
  smallOrderEndPurchase: 5_000,
  enterpriseStartPurchase: 55_000,
  transitionStart: 4_500,
  transitionEnd: 7_500,
  smallOrderStartMargin: 0.4286,
  smallOrderEndMargin: 0.4,
  marketAwareTargetMargin: 0.4,
  enterpriseTargetMargin: 0.4,
  marketWeightMax: 1,
  minimumMarketObservations: 3,
  corridorPercentiles: { low: 0.25, target: 0.5, high: 0.75 },
  profitabilityFloorMargin: undefined,
  acceptableStockStatuses: ["IN_STOCK", "AVAILABLE", "LIMITED"],
};

export interface MarketReference {
  market_status: MarketStatus;
  market_observation_count: number;
  market_minimum: number | null;
  market_p25: number | null;
  market_median: number | null;
  market_p75: number | null;
  market_maximum: number | null;
  competitive_low: number | null;
  competitive_target: number | null;
  competitive_high: number | null;
  normalized_observations: NormalizedBenchmarkObservation[];
  excluded_observations: ExcludedBenchmarkObservation[];
}

export interface ConversionPricingInput {
  sourceCost: number;
  /**
   * Optional trace value only. If adjustedCost is supplied, this module does
   * not apply providerFactor again.
   */
  providerFactor?: number;
  adjustedCost?: number;
  quantity: number;
  sku?: string;
  benchmarkObservations?: BenchmarkObservation[];
  benchmarkContext?: BenchmarkContext;
  currentV2?: {
    unitPrice: number;
    total: number;
  };
  config?: ConversionPricingConfigOverrides;
}

export interface ConversionPricingResult {
  source_cost: number;
  provider_factor: number;
  adjusted_cost: number;
  quantity: number;
  purchase_base: number;
  minimum_rule: MinimumRule;
  minimum_purchase_base: number;
  regime: PricingRegime;
  enterprise_eligible: boolean;
  target_margin: number;
  internal_unit_price: number;
  market_status: MarketStatus;
  market_observation_count: number;
  market_minimum: number | null;
  market_p25: number | null;
  market_median: number | null;
  market_p75: number | null;
  market_maximum: number | null;
  market_target: number | null;
  competitive_low: number | null;
  competitive_target: number | null;
  competitive_high: number | null;
  market_weight: number;
  market_adjustment_applied: boolean;
  profitability_floor: number | null;
  recommended_unit_price: number | null;
  recommended_total: number | null;
  effective_markup: number | null;
  effective_margin: number | null;
  gross_profit: number | null;
  discount_headroom: number | null;
  competitive_status: CompetitiveStatus;
  current_v2_unit_price: number | null;
  current_v2_total: number | null;
  delta_vs_current_v2_unit_price: number | null;
  delta_vs_current_v2_total: number | null;
  shadow_only: true;
  normalization: BenchmarkNormalizationResult;
}

export function mergeConversionPricingConfig(
  overrides: ConversionPricingConfigOverrides = {},
): ConversionPricingConfig {
  const config: ConversionPricingConfig = {
    ...DEFAULT_CONVERSION_PRICING_CONFIG,
    ...overrides,
    corridorPercentiles: {
      ...DEFAULT_CONVERSION_PRICING_CONFIG.corridorPercentiles,
      ...overrides.corridorPercentiles,
    },
    acceptableStockStatuses:
      overrides.acceptableStockStatuses ??
      DEFAULT_CONVERSION_PRICING_CONFIG.acceptableStockStatuses,
  };

  validateConfig(config);
  return config;
}

function validateConfig(config: ConversionPricingConfig): void {
  const increasing = [
    config.smallOrderStartPurchase,
    config.smallOrderEndPurchase,
    config.enterpriseStartPurchase,
  ];

  if (!increasing.every(Number.isFinite)) {
    throw new Error("Purchase-base thresholds must be finite numbers");
  }
  if (
    config.smallOrderStartPurchase <= 0 ||
    config.smallOrderStartPurchase >= config.smallOrderEndPurchase ||
    config.smallOrderEndPurchase >= config.enterpriseStartPurchase
  ) {
    throw new Error("Purchase-base thresholds must be strictly increasing");
  }
  if (
    config.transitionStart > config.transitionEnd ||
    config.transitionStart < 0
  ) {
    throw new Error("Transition bounds are invalid");
  }
  if (
    config.marketWeightMax < 0 ||
    config.marketWeightMax > 1 ||
    config.minimumMarketObservations < 1
  ) {
    throw new Error("Market transition configuration is invalid");
  }

  for (const margin of [
    config.smallOrderStartMargin,
    config.smallOrderEndMargin,
    config.marketAwareTargetMargin,
    config.enterpriseTargetMargin,
    config.profitabilityFloorMargin,
  ]) {
    if (margin !== undefined && (margin < 0 || margin >= 1)) {
      throw new Error("Margins must be between 0 and 1");
    }
  }

  const { low, target, high } = config.corridorPercentiles;
  if (
    low < 0 ||
    target < low ||
    high < target ||
    high > 1
  ) {
    throw new Error("Competitive corridor percentiles are invalid");
  }
}

export function normalizeBenchmarkObservations(
  observations: BenchmarkObservation[],
  context: BenchmarkContext,
  config: ConversionPricingConfig = DEFAULT_CONVERSION_PRICING_CONFIG,
): BenchmarkNormalizationResult {
  const expectedIvaIncluded = context.expectedIvaIncluded ?? false;
  const acceptableStockStatuses = new Set(
    context.acceptableStockStatuses ?? config.acceptableStockStatuses,
  );
  const asOfTime = Date.parse(context.asOf);
  const maxAgeMs =
    context.maxObservationAgeDays === undefined
      ? undefined
      : context.maxObservationAgeDays * 24 * 60 * 60 * 1000;
  const comparable: NormalizedBenchmarkObservation[] = [];
  const excluded: ExcludedBenchmarkObservation[] = [];

  for (const observation of observations) {
    const observedTime = Date.parse(observation.observed_at);
    let reason: string | null = null;

    if (observation.sku !== context.sku) reason = "SKU_MISMATCH";
    else if (observation.currency.toUpperCase() !== "MXN")
      reason = "CURRENCY_NOT_MXN";
    else if (observation.quantity !== context.quantity)
      reason = "QUANTITY_NOT_COMPARABLE";
    else if (observation.iva_included !== expectedIvaIncluded)
      reason = "IVA_TREATMENT_MISMATCH";
    else if (observation.print_included) reason = "PRINT_INCLUDED";
    else if (observation.shipping_included) reason = "SHIPPING_INCLUDED";
    else if (!acceptableStockStatuses.has(observation.stock_status))
      reason = "STOCK_NOT_REASONABLE";
    else if (!Number.isFinite(observedTime)) reason = "OBSERVATION_DATE_INVALID";
    else if (Number.isFinite(asOfTime) && observedTime > asOfTime)
      reason = "OBSERVATION_IN_THE_FUTURE";
    else if (
      maxAgeMs !== undefined &&
      Number.isFinite(asOfTime) &&
      asOfTime - observedTime > maxAgeMs
    )
      reason = "OBSERVATION_EXPIRED";
    else if (!Number.isFinite(observation.unit_price) || observation.unit_price <= 0)
      reason = "UNIT_PRICE_INVALID";

    if (reason) {
      excluded.push({ observation, reason });
      continue;
    }

    const normalizedUnitPrice =
      observation.normalized_unit_price ?? observation.unit_price;
    if (!Number.isFinite(normalizedUnitPrice) || normalizedUnitPrice <= 0) {
      excluded.push({ observation, reason: "NORMALIZED_UNIT_PRICE_INVALID" });
      continue;
    }

    comparable.push({
      ...observation,
      normalized_unit_price: normalizedUnitPrice,
    });
  }

  return { comparable, excluded };
}

export function buildMarketReference(
  observations: BenchmarkObservation[],
  context: BenchmarkContext | undefined,
  config: ConversionPricingConfig = DEFAULT_CONVERSION_PRICING_CONFIG,
): MarketReference {
  if (!context) {
    return emptyMarketReference("NO_DATA");
  }

  const normalization = normalizeBenchmarkObservations(
    observations,
    context,
    config,
  );
  const comparable = normalization.comparable;
  const values = comparable
    .map((observation) => observation.normalized_unit_price)
    .sort((a, b) => a - b);
  const count = values.length;
  const status: MarketStatus =
    count === 0
      ? "NO_DATA"
      : count < config.minimumMarketObservations
        ? "INSUFFICIENT_DATA"
        : "SUFFICIENT_DATA";

  if (count === 0) {
    return {
      ...emptyMarketReference(status),
      normalized_observations: comparable,
      excluded_observations: normalization.excluded,
    };
  }

  const { low, target, high } = config.corridorPercentiles;
  const reference = {
    market_status: status,
    market_observation_count: count,
    market_minimum: values[0],
    market_p25: percentile(values, 0.25),
    market_median: percentile(values, 0.5),
    market_p75: percentile(values, 0.75),
    market_maximum: values[count - 1],
    competitive_low: percentile(values, low),
    competitive_target: percentile(values, target),
    competitive_high: percentile(values, high),
    normalized_observations: comparable,
    excluded_observations: normalization.excluded,
  };

  return reference;
}

function emptyMarketReference(status: MarketStatus): MarketReference {
  return {
    market_status: status,
    market_observation_count: 0,
    market_minimum: null,
    market_p25: null,
    market_median: null,
    market_p75: null,
    market_maximum: null,
    competitive_low: null,
    competitive_target: null,
    competitive_high: null,
    normalized_observations: [],
    excluded_observations: [],
  };
}

function percentile(values: number[], position: number): number {
  if (values.length === 1) return values[0];
  const index = (values.length - 1) * position;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

export function calculateMarketWeight(
  purchaseBase: number,
  config: ConversionPricingConfig = DEFAULT_CONVERSION_PRICING_CONFIG,
): number {
  if (purchaseBase <= config.transitionStart) return 0;
  if (purchaseBase >= config.transitionEnd) return config.marketWeightMax;
  const span = config.transitionEnd - config.transitionStart;
  if (span === 0) return config.marketWeightMax;
  return (
    ((purchaseBase - config.transitionStart) / span) * config.marketWeightMax
  );
}

export function calculateTargetMargin(
  purchaseBase: number,
  config: ConversionPricingConfig = DEFAULT_CONVERSION_PRICING_CONFIG,
): number {
  if (purchaseBase <= config.smallOrderStartPurchase) {
    return config.smallOrderStartMargin;
  }
  if (purchaseBase < config.smallOrderEndPurchase) {
    const span = config.smallOrderEndPurchase - config.smallOrderStartPurchase;
    const progress =
      (purchaseBase - config.smallOrderStartPurchase) / span;
    return (
      config.smallOrderStartMargin +
      (config.smallOrderEndMargin - config.smallOrderStartMargin) * progress
    );
  }
  if (purchaseBase < config.enterpriseStartPurchase) {
    return config.marketAwareTargetMargin;
  }
  return config.enterpriseTargetMargin;
}

function resolveRegime(
  purchaseBase: number,
  config: ConversionPricingConfig,
): PricingRegime {
  if (purchaseBase < config.smallOrderEndPurchase) return "SMALL_ORDER";
  if (purchaseBase < config.enterpriseStartPurchase) return "MARKET_AWARE";
  return "ENTERPRISE";
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundUnit(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

export function calculateConversionPricingShadow(
  input: ConversionPricingInput,
): ConversionPricingResult {
  const config = mergeConversionPricingConfig(input.config);
  assertPositiveFinite("sourceCost", input.sourceCost);
  assertPositiveFinite("quantity", input.quantity);

  const providerFactor = input.providerFactor ?? 1;
  assertPositiveFinite("providerFactor", providerFactor);
  const adjustedCost = input.adjustedCost ?? input.sourceCost * providerFactor;
  assertPositiveFinite("adjustedCost", adjustedCost);

  const purchaseBase = adjustedCost * input.quantity;
  const regime = resolveRegime(purchaseBase, config);
  const enterpriseEligible =
    purchaseBase >= config.enterpriseStartPurchase;
  const targetMargin = calculateTargetMargin(purchaseBase, config);
  const internalUnitPrice = adjustedCost / (1 - targetMargin);
  const marketReference = buildMarketReference(
    input.benchmarkObservations ?? [],
    input.benchmarkContext,
    config,
  );
  const marketWeight = calculateMarketWeight(purchaseBase, config);
  const marketAvailable = marketReference.market_status === "SUFFICIENT_DATA";
  const marketTarget = marketReference.competitive_target;
  const marketAdjustmentApplied =
    marketAvailable && marketTarget !== null && marketWeight > 0;
  const hybridUnitPrice =
    marketAdjustmentApplied && marketTarget !== null
      ? (1 - marketWeight) * internalUnitPrice + marketWeight * marketTarget
      : internalUnitPrice;
  const profitabilityFloor =
    config.profitabilityFloorMargin === undefined
      ? null
      : roundUnit(adjustedCost / (1 - config.profitabilityFloorMargin));
  const recommendedUnitPrice =
    purchaseBase < config.smallOrderStartPurchase
      ? null
      : roundUnit(
          profitabilityFloor === null
            ? hybridUnitPrice
            : Math.max(profitabilityFloor, hybridUnitPrice),
        );
  const recommendedTotal =
    recommendedUnitPrice === null
      ? null
      : roundCurrency(recommendedUnitPrice * input.quantity);
  const floorAboveMarket =
    profitabilityFloor !== null &&
    marketReference.competitive_high !== null &&
    profitabilityFloor > marketReference.competitive_high;
  const competitiveStatus: CompetitiveStatus =
    purchaseBase < config.smallOrderStartPurchase
      ? "BELOW_MINIMUM"
      : floorAboveMarket
        ? "NOT_COMPETITIVE"
        : !marketAvailable || marketReference.competitive_high === null
          ? "NO_MARKET_DATA"
          : recommendedUnitPrice !== null &&
              marketReference.competitive_low !== null &&
              recommendedUnitPrice <= marketReference.competitive_low
            ? "VERY_COMPETITIVE"
            : recommendedUnitPrice !== null &&
                recommendedUnitPrice <= marketReference.competitive_high
              ? "COMPETITIVE"
              : "ABOVE_MARKET";
  const effectiveMarkup =
    recommendedUnitPrice === null
      ? null
      : recommendedUnitPrice / adjustedCost - 1;
  const grossProfit =
    recommendedTotal === null
      ? null
      : recommendedTotal - adjustedCost * input.quantity;
  const effectiveMargin =
    recommendedTotal === null || recommendedTotal === 0 || grossProfit === null
      ? null
      : grossProfit / recommendedTotal;
  const currentV2UnitPrice = input.currentV2?.unitPrice ?? null;
  const currentV2Total = input.currentV2?.total ?? null;
  const discountHeadroom =
    recommendedUnitPrice === null || profitabilityFloor === null
      ? null
      : Math.max(0, recommendedUnitPrice - profitabilityFloor);

  return {
    source_cost: input.sourceCost,
    provider_factor: providerFactor,
    adjusted_cost: adjustedCost,
    quantity: input.quantity,
    purchase_base: purchaseBase,
    minimum_rule: "PURCHASE_BASE",
    minimum_purchase_base: config.smallOrderStartPurchase,
    regime,
    enterprise_eligible: enterpriseEligible,
    target_margin: targetMargin,
    internal_unit_price: roundUnit(internalUnitPrice),
    market_status: marketReference.market_status,
    market_observation_count: marketReference.market_observation_count,
    market_minimum: marketReference.market_minimum,
    market_p25: marketReference.market_p25,
    market_median: marketReference.market_median,
    market_p75: marketReference.market_p75,
    market_maximum: marketReference.market_maximum,
    market_target: marketTarget,
    competitive_low: marketReference.competitive_low,
    competitive_target: marketReference.competitive_target,
    competitive_high: marketReference.competitive_high,
    market_weight: marketWeight,
    market_adjustment_applied: marketAdjustmentApplied,
    profitability_floor: profitabilityFloor,
    recommended_unit_price: recommendedUnitPrice,
    recommended_total: recommendedTotal,
    effective_markup: effectiveMarkup,
    effective_margin: effectiveMargin,
    gross_profit: grossProfit,
    discount_headroom: discountHeadroom,
    competitive_status: competitiveStatus,
    current_v2_unit_price: currentV2UnitPrice,
    current_v2_total: currentV2Total,
    delta_vs_current_v2_unit_price:
      recommendedUnitPrice === null || currentV2UnitPrice === null
        ? null
        : recommendedUnitPrice - currentV2UnitPrice,
    delta_vs_current_v2_total:
      recommendedTotal === null || currentV2Total === null
        ? null
        : recommendedTotal - currentV2Total,
    shadow_only: true,
    normalization: {
      comparable: marketReference.normalized_observations,
      excluded: marketReference.excluded_observations,
    },
  };
}
