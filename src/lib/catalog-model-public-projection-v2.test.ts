import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const supabaseMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261016100000_g4_dynamic_model_projection_v2.sql"),
  "utf8",
);
const postcheck = readFileSync(
  resolve(process.cwd(), "docs/catalog-governance/CHK-CATGOV-05I_G4_DYNAMIC_MODEL_PROJECTION_V2_POSTCHECK.sql"),
  "utf8",
);

describe("CHK-CATGOV-05I G4 dynamic model projection v2", () => {
  it("uses the canonical Supabase migration as the pre-apply source", () => {
    expect(supabaseMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.catalog_search_model_projection_v1\(/);
    expect(supabaseMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.get_model_projection_detail_v1\(/);
  });

  it("validates the exact governance universe before changing governance state", () => {
    expect(supabaseMigration).toMatch(/v_model_count <> 104/);
    expect(supabaseMigration).toMatch(/v_membership_count <> 289/);
    expect(supabaseMigration).toMatch(/UPDATE public\.catalog_product_models/);
    expect(supabaseMigration).toMatch(/UPDATE public\.catalog_product_model_members/);
    expect(supabaseMigration).not.toMatch(/UPDATE public\.(productos_|producto_proveedor_|catalog_price)/);
  });

  it("does not require persisted defaults or stock availability for model identity", () => {
    expect(supabaseMigration).toMatch(/pp\.id IS NOT NULL AS public_eligible/);
    expect(supabaseMigration).not.toMatch(/NO_EXPLICIT_DEFAULT|DEFAULT_INELIGIBLE/);
    expect(supabaseMigration).not.toMatch(/os\.disponibilidad\s*=\s*'disponible'/);
    expect(supabaseMigration).toMatch(/WHEN mm\.is_public_default THEN 0/);
  });

  it("derives a stable representative and keeps detail values atomic", () => {
    expect(supabaseMigration).toMatch(/representatives AS/);
    expect(supabaseMigration).toMatch(/selected_variant AS/);
    expect(supabaseMigration).toMatch(/selected_price/);
    expect(supabaseMigration).toMatch(/selected_moq/);
    expect(supabaseMigration).toMatch(/selected_image_url/);
    expect(supabaseMigration).toMatch(/any_positive_availability/);
    expect(supabaseMigration).toMatch(/lower\(mm\.variant_sku\) = lower\(trim\(p_variant_sku\)\)/);
  });

  it("keeps one model result per model and preserves standalone fallback", () => {
    expect(supabaseMigration.match(/'MODEL_RESULT'::text/g)?.length).toBeGreaterThanOrEqual(2);
    expect(supabaseMigration).toMatch(/GROUP BY mm\.model_id/);
    expect(supabaseMigration).toMatch(/'VARIANT_RESULT'::text/);
    expect(supabaseMigration).toMatch(/standalone_results AS/);
  });

  it("keeps the public RPC signatures and read-only function properties", () => {
    expect(supabaseMigration).toMatch(/catalog_search_model_projection_v1\(/);
    expect(supabaseMigration).toMatch(/get_model_projection_detail_v1\(/);
    expect(supabaseMigration.match(/LANGUAGE sql\nSTABLE\nSECURITY DEFINER\nSET search_path = public, pg_temp/g)).toHaveLength(2);
    expect(supabaseMigration).not.toMatch(/CREATE OR REPLACE VIEW public\.productos_publicos/);
    expect(supabaseMigration).not.toMatch(/catalog_search_products_v2/);
  });

  it("keeps the future postcheck read-only", () => {
    expect(postcheck).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(postcheck).not.toMatch(/INSERT INTO|UPDATE |DELETE FROM|UPSERT|MERGE|CREATE TABLE|ALTER TABLE|DROP TABLE/);
    expect(postcheck).toMatch(/NO PUBLISH/);
  });
});
