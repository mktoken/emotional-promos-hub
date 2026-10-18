import { describe, expect, it } from "vitest";
import { normalizeProductCommercialName, normalizeProductVariantLabel } from "./product-variant-label";

describe("normalizeProductVariantLabel", () => {
  it("preserves readable string variant labels", () => {
    expect(normalizeProductVariantLabel(" AZUL ")).toBe("AZUL");
    expect(normalizeProductVariantLabel("TRANSPARENTE")).toBe("TRANSPARENTE");
  });

  it("reads the textual value from object-shaped color payloads", () => {
    expect(normalizeProductVariantLabel({ color_nombre: { nombre: "Azul" } })).toBe("Azul");
    expect(normalizeProductVariantLabel({ label: "Negro" })).toBe("Negro");
    expect(normalizeProductVariantLabel({ value: { name: "Rojo" } })).toBe("Rojo");
  });

  it("does not coerce unknown objects into [object Object]", () => {
    expect(normalizeProductVariantLabel({ id: "blue-01" })).toBeNull();
    expect(normalizeProductVariantLabel({})).toBeNull();
    expect(normalizeProductVariantLabel(null)).toBeNull();
  });

  it("keeps the known FRESCA color labels intact", () => {
    const frescaColors = ["AZUL", "VERDE", "ROJO", "NEGRO", "TRANSPARENTE", "NARANJA"];
    expect(frescaColors.map((color) => normalizeProductVariantLabel(color))).toEqual(frescaColors);
  });

  it("removes technical color prefixes while preserving the commercial value", () => {
    expect(normalizeProductVariantLabel("COLOR: MOR / COLOR NAME: Morado / MATERIAL: Plástico")).toBe("Morado");
    expect(normalizeProductVariantLabel("COLOR: AZUL")).toBe("AZUL");
  });

  it("does not turn unresolved technical values into a color label", () => {
    expect(normalizeProductVariantLabel("OTHER: UNRESOLVED")).toBeNull();
    expect(normalizeProductVariantLabel("G4 provider model kbi")).toBeNull();
    expect(normalizeProductVariantLabel(null) ?? "Color por confirmar").toBe("Color por confirmar");
  });

  it("keeps commercial model names and rejects technical provider names", () => {
    expect(
      ["Jello Colors Bio", "Koi Bio Translúcida", "MANGA", "FRESCA"].map(normalizeProductCommercialName),
    ).toEqual(["Jello Colors Bio", "Koi Bio Translúcida", "MANGA", "FRESCA"]);
    expect(normalizeProductCommercialName("G4 provider model kbi")).toBeNull();
  });
});
