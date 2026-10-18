import { describe, expect, it } from "vitest";
import { normalizeProductVariantLabel } from "./product-variant-label";

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
});
