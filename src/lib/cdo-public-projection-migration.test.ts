import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261014090000_cdo_public_projection_canonical_v1.sql",
  ),
  "utf8",
);

describe("CHK-CDO public projection canonical migration", () => {
  it("preserves the existing public view contract and keeps the change minimal", () => {
    for (const column of [
      "p.id",
      "p.id_interno",
      "p.sku_base",
      "p.categoria_principal",
      "p.datos_generales",
      "p.variantes",
      "p.imagenes",
      "p.motor_de_personalizacion",
      "p.activo",
      "p.updated_at",
      "AS precio_desde_mxn",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("CREATE OR REPLACE VIEW public.productos_publicos");
    expect(migration).toContain("GRANT SELECT ON public.productos_publicos TO anon, authenticated");
    expect(migration).not.toMatch(/CREATE OR REPLACE VIEW public\.productos_publicos_legacy_v1/);
    expect(migration).not.toContain("catalog_price_cache");
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER TABLE|DROP)\b/i);
  });

  it("uses only current status, active category, positive stock, and current Pricing V2", () => {
    expect(migration).toContain("FROM public.productos_b2b AS p");
    expect(migration).toContain("FROM public.producto_b2b_status AS s");
    expect(migration).toContain("ORDER BY s.updated_at DESC NULLS LAST, s.id DESC");
    expect(migration).toContain("current_status.public_visible = true");
    expect(migration).toContain("current_status.price_valid = true");
    expect(migration).toContain("current_status.image_available = true");
    expect(migration).toContain("current_status.stock_qty > 0");
    expect(migration).toContain("FROM public.product_category_assignments AS pca");
    expect(migration).toContain("pc.is_active = true");
    expect(migration).toContain("LEFT JOIN public.catalog_price_v2_current_prices AS cp");
    expect(migration).not.toMatch(/\bpilot\b/i);
    expect(migration).not.toMatch(/\bp\.activo\s*=\s*true/i);
    expect(migration).not.toMatch(/stock_status\s*=\s*'disponible'/i);
    expect(migration).not.toMatch(/quote_mode\s*=\s*'cotizable'/i);
  });
});
