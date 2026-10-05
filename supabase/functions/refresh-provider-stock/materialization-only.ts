import { recomputeProductStockStatus } from "../_shared/catalog-stock-status.ts";

type MaterializationClient = Parameters<typeof recomputeProductStockStatus>[0];

/**
 * Materializes explicit products from already persisted provider data.
 * This path is intentionally read-only: it must not open a refresh run,
 * load/save cursors, invoke provider sync functions, or write product status.
 */
export async function runMaterializationOnlyDryRun(
  supabase: MaterializationClient,
  productIds: string[],
) {
  const recompute = await recomputeProductStockStatus(
    supabase,
    productIds,
    { dryRun: true },
  );
  const affectedOfferIds = new Set(
    recompute.products.flatMap((product) => product.affected_offer_ids),
  );

  return {
    ok: recompute.failed_product_ids.length === 0,
    mode: "dry_run" as const,
    materialization_only: true as const,
    writes: 0 as const,
    affected_offers: affectedOfferIds.size,
    affected_products: recompute.affected_product_ids.length,
    recomputed_products: 0 as const,
    failed_products: recompute.failed_product_ids.length,
    products: recompute.products,
    errors: recompute.errors,
  };
}
