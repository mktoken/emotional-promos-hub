import { describe, expect, it } from "vitest";
import {
  buildPasswordRecoveryRedirect,
  PASSWORD_RECOVERY_MESSAGE,
  validateRecoveryEmail,
} from "./password-recovery";

describe("password recovery", () => {
  it("rechaza un correo vacío", () => {
    expect(validateRecoveryEmail(" ").valid).toBe(false);
  });

  it("rechaza un correo inválido", () => {
    expect(validateRecoveryEmail("usuario-invalido").valid).toBe(false);
  });

  it("acepta un correo válido", () => {
    expect(validateRecoveryEmail(" usuario@empresa.com ")).toEqual({
      valid: true,
      error: null,
    });
  });

  it("construye redirectTo con el origen y la ruta de actualización", () => {
    expect(buildPasswordRecoveryRedirect("http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/auth/update-password",
    );
    expect(buildPasswordRecoveryRedirect("https://articulospromocionales.vip/")).toBe(
      "https://articulospromocionales.vip/auth/update-password",
    );
  });

  it("define un mensaje neutral que no revela si existe el correo", () => {
    expect(PASSWORD_RECOVERY_MESSAGE).toBe(
      "Si el correo existe, recibirás instrucciones para recuperar tu contraseña.",
    );
  });
});
