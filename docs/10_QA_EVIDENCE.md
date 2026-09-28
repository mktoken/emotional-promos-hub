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
| CHK-COM-9 ciclo post-envío y seguimiento comercial | 2026-09-26 | `25a0ba6` + prueba QA runtime | Producción/CRM | CERRADO / PARCIAL | [Entrada CHK-COM-9](#chk-com-9--ciclo-post-envío-y-seguimiento-comercial) |
| CHK-CAT-1 catálogo, precios y stock | 2026-09-26 | `d290e99e` + evidencia read-only de producción | Repositorio y producción | CERRADO / PARCIAL | [Entrada CHK-CAT-1](#chk-cat-1--certificación-operativa-read-only) |
| Reconciliación Git final | 2026-09-26 | `bc13a15` | GitHub | PASS, 0/0 | `MASTER-STATE.md` |
| Suite actual | 2026-09-26 | `bc13a15` | Local | PASS, 67/67 | Validación documentada en CHK-DOC-1B |
| Build actual | 2026-09-26 | `bc13a15` | Local | PASS | Validación documentada en CHK-DOC-1B |
| CHK-AI-SALES-1 Super Agente Web QA | 2026-09-27 | Implementación versionada en este checkpoint | Repositorio local | CERRADO / PARCIAL; E2E runtime NO COMPROBADO | [Entrada CHK-AI-SALES-1](#chk-ai-sales-1--super-agente-web-qa) |

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

## CHK-COM-9 — Ciclo post-envío y seguimiento comercial

**Fecha:** 2026-09-26
**Estado final:** **CERRADO / PARCIAL**
**Cotización QA:** `COT-2026-00008`
**Oportunidad relacionada:** `4ee88798-969f-4aaa-a0a6-f294d9753ef4`
**Entorno:** producción / CRM, sesión autenticada como `admin`.

### Estado inicial observado

- La cotización formal `COT-2026-00008` existía, estaba en estado `Emitida`, enlazada desde la oportunidad y mostraba total `$2,088.00`.
- La oportunidad mostraba `QA Automatizado` / `QA PromoHub - NO CONTACTAR`, estado `Nueva`, sin fecha de seguimiento y con una nota QA histórica.
- La nota QA preexistente decía que `COT-2026-00008` estaba “en borrador”; se conserva como registro histórico porque la pantalla no ofrece borrado de notas y la cotización formal actual está `Emitida`.
- Los estados disponibles eran `Nueva`, `Contactado`, `En proceso`, `Enviada`, `Ganada` y `Perdida`.
- El CRM expone una fecha/hora de próximo seguimiento, notas internas y un historial de cambios de estado. No expone un campo estructurado separado para “próxima acción”.
- El historial inicial de estado mostraba `Sin cambios registrados`; el panel de emails del CRM mostraba `Sin eventos de email`.

### Prueba controlada ejecutada

Se utilizó únicamente la oportunidad QA. No se enviaron nuevos correos, WhatsApp ni otras comunicaciones.

1. Se cambió temporalmente el estado de `Nueva` a `Contactado`. El CRM mostró confirmación, persistió el cambio y registró `NUEVA → CONTACTADO` con fecha y hora.
2. Se guardó temporalmente el seguimiento `2026-09-30 10:00`. El CRM mostró confirmación; la lista mostró `30-sep`.
3. Se agregó la nota identificable: `CHK-COM-9 QA — seguimiento post-envío de COT-2026-00008; próximo seguimiento 2026-09-30 10:00; no contactar ni cotizar.`
4. Después de recargar, persistieron el estado `Contactado`, la fecha `2026-09-30T10:00` y la nota.
5. Después de navegar a la lista y volver a abrir la oportunidad, los tres valores continuaron visibles.
6. Se restauró el estado original `Nueva` y se limpió la fecha de seguimiento. La nota y el historial se conservaron como evidencia QA; la pantalla no ofrece borrado de notas.
7. Una recarga final confirmó el estado `Nueva`, el seguimiento vacío, la nota QA y el historial de ambas transiciones (`Nueva → Contactado` y `Contactado → Nueva`).

### Clasificación de resultados

| Capacidad | Resultado | Evidencia / limitación |
|---|---|---|
| Estado de oportunidad | PASS | Selector usable; cambio guardado, persistido y restaurado |
| Estado de cotización formal | PASS | `COT-2026-00008` permaneció `Emitida`; se consulta desde la oportunidad |
| Próxima acción | PARCIAL | No existe un campo estructurado de acción; se expresa mediante estado, nota y fecha |
| Fecha de seguimiento | PASS | Guardado, visible como `30-sep`, persistió tras recarga y navegación; luego fue limpiada |
| Nota interna | PASS | Nota QA guardada con actor y fecha; persistió tras recarga y navegación |
| Historial de estado | PASS | Registró estado anterior, nuevo estado y fecha/hora; el actor no aparece en el panel visible |
| Historial de nota | PARCIAL | Actor y fecha son visibles; no hay control de borrado desde esta pantalla |
| Evento de email en CRM | NO COMPROBADO | El panel mostró `Sin eventos de email`; la recepción Gmail externa de CHK-COM-8 no se enlaza aquí |
| Coherencia oportunidad ↔ cotización | PARCIAL | El enlace y folio son coherentes; no se observó sincronización bidireccional automática de estados |
| Ausencia de efectos reales | PASS | Solo se usó la oportunidad QA; no hubo nuevas comunicaciones ni clientes reales |

### Trazabilidad y rol

- Rol observado: `admin`.
- El estado registra transición y fecha/hora.
- La nota registra contenido, usuario y fecha/hora.
- La fecha de seguimiento se persiste en la oportunidad, pero no se observó un evento histórico independiente de esa modificación.
- La auditoría completa de permisos por rol permanece fuera de CHK-COM-9.

### Resultado final

El ciclo básico de estado, seguimiento, nota y persistencia funciona para la oportunidad QA. El resultado no es PASS completo porque no existe próxima acción estructurada independiente, el historial visible de estado no muestra actor y no hay evento de email enlazado en el CRM. Los valores temporales se restauraron; la nota y el historial se dejaron como evidencia QA.

**Resultado final CHK-COM-9: CERRADO / PARCIAL.** No se implementa corrección ni se abre un siguiente checkpoint; las limitaciones quedan documentadas para una decisión posterior.

## CHK-CAT-1 — Certificación operativa read-only

**Fecha:** 2026-09-26
**Alcance:** precios, stock, MOQ, proveedor, imágenes/fichas, Pricing V2 y consistencia catálogo → cotización pública → formal.
**Restricciones cumplidas:** no se ejecutaron sincronizaciones, Edge Functions, migraciones, recomputaciones, publicaciones, rollbacks ni escrituras de datos.

### Estado de proveedores, sincronizaciones y frescura

El código y los tipos versionados confirman la existencia de tres proveedores (`cdo_mx`, `forpromotional`, `g4_mx`) y de los campos `proveedores.last_sync_at`, `provider_import_batches.started_at`, `finished_at`, `status`, `error_message` y contadores de items. También existen `producto_b2b_status.last_stock_sync_at`, `stock_qty`, `stock_status`, `image_available`, `price_valid` y `quote_mode`.

No existe en el repositorio un valor runtime actual para esos campos por proveedor. La producción pública tampoco expone el timestamp, lote, error ni volumen de la última sincronización. Resultado: **NO COMPROBADO** para frescura, salud y cobertura operativa actual.

### Pricing V2, release, caché y Legacy

- Pricing V2 y sus contratos, generaciones, shadow, release y rollback están implementados.
- La release y generación documentadas (`2738c0e4…` / `818d824a…`) son evidencia histórica versionada, no una lectura runtime nueva de este checkpoint.
- Legacy sigue disponible como respaldo y no se modificó.
- La producción mostró 992 productos visibles y 42 páginas en la primera carga observada.
- En varias cargas posteriores read-only del catálogo, la pantalla permaneció en “Cargando catálogo…” durante más de 10 segundos sin mostrar error visible.
- En una repetición posterior, una recarga recuperó la misma página 1 en aproximadamente 12 segundos. Al pulsar “Siguiente” y esperar otros 12 segundos, la URL y el indicador continuaron en página 1; no se observó error de consola.
- Clasificación runtime: **TRANSITORIO / CAUSA NO COMPROBADA**. La evidencia no permite aislar backend, frontend, red o sesión.

### Muestra pública observada

La primera carga pública expuso 24 productos en la página 1. Se seleccionó una muestra de 15 registros para cubrir precios/MOQ variados, dos fuentes de imagen visibles y extremos de stock observables. El proveedor real, SKU exacto, timestamp de frescura y estado Pricing V2 no se muestran de forma suficiente en la tarjeta pública; cuando no se abrió el detalle, se conserva como **NO COMPROBADO**.

| Producto | SKU/ID | Fuente/Proveedor | Precio público desde | MOQ | Stock | Imagen/ficha | Resultado |
|---|---|---|---:|---:|---:|---|---|
| GOMA | `O 014` | proveedor no expuesto; imagen 4Promotional | $1.80 | 834 | 136,336 | 5 imágenes; ficha visible | PARCIAL |
| CUILLI | `PE 003` | proveedor no expuesto; imagen 4Promotional | $2.31 | 650 | 6,445 | 4 imágenes; ficha no completa | PARCIAL |
| FORRAN | `BP-925` | proveedor no expuesto; imagen 4Promotional | $2.70 | 556 | 10 | 3 imágenes; ficha no completa | PARCIAL |
| LAAX | NO COMPROBADO | imagen 4Promotional | $3.35 | 448 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| CARTOON | NO COMPROBADO | imagen 4Promotional | $3.46 | 434 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| TLAC | NO COMPROBADO | imagen 4Promotional | $3.93 | 382 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Lobby | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $4.18 | 359 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| FLAMENCO | NO COMPROBADO | imagen 4Promotional | $4.56 | 329 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| TEC | NO COMPROBADO | imagen 4Promotional | $4.69 | 320 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Bio Translúcida Tinta Negra | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Bio Sólida Tinta Negra | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Box tinta azul | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Bio Translúcida Tinta Azul | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Bio Sólida Tinta Negra — variante adicional | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |
| Koi Bio Translúcida Tinta Azul — variante adicional | NO COMPROBADO | imagen G4 México; proveedor no confirmado | $5.16 | 291 | NO COMPROBADO | imagen visible en listado | NO COMPROBADO |

### Detalle y consistencia E2E

- `GOMA / O 014`: el detalle mostró 136,336 piezas, stock sujeto a confirmación, MOQ 834 y precio `$1.80` al consultar cantidad 1,000. La cotización formal QA existente `COT-2026-00008`, leída sin modificar, conserva GOMA × 1,000 a `$1.80`, subtotal `$1,800`, IVA `$288` y total `$2,088`; esta ruta QA resulta consistente.
- `CUILLI / PE 003`: el detalle mostró 6,445 piezas, MOQ 650 y cuatro imágenes; con la cantidad inicial inferior al MOQ el precio quedó por confirmar, coherente con el contrato visible de MOQ.
- `FORRAN / BP-925`: el detalle mostró 10 piezas, MOQ 556 y tres imágenes; con la cantidad inicial inferior al MOQ el precio quedó por confirmar. Esto evidencia un caso de stock bajo, no una certificación comercial.
- No se verificaron en esta ejecución casos de stock cero, `request_quote` explícito, proveedor CDO, timestamp de frescura ni cotización pública nueva. No se creó ninguna cotización.

### Clasificación y límites

- Datos externos: no se puede determinar su frescura actual.
- Sincronización: campos y funciones existen, pero no hay lectura runtime actual.
- Pricing V2: contrato y artefactos históricos identificados; release/caché vigente no comprobados por consulta runtime nueva.
- Frontend/carga: la primera carga y las tres cargas controladas finales mostraron datos; las tres tardaron aproximadamente 6.7 s, 2.2 s y 1.8 s. Las esperas superiores a 10 segundos observadas previamente y un primer intento de “Siguiente” sin avance dejan una anomalía **INTERMITENTE**, sin causa de capa comprobada.
- Evidencia: insuficiente para certificar operación comercial general.

### Diagnóstico final de carga y paginación

| Prueba | Resultado | Tiempo aproximado | Evidencia |
|---|---|---:|---|
| Navegación catálogo 1 | PASS | 6.7 s | Página 1 de 42; 992 productos |
| Recarga normal 2 | PASS | 2.2 s | Página 1 de 42; 992 productos |
| Navegación independiente 3 | PASS | 1.8 s | Página 1 de 42; 992 productos |
| Página 1 → 2, intento 1 | SIN AVANCE | 19.5 s | URL y página permanecieron en 1; sin error visible |
| Página 1 → 2, intento 2 | PASS | 2.6 s | URL `?view=catalog&page=2`; página 2 de 42; productos cambiaron |
| Página 2 → 1 | PASS | 1.2 s | URL volvió a `?view=catalog`; página 1 de 42 |

La prueba de paginación se clasifica **INTERMITENTE**. El código read-only revisado calcula `p_offset` como `(page - 1) * 24`, actualiza `page` mediante `goToPage` y vuelve a ejecutar `catalog_search_products_v2` al cambiar la URL. No se observó una excepción de frontend y las herramientas disponibles no expusieron status HTTP, duración de RPC ni respuesta de red.

La carga se clasifica **INTERMITENTE / LENTA EN EPISODIOS PREVIOS**. No se inventa un SLA y no se atribuye la causa a backend, frontend, red o sesión.

**Resultado final CHK-CAT-1: CERRADO / PARCIAL.** No se abre un checkpoint correctivo en esta ejecución.

## Evidencia no disponible como índice independiente

No existe todavía un reporte separado, fuera de esta entrada y de `MASTER-STATE.md`, para:

- salud actual de proveedores;
- stock actual y frescura de precios;
- disponibilidad actual de imágenes y fichas;
- reglas de descuentos;
- aprobación de excepciones;
- una entrega de correo o WhatsApp independiente de la evidencia E2E controlada de CHK-COM-8;
- métricas de conversión y campañas.

## CHK-IMP-1 — Diagnóstico de personalización, impresión y precio final

**Fecha:** 2026-09-26
**Estado provisional:** **ABIERTO / EN VALIDACIÓN**
**Cotización inspeccionada:** `COT-2026-00008`
**Alcance:** diagnóstico read-only; no se creó una cotización, no se modificó la cotización QA y no se ejecutó cálculo ni persistencia de impresión.

### Git y documentación de entrada

- Rama: `main`.
- HEAD y `origin/main`: `10ccb82bb78b8755cd21a3cdbd0696493aebdf25`.
- Divergencia: `0 0`.
- Working tree inicial: limpio.
- Punto documental de entrada: `CHK-COM-9 CERRADO / PARCIAL`, commit `10ccb82`.
- Se consultaron `MASTER-STATE.md`, `04_PRODUCT_SCOPE.md`, `05_ARCHITECTURE.md`, `08_OPERATIONS_RUNBOOK.md`, `09_PRICING_CATALOG_V2.md`, `10_QA_EVIDENCE.md` y `02_DECISION_LOG.md`.

### Resultado runtime de `COT-2026-00008`

En producción se inspeccionaron el editor CRM y la vista de impresión existentes, sin pulsar acciones de guardado, emisión, cálculo o envío:

- Estado: `Emitida`.
- Cliente: `QA Automatizado`.
- Empresa: `QA PromoHub - NO CONTACTAR`.
- Partida: `GOMA`, clave `O 014`, color `Blanco`, cantidad `1,000 PZA`.
- Precio del producto: `$1.80`; subtotal `$1,800.00`; IVA `$288.00`; total `$2,088.00`.
- Personalización visible en el editor: `QA - Logo a 1 tinta`.
- Bloque “Impresión de esta partida”: `Pendiente`.
- Total y unitario de impresión: `—` y `—`.
- Técnica: `Sin técnica`.
- Tintas / posiciones: `— / —`.
- Resumen avanzado de trabajos de impresión: `0`.
- El PDF observado muestra producto, color, cantidad, precio, subtotal, IVA y total; no muestra una personalización incluida ni un cargo de impresión.

La vista del editor mostró vigencia `2026-09-26`, mientras que la pestaña de impresión ya abierta mostró `25 de septiembre de 2026`. Se registra como anomalía de consistencia entre vistas o posible estado obsoleto de la pestaña; no se recargó ni regeneró el PDF porque ese flujo registra eventos y la tarea era read-only.

### Inventario de implementación y modelo

- **Implementado en frontend:** selección pública de personalización, transporte de tipo/etiqueta/observaciones y mapeo a la partida formal.
- **Persistido en la partida formal:** producto, cantidad, color, precio, subtotal, `personalizacion` JSON, `print_method`, `print_colors`, `print_status`, `setup_fee`, `print_unit_price` y notas.
- **Implementado como modelo interno:** trabajos de impresión, asignación de partidas, componentes, técnica, tintas, posiciones, costos internos, precio al cliente, logística, snapshots y motivos de override.
- **Implementado como motor:** reglas por técnica/cantidad/tintas/posiciones, mínimos facturables, costos base, setup, placa, negativo/positivo, molde, logística, buffer, margen y utilidad mínima, con advertencias de reglas faltantes o validación manual.
- **Protección de salida:** el PDF cliente no expone costo interno, margen, buffer, logística, proveedor ni snapshot; solo renderiza personalización incluida cuando existe una técnica/estado/precio compatibles.

### Flujo E2E y clasificación

| Tramo | Evidencia | Clasificación |
|---|---|---|
| Catálogo → selección pública | Tipos y flujo de selección presentes en código | IMPLEMENTADO; no se repitió una cotización pública |
| Selección → solicitud/cotización pública | Mapeo de tipo y etiqueta de personalización | IMPLEMENTADO; no comprobado en una nueva solicitud |
| Solicitud → CRM/cotización formal | `COT-2026-00008` conserva `QA - Logo a 1 tinta` en el editor | VALIDADO en esta muestra |
| Cotización formal → trabajo de impresión | La UI ofrece el bloque, pero muestra `Pendiente` y `0` trabajos | PARCIAL |
| Trabajo → costo/precio final | Motor y campos existen, sin resultado persistido en esta cotización | NO COMPROBADO |
| Cotización formal → PDF cliente | PDF real observado con total producto-only y sin personalización incluida | PARCIAL; no certificado para una cotización impresa |

### Campos, cálculo, proveedores y PDF

- **Disponibles:** producto, cantidad, tipo/etiqueta de personalización, técnica, tintas, posiciones, notas, setup, precio unitario de impresión, proveedor/regla interna, costo interno, precio al cliente, logística y componentes.
- **Persistidos en esta cotización:** producto, cantidad, color, precio, subtotal, personalización solicitada y totales; no se observó persistencia de técnica, tintas, posiciones, trabajo, costo o precio de impresión.
- **Perdidos o no utilizados:** no se demuestra pérdida del label de personalización; sí quedan sin utilizar para esta cotización los campos específicos de impresión. Área de impresión y proveedor no están representados como datos runtime de esta partida.
- **Costo de impresión:** la regla del motor usa `cost_model`, cantidad facturable, tintas, posiciones, mínimos, setup/placa/negativo/molde y logística; los cargos condicionales se agregan manualmente. No hay resultado runtime comprobado para esta cotización.
- **Precio de impresión:** el motor calcula precio sugerido por margen/utilidad mínima y puede persistirlo en partida/trabajo; no está aplicado a `COT-2026-00008`.
- **Regla de subtotal:** `cantidad × precio_unitario × (1 − descuento) + setup_fee + cantidad × print_unit_price`, antes de IVA. En la cotización observada `setup_fee` y `print_unit_price` no aportan cargo visible.
- **Proveedor:** existen entidades/reglas de proveedores para impresión, pero no hay proveedor asignado/comprobado en el trabajo de esta cotización.
- **Representación formal/PDF:** el editor interno muestra el estado pendiente; el PDF solo incorpora una personalización cuando hay impresión incluida y no expone datos internos. El PDF observado no representa impresión cotizada.

### Casos de negocio y riesgos

- Producto sin impresión: soportado y observado con PASS para producto, cantidad y total base.
- Una personalización: etiqueta/tipo llegan a CRM; impresión y precio siguen parciales.
- Varias tintas, varias posiciones, área, setup, logística y mínimo facturable: existen campos/reglas, pero no fueron validados runtime en esta ejecución.
- Riesgo comercial principal: una cotización emitida puede conservar una personalización solicitada y mostrar un total que no incluye su impresión.
- Riesgos adicionales: proveedor/técnica/posición no visibles ni asignados, PDF ambiguo para el cliente y discrepancia de vigencia entre la pestaña del editor y la pestaña de impresión.

### Pendientes y siguiente decisión

- **Falta funcionalmente por comprobar:** cálculo real con una técnica y reglas válidas, persistencia del trabajo, inclusión del precio en subtotal/IVA/total, representación correcta en PDF y cobertura de combinaciones de tintas/posiciones.
- **Nueva QA requerida:** sí, si el propietario desea certificar impresión. Debe ser una operación QA aislada y autorizada; no se creó ni ejecutó porque modificar esta cotización emitida/enviada no estaba autorizado.
- **Fase correctiva:** no se ejecutó. Solo sería necesaria si el criterio de negocio exige bloquear emisión o completar automáticamente la impresión antes de cotizar.
- **Estado provisional:** **CHK-IMP-1 ABIERTO / EN VALIDACIÓN**; resultado **PARCIAL**, no PASS.
- **Siguiente acción recomendada:** devolver este diagnóstico al chat principal para decidir entre una QA aislada de impresión o una fase correctiva formal, con criterios de aceptación explícitos. No ejecutar cambios en esta fase.

## CHK-IMP-1 — Pausa controlada y auditoría de Pricing Base

**Fecha:** 2026-09-26
**Estado:** **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**
**Alcance:** auditoría read-only previa a impresión. No se modificaron reglas, márgenes, precios, cachés, releases, proveedores, sincronizadores, código, Supabase, Lovable ni producción. Se conservaron los cambios documentales previos de CHK-IMP-1.

### 1. Git y fuentes

- Rama: `main`.
- HEAD: `10ccb82bb78b8755cd21a3cdbd0696493aebdf25`.
- `origin/main`: `10ccb82bb78b8755cd21a3cdbd0696493aebdf25`.
- Divergencia: `0 0`.
- Working tree de entrada: con únicamente los cambios documentales autorizados de CHK-IMP-1 en `MASTER-STATE.md` y `10_QA_EVIDENCE.md`; no se detectaron cambios inesperados.
- Se revisaron `MASTER-STATE.md`, `09_PRICING_CATALOG_V2.md`, `04_PRODUCT_SCOPE.md`, `05_ARCHITECTURE.md`, `02_DECISION_LOG.md` y este índice QA, además del código y migraciones de pricing.

### 2. Política histórica, documentada, implementada y observada

| Dimensión | Resultado con evidencia | Diferencia / riesgo |
|---|---|---|
| Política comercial histórica | La vista Legacy `productos_publicos` contiene una rama que calcula `precio_neto_distribuidor × 1.35`; la tabla `proveedores` conserva `markup_pct = 35` en su seed. | `×1.35` es una política histórica/Legacy; no se demuestra como contrato comercial vigente universal. |
| Política documentada actual | Pricing V2 declara como autoridad `public.calculate_product_price_v2(product_id, qty, rule_set_id)`, con costos base por proveedor, escalas, MOQ, niveles de compra y multiplicadores. El precio público es antes de IVA e impresión. | La documentación declara V2 vigente, pero también mantiene Legacy y no certifica la confiabilidad operativa actual. |
| Política implementada | El código versionado implementa `pricing_rule_sets`, `purchase_levels`, `margin_tiers`, `provider_pricing_rules`, `producto_precio_escalas` y la RPC V2. | La definición de reglas en migraciones no prueba por sí sola qué filas están activas hoy en producción. |
| Política observada | Producción muestra precios “antes de IVA e impresión” y MOQ > 1: GOMA $1.80/MOQ 834, CUILLI $2.31/MOQ 650 y FORRAN $2.70/MOQ 556. | Los datos públicos no muestran costo base, proveedor, factor aplicado, nivel, rule set ni generación. No puede calcularse una diferencia contra costo. |
| Resultado | El diseño V2 es internamente identificable; la coherencia comercial runtime no queda comprobada. | Riesgo **CRÍTICO** antes de continuar con impresión o escalar operación. |

### 3. Uso de `×1.35`

| Aparición | Clasificación |
|---|---|
| `productos_publicos`: `precio_neto_distribuidor × 1.35` para la rama Legacy de productos activos | HISTÓRICA / LEGACY; puede ser ruta condicional si no existe release V2 actual, pero no se comprobó la fila runtime de release directamente. |
| Seed `proveedores.markup_pct = 35` para `forpromotional`, `cdo_mx` y `g4_mx` | LEGACY / CONFIGURACIÓN HISTÓRICA; no se encontró uso en el cálculo V2 actual. |
| Fallback comentado en la versión anterior de `get_public_product_price_tiers` | HISTÓRICA / NO UTILIZADA en la función activa; la versión activa declara que no hay fallback `×1.35`. |
| RPC V2 y Edge Function de promoción | No usan `×1.35` como fórmula general; aplican reglas V2 y multiplicadores configurados. |

Conclusión sobre `×1.35`: existe en código versionado, pero no hay evidencia suficiente para llamarlo política activa universal ni para afirmar que todos los precios actuales lo usan.

### 4. Reglas por proveedor

| Proveedor | Costo base / estrategia documentada | Factor | Escalas y MOQ | Estado |
|---|---|---:|---|---|
| `g4_mx` | Regla `provider_tier_n`, tier declarado 5; la implementación V2 usa un costo fijo tomado de la escala `min_qty = 250` y exige esa escala. | `1.0000` | Escalas de `producto_precio_escalas`; MOQ es la escala mínima válida. | IMPLEMENTADO EN CÓDIGO; equivalencia entre “tier 5” y `min_qty=250`, filas activas y runtime: NO COMPROBADO. |
| `forpromotional` | `list_price_factor`: toma la escala/list price positiva y aplica el factor. | `1.0300` | Escala seleccionada por cantidad; MOQ es la escala mínima. | IMPLEMENTADO EN CÓDIGO; regla/fila activa, costo y runtime: NO COMPROBADO. |
| `cdo_mx` | `list_price` en la regla; la implementación final exige el costo de precio personal (`variant.net_price` o `cdo.precio_personal_api`) y no usa fallback a list price cuando falta. | `1.0000` | Costo personal fijo; MOQ es la escala mínima válida. | IMPLEMENTADO EN CÓDIGO; dato activo, costo y runtime: NO COMPROBADO. |

Los tres proveedores tienen `markup_pct = 35` en el seed Legacy, pero esa columna no aparece como entrada del cálculo V2 identificado.

### 5. Arquitectura y fórmula actual

El flujo versionado es:

`Proveedor → oferta/escala de costo → regla del proveedor → costo ajustado → purchase level → margin tier → Pricing V2 → generación/cache → precio público`

La RPC final es `public.calculate_product_price_v2`. Para cada nivel elegible calcula:

`precio_unitario = costo_efectivo × cost_factor × multiplier_del_nivel`

El sistema selecciona el nivel más alto cuyo subtotal alcanza su umbral. Esto es una fórmula de **multiplicador sobre costo**, no una fórmula de margen sobre venta `costo / (1 − margen)`.

Ejemplo conceptual: multiplicador `1.75` equivale a 75% de markup sobre costo y aproximadamente 42.86% de margen bruto sobre venta, si no existen otros cargos.

El motor de impresión es distinto y sí contiene una fórmula de margen sobre venta para el precio sugerido de impresión; no debe confundirse con Pricing V2 base.

### 6. Muestra controlada en producción

| Producto | Proveedor | Cantidades observadas | MOQ | Precio visible | Precio esperado/diferencia | Resultado |
|---|---|---|---:|---:|---|---|
| GOMA / `O 014` | No expuesto; imagen de 4Promotional no prueba proveedor | 100: por confirmar; 834: $1.80; 1,000: $1.80; 2,000: $1.80 | 834 | $1.80 c/u | No calculable sin costo base, oferta, regla y nivel activos | PARCIAL / NO COMPROBADO |
| CUILLI / `PE 003` | No expuesto | 100: por confirmar; 1,000: $2.31 | 650 | $2.31 c/u | No calculable sin costo base, oferta, regla y nivel activos | PARCIAL / NO COMPROBADO |
| FORRAN / `BP-925` | No expuesto | 100: por confirmar; 1,000: $2.70 | 556 | $2.70 c/u | No calculable sin costo base, oferta, regla y nivel activos | PARCIAL / NO COMPROBADO |
| Koi Bio / variantes | No expuesto | Listado público | 291 | $5.16 c/u | Producto de precio alto de la muestra; costo y proveedor no disponibles | NO COMPROBADO |

Observaciones adicionales:

- GOMA mostró 136,336 piezas disponibles; CUILLI, 6,445; FORRAN mostró una variante seleccionada con 10 piezas, mientras otras variantes tenían disponibilidades distintas o “consultar disponibilidad”.
- El comportamiento `por confirmar` debajo de MOQ y precio disponible desde MOQ es consistente con el contrato V2 observado.
- El catálogo público no expone proveedor ni SKU de oferta; por ello no es legítimo asignar GOMA, CUILLI o FORRAN a `g4_mx`, `forpromotional` o `cdo_mx` únicamente por nombre, imagen o categoría.
- La muestra confirma precio público y MOQ, no confirma costo, factor, margen ni frescura de la sincronización.

### 7. IVA e impresión

- El precio público observado se comunica como **antes de IVA e impresión**.
- La función pública usa `price_before_tax_mxn` y `tax_included = false` en el contrato V2.
- La UI muestra el subtotal estimado antes de IVA e impresión.
- No hay evidencia contraria de que el precio base incluya impresión; por tanto, la impresión queda separada y debe resolverse en CHK-IMP-1 después de aclarar Pricing Base.

### 8. Riesgos clasificados

- **CRÍTICO:** no se puede demostrar que costo, proveedor, rule set y precio público observado estén alineados en runtime antes de cotizar impresión.
- **ALTO:** coexistencia de Legacy `×1.35` y V2; una ruta condicional o release no comprobada podría producir políticas distintas.
- **ALTO:** G4 declara tier 5, pero la función V2 implementa un costo fijo de `min_qty = 250`; la equivalencia no está demostrada para todos los productos.
- **MEDIO:** `markup_pct = 35` permanece como configuración Legacy y puede inducir a interpretar incorrectamente la política actual.
- **MEDIO:** precios “desde” y escalas públicas no permiten auditar margen, costo o frescura de datos.
- **BAJO:** el IVA está comunicado explícitamente como separado y la impresión está indicada como excluida.

### 9. Estado de la decisión

- Correcto: separación antes de IVA/impresión, MOQ visible, estados `priced`/`request_quote`/`below_minimum`, contrato V2 versionado y fórmula de multiplicador identificable.
- Incorrecto o riesgoso: no se puede afirmar todavía que la política implementada y los precios observados correspondan al costo/proveedor/margen comercial aprobado.
- NO COMPROBADO: filas activas de `pricing_rule_sets`, `provider_pricing_rules`, `margin_tiers`, `purchase_levels`, ofertas, escalas, release/generación actual, costo por producto y última sincronización.
- Decisión sobre CHK-IMP-1: **no continuar automáticamente**. El checkpoint permanece **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**.
- Esta evidencia no autoriza abrir todavía un checkpoint correctivo; primero requiere decisión explícita del chat principal sobre la política comercial que debe considerarse autoridad.

### 10. Alcance mínimo de una eventual corrección

Solo si el propietario la autoriza después de esta auditoría: fijar una política única y versionada, eliminar ambigüedades Legacy/V2, verificar reglas por proveedor y escalas, validar una muestra con costo y precio esperado, y proteger publicación/cotización cuando el costo o rule set no estén comprobados. No se ejecutó ninguna de esas acciones.

**Resultado de esta auditoría:** `PRICING BASE: NO COMPROBADO — EVIDENCIA INSUFICIENTE`.

## CHK-IMP-1 — Subfase de dependencia: validación determinista de Pricing Base runtime

**Fecha:** 2026-09-26
**Estado:** **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**
**Alcance:** reconstrucción read-only de la función V2 y observación pública por cantidades. No se modificaron reglas, precios, cachés, releases, proveedores, sincronizadores, código, Supabase, Lovable, producción ni cotizaciones. No se hizo commit ni push.

### 1. Git y alcance efectivo

- Rama: `main`.
- HEAD: `10ccb82bb78b8755cd21a3cdbd0696493aebdf25`.
- `origin/main`: mismo commit.
- Divergencia: `0 0`.
- Working tree: únicamente `docs/MASTER-STATE.md` y `docs/10_QA_EVIDENCE.md`, cambios documentales esperados de CHK-IMP-1; no aparecieron cambios adicionales.
- Se conservaron los cambios documentales previos; no se usó `reset`, `stash`, commit ni push.

### 2. Función V2 reconstruida

La implementación final versionada es `public.calculate_product_price_v2(p_producto_b2b_id, p_quantity, p_rule_set_id)`, en `supabase/migrations/20260728023213_66b0fb19-1707-42ea-9c59-5674fa85b41b.sql`. Su contrato devuelve, entre otros:

`status`, `warning_code`, `requested_quantity`, `is_valid_quantity`, `minimum_quantity`, `lower_valid_quantity`, `upper_valid_quantity`, `unit_price_mxn`, `subtotal_mxn`, `currency`, `tax_included`, `applied_level`, `applied_multiplier`, `applied_unit_cost`, `adjusted_unit_cost`, `applied_cost_factor`, `applied_provider_code`, `source_oferta_id` y `suggested`.

Secuencia exacta relevante:

1. Rechaza entradas nulas, cantidades menores o iguales a cero, `rule_set_id` inexistente y producto inexistente.
2. Selecciona la primera oferta por `is_primary DESC`, `match_score DESC` y `created_at ASC` desde `producto_b2b_oferta_map`.
3. Busca la regla de `provider_pricing_rules` por `rule_set_id` y `provider_code`; sin regla devuelve `request_quote / no_provider_rule`.
4. G4 fija el costo en la escala `min_qty = 250`; si falta devuelve `request_quote / no_g4_250_scale`; si hay varios costos devuelve `manual_review / multiple_g4_250_costs`.
5. CDO fija el costo desde `variant.net_price` o `cdo.precio_personal_api`; no usa fallback a `list_price`; ausencia o duplicidad devuelve `request_quote` o `manual_review`.
6. El MOQ es el menor `min_qty` con `unit_cost > 0`. Sin escalas devuelve `request_quote / no_scales`.
7. Para la cantidad solicitada selecciona la escala cuya ventana contiene la cantidad. Si no existe, devuelve `below_minimum`.
8. Busca niveles de compra descendentes y selecciona el nivel más alto cuyo subtotal calculado alcanza el umbral. Si ninguno califica, devuelve `below_minimum`.
9. Si las sugerencias no son monótonas, devuelve `manual_review / non_monotonic_scales`.
10. Un resultado válido devuelve `status = valid`, `is_valid_quantity = true`, precio unitario, subtotal, nivel, multiplicador, costo aplicado, proveedor y oferta fuente.

### 3. Fórmula, redondeo y base de niveles

Para la cantidad solicitada:

```text
costo_efectivo = costo_fijo_G4 o costo_fijo_CDO o costo_de_la_escala_seleccionada
costo_ajustado = round(costo_efectivo × cost_factor, 4)
precio_unitario = round(costo_ajustado × multiplier_del_nivel, 2)
subtotal = round(precio_unitario × cantidad, 2)
```

La base del nivel es el subtotal calculado con el precio unitario candidato (`precio_unitario × p_quantity`), no una lectura directa del precio público previamente mostrado. Los umbrales versionados son `1500`, `3500`, `6000`, `15000`, `25000` y `55000 MXN`. El redondeo de precio y subtotal es a dos decimales; el costo ajustado es a cuatro.

El cálculo es markup sobre costo, no margen sobre venta. El motor de impresión es independiente.

### 4. Reglas V2 por proveedor

| Proveedor | Fuente/estrategia | Factor | Niveles y MOQ | Fallback/estado |
|---|---|---:|---|---|
| `g4_mx` | `provider_tier_n`, tier declarado 5; implementación fija costo de escala `min_qty=250` | `1.0000` | Escalas `producto_precio_escalas`; MOQ menor `min_qty` válido | Sin escala 250: `request_quote`; múltiples costos: `manual_review` |
| `forpromotional` | `list_price_factor`; usa costo de escala/list price positivo de la escala seleccionada | `1.0300` | Escalas por cantidad; MOQ menor `min_qty` válido | Regla faltante: `request_quote` |
| `cdo_mx` | Precio Personal (`variant.net_price` / `cdo.precio_personal_api`), fijo e independiente de cantidad | `1.0000` | MOQ menor `min_qty` válido | Sin Precio Personal: `request_quote`; duplicidad: `manual_review`; sin fallback a list price |

Multiplicadores generales por nivel: `1.75`, `1.55`, `1.32`, `1.27`, `1.23`, `1.20`. G4 tiene override de nivel 1 a `1.85`; niveles 2–6 coinciden con los generales.

### 5. `×1.35`: rutas encontradas

| Archivo / función | Propósito | Legacy o V2 | Alcanzable desde catálogo actual |
|---|---|---|---|
| `20260702213524...sql`, vista `productos_publicos` | Rama de productos activos que calcula `precio_neto_distribuidor × 1.35` | Legacy | **Sí, condicionalmente**, si `get_public_product_price_quote` no encuentra release V2 actual; la fila runtime no fue consultada directamente |
| `20260629021032...sql`, seed `proveedores.markup_pct = 35` | Configuración histórica de proveedores | Legacy | No se encontró como entrada de la RPC V2 |
| `20260721000100...sql`, fallback comentado de `get_public_product_price_tiers` | Código histórico comentado; el fallback usaba `1.35` | Legacy/histórico | No; no es la función activa |
| `calculate_product_price_v2` y `get_public_product_price_quote` | Cálculo V2 y contrato público actual | V2 | No usan `1.35` como fórmula general |

Conclusión: `×1.35` puede alimentar la ruta Legacy condicional sin release V2; no se comprobó que la ruta esté activa para los productos de la muestra y no debe tratarse como multiplicador V2 universal.

### 6. RPC pública y catálogo V2

`get_public_product_price_quote` devuelve únicamente:

`public_price_status`, `price_before_tax_mxn`, `currency`, `minimum_quantity`, `pricing_generation_id`, `requested_quantity` e `is_valid_quantity`.

Con release V2 actual, toma la generación y `rule_set_id`, verifica el estado shadow y vuelve a invocar `calculate_product_price_v2` para una respuesta dinámica. El campo `v_shadow_price` se lee, pero la rama `priced` no lo devuelve como precio final; por tanto, existe una diferencia potencial entre cache shadow y cálculo dinámico que no puede medirse sin acceder a las filas internas. Sin release actual, devuelve `productos_publicos.precio_desde_mxn`, MOQ `1`, generación nula y no entrega lineage V2.

Los estados públicos están mapeados así:

- `valid` con precio/MOQ positivos → `priced`.
- `below_minimum` → `below_minimum`, sin precio.
- `manual_review` → `request_quote`, sin precio.
- `request_quote` → `request_quote`, sin precio.
- `unavailable` o estado desconocido → `unavailable` o fallback seguro a `request_quote`.

La aplicación cliente solo normaliza esos campos y no calcula precios localmente.

`catalog_search_products_v2` devuelve `id`, `id_interno`, `sku_base`, nombre, descripción, imágenes, precio, estado, moneda, MOQ, `pricing_generation_id`, categorías, relevancia y conteo. La UI pública observada mostró precio, MOQ y producto; no mostró proveedor, oferta, costo, regla, multiplicador ni generación. La búsqueda pública no expone stock en la tarjeta; el detalle sí muestra stock de la variante.

Las tablas internas de generación/shadow no tienen acceso directo para `anon`/`authenticated`, y el código cliente no contiene una vista CRM read-only existente para la lineage completa. No se creó endpoint, RPC, permiso ni consulta externa.

### 7. Muestra focalizada e IDs reales

| Producto | SKU/clave | `product_id` real | Evidencia pública |
|---|---|---|---|
| GOMA | `O 014` | `82115a4a-68b9-49cd-b7c5-ce19a216a6a4` | Precio desde `$1.80`, MOQ 834 |
| CUILLI | `PE 003` | `587f0643-0c27-4146-a760-6a120e938d02` | Precio desde `$2.31`, MOQ 650 |
| FORRAN | `BP-925` | `e6e30624-f8cf-456e-adb0-577c9216102a` | Precio desde `$2.70`, MOQ 556 |

### 8. Prueba pública por cantidades

Los estados entre paréntesis son la interpretación del contrato público; la UI no muestra el texto crudo del RPC.

| Producto | Cantidad | MOQ | Precio unitario visible | Resultado visible / estado contractual |
|---|---:|---:|---:|---|
| GOMA | 100 | 834 | Por confirmar | `below_minimum` esperado; precio crudo no expuesto |
| GOMA | 834 | 834 | `$1.80` | Precio visible / `priced` esperado |
| GOMA | 1,042 | 834 | `$1.80` | Precio visible / `priced` esperado |
| GOMA | 1,668 | 834 | `$1.80` | Precio visible / `priced` esperado |
| GOMA | 2,000 | 834 | `$1.80` | Precio visible / `priced` esperado |
| GOMA | 3,000 | 834 | `$1.60` | Precio visible / `priced` esperado; cambio de nivel plausible |
| CUILLI | 100 | 650 | Por confirmar | `below_minimum` esperado; precio crudo no expuesto |
| CUILLI | 650 | 650 | `$2.31` | Precio visible / `priced` esperado |
| CUILLI | 812 | 650 | `$2.31` | Precio visible / `priced` esperado |
| CUILLI | 1,300 | 650 | `$2.31` | Precio visible / `priced` esperado |
| CUILLI | 2,000 | 650 | `$2.04` | Precio visible / `priced` esperado; cambio de nivel plausible |
| CUILLI | 3,000 | 650 | `$2.04` | Precio visible / `priced` esperado |
| FORRAN | Catálogo | 556 | `$2.70` en catálogo; ficha no cargó | No comprobado por cantidad en esta ejecución |

### 9. Análisis de GOMA

El precio de GOMA permanece en `$1.80` desde MOQ hasta 2,000 y baja a `$1.60` en 3,000. Esto es compatible con una selección de nivel por subtotal, pero no permite distinguir entre un cambio de nivel correcto, una escala específica o un dato de costo sin exponer la lineage. No se clasifica como error.

### 10. Lineage y reconciliación

Se obtuvo la parte pública `SKU → product_id → MOQ → precio runtime/público`. No se obtuvo para ningún producto la cadena completa `proveedor → oferta → costo fuente → ajuste → nivel → multiplicador → precio esperado`.

| Producto | Proveedor/costo/regla/nivel | Precio RPC visible | Precio catálogo | Diferencia calculable | Resultado |
|---|---|---:|---:|---|---|
| GOMA | NO COMPROBADO | `$1.80` en 834; `$1.60` en 3,000 | `$1.80` | No | PARCIAL / NO COMPROBADO |
| CUILLI | NO COMPROBADO | `$2.31` en 650; `$2.04` en 2,000 | `$2.31` | No | PARCIAL / NO COMPROBADO |
| FORRAN | NO COMPROBADO; ficha bloqueada en carga | No comprobado por cantidad | `$2.70` | No | PARCIAL / NO COMPROBADO |

No existe una fila `PASS` o `FAIL`: falta la entrada indispensable para calcular el precio esperado.

### 11. Implicación comercial

- Es razonable mostrar el precio público como informativo porque la UI lo rotula antes de IVA e impresión, muestra MOQ y advierte validación comercial.
- No es posible certificar desde la evidencia pública que el precio “desde” preserve el margen comercial aprobado.
- Una cotización formal que agregue impresión debería conservar revisión humana del precio base hasta obtener lineage determinista.
- El riesgo es de trazabilidad y margen potencial, no un error numérico demostrado.

### 12. Estado de decisión

- Pricing V2 está implementado y su fórmula es reproducible desde el código.
- La conducta pública por cantidades es observable y muestra cambios compatibles con niveles.
- La lineage runtime completa no está disponible mediante las vistas públicas o CRM ya existentes.
- `×1.35` queda clasificado como Legacy condicional/histórico, no como política V2 universal.
- CHK-IMP-1 permanece **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**.
- No se abre un nuevo checkpoint y no se autoriza continuar impresión.

**Resultado de esta subfase:** `PRICING BASE: NO COMPROBADO — REQUIERE DECISIÓN DE ARQUITECTURA/EVIDENCIA`.

## CHK-IMP-1 — Validación dirigida de reglas de proveedor para Pricing Base

**Fecha:** 2026-09-26
**Estado:** **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**
**Alcance:** validación read-only de las reglas propuestas para `cdo_mx`, `forpromotional` y `g4_mx`. No se cambiaron reglas, precios, datos, cachés, releases, sincronizadores, código, Supabase, Lovable, producción ni cotizaciones. No se hizo commit ni push.

### 1. Resultado ejecutivo

La regla propuesta para ForPromotional coincide con la regla versionada en código. La propuesta de CDO (`×1.03`) puede expresarse y simularse matemáticamente, pero no se comprobó con costos runtime ni con una muestra atribuible de productos. En G4 no se pudo demostrar que la “5ta escala” comercial declarada equivalga al selector V2 actual `min_qty = 250`; por tanto, tampoco puede simularse de forma segura el impacto de pasar de `N` a `N+1`.

**Resultado global:** `REGLAS DE PROVEEDOR: NO COMPROBADAS — EVIDENCIA INSUFICIENTE`.

### 2. Cadena de cálculo comprobada en código

La cadena versionada relevante es:

```text
costo/precio fuente de la escala o atributo del proveedor
→ cost_factor de provider_pricing_rules
→ multiplicador comercial del nivel de compra
→ precio unitario y subtotal V2
→ respuesta pública de precio/MOQ
```

La función V2 final es `public.calculate_product_price_v2`, en `supabase/migrations/20260728023213_66b0fb19-1707-42ea-9c59-5674fa85b41b.sql`. Su fórmula observable en código es `costo_ajustado = round(costo_fuente × cost_factor, 4)` y `precio_unitario = round(costo_ajustado × multiplicador_del_nivel, 2)`. Los umbrales generales son `1500`, `3500`, `6000`, `15000`, `25000` y `55000 MXN`; G4 tiene override de nivel 1 a `1.85` y los niveles 2–6 coinciden con los generales.

### 3. ForPromotional

- **Regla versionada:** `list_price_factor`, `cost_factor = 1.0300`, sin `provider_tier_number`.
- **Interpretación:** toma el costo/list price positivo de la escala seleccionada y aplica `×1.03` antes del multiplicador comercial V2.
- **Regla propuesta:** coincide con la regla versionada; no se encontró una excepción adicional para este proveedor.
- **Simulación:** `base_ajustada = base_fuente × 1.03`; con la misma fuente y nivel V2, el precio previo al redondeo aumenta 3% frente a `base_fuente × 1.00`.
- **Estado:** **CONFIRMADO EN CÓDIGO; ejecución runtime activa y filas concretas no comprobadas**.
- **Límite:** esta confirmación no autoriza publicar, recalcular ni cambiar el catálogo.

### 4. CDO

- **Regla versionada vigente en la función V2:** `cost_factor = 1.0000`; el costo se fija desde `variant.net_price` o `cdo.precio_personal_api`, independiente de la cantidad.
- **Fallback comprobado:** no usa `list_price` como fallback en la función V2 final; ausencia o duplicidad produce `request_quote` o `manual_review`.
- **Regla propuesta:** aplicar `×1.03` sobre el Precio Personal antes del mismo multiplicador comercial V2.
- **Simulación algebraica:** `base_actual = precio_personal × 1.00`; `base_propuesta = precio_personal × 1.03`; incremento previo al multiplicador V2 `= precio_personal × 0.03`.
- **Muestra numérica:** no se identificaron 2–3 productos públicos con proveedor CDO y Precio Personal runtime verificable; no es válido sustituir ese dato por el precio público observado.
- **Estado:** **NO COMPROBADO como política runtime; la propuesta solo está validada como simulación, no como implementación**.

### 5. G4: estructura de niveles encontrada

- El seed de `provider_pricing_rules` declara `strategy = provider_tier_n`, `provider_tier_number = 5` y `cost_factor = 1.0000`, con la nota `G4 usa 5ta escala como costo base`.
- `sync-g4-products` extrae del SOAP únicamente elementos `<escala>` con `rango` y `precio`, convierte el rango a `min_qty` y guarda `source_field = g4_precios_escala`.
- El parser no conserva un nombre o número semántico de nivel G4; solo conserva rango, mínimo, máximo nulo y costo.
- La función `promote-provider-products-to-catalog` interpreta el tier declarado como posición 5 del arreglo (`primaryScales[4]`).
- La función V2 final `calculate_product_price_v2` no usa `provider_tier_number`; selecciona el costo fijo de la escala exacta `min_qty = 250`, con `request_quote` si falta y `manual_review` si hay costos distintos duplicados.

### 6. G4: nivel actual y equivalencia comercial

El **nivel actual comprobable técnicamente en la función V2 final** es el selector `min_qty = 250`. La **“5ta escala” declarada comercialmente** aparece en el seed y en una ruta de promoción distinta. No existe evidencia versionada ni runtime que demuestre que el quinto elemento ordenado del SOAP sea exactamente la escala de 250 unidades para todos los productos G4.

Por ello, el nivel comercial G4 se clasifica como **NO COMPROBADO**. La diferencia entre posición 5 y `min_qty = 250` es una ambigüedad de interpretación, no un defecto runtime demostrado en esta ejecución.

### 7. G4: simulación `N → N+1`

No es seguro simular el cambio `N → N+1` porque `N` no está definido de manera única en las rutas versionadas: puede significar posición ordinal de escala o una escala identificada por `min_qty`. Sin costos, rangos completos y correspondencia proveedor-producto, cualquier diferencia de precio sería hipotética.

La evidencia tampoco demuestra si un número de nivel mayor en G4 representa un costo menor, mayor o una convención distinta. No se debe asumir monotonicidad económica solo porque las escalas estén ordenadas por `min_qty`.

### 8. Muestra de productos y reconciliación pública

La muestra pública previa contiene GOMA `O 014`, CUILLI `PE 003` y FORRAN `BP-925`, con precios/MOQ observables, pero la UI pública no expone proveedor, oferta, costo fuente, regla, nivel ni multiplicador. FORRAN además no cargó de forma fiable en la ficha durante la comprobación dirigida. No se obtuvo una muestra de tres productos con identidad G4 comprobada, costo fuente y nivel G4 verificables.

Las imágenes o nombres de producto no constituyen prueba de proveedor. En consecuencia, no se puede calcular una tabla válida de `precio actual vs. precio esperado` para CDO, ForPromotional o G4 a partir de esos productos públicos.

### 9. Impacto económico y operativo

| Proveedor | Estado de regla | Impacto simulable | Riesgo restante |
|---|---|---|---|
| ForPromotional | Confirmada en código | Si la fuente no cambia, la propuesta coincide con `×1.03`; no hay delta frente a la regla versionada | Runtime activo y filas concretas no comprobadas |
| CDO | Propuesta no implementada | `+3%` sobre Precio Personal antes del multiplicador V2 | Sin costo runtime ni muestra atribuible; fallback y duplicidad deben conservarse |
| G4 | Nivel no comprobado | Impacto `N→N+1` no cuantificable | Ambigüedad tier 5 vs `min_qty=250`; semántica ordinal no demostrada |

El override G4 de multiplicador comercial `1.85` en nivel 1 es una regla de margen/markup distinta del nivel de costo del proveedor. No debe usarse para inferir que G4 tenga una quinta escala ni para resolver la equivalencia pendiente.

### 10. Evidencia faltante y decisión

Para cerrar la validación se requiere una fuente autorizada que exponga, al menos para una muestra controlada, `producto → proveedor → oferta → escalas/rangos → costo → regla → nivel → multiplicador → precio esperado`, además de confirmar qué función/ruta es autoridad de runtime. La evidencia pública actual no entrega esa cadena.

No se modificó `docs/02_DECISION_LOG.md`: no existe todavía una decisión permanente aprobada sobre la política CDO ni sobre la equivalencia de niveles G4; registrar una decisión ahora convertiría una propuesta no comprobada en autoridad.

CHK-IMP-1 permanece **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**. No se autoriza implementar `×1.03` para CDO, cambiar la interpretación de G4, recalcular precios, publicar cachés/releases ni continuar el frente de impresión.

**Resultado de la validación dirigida:** `REGLAS DE PROVEEDOR: NO COMPROBADAS — EVIDENCIA INSUFICIENTE`.

## CHK-IMP-1 — Resolución final de Pricing Base por proveedor

**Fecha:** 2026-09-26
**Estado:** **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**
**Alcance:** resolución documental read-only de las políticas aprobadas para ForPromotional, CDO y G4. No se implementaron cambios, no se ejecutaron sincronizadores, recompute, publish, rollback ni refresh, y no se modificaron precios, datos, releases, cachés, código, Supabase, Lovable, producción o cotizaciones. No se hizo commit ni push.

### 1. Decisión de negocio registrada

La decisión permanente quedó registrada como **D-010** en `docs/02_DECISION_LOG.md`:

- `×1.35` / `markup_pct = 35`: histórico, Legacy y no vigente; no es candidato ni fallback de Pricing V2.
- ForPromotional: mantener `precio/costo fuente aplicable × 1.03` antes de Pricing V2.
- CDO: aplicar `precio_personal × 1.03` antes de Pricing V2; el código actual todavía usa `1.0000`.
- G4: utilizar la escala fuente inmediatamente posterior a la actual, sin inventar una numeración ordinal.
- Los multiplicadores comerciales generales y el override G4 `1.85` no cambian.

La decisión no autoriza implementación en esta ejecución.

### 2. Capas de Pricing Base

```text
proveedor
→ costo/precio fuente
→ escala fuente del proveedor, si aplica
→ factor de ajuste del proveedor
→ nivel comercial V2
→ multiplicador comercial V2
→ precio público
```

El nivel/escala fuente y el nivel comercial V2 son conceptos distintos. El factor del proveedor tampoco es el multiplicador comercial.

### 3. ForPromotional: estado definitivo

- Fuente: costo/list price positivo de la escala seleccionada por cantidad.
- Factor: `1.0300`, definido en el seed de `provider_pricing_rules` y utilizado por la lógica V2.
- Fórmula: `base_ajustada = precio_fuente × 1.03`; después se aplica el multiplicador comercial V2.
- Excepción encontrada: ausencia de regla o de escala conduce a revisión/cotización, no a otro multiplicador comercial.
- Estado: **CONFIRMADO** en código versionado; la fila activa runtime no fue consultada directamente.

### 4. CDO: estado definitivo

- Fuente actual: `variant.net_price` o `cdo.precio_personal_api`.
- Factor actual: `1.0000`.
- Factor aprobado: `1.0300`.
- Fórmulas read-only:

```text
actual:    precio_personal × 1.00
propuesto: precio_personal × 1.03
```

- El incremento de base es `precio_personal × 0.03`; con el mismo nivel V2, el efecto se propaga al precio público con el redondeo normal.
- No se localizaron 2–3 productos CDO con `precio_personal` runtime accesible en el repositorio o en una fuente read-only conectada; el impacto monetario por producto queda **NO COMPROBADO**.
- Estado: **POLÍTICA APROBADA — PENDIENTE DE IMPLEMENTACIÓN Y VALIDACIÓN**. No queda pendiente de decisión de negocio.

### 5. G4: trazabilidad técnica

La cadena versionada es:

```text
SOAP G4 <precios><escala rango precio>
→ parseRangoToMinQty(rango)
→ producto_precio_escalas(min_qty, unit_cost, source_field=g4_precios_escala)
→ regla/provider_pricing_rules
→ calculate_product_price_v2
```

El sincronizador no guarda un número comercial de nivel: conserva rango, `min_qty`, `unit_cost` y `source_field`. No se encontraron en el repositorio payloads históricos, fixtures, importaciones conservadas o registros con la secuencia real de escalas y precios de un producto G4.

### 6. G4: relación entre tier 5 y `min_qty = 250`

- `provider_tier_number = 5` aparece en el seed y es interpretado por `promote-provider-products-to-catalog` como la posición ordinal `primaryScales[4]` después de ordenar por `min_qty`.
- `min_qty = 250` aparece en la función V2 final `calculate_product_price_v2` como selector exacto del costo fijo G4.
- La función V2 final no consulta `provider_tier_number` para seleccionar ese costo.
- No se comprobó que la quinta escala ordinal del SOAP sea siempre la escala de 250 unidades.

Clasificación de la relación: **NO COMPROBADA**. No puede declararse que sean la misma escala ni que sean una inconsistencia histórica definitiva sin filas reales.

### 7. G4: escalas actual y siguiente

No es posible reportar de forma veraz:

```text
posición X / min_qty X / unit_cost X
→ posición Y / min_qty Y / unit_cost Y
```

porque no existe una secuencia real de escalas G4 accesible read-only en el repositorio y no se ejecutó el sincronizador ni se consultaron datos de producción. En consecuencia:

- Escala fuente actual real: **NO COMPROBADA**.
- Escala fuente inmediatamente posterior: **NO COMPROBADA**.
- Precio/costo de ambas: **NO COMPROBADO**.
- Ejemplo numérico G4: **NO COMPROBADO**.

La política conceptual G4 queda aprobada, pero no es implementable todavía porque no puede expresarse como `[X] → [Y]` con evidencia.

### 8. Sentido económico G4

No comprobado. No debe asumirse que una posición posterior reduzca o aumente el costo. El sincronizador ordena por `min_qty`, pero no demuestra que el precio baje, suba o conserve valor al pasar a la siguiente escala.

### 9. Multiplicadores comerciales

Los multiplicadores generales permanecen sin cambios: `1.75`, `1.55`, `1.32`, `1.27`, `1.23`, `1.20`. El override G4 de nivel comercial 1 permanece en `1.85`.

El `1.85` es un multiplicador comercial V2; no es una escala fuente G4, no resuelve tier 5 y no debe usarse para inferir el costo siguiente.

### 10. Control de contaminación Legacy `×1.35`

- La vista Legacy `productos_publicos` contiene una rama histórica `precio_neto_distribuidor × 1.35`.
- `proveedores.markup_pct = 35` pertenece a configuración histórica.
- La función V2 final y sus reglas por proveedor no usan `×1.35` como multiplicador general.
- Existe una ruta Legacy condicional/histórica si no hay release V2, pero no se demostró que esté activa para el runtime actual.

Clasificación: **no se comprobó contaminación de `×1.35` en la fórmula V2; la alcanzabilidad Legacy actual queda NO COMPROBADA**. `×1.35` queda cerrado como política no vigente.

### 11. Política candidata final

```text
ForPromotional: precio fuente aplicable × 1.03 → Pricing V2
CDO:            precio_personal aplicable × 1.03 → Pricing V2
G4:             escala fuente actual [X] → escala fuente siguiente [Y] → Pricing V2
Legacy ×1.35:   NO VIGENTE
```

`[X]` y `[Y]` no se rellenan hasta obtener evidencia real de G4.

### 12. Criterio y alcance de implementación futura

- **CDO:** conceptualmente listo para una ejecución posterior controlada, limitada a alinear el factor de la regla CDO a `1.0300`, validar 2–3 casos con `precio_personal` y comprobar el resultado V2. No se autoriza en esta ejecución.
- **G4:** no listo. Requiere primero identificar la escala actual y la siguiente con rangos y costos reales, demostrar su relación con `provider_tier_number = 5`/`min_qty = 250` y solo después implementar la selección inequívoca `[X] → [Y]`.
- No deben cambiarse en ese alcance los multiplicadores generales, el override `1.85`, Legacy, releases, cachés, sincronizadores ni frontend salvo autorización separada.

CHK-IMP-1 permanece **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**.

**Resultado de esta resolución:** `PRICING PROVEEDORES: CDO DEFINIDO / G4 REQUIERE ACLARACIÓN`.

## CHK-IMP-1 — Implementación controlada de Pricing CDO ×1.03 (supersedida en selección de nivel)

**Fecha:** 2026-09-26
**Estado:** **ABIERTO / BLOQUEADO POR VALIDACIÓN DE PRICING BASE**
**Alcance:** implementación exclusivamente versionada en repositorio de `CDO Precio Personal × 1.03` antes del multiplicador comercial V2. No se ejecutaron migraciones, sync, recompute, publish, promote, rollback, refresh ni cambios en producción. No se modificaron ForPromotional, G4, márgenes, thresholds, Legacy, IVA, impresión, frontend, stock ni proveedores externos.

**Corrección posterior:** la implementación del factor CDO permanece vigente, pero la descripción de selección de nivel de esta sección quedó supersedida por la corrección de CHK-IMP-1 que selecciona por subtotal base de compra. La referencia `105 × 8` y cualquier lectura basada en subtotal de venta deben consultarse en la sección de corrección posterior.

### 1. Preflight y ubicación de la regla

- Rama: `main`.
- HEAD: `10ccb82bb78b8755cd21a3cdbd0696493aebdf25`.
- `origin/main`: mismo commit.
- Divergencia: `0 0`.
- Cambios locales iniciales: únicamente los tres documentos de CHK-IMP-1 (`MASTER-STATE.md`, `10_QA_EVIDENCE.md`, `02_DECISION_LOG.md`). Se conservaron.

La ruta comprobada es:

```text
variant.net_price o cdo.precio_personal_api
→ provider_pricing_rules.cost_factor para cdo_mx
→ calculate_product_price_v2: round(costo × factor, 4)
→ multiplicador comercial V2 y round del precio a 2 decimales
```

La función V2 mantiene el Precio Personal como fuente fija, sin fallback a `list_price`. La nueva migración es `supabase/migrations/20260926130000_update_active_cdo_pricing_factor.sql`; actualiza únicamente la regla `cdo_mx` del único rule set activo de `1.0000` a `1.0300`, con guardas que abortan ante un estado previo inesperado.

### 2. Fórmula antes y después

```text
Antes:    base_ajustada = round(precio_personal × 1.0000, 4)
Después:  base_ajustada = round(precio_personal × 1.0300, 4)
Final:    round(base_ajustada × multiplicador_comercial_V2, 2)
```

No se introdujo una regla nueva de redondeo.

### 3. Fallbacks preservados

La implementación no convierte datos inválidos en precios válidos. Se conservan los estados y advertencias de la función V2: ausencia de Precio Personal → `request_quote / no_cdo_personal_price`; duplicidad → `manual_review / multiple_cdo_personal_prices`; entradas inválidas o sin producto conservan sus estados existentes. No se modificó la lógica de `below_minimum` ni `unavailable`.

### 4. Pruebas deterministas agregadas

- `src/lib/cdo-pricing.test.ts`: 5 pruebas dirigidas.
  - `100 × 1.03 = 103` antes de `1.75`, resultando `$180.25`.
  - incremento de base exactamente 3% con inputs constantes.
  - fuente ausente, cero o inválida conserva `request_quote`.
  - ForPromotional `1.03`, G4 `1.00` y tier fuente declarado `5` permanecen protegidos.
  - el caso inicial `105 × 8` fue corregido por el gate: antes, el candidato de nivel 1 era `$1,470.00`, pero la función devolvía `below_minimum` porque no alcanzaba `$1,500`; después, el costo ajustado `$108.15` producía precio unitario `$189.26` y subtotal `$1,514.08`, por lo que seleccionaba nivel 1. El valor previo `$1,514.10` era incorrecto porque no aplicaba el redondeo del precio unitario antes del subtotal.
- `supabase/qa/cdo_pricing_factor_assertions.sql`: aserciones read-only para el rule set activo, ForPromotional, G4, multiplicadores, override `1.85`, fallbacks CDO y ausencia de `1.35` en la definición V2. No se ejecutó contra producción.

### 5. Validaciones ejecutadas

- Suite `bun run test --run`: **PASS**, código de salida 0.
- Prueba dirigida `bunx vitest run src/lib/cdo-pricing.test.ts`: **PASS, 5/5**.
- Build `bun run build`: **PASS**; solo mostró el warning existente de chunks mayores a 500 kB.
- Lint dirigido sobre la prueba nueva: **PASS**.
- Lint completo: **FAIL por 10 errores preexistentes** en archivos no modificados por esta subfase; no se atribuyen al cambio CDO.
- `git diff --check`: **PASS**.

### 6. Protecciones de alcance

- ForPromotional continúa en `1.0300`.
- G4 conserva `provider_tier_number = 5`, `cost_factor = 1.0000` y la selección V2 de `min_qty = 250`.
- Multiplicadores generales y override G4 `1.85` no cambiaron.
- Legacy `×1.35` no se incorporó a la función V2.
- No se ejecutó ninguna migración ni se modificó producción.

### 7. Estado provisional

CDO queda **IMPLEMENTADO / VALIDADO EN REPOSITORIO**. No queda **ACTIVO EN PRODUCCIÓN** ni **VALIDADO EN PRODUCCIÓN** porque la migración todavía no se ha aplicado y no se ha ejecutado recompute/release/runtime QA.

CHK-IMP-1 permanece **ABIERTO**: G4 sigue pendiente y el frente de impresión no se retoma.

**Resultado de esta subfase:** `CDO ×1.03: IMPLEMENTADO / VALIDADO EN REPOSITORIO — PRODUCCIÓN PENDIENTE`.

## CHK-IMP-1 — Gate final pre-producción CDO: thresholds y selección de nivel V2

**Fecha:** 2026-09-27
**Estado:** **ABIERTO — ACTIVACIÓN PRODUCTIVA BLOQUEADA POR COMPORTAMIENTO NO LINEAL NO RESUELTO**
**Alcance:** análisis read-only del algoritmo V2 y pruebas deterministas de frontera. No se aplicó la migración CDO, no se ejecutó recompute/release/sync, no se modificó producción, G4, Legacy ni datos. No se hizo commit ni push.

### 1. Fórmula exacta de selección de nivel

En `supabase/migrations/20260728023213_66b0fb19-1707-42ea-9c59-5674fa85b41b.sql`, la función solicita los niveles en orden descendente:

```sql
ORDER BY pl.level_number DESC
```

Para cada nivel calcula exactamente:

```sql
up := round(v_adjusted_cost * l.mult, 2);
sub := round(up * p_quantity, 2);
IF sub >= l.threshold_amount_mxn THEN
  v_chosen_level := l.level_number;
  v_chosen_mult := l.mult;
  v_chosen_unit := up;
  v_chosen_subtotal := sub;
  EXIT;
END IF;
```

Por tanto, el threshold se compara contra el **subtotal de venta**, calculado con el precio unitario ya multiplicado y redondeado a dos decimales. No se compara contra costo fuente ni contra costo ajustado directamente.

### 2. Orden real de operaciones

```text
precio_personal
→ round(precio_personal × factor_CDO, 4)
→ round(costo_ajustado × multiplicador_comercial, 2) = precio unitario
→ round(precio unitario × cantidad, 2) = subtotal usado para threshold
→ recorrer niveles 6 → 1 y elegir el primero que cumple
```

El factor `1.03` sí puede cambiar el nivel comercial porque participa antes del subtotal usado en la comparación. El multiplicador también participa antes de decidir el nivel.

### 3. Corrección del ejemplo `105 × 8`

El informe anterior mezcló el subtotal de un candidato con el estado real de la función. La corrección es:

| Caso | Costo ajustado | Cantidad | Nivel evaluado | Multiplicador | Precio unitario | Subtotal usado | Resultado |
|---|---:|---:|---:|---:|---:|---:|---|
| Factor `1.00` | `$105.0000` | 8 | 1 | `1.75` | `$183.75` | `$1,470.00` | No alcanza `$1,500`; `below_minimum` |
| Factor `1.03` | `$108.1500` | 8 | 1 | `1.75` | `$189.26` | `$1,514.08` | Nivel 1 válido |

Conclusión: el ejemplo sí demuestra un cruce de threshold desde `below_minimum` a nivel 1, pero el valor correcto posterior es `$1,514.08`, no `$1,514.10`. No demuestra por sí mismo un salto entre niveles comerciales existentes.

### 4. Casos de frontera

Las pruebas deterministas cubren valores justo debajo, exactamente en y justo arriba de `1500`, `3500` y `6000`, aplicando el redondeo real del motor.

| Threshold objetivo | Cantidad | Fuente debajo / resultado candidato | Fuente exacta / selección | Fuente arriba / selección |
|---:|---:|---|---|---|
| `$1,500` nivel 1 | 10 | `85.7085 → $1,499.90` | `85.7143 → nivel 1, $1,500.00` | `85.72 → nivel 1, $1,500.10` |
| `$3,500` nivel 2 | 10 | `225.80 → candidato nivel 2 $3,499.90`; selecciona nivel 1 | `225.8065 → nivel 2, $3,500.00` | `225.81 → nivel 2, $3,500.10` |
| `$6,000` nivel 3 | 10 | `454.54 → candidato nivel 3 $5,999.90`; selecciona nivel 2 | `454.5455 → nivel 3, $6,000.00` | `454.55 → nivel 3, $6,000.10` |

La tabla distingue correctamente entre el subtotal del nivel candidato y el nivel que la función finalmente selecciona.

### 5. Casos donde `1.03` cambia el nivel

| Fuente / cantidad | Factor `1.00` | Factor `1.03` | Efecto |
|---|---|---|---|
| `105 × 8` | `below_minimum`, sin precio final | Nivel 1, `$189.26`, subtotal `$1,514.08` | Pasa a precio válido |
| `225.80 × 10` | Nivel 1, `1.75`, `$395.15`, subtotal `$3,951.50` | Nivel 2, `1.55`, `$360.49`, subtotal `$3,604.90` | Salto de nivel y caída de precio |
| `454.54 × 10` | Nivel 2, `1.55`, `$704.54`, subtotal `$7,045.40` | Nivel 3, `1.32`, `$617.99`, subtotal `$6,179.90` | Salto de nivel y caída de precio |

### 6. Comportamiento económico no lineal

Existe un comportamiento anómalo no explicado: con `225.80 × 10`, aumentar el costo base 3% cambia la selección de nivel 1 a nivel 2 y reduce el precio unitario de `$395.15` a `$360.49`, una variación aproximada de **−8.7714%**.

Con `454.54 × 10`, el salto de nivel 2 a nivel 3 reduce el precio unitario de `$704.54` a `$617.99`.

Esto contradice la expectativa simple de que aumentar el costo base 3% produzca un precio final mayor o aproximadamente 3% mayor. No se corrigió en este gate; requiere decisión/corrección antes de producción.

### 7. Markup y margen bruto equivalente

| Multiplicador | Markup sobre costo | Margen bruto equivalente sobre venta |
|---:|---:|---:|
| `1.75` | 75.00% | 42.8571% |
| `1.55` | 55.00% | 35.4839% |
| `1.32` | 32.00% | 24.2424% |
| `1.27` | 27.00% | 21.2598% |
| `1.23` | 23.00% | 18.6992% |
| `1.20` | 20.00% | 16.6667% |

El salto de multiplicador explica la caída no lineal observada; los multiplicadores no fueron modificados.

### 8. Rounding

- Costo ajustado: redondeo a 4 decimales.
- Precio unitario: redondeo a 2 decimales.
- Subtotal usado para threshold: redondeo a 2 decimales.
- El threshold usa el subtotal ya redondeado, no el valor continuo sin redondear.
- Las pruebas de frontera cubren sensibilidad al redondeo.

### 9. Resultado de validaciones

- Prueba dirigida `src/lib/cdo-pricing.test.ts`: **9/9 PASS**.
- Suite `bun run test --run`: la ejecución previa terminó con código 0; el gate dirigido final pasó 9/9.
- `bun run build`: **PASS**, con warning preexistente de chunks mayores a 500 kB.
- Lint dirigido del archivo de prueba: **PASS**.
- Lint global: mantiene los 10 errores históricos fuera de alcance.
- `git diff --check`: PASS.

### 10. Protecciones de alcance

- ForPromotional permanece en `1.0300`.
- G4 permanece `NO IMPLEMENTAR / MAPEO DE ESCALA PENDIENTE`; no se tocaron `provider_tier_number`, `min_qty`, `cost_factor` ni override `1.85`.
- `×1.35 / 35%` permanece histórico, Legacy y no vigente.
- D-010 permanece vigente.
- No se aplicó migración ni se modificó producción.

### 11. Gate de activación

CDO **REQUIERE CORRECCIÓN ANTES DE PRODUCCIÓN**. La fórmula y el cambio `1.0000 → 1.0300` están implementados y probados en repositorio, pero la selección de nivel genera una disminución de precio final al cruzar thresholds. Antes de activar se debe resolver y aprobar explícitamente esa discontinuidad, sin modificarla dentro de este gate.

CHK-IMP-1 permanece **ABIERTO** y no se continúa impresión.

**Resultado del gate:** `CDO ×1.03: REQUIERE CORRECCIÓN ANTES DE PRODUCCIÓN`.

## CHK-IMP-1 — Corrección de selección de escala según política original

**Fecha:** 2026-09-27
**Estado:** **ALINEADO CON POLÍTICA ORIGINAL — RIESGO COMERCIAL DE MONOTONICIDAD PENDIENTE**
**Alcance:** nueva migración versionada de `calculate_product_price_v2` para seleccionar el nivel por monto de compra antes de markup. No se aplicó migración, no se ejecutó recompute/publish/sync, no se modificó producción ni G4, y no se hizo commit ni push.

### 1. Discrepancia corregida

La función anterior comparaba:

```sql
sub := round(up * p_quantity, 2);
IF sub >= l.threshold_amount_mxn THEN ...
```

Como `up` ya incluía el multiplicador comercial, la selección era circular respecto de la política original. La nueva migración es `supabase/migrations/20260927110000_fix_v2_tier_selection_by_purchase_base.sql`.

### 2. Fórmula corregida

```text
adjusted_cost = round(source_cost × provider_factor, 4)
purchase_base_subtotal = round(adjusted_cost × quantity, 4)
tier = mayor nivel cuyo threshold <= purchase_base_subtotal
unit_sale_price = round(adjusted_cost × tier_multiplier, 2)
sale_subtotal = round(unit_sale_price × quantity, 2)
```

La ruta de sugerencias también calcula la cantidad comercial como `ceil(threshold / adjusted_cost)`, respetando además MOQ y límites de la escala fuente. Esto no cambia el MOQ del proveedor.

### 3. Caso `105 × 8` corregido definitivamente

| Factor | Costo ajustado | Base de compra | Tier | Multiplicador | Precio unitario | Subtotal de venta | Estado |
|---:|---:|---:|---:|---:|---:|---:|---|
| `1.00` | `$105.0000` | `$840.0000` | Ninguno | — | — | — | `below_minimum` |
| `1.03` | `$108.1500` | `$865.2000` | Ninguno | — | — | — | `below_minimum` |

El caso no cruza `$1,500`; el threshold se evalúa sobre `$840`/`$865.20`, no sobre un subtotal de venta hipotético.

### 4. Fronteras por monto de compra

| Threshold | Base justo debajo | Base exacta | Base justo arriba | Tier esperado | Multiplicador |
|---:|---:|---:|---:|---:|---:|
| `$1,500` | `$1,499.90` | `$1,500.00` | `$1,500.10` | 1 | `1.75` |
| `$3,500` | `$3,499.90` | `$3,500.00` | `$3,500.10` | 2 | `1.55` |
| `$6,000` | `$5,999.90` | `$6,000.00` | `$6,000.10` | 3 | `1.32` |
| `$15,000` | `$14,999.90` | `$15,000.00` | `$15,000.10` | 4 | `1.27` |
| `$25,000` | `$24,999.90` | `$25,000.00` | `$25,000.10` | 5 | `1.23` |
| `$55,000` | `$54,999.90` | `$55,000.00` | `$55,000.10` | 6 | `1.20` |

### 5. CDO `×1.03` con selección corregida

Con fuente `339.90` y cantidad `10`:

| Factor | Costo ajustado | Base de compra | Tier | Multiplicador | Precio unitario | Subtotal venta |
|---:|---:|---:|---:|---:|---:|---:|
| `1.00` | `$339.9000` | `$3,399.0000` | 1 | `1.75` | `$594.83` | `$5,948.30` |
| `1.03` | `$350.0970` | `$3,500.9700` | 2 | `1.55` | `$542.65` | `$5,426.50` |

El cambio de nivel se produce únicamente porque cambia el subtotal base de compra. Los multiplicadores siguen sin modificarse.

### 6. ForPromotional y G4

- ForPromotional conserva `precio fuente × 1.03` y usa la misma selección comercial por subtotal base.
- G4 no cambia: se conservan `provider_tier_number`, `min_qty = 250`, `cost_factor`, escalas fuente y override comercial `1.85`.
- La corrección no resuelve ni modifica el mapeo de escalas G4.

### 7. Cantidad mínima comercial

La cantidad mínima comercial para alcanzar un nivel se calcula como:

```text
ceil(threshold / adjusted_cost)
```

Después se combina con el MOQ y los límites de la escala fuente. La cantidad mínima comercial no sustituye ni modifica el MOQ del proveedor.

### 8. Monotonicidad

La corrección elimina la circularidad, pero los multiplicadores actuales todavía producen saltos descendentes al cruzar thresholds:

| Threshold cruzado | Base antes / después | Tier antes / después | Venta antes / después | Diferencia | Clasificación |
|---:|---:|---:|---:|---:|---|
| `$3,500` | `$3,400 / $3,500` | `1 / 2` | `$5,950 / $5,425` | `-$525` | SALTO DESCENDENTE |
| `$6,000` | `$5,900 / $6,000` | `2 / 3` | `$9,145 / $7,920` | `-$1,225` | SALTO DESCENDENTE |
| `$15,000` | `$14,900 / $15,000` | `3 / 4` | `$19,668 / $19,050` | `-$618` | SALTO DESCENDENTE |
| `$25,000` | `$24,900 / $25,000` | `4 / 5` | `$31,623 / $30,750` | `-$873` | SALTO DESCENDENTE |
| `$55,000` | `$54,900 / $55,000` | `5 / 6` | `$67,527 / $66,000` | `-$1,527` | SALTO DESCENDENTE |

Estos saltos son consecuencia de la estructura comercial vigente, no de la selección circular corregida. No se modificaron multiplicadores; quedan como **RIESGO COMERCIAL PENDIENTE DE DECISIÓN**.

### 9. Tests y validación

- `src/lib/cdo-pricing.test.ts`: 13 pruebas dirigidas, incluyendo las seis fronteras, CDO `×1.03`, ForPromotional, G4, fallback, rounding y monotonicidad.
- La prueba dirigida debe verificar también que una subida de cantidad puede reducir la venta total bajo los multiplicadores actuales; esto se reporta, no se corrige en este checkpoint.
- `supabase/migrations/20260927110000_fix_v2_tier_selection_by_purchase_base.sql`: reemplazo versionado de la función; no se editó la migración histórica.

**Resultado esperado del checkpoint:** algoritmo **VALIDADO EN REPOSITORIO** y alineado con la política original; monotonicidad queda pendiente de decisión comercial.

## CHK-IMP-1 — Simulación de pricing progresivo / monotónico

**Fecha:** 2026-09-27
**Estado:** **ANÁLISIS COMPLETADO — MODELO PROGRESIVO VIABLE / LISTO PARA DECISIÓN**
**Alcance:** simulación read-only de los multiplicadores vigentes contra un modelo marginal por tramos. No se modificó `calculate_product_price_v2`, no se creó migración funcional, no se aplicó CDO, no se ejecutó recompute/release/publish/sync, no se tocó G4 ni producción y no se hizo commit ni push.

### 1. Preflight Git

El estado de entrada fue:

| Control | Resultado |
|---|---|
| Rama | `main` |
| HEAD | `10ccb82bb78b8755cd21a3cdbd0696493aebdf25` |
| `origin/main` | `10ccb82bb78b8755cd21a3cdbd0696493aebdf25` |
| Divergencia | `0` commits adelante / `0` atrás |
| Working tree | Cambios legítimos abiertos de CHK-IMP-1; no se limpiaron |
| Acciones prohibidas | No reset, no stash, no commit, no push, no migración aplicada |

Los cambios locales observados antes de esta documentación fueron `docs/02_DECISION_LOG.md`, `docs/10_QA_EVIDENCE.md`, `docs/MASTER-STATE.md`, `src/lib/cdo-pricing.test.ts`, las migraciones de CDO y selección por costo base y `supabase/qa/cdo_pricing_factor_assertions.sql`. Se conservaron.

### 2. Políticas preservadas

- Thresholds: `$1,500`, `$3,500`, `$6,000`, `$15,000`, `$25,000` y `$55,000`.
- Multiplicadores generales: `1.75`, `1.55`, `1.32`, `1.27`, `1.23` y `1.20`.
- Legacy `×1.35 / 35%`: histórica, no vigente y fuera de la simulación.
- ForPromotional: `precio fuente × 1.03`.
- CDO: `precio_personal × 1.03` antes de Pricing V2; la migración existente no se aplicó.
- G4: no se implementa ni se cambia su mapeo de escala. La simulación numérica usa los multiplicadores generales; la prueba matemática también aplica a un vector proveedor-específico positivo como el override G4 pendiente.
- D-010 no se modifica.

### 3. Modelo actual y causa de la discontinuidad

La corrección versionada de selección comercial define:

```text
costo_ajustado = round(costo_fuente × factor_proveedor, 4)
S = round(costo_ajustado × cantidad, 4)
tier = mayor nivel cuyo threshold <= S
precio_unitario = round(costo_ajustado × multiplicador_tier, 2)
subtotal_venta = round(precio_unitario × cantidad, 2)
```

Para aislar el problema de tiers se normalizó el subtotal base `S` y se calculó:

```text
venta_actual(S) = round(S × multiplicador_del_tier(S), 2)
```

Cuando se cruza un threshold `T_i`, el valor por la izquierda tiende a `T_i × m_(i-1)` y el valor por la derecha es `T_i × m_i`. Como `m_i < m_(i-1)`, el salto es:

```text
Δ_i = T_i × (m_i − m_(i-1)) < 0
```

Con la fórmula normalizada, en `$3,500` el salto es de `$6,125.00` a `$5,425.00`, es decir `-$700.00` y `-11.43%` respecto al valor anterior. En `$6,000` es de `$9,300.00` a `$7,920.00`, es decir `-$1,380.00` y `-14.84%`. Los porcentajes aproximados `-8.82%` y `-13.40%` no se reproducen usando únicamente `1.75 → 1.55` y `1.55 → 1.32`; deben corresponder a otra base, cantidad o redondeo del ejemplo original.

### 4. Modelo progresivo propuesto

Se definen límites inferiores `L = [0, 1500, 3500, 6000, 15000, 25000]`, límites superiores `U = [1500, 3500, 6000, 15000, 25000, ∞]` y multiplicadores `m = [1.75, 1.55, 1.32, 1.27, 1.23, 1.20]`.

Para un subtotal base válido `S >= 1500`:

```text
P_raw(S) = Σ_i m_i × max(0, min(S, U_i) − L_i)
P_prog(S) = round(P_raw(S), 2)
```

Ejemplo en `$6,000`:

```text
P_prog(6000) = 1500×1.75 + 2000×1.55 + 2500×1.32
             = 2625 + 3100 + 3300
             = $9,025.00
```

La acumulación arranca virtualmente en `$0` para la fórmula, pero no habilita cotizaciones debajo del mínimo. Si `S < $1,500`, el estado conserva `below_minimum` y no se devuelve precio. Para el primer pedido válido, `S = $1,500`, se cobra el primer tramo completo con `1.75`; esto coincide exactamente con el modelo actual en el mínimo y evita asumir una base artificial distinta.

La monotonicidad es estructural: cada incremento de `S` agrega un tramo con multiplicador positivo. Por tanto, si `S_B > S_A`, entonces `P_raw(S_B) >= P_raw(S_A)`; el redondeo final a centavos conserva el orden no decreciente.

### 5. Tabla completa de fronteras

La columna `Δ` es `venta progresiva − venta actual`. `Mono actual/prog` marca la comparación con el caso inmediatamente anterior de la misma tabla; el `No` del actual aparece al cruzar un threshold. En `1,499.90` no hay precio por `below_minimum`.

| Subtotal base S | Tier/estado | Modelo actual | Venta actual | Modelo progresivo | Venta progresiva | Markup efectivo prog. | Margen bruto efectivo prog. | Δ | Mono actual/prog |
|---:|---|---|---:|---|---:|---:|---:|---:|---|
| `$1,499.90` | `below_minimum` | — | — | — | — | — | — | — | N/A / N/A |
| `$1,500.00` | 1 · `1.75` | retroactivo | `$2,625.00` | 0–1,500 marginal | `$2,625.00` | 75.00% | 42.86% | `$0.00` | Sí / Sí |
| `$1,500.10` | 1 · `1.75` | retroactivo | `$2,625.18` | 0–1,500 + excedente | `$2,625.16` | 75.00% | 42.86% | `-$0.02` | Sí / Sí |
| `$3,499.90` | 1 · `1.75` | retroactivo | `$6,124.83` | tramos 1–2 | `$5,724.85` | 63.57% | 38.86% | `-$399.98` | Sí / Sí |
| `$3,500.00` | 2 · `1.55` | retroactivo | `$5,425.00` | tramos 1–2 | `$5,725.00` | 63.57% | `$300.00` | No / Sí |
| `$3,500.10` | 2 · `1.55` | retroactivo | `$5,425.16` | tramos 1–2 + excedente | `$5,725.13` | 63.57% | `$299.97` | Sí / Sí |
| `$5,999.90` | 2 · `1.55` | retroactivo | `$9,299.84` | tramos 1–2 | `$9,024.87` | 50.42% | 33.52% | `-$274.97` | Sí / Sí |
| `$6,000.00` | 3 · `1.32` | retroactivo | `$7,920.00` | tramos 1–3 | `$9,025.00` | 50.42% | 33.52% | `$1,105.00` | No / Sí |
| `$6,000.10` | 3 · `1.32` | retroactivo | `$7,920.13` | tramos 1–3 + excedente | `$9,025.13` | 50.42% | 33.52% | `$1,105.00` | Sí / Sí |
| `$14,999.90` | 3 · `1.32` | retroactivo | `$19,799.87` | tramos 1–3 | `$20,454.87` | 36.37% | 26.67% | `$655.00` | Sí / Sí |
| `$15,000.00` | 4 · `1.27` | retroactivo | `$19,050.00` | tramos 1–4 | `$20,455.00` | 36.37% | 26.67% | `$1,405.00` | No / Sí |
| `$15,000.10` | 4 · `1.27` | retroactivo | `$19,050.13` | tramos 1–4 + excedente | `$20,455.12` | 36.37% | 26.67% | `$1,404.99` | Sí / Sí |
| `$24,999.90` | 4 · `1.27` | retroactivo | `$31,749.87` | tramos 1–4 | `$32,754.88` | 31.02% | 23.68% | `$1,005.01` | Sí / Sí |
| `$25,000.00` | 5 · `1.23` | retroactivo | `$30,750.00` | tramos 1–5 | `$32,755.00` | 31.02% | 23.68% | `$2,005.00` | No / Sí |
| `$25,000.10` | 5 · `1.23` | retroactivo | `$30,750.12` | tramos 1–5 + excedente | `$32,755.12` | 31.02% | 23.68% | `$2,005.00` | Sí / Sí |
| `$54,999.90` | 5 · `1.23` | retroactivo | `$67,649.88` | tramos 1–5 | `$68,754.88` | 25.01% | 20.01% | `$1,105.00` | Sí / Sí |
| `$55,000.00` | 6 · `1.20` | retroactivo | `$66,000.00` | tramos 1–6 | `$68,755.00` | 25.01% | 20.01% | `$2,755.00` | No / Sí |
| `$55,000.10` | 6 · `1.20` | retroactivo | `$66,000.12` | tramos 1–6 + excedente | `$68,755.12` | 25.01% | 20.01% | `$2,755.00` | Sí / Sí |

Conclusión de fronteras: el modelo actual falla en los cinco cruces de tier; el progresivo no presenta ningún salto descendente.

### 6. Montos representativos

| Subtotal base S | Tier | Venta actual | Venta progresiva | Markup efectivo prog. | Margen bruto efectivo prog. | Δ prog.−actual | Monotonicidad global actual/prog. |
|---:|---:|---:|---:|---:|---:|---:|---|
| `$2,000` | 1 | `$3,500.00` | `$3,400.00` | 70.00% | 41.18% | `-$100.00` | No / Sí |
| `$5,000` | 2 | `$7,750.00` | `$7,705.00` | 54.10% | 35.11% | `-$45.00` | No / Sí |
| `$10,000` | 3 | `$13,200.00` | `$14,105.00` | 41.05% | 29.10% | `$905.00` | No / Sí |
| `$20,000` | 4 | `$25,400.00` | `$26,605.00` | 33.02% | 24.83% | `$1,205.00` | No / Sí |
| `$40,000` | 5 | `$49,200.00` | `$50,755.00` | 26.89% | 21.19% | `$1,555.00` | No / Sí |
| `$75,000` | 6 | `$90,000.00` | `$92,755.00` | 23.67% | 19.14% | `$2,755.00` | No / Sí |
| `$100,000` | 6 | `$120,000.00` | `$122,755.00` | 22.75% | 18.54% | `$2,755.00` | No / Sí |

`No / Sí` en esta tabla expresa la propiedad global del modelo: el actual no es monotónico por sus cinco discontinuidades, aunque crezca dentro de cada tramo; el progresivo sí lo es.

### 7. Markup y margen efectivos del modelo progresivo

```text
markup_efectivo = P_prog(S) / S − 1
margen_bruto_efectivo = (P_prog(S) − S) / P_prog(S)
```

| S | Venta progresiva | Multiplicador promedio | Markup efectivo | Margen bruto efectivo |
---:|---:|---:|---:|---:|
| `$1,500` | `$2,625.00` | `1.7500` | 75.00% | 42.86% |
| `$3,500` | `$5,725.00` | `1.6357` | 63.57% | 38.86% |
| `$6,000` | `$9,025.00` | `1.5042` | 50.42% | 33.52% |
| `$15,000` | `$20,455.00` | `1.3637` | 36.37% | 26.67% |
| `$25,000` | `$32,755.00` | `1.3102` | 31.02% | 23.68% |
| `$55,000` | `$68,755.00` | `1.2501` | 25.01% | 20.01% |
| `$75,000` | `$92,755.00` | `1.2377` | 23.67% | 19.14% |
| `$100,000` | `$122,755.00` | `1.2276` | 22.75% | 18.54% |

El markup promedio disminuye de manera gradual porque cada peso adicional usa la tarifa marginal del tramo nuevo, mientras los tramos anteriores conservan su multiplicador. Todos los márgenes simulados siguen siendo positivos.

### 8. CDO `×1.03`

La simulación conserva `S = precio_personal × 1.03 × cantidad`. El factor positivo puede adelantar un cruce de threshold, pero no puede producir un descenso dentro de `P_prog`, porque `P_prog` es no decreciente en `S`.

| Precio Personal | Cantidad | Costo ajustado `×1.03` | S base | Tier | Venta actual retroactiva | Venta progresiva |
|---:|---:|---:|---:|---:|---:|---:|
| `$100.00` | 15 | `$103.00` | `$1,545.00` | 1 | `$2,703.75` | `$2,694.75` |
| `$339.90` | 10 | `$350.0970` | `$3,500.97` | 2 | `$5,426.50` | `$5,726.28` |
| `$582.52` | 10 | `$599.9956` | `$5,999.96` | 2 | `$9,299.93` | `$9,024.94` |
| `$582.53` | 10 | `$600.0059` | `$6,000.06` | 3 | `$7,920.08` | `$9,025.07` |

El par `$582.52 → $582.53` muestra el riesgo del modelo retroactivo al cruzar `$6,000`: la venta baja aproximadamente `$1,379.85`; con el progresivo sube `$0.13`. Esto confirma que el factor CDO no es la causa del salto; la causa es aplicar retroactivamente el multiplicador menor.

### 9. ForPromotional

ForPromotional conserva conceptualmente `precio_fuente × 1.03` antes del mismo algoritmo. Por tanto, los casos anteriores son también una comprobación algebraica válida sustituyendo `precio_personal` por `precio_fuente`: el factor puede mover `S` de `5,999.96` a `6,000.06`, pero la venta progresiva pasa de `$9,024.94` a `$9,025.07`, no disminuye. No se modifica la regla del proveedor.

### 10. G4

No se incluye cambio de escala G4, no se fija un nuevo `provider_tier_number`, no se altera `min_qty = 250`, no se modifica `cost_factor` ni se toca el override comercial pendiente. El algoritmo progresivo es independiente de cómo G4 obtenga su costo fuente: una vez disponible un `S` base, se aplica la misma suma por tramos. Si en el futuro G4 usa un vector proveedor-específico positivo, incluido su `1.85` de nivel 1 versionado, la prueba de monotonicidad se mantiene; el mapeo de escala debe resolverse por separado.

### 11. Rounding y precio unitario

La simulación de tablas aplica el redondeo al total progresivo. La arquitectura actual devuelve principalmente un precio unitario y la UI calcula `unit_price × quantity`; por eso debe definirse una convención autoritativa antes de implementar.

Con la regla solicitada:

```text
unit_sale_price = round(total_sale / quantity, 2)
```

se obtiene lo siguiente:

| Costo base unitario de referencia | Cantidad | S | Total progresivo | Unitario redondeado | Unitario × cantidad | Diferencia |
|---:|---:|---:|---:|---:|---:|---:|
| `$100.00` | 15 | `$1,500.00` | `$2,625.00` | `$175.00` | `$2,625.00` | `$0.00` |
| `$339.90` | 10 | `$3,399.00` | `$5,568.45` | `$556.85` | `$5,568.50` | `+$0.05` |
| `$100.00` | 35 | `$3,500.00` | `$5,725.00` | `$163.57` | `$5,724.95` | `-$0.05` |
| `$100.00` | 60 | `$6,000.00` | `$9,025.00` | `$150.42` | `$9,025.20` | `+$0.20` |
| `$100.00` | 75 | `$7,500.00` | `$10,930.00` | `$145.73` | `$10,929.75` | `-$0.25` |
| `$100.00` | 100 | `$10,000.00` | `$14,105.00` | `$141.05` | `$14,105.00` | `$0.00` |

La diferencia absoluta por línea puede llegar aproximadamente a `0.005 × cantidad` antes del redondeo final. Recomendación: mostrar el unitario redondeado, conservar el total de línea autoritativo en el contrato servidor y, en una cotización formal, usar ese total como fuente del subtotal; si el documento exige que `unitario × cantidad` coincida centavo por centavo, aplicar un ajuste explícito de redondeo y registrarlo, no ocultarlo.

La prueba también demuestra por qué `unitario × cantidad` no puede ser la autoridad de monotonicidad para cantidades grandes. Con costo base unitario `$100`:

| Cantidad anterior | Cantidad nueva | Total progresivo anterior | Total progresivo nuevo | Unitario anterior | Unitario nuevo | Total visible anterior `unitario×cantidad` | Total visible nuevo `unitario×cantidad` |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 12,244 | 12,245 | `$1,472,035.00` | `$1,472,155.00` | `$120.23` | `$120.22` | `$1,472,096.12` | `$1,472,093.90` |

El total matemático sube `$120.00`, pero el total reconstruido desde el unitario baja `$2.22` por el redondeo del precio unitario. Por tanto, para cumplir monotonicidad de forma demostrable, el total progresivo redondeado debe viajar y persistir como importe autoritativo; el unitario redondeado debe tratarse como presentación o reconciliarse con un ajuste explícito.

### 12. Compatibilidad con catálogo, quote RPC, cotización formal y PDF

- **Catálogo:** compatible con el flujo actual de consulta por cantidad y estados `priced`/`below_minimum`. El precio visible debe recalcularse al cambiar cantidad; no se deben publicar las seis capas ni los márgenes. Para evitar diferencias centavarias, el contrato público debería conservar también el total de línea progresivo o declarar formalmente que el total es `unitario × cantidad` después del redondeo unitario.
- **Quote RPC:** compatible con una sustitución focalizada dentro de la autoridad `calculate_product_price_v2`, manteniendo `status`, `minimum_quantity`, proveedor, costo ajustado, tier y multiplicador aplicados. Debe añadir una versión/identificador del modelo y, preferentemente, un desglose interno de tramos para trazabilidad.
- **Cotización formal:** el cálculo actual de partidas usa `cantidad × precio_unitario` y redondea el subtotal. El editor también puede tomar escalas comerciales derivadas mediante `pickPriceForQty`; esas escalas tendrían que generarse desde el mismo motor progresivo o el editor podría divergir del catálogo público. No se requiere rediseño de la cotización, pero sí alinear su fuente de precio y decidir el tratamiento del total autoritativo.
- **PDF:** puede conservar su estructura actual si recibe el unitario y subtotal finales ya calculados. Para auditoría conviene persistir en el snapshot de la partida el algoritmo, la versión de reglas, `S`, tier, multiplicador, factor proveedor y total progresivo, sin exponer costos o márgenes al cliente.

La integración es un ajuste focalizado de Pricing V2, contrato público/escala derivada y snapshot; no requiere rediseño arquitectónico mayor. No debe activarse hasta cerrar la convención de redondeo y la sincronización entre catálogo y cotización formal.

### 13. Riesgos y límites de la conclusión

- La prueba demuestra monotonicidad respecto de `S` (`subtotal base`) y no sustituye una prueba con todas las escalas reales de cada proveedor.
- Si el costo unitario fuente cambia con la cantidad y esa caída hace que `S(q)` disminuya al aumentar `q`, ningún algoritmo que reciba solamente `S` puede garantizar monotonicidad respecto de cantidad sin una regla adicional de costo base/envolvente. Debe validarse la secuencia real por proveedor.
- El modo `below_minimum` permanece sin precio debajo de `$1,500`; no debe interpretarse como una venta progresiva parcial.
- Si se redondea el unitario y después se lo multiplica, puede aparecer un descenso artificial del total en cantidades altas, como el caso `12,244 → 12,245`; el contrato debe declarar el total progresivo como importe autoritativo.
- La ruta Legacy sin release V2 conserva su comportamiento histórico y no queda corregida por esta simulación.
- No hay evidencia de producción, release ni caché activados en esta ejecución; todo resultado es de repositorio/simulación.

### 14. Alternativa más simple

Existe una envolvente monotónica del modelo actual, `P_env(S) = max_{0 <= x <= S} venta_actual(x)`, que evita descensos conservando el precio máximo histórico. Sin embargo, produce mesetas mientras el nuevo multiplicador alcanza el precio anterior, es más difícil de explicar al asesor y no representa literalmente “cada tramo con su multiplicador”. Se considera inferior al modelo marginal para claridad comercial.

No se recomienda cambiar multiplicadores, usar `×1.35` ni volver a comparar thresholds contra el subtotal de venta circular.

### 15. Recomendación técnica

Adoptar para decisión de negocio el modelo marginal por tramos:

1. mantener thresholds y multiplicadores sin cambios;
2. conservar `below_minimum` debajo de `$1,500`;
3. calcular `P_prog(S)` sobre el subtotal base antes del markup retroactivo;
4. hacer autoritativo el total progresivo redondeado y exponer el unitario redondeado como representación, o implementar un ajuste de redondeo explícito que preserve el total;
5. regenerar las escalas derivadas y snapshots desde el mismo motor;
6. validar `S(q)` real por proveedor antes de activar;
7. solo después de aprobación, crear una migración funcional y ejecutar recompute/release controlados.

La recomendación es un ajuste focalizado, no un rediseño mayor. En esta ejecución no se implementó.

### 16. Resultado y próxima decisión

- **A.** Para subtotal base normalizado, el modelo progresivo elimina todos los saltos descendentes.
- **B.** El markup promedio y el margen efectivo permanecen positivos y disminuyen gradualmente; a `$100,000`, el markup es `22.75%` y el margen bruto `18.54%`.
- **C.** Conserva razonablemente la estructura comercial: mismos thresholds, mismos multiplicadores, descuentos marginales graduales y primer mínimo idéntico.
- **D.** Puede integrarse con la arquitectura actual mediante ajuste focalizado del contrato para transportar el total autoritativo, sin rediseño mayor.
- **E.** Catálogo y cotización deben mostrar el unitario y total coherentes y guardar trazabilidad del modelo; el PDF no exige rediseño.

**Archivos documentales modificados en esta ejecución:** `docs/10_QA_EVIDENCE.md` y `docs/MASTER-STATE.md`. `docs/02_DECISION_LOG.md` no se modifica y D-010 permanece vigente.

**Validación final requerida:** `git diff --check`.

**Próxima decisión del Chat Principal:** aprobar o rechazar la formulación marginal y aprobar que el total progresivo redondeado sea el importe autoritativo; el unitario redondeado debe ser únicamente una representación reconciliada. No se debe aplicar migración, CDO, G4, recompute, release, publish, sync ni producción antes de esa aprobación.

**Veredicto:** `PRICING MONOTÓNICO: MODELO PROGRESIVO VIABLE — LISTO PARA DECISIÓN`

## CHK-IMP-1-SHADOW-1 — Pricing de Conversión México en shadow mode (2026-09-27)

**Estado:** **CERRADO / PASS**.

**Padre:** `CHK-IMP-1`, **PAUSADO POR PRIORIDAD OPERATIVA**; no cerrado ni abandonado.

Esta sección es el estado vigente de CHK-IMP-1 para esta subfase. Las secciones anteriores de CHK-IMP-1 son snapshots históricos de diagnóstico, validación y decisiones previas; sus estados de bloqueo describen el corte de cada ejecución y no sustituyen esta entrada vigente.

### Alcance y aislamiento

Se implementó `src/lib/pricing-conversion-shadow.ts` como simulador puro. No se aplicaron migraciones, no se ejecutó recompute, publish, release, sync ni Edge Function; no se modificaron catálogo, cotizaciones, caché, producción, G4 o Legacy. `calculate_product_price_v2` permanece como autoridad pública.

### Evidencia de arquitectura

- `purchase_base = adjusted_cost × quantity`, antes de markup, impresión, IVA y envío.
- Regímenes configurables: `SMALL_ORDER`, `MARKET_AWARE` y `ENTERPRISE`; mínimos `$1,500`, `$5,000` y `$55,000` según la simulación.
- Transición continua de peso de mercado: `$4,500 → $7,500`; no hay salto de precio impuesto en `$5,000`.
- Precio interno: `adjusted_cost / (1 - target_margin)`; el margen final de Small Order queda configurable y su valor incluido es `SIMULATION DEFAULT`.
- Benchmark normalizado únicamente para observaciones comparables: mismo SKU, MXN, IVA homogéneo, cantidad comparable, sin impresión/envío, fecha vigente y stock razonable.
- Estadísticos: mínimo, P25, mediana, P75, máximo y conteo. El estado distingue `SUFFICIENT_DATA`, `INSUFFICIENT_DATA` y `NO_DATA`.
- Precio híbrido: `(1 - market_weight) × internal + market_weight × market_target`; con benchmark insuficiente se usa el precio interno y `market_adjustment_applied: false`.
- Piso: `max(profitability_floor, hybrid)`; si el piso supera `competitive_high`, el resultado es `NOT_COMPETITIVE`.
- Cada resultado incluye `shadow_only: true`, estados comerciales, utilidad/margen, `discount_headroom`, elegibilidad enterprise y comparación opcional contra Current V2.
- `ConversionPricingTelemetry` reserva la forma futura para precio cotizado, posición de benchmark, descuento solicitado/final, ganado/perdido, motivo de pérdida, utilidad y lead source; no se persiste ni se aplica ML.

### Benchmark y datos

El modelo admite observaciones curadas de Compudat, Smart Promocionales, Artículos Promocionales de México y TodoPromocional, pero esta ejecución no inventó ni cargó precios reales y no implementó scraping. La canasta mexicana de 30–50 SKUs queda pendiente de definición y validación.

### Validación de repositorio

`src/lib/pricing-conversion-shadow.test.ts` contiene 11 pruebas dirigidas: normalización, estadísticas, fallback sin benchmark, piso y clasificación, transición continua, fronteras `$1,500`, `$4,500`, `$5,000`, `$7,500`, `$15,000` y `$55,000`, monotonicidad densa, CDO/ForPromotional sin doble `×1.03`, exclusión de Legacy `×1.35` y comparación aislada contra Current V2. La corrida dirigida terminó `11/11 PASS`.

La suite completa terminó `11 archivos / 91 pruebas PASS`; el build terminó `PASS` con el warning no bloqueante preexistente de bundle grande; el lint dirigido de ambos archivos nuevos terminó `PASS`; `git diff --check` terminó `PASS`.

Este resultado es evidencia de repositorio y simulación, no evidencia de activación productiva. Quedan NO COMPROBADOS los valores reales de mercado, la selección final de percentiles, el margen mínimo comercial permanente, el redondeo contractual de catálogo/cotización, la canasta completa, los datos runtime de proveedores y cualquier efecto en producción.

## CHK-OPS-1 — Baseline operativa y puesta en marcha (2026-09-27)

**Estado:** **CERRADO / PARCIAL**.

**Decisión:** **OPERACIÓN PRIMERO**. No se encontraron P0 reproducibles; la plataforma puede comenzar a utilizarse con el flujo estable y los guardrails documentados. Los riesgos P1/P2 y validaciones no comprobadas no se convierten en desarrollo grande en esta ejecución.

### Git y producción

- Fase A de preservación completada antes de abrir este checkpoint.
- Commit de preservación: `5b831f40a6ef347d46dc7691e02876e69edd3a18`.
- `main = origin/main`, divergencia `0 0`, working tree limpio al abrir Fase B.
- Producción `https://articulospromocionales.vip`: lectura HTTP read-only de `/`, `/login`, `/crm` y `/catalogo`, todos `200 text/html`.
- El shell público respondió y cargó assets publicados. HTTP 200 no demuestra interacción autenticada, frescura de datos ni que el asset corresponda exactamente al HEAD local; esos puntos quedan **NO COMPROBADOS**.
- No se enviaron formularios, no se inició sesión, no se modificaron datos y no se usaron sincronizadores.

### Baseline del critical path

| Tramo | Estado | Prioridad | Evidencia / limitación |
|---|---|---:|---|
| Home → catálogo | PASS / PARCIAL | P0 | Shell público accesible; evidencia histórica de catálogo en producción |
| Búsqueda, ficha, variantes e imágenes | PARCIAL | P0/P1 | Implementado y probado históricamente; frescura y algunas imágenes/fichas actuales no certificadas |
| Selección → solicitud | PASS | P0 | RPC, validaciones, idempotencia y solicitud QA documentadas |
| Solicitud → prospecto/oportunidad | PASS | P0/P1 | Caso QA completado; trazabilidad post-envío permanece parcial |
| Oportunidad → cotización formal | PASS | P0/P1 | `COT-2026-00008` creada y emitida |
| Cotización → PDF producto-only | PASS | P0/P1 | PDF QA generado, recibido y abierto |
| Impresión/personalización | PARCIAL | P1 | Motor y campos existen; cálculo/persistencia real de impresión no comprobados |
| PDF → Gmail/WhatsApp | PASS controlado | P1 | E2E QA real con autorización; no extrapolar a todos los clientes |
| Seguimiento | PARCIAL | P1/P2 | Persistencia comprobada; historial/próxima acción estructurados incompletos |
| Auth | PASS | P0/P1 | Login, cambio y recuperación documentados |
| Roles/permisos | PARCIAL | P1/P2 | Navegación por roles existe; matriz completa no certificada |

### P0

**P0 detectados:** ninguno reproducible en esta ejecución.

No se considera P0 la ausencia del Super Agente, Pricing shadow, benchmark, impresión automática, Company Intelligence o WhatsApp AI. Tampoco se considera prueba suficiente de operación una respuesta HTTP 200 aislada.

### Riesgos P1/P2 y guardrails

- Verificar manualmente precio y stock cuando sean críticos para una oportunidad; conservar `request_quote`, `unresolved` y `unavailable`.
- No prometer impresión hasta confirmar técnica, compatibilidad, proveedor y precio.
- Mantener Gmail y WhatsApp manuales, con destinatario revisado y autorización explícita.
- No interpretar el shell publicado como prueba del commit desplegado.
- Mantener seguimiento y próxima acción documentados mientras la trazabilidad estructurada siga parcial.

### Funciones disponibles ya

**VALIDADO:** catálogo/selección, solicitud, prospecto, oportunidad, cotización formal, emisión QA, PDF producto-only, Gmail/WhatsApp E2E controlados, seguimiento básico, login y recuperación.

**IMPLEMENTADO PERO NO VALIDADO DE FORMA GENERAL:** frescura de stock/precio por proveedor, disponibilidad completa de fichas/imágenes, impresión E2E, permisos detallados, release exacta actual y comunicaciones fuera del caso QA.

**NO DISPONIBLE:** Super Agente completo, playbooks cargados, Company Intelligence como producto, WhatsApp AI, Pricing de Conversión productivo y aprendizaje comercial.

### Resultado

`CHK-OPS-1: CERRADO / PARCIAL`. La operación comercial puede comenzar con el flujo estable y revisión humana de los puntos P1. El siguiente checkpoint definido es `CHK-AI-SALES-1 — SUPER AGENTE WEB / SOLICITUD SIMPLE DE 50 LIBRETAS`; no se implementó en esta ejecución.

## CHK-AI-SALES-1 — Super Agente Web QA

**Fecha:** 2026-09-27. **Estado:** **CERRADO / PARCIAL**.

### Implementado y comprobado en repositorio

- Núcleo determinista channel-agnostic con expediente estructurado, contratos de Sector/Company Intelligence, selección/rechazo/cambio de cantidad, alertas y handoff.
- Búsqueda V2 de libretas/cuadernos, ficha real, variantes, stock observado, imagen, URL y `get_public_product_price_quote` como única autoridad de precio. Las recomendaciones no inventan tres opciones si faltan candidatos y excluyen estados sin precio o stock insuficiente observado.
- Ruta de QA `/crm/agente-qa` detrás de `VITE_ENABLE_AGENT_QA=true`, sesión y rol comercial. El build normal conserva el flujo existente; el build con la bandera incluye la ruta QA.
- Contrato de escritura QA con contacto fijo no real, llave de solicitud idempotente, guard de rol, oportunidad con contexto, prospecto QA, cotización `BORRADOR` y partida solo si el precio está `priced`. No existen herramientas para emitir, enviar o activar Pricing shadow.
- 13 archivos de test / 104 pruebas PASS; incluye 13 pruebas nuevas de estado, selección, recomendaciones, ausencia de datos inventados y errores de herramientas. `tsc --noEmit` PASS, lint dirigido PASS, build normal y build con flag PASS, `git diff --check` PASS. Ambos builds reportan el warning no bloqueante de tamaño de bundle.

### Pendiente para E2E PASS

- No se activó la bandera en producción ni se comprobó la ruta con una sesión CRM real. No se realizaron escrituras de QA.
- Producto real específico, SKU, precio, stock, imagen y URL para 50 libretas: **NO COMPROBADOS** en runtime. Los CSV de proveedor son históricos y no prueban disponibilidad actual.
- Prospecto, oportunidad, cotización borrador e IDs generados por esta implementación: **NO COMPROBADOS**. No existe evidencia de persistencia o de que la cotización permanezca `BORRADOR` tras una ejecución real.
- UX desktop/mobile, multiturno amplio, reuso de perfil empresarial persistente, cobertura de todos los errores y canal Web para cliente final: **PARCIAL / NO COMPROBADO**. El núcleo actual es acotado y determinista; no constituye un agente general autónomo.
- Producción estable sin degradación: build normal PASS, pero QA interactiva posterior a despliegue **NO COMPROBADA**.

**Conclusión:** no declarar `CHK-AI-SALES-1 PASS`. Siguiente subcheckpoint propuesto: QA runtime controlada y cierre de brechas funcionales antes de habilitar el canal Web para cliente final.
