# Reporte — Sub-Build B — Recompute Shadow V2 (dry_run)

Fecha: 2026-08-03
Función: `supabase/functions/recompute-catalog-price-cache-v2`
Modo implementado: `dry_run` + `shadow_write` (sólo `dry_run` autorizado para ejecutar).

## 1. Contrato de entrada (Zod, `.strict()`)

```json
{
  "mode": "dry_run | shadow_write",
  "idempotency_key": "string (8..200)",
  "batch_size": "int 25..500 (default 200, opcional)",
  "cursor": "uuid | null (opcional)"
}
```

Rechazado explícitamente: `rule_set_id`, listas de `product_ids`, `status`, conteos,
precios, `minimum_quantity`, `generation_id`, proveedor y rol. Cualquier campo
desconocido produce `400 invalid_payload`.

## 2. Autoridad de negocio

Única fuente de precio: `public.calculate_product_price_v2(product_id, qty, rule_set_id)`.
No se replican multiplicadores, niveles, costos, MOQ ni lógica G4/CDO/ForPromotional
en TypeScript. La función no fue modificada.

Rule set resuelto en servidor: `version = '2026-01-v2-draft' AND is_active = false`
(debe existir exactamente uno; si no, aborta con `409 draft_rule_set_not_unique`).

## 3. Universo de candidatos

Universo certificado por el preflight B: productos con fila en
`public.catalog_price_cache` (1 fila por producto, `count(distinct producto_b2b_id) = 1524`
al momento del build). El cliente no puede alterarlo.

## 4. Autorización utilizada

- JWT obligatorio; `anon` rechazado explícitamente.
- Autorización por `public.is_staff(auth.uid())` (mecanismo real existente en el proyecto),
  verificado en el servidor con service_role.
- Alternativa backend: `Authorization: Bearer <service_role>` (nunca expuesto al navegador).
- CORS restrictivo por lista blanca de orígenes; sin comodín.

## 5. Flujo por producto

1. `calculate_product_price_v2(product_id, 250, draft_rule_set_id)`.
2. Si `status = below_minimum` y `minimum_quantity > 0`, se reejecuta con `minimum_quantity`.
3. Mapeo: `valid → priced`; `manual_review | request_quote → request_quote`;
   `unavailable → unavailable`; cualquier otro estado → `unresolved` (bloqueante).
4. Validación de contrato: `priced` exige precio > 0 y MOQ > 0; `request_quote` y
   `unavailable` exigen precio público NULL.
5. No se persiste: costo unitario, multiplicador, `provider_code`, `source_oferta_id`,
   warnings internos, payloads externos, márgenes.

## 6. Idempotencia, concurrencia y logs

- `idempotency_key` UNIQUE en `catalog_price_cache_v2_generations`; una repetición sobre una
  generación ya terminada devuelve el resultado previo sin reprocesar.
- Se bloquea una segunda generación `running` para el mismo rule set + modo (`409`).
- Progreso persistido tras cada batch; reanudación por `cursor` (uuid del último producto).
- Sin transacción abierta sobre todo el universo; presupuesto de tiempo de 50 s por invocación,
  devolviendo `next_cursor` cuando queda trabajo.
- Logs: `request_id`, `generation_id`, `mode`, `batch`, `cursor`, conteos, duración, resultado
  y error sanitizado. Sin JWT, Authorization, service role, costos, multiplicadores ni PII.

## 7. Certificación

`certified` sólo si `processed_count = candidate_count`, `error_count = 0`,
`unresolved_count = 0` y la suma por status iguala `candidate_count`.
En `dry_run` el cierre es `completed` (no hay filas shadow persistidas).

## 8. Resultados de pruebas (Deno)

15/15 pruebas en verde (`supabase/functions/recompute-catalog-price-cache-v2/index.test.ts`):
contrato inválido, campos desconocidos, `batch_size` fuera de rango, cursor, retry por MOQ,
mapeos `valid/manual_review/request_quote/unavailable`, precio NULL en no-priced, precio
positivo obligatorio en `priced`, bloqueo de certificación con error/unresolved, sanitización
de logs, request sin JWT (401) y request con clave anónima (401/403).
Los escenarios 5, 6, 17, 19 y 20 (rule set draft duplicado, key duplicada, concurrencia,
caché pública sin cambios, rule set activo sin cambios) se verifican con
`supabase/qa/recompute_v2_assertions.sql` tras la ejecución.

## 9. Ejecución dry_run

- `idempotency_key`: `dryrun-2026-08-03-subbuild-b-01`
- Estado: **PENDIENTE DE SESIÓN STAFF**. La función exige JWT de staff y no hay sesión
  autenticada disponible en el entorno de ejecución del agente (auth status: `signed_out`),
  por lo que el dry_run **no se ejecutó**. No se creó ninguna generación.
- Al iniciar sesión con una cuenta staff en la vista previa, se ejecuta una única vez con
  esa `idempotency_key` y se completa esta sección con: `generation_id`, `candidate_count`,
  `processed_count`, `priced_count`, `request_quote_count`, `unavailable_count`,
  `error_count`, `unresolved_count`, MOQ resueltos y diferencias vs. baseline
  (1,524 / 1,505 / 19 / 0 / 0 / 0 / 120).

## 10. Estado del sistema tras este build

- `catalog_price_cache_v2_shadow`: **0 filas nuevas** (dry_run no escribe; además no se ejecutó).
- `catalog_price_cache`: **sin cambios**.
- `pricing_rule_sets`: **V2 sigue inactivo** (`2026-01-v2-draft`, `is_active = false`).
- Frontend: **sin cambios**. Cutover: **no preparado**. **No Publish**.
