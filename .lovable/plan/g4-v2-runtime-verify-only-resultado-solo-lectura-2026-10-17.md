G4 V2 — RUNTIME VERIFY ONLY (resultado, solo lectura)

G4 MODELS: 104
G4 MEMBERSHIPS: 289

SCHEMA COMPATIBILITY: PASS
SEARCH RPC CONTRACT: PASS
DETAIL RPC CONTRACT: PASS
SQL SYNTAX: PASS (12 sentencias; corregido: `AS provider_image_url,` / `rp.provider_sku`, líneas 262–263)

MANDATORY DEFAULT GATE: NO
STOCK IDENTITY GATE: NO

RUNTIME WRITES: 0
MIGRATIONS APPLIED: 0
FUNCTIONS MODIFIED: 0
PUBLISH: NO

STATUS: READY_TO_APPLY

Nota: HEAD = origin/main = a651779; los archivos supabase y drizzle 0011 son idénticos. Solo actualiza governance G4 (models/members) y reemplaza los 2 RPC. No se aplicó nada; aprobar este plan NO autoriza aplicar la migración.  
  
G4 V2 — APPLY ONLY

Este paso está AUTORIZADO únicamente para aplicar la migración ya verificada:

drizzle/migrations/0011_g4_dynamic_model_projection_v2.sql

Commit verificado:

a651779214259cda8af63561713d8ae56e57caa2

Estado previo certificado:

G4 MODELS = 104

G4 MEMBERSHIPS = 289

SCHEMA COMPATIBILITY = PASS

SEARCH RPC CONTRACT = PASS

DETAIL RPC CONTRACT = PASS

SQL SYNTAX = PASS

MANDATORY DEFAULT GATE = NO

STOCK IDENTITY GATE = NO

==================================================

AUTORIZACIÓN

==================================================

APLICAR únicamente:

drizzle/migrations/0011_g4_dynamic_model_projection_v2.sql

Nada más.

==================================================

PROHIBIDO

==================================================

NO modificar el SQL.

NO crear otra migración.

NO aplicar activation_v1.

NO aplicar coverage_v1.

NO hacer fixes adicionales.

NO tocar imágenes.

NO tocar stock.

NO tocar pricing.

NO tocar categorías.

NO tocar CDO.

NO tocar 4Promotional.

NO ejecutar sync.

NO provider calls.

NO frontend changes.

NO Publish.

==================================================

SI LA MIGRACIÓN FALLA

==================================================

STOP INMEDIATAMENTE.

NO intentar reparar.

NO reinterpretar.

NO crear otra versión.

NO aplicar cambios parciales.

Reportar exclusivamente el error exacto.

==================================================

ENTREGA

==================================================

MIGRATION APPLIED: YES / NO

MIGRATION FILE:

DATABASE ERROR: NONE / exact error

G4 MODELS:

G4 MEMBERSHIPS:

CONFIRMED MEMBERSHIPS:

SEARCH RPC REPLACED: YES / NO

DETAIL RPC REPLACED: YES / NO

UNEXPECTED WRITES:

OTHER FILES MODIFIED:

PUBLISH: NO

STATUS: APPLIED / FAILED

DETENTE AQUÍ.

NO EJECUTES POSTCHECK.

NO PUBLIQUES.