// Validaciones frontend para trabajos de impresión y componentes internos.
// Estas validaciones espejean las CHECK constraints/triggers de la BD para
// dar feedback inmediato en el CRM antes de disparar la mutación.
// USO INTERNO. No exponer en catálogo público, PDF cliente ni email cliente.

export type PrintJobPricingStatus =
  | "pendiente"
  | "calculado"
  | "manual"
  | "pricing_missing";

export type PrintJobComponentType =
  | "base_print"
  | "additional_color"
  | "plate"
  | "negative_positive"
  | "setup"
  | "logistics"
  | "additional_charge"
  | "manual_adjustment"
  | "buffer";

export const PRINT_JOB_PRICING_STATUSES: PrintJobPricingStatus[] = [
  "pendiente",
  "calculado",
  "manual",
  "pricing_missing",
];

export const PRINT_JOB_COMPONENT_TYPES: PrintJobComponentType[] = [
  "base_print",
  "additional_color",
  "plate",
  "negative_positive",
  "setup",
  "logistics",
  "additional_charge",
  "manual_adjustment",
  "buffer",
];

export interface PrintJobValidationInput {
  logistics_fee_default_mxn: number;
  logistics_fee_mxn: number;
  logistics_override_reason?: string | null;
  print_colors?: number | null;
  print_positions?: number | null;
  pricing_status: PrintJobPricingStatus;
  override_reason?: string | null;
  job_label?: string | null;
}

export interface PrintJobComponentValidationInput {
  component_type: PrintJobComponentType;
  label: string;
  description?: string | null;
  amount_mxn: number;
  quantity?: number | null;
  unit_cost_mxn?: number | null;
  is_manual?: boolean;
  include_in_customer_price?: boolean;
  is_visible_to_client?: boolean;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const nonBlank = (v?: string | null): boolean =>
  typeof v === "string" && v.trim().length > 0;

export function validatePrintJob(
  input: PrintJobValidationInput,
): ValidationResult {
  const errors: string[] = [];

  if (!nonBlank(input.job_label ?? "Trabajo de impresión")) {
    errors.push("El nombre del trabajo no puede estar vacío.");
  }

  if (!(input.logistics_fee_default_mxn >= 0)) {
    errors.push("La logística por defecto no puede ser negativa.");
  }
  if (!(input.logistics_fee_mxn >= 0)) {
    errors.push("La logística no puede ser negativa.");
  }

  const changedLogistics =
    Number(input.logistics_fee_mxn) !== Number(input.logistics_fee_default_mxn);
  const zeroLogistics = Number(input.logistics_fee_mxn) === 0;

  if ((changedLogistics || zeroLogistics) && !nonBlank(input.logistics_override_reason)) {
    errors.push(
      "Si modificas la logística (o la dejas en $0) debes indicar un motivo.",
    );
  }

  if (input.print_colors != null && !(input.print_colors > 0)) {
    errors.push("Los colores de impresión deben ser mayores a 0.");
  }
  if (input.print_positions != null && !(input.print_positions > 0)) {
    errors.push("Las posiciones de impresión deben ser mayores a 0.");
  }

  if (input.pricing_status === "manual" && !nonBlank(input.override_reason)) {
    errors.push("Un precio manual requiere motivo de override.");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validatePrintJobComponent(
  input: PrintJobComponentValidationInput,
): ValidationResult {
  const errors: string[] = [];

  if (!nonBlank(input.label)) {
    errors.push("El componente requiere un label.");
  }
  if (input.quantity != null && !(input.quantity >= 0)) {
    errors.push("La cantidad no puede ser negativa.");
  }
  if (input.unit_cost_mxn != null && !(input.unit_cost_mxn >= 0)) {
    errors.push("El costo unitario no puede ser negativo.");
  }
  if (input.is_visible_to_client === true) {
    errors.push("Los componentes internos nunca deben ser visibles al cliente.");
  }

  switch (input.component_type) {
    case "additional_charge": {
      if (input.is_manual === false) {
        errors.push("Los cargos adicionales deben marcarse como manuales.");
      }
      if (!(input.amount_mxn > 0)) {
        errors.push("El cargo adicional requiere un importe mayor a 0.");
      }
      if (!nonBlank(input.description)) {
        errors.push("El cargo adicional requiere descripción/motivo.");
      }
      break;
    }
    case "manual_adjustment": {
      if (input.is_manual === false) {
        errors.push("El ajuste manual debe marcarse como manual.");
      }
      if (!nonBlank(input.description)) {
        errors.push("El ajuste manual requiere descripción/motivo.");
      }
      break;
    }
    case "buffer": {
      if (input.is_manual === true) {
        errors.push("El buffer es derivado, no puede ser manual.");
      }
      if (input.include_in_customer_price === true) {
        errors.push(
          "El buffer es informativo y no debe volver a incluirse en el precio del cliente.",
        );
      }
      if (!(input.amount_mxn >= 0)) {
        errors.push("El buffer no puede ser negativo.");
      }
      break;
    }
    default: {
      if (!(input.amount_mxn >= 0)) {
        errors.push("El importe no puede ser negativo para este tipo de componente.");
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Bloquea aplicar precio automático si el motor no encontró regla válida.
 */
export function canApplyAutomaticPrice(
  status: PrintJobPricingStatus,
): boolean {
  return status !== "pricing_missing";
}

export function assertCanApplyAutomaticPrice(
  status: PrintJobPricingStatus,
): void {
  if (!canApplyAutomaticPrice(status)) {
    throw new Error(
      "No se puede aplicar precio automático: el motor de impresión no encontró una regla válida (PRICING_MISSING).",
    );
  }
}
