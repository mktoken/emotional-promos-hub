import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql",
  ),
  "utf8",
);

const functionBodies = migration.match(/AS \$function\$(.*?)\$function\$/gs) ?? [];

describe("CHK-CATGOV-05F model public projection SQL contract", () => {
  it("adds only the explicit human-governed default field", () => {
    expect(migration).toMatch(
      /ADD COLUMN IF NOT EXISTS is_public_default boolean NOT NULL DEFAULT false/,
    );
    expect(migration).not.toMatch(/INSERT INTO|UPDATE public\.catalog_product_model_members/);
  });

  it("enforces one default membership per model", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS catalog_model_members_one_public_default_idx[\s\S]*WHERE is_public_default = true/,
    );
  });

  it("keeps both projection functions stable, security-definer, and pinned", () => {
    expect(migration).toMatch(/catalog_search_model_projection_v1/);
    expect(migration).toMatch(/get_model_projection_detail_v1/);
    expect(functionBodies).toHaveLength(2);
    for (const body of functionBodies) {
      expect(body).toMatch(/\bSELECT\b/);
      expect(body).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|MERGE)\b/i);
    }
    expect(migration.match(/LANGUAGE sql\nSTABLE\nSECURITY DEFINER\nSET search_path = public, pg_temp/g)).toHaveLength(2);
  });

  it("represents one model card for grouped members", () => {
    expect(migration).toMatch(/'MODEL_RESULT'::text/);
    expect(migration).toMatch(/GROUP BY mm\.model_id/);
    expect(migration).toMatch(/eligible_variant_count/);
  });

  it("keeps standalone public products representable", () => {
    expect(migration).toMatch(/'VARIANT_RESULT'::text/);
    expect(migration).toMatch(/standalone_results AS/);
    expect(migration).toMatch(/FROM public_products pp/);
  });

  it("excludes blocked or otherwise ineligible members from selectable variants", () => {
    expect(migration).toMatch(/FILTER \(WHERE mm\.public_eligible\)/);
    expect(migration).toMatch(/AND mm\.public_eligible/);
    expect(migration).toMatch(/membership_status = 'CONFIRMED'/);
  });

  it("keeps eligible siblings distinguishable by product and SKU", () => {
    expect(migration).toMatch(/'producto_b2b_id', mm\.producto_b2b_id/);
    expect(migration).toMatch(/'sku', mm\.variant_sku/);
    expect(migration).toMatch(/ORDER BY mm\.variant_sku, mm\.producto_b2b_id/);
  });

  it("exposes the resolved material on each model variant without changing the RPC shape", () => {
    expect(migration).toMatch(/'material', mm\.material/);
  });

  it("uses one variant context for price and MOQ", () => {
    expect(migration).toMatch(/'card_price',[\s\S]*'minimum_quantity', mm\.minimum_quantity/);
    expect(migration).toMatch(/default_price_status/);
    expect(migration).toMatch(/default_moq/);
    expect(migration).toMatch(/card_price,\n      em\.default_moq/);
  });

  it("scopes every model membership join to its own model", () => {
    expect(migration).toMatch(/mm\.model_id = em\.model_id/);
    expect(migration).toMatch(/JOIN public\.catalog_product_model_members m\n      ON m\.model_id = md\.id/);
  });

  it("maps exact variant and provider SKU searches to variant metadata", () => {
    expect(migration).toMatch(/normalize_catalog_text\(mm\.variant_sku\)/);
    expect(migration).toMatch(/normalize_catalog_text\(mm\.provider_sku\)/);
    expect(migration).toMatch(/'kind', CASE WHEN match\.provider_sku/);
  });

  it("matches color and material filters through eligible members", () => {
    expect(migration).toMatch(/SELECT color FROM params/);
    expect(migration).toMatch(/SELECT material FROM params/);
    expect(migration).toMatch(/COALESCE\(mm\.variant_value, ''\)/);
    expect(migration).toMatch(/COALESCE\(mm\.material, ''\)/);
  });

  it("deduplicates a model after multi-variant filtering", () => {
    expect(migration).toMatch(/model_results AS/);
    expect(migration).toMatch(/combined AS \(\n    SELECT \* FROM model_results/);
    expect(migration).toMatch(/count\(\*\) OVER \(\) AS total_count/);
  });

  it("respects an explicit default only when that membership is marked", () => {
    expect(migration).toMatch(/m\.is_public_default/);
    expect(migration).toMatch(/WHERE mm\.is_public_default/);
    expect(migration).toMatch(/default_producto_b2b_id/);
  });

  it("does not let an ineligible default override public eligibility", () => {
    expect(migration).toMatch(/default_is_eligible/);
    expect(migration).toMatch(/DEFAULT_INELIGIBLE/);
    expect(migration).toMatch(/projection_readiness = 'PUBLIC_READY'/);
  });

  it("keeps missing defaults explicit instead of inventing a row-order fallback", () => {
    expect(migration).toMatch(/NO_EXPLICIT_DEFAULT/);
    expect(migration).not.toMatch(/ORDER BY mm\.variant_sku LIMIT 1.*default/i);
  });

  it("does not make a model with zero eligible variants public", () => {
    expect(migration).toMatch(/NO_ELIGIBLE_VARIANTS/);
    expect(migration).toMatch(/eligible_variant_count = 0/);
  });

  it("requires approved image evidence and rejects insufficient source assets", () => {
    expect(migration).toMatch(/identity_status = 'MATCHED'/);
    expect(migration).toMatch(/technical_status = 'PASS'/);
    expect(migration).toMatch(/visual_status = 'PASS'/);
    expect(migration).toMatch(/rights_status = 'CLEARED'/);
    expect(migration).toMatch(/approval_status IN \('APPROVED', 'PUBLIC_READY'\)/);
  });

  it("preserves exact offer resolution without publishing provider identity", () => {
    expect(migration).toMatch(/o\.id = m\.oferta_id/);
    expect(migration).toMatch(/'exact_offer_resolved'/);
    expect(migration).not.toMatch(/'provider_id'|'provider_code'|'provider_name'/);
  });

  it("does not expose a write path or alter existing public objects", () => {
    expect(migration).not.toMatch(/CREATE OR REPLACE VIEW public\.productos_publicos/);
    expect(migration).not.toMatch(/catalog_search_products_v2/);
    expect(migration).not.toMatch(/LANGUAGE plpgsql/);
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/i);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.catalog_search_model_projection_v1/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_model_projection_detail_v1/);
  });
});
