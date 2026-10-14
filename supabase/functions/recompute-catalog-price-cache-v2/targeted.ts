export const TARGET_PRODUCT_IDS_MAX = 5_000;

export function normalizeProductIds(productIds: readonly string[] | undefined): string[] | null {
  if (!productIds) return null;
  return [...new Set(productIds)].sort();
}

export function resolveTargetProductIds(
  requestedIds: readonly string[],
  existingIds: readonly string[],
): { uniqueIds: string[]; validIds: string[]; missingIds: string[] } {
  const uniqueIds = normalizeProductIds(requestedIds) ?? [];
  const existing = new Set(existingIds);
  const validIds = uniqueIds.filter((id) => existing.has(id));
  const missingIds = uniqueIds.filter((id) => !existing.has(id));
  return { uniqueIds, validIds, missingIds };
}

export function takeTargetProductBatch(
  productIds: readonly string[],
  offset: number,
  batchSize: number,
): string[] {
  return productIds.slice(offset, offset + batchSize);
}

export function targetOffsetAfterCursor(productIds: readonly string[], cursor: string | null): number {
  if (!cursor) return 0;
  const nextIndex = productIds.findIndex((productId) => productId > cursor);
  return nextIndex === -1 ? productIds.length : nextIndex;
}

export function shouldPersistGeneration(mode: "dry_run" | "shadow_write", targeted: boolean): boolean {
  return !targeted || mode === "shadow_write";
}
