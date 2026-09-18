import { describe, expect, it } from "vitest";
import { validatePasswordChange } from "./password-validation";

describe("validatePasswordChange", () => {
  it("acepta una contraseña válida", () => {
    expect(validatePasswordChange("segura123", "segura123")).toEqual({
      valid: true,
      error: null,
    });
  });

  it("rechaza la nueva contraseña vacía", () => {
    expect(validatePasswordChange("", "segura123").valid).toBe(false);
  });

  it("rechaza la confirmación vacía", () => {
    expect(validatePasswordChange("segura123", "").valid).toBe(false);
  });

  it("rechaza contraseñas menores de 8 caracteres", () => {
    expect(validatePasswordChange("corta12", "corta12").valid).toBe(false);
  });

  it("rechaza contraseñas diferentes", () => {
    expect(validatePasswordChange("segura123", "segura124").valid).toBe(false);
  });

  it("acepta contraseñas iguales y conserva espacios internos", () => {
    const result = validatePasswordChange("clave segura", "clave segura");
    expect(result).toEqual({ valid: true, error: null });
  });

  it("no expone la contraseña en los mensajes de validación", () => {
    const password = "secreta123";
    const result = validatePasswordChange(password, "diferente");
    expect(result.error).not.toContain(password);
  });
});
