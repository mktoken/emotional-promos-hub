# ÍNDICE DE EVIDENCIA QA

## Propósito

Este documento indexa pruebas y reportes. No copia el contenido completo de los reportes. El estado vigente permanece en `docs/MASTER-STATE.md`; los resultados históricos deben interpretarse dentro de su fecha, commit y entorno.

## Índice

| Checkpoint o área | Fecha | Commit/ref. | Entorno | Resultado | Evidencia |
|---|---|---|---|---|---|
| Pricing V2 dry run | 2026-08-02 | `1d0a131` | Lovable/Supabase interno | PASS | [Reporte dry run](../supabase/qa/recompute_v2_dry_run_report.md) |
| Pricing V2 shadow write | 2026-08-02 | `ef1cb1a` | Lovable/Supabase interno | PASS / certified | [Reporte shadow write](../supabase/qa/recompute_v2_shadow_write_report.md) |
| Assertions recompute V2 | 2026-08-02 | Versionado | QA SQL | PASS histórico | [`recompute_v2_assertions.sql`](../supabase/qa/recompute_v2_assertions.sql) |
| Release y rollback V2 | 2026-08-02 | Versionado | QA SQL | PASS histórico | [`catalog_price_v2_release_preparation_assertions.sql`](../supabase/qa/catalog_price_v2_release_preparation_assertions.sql) |
| Precio público V2 | 2026-08-03 | Versionado | QA SQL | PASS histórico | [`public_product_price_quote_assertions.sql`](../supabase/qa/public_product_price_quote_assertions.sql) |
| Solicitud pública y RPC | 2026-08-03 | Versionado | QA transaccional | PASS histórico | [`public_quote_v2_backend_expand_integration.sql`](../supabase/qa/public_quote_v2_backend_expand_integration.sql) |
| Observaciones backend | 2026-09-17 | `4aee0af` / `e15e67d` | Lovable/Supabase interno | PASS | `MASTER-STATE.md`, Sub-checkpoint 1 |
| Observaciones frontend | 2026-09-17 | `9de4d24` | Main | PASS, 35/35 histórico | `MASTER-STATE.md`, QA post-merge |
| Observaciones E2E SC3 | 2026-09-17 | `18aaf36` | Producción/CRM | PASS | `MASTER-STATE.md`, Sub-checkpoint 3 |
| Visualización CRM SC4 | 2026-09-18 | `1886234` | Producción/CRM | PASS | `MASTER-STATE.md`, Sub-checkpoint 4 |
| AUTH-1 cambio de contraseña | 2026-09-18 | `2dd399a` | Producción | PASS | `MASTER-STATE.md`, AUTH-1 |
| AUTH-2A recuperación local | 2026-09-18 | `c4df8f8` | QA local | PASS | `MASTER-STATE.md`, AUTH-2A |
| AUTH-2B recuperación real | 2026-09-19 | `c4df8f8` | Producción | PASS E2E real | `MASTER-STATE.md`, AUTH-2B |
| Auditoría comercial E2E | 2026-09-19 | `74b3098` y posteriores | Producción | Completada | `MASTER-STATE.md`, CHK-COM-0 a 7 |
| Seguimiento de oportunidad | 2026-09-19 | `a16ce79` / `26f46b3` | Producción | PASS | `MASTER-STATE.md`, CHK-COM-6 |
| Acciones Gmail/WhatsApp | 2026-09-19/26 | `c4d2195` | Lovable y producción | Presencia funcional PASS | `MASTER-STATE.md`, CHK-COM-8 |
| CHK-COM-8 envío controlado Gmail + WhatsApp | 2026-09-26 | Evidencia QA versionada | Producción | PASS E2E real controlado | [Entrada CHK-COM-8](#chk-com-8--e2e-real-controlado) |
| Reconciliación Git final | 2026-09-26 | `bc13a15` | GitHub | PASS, 0/0 | `MASTER-STATE.md` |
| Suite actual | 2026-09-26 | `bc13a15` | Local | PASS, 67/67 | Validación documentada en CHK-DOC-1B |
| Build actual | 2026-09-26 | `bc13a15` | Local | PASS | Validación documentada en CHK-DOC-1B |

## Interpretación obligatoria

- **PASS** significa que la prueba indicada pasó en el entorno y fecha registrados.
- **Presencia funcional** no significa envío real ni entrega.
- **Evidencia histórica** no equivale automáticamente a estado actual.
- Una prueba que no tiene reporte, fecha, commit o entorno identificable debe considerarse **NO COMPROBADA**.

## CHK-COM-8 — E2E real controlado

**Fecha:** 2026-09-26
**Cotización:** `COT-2026-00008`
**Contexto:** QA controlada para `QA Automatizado` / `QA PromoHub - NO CONTACTAR`; la cotización mostraba vigencia hasta el 25/09/2026 y las pruebas del 26/09/2026 no representan una operación comercial real.

### Gmail — E2E PASS

- Destinatario controlado: `nwejebe@gmail.com`.
- Hora aproximada: 17:35.
- Envío realizado una sola vez y recepción comprobada.
- Asunto: `Cotización COT-2026-00008 — Promocionales Emocionales`.
- Cuerpo correspondiente a `COT-2026-00008`.
- `COT-2026-00008.pdf` adjunto, recibido y abierto correctamente.
- No se observaron errores, alteraciones ni datos de terceros.

### WhatsApp — E2E PASS

- Destino controlado: `+52 55 3031 1686`.
- Hora aproximada: 20:14.
- Mensaje correspondiente a `COT-2026-00008` y `Promocionales Emocionales`.
- `COT-2026-00008.pdf` adjuntado como archivo real, mostrado como documento enviado y con tamaño visible aproximado de 217 kB.
- Envío realizado una sola vez; recepción del mensaje y del PDF confirmada manualmente por el usuario.
- Apertura del PDF recibido confirmada manualmente por el usuario.
- No se observaron errores de envío.

### Evidencia visual versionada

- [Gmail recibido con PDF](qa/evidence/chk-com-8/gmail-received.png)
- [PDF abierto desde Gmail](qa/evidence/chk-com-8/gmail-pdf-opened.png)
- [WhatsApp con PDF preparado](qa/evidence/chk-com-8/whatsapp-pdf-prepared.png)
- [WhatsApp con PDF enviado](qa/evidence/chk-com-8/whatsapp-pdf-sent.png)

Las capturas demuestran el estado visual observado en cada momento. La recepción y apertura desde el dispositivo controlado de WhatsApp se distinguen explícitamente como confirmación manual del usuario; no se inventa una captura del dispositivo receptor.

**Resultado final CHK-COM-8: PASS.**

## Evidencia no disponible como índice independiente

No existe todavía un reporte separado para:

- salud actual de proveedores;
- stock actual y frescura de precios;
- disponibilidad actual de imágenes y fichas;
- reglas de descuentos;
- aprobación de excepciones;
- entrega de correo o WhatsApp;
- métricas de conversión y campañas.
