// Lógica pura (sin IO) del recompute Shadow V2.
// NO contiene reglas de negocio de precios: la única autoridad es
// public.calculate_product_price_v2.

import { z } from "npm:zod@3.23.8";

export const CALCULATION_VERSION = "v2-shadow-1";
export const DRAFT_RULE_SET_VERSION = "2026-01-v2-draft";
export const BASE_QUANTITY = 250;

export const BATCH_SIZE_MIN = 25;
export const BATCH_SIZE_MAX = 500;
export const BATCH_SIZE_DEFAULT = 200;

export const RequestSchema = z
  .object({
    mode: z.enum(["dry_run", "shadow_write"]),
    idempotency_key: z.string().trim().min(8).max(200),
    batch_size: z.number().int().min(BATCH_SIZE_MIN).max(BATCH_SIZE_MAX).optional(),
    cursor: z.string().uuid().nullable().optional(),
  })
  .strict();

export type RecomputeRequest = z.infer<typeof RequestSchema>;

export type EngineRow = {
  status: string | null;
  minimum_quantity: number | null;
  unit_price_mxn: number | string | null;
};

export type MappedResult =
  | {
      ok: true;
      public_price_status: "priced" | "request_quote" | "unavailable";
      price_before_tax_mxn: number | null;
      minimum_quantity: number | null;
      requested_quantity: number;
      resolved_via_moq: boolean;
    }
  | { ok: false; reason: string };

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ¿Debe reintentarse el cálculo en la cantidad mínima real? */
export function needsMoqRetry(row: EngineRow): boolean {
  return row.status === "below_minimum" && (row.minimum_quantity ?? 0) > 0;
}

/**
 * Mapea el resultado final del motor al contrato público shadow.
 * valid -> priced | manual_review|request_quote -> request_quote | unavailable -> unavailable
 * Cualquier otro estado es bloqueante (unresolved).
 */
export function mapEngineResult(
  row: EngineRow | null,
  requestedQuantity: number,
  resolvedViaMoq: boolean,
): MappedResult {
  if (!row) return { ok: false, reason: "empty_engine_result" };
  const price = toNumber(row.unit_price_mxn);
  const minQty = row.minimum_quantity ?? null;

  switch (row.status) {
    case "valid": {
      if (price === null || price <= 0) return { ok: false, reason: "priced_without_valid_price" };
      if (!minQty || minQty <= 0) return { ok: false, reason: "priced_without_minimum_quantity" };
      return {
        ok: true,
        public_price_status: "priced",
        price_before_tax_mxn: price,
        minimum_quantity: minQty,
        requested_quantity: requestedQuantity,
        resolved_via_moq: resolvedViaMoq,
      };
    }
    case "manual_review":
    case "request_quote":
      return {
        ok: true,
        public_price_status: "request_quote",
        price_before_tax_mxn: null,
        minimum_quantity: minQty && minQty > 0 ? minQty : null,
        requested_quantity: requestedQuantity,
        resolved_via_moq: resolvedViaMoq,
      };
    case "unavailable":
      return {
        ok: true,
        public_price_status: "unavailable",
        price_before_tax_mxn: null,
        minimum_quantity: minQty && minQty > 0 ? minQty : null,
        requested_quantity: requestedQuantity,
        resolved_via_moq: resolvedViaMoq,
      };
    case "below_minimum":
      return { ok: false, reason: "below_minimum_unresolved" };
    default:
      return { ok: false, reason: `unexpected_status:${row.status ?? "null"}` };
  }
}

export type Counters = {
  processed_count: number;
  priced_count: number;
  request_quote_count: number;
  unavailable_count: number;
  error_count: number;
  unresolved_count: number;
  moq_resolved_count: number;
};

export function emptyCounters(): Counters {
  return {
    processed_count: 0,
    priced_count: 0,
    request_quote_count: 0,
    unavailable_count: 0,
    error_count: 0,
    unresolved_count: 0,
    moq_resolved_count: 0,
  };
}

/** Una generación sólo puede certificarse si todo cuadra. */
export function canCertify(candidateCount: number, c: Counters): boolean {
  const sum = c.priced_count + c.request_quote_count + c.unavailable_count;
  return (
    candidateCount > 0 &&
    c.processed_count === candidateCount &&
    c.error_count === 0 &&
    c.unresolved_count === 0 &&
    sum === candidateCount
  );
}

/** Elimina cualquier dato sensible de un error antes de loguearlo. */
export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "unknown_error");
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "[redacted]")
    .slice(0, 300);
}
