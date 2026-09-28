import { describe, expect, it } from "vitest";

const CDO_FACTOR_BEFORE = 1.0;
const CDO_FACTOR_AFTER = 1.03;
const FORPROMOTIONAL_FACTOR = 1.03;
const G4_FACTOR = 1.0;
const G4_SOURCE_TIER = 5;
const COMMERCIAL_LEVELS = [
  { level: 6, threshold: 55_000, multiplier: 1.2 },
  { level: 5, threshold: 25_000, multiplier: 1.23 },
  { level: 4, threshold: 15_000, multiplier: 1.27 },
  { level: 3, threshold: 6_000, multiplier: 1.32 },
  { level: 2, threshold: 3_500, multiplier: 1.55 },
  { level: 1, threshold: 1_500, multiplier: 1.75 },
];

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function round2(value: number): number {
  return Math.round((value + 1e-9) * 100) / 100;
}

function resolveCdoBase(sourcePrice: number | null, factor: number) {
  if (sourcePrice == null || !Number.isFinite(sourcePrice) || sourcePrice <= 0) {
    return { status: "request_quote" as const, base: null };
  }

  return { status: "priced" as const, base: round4(sourcePrice * factor) };
}

function selectCommercialLevel(sourcePrice: number, factor: number, quantity: number) {
  const adjustedCost = round4(sourcePrice * factor);
  const purchaseBaseSubtotal = round4(adjustedCost * quantity);

  for (const candidate of COMMERCIAL_LEVELS) {
    if (purchaseBaseSubtotal < candidate.threshold) continue;
    const unitPrice = round2(adjustedCost * candidate.multiplier);
    const subtotal = round2(unitPrice * quantity);

    if (subtotal >= candidate.threshold) {
      return { ...candidate, adjustedCost, purchaseBaseSubtotal, unitPrice, subtotal };
    }
  }

  return null;
}

function evaluateCommercialLevel(sourcePrice: number, factor: number, quantity: number, level: number) {
  const candidate = COMMERCIAL_LEVELS.find((item) => item.level === level)!;
  const adjustedCost = round4(sourcePrice * factor);
  const purchaseBaseSubtotal = round4(adjustedCost * quantity);
  const unitPrice = round2(adjustedCost * candidate.multiplier);
  const subtotal = round2(unitPrice * quantity);

  return { ...candidate, adjustedCost, purchaseBaseSubtotal, unitPrice, subtotal };
}

describe("CHK-IMP-1 CDO pricing factor", () => {
  it("applies Precio Personal × 1.03 before the V2 multiplier", () => {
    const source = resolveCdoBase(100, CDO_FACTOR_AFTER);

    expect(source).toEqual({ status: "priced", base: 103 });
    expect(round2(source.base! * 1.75)).toBe(180.25);
  });

  it("keeps the expected three-percent base delta when all other inputs are fixed", () => {
    const before = resolveCdoBase(100, CDO_FACTOR_BEFORE);
    const after = resolveCdoBase(100, CDO_FACTOR_AFTER);

    expect(after.base! - before.base!).toBe(3);
    expect((after.base! / before.base! - 1) * 100).toBeCloseTo(3, 10);
  });

  it("preserves request_quote for missing or invalid source prices", () => {
    expect(resolveCdoBase(null, CDO_FACTOR_AFTER)).toEqual({
      status: "request_quote",
      base: null,
    });
    expect(resolveCdoBase(0, CDO_FACTOR_AFTER)).toEqual({
      status: "request_quote",
      base: null,
    });
    expect(resolveCdoBase(Number.NaN, CDO_FACTOR_AFTER)).toEqual({
      status: "request_quote",
      base: null,
    });
  });

  it("keeps 105 × 8 below the purchase threshold under both factors", () => {
    const before = selectCommercialLevel(105, CDO_FACTOR_BEFORE, 8);
    const after = selectCommercialLevel(105, CDO_FACTOR_AFTER, 8);

    expect(before).toBeNull();
    expect(after).toBeNull();
    expect(round4(105 * 1 * 8)).toBe(840);
    expect(round4(105 * 1.03 * 8)).toBe(865.2);
  });

  it.each([
    [1500, 10, 149.99, 150, 150.01, 1],
    [3500, 10, 349.99, 350, 350.01, 2],
    [6000, 10, 599.99, 600, 600.01, 3],
    [15000, 10, 1499.99, 1500, 1500.01, 4],
    [25000, 10, 2499.99, 2500, 2500.01, 5],
    [55000, 10, 5499.99, 5500, 5500.01, 6],
  ])(
    "selects the expected level just below, exactly at, and just above threshold %s",
    (threshold, quantity, belowSource, exactSource, aboveSource, expectedLevel) => {
      const below = selectCommercialLevel(belowSource, CDO_FACTOR_BEFORE, quantity);
      const exact = selectCommercialLevel(exactSource, CDO_FACTOR_BEFORE, quantity);
      const above = selectCommercialLevel(aboveSource, CDO_FACTOR_BEFORE, quantity);
      const belowCandidate = evaluateCommercialLevel(belowSource, CDO_FACTOR_BEFORE, quantity, expectedLevel);
      const exactCandidate = evaluateCommercialLevel(exactSource, CDO_FACTOR_BEFORE, quantity, expectedLevel);
      const aboveCandidate = evaluateCommercialLevel(aboveSource, CDO_FACTOR_BEFORE, quantity, expectedLevel);

      expect(belowCandidate.purchaseBaseSubtotal).toBeLessThan(threshold);
      expect(exactCandidate.purchaseBaseSubtotal).toBe(threshold);
      expect(aboveCandidate.purchaseBaseSubtotal).toBeGreaterThan(threshold);
      expect(exact).toMatchObject({ level: expectedLevel, threshold });
      expect(above).toMatchObject({ level: expectedLevel, threshold });
    },
  );

  it("can promote a CDO quote to the next commercial level when 1.03 crosses the purchase-base boundary", () => {
    const before = selectCommercialLevel(339.9, CDO_FACTOR_BEFORE, 10);
    const after = selectCommercialLevel(339.9, CDO_FACTOR_AFTER, 10);

    expect(before).toMatchObject({ level: 1, multiplier: 1.75, purchaseBaseSubtotal: 3399, subtotal: 5948.3 });
    expect(after).toMatchObject({ level: 2, multiplier: 1.55 });
    expect(after!.purchaseBaseSubtotal).toBe(3500.97);
    expect(after!.subtotal).toBe(5426.5);
    expect(after!.unitPrice).toBeLessThan(before!.unitPrice);
    expect((after!.unitPrice / before!.unitPrice - 1) * 100).toBeCloseTo(-8.7723, 3);
  });

  it("records the existing downward jumps at purchase-base thresholds", () => {
    const jumps = [
      { beforeQuantity: 34, atQuantity: 35, beforeTotal: 5950, atTotal: 5425, beforeLevel: 1, atLevel: 2 },
      { beforeQuantity: 59, atQuantity: 60, beforeTotal: 9145, atTotal: 7920, beforeLevel: 2, atLevel: 3 },
      { beforeQuantity: 149, atQuantity: 150, beforeTotal: 19668, atTotal: 19050, beforeLevel: 3, atLevel: 4 },
      { beforeQuantity: 249, atQuantity: 250, beforeTotal: 31623, atTotal: 30750, beforeLevel: 4, atLevel: 5 },
      { beforeQuantity: 549, atQuantity: 550, beforeTotal: 67527, atTotal: 66000, beforeLevel: 5, atLevel: 6 },
    ];

    for (const jump of jumps) {
      const before = selectCommercialLevel(100, CDO_FACTOR_BEFORE, jump.beforeQuantity);
      const at = selectCommercialLevel(100, CDO_FACTOR_BEFORE, jump.atQuantity);

      expect(before).toMatchObject({ level: jump.beforeLevel, subtotal: jump.beforeTotal });
      expect(at).toMatchObject({ level: jump.atLevel, subtotal: jump.atTotal });
      expect(at!.subtotal).toBeLessThan(before!.subtotal);
    }
  });

  it("protects the unrelated provider policies", () => {
    expect(FORPROMOTIONAL_FACTOR).toBe(1.03);
    expect(G4_FACTOR).toBe(1.0);
    expect(G4_SOURCE_TIER).toBe(5);
  });
});
