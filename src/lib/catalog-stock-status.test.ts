import { describe, expect, it } from "vitest";
import { deriveCatalogStockStatus } from "../../supabase/functions/_shared/catalog-stock-status";

const sourceRows = (quantity: number, updatedAt = "2026-10-04T10:00:00.000Z") => [
  { cantidad: quantity, updated_at: updatedAt },
];

describe("catalog stock materialization authority", () => {
  it("aggregates offers and preserves the latest source timestamp", () => {
    const result = deriveCatalogStockStatus({
      sourceState: "active",
      sourceSufficient: true,
      stockRows: [
        { cantidad: 20, updated_at: "2026-10-01T10:00:00.000Z" },
        { cantidad: 35, updated_at: "2026-10-03T10:00:00.000Z" },
      ],
      priceState: "valid",
      imageAvailable: true,
    });

    expect(result.stock_qty).toBe(55);
    expect(result.last_stock_sync_at).toBe("2026-10-03T10:00:00.000Z");
    expect(result.stock_status).toBe("disponible");
  });

  it.each([
    [0, "agotado"],
    [1, "bajo"],
    [49, "bajo"],
    [50, "disponible"],
  ] as const)("maps %s to %s", (quantity, expectedStatus) => {
    const result = deriveCatalogStockStatus({
      sourceState: "active",
      sourceSufficient: true,
      stockRows: sourceRows(quantity),
      priceState: "valid",
      imageAvailable: true,
    });

    expect(result.stock_status).toBe(expectedStatus);
  });

  it("maps an insufficient source to consultar without inventing freshness", () => {
    const result = deriveCatalogStockStatus({
      sourceState: "unknown",
      sourceSufficient: false,
      stockRows: [],
      priceState: "valid",
      imageAvailable: true,
    });

    expect(result.stock_status).toBe("consultar");
    expect(result.public_visible).toBe(false);
    expect(result.stock_qty).toBeNull();
    expect(result.last_stock_sync_at).toBeNull();
  });

  it("preserves the existing price and image gates", () => {
    const noPrice = deriveCatalogStockStatus({
      sourceState: "active",
      sourceSufficient: true,
      stockRows: sourceRows(100),
      priceState: "manual_review",
      imageAvailable: true,
    });
    const noImage = deriveCatalogStockStatus({
      sourceState: "active",
      sourceSufficient: true,
      stockRows: sourceRows(100),
      priceState: "valid",
      imageAvailable: false,
    });

    expect(noPrice.stock_status).toBe("consultar");
    expect(noPrice.public_visible).toBe(false);
    expect(noImage.stock_status).toBe("disponible");
    expect(noImage.public_visible).toBe(false);
  });

  it("keeps an inactive source non-cotizable", () => {
    const result = deriveCatalogStockStatus({
      sourceState: "inactive",
      sourceSufficient: true,
      stockRows: sourceRows(100),
      priceState: "valid",
      imageAvailable: true,
    });

    expect(result.stock_status).toBe("agotado");
    expect(result.quote_mode).toBe("no_cotizable");
    expect(result.public_visible).toBe(false);
  });
});
