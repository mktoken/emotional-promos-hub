# G4 V2 — Instalación privada (INSTALL_ONLY): dictamen y procedimiento mínimo

## 1. Dictamen
La infraestructura de Lovable Cloud que describes (PostgreSQL 17.6, roles `pe_g4_v2_owner` / `pe_g4_v2_executor`, `SET ROLE` desde postgres, capacidad de otorgar los 15 permisos) es suficiente para una instalación privada en una sola transacción. **Pero hoy no se puede instalar de forma segura: el paquete no está en el proyecto.**

## 2. Impedimento real pendiente (único)
- `docs/catalog-governance/PE-G4-COMPETITIVE-SCALES-V2-LOCAL-20261031/` **no existe**.
- No hay en el proyecto ni en los archivos subidos ningún SQL o ZIP con `COMPETITIVE-SCALES`, `INSTALL_ONLY` ni referencias a `pe_g4_v2_owner`.
- Los archivos subidos con "G4_V2" en el nombre (`APPLY_CANONICAL_MIGRATION_ONLY`, `RUNTIME_VERIFY_ONLY`) corresponden a entregas anteriores, no a este paquete de 6 tablas + 3 funciones con 143 pruebas.
- Sin el SQL original y su hash no se puede verificar integridad, permisos ni rollback, y no voy a reconstruirlo.

## 3. Procedimiento mínimo una vez recibido el paquete
1. **Entrega:** subir el ZIP original del paquete con su SHA-256 (y el manifiesto de hashes si existe).
2. **Verificación local (sin tocar Cloud):** comprobar hash, listar install/verify/rollback, confirmar que el install contiene solo: 6 `CREATE TABLE`, 3 `CREATE FUNCTION`, `ENABLE RLS`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, los 15 `GRANT` a `pe_g4_v2_executor`, y nada sobre `get_public_product_price_quote*`, `calculate_product_price_v2`, funciones `g4_*` V1, productos, precios ni crons. Reportar cualquier desviación con archivo y línea.
3. **Revisión de seguridad del SQL:** funciones con `SECURITY DEFINER` (si aplica) con `SET search_path` fijo, propietario `pe_g4_v2_owner`, `EXECUTE` revocado de `PUBLIC`; sin grants de lectura a las 10 tablas fuente (pendientes, como indicas).
4. **Preflight de solo lectura en Cloud:** confirmar que los 6 nombres de tabla y 3 de función no existen aún y tomar huella (definiciones/hash) del cotizador público y G4 V1 para comparar después.
5. **Ejecución en SQL Editor (con tu autorización explícita):** un único bloque `BEGIN; SET LOCAL ROLE pe_g4_v2_owner; ...instalación...; RESET ROLE; ...grants...; ...asserts que hacen RAISE si algo falla...; COMMIT;`. Cualquier fallo revierte todo.
6. **Postcheck de solo lectura:** existencia de 6+3 objetos, propietario, RLS activo, cero privilegios para `anon`/`authenticated`/`PUBLIC`, 15 permisos exactos, y huellas del cotizador público y G4 V1 idénticas al preflight.
7. **Rollback preparado:** script del paquete (DROP de los 9 objetos en una transacción), verificado en el paso 2, solo se ejecuta si el postcheck falla.

## 4. Fuera de alcance
No se conecta al cotizador, no se activan precios, no se modifican `productos_b2b`, ForPromotional, CDO, funciones existentes ni procesos automáticos, y no se exige invocador de aplicación.

## Siguiente paso
Sube el paquete original (ZIP + SHA-256). Con él ejecuto los pasos 2–4 en modo lectura y te entrego el bloque final listo para el SQL Editor.
