export interface PasswordValidationResult {
  valid: boolean;
  error: string | null;
}

export function validatePasswordChange(
  newPassword: string,
  confirmPassword: string,
): PasswordValidationResult {
  if (newPassword.length === 0) {
    return { valid: false, error: "Ingresa una nueva contraseña." };
  }

  if (confirmPassword.length === 0) {
    return { valid: false, error: "Confirma la nueva contraseña." };
  }

  if (newPassword.length < 8) {
    return { valid: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { valid: false, error: "Las contraseñas no coinciden." };
  }

  return { valid: true, error: null };
}
