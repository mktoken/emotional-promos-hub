import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeProductImages } from "./product-images";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261017100000_catalog_model_projection_public_image_fallback_v1.sql",
  ),
  "utf8",
);

describe("CHK-CATALOG-IMAGE-FIX-03 public image fallback", () => {
  it("keeps both public RPC signatures and the existing result contracts", () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.catalog_search_model_projection_v1\([\s\S]*?RETURNS TABLE \([\s\S]*?result_grain text,[\s\S]*?representative_image jsonb,[\s\S]*?total_count bigint/s,
    );
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_model_projection_detail_v1\([\s\S]*?RETURNS TABLE \([\s\S]*?result_grain text,[\s\S]*?representative_image jsonb,[\s\S]*?projection_version text/s,
    );
    expect(migration).toMatch(/base\.result_grain/);
    expect(migration).toMatch(/base\.variants/);
    expect(migration).toMatch(/base\.card_price/);
    expect(migration).toMatch(/base\.category/);
  });

  it("uses the same representative product as the only public-image fallback source", () => {
    expect(migration.match(/LEFT JOIN public\.productos_publicos AS pp/g)).toHaveLength(2);
    expect(migration.match(/pp\.id = base\.default_producto_b2b_id/g)).toHaveLength(2);
    expect(migration.match(/'source', 'productos_publicos'/g)).toHaveLength(2);
    expect(migration.match(/'role', 'PUBLIC_RUNTIME_ALTERNATIVE'/g)).toHaveLength(2);
    expect(migration.match(/'status', 'UNVERIFIED'/g)).toHaveLength(2);
    expect(migration).not.toMatch(/'role', 'PUBLIC_RUNTIME'\s*,\s*'status', 'PUBLIC_READY'/);
  });

  it("preserves the current representative before same-product fallback sources", () => {
    expect(migration.match(/'ordered_sources', jsonb_build_array\(base\.representative_image, pp\.imagenes\)/g)).toHaveLength(2);
    expect(migration.match(/COALESCE\(base\.representative_image, '\{\}'::jsonb\)/g)).toHaveLength(2);
    expect(migration.match(/ELSE base\.representative_image\s*\n/g)).toHaveLength(2);
    expect(migration.match(/pp\.imagenes <> '\[\]'::jsonb/g)).toHaveLength(2);
  });

  it("keeps source-group order so a failed representative can fall through", () => {
    expect(
      normalizeProductImages({
        value: [{ url: "https://cdn.test/public.webp", type: "principal" }],
        ordered_sources: [
          { url: "https://cdn.test/broken-provider.webp", role: "VARIANT_MASTER" },
          [{ url: "https://cdn.test/public.webp", type: "principal" }],
        ],
      }),
    ).toEqual([
      "https://cdn.test/broken-provider.webp",
      "https://cdn.test/public.webp",
    ]);
  });

  it("delegates all non-image behavior to the existing projection functions", () => {
    expect(migration).toMatch(/catalog_search_model_projection_v1_base_20261017\(/);
    expect(migration).toMatch(/get_model_projection_detail_v1_base_20261017\(/);
    expect(migration).not.toMatch(/UPDATE public\./);
    expect(migration).not.toMatch(/INSERT INTO public\./);
    expect(migration).not.toMatch(/DELETE FROM public\./);
    expect(migration).not.toMatch(/CREATE OR REPLACE VIEW/);
    expect(migration).not.toMatch(/catalog_search_products_v2/);
    expect(migration).not.toMatch(/SafeProductImage/);
  });

  it("keeps the public execution grants and read-only function properties", () => {
    expect(migration.match(/LANGUAGE sql\nSTABLE\nSECURITY DEFINER\nSET search_path = public, pg_temp/g)).toHaveLength(2);
    expect(migration.match(/TO anon, authenticated, service_role/g)).toHaveLength(2);
    expect(migration).toMatch(/BEGIN;/);
    expect(migration).toMatch(/COMMIT;/);
  });
});
