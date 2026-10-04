# PE — CHK-ROUTE-B-RB3-FINAL-MIGRATION-SPEC-V1

## Estado documental

- **Checkpoint:** `CHK-ROUTE-B-RB3-FINAL-MIGRATION-SPEC-V1` — `CLOSED / PASS`.
- **READY FOR MIGRATION BUILD:** `NO`.
- **READY FOR MIGRATION BUILD AFTER LEGAL GATE:** `YES`, sujeto a implementación controlada y QA.
- No se ejecutaron migraciones, escrituras, despliegues ni cambios funcionales.

## 1. Runtime baseline confirmado

Fuente: auditoría runtime canónica, migraciones versionadas y tipos Supabase.

- Tabla: `public.cotizaciones_leads`.
- Snapshot: 16 columnas, 28 filas y 8 filas con `public_submission = true`.
- No existen aún `consent_at`, `privacy_version`, `privacy_url`, `marketing_consent` ni `public_request_type`.
- Los registros históricos deben conservarse sin modificación manual.
- Quote V2 exige request ID, fingerprint, hash de email y hash de teléfono de 32 caracteres cuando `public_submission = true`.
- `submit_public_quote_request` exige nombre, empresa, email y teléfono; no se modifica ni se reutiliza para Route B.

## 2. Decisiones canónicas

| Decisión | Estado |
|---|---|
| `public_request_type` | **APPROVED** |
| Valores | `quote`, `project_brief` |
| Default | `quote` |
| Privacy URL | **APPROVED:** `/aviso-de-privacidad` |
| Marketing consent | `false` en RB3 V1 |
| Destination | `cotizaciones_leads` |
| New table | `NO` |
| Direct frontend write | `NO` |
| CRM/email/WhatsApp automation | `NO` |

## 3. Final table delta

Añadir únicamente:

```sql
public_request_type text NOT NULL DEFAULT 'quote',
consent_at timestamptz NULL,
privacy_version text NULL,
privacy_url text NULL,
marketing_consent boolean NOT NULL DEFAULT false
```

Los campos de consentimiento son nullable para históricos y obligatorios para `project_brief` mediante el contrato condicionado. No se crea tabla nueva ni se borran columnas.

## 4. `public_request_type`

Constraint sugerido: `cotizaciones_leads_public_request_type_check`.

```sql
CHECK (public_request_type IN ('quote', 'project_brief'))
```

El default `quote` mantiene la compatibilidad histórica.

## 5. Final check constraints

Reemplazar conceptualmente `cotizaciones_leads_public_request_contract_check` por:

```sql
CHECK (
  (public_submission = false AND public_request_type = 'quote')
  OR
  (public_submission = true
   AND public_request_type = 'quote'
   AND public_request_id IS NOT NULL
   AND public_request_fingerprint IS NOT NULL
   AND char_length(public_request_fingerprint) = 32
   AND public_email_hash IS NOT NULL
   AND char_length(public_email_hash) = 32
   AND public_phone_hash IS NOT NULL
   AND char_length(public_phone_hash) = 32)
  OR
  (public_submission = true
   AND public_request_type = 'project_brief'
   AND public_request_id IS NOT NULL
   AND public_request_fingerprint IS NOT NULL
   AND char_length(public_request_fingerprint) = 32
   AND (public_email_hash IS NOT NULL OR public_phone_hash IS NOT NULL)
   AND (public_email_hash IS NULL OR char_length(public_email_hash) = 32)
   AND (public_phone_hash IS NULL OR char_length(public_phone_hash) = 32)
   AND consent_at IS NOT NULL
   AND privacy_version IS NOT NULL AND btrim(privacy_version) <> ''
   AND privacy_url IS NOT NULL AND btrim(privacy_url) <> ''
   AND marketing_consent = false)
)
```

Esto conserva Quote V2, permite email o teléfono para Route B y exige consentimiento estructurado para `project_brief`.

## 6. Final policy delta

Modificar solo `legacy_public_insert_cotizaciones_leads`, añadiendo:

```text
public_request_type = 'quote'
```

Se conservan `public_submission = false`, IDs/fingerprint/hashes nulos, estado `NUEVA` y `assigned_to IS NULL`. La estrategia es **ISOLATE**: la policy legacy puede coexistir temporalmente, pero nunca insertar `project_brief`. Las policies staff no cambian.

## 7. RB3-A migration scope

Incluye columnas, constraints, policy legacy, rutina transaccional interna y permisos. No incluye cambios en `submit_public_quote_request`, CRM, Pricing, catálogo, frontend, tablas nuevas ni triggers existentes.

## 8. RB3-B boundary scope

Boundary: `submit-project-brief`. Debe realizar CORS restringido, validación server-side, normalización, límite de payload, honeypot, feature/legal gate, fingerprint, invocación de la rutina interna y respuestas sanitizadas.

No reutiliza `capture-assistant-lead` ni `submit_public_quote_request`.

## 9. Internal RPC design

Opción elegida: **Edge Function → RPC interna transaccional**.

Nombre sugerido: `submit_project_brief_internal`.

Debe recibir payload normalizado, generar hashes, adquirir locks, resolver idempotencia, aplicar rate limit, insertar una fila y devolver resultado mínimo.

- `SECURITY DEFINER`: `YES`.
- `search_path`: `public, pg_temp`.
- `anon`, `authenticated` y `public`: sin ejecución directa.
- Acceso: solo desde el boundary server-side autorizado.

No se agregan ramas Route B a `submit_public_quote_request`.

## 10. Idempotency order

1. Validar payload.
2. Verificar privacidad activa.
3. Iniciar la rutina transaccional.
4. Adquirir `pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0))`.
5. Consultar `public_request_id`.
6. Fingerprint igual: `200 idempotent_replay`.
7. Fingerprint distinto: `409 idempotency_conflict`.
8. Aplicar rate limit.
9. Insertar.
10. Devolver `201 created`.

El replay ocurre antes del rate limit y no consume cuota adicional.

## 11. Rate limit order

Contrato: 3 solicitudes por 15 minutos por hash de contacto. Email, teléfono o ambos se limitan según estén presentes. Retries idempotentes no consumen cuota adicional. Exceso: `429 rate_limited`.

Se reutilizan los índices actuales de email y teléfono. No se crea un índice nuevo sin evidencia.

## 12. Hash contract

- Email: `lower(trim(email))` → MD5 hexadecimal de 32 caracteres.
- Teléfono: solo dígitos, validar 10–15 → MD5 hexadecimal de 32 caracteres.
- Ausente: `NULL`.
- Sin hashes sintéticos.

## 13. Consent contract

El cliente solo envía `privacy_consent = true`. El servidor escribe `consent_at` con timestamp server-side, `privacy_version` desde configuración activa, `privacy_url` desde configuración activa y `marketing_consent = false`.

Configuración conceptual: `PE-PRIVACY-V1` y `/aviso-de-privacidad`. Si no está activa: `503 privacy_not_active` y ninguna escritura. El cliente no controla metadata de consentimiento.

## 14. `datos_cliente` mapping

```json
{
  "source": "route_b",
  "contact_name": "...",
  "email": "...",
  "phone": "...",
  "company": "...",
  "project_objective": "...",
  "quantity": 50,
  "quantity_unknown": false,
  "target_date": "2026-12-01",
  "target_date_unknown": false,
  "occasion": "...",
  "audience": "...",
  "budget": "...",
  "city": "...",
  "product_interest": "...",
  "personalization": "...",
  "comments": "..."
}
```

No se duplican consent fields dentro del JSON. No se almacenan SKU, precio, stock ni producto supuesto.

## 15. `articulos_cotizados`, estado y total

Para `project_brief`:

```text
articulos_cotizados = []
estado_cotizacion = NUEVA
assigned_to = NULL
total_estimado = NULL
```

`quantity_unknown` permanece explícito y nunca se convierte en `1`. No se crean automáticamente `crm_leads`, `crm_deals` ni `formal_quotes`.

## 16. Index decision

**No crear índices nuevos en RB3-A.** Se conservan el índice único de `public_request_id` y los índices de rate limit por email y teléfono.

## 17. Trigger decision

Se conservan sin cambios `set_cotizaciones_leads_updated_at`, `trg_cotizaciones_leads_updated` y `trg_cotizaciones_leads_status_log`. La duplicación de `updated_at` queda fuera de RB3 como deuda técnica.

## 18. Type delta

Después de regenerar `src/integrations/supabase/types.ts`, los únicos cambios esperados son:

```ts
public_request_type: 'quote' | 'project_brief'
consent_at: string | null
privacy_version: string | null
privacy_url: string | null
marketing_consent: boolean
```

En `Insert`, los campos con default o nullable permanecen opcionales; en `Update`, permanecen opcionales. No se introducen cambios no relacionados.

## 19. Migration order

1. Añadir columnas.
2. Añadir type check.
3. Reemplazar contract check.
4. Actualizar policy legacy.
5. Crear `submit_project_brief_internal`.
6. Fijar `SECURITY DEFINER` y `search_path`.
7. Revocar ejecución pública.
8. Conceder ejecución solo al boundary autorizado.
9. Añadir comentarios técnicos.
10. Regenerar tipos en un paso controlado posterior.

## 20. Rollback

Desactivar server-side `project_brief`, bloquear llamadas nuevas, conservar las columnas, restaurar temporalmente policy/check anterior solo si fuera necesario para preservar Quote V2 y no borrar datos, columnas ni filas históricas.

## 21. Migration QA

Debe demostrarse que las 28 filas históricas y las 8 filas públicas siguen válidas; Quote V2 y el insert legacy `quote` no cambian; el insert anónimo `project_brief` es rechazado; email-only y phone-only funcionan por boundary; sin contacto falla; consentimiento es obligatorio para brief; Quote V2 no requiere consentimiento nuevo; `total_estimado = NULL` es aceptado; la unicidad de request ID y los índices de rate limit se conservan; doble submit no duplica y fingerprint conflictivo devuelve `409`.

## 22. Legal feature gate

La escritura `project_brief` permanece inactiva hasta que `PE-PRIVACY-V1` esté aprobado, `/aviso-de-privacidad` publicado, exista configuración activa server-side y el gate legal esté cerrado explícitamente. El frontend no puede activar el flujo por sí solo.

## 23. Owner decisions already closed

Quedan cerradas: `public_request_type`; valores `quote`/`project_brief`; default `quote`; destino `cotizaciones_leads`; ausencia de nueva tabla; ausencia de escritura frontend; ausencia de automatización CRM/email/WhatsApp; `marketing_consent = false`; y la definición de `/aviso-de-privacidad` como URL.

## 24. Remaining legal blockers

Permanecen únicamente:

- aprobación legal final de `PE-PRIVACY-V1`;
- publicación del aviso en `/aviso-de-privacidad`;
- tratamiento y disclosure legal de `/~flock.js`;
- validación de cookies y storage;
- redacción sobre processors y transferencias;
- revisión legal de retención.

No quedan pendientes como decisiones técnicas el responsable, domicilio, email ARCO, `public_request_type` ni `marketing_consent = false`. La URL está definida; falta publicarla y aprobarla legalmente.

## 25. Readiness

```text
READY FOR MIGRATION BUILD: NO
READY FOR MIGRATION BUILD AFTER LEGAL GATE: YES
```

Este documento no autoriza la implementación posterior.
