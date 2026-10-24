import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveForPromotionalApiCost } from "../functions/_shared/forpromotional-api-cost";

const syncSource = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "../functions/sync-forpromotional-products-v2/index.ts"),
  "utf8",
);

describe("ForPromotional API cost contract", () => {
  it("uses only precio_desc as the acquisition cost and preserves control fields", () => {
    const pickPriceBody = syncSource.match(
      /function pickPrice\([\s\S]*?\n}\n\nfunction stockBucket/,
    )?.[0] ?? "";

    expect(pickPriceBody).toContain("resolveForPromotionalApiCost");
    expect(syncSource).toContain('"precio","precio_desc","opc_promo","opc_unico","desc_promo"');
    expect(syncSource).toContain("requires_review");
    expect(syncSource).toContain("forpromotional_atomic_cost_shadow");
    expect(syncSource).toContain("control_data");
    expect(syncSource).toContain("priceInfo.manual_review");
  });

  it.each([
    ["WAATI AG 003", 76.5, 57.38, undefined, undefined, "normal"],
    ["ALBORA AL 25115", 10.1, 7.58, undefined, undefined, "normal"],
    ["MISO T 215", 21.46, 11.8, "S", undefined, "promotion"],
    ["IBIZA T 68P", 53.2, 26.6, "S", undefined, "promotion"],
    ["KÁPHE T 162", 360, 144, "S", undefined, "promotion"],
    ["TARO T 326", 19.15, 14.36, undefined, "S", "unique"],
    ["SPARK T 131", 18.11, 13.58, undefined, "S", "unique"],
  ])("resuelve %s con precio_desc y modalidad %s", (_name, precio, precioDesc, opcPromo, opcUnico, mode) => {
    const result = resolveForPromotionalApiCost({
      precio,
      precio_desc: precioDesc,
      opc_promo: opcPromo,
      opc_unico: opcUnico,
    });

    expect(result).toMatchObject({
      unit_cost: precioDesc,
      source: "forpromotional.api.precio_desc",
      commercial_mode: mode,
      manual_review: false,
    });
  });

  it("sends missing, invalid and contradictory prices to review", () => {
    expect(resolveForPromotionalApiCost({ precio: 10, opc_promo: "S" })).toMatchObject({
      manual_review: true,
      review_reason: "missing_or_invalid_precio_desc",
    });
    expect(resolveForPromotionalApiCost({ precio: 10, precio_desc: 0 })).toMatchObject({
      manual_review: true,
      review_reason: "missing_or_invalid_precio_desc",
    });
    expect(resolveForPromotionalApiCost({ precio: 10, precio_desc: 11, opc_promo: "S" })).toMatchObject({
      manual_review: true,
      review_reason: "precio_desc_above_precio",
    });
    expect(resolveForPromotionalApiCost({ precio: 10, precio_desc: 9, opc_promo: "S", opc_unico: "S" })).toMatchObject({
      manual_review: true,
      review_reason: "conflicting_commercial_flags",
    });
  });
});
