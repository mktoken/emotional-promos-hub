export const TARGETED_MATERIALIZATION_MAX_PRODUCTS = 3;

export type MaterializationRequest = {
  mode: "dry_run" | "full";
  materializationOnly: boolean;
  confirmMaterializationWrite: boolean;
  productIds: string[];
};

export type MaterializationDecision =
  | { kind: "dry_run"; reason: "materialization_only_dry_run" }
  | { kind: "targeted_write"; reason: "targeted_materialization_write" }
  | { kind: "normal"; reason: "normal_refresh" }
  | {
      kind: "reject";
      reason:
        | "max_targeted_products_exceeded"
        | "targeted_write_requires_explicit_gates"
        | "materialization_only_requires_product_ids";
    };

export function decideMaterializationRequest(
  request: MaterializationRequest,
): MaterializationDecision {
  const hasProductIds = request.productIds.length > 0;

  if (request.productIds.length > TARGETED_MATERIALIZATION_MAX_PRODUCTS) {
    return { kind: "reject", reason: "max_targeted_products_exceeded" };
  }

  if (request.materializationOnly && !hasProductIds) {
    return { kind: "reject", reason: "materialization_only_requires_product_ids" };
  }

  if (
    request.mode === "full" &&
    hasProductIds &&
    (!request.materializationOnly || !request.confirmMaterializationWrite)
  ) {
    return { kind: "reject", reason: "targeted_write_requires_explicit_gates" };
  }

  if (request.mode === "dry_run" && hasProductIds) {
    return { kind: "dry_run", reason: "materialization_only_dry_run" };
  }

  if (
    request.mode === "full" &&
    request.materializationOnly &&
    request.confirmMaterializationWrite &&
    hasProductIds
  ) {
    return { kind: "targeted_write", reason: "targeted_materialization_write" };
  }

  return { kind: "normal", reason: "normal_refresh" };
}
