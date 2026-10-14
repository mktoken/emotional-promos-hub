// Pruebas Deno de la Edge Function recompute-catalog-price-cache-v2.
// Cubren el contrato de entrada, el mapeo de estados del motor, la
// certificación y la sanitización de logs (lógica pura), más pruebas de
// autorización contra la función desplegada.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BATCH_SIZE_MAX,
  BATCH_SIZE_MIN,
  canCertify,
  emptyCounters,
  mapEngineResult,
  needsMoqRetry,
  RequestSchema,
  sanitizeError,
} from "./logic.ts";
import {
  normalizeProductIds,
  resolveTargetProductIds,
  shouldPersistGeneration,
  takeTargetProductBatch,
  targetOffsetAfterCursor,
} from "./targeted.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const FN_URL = `${SUPABASE_URL}/functions/v1/recompute-catalog-price-cache-v2`;

// ---------------------------------------------------------------- contrato

Deno.test("3. payload inválido es rechazado", () => {
  assertFalse(RequestSchema.safeParse({ mode: "otro", idempotency_key: "abcdefgh" }).success);
  assertFalse(RequestSchema.safeParse({ mode: "dry_run" }).success);
  assertFalse(RequestSchema.safeParse({ mode: "dry_run", idempotency_key: "short" }).success);
});

Deno.test("4. campos desconocidos rechazados (rule_set_id, counts)", () => {
  const base = { mode: "dry_run", idempotency_key: "abcdefgh12" };
  assertFalse(RequestSchema.safeParse({ ...base, rule_set_id: crypto.randomUUID() }).success);
  assertFalse(RequestSchema.safeParse({ ...base, priced_count: 10 }).success);
  assertFalse(RequestSchema.safeParse({ ...base, status: "certified" }).success);
});

Deno.test("5. targeted product_ids accepts UUIDs and deduplicates deterministically", () => {
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const parsed = RequestSchema.safeParse({
    mode: "dry_run",
    idempotency_key: "targeted-001",
    product_ids: [second, first, second],
  });
  assert(parsed.success);
  assertEquals(normalizeProductIds(parsed.data.product_ids), [first, second].sort());
});

Deno.test("6. targeted product selection reports missing IDs without widening scope", () => {
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const missing = crypto.randomUUID();
  assertEquals(resolveTargetProductIds([second, first, second, missing], [first, second]), {
    uniqueIds: [first, second, missing].sort(),
    validIds: [first, second].sort(),
    missingIds: [missing],
  });
  assertEquals(takeTargetProductBatch([first, second], 0, 1), [first]);
  assertEquals(takeTargetProductBatch([first, second], 1, 1), [second]);
  assertEquals(targetOffsetAfterCursor([first, second], first), 1);
  assertEquals(targetOffsetAfterCursor([first, second], null), 0);
});

Deno.test("6b. targeted dry_run is zero-write while global behavior persists generations", () => {
  assertFalse(shouldPersistGeneration("dry_run", true));
  assert(shouldPersistGeneration("dry_run", false));
  assert(shouldPersistGeneration("shadow_write", true));
});

Deno.test("7. batch_size fuera de rango", () => {
  const base = { mode: "dry_run", idempotency_key: "abcdefgh12" };
  assertFalse(RequestSchema.safeParse({ ...base, batch_size: BATCH_SIZE_MIN - 1 }).success);
  assertFalse(RequestSchema.safeParse({ ...base, batch_size: BATCH_SIZE_MAX + 1 }).success);
  assert(RequestSchema.safeParse({ ...base, batch_size: 200 }).success);
});

Deno.test("16. cursor válido admitido para reanudación", () => {
  const parsed = RequestSchema.safeParse({
    mode: "dry_run",
    idempotency_key: "abcdefgh12",
    cursor: crypto.randomUUID(),
  });
  assert(parsed.success);
  assertFalse(
    RequestSchema.safeParse({ mode: "dry_run", idempotency_key: "abcdefgh12", cursor: "no-uuid" }).success,
  );
});

// ---------------------------------------------------------------- mapeo

Deno.test("9. below_minimum dispara recálculo en MOQ", () => {
  assert(needsMoqRetry({ status: "below_minimum", minimum_quantity: 500, unit_price_mxn: null }));
  assertFalse(needsMoqRetry({ status: "below_minimum", minimum_quantity: 0, unit_price_mxn: null }));
  assertFalse(needsMoqRetry({ status: "valid", minimum_quantity: 250, unit_price_mxn: 10 }));
});

Deno.test("10. valid mapea a priced", () => {
  const r = mapEngineResult({ status: "valid", minimum_quantity: 250, unit_price_mxn: 86.84 }, 250, false);
  assert(r.ok);
  assertEquals(r.public_price_status, "priced");
  assertEquals(r.price_before_tax_mxn, 86.84);
});

Deno.test("11. manual_review y request_quote mapean a request_quote", () => {
  for (const status of ["manual_review", "request_quote"]) {
    const r = mapEngineResult({ status, minimum_quantity: 250, unit_price_mxn: null }, 250, false);
    assert(r.ok);
    assertEquals(r.public_price_status, "request_quote");
  }
});

Deno.test("12. unavailable mapea a unavailable", () => {
  const r = mapEngineResult({ status: "unavailable", minimum_quantity: null, unit_price_mxn: null }, 250, false);
  assert(r.ok);
  assertEquals(r.public_price_status, "unavailable");
});

Deno.test("13. request_quote y unavailable guardan precio NULL", () => {
  const rq = mapEngineResult({ status: "request_quote", minimum_quantity: 250, unit_price_mxn: 99 }, 250, false);
  const un = mapEngineResult({ status: "unavailable", minimum_quantity: 250, unit_price_mxn: 99 }, 250, false);
  assert(rq.ok && rq.price_before_tax_mxn === null);
  assert(un.ok && un.price_before_tax_mxn === null);
});

Deno.test("14. priced exige precio positivo y MOQ > 0", () => {
  assertFalse(mapEngineResult({ status: "valid", minimum_quantity: 250, unit_price_mxn: 0 }, 250, false).ok);
  assertFalse(mapEngineResult({ status: "valid", minimum_quantity: 250, unit_price_mxn: null }, 250, false).ok);
  assertFalse(mapEngineResult({ status: "valid", minimum_quantity: 0, unit_price_mxn: 10 }, 250, false).ok);
});

Deno.test("estado desconocido y below_minimum sin resolver son bloqueantes", () => {
  assertFalse(mapEngineResult({ status: "raro", minimum_quantity: 1, unit_price_mxn: 1 }, 250, false).ok);
  assertFalse(mapEngineResult({ status: "below_minimum", minimum_quantity: 1, unit_price_mxn: null }, 1, true).ok);
  assertFalse(mapEngineResult(null, 250, false).ok);
});

// ---------------------------------------------------------------- certificación

Deno.test("15. error o unresolved impiden certificar", () => {
  const base = { ...emptyCounters(), processed_count: 10, priced_count: 10 };
  assert(canCertify(10, base));
  assertFalse(canCertify(10, { ...base, error_count: 1 }));
  assertFalse(canCertify(10, { ...base, unresolved_count: 1 }));
  assertFalse(canCertify(10, { ...base, processed_count: 9 }));
  assertFalse(canCertify(10, { ...base, priced_count: 9 }));
});

// ---------------------------------------------------------------- logs

Deno.test("18. logs sanitizados sin JWT ni Authorization", () => {
  const msg = sanitizeError(new Error("failed Bearer eyJhbGciOiJIUzI1NiJ9.abcdefghij.zzz"));
  assertFalse(msg.includes("eyJhbGciOiJIUzI1NiJ9"));
  assert(msg.includes("[redacted]"));
});

// ---------------------------------------------------------------- HTTP / autorización

Deno.test("1. request sin JWT es rechazado (401)", async () => {
  if (!SUPABASE_URL) return;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "dry_run", idempotency_key: "test-no-jwt-0001" }),
  });
  await res.text();
  assert(res.status === 401 || res.status === 403, `status=${res.status}`);
});

Deno.test("2. JWT anónimo (sin permiso) es rechazado", async () => {
  if (!SUPABASE_URL || !ANON_KEY) return;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ mode: "dry_run", idempotency_key: "test-anon-key-0001" }),
  });
  await res.text();
  assert(res.status === 401 || res.status === 403, `status=${res.status}`);
});
