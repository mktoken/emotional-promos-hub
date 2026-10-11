# CHK-CATGOV-02F — Aplicar 0004 existente (resultado de pre-flight)

## Baseline (verificado, solo lectura)

- HEAD = `be91dcabb553cdd590cd38181f62119370d454f3` (coincide con el esperado), árbol limpio.
- `0004_catalog_governance_admin_console_contract_fix_v1.sql` presente (sha256 `51a2c66b…1192`), ya registrada en `_journal.json` (idx 4) con `0004_snapshot.json`. 0005 ausente.

## Hallazgo: EXISTING MIGRATION APPLICATION — UNAVAILABLE

- Herramienta interna disponible: la herramienta de migraciones de la base de datos de Lovable.
- Por qué no puede ejecutar 0004 tal cual: siempre crea un archivo de migración custom **nuevo** con drizzle-kit, escribe ahí el SQL, actualiza journal/snapshot y aplica. Como 0004 ya está en el journal, el resultado sería forzosamente un `0005_*.sql` (más entrada de journal y snapshot) con el mismo SQL.
- ¿Obliga técnicamente a una nueva migración? Sí: no tiene modo "aplicar archivo existente".
- ¿Vía interna oficial para SQL versionado sin crear archivo? No. La otra herramienta de SQL interna solo admite INSERT/UPDATE/DELETE (rechaza `CREATE OR REPLACE FUNCTION`).

## Acción propuesta

Conforme al documento: STOP. No crear 0005, no editar 0004, no usar vías externas, no hacer QA live (0004 no aplicada). Reporte final:

```text
BASELINE: be91dca… PASS
EXISTING MIGRATION APPLICATION: UNAVAILABLE
MIGRATION 0004: NOT APPLIED
APPLIED EXACTLY ONCE: NOT APPLIED
MIGRATION 0005: ABSENT
CODE CHANGES: 0   REPOSITORY CHANGES: 0
QUEUE/DETAIL/QA: NOT TESTED
RUNTIME MUTATIONS: 0   PROVIDER CALLS: 0
G4 / FORPROMOTIONAL / CDO: UNTOUCHED
FINAL: CHK-CATGOV-02F — BLOCKED (esperando decisión arquitectónica)
```

## Opciones para la decisión (no se ejecuta ninguna sin autorización)

1. Autorizar que la herramienta interna genere `0005` con el SQL de 0004 byte a byte (0004 quedaría como versionada no aplicada / marcada como sustituida en Work).
2. Mantener bloqueado hasta otra ruta oficial.  
  
PROMOCIONALES EMOCIONALES
  CHK-CATGOV-02G — AUTHORIZED INTERNAL DEPLOYMENT VIA 0005
  CONTROLLED EXCEPTION FOR LOVABLE MIGRATION TOOLING
  ==================================================
  DECISIÓN ARQUITECTÓNICA
  ==================================================
  Se autoriza una excepción controlada debido a una limitación confirmada del
  workflow interno de migraciones de Lovable:
  - migration 0004 ya está versionada;
  - migration 0004 NO está aplicada en runtime;
  - Lovable no dispone de mecanismo interno oficial para aplicar un archivo de
    migración ya existente;
  - el único workflow autorizado genera una nueva migration antes de aplicar.
  Por tanto:
  AUTORIZO crear migration 0005 únicamente como vehículo de despliegue del
  mismo cambio funcional ya aprobado en 0004.
  ==================================================
  ESTADO CANÓNICO
  ==================================================
  0004:
  drizzle/migrations/0004_catalog_governance_admin_console_contract_fix_v1.sql
  Status:
  REPOSITORY-PREPARED
  NOT APPLIED TO RUNTIME
  NO modificar.
  NO borrar.
  NO marcar falsamente como aplicada.
  0005:
  debe convertirse en:
  RUNTIME DEPLOYMENT MIGRATION
  y aplicar exactamente la misma lógica funcional.
  ==================================================
  BASELINE
  ==================================================
  Antes de cualquier cambio:
  git fetch origin --prune
  Confirmar:
  branch = main
  HEAD = origin/main
  divergence = 0 / 0
  working tree = clean
  HEAD esperado:
  be91dcabb553cdd590cd38181f62119370d454f3
  Si origin/main avanzó:
  STOP.
  ==================================================
  AUTORIZACIÓN 0005
  ==================================================
  Usar exclusivamente la herramienta INTERNA de migraciones de Lovable.
  Se autoriza que genere una nueva migration 0005.
  La nueva migration debe contener únicamente:
  CREATE OR REPLACE FUNCTION
  public.catalog_governance_admin_queue_v1(...)
  CREATE OR REPLACE FUNCTION
  public.catalog_governance_admin_detail_v1(uuid)
  y los correspondientes:
  REVOKE
  GRANT
  Nada más.
  ==================================================
  SEMANTIC EQUIVALENCE REQUIREMENT
  ==================================================
  Antes de aplicar:
  comparar 0005 contra 0004.
  Debe cumplirse:
  FUNCTIONAL SQL EQUIVALENCE = EXACT
  Las únicas diferencias aceptables son:
  - nombre/metadata de migration;
  - artifacts automáticos journal/snapshot;
  - formatting técnico inevitable del generador si no cambia semántica.
  NO aceptar diferencias en:
  - joins;
  - Provider SKU contract;
  - collection limits;
  - collection_meta;
  - envelope;
  - models;
  - memberships;
  - offers;
  - sources;
  - security;
  - grants;
  - function signatures.
  Si existe cualquier diferencia funcional:
  STOP.
  ==================================================
  NO MODIFICAR 0004
  ==================================================
  0004 debe permanecer byte-identical al estado actual.
  SHA conocido:
  51a2c66b…1192
  Verificar después que continúa igual.
  ==================================================
  0005 — SCOPE
  ==================================================
  La migration 0005 NO puede contener:
  CREATE TABLE
  ALTER TABLE
  CREATE INDEX
  DROP
  INSERT
  UPDATE
  DELETE
  backfill
  stock changes
  pricing changes
  mapping changes
  category changes
  publication changes
  storage changes
  provider changes
  Solo reemplazo de las dos funciones y permisos.
  ==================================================
  APLICACIÓN
  ==================================================
  Aplicar 0005 exactamente una vez mediante el workflow interno de Lovable.
  Después confirmar mediante introspección:
  DB contiene las nuevas versiones de:
  catalog_governance_admin_queue_v1
  catalog_governance_admin_detail_v1
  ==================================================
  QA LIVE — PROVIDER SKU
  ==================================================
  Probar:
  1. provider_raw_products.provider_sku real
  2. producto_proveedor_ofertas.variant_sku real
  3. coincidencia parcial
  4. case-insensitive
  5. SKU inexistente
  6. producto sin ofertas
  PASS requiere:
  Provider SKU real funciona
  Variant SKU funciona
  inexistente = 0
  sin duplicados
  total_count correcto
  ==================================================
  QA LIVE — DETAIL
  ==================================================
  Confirmar envelope:
  overview
  sources
  evidence
  attributes
  content
  assets
  issues
  approvals
  runtime
  models
  memberships
  offers
  governance_state
  published
  pricing
  collection_meta
  ==================================================
  BOUNDED COLLECTIONS
  ==================================================
  Confirmar:
  sources <= 50
  evidence <= 100
  attributes <= 100
  content <= 25
  assets <= 100
  issues <= 100
  approvals <= 100
  models <= 25
  memberships <= 100
  offers <= 100
  Y metadata:
  returned
  limit
  truncated
  ==================================================
  QA LIVE — D4
  ==================================================
  Ejecutar:
  catalog_governance_admin_dashboard_v1()
  Registrar valores actuales.
  PASS si:
  readiness_row_count = distinct_product_count
  AND
  duplicate_product_count = 0
  No exigir una cifra fija.
  ==================================================
  QA LIVE — GOVERNANCE EMPTY STATE
  ==================================================
  Si catalog_governance_state sigue en 0:
  confirmar:
  runtime products visibles
  NOT_REVIEWED
  sin backfill
  sin creación automática de filas
  Si cambió:
  reportar estado real.
  No modificar datos.
  ==================================================
  QA LIVE — SECURITY
  ==================================================
  STAFF:
  PASS live
  ANON:
  DENIED live
  NON-STAFF:
  si no existe usuario:
  PASS_BY_POLICY
  LIVE_ACCOUNT_TEST_DEFERRED
  No crear cuenta.
  ==================================================
  SENSITIVE DATA
  ==================================================
  Confirmar ausencia de:
  raw_payload
  supplier cost
  margin
  markup
  credentials
  tokens
  secrets
  private commercial terms
  ==================================================
  ZERO-RUNTIME-WRITE
  ==================================================
  Fuera del CREATE OR REPLACE FUNCTION de 0005:
  productos_b2b writes = 0
  imagenes writes = 0
  status writes = 0
  stock writes = 0
  pricing writes = 0
  mapping writes = 0
  category writes = 0
  public visibility writes = 0
  storage writes = 0
  provider calls = 0
  backfill = 0
  ==================================================
  FRONTEND
  ==================================================
  NO modificar código frontend.
  El código ya está versionado y validado.
  Confirmar consola live:
  /admin/catalog-governance
  /admin/catalog-governance/products/:producto_b2b_id
  No reprogramar.
  ==================================================
  PROVIDERS
  ==================================================
  G4:
  UNTOUCHED
  ForPromotional:
  UNTOUCHED
  CDO/StockSur:
  UNTOUCHED
  ==================================================
  DOCUMENTACIÓN
  ==================================================
  NO actualizar documentación canónica todavía.
  Work hará el cierre documental posteriormente.
  ==================================================
  GIT
  ==================================================
  Los únicos cambios de repositorio permitidos por esta operación son los
  artefactos automáticos estrictamente necesarios del workflow de migration:
  - migration 0005
  - migration journal
  - migration snapshot
  - cualquier mirror automático únicamente si el workflow oficial lo genera
  NO cambios funcionales adicionales.
  Al final:
  commit/push según el workflow interno normal de Lovable.
  Reportar hash real.
  ==================================================
  FINAL REPORT
  ==================================================
  BASELINE:
  ...
  0004 STATUS:
  REPOSITORY-PREPARED / NOT APPLIED
  0004 SHA UNCHANGED:
  YES / NO
  0005 CREATED:
  YES / NO
  0005 PURPOSE:
  RUNTIME DEPLOYMENT OF 0004 FUNCTIONAL CHANGE
  0005 FUNCTIONAL EQUIVALENCE TO 0004:
  PASS / FAIL
  0005 APPLIED:
  YES / NO
  APPLIED ONCE:
  YES / NO
  QUEUE RPC:
  PASS / FAIL
  PROVIDER SKU:
  PASS / FAIL
  DETAIL RPC:
  PASS / FAIL
  DETAIL ENVELOPE:
  PASS / FAIL
  DETAIL BOUNDEDNESS:
  PASS / FAIL
  COLLECTION META:
  PASS / FAIL
  SOURCES:
  PASS / FAIL
  MODELS:
  PASS / FAIL
  MEMBERSHIPS:
  PASS / FAIL
  OFFERS:
  PASS / FAIL
  D4:
  PASS / FAIL
  readiness_row_count:
  ...
  distinct_product_count:
  ...
  duplicate_product_count:
  ...
  EMPTY GOVERNANCE:
  PASS / CURRENT STATE EXPLAINED / FAIL
  STAFF:
  PASS / FAIL
  ANON:
  DENIED / FAIL
  NON-STAFF:
  PASS_BY_POLICY / LIVE TEST DEFERRED / FAIL
  SENSITIVE DATA:
  PASS / FAIL
  RUNTIME DATA MUTATIONS:
  0 / FAIL
  PROVIDER CALLS:
  0 / FAIL
  FRONTEND CODE CHANGES:
  0 / FAIL
  G4:
  UNTOUCHED
  FORPROMOTIONAL:
  UNTOUCHED
  CDO/STOCKSUR:
  UNTOUCHED
  FILES CREATED:
  ...
  FILES MODIFIED:
  ...
  COMMIT:
  ...
  HEAD:
  ...
  ORIGIN MAIN:
  ...
  DIVERGENCE:
  ...
  WORKING TREE:
  ...
  FINAL:
  CHK-CATGOV-02G — CONTROLLED 0005 DEPLOYMENT
  PASS
  or
  BLOCKED / FAIL
  IF PASS:
  DO NOT START BUILD 3.
  WAIT FOR FINAL WORK CERTIFICATION AND DOCUMENTATION CLOSEOUT.