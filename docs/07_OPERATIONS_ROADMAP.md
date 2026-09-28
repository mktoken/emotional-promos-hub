# ROADMAP OPERATIVO — OPERACIÓN PRIMERO

## Decisión de prioridad

La prioridad formal del proyecto es **OPERACIÓN PRIMERO**: comenzar a utilizar la plataforma comercialmente con el flujo estable disponible, mientras Pricing de Conversión, Super Agente, inteligencia comercial y WhatsApp evolucionan incrementalmente sin bloquear la operación.

La utilización comercial controlada desde esta baseline no equivale a un lanzamiento público. El lanzamiento público, la promoción activa, las campañas de adquisición y el escalamiento significativo de tráfico requieren cerrar previamente `CHK-BRAND-WEB-1`.

Reglas permanentes:

- producción estable no se detiene por desarrollos futuros;
- nuevas funciones usan shadow mode o feature flags cuando corresponda;
- cambios backward compatible, activación gradual y rollback disponible;
- ningún flujo estable se sustituye antes de PASS;
- P2 y posteriores no bloquean P0 salvo dependencia real;
- cada corrección sigue Construir → Validar → Documentar → Cerrar subcheckpoint → Commit/push → Verificar sincronización.

## Prioridades

| Prioridad | Frente | Estado de alcance |
|---|---|---|
| P0 | Web operativa | Baseline usable; validación interactiva completa aún parcial |
| P1 | Flujo comercial base | Implementado y validado en el caso QA; frescura y operación general requieren control |
| P2 | Super Agente Web | QA interna y piloto Web cliente local/controlado E2E PASS; canal público y escritura CRM anónima no habilitados |
| P3 | Sector Intelligence | Estructura definida; no cargada |
| P4 | Company Intelligence | Estructura definida; no persistida como producto |
| P5 | WhatsApp | Canal manual validado en QA; IA no construida |
| P6 | Pricing competitivo México | Shadow mode PASS en repositorio; no productivo |
| P7 | Aprendizaje comercial | No construido; no ML |

## Gate de lanzamiento público — CHK-BRAND-WEB-1

### Redefinición de marca, comunicación y experiencia web

`CHK-BRAND-WEB-1` es un checkpoint pendiente y obligatorio antes de cualquier lanzamiento público, promoción activa, campaña de adquisición o escalamiento significativo de tráfico hacia `articulospromocionales.vip`. No es un simple rediseño estético y no bloquea la operación interna, la atención comercial controlada, el desarrollo del Super Agente, QA, CRM ni Pricing shadow.

El trabajo debe partir de la historia real de Promocionales Emocionales, su posicionamiento histórico, el nuevo modelo de negocio, el Plan de negocio PromoPro B2B, la línea de promocionales estándar, la línea de kits/soluciones, la estrategia de marketing, el comportamiento del mercado mexicano, el análisis de competencia, Google Ads/GA4 históricos cuando aporten evidencia, Super Agente y Pricing de Conversión.

El gate mínimo de aprobación debe cubrir:

1. Posicionamiento actualizado y propuesta de valor.
2. Mensajes principales, hero/home y arquitectura de comunicación.
3. Identidad visual, jerarquía y experiencia visual.
4. Señales de confianza y diferenciación frente a la competencia mexicana.
5. Comunicación adecuada para pequeños compradores, PyMEs, grandes empresas y compradores corporativos.
6. Integración conceptual de catálogo, atención inmediata, Super Agente, Pricing competitivo, kits, soluciones B2B y trayectoria histórica.
7. QA desktop/mobile antes de lanzamiento.

La percepción objetivo debe combinar profesionalismo, confianza, trayectoria, tecnología, servicio, velocidad, claridad, competitividad y diferenciación: una empresa grande debe poder confiar en la plataforma, y un comprador de cantidades accesibles debe sentir que el sitio también es para él.

## Baseline operativa CHK-OPS-1

### Critical path

```text
Home → catálogo/búsqueda → ficha → selección/cantidad → solicitud
→ prospecto → oportunidad → cotización → PDF → seguimiento
```

| Flujo | Estado | Prioridad | Evidencia / límite |
|---|---|---:|---|
| Home público | PASS | P0 | HTTP 200 y evidencia histórica de producción |
| Catálogo y búsqueda | PARCIAL | P0/P1 | Catálogo validado; carga/paginación intermitentes en diagnóstico previo |
| Ficha, imágenes y variantes | PARCIAL | P1 | Flujo implementado; disponibilidad/frescura de imágenes y fichas no certificada actualmente |
| Cantidad, precio y estado comercial | PARCIAL | P0/P1 | V2 es autoridad; precio/stock runtime por proveedor no comprobado en este corte |
| Solicitud pública | PASS | P0 | RPC, validaciones, idempotencia y flujo QA comprobados |
| Prospecto CRM | PASS | P0 | Solicitud QA llegó al CRM |
| Oportunidad | PASS | P1 | Flujo QA comprobado; trazabilidad post-envío parcial |
| Cotización formal | PASS | P0/P1 | `COT-2026-00008` emitida y validada |
| PDF producto-only | PASS | P0/P1 | PDF QA generado, recibido y abierto |
| Impresión/personalización | PARCIAL | P1 | Motor y campos existen; costo/precio aplicado a una cotización real no comprobado |
| Seguimiento | PARCIAL | P1/P2 | Persistencia QA comprobada; próxima acción estructurada e historial completos pendientes |
| Gmail | PASS controlado | P1 | E2E real QA; no extrapolar a cualquier destinatario |
| WhatsApp | PASS controlado | P1 | E2E real QA con PDF; operación sigue manual |
| Auth/login/recuperación | PASS | P0/P1 | AUTH-1 y AUTH-2 documentados |
| Roles y permisos detallados | PARCIAL | P1/P2 | Navegación por roles existe; matriz completa no certificada |
| Rutas públicas HTTP | PASS limitado | P0 | `/`, `/login`, `/crm`, `/catalogo` responden 200; HTTP no prueba interacción autenticada |
| Release productiva exacta | NO COMPROBADO | P1 | El shell publicado responde; el asset no demuestra por sí solo qué commit está desplegado |

## P0

No se encontró un P0 reproducible en esta auditoría. La web pública responde, el critical path existe en código y la evidencia QA cubre solicitud, CRM, cotización, PDF y comunicaciones controladas.

Esto no equivale a certificar cada ejecución comercial ni la frescura de proveedores. Los estados `request_quote`, `unresolved` y `unavailable` deben respetarse.

## P1 y gestión operativa

Los riesgos P1 no se corrigen con un rediseño en esta misión porque no hay defecto determinista aislado y algunos requieren datos runtime o decisión de negocio:

- validar manualmente precio/stock cuando el producto sea importante para una oportunidad;
- no prometer impresión hasta confirmar técnica, compatibilidad y precio;
- tratar Gmail/WhatsApp como acciones manuales y revisar destinatario;
- registrar seguimiento aunque la próxima acción estructurada aún sea parcial;
- no tratar HTTP 200 como prueba de sesión CRM o despliegue exacto.

Si alguno se convierte en fallo reproducible que impida vender, abrir un subcheckpoint P0/P1 focalizado.

## Qué podemos utilizar YA

### Validado

- mostrar Home y catálogo público;
- seleccionar productos, cantidad y observaciones;
- recibir solicitud pública;
- crear prospecto y oportunidad;
- trabajar cotizaciones en CRM;
- emitir cotización formal;
- generar PDF de producto-only;
- preparar y ejecutar comunicaciones manuales con autorización, como en QA;
- guardar seguimiento básico;
- usar login y recuperación.

### Implementado pero no validado de forma general

- frescura actual de stock/precios por proveedor;
- disponibilidad completa de imágenes y fichas;
- impresión cotizada de extremo a extremo;
- matriz completa de permisos por rol;
- release exacta actualmente servida en producción;
- cobertura general de Gmail/WhatsApp fuera del caso QA.

### No disponible todavía

- Super Agente completo;
- inteligencia sectorial cargada;
- perfiles de empresa persistentes como producto;
- WhatsApp AI;
- Pricing de Conversión productivo;
- aprendizaje comercial o Expected Profit con datos reales.

## Fases del roadmap

### Fase 0 — Web operativa

Mantener el critical path usable, observar P0/P1, aplicar solo correcciones focales y reversibles, y conservar la autoridad V2.

### Fase 1 — Super Agente Web

Solicitud simple, expediente estructurado, producto real, alternativas, CRM y cotización borrador con human handoff. `CHK-AI-SALES-1` cerró **PASS para el caso QA acotado** con `COT-2026-00009`; `CHK-AI-SALES-2` cerró **PASS del piloto Web cliente local/controlado** con BOOKRAFT Royal Blue, 50→80, prospecto QA reutilizado, oportunidad nueva y `COT-2026-00010` en `BORRADOR`, sin emisión ni envío. El piloto no está publicado ni permite escritura CRM anónima; un canal público para clientes reales requiere autorización posterior.

### Fase 2 — Multiproducto + CRM + cotización borrador

`CHK-AI-SALES-3` implementó y validó líneas independientes de producto, referencias naturales, precio/stock por producto, modificación/retiro/reingreso, contexto único de oportunidad y conciliación de partidas en un único borrador. El E2E runtime local controlado usó tres productos reales, una oportunidad y `COT-2026-00011` en `BORRADOR`; persistencia, partidas, totales, handoff y QA desktop/mobile pasaron. Suite completa 134/134, tipos, lint dirigido y builds normal/QA pasan. El checkpoint queda **CERRADO / PASS**; no se desplegó el piloto y kits siguen sin validación independiente.

### Fase 3 — Sector Intelligence + Company Intelligence + visión

Playbooks, perfiles persistentes, investigación puntual con fuentes y análisis de imágenes, sin certificar impresión automáticamente.

### Fase 4 — WhatsApp

Mismo cerebro central, consentimiento, identidad del contacto, handoff y controles de envío.

### Fase 5 — Pricing competitivo México + price match + enterprise

Canasta real, parámetros aprobados, benchmark normalizado, activación gradual del motor shadow y revisión enterprise.

### Fase 6 — Won/Lost + Expected Profit + aprendizaje

Telemetría de resultados, pérdidas, descuentos, utilidad y lead source. ML queda fuera hasta contar con datos suficientes y gobierno.

## Estimaciones de esfuerzo

Son estimaciones de ingeniería basadas en la estructura actual, no compromisos calendario.

| Frente | Tiempo para utilizar | Tiempo para madurar |
|---|---:|---:|
| Baseline operativa y guardrails | 1–2 días | 1–2 semanas de operación observada |
| Corrección P0 focal | 0.5–3 días por defecto | 1 semana de QA y monitoreo |
| Super Agente Web simple | 1–2 semanas | 3–6 semanas |
| Multiproducto + CRM + borrador | 1–2 semanas | 4–8 semanas |
| Sector Intelligence | 1–2 semanas para 5 playbooks | 4–8 semanas |
| Company Intelligence | 1–2 semanas para perfil mínimo | 4–8 semanas |
| Visión e imágenes | 1–2 semanas para captura/clasificación | 4–10 semanas |
| WhatsApp con el mismo agente | 1–2 semanas para handoff controlado | 4–8 semanas |

## Próximo checkpoint

`CHK-AI-SALES-1`, `CHK-AI-SALES-2` y `CHK-AI-SALES-3` quedan **CERRADOS / PASS** dentro de sus alcances QA controlados. No existe un siguiente checkpoint funcional autorizado automáticamente; debe definirse de forma expresa antes de iniciar otro frente. No se autoriza exponer ni desplegar el piloto al público. Pricing, G4 e impresión permanecen fuera; el lanzamiento público sigue condicionado a un PASS posterior de `CHK-BRAND-WEB-1`.
