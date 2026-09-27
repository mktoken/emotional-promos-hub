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
| CHK-CAT-1 catálogo, precios y stock | 2026-09-26 | `d290e99e` + evidencia read-only de producción | Repositorio y producción | CERRADO / PARCIAL | [Entrada CHK-CAT-1](#chk-cat-1--certificación-operativa-read-only) |
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
