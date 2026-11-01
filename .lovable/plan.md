# PE-G4 V2 — Revisión del paquete INSTALL_ONLY (20261101)

## 1. Integridad
ZIP recibido: SHA-256 `817137ee…58aa`. Los 9 archivos coinciden exactamente con `SHA256SUMS.txt` (9/9).

## 2. Compatibilidad con Lovable Cloud (verificada con lecturas en el catálogo del sistema)
| Guarda del instalador `02` | Estado en Cloud | Resultado |
|---|---|:---:|
| `pe_g4_v2_owner` / `executor`: sin login, sin super, sin bypass RLS, sin herencia | Así está | PASS |
| `postgres` puede hacer SET ROLE al owner (`set_option=true`) | Así está | PASS |
| El executor no tiene miembros con SET/INHERIT (postgres solo tiene ADMIN) | Así está | PASS |
| owner y executor no son miembros de otro rol | Así está | PASS |
| `postgres` tiene CREATE WITH GRANT OPTION en `public` y REFERENCES WITH GRANT OPTION en las 4 tablas referenciadas | Así está | PASS |
| owner y executor tienen USAGE en `public` | Así está | PASS |
| Ninguno de los 9 objetos existe todavía | 0 tablas, 0 funciones | PASS |
| Los privilegios por defecto no dan acceso público a objetos del owner | Solo existen para `postgres` y `supabase_admin`; ninguno para `pe_g4_v2_owner` | PASS |
| Ningún disparador automático concede permisos al crear tablas o funciones | Solo avisos internos y extensiones | PASS |
| Las 3 funciones son PL/pgSQL (sin lectura de fuentes al crearlas) | Confirmado | PASS |

Diferencias entre `01` y `02`: solo en las guardas de la sesión (se elimina el invocador, `session_user` debe ser `postgres`, se añade la marca de autorización). Las 6 tablas y las 3 funciones son idénticas.

## 3. Correcciones indispensables (no cambian el motor)
1. **`02`, línea 12:** cambiar `'false'` a `'true'` en una **copia de ejecución** con hash propio, solo tras tu autorización. Es el único cambio al instalador.
2. **`02`, líneas 23–25:** exige `session_user = 'postgres'`. Si el SQL Editor abre la sesión con otro usuario, el instalador se detiene sin cambiar nada. No se debe debilitar; se comprueba antes (P0).
3. **Faltan archivos:** el `09` canónico de rollback y el preflight/postcheck para INSTALL_ONLY. Abajo están las propuestas (sección 5).

## 4. Bloqueo técnico pendiente (único real)
**No está probado que el SQL Editor ejecute todo el lote en una sola sesión y transacción.** Si separa las sentencias, los `GRANT` temporales (líneas 135–141) podrían confirmarse antes de que una guarda falle. Los `SET LOCAL` ya no protegerían nada. Además, el rollback propuesto aún no se ha probado.

**Dictamen: BLOCKED. Pasa a READY_FOR_PRIVATE_INSTALL_REVIEW cuando P0 dé PASS y el rollback R se haya probado.**

## 5. Controles propuestos (no ejecutados)

**P0 — Prueba de atomicidad del editor (no crea objetos):**
```sql
BEGIN;
SET LOCAL app.g4_probe = 'same_tx';
SELECT session_user, current_user, txid_current() AS tx_a,
       current_setting('app.g4_probe', true) AS probe, pg_backend_pid() AS pid_a;
SELECT txid_current() AS tx_b, current_setting('app.g4_probe', true) AS probe_b,
       pg_backend_pid() AS pid_b;
DO $$ BEGIN RAISE EXCEPTION 'g4_probe_forced_abort'; END $$;
SELECT 'NO_DEBE_APARECER';
COMMIT;
```
PASS: `session_user=postgres`, `tx_a=tx_b`, `pid_a=pid_b`, `probe_b='same_tx'`, el error interrumpe el lote y `NO_DEBE_APARECER` no aparece.

**PRE — Preflight de solo lectura:** las guardas de la sección 2, más una huella SHA de la definición de `get_public_product_price_quote`, `get_public_product_price_quote_v2`, `calculate_product_price_v2` y las funciones `g4_*` V1. También: conteo de `pricing_rule_sets`, permisos de las 10 tablas fuente y lista de tareas programadas.

**INSTALL:** copia de ejecución de `02` con la corrección 1, pegada completa y ejecutada una sola vez.

**POST — Postcheck de solo lectura:**
- 6 tablas y 3 funciones presentes, con dueño `pe_g4_v2_owner` y comentario `PE_G4_V2_MANIFEST:20261101`.
- RLS activado y forzado en las 6 tablas. Políticas exactas: `default_deny` (PUBLIC), `private_read` (executor), `owner_execute` (owner).
- `anon`, `authenticated`, `service_role` y PUBLIC: 0 privilegios en tablas y funciones.
- Executor: solo SELECT en las 6 tablas y EXECUTE en las 3 funciones.
- Owner: sin CREATE en `public`, sin REFERENCES ni SELECT en las 10 fuentes.
- Huellas del cotizador público y de G4 V1, conteo de `pricing_rule_sets` y tareas programadas idénticos al preflight.

**R — Rollback separado (solo si POST falla, con autorización expresa):**
```sql
BEGIN;
DO $$ BEGIN  -- solo si los 9 objetos llevan la marca del manifiesto y son del owner
  IF (SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
      AND c.relname IN ('g4_price_generation_candidates_v2_shadow','g4_price_generation_candidate_rows_v2_shadow',
        'g4_v2_runtime_contract_shadow','g4_v2_policy_anchors_shadow','g4_v2_competitive_segments_shadow',
        'g4_v2_generation_blockers_shadow')
      AND obj_description(c.oid,'pg_class')='PE_G4_V2_MANIFEST:20261101'
      AND pg_get_userbyid(c.relowner)='pe_g4_v2_owner') <> 6
  THEN RAISE EXCEPTION 'g4_v2_rollback_manifest_mismatch'; END IF;
  -- mismo control para las 3 funciones; además, 0 filas en las 6 tablas
END $$;
SET LOCAL ROLE pe_g4_v2_owner;
DROP FUNCTION public.g4_prepare_price_generation_v2_shadow(text,uuid,text[],integer);
DROP FUNCTION public.g4_calculate_product_price_v2_shadow_v2(uuid,integer,uuid);
DROP FUNCTION public.g4_v2_evidence_bundle_version_shadow_v2(uuid,uuid,text);
DROP TABLE public.g4_v2_generation_blockers_shadow, public.g4_price_generation_candidate_rows_v2_shadow,
  public.g4_v2_competitive_segments_shadow, public.g4_v2_policy_anchors_shadow,
  public.g4_v2_runtime_contract_shadow, public.g4_price_generation_candidates_v2_shadow;  -- sin CASCADE
RESET ROLE;
-- comprobar que quedan 0 objetos y que las huellas coinciden con PRE
COMMIT;
```
Sin CASCADE, por lo que no puede tocar objetos ajenos. Antes de usarlo hay que probarlo: instalar `02` y luego R en PostgreSQL local 17 con un esquema sintético (requiere modo build; antes falló como root, se resolvería con un usuario sin privilegios en /tmp).

## 6. Orden mínimo
1. (Build) Prueba local de `02` + R con esquema sintético.
2. Ejecutar P0 en el SQL Editor (no crea objetos) y PRE.
3. Si ambos dan PASS: pedir autorización → INSTALL → POST → R solo si POST falla.

Sin cambios en el cotizador público, G4 V1, productos, precios, `productos_b2b.activo`, ForPromotional, CDO ni tareas programadas.
