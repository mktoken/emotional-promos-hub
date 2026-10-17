import { describe, expect, it } from "vitest";

import { HOME_CATEGORY_CARDS } from "@/components/home/home-category-cards";

describe("Home category presentation", () => {
  it("uses deliberate category icons while certified image assets are unavailable", () => {
    expect(HOME_CATEGORY_CARDS).toHaveLength(5);
    expect(HOME_CATEGORY_CARDS.every((card) => Boolean(card.icon))).toBe(true);
    expect(HOME_CATEGORY_CARDS.map((card) => card.slug)).toEqual([
      "bebidas-termos-vasos",
      "libretas-cuadernos",
      "textiles-ropa",
      "bolsas-mochilas-viaje",
      "tecnologia",
    ]);
  });
});
