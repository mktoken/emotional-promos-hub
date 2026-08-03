# Auditoría Preflight V2 — Solo lectura

## 1. Entorno inspeccionado
- Workspace del proyecto Lovable (checkout Git local) + backend Lovable Cloud (Postgres), únicamente `SELECT` sobre datos y catálogos del sistema.
- Sin escrituras, sin migraciones, sin Edge Functions, sin publish/rollback.

## 2. Rama activa del proyecto
- `feat/v2-cutover-preparation` (existe local y en `origin/feat/v2-cutover-preparation`).

## 3. Rama temporal del workspace
- `edit/edt-7b7416a2-4870-409f-b58c-4b7d40d1a1d7` (rama interna de Lovable, no se marca como blocker).

## 4. HEAD y verificación Git

| Comprobación | Resultado |
|---|---|
| HEAD | `9e40570b416e6562449847602d0cd66f2300220c` |
| Existe `9e40570` | Sí (objeto tipo commit) |
| Ancestry `9e40570` vs HEAD | OK — HEAD es exactamente `9e40570` |
| Ancestry `f71934a` | OK (`docs: registrar shadow write V2 certificado`) |
| Árbol de trabajo | limpio (`git status --porcelain` vacío) |

Diff `f71934a..9e40570` — exactamente 5 archivos, todos altas (`A`), 1953 inserciones, 0 borrados:

```text
A supabase/migrations/20260802233000_version_catalog_price_v2_shadow_tables.sql
A supabase/migrations/20260802235500_prepare_catalog_price_v2_releases.sql
A supabase/migrations/20260803002000_add_public_product_price_quote.sql
A supabase/qa/catalog_price_v2_release_preparation_assertions.sql
A supabase/qa/public_product_price_quote_assertions.sql
```

## 5. Tabla de verificación

| ID | Objeto | Esperado | Encontrado | Estado | Evidencia |
|---|---|---|---|---|---|
| G1 | Git commits/ancestros | 9e40570 = HEAD, f71934a ancestro | Coincide | PASS | `git rev-parse HEAD`, `merge-base --is-ancestor` |
| G2 | Diff autorizado | Solo los 5 archivos | Solo los 5 archivos | PASS | `git diff --name-status` |
| B1 | `catalog_price_cache_v2_generations` existe, RLS on | Tabla con RLS | `relkind=r`, `relrowsecurity=t` | PASS | `pg_class` |
| B2 | Gate 1 orden/tipos de columnas de `..._generations` | Orden: id, idempotency_key, mode, status, rule_set_id…; `request_id text` | Orden real: id, rule_set_id, status, mode, idempotency_key…; `request_id uuid` | **BLOCKER** | `information_schema.columns` (ordinal_position) |
| B3 | Gate 1 orden de columnas de `..._shadow` | id, generation_id, product_id, rule_set_id, public_price_status… | id, product_id, price_before_tax_mxn, currency, rule_set_id, public_price_status, computed_at, minimum_quantity, generation_id… | **BLOCKER** | `information_schema.columns` |
| B4 | Gate 2 constraints semánticos (UNIQUE, FK RESTRICT, mode/status/price contract) | Presentes | Todos presentes con nombres distintos pero definiciones equivalentes | PASS | `pg_constraint` (18 constraints) |
| B5 | Datos shadow preservados | 1524 filas / 1524 productos | 1524 / 1524 | PASS | `count(*)` |
| B6 | Generación certificada intacta | 45c79265… certified 1524/1505/19/0/0 | Idéntico | PASS | `catalog_price_cache_v2_generations` |
| B7 | Grants mínimos tablas internas | anon/authenticated sin SELECT | `false` en ambas | PASS | `has_table_privilege` |
| C1 | `catalog_price_v2_releases` | No existe aún (la crea la migración 2) | No existe | PASS | `pg_class` |
| C2 | Índice parcial única release current | `UNIQUE (is_current) WHERE is_current` | Definido en migración | PASS | migración 2, líneas 84-87 |
| C3 | Constraints de releases | current exige published_at/by y no superseded; par superseded coherente | Definidos | PASS | migración 2, líneas 34-50 |
| C4 | RLS/grants releases | RLS on, REVOKE anon/authenticated, GRANT service_role, 0 policies | Definido + gate de 0 policies | PASS | migración 2, líneas 116-138 |
| C5 | Vista `catalog_price_v2_current_prices` | security_barrier, solo 8 columnas públicas | Coincide con la lista que valida A5 | PASS | migración 2, líneas 147-168 |
| C6 | `publish_catalog_price_v2_generation(uuid)` | SECURITY DEFINER, `search_path=public, pg_temp`, staff, advisory lock, idempotente, EXECUTE solo authenticated | Todo presente (`pg_advisory_xact_lock`, revalidación de integridad shadow, retorno `reused=true`) | PASS | migración 2, líneas 177-380 |
| C7 | `rollback_catalog_price_v2_to_legacy()` | Igual criterio, no-op seguro sin release current | Presente, retorna `rolled_back=false` si no hay puntero | PASS | migración 2, líneas 391-459 |
| D1 | `get_public_product_price_quote(uuid,integer)` existe en Live | No existe aún (la crea la migración 3) | No existe | PASS | `pg_proc` |
| D2 | Dependencia `productos_publicos(id, precio_desde_mxn)` | Ambas columnas | Presentes | PASS | `information_schema.columns` |
| D3 | Dependencia `calculate_product_price_v2(uuid,integer,uuid)` | Firma exacta | Existe, SECURITY DEFINER, `search_path=public, pg_temp` | PASS | `pg_proc` |
| D4 | Cobertura de status del motor | valid / below_minimum / manual_review / request_quote / unavailable | Los 5 aparecen en el cuerpo y todos están cubiertos por el `CASE` + `ELSE` seguro | PASS | `prosrc` + prueba `SELECT` (`status=valid`, MOQ 83, 18.17 MXN) |
| D5 | Dependencia `is_staff(uuid)` | Existe SECURITY DEFINER | Existe (`search_path=public`, sin `pg_temp`) | WARNING | `pg_proc` |
| D6 | Validación de cantidad | 1..1000000 y product_id NOT NULL | `22023` / `22004` | PASS | migración 3, líneas 36-44 |
| D7 | Fallback legacy sin release current | Precio legacy redondeado, MOQ 1, `pricing_generation_id NULL` | Coincide con lo que valida Q3 | PASS | migración 3, líneas 71-115 |
| D8 | No exposición de internos | Sin costos, multiplicadores, proveedor, oferta, warning | Retorno solo 7 campos públicos | PASS | migración 3, líneas 11-19 |
| D9 | Status devuelto `below_minimum` | Fuera del contrato de 3 estados de shadow | Se devuelve como cuarto estado público | WARNING | migración 3, líneas 196-205 |
| E1 | Assertions preparación de releases | READ ONLY + ROLLBACK, sin escrituras | `BEGIN; SET TRANSACTION READ ONLY; … ROLLBACK;` | PASS | archivo QA 1, líneas 8-10, 410 |
| E2 | A3 contra datos reales | generación 45c79265 con 1524/1505/19 y 1524 filas shadow | Coincide con Live | PASS | consulta a Live |
| E3 | A4 `search_path` esperado | `search_path=public, pg_temp` | Igual al de las migraciones | PASS | archivo QA 1, líneas 305-312 |
| E4 | A6 contra datos reales | 1524 filas de caché, 1 rule set activo, draft inactivo | 1524 / `2026-01` activo / `2026-01-v2-draft` inactivo | PASS | consulta a Live |
| E5 | Assertions del precio público | READ ONLY + ROLLBACK, firmas y roles correctos | Correcto; Q5 valida 22023/22004 | PASS | archivo QA 2 |
| F1 | Migraciones no publican ni activan V2 | Sin INSERT en releases, sin UPDATE de `pricing_rule_sets` | Confirmado por lectura completa de los 3 archivos | PASS | grep/lectura |
| F2 | No tocan legacy ni borran datos | Sin DELETE/TRUNCATE/DROP, sin tocar `catalog_price_cache` ni `productos_publicos` | Confirmado | PASS | lectura |
| F3 | Aplicabilidad incremental | Las 3 migraciones aplicables sobre el estado actual | La migración 1 aborta en Gate 1 | **BLOCKER** | ver B2/B3 |

## 6. Blockers

**BLOCKER-1 — Gate 1 de columnas de `catalog_price_cache_v2_generations`**
- Archivo: `supabase/migrations/20260802233000_version_catalog_price_v2_shadow_tables.sql`
- Bloque: `DO $$ … Gate 1` (líneas 145-181), arreglo esperado en 159-178.
- Causa: el gate compara `column_name:udt_name:is_nullable` **ordenado por `ordinal_position`**. En Live el orden físico es `id, rule_set_id, status, mode, idempotency_key, …` y además `request_id` es **`uuid`**, no `text`. La comparación con `IS DISTINCT FROM` falla y la migración aborta con `catalog_price_cache_v2_generations_schema_drift`, dejando también sin aplicar las migraciones 2 y 3.
- Cambio mínimo requerido (no aplicado): comparar el conjunto de columnas sin depender del orden físico (p. ej. `ORDER BY column_name`, o `array_agg` sobre un conjunto ordenado alfabéticamente en ambos lados) y declarar `request_id:uuid:YES`.

**BLOCKER-2 — Gate 1 de columnas de `catalog_price_cache_v2_shadow`**
- Archivo: el mismo, líneas 183-208.
- Causa: mismo problema de orden físico. Live: `id, product_id, price_before_tax_mxn, currency, rule_set_id, public_price_status, computed_at, minimum_quantity, generation_id, created_at, updated_at, calculation_version`; el gate espera otro orden. Aborta con `catalog_price_cache_v2_shadow_schema_drift`.
- Cambio mínimo requerido (no aplicado): comparación independiente del orden.

Nota: los tipos, nullability, constraints, FKs, RLS y grants reales sí coinciden semánticamente con lo declarado; el único desajuste es el **orden de columnas** y el **tipo de `request_id`**.

## 7. Warnings no bloqueantes

1. `public.is_staff(uuid)` tiene `search_path=public` (sin `pg_temp`), a diferencia del estándar usado en las funciones nuevas. Preexistente, fuera del alcance de estos 5 archivos.
2. `get_public_product_price_quote` puede devolver `public_price_status = 'below_minimum'`, un cuarto estado que no existe en el contrato de 3 estados de `catalog_price_cache_v2_shadow`. El frontend deberá manejarlo antes del cutover.
3. Los nombres de constraints en Live difieren de los declarados en la migración (`..._idempotency_key_unique` vs `..._idempotency_key_key`, etc.). No bloquea porque Gate 2 valida por semántica y los `CREATE TABLE` son `IF NOT EXISTS`.
4. `productos_publicos` sigue siendo una vista sin `security_invoker`, punto ya reportado en la auditoría anterior y ajeno a estos archivos.

## 8. Veredicto
**NO-GO**

## 9. Confirmación explícita
- archivos modificados: 0
- base de datos modificada: no
- migraciones aplicadas: 0
- publish ejecutado: no
- rollback ejecutado: no
