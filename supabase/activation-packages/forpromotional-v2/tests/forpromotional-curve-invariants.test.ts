import { describe, expect, it } from "vitest";

const COST = 57.38;
const THRESHOLD_COSTS = [3041.14, 31042.58, 100013.34, 200026.68, 300040.02];
const REFERENCE_MULTIPLIERS = [74.52, 71.73, 69.98, 69.13, 66.72].map((price) => price / COST);
const EPSILON = 0.0000001;

function curvePrice(cost: number, quantity: number, qmin: number): number {
  const thresholds = THRESHOLD_COSTS.map((value) => Math.ceil(value / cost - 1e-9));
  let current = 0;
  thresholds.forEach((threshold, index) => {
    if (quantity >= threshold) current = index;
  });
  const discount = quantity === qmin
    ? 0
    : quantity < thresholds[4]
      ? 0.01 + EPSILON * Math.max(0, quantity - qmin - 1)
      : 0.01;
  let price = cost * REFERENCE_MULTIPLIERS[current] - discount;
  thresholds.forEach((threshold, index) => {
    if (threshold <= quantity) return;
    const futureDiscount = index === 4
      ? 0.01
      : 0.01 + EPSILON * Math.max(0, threshold - qmin - 1);
    const target = cost * REFERENCE_MULTIPLIERS[index] - futureDiscount;
    const cap = (threshold * target - (threshold - quantity) * cost * 1.05) / quantity;
    price = Math.min(price, cap);
  });
  return Math.round(price * 1_000_000) / 1_000_000;
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

describe("ForPromotional atomic candidate curve gate", () => {
  it.each([
    [54, 74.52], [100, 74.51], [500, 72.66], [541, 71.72],
    [1000, 71.72], [1743, 69.97], [3486, 69.12], [5000, 67.01],
    [5229, 66.71], [6000, 66.71],
  ])("reproduces the approved reference at %s pieces", (quantity, expected) => {
    expect(curvePrice(COST, quantity, 54)).toBeCloseTo(expected, 2);
  });

  it("keeps unit price non-increasing and rounded total non-decreasing for every quantity", () => {
    let previousUnit = Number.POSITIVE_INFINITY;
    let previousTotal = 0;
    for (let quantity = 54; quantity <= 20000; quantity += 1) {
      const unit = curvePrice(COST, quantity, 54);
      const total = money(quantity * unit);
      expect(unit).toBeLessThanOrEqual(previousUnit + 0.000001);
      expect(total).toBeGreaterThanOrEqual(previousTotal);
      expect(unit).toBeGreaterThanOrEqual(COST * 1.05);
      previousUnit = unit;
      previousTotal = total;
    }
  });

  it.each([10, 25, 57.38, 100, 250])("preserves invariants for cost %s", (cost) => {
    const qmin = Math.max(1, Math.ceil(4000 / (cost * REFERENCE_MULTIPLIERS[0]) - 1e-9));
    let previousUnit = Number.POSITIVE_INFINITY;
    let previousTotal = 0;
    for (let quantity = qmin; quantity <= qmin + 20000; quantity += 1) {
      const unit = curvePrice(cost, quantity, qmin);
      const total = money(quantity * unit);
      expect(unit).toBeLessThanOrEqual(previousUnit + 0.000001);
      expect(total).toBeGreaterThanOrEqual(previousTotal);
      expect(unit).toBeGreaterThanOrEqual(cost * 1.05);
      previousUnit = unit;
      previousTotal = total;
    }
  });
});
