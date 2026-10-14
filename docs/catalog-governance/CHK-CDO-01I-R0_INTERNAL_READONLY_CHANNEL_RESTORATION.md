# CHK-CDO-01I-R0 — Internal Read-Only Catalog Inspection Channel

**Fecha:** 2026-10-13
**Baseline requerido:** `0058394a61b39c6a89c3900e9bfff319c6947513`
**Estado:** **PARTIAL — MECHANISM IDENTIFIED / WORK ACCESS UNAVAILABLE**

## Pre-flight

- Branch: `main`.
- `HEAD = origin/main = 0058394a61b39c6a89c3900e9bfff319c6947513`.
- Divergence: `0/0`.
- Working tree: limpio antes de este reporte.
- `CHK-CDO-01I`: `PARTIAL / PUBLISHED`, preservado sin cambios.
- Variantes canónicas: `354`.
- `MASTER_APPROVED`: `354`.
- Publicación live: `NO`.

## Mecanismo aprobado identificado

El mecanismo canónico es el **query executor interno de Lovable**, también
referido en los contratos como **internal Lovable/Supabase query surface**.
Su uso debe hacerse mediante archivos versionados del repositorio y dentro de
la superficie interna del proyecto; no es Work SQL ni una conexión externa.

Referencias canónicas:

- `docs/08_OPERATIONS_RUNBOOK.md:311-327`: patrón de PRECHECK SELECT-only,
  ejecución interna y restricción de no generalizar la capacidad a SQL/DML
  arbitrario.
- `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_ONE_SHOT_LOVABLE_CONTRACT_V5.md:78-87`:
  preflight read-only por la superficie interna y sin provider, Storage o
  runtime write path.
- `docs/catalog-governance/CHK-CATGOV-03F_G4_PILOT_ONE_SHOT_LOVABLE_CONTRACT_V5.md:91-99`:
  ejecución del archivo read-only a través del query executor soportado.
- `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT.md:20-35`:
  secuencia PRECHECK read-only y aplicación únicamente por el workflow interno
  Lovable/Supabase.
- `docs/MASTER-STATE.md:1937-1947`: evidencia histórica de que esa superficie
  fue utilizable en una operación controlada anterior.

### Modelo de autenticación

El acceso es **proyecto-scoped dentro de Lovable**, sujeto a la sesión y
permisos internos del proyecto. No requiere ni autoriza exponer secretos,
service role, CLI, dashboard externo o una segunda conexión de base de datos.

### Alcance read-only requerido para 01I

El canal debe poder ejecutar únicamente la consulta SELECT de 01I sobre las
autoridades live existentes, limitada a las 97 modelos / 354 variantes:

- `public.productos_b2b`;
- `public.productos_publicos`;
- `public.provider_raw_products`;
- `public.producto_proveedor_ofertas`;
- `public.producto_proveedor_stock`;
- `public.producto_b2b_oferta_map`;
- `public.producto_b2b_status`;
- superficies de precio existentes (`catalog_price_v2_current_prices`,
  `catalog_price_cache`, generaciones/releases y reglas relacionadas);
- `public.catalog_search_products_v2` y las RPCs públicas de lectura
  existentes cuando la verificación necesite comparar la proyección.

La lista anterior define el alcance de observación documentado; no constituye
evidencia de que cada tabla esté accesible en esta sesión ni autoriza consultas
de escritura.

## Evaluación de seguridad

**READ-ONLY SAFETY: PASS FOR THE PROPOSED SMOKE TEST**.

La operación permitida es una lectura mínima de una autoridad conocida. El
smoke test no debe contener ni ejecutar:

- `INSERT`, `UPDATE`, `DELETE`, `UPSERT` o DDL;
- RPCs con efectos laterales;
- Storage upload/delete;
- llamadas a providers, Edge Functions o schedulers;
- operaciones de auth o mutaciones de runtime.

No se consultaron secretos ni valores Vault. No se devolvieron URLs,
credenciales, tokens ni PII.

## Accesibilidad desde Work

**ACCESSIBLE FROM WORK: NO**.

La sesión actual no expone un conector invocable al query executor interno de
Lovable/Supabase. La pestaña disponible del navegador apunta al catálogo
público y no demuestra acceso al executor interno. No se improvisó CLI,
dashboard, service role, endpoint externo ni otra conexión.

**SMOKE TEST: NOT RUN**.

La causa exacta es: **A — el mecanismo existe, pero Work no puede invocarlo en
la sesión actual**. No hay evidencia suficiente para distinguir si la sesión
interna de Lovable está ausente o si el acceso requiere una superficie de
Lovable no conectada a Work; no se afirma una pérdida del mecanismo.

## Acción mínima de restauración

**LOVABLE CHAT/PLAN — no LOVABLE BUILD.**

Abrir el proyecto interno de Lovable con una sesión autorizada al query
executor y ejecutar únicamente un smoke test SELECT-only mínimo, usando el
archivo/consulta versionado aprobado. Confirmar canal alcanzable, permisos de
lectura y resultado sin writes. Después, entregar a Work el resultado no
sensible o habilitar la sesión interna conectada para continuar con
`CHK-CDO-01I-R1`.

No se requiere modificar código, crear migraciones, desplegar, cambiar
frontend o alterar el runtime.

## Integridad de 01I

Los artefactos existentes siguen siendo autoritativos para la ejecución
PARTIAL previa y no fueron modificados:

- `cdo-01i-publication-projection-dryrun-v1.csv`;
- `cdo-01i-model-commercial-readiness-v1.csv`;
- `CHK-CDO-01I_PUBLICATION_PROJECTION_DRY_RUN_AND_LIVE_READINESS.md`;
- `CHK-CDO-01I_LIVE_PROJECTION_PLAN.md`.

## Resultado

- `read-only mechanism`: `IDENTIFIED`.
- `read-only smoke test`: `NOT RUN`.
- Database writes: `0`.
- Supabase mutations: `0`.
- Runtime mutations: `0`.
- Lovable changes: `0`.
- Frontend changes: `0`.
- Publication: `NO`.
- Provider changes/calls: `0`.

**NEXT:** `CHK-CDO-01I-R1` únicamente después de restaurar el acceso interno
read-only y obtener un smoke test PASS.
