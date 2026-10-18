import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261018120000_public_product_variant_context_v1.sql",
  ),
  "utf8",
);

describe("public product variant context contract", () => {
  it("joins only public products to their exact mapped offer and stock row", () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.get_public_product_variant_context_v1\(\s*p_producto_b2b_id uuid/s);
    expect(migration).toMatch(/JOIN public\.productos_publicos pp\s+ON pp\.id = m\.producto_b2b_id/s);
    expect(migration).toMatch(/JOIN public\.producto_proveedor_ofertas o\s+ON o\.id = m\.oferta_id/s);
    expect(migration).toMatch(
      /JOIN public\.provider_raw_products rp\s+ON rp\.id = o\.provider_raw_product_id\s+AND rp\.proveedor_id = o\.proveedor_id/s,
    );
    expect(migration).toMatch(/LEFT JOIN public\.producto_proveedor_stock s\s+ON s\.oferta_id = o\.id/s);
    expect(migration).toMatch(/s\.cantidad::integer AS stock_qty/);
    expect(migration).toMatch(/COALESCE\(s\.disponibilidad, 'consultar'\)/);
  });

  it("never exposes FP/CDO synthetic variant identifiers as commercial display SKUs", () => {
    expect(migration.match(/BTRIM\(o\.variant_sku\) ILIKE 'FP\|%'/g)).toHaveLength(2);
    expect(migration.match(/BTRIM\(o\.variant_sku\) ILIKE 'CDO\|%'/g)).toHaveLength(2);
    expect(migration.match(/BTRIM\(rp\.provider_sku\) ILIKE 'FP\|%'/g)).toHaveLength(2);
    expect(migration.match(/BTRIM\(rp\.provider_sku\) ILIKE 'CDO\|%'/g)).toHaveLength(2);
    expect(migration).toMatch(/ELSE NULL::text/);
    expect(migration).toMatch(/THEN 'PRODUCT'/);
  });

  it("is a read-only public function with the required execution grants", () => {
    const returnTable = migration.match(/RETURNS TABLE \(([^)]*)\)/s)?.[1] ?? "";
    expect(migration).toMatch(
      /RETURNS TABLE \(\s*producto_b2b_id uuid,\s*oferta_id uuid,\s*display_sku text/s,
    );
    expect(returnTable).not.toMatch(/\b(provider_code|provider_sku|variant_sku)\s+text/);
    expect(migration).toMatch(/LANGUAGE sql\s+STABLE\s+SECURITY DEFINER/s);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_public_product_variant_context_v1\(uuid\)\s+TO anon, authenticated, service_role/s);
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER TABLE)\b/i);
  });
});
