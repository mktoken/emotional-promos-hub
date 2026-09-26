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
| Envío real de correo/WhatsApp | 2026-09-26 | — | Producción | NO COMPROBADO | `MASTER-STATE.md`, CHK-COM-8 |
| Reconciliación Git final | 2026-09-26 | `bc13a15` | GitHub | PASS, 0/0 | `MASTER-STATE.md` |
| Suite actual | 2026-09-26 | `bc13a15` | Local | PASS, 67/67 | Validación documentada en CHK-DOC-1B |
| Build actual | 2026-09-26 | `bc13a15` | Local | PASS | Validación documentada en CHK-DOC-1B |

## Interpretación obligatoria

- **PASS** significa que la prueba indicada pasó en el entorno y fecha registrados.
- **Presencia funcional** no significa envío real ni entrega.
- **Evidencia histórica** no equivale automáticamente a estado actual.
- Una prueba que no tiene reporte, fecha, commit o entorno identificable debe considerarse **NO COMPROBADA**.

## Evidencia no disponible como índice independiente

No existe todavía un reporte separado para:

- salud actual de proveedores;
- stock actual y frescura de precios;
- disponibilidad actual de imágenes y fichas;
- reglas de descuentos;
- aprobación de excepciones;
- entrega de correo o WhatsApp;
- métricas de conversión y campañas.
