import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const catalogView = readFileSync(resolve(process.cwd(), "src/components/CatalogView.tsx"), "utf8");
const detailView = readFileSync(resolve(process.cwd(), "src/components/ProductDetailView.tsx"), "utf8");
const indexView = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");

describe("G4 model/variant public experience contract", () => {
  it("treats a valid V2 page as authoritative even without MODEL_RESULT rows", () => {
    expect(catalogView).toMatch(/catalog_search_model_projection_v1/);
    expect(catalogView).toMatch(/isCatalogModelProjectionPayload\(modelResult\.data\)/);
    expect(catalogView).toMatch(/projectionToCatalogCard/);
    expect(catalogView).toMatch(/catalog_search_products_v2/);
    expect(catalogView).toMatch(/selectedSubcategorySlug/);
    expect(catalogView).not.toMatch(/hasModelResults\(modelRows\)/);
  });

  it("carries the model key to PDP and resolves a selected variant", () => {
    expect(indexView).toMatch(/selectedModelKey/);
    expect(indexView).toMatch(/modelKey=\{selectedModelKey\}/);
    expect(detailView).toMatch(/get_model_projection_detail_v1/);
    expect(detailView).toMatch(/currentVariantProductId/);
    expect(detailView).toMatch(/productId: currentVariantProductId/);
    expect(detailView).toMatch(/fetchPublicProductPriceQuote\(currentVariantProductId/);
  });

  it("preserves contain geometry in catalog and PDP surfaces", () => {
    expect(catalogView).toMatch(/object-contain/);
    expect(detailView).toMatch(/object-contain/);
    expect(detailView).not.toMatch(/object-cover/);
  });
});
