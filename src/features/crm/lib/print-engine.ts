// Motor interno de impresión. USO EXCLUSIVO CRM.
// PROHIBIDO exponer costos, márgenes, logística, buffer, proveedor,
// reglas internas ni snapshot en PDF, email o frontend público.
import type {
  PrintMethodRow,
  PrintPricingRuleRow,
  PrintCompatRuleRow,
} from "@/features/crm/hooks/usePrintRules";
import type { PrintSettingsRow } from "@/features/crm/hooks/usePrintSettings";

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

export interface PrintEngineInput {
  print_method_id: string;
  qty: number;
  colors: number;
  positions: number;
  logistics_fee_mxn: number;
  logistics_job_count: number;
  material?: string | null;
  product_category?: string | null;
  shape_type?: string | null;
  print_area_cm2?: number | null;
}

export interface PrintEngineWarning {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface PrintEngineResult {
  matched_rule_id: string | null;
  matched_compat_id: string | null;
  compatibility_status: string | null;
  billable_qty: number;
  raw_print_cost: number;
  base_print_cost: number;
  additional_internal_costs: number;
  cost_breakdown: {
    variable: number;
    flat: number;
    per_piece_color: number;
    setup: number;
    plate: number;
    negative_positive: number;
    mold: number;
    repack: number;
    extras: number;
    compat_extra: number;
  };
  logistics: number;
  buffer: number;
  internal_total: number;
  price_by_margin: number;
  price_by_min_profit: number;
  suggested_customer_price: number;
  suggested_unit_price: number;
  suggested_setup_fee: number;
  estimated_profit: number;
  applied_min_profit: boolean;
  warnings: PrintEngineWarning[];
}

function matchPricingRule(
  rules: PrintPricingRuleRow[],
  input: PrintEngineInput,
): PrintPricingRuleRow | null {
  const candidates = rules.filter((r) => {
    if (r.print_method_id !== input.print_method_id) return false;
    if (r.active === false) return false;
    if (input.qty < n(r.min_qty)) return false;
    if (r.max_qty != null && input.qty > n(r.max_qty)) return false;
    if (input.colors < n(r.colors_min)) return false;
    if (r.colors_max != null && input.colors > n(r.colors_max)) return false;
    if (input.positions < n(r.positions_min)) return false;
    if (r.positions_max != null && input.positions > n(r.positions_max)) return false;
    if (r.material && input.material && r.material !== input.material) return false;
    if (
      r.product_category &&
      input.product_category &&
      r.product_category !== input.product_category
    )
      return false;
    return true;
  });
  // Preferir el rango más específico: material/categoría match no-null, luego rango más estrecho
  candidates.sort((a, b) => {
    const specA =
      (a.material ? 1 : 0) +
      (a.product_category ? 1 : 0) +
      (a.colors_max != null ? 1 : 0) +
      (a.positions_max != null ? 1 : 0);
    const specB =
      (b.material ? 1 : 0) +
      (b.product_category ? 1 : 0) +
      (b.colors_max != null ? 1 : 0) +
      (b.positions_max != null ? 1 : 0);
    if (specB !== specA) return specB - specA;
    const widthA = (a.max_qty ?? Number.MAX_SAFE_INTEGER) - n(a.min_qty);
    const widthB = (b.max_qty ?? Number.MAX_SAFE_INTEGER) - n(b.min_qty);
    return widthA - widthB;
  });
  return candidates[0] ?? null;
}

function matchCompatRule(
  rules: PrintCompatRuleRow[],
  input: PrintEngineInput,
): PrintCompatRuleRow | null {
  const candidates = rules.filter((r) => {
    if (r.print_method_id !== input.print_method_id) return false;
    if (r.active === false) return false;
    if (r.material && input.material && r.material !== input.material) return false;
    if (
      r.product_category &&
      input.product_category &&
      r.product_category !== input.product_category
    )
      return false;
    if (r.shape_type && input.shape_type && r.shape_type !== input.shape_type) return false;
    return true;
  });
  candidates.sort((a, b) => {
    const specA =
      (a.material ? 1 : 0) +
      (a.product_category ? 1 : 0) +
      (a.shape_type ? 1 : 0);
    const specB =
      (b.material ? 1 : 0) +
      (b.product_category ? 1 : 0) +
      (b.shape_type ? 1 : 0);
    return specB - specA;
  });
  return candidates[0] ?? null;
}

export function calcPrintEngine(
  input: PrintEngineInput,
  settings: PrintSettingsRow,
  pricingRules: PrintPricingRuleRow[],
  compatRules: PrintCompatRuleRow[],
): PrintEngineResult {
  const warnings: PrintEngineWarning[] = [];
  const qty = Math.max(1, Math.floor(n(input.qty)));
  const colors = Math.max(1, Math.floor(n(input.colors)));
  const positions = Math.max(1, Math.floor(n(input.positions)));

  const rule = matchPricingRule(pricingRules, {
    ...input,
    qty,
    colors,
    positions,
  });
  const compat = matchCompatRule(compatRules, {
    ...input,
    qty,
    colors,
    positions,
  });

  if (!rule) {
    warnings.push({
      code: "PRICING_MISSING",
      severity: "error",
      message:
        "No hay reglas de impresión cargadas para esta técnica/cantidad/tintas/posiciones.",
    });
  }
  if (!compat) {
    warnings.push({
      code: "COMPAT_MISSING",
      severity: "warning",
      message:
        "No hay regla de compatibilidad para esta combinación. Validar manualmente.",
    });
  } else {
    if (compat.compatibility_status === "not_recommended") {
      warnings.push({
        code: "NOT_RECOMMENDED",
        severity: "error",
        message: "Combinación NO recomendada por reglas de compatibilidad.",
      });
    } else if (
      compat.compatibility_status === "validation_required" ||
      compat.requires_manual_validation
    ) {
      warnings.push({
        code: "VALIDATION_REQUIRED",
        severity: "warning",
        message: "Combinación requiere validación manual.",
      });
    }
    if (compat.colors_max != null && colors > n(compat.colors_max)) {
      warnings.push({
        code: "INK_LIMIT",
        severity: "warning",
        message: `Excede tintas máximas permitidas (${compat.colors_max}).`,
      });
    }
    if (compat.positions_max != null && positions > n(compat.positions_max)) {
      warnings.push({
        code: "POSITION_LIMIT",
        severity: "warning",
        message: `Excede posiciones máximas permitidas (${compat.positions_max}).`,
      });
    }
    if (
      input.print_area_cm2 != null &&
      compat.print_area_min_cm2 != null &&
      input.print_area_cm2 < n(compat.print_area_min_cm2)
    ) {
      warnings.push({
        code: "AREA_MIN",
        severity: "warning",
        message: `Área de impresión menor al mínimo (${compat.print_area_min_cm2} cm²).`,
      });
    }
    if (
      input.print_area_cm2 != null &&
      compat.print_area_max_cm2 != null &&
      input.print_area_cm2 > n(compat.print_area_max_cm2)
    ) {
      warnings.push({
        code: "AREA_MAX",
        severity: "warning",
        message: `Área de impresión excede el máximo (${compat.print_area_max_cm2} cm²).`,
      });
    }
  }

  const billableQty = rule
    ? Math.max(qty, n(rule.minimum_billable_qty))
    : qty;
  if (rule && billableQty > qty) {
    warnings.push({
      code: "MIN_BILLABLE_APPLIED",
      severity: "info",
      message: `Se factura mínimo ${billableQty} piezas (piezas mínimas facturables).`,
    });
  }

  // Costos por modelo
  const unit_cost = rule ? n(rule.unit_cost) : 0;
  const first_color_fixed = rule ? n(rule.first_color_fixed_cost) : 0;
  const additional_color_fixed = rule ? n(rule.additional_color_fixed_cost) : 0;

  const variable = billableQty * unit_cost;
  const flat = first_color_fixed + Math.max(0, colors - 1) * additional_color_fixed;
  const per_piece_color = billableQty * unit_cost * colors * positions;

  let raw_print_cost = 0;
  const model = (rule?.cost_model ?? "").toUpperCase();
  if (model === "FLAT") raw_print_cost = flat;
  else if (model === "PER_PIECE_COLOR") raw_print_cost = per_piece_color;
  else raw_print_cost = variable;

  const minimum_charge = rule ? n(rule.minimum_charge) : 0;
  const base_print_cost = Math.max(raw_print_cost, minimum_charge);
  if (rule && raw_print_cost < minimum_charge) {
    warnings.push({
      code: "MIN_CHARGE_APPLIED",
      severity: "info",
      message: `Se aplicó mínimo monetario de impresión ($${minimum_charge}).`,
    });
  }

  const setup = rule ? n(rule.setup_cost) : 0;
  const plate = rule ? n(rule.plate_cost) : 0;
  const negative_positive = rule ? n(rule.negative_positive_cost) : 0;
  const mold = rule ? n(rule.mold_cost) : 0;
  const repack = rule ? n(rule.repack_unit_cost) * billableQty : 0;
  const extras = rule
    ? n(rule.extra_fixed_cost) + n(rule.extra_unit_cost) * billableQty
    : 0;
  const compat_extra = compat
    ? n(compat.extra_fixed_cost) + n(compat.extra_unit_cost) * billableQty
    : 0;

  const additional_internal_costs =
    setup + plate + negative_positive + mold + repack + extras + compat_extra;

  const logistics =
    n(input.logistics_fee_mxn) * Math.max(0, Math.floor(n(input.logistics_job_count)));

  const buffer_pct = n(settings.operational_buffer_pct);
  const buffer = (base_print_cost + additional_internal_costs + logistics) * buffer_pct;

  const internal_total = base_print_cost + additional_internal_costs + logistics + buffer;

  const margin_pct = n(settings.default_margin_pct);
  const denom = 1 - margin_pct;
  const price_by_margin = denom > 0 ? internal_total / denom : internal_total;

  const min_profit = n(settings.minimum_profit_mxn);
  const price_by_min_profit = internal_total + min_profit;

  const suggested_customer_price = Math.max(price_by_margin, price_by_min_profit);
  const applied_min_profit = price_by_min_profit > price_by_margin;
  if (applied_min_profit) {
    warnings.push({
      code: "MIN_PROFIT_APPLIED",
      severity: "info",
      message: `Se aplicó utilidad mínima de $${min_profit}.`,
    });
  }

  const suggested_unit_price = qty > 0 ? suggested_customer_price / qty : 0;
  // setup visible al cliente = "Preparación técnica" — usamos setup + plate como preparación técnica facturable
  // pero como el precio unitario ya prorratea todo, dejamos setup_fee visible en 0 salvo casos manuales.
  const suggested_setup_fee = 0;

  const estimated_profit = suggested_customer_price - internal_total;

  return {
    matched_rule_id: rule?.id ?? null,
    matched_compat_id: compat?.id ?? null,
    compatibility_status: compat?.compatibility_status ?? null,
    billable_qty: billableQty,
    raw_print_cost: r2(raw_print_cost),
    base_print_cost: r2(base_print_cost),
    additional_internal_costs: r2(additional_internal_costs),
    cost_breakdown: {
      variable: r2(variable),
      flat: r2(flat),
      per_piece_color: r2(per_piece_color),
      setup: r2(setup),
      plate: r2(plate),
      negative_positive: r2(negative_positive),
      mold: r2(mold),
      repack: r2(repack),
      extras: r2(extras),
      compat_extra: r2(compat_extra),
    },
    logistics: r2(logistics),
    buffer: r2(buffer),
    internal_total: r2(internal_total),
    price_by_margin: r2(price_by_margin),
    price_by_min_profit: r2(price_by_min_profit),
    suggested_customer_price: r2(suggested_customer_price),
    suggested_unit_price: r2(suggested_unit_price),
    suggested_setup_fee: r2(suggested_setup_fee),
    estimated_profit: r2(estimated_profit),
    applied_min_profit,
    warnings,
  };
}
