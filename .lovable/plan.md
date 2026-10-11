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
