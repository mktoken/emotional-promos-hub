import { describe, expect, it } from "vitest";
import { parseArticulos } from "./cotizacion-format";

describe("parseArticulos", () => {
  it("conserva la observación normal", () => {
    expect(parseArticulos([{ observacion: "Logo al centro" }])[0].observation).toBe("Logo al centro");
  });

  it("conserva los saltos de línea y elimina espacios exteriores", () => {
    expect(parseArticulos([{ observacion: "  Primera línea\nSegunda línea  " }])[0].observation).toBe(
      "Primera línea\nSegunda línea",
    );
  });

  it("convierte observaciones vacías o no string en null", () => {
    expect(parseArticulos([{ observacion: "   " }])[0].observation).toBeNull();
    expect(parseArticulos([{ observacion: 123 }])[0].observation).toBeNull();
  });

  it("no rompe artículos antiguos sin observación", () => {
    expect(parseArticulos([{ nombre: "GOMA", cantidad: 1 }])[0]).toMatchObject({
      nombre: "GOMA",
      cantidad: 1,
      observation: null,
    });
  });

  it("no confunde observación con personalización ni notas", () => {
    expect(
      parseArticulos([
        {
          observacion: "Texto para el cliente",
          personalizacion: "Logo bordado",
          notes: "Nota interna",
        },
      ])[0],
    ).toMatchObject({
      observation: "Texto para el cliente",
      personalizacion: "Logo bordado",
    });
  });

  it("acepta observation como compatibilidad cuando falta observacion", () => {
    expect(parseArticulos([{ observation: "Compatibilidad heredada" }])[0].observation).toBe(
      "Compatibilidad heredada",
    );
  });

  it("prefiere observacion cuando también existe observation", () => {
    expect(
      parseArticulos([{ observacion: "Campo canónico", observation: "Campo alternativo" }])[0].observation,
    ).toBe("Campo canónico");
  });
});
