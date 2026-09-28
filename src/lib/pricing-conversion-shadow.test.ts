import { describe, expect, it } from "vitest";
import {
  buildMarketReference,
  calculateConversionPricingShadow,
  calculateMarketWeight,
  DEFAULT_CONVERSION_PRICING_CONFIG,
  normalizeBenchmarkObservations,
} from "./pricing-conversion-shadow";
import type { BenchmarkObservation } from "./pricing-conversion-shadow";

function observation(
  unitPrice: number,
  overrides: Partial<BenchmarkObservation> = {},
): BenchmarkObservation {
  return {
    competitor: "Compudat",
    sku: "GOMA-QA",
    product_name: "Goma QA",
    quantity: 100,
    unit_price: unitPrice,
    currency: "MXN",
    iva_included: false,
    print_included: false,
    shipping_included: false,
    stock_status: "IN_STOCK",
    observed_at: "2026-09-27T12:00:00Z",
    source_url: "https://example.invalid/qa-observation",
    notes: "Controlled fixture; not a production observation",
    ...overrides,
  };
}

function shadow(quantity: number, overrides: Parameters<typeof calculateConversionPricingShadow>[0] = {}) {
  const input = {
    sourceCost: 1,
    quantity,
    ...overrides,
  };

  if (overrides.sourceCost === undefined && overrides.adjustedCost === undefined) {
    input.adjustedCost = 1;
  }

  return calculateConversionPricingShadow(input);
}

describe("Mexico conversion pricing shadow engine", () => {
  it("uses internal economics and remains shadow-only without a benchmark", () => {
    const result = shadow(1_500);

    expect(result.shadow_only).toBe(true);
    expect(result.purchase_base).toBe(1_500);
    expect(result.regime).toBe("SMALL_ORDER");
    expect(result.market_status).toBe("NO_DATA");
    expect(result.market_adjustment_applied).toBe(false);
    expect(result.competitive_status).toBe("NO_MARKET_DATA");
    expect(result.recommended_unit_price).toBeCloseTo(1.750088, 6);
    expect(result.recommended_total).toBeCloseTo(2_625.13, 2);
  });

  it("returns BELOW_MINIMUM without inventing a commercial recommendation", () => {
    const result = shadow(1_499.99);

    expect(result.competitive_status).toBe("BELOW_MINIMUM");
    expect(result.recommended_unit_price).toBeNull();
    expect(result.recommended_total).toBeNull();
    expect(result.minimum_rule).toBe("PURCHASE_BASE");
  });

  it("normalizes only comparable Mexican observations", () => {
    const observations = [
      observation(10),
      observation(20, { currency: "USD" }),
      observation(30, { print_included: true }),
      observation(40, { shipping_included: true }),
      observation(50, { quantity: 250 }),
      observation(60, { sku: "OTHER-SKU" }),
      observation(70, { iva_included: true }),
      observation(80, { stock_status: "OUT_OF_STOCK" }),
      observation(90, { observed_at: "2026-01-01T00:00:00Z" }),
    ];
    const normalized = normalizeBenchmarkObservations(
      observations,
      {
        sku: "GOMA-QA",
        quantity: 100,
        asOf: "2026-09-27T12:00:00Z",
        maxObservationAgeDays: 30,
      },
    );

    expect(normalized.comparable).toHaveLength(1);
    expect(normalized.comparable[0].normalized_unit_price).toBe(10);
    expect(normalized.excluded.map(({ reason }) => reason)).toEqual([
      "CURRENCY_NOT_MXN",
      "PRINT_INCLUDED",
      "SHIPPING_INCLUDED",
      "QUANTITY_NOT_COMPARABLE",
      "SKU_MISMATCH",
      "IVA_TREATMENT_MISMATCH",
      "STOCK_NOT_REASONABLE",
      "OBSERVATION_EXPIRED",
    ]);
  });

  it("computes market statistics and a configurable corridor", () => {
    const reference = buildMarketReference(
      [observation(100), observation(110), observation(120)],
      {
        sku: "GOMA-QA",
        quantity: 100,
        asOf: "2026-09-27T12:00:00Z",
      },
    );

    expect(reference.market_status).toBe("SUFFICIENT_DATA");
    expect(reference.market_observation_count).toBe(3);
    expect(reference.market_minimum).toBe(100);
    expect(reference.market_p25).toBe(105);
    expect(reference.market_median).toBe(110);
    expect(reference.market_p75).toBe(115);
    expect(reference.market_maximum).toBe(120);
    expect(reference.competitive_target).toBe(110);
  });

  it("falls back to internal economics when the benchmark is insufficient", () => {
    const result = shadow(5_000, {
      sku: "GOMA-QA",
      benchmarkContext: {
        sku: "GOMA-QA",
        quantity: 100,
        asOf: "2026-09-27T12:00:00Z",
      },
      benchmarkObservations: [observation(10), observation(11)],
    });

    expect(result.market_status).toBe("INSUFFICIENT_DATA");
    expect(result.market_adjustment_applied).toBe(false);
    expect(result.recommended_unit_price).toBeCloseTo(1.666667, 6);
  });

  it("applies the floor and exposes when it is above the competitive corridor", () => {
    const result = shadow(5_000, {
      sku: "GOMA-QA",
      config: { profitabilityFloorMargin: 0.9 },
      benchmarkContext: {
        sku: "GOMA-QA",
        quantity: 100,
        asOf: "2026-09-27T12:00:00Z",
      },
      benchmarkObservations: [
        observation(1),
        observation(1),
        observation(1),
      ],
    });

    expect(result.profitability_floor).toBe(10);
    expect(result.recommended_unit_price).toBe(10);
    expect(result.competitive_status).toBe("NOT_COMPETITIVE");
  });

  it("transitions market weight continuously from 4500 to 7500", () => {
    const config = DEFAULT_CONVERSION_PRICING_CONFIG;

    expect(calculateMarketWeight(4_499.99, config)).toBe(0);
    expect(calculateMarketWeight(4_500, config)).toBe(0);
    expect(calculateMarketWeight(4_500.01, config)).toBeCloseTo(0.000003333, 9);
    expect(calculateMarketWeight(7_499.99, config)).toBeCloseTo(0.999996667, 9);
    expect(calculateMarketWeight(7_500, config)).toBe(1);
    expect(calculateMarketWeight(7_500.01, config)).toBe(1);
  });

  it("has no arbitrary price cliffs at configured purchase-base boundaries", () => {
    const bases = [
      1_499.99,
      1_500,
      1_500.01,
      4_499.99,
      4_500,
      4_500.01,
      4_999.99,
      5_000,
      5_000.01,
      7_499.99,
      7_500,
      7_500.01,
      14_999.99,
      15_000,
      15_000.01,
      54_999.99,
      55_000,
      55_000.01,
    ];

    const results = bases.map((purchaseBase) => shadow(purchaseBase));

    expect(results[0].competitive_status).toBe("BELOW_MINIMUM");
    expect(results[1].competitive_status).toBe("NO_MARKET_DATA");
    expect(results[3].recommended_unit_price).toBeCloseTo(
      results[4].recommended_unit_price ?? 0,
      4,
    );
    expect(results[6].recommended_unit_price).toBeCloseTo(
      results[7].recommended_unit_price ?? 0,
      4,
    );
    expect(results[7].recommended_unit_price).toBeCloseTo(
      results[8].recommended_unit_price ?? 0,
      4,
    );
    expect(results[9].recommended_unit_price).toBeCloseTo(
      results[10].recommended_unit_price ?? 0,
      4,
    );
    expect(results[13].recommended_unit_price).toBeCloseTo(
      results[14].recommended_unit_price ?? 0,
      4,
    );
    expect(results[16].recommended_unit_price).toBeCloseTo(
      results[17].recommended_unit_price ?? 0,
      4,
    );
    expect(results[10].regime).toBe("MARKET_AWARE");
    expect(results[16].regime).toBe("ENTERPRISE");
    expect(results[16].enterprise_eligible).toBe(true);
  });

  it("is monotonic across dense quantity ranges without market data", () => {
    let previousUnit: number | null = null;
    let previousTotal: number | null = null;

    for (let quantity = 1_500; quantity <= 20_000; quantity += 1) {
      const result = shadow(quantity);
      expect(result.recommended_unit_price).not.toBeNull();
      expect(result.recommended_total).not.toBeNull();

      if (previousUnit !== null && previousTotal !== null) {
        expect(result.recommended_unit_price!).toBeLessThanOrEqual(
          previousUnit + 0.000001,
        );
        expect(result.recommended_total!).toBeGreaterThanOrEqual(
          previousTotal - 0.01,
        );
      }

      previousUnit = result.recommended_unit_price;
      previousTotal = result.recommended_total;
    }
  }, 15_000);

  it("keeps CDO and ForPromotional adjustments single-applied and never uses Legacy x1.35", () => {
    const cdoWithAdjustedCost = shadow(15, {
      sourceCost: 100,
      providerFactor: 1.03,
      adjustedCost: 103,
    });
    const cdoFromSource = shadow(15, {
      sourceCost: 100,
      providerFactor: 1.03,
    });
    const forPromotional = shadow(15, {
      sourceCost: 100,
      providerFactor: 1.03,
    });
    const legacyLikeInput = shadow(15, {
      sourceCost: 100,
      providerFactor: 1,
      adjustedCost: 100,
    });

    expect(cdoWithAdjustedCost.adjusted_cost).toBe(103);
    expect(cdoWithAdjustedCost.purchase_base).toBe(1_545);
    expect(cdoFromSource.adjusted_cost).toBe(103);
    expect(forPromotional.adjusted_cost).toBe(103);
    expect(legacyLikeInput.adjusted_cost).toBe(100);
    expect(legacyLikeInput.adjusted_cost).not.toBe(135);
  });

  it("keeps the current V2 comparison separate from the recommendation", () => {
    const result = shadow(1_500, {
      currentV2: { unitPrice: 2, total: 3_000 },
    });

    expect(result.current_v2_unit_price).toBe(2);
    expect(result.current_v2_total).toBe(3_000);
    expect(result.delta_vs_current_v2_unit_price).toBeCloseTo(-0.249912, 6);
    expect(result.delta_vs_current_v2_total).toBeCloseTo(-374.87, 2);
  });
});
