import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const supabaseMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261015110000_g4_model_variant_governance_coverage_v1.sql"),
  "utf8",
);
const drizzleMigration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0010_g4_model_variant_governance_coverage_v1.sql"),
  "utf8",
);

describe("CHK-CATGOV-05H G4 governance coverage package", () => {
  it("has the deterministic 289-row / 104-model preflight", () => {
    expect(supabaseMigration).toMatch(/v_rows <> 289 OR v_models <> 104/);
    expect(supabaseMigration).toMatch(/g4mexico\\\.com\\\.mx/);
    expect(supabaseMigration).toMatch(/v\.variant->>'oferta_id'/);
  });

  it("keeps model and membership rows pending human/publication gates", () => {
    expect(supabaseMigration).toMatch(/'REVIEW_REQUIRED'/);
    expect(supabaseMigration).toMatch(/'CANDIDATE'/);
    expect(supabaseMigration).toMatch(/is_public_default\s*\n\)\s*\nSELECT/);
    expect(supabaseMigration).toMatch(/human identity, image, rights/);
    expect(supabaseMigration).not.toMatch(/membership_status\s*[,)]\s*['"]CONFIRMED/);
  });

  it("uses exact public product/offer relationships and is idempotent", () => {
    expect(supabaseMigration).toMatch(/producto_b2b_id uuid NOT NULL/);
    expect(supabaseMigration).toMatch(/oferta_id uuid NOT NULL/);
    expect(supabaseMigration).toMatch(/ON CONFLICT \(model_key\) DO NOTHING/);
    expect(supabaseMigration).toMatch(/UPDATE _g4_governance_models gm[\s\S]*WHERE m\.model_key = gm\.model_key/);
    expect(supabaseMigration).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
    expect(supabaseMigration).toMatch(/NOT EXISTS \([\s\S]*existing_member/);
    expect(supabaseMigration).not.toMatch(/catalog_search_products_v2/);
    expect(supabaseMigration).not.toMatch(/UPDATE public\.productos_/);
  });

  it("keeps the Drizzle and Supabase delivery files byte-equivalent", () => {
    expect(drizzleMigration).toBe(supabaseMigration);
  });
});
