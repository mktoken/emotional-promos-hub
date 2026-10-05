# PE — RB3-B RUNTIME RECONCILIATION V1

## Estado

- `RB3-A`: **CLOSED / PASS**.
- `RB3-B`: **CLOSED / PASS**.
- `RB3-C`: **CLOSED / PASS**.
- `RB3-D`: **CLOSED / PASS**.
- `submit-project-brief`: **DEPLOYED**.
- Frontend Route B: **CONNECTED** and validated in production.
- La migración original `20261004090000_route_b_project_brief_contract_v1.sql` permanece sin modificar.

## Runtime confirmado

La evidencia runtime registrada para el request QA controlado confirma:

- creación: HTTP `201`, `result = created`;
- replay idéntico: HTTP `200`, `result = replay`;
- persistencia: **PASS**;
- privacy gate server-side activo con `PE-PRIVACY-V1` y `/aviso-de-privacidad`.
- idempotencia validada: la creación devuelve `201 / created` y el replay idéntico devuelve `200 / replay`.

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

## Cierre E2E de producción

La única prueba E2E de producción de Route B fue ejecutada y limpiada. El resultado fue **PASS** para:

- carga del formulario y funcionamiento del Aviso de Privacidad;
- consentimiento requerido;
- submit real;
- success state con el copy canónico;
- AssistantWidget oculto en Route B y visible fuera de Route B;
- persistencia con `public_request_type = project_brief`, `public_submission = true`, `consent_at` no nulo, `privacy_version = PE-PRIVACY-V1`, `privacy_url = /aviso-de-privacidad`, `marketing_consent = false` y `total_estimado = NULL`;
- ausencia de CRM auto-creation, email automático, WhatsApp automático y cotización automática.

Estado final después del cleanup:

```text
total_registros = 28
solicitudes_publicas = 8
quotes = 28
project_briefs = 0
qa_row_remaining = 0
```

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
- La conexión del frontend Route B quedó validada en producción en el cierre `CHK-ROUTE-B-FINAL-CLOSURE-V1`.
- No se habilitan CRM, email, WhatsApp ni automatizaciones.
