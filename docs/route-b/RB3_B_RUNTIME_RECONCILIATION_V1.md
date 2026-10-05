# PE — RB3-B RUNTIME RECONCILIATION V1

## Estado

- `RB3-A`: **CLOSED / PASS**.
- `RB3-B`: **CLOSED / PASS**.
- `submit-project-brief`: **DEPLOYED**.
- Frontend Route B: **STILL NOT CONNECTED**.
- La migración original `20261004090000_route_b_project_brief_contract_v1.sql` permanece sin modificar.

## Runtime confirmado

La evidencia runtime registrada para el request QA controlado confirma:

- creación: HTTP `201`, `result = created`;
- replay idéntico: HTTP `200`, `result = replay`;
- persistencia: **PASS**;
- privacy gate server-side activo con `PE-PRIVACY-V1` y `/aviso-de-privacidad`.

La fila QA fue retirada después de la prueba. Estado final reportado:

```text
total_registros = 28
solicitudes_publicas = 8
quotes = 28
project_briefs = 0
```

## Contrato persistido

Para `project_brief`, la evidencia de la fila QA confirmó:

- `public_request_type = project_brief`;
- `public_submission = true`;
- `consent_at IS NOT NULL`;
- `privacy_version = PE-PRIVACY-V1`;
- `privacy_url = /aviso-de-privacidad`;
- `marketing_consent = false`;
- `total_estimado IS NULL`;
- hashes de contacto válidos.

## Migración wrapper

La migración `20261004120000_route_b_privacy_gate_wrapper_v1.sql` representa el estado runtime sin duplicar el core:

1. Si solo existe `submit_project_brief_internal`, lo renombra a `submit_project_brief_internal_core`.
2. Si ya existen core y wrapper, no vuelve a renombrar nada.
3. Revoca ejecución del core y del wrapper para `PUBLIC`, `anon` y `authenticated`.
4. El wrapper fija localmente `app.pe_privacy_active`, `app.pe_privacy_version` y `app.pe_privacy_url`.
5. El wrapper delega al core con los mismos parámetros.
6. Solo `service_role` puede ejecutar el wrapper.

La migración no altera idempotencia, hashing, normalización, locks, rate limit, insert, Quote V2, RLS, CRM, frontend, Pricing ni stock.

## Gobernanza y alcance

- TypeScript: `0 errors` en la validación actual.
- Remediación TypeScript de Lovable: auditada y aceptada; `functional behavior changed = NO`.
- No se activa la conexión del frontend Route B en este checkpoint.
- No se habilitan CRM, email, WhatsApp ni automatizaciones.
