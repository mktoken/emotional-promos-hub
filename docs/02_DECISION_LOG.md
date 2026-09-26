# REGISTRO DE DECISIONES — EMOTIONAL PROMOS HUB

## Autoridad y alcance

Este documento registra decisiones permanentes que pueden demostrarse mediante Git, `MASTER-STATE.md` o evidencia QA versionada. No sustituye el estado actual: ese estado pertenece a `docs/MASTER-STATE.md`.

Cuando una decisión sea superada, se conserva el registro y se añade una nueva decisión que explique el cambio.

## Decisiones

| ID | Fecha | Decisión | Motivo y alcance documentado | Evidencia | Estado |
|---|---|---|---|---|---|
| D-001 | 2026-09-16 | Usar checkpoints con la secuencia Construir → Validar → Estado maestro → Cerrar → Avanzar | La secuencia aparece como regla de cierre de los checkpoints y evita avanzar con validaciones incompletas | `MASTER-STATE.md`, cierres históricos de Fase 4 y checkpoints posteriores | VIGENTE |
| D-002 | 2026-09-17 | Tratar Supabase como integrado dentro de Lovable | El proyecto no debe asumir una operación externa de Supabase ni pedir credenciales externas | `MASTER-STATE.md`, “Regla operativa Supabase / Lovable” | VIGENTE |
| D-003 | 2026-09-17 | Verificar visualmente que Lovable y GitHub estén en la misma rama antes de usar Lovable | Se documentó una divergencia entre la rama visible de Lovable y la rama Git; la existencia de una rama no demuestra selección en Lovable | `MASTER-STATE.md`, “Regla operativa Lovable / GitHub”, commit `47236e1` | VIGENTE |
| D-004 | 2026-09-17 | Auditar Git después de cualquier uso de Lovable | Lovable puede generar commits o planes aunque el prompt indique solo lectura; no se debe hacer pull automático ante divergencias | `MASTER-STATE.md`, “Regla operativa Lovable — commits automáticos” | VIGENTE |
| D-005 | 2026-08-02 | Mantener Pricing V2 y Legacy coexistiendo mientras V2 permanece controlada | Los dry run y shadow write certificaron resultados sin activar V2; Legacy y rollback se conservaron | Reportes `supabase/qa/recompute_v2_*.md`, `MASTER-STATE.md` Fases 1–4 | VIGENTE |
| D-006 | 2026-09-17 | Transportar y persistir observaciones por producto usando `observation`/`observacion` | La observación debe viajar del frontend a la RPC y quedar visible en CRM; los sub-checkpoints SC1–SC4 lo documentan | `MASTER-STATE.md`, commits `4aee0af`, `18aaf36`, `1886234`, tests y QA referenciados | VIGENTE |
| D-007 | 2026-09-18/19 | Mantener Auth con recuperación por correo y actualización en `/auth/update-password` | AUTH-2A y AUTH-2B fueron validados, incluyendo recuperación real en producción | `MASTER-STATE.md`, secciones AUTH-2A, AUTH-2B y AUTH-2 | VIGENTE |
| D-008 | 2026-09-19/26 | Mantener las acciones Gmail/WhatsApp como envío manual y no afirmar envío real sin prueba | `c4d2195` implementó las acciones; producción confirmó su presencia y preparación, pero no se realizó envío ni se comprobó entrega | `MASTER-STATE.md`, `COT-2026-00008`, `c4d2195`, `CHK-COM-8` | VIGENTE |

## Decisiones que no deben inferirse

- La presencia de una RPC, pantalla, Edge Function o botón no demuestra por sí sola que el comportamiento completo esté validado.
- Un reporte histórico no demuestra automáticamente el estado actual de producción.
- La existencia de un commit en Git no demuestra que Lovable lo tenga seleccionado ni que producción lo esté sirviendo.
- No existe en la evidencia versionada una decisión aprobada sobre roadmap, descuentos, estrategia de conversión o confiabilidad operativa actual de stock/precios.
