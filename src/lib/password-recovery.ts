export const PASSWORD_RECOVERY_PATH = "/auth/update-password";
export const PASSWORD_RECOVERY_MESSAGE =
  "Si el correo existe, recibirás instrucciones para recuperar tu contraseña.";

export interface RecoveryEmailValidationResult {
  valid: boolean;
  error: string | null;
}

export function buildPasswordRecoveryRedirect(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${PASSWORD_RECOVERY_PATH}`;
}

export function validateRecoveryEmail(email: string): RecoveryEmailValidationResult {
  const value = email.trim();
  if (!value) {
    return { valid: false, error: "Ingresa tu correo." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { valid: false, error: "Ingresa un correo válido." };
  }

  return { valid: true, error: null };
}
