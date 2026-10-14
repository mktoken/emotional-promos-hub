import { describe, expect, it } from "vitest";
import {
  normalizeProductIds,
  resolveTargetProductIds,
  shouldPersistGeneration,
  takeTargetProductBatch,
  targetOffsetAfterCursor,
} from "../../supabase/functions/recompute-catalog-price-cache-v2/targeted";

describe("CHK-CDO-01J-A targeted Pricing V2 selection", () => {
  const first = "00000000-0000-4000-8000-000000000001";
  const second = "00000000-0000-4000-8000-000000000002";
  const missing = "00000000-0000-4000-8000-000000000003";

  it("deduplicates IDs and preserves deterministic ordering", () => {
    expect(normalizeProductIds([second, first, second])).toEqual([first, second]);
  });

  it("reports nonexistent IDs and never widens the target set", () => {
    expect(resolveTargetProductIds([second, first, second, missing], [first, second])).toEqual({
      uniqueIds: [first, second, missing],
      validIds: [first, second],
      missingIds: [missing],
    });
    expect(takeTargetProductBatch([first, second], 0, 1)).toEqual([first]);
    expect(takeTargetProductBatch([first, second], 1, 1)).toEqual([second]);
    expect(targetOffsetAfterCursor([first, second], first)).toBe(1);
    expect(targetOffsetAfterCursor([first, second], null)).toBe(0);
  });

  it("keeps targeted dry_run zero-write and shadow_write generation-backed", () => {
    expect(shouldPersistGeneration("dry_run", true)).toBe(false);
    expect(shouldPersistGeneration("shadow_write", true)).toBe(true);
    expect(shouldPersistGeneration("dry_run", false)).toBe(true);
  });
});
