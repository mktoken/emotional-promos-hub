# CHK-ROUTE-B-RB3-RUNTIME-SCHEMA-AUDIT-V1 — Resultado (solo lectura)

Todas las lecturas se hicieron con SELECT sobre catálogos del sistema. 0 escrituras.

## RUNTIME TABLE (public.cotizaciones_leads, 16 columnas, 28 filas, 8 public_submission=true)
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| datos_cliente | jsonb | NO | '{}' |
| articulos_cotizados | jsonb | NO | '[]' |
| total_estimado | numeric | YES | 0 |
| estado_cotizacion | text | YES | 'NUEVA' |
| created_at / updated_at | timestamptz | YES | now() |
| assigned_to | uuid | YES | — |
| last_contacted_at | timestamptz | YES | — |
| lost_reason | text | YES | — |
| public_request_id | uuid | YES | — |
| public_request_fingerprint | text | YES | — |
| public_submission | boolean | NO | false |
| public_email_hash / public_phone_hash | text | YES | — |
| next_follow_up_at | timestamptz | YES | — |

NO existen: consent_at, privacy_version, privacy_url, marketing_consent, public_request_type.

## RUNTIME CONSTRAINTS
- cotizaciones_leads_pkey — PK(id)
- cotizaciones_leads_assigned_to_fkey — FK → auth.users ON DELETE SET NULL
- cotizaciones_leads_estado_check — estado IN (NUEVA, CONTACTADO, EN_PROCESO, ENVIADA, GANADA, PERDIDA)
- cotizaciones_leads_public_request_contract_check — si public_submission: request_id NOT NULL, fingerprint, email_hash Y phone_hash NOT NULL con longitud 32 (exige AMBOS hashes)

## RUNTIME INDEXES
pkey; unique parcial public_request_id (WHERE NOT NULL); email_rate_idx (email_hash, created_at DESC) WHERE public_submission AND hash NOT NULL; phone_rate_idx (análogo); created_at; estado; assigned_to; next_follow_up (parcial). Ningún índice fuera de lo versionado detectado.

## RUNTIME RLS
RLS enabled: YES (force: NO)
- legacy_public_insert_cotizaciones_leads — INSERT — anon, authenticated — CHECK: public_submission=false AND request_id/fingerprint/hashes NULL AND estado NUEVA AND assigned_to NULL
- staff_insert_cotizaciones_leads — INSERT — authenticated — is_staff(auth.uid())
- staff read cotizaciones — SELECT — authenticated — is_staff
- staff update cotizaciones — UPDATE — authenticated — is_staff / is_staff
- Sin DELETE.

## LEGACY PUBLIC INSERT CONTRACT
Resuelto con evidencia: exige **public_submission = false** (coincide con migración 20260803133000). anon tiene privilegio INSERT en la tabla.

## RPC CONTRACT — submit_public_quote_request(uuid, jsonb, text, jsonb)
- SECURITY DEFINER, search_path=public,pg_temp; EXECUTE para anon y authenticated.
- Requiere nombre, empresa, email (regex, ≤254) Y teléfono (10–15 dígitos).
- Hashes md5(email minúsculas) y md5(dígitos); fingerprint md5 del payload.
- Idempotencia: advisory xact lock por request_id; reuso si fingerprint igual, si no `idempotency_key_conflict`.
- Rate limit: 3 por email O teléfono en 15 min, con locks ordenados.
- Transacción única de la función; estado inicial 'NUEVA', assigned_to NULL, public_submission=true; total calculado por backend.

## TRIGGERS (solo BEFORE/AFTER UPDATE)
- set_cotizaciones_leads_updated_at → update_updated_at()
- trg_cotizaciones_leads_updated → set_updated_at() (duplicado funcional)
- trg_cotizaciones_leads_status_log → cotizaciones_leads_log_status()

## TOTAL_ESTIMADO
numeric, nullable YES, default 0. NULL permitido hoy sin cambios.

## RUNTIME VS GIT
- Columnas, constraints, índices, políticas, RPC vs migración 20260803133000: MATCH.
- Doble trigger updated_at: RUNTIME AHEAD/inofensivo (no bloquea).
- Columnas RB3 (consent, privacy, marketing, request_type): GIT AHEAD (solo diseño).
- Contract check exige email Y teléfono vs Route B "email O teléfono": CONFLICT.
- RPC exige empresa y ambos contactos vs brief (empresa opcional / "no aplica"): CONFLICT.
- Documento CHK-ROUTE-B-RB3-TECH-DESIGN-V1 no está en el repo: comparación punto por punto restante UNKNOWN.

## PUBLIC_REQUEST_TYPE COMPATIBILITY
Añadir `public_request_type text NOT NULL DEFAULT 'quote'` es seguro: las 28 filas toman 'quote'; política legacy y RPC actual no lo referencian.

## MIGRATION DESIGN STILL VALID: YES (con correcciones)
Correcciones requeridas:
1. Reescribir el contract check como condicional: quote mantiene ambos hashes; project_brief exige request_id + fingerprint + al menos un hash (email_hash OR phone_hash).
2. Añadir CHECK public_request_type IN ('quote','project_brief').
3. project_brief necesita su propia RPC (o rama) SECURITY DEFINER; la actual rechaza contactos parciales y empresa vacía.
4. Rate limit de brief: usar el hash disponible; índices parciales actuales ya toleran NULL.
5. Política legacy: añadir `public_request_type = 'quote'` para que anon no pueda insertar briefs directamente.
6. consent_at obligatorio para project_brief vía check condicional o trigger (no now()).
7. total_estimado NULL para brief: compatible, sin cambio de columna.

READY FOR FINAL MIGRATION SPEC: YES
READY FOR BUILD: NO

DATABASE WRITES 0 · SCHEMA CHANGES 0 · RLS CHANGES 0 · EDGE FUNCTION CHANGES 0 · DATA CHANGES 0 · PUBLISH NO

FINAL: CHK-ROUTE-B-RB3-RUNTIME-SCHEMA-AUDIT-V1 — PASS
