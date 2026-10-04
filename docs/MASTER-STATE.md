# ESTADO MAESTRO — EMOTIONAL PROMOS HUB

## Identidad de reentrada

- Repositorio: `mktoken/emotional-promos-hub`
- Rama maestra de continuación: `main`
- Commit documental de entrada a `CHK-DOC-1B`: `bc13a15` — `docs: corregir referencia de estado final`.
- Estado Git de entrada a `CHK-DOC-1B`: `main` y `origin/main` en `bc13a15`, sincronizados `0 0`; working tree limpio.
- Validación actual registrada: tests `67/67 PASS`; build `PASS`.
- Commit funcional de CHK-COM-6: `a16ce79` — `feat: programar seguimiento en cotizaciones publicas`.
- Commit documental de cierre: `26f46b3` — `docs: cerrar seguimiento de oportunidades qa`.
- Merge final con los cambios remotos de Lovable: `6ac668a`.
- `main` y `origin/main`: sincronizados `0 0` al cierre documental de CHK-COM-6.
- Working tree: limpio al cierre de `CHK-COM-6`.
- Push: realizado a `origin/main`.

## Estado de reentrada vigente — 2026-09-29

- `AUTH-2`: **CERRADO / PASS**. Recuperación de contraseña validada en producción.
- `CHK-COM-0`: **CERRADO / PASS**. Estado maestro alineado con `main` y `f1101ce`.
- `CHK-COM-1`: **CERRADO / PASS**. Solicitud pública QA aceptada en producción; referencia `4ee88798-969f-4aaa-a0a6-f294d9753ef4`, un producto, total estimado `$1,800 MXN`, modo de precio `v2`.
- `CHK-COM-2`: **CERRADO / PASS**. La oportunidad QA llegó al CRM con contacto, producto, cantidad, personalización, observación, modalidad, estado y total.
- `CHK-COM-3`: **CERRADO / PASS**. La solicitud QA se convirtió en cotización formal `COT-2026-00008`, en borrador, con partida, subtotal, IVA y total calculados correctamente.
- `CHK-COM-4`: **CERRADO / PARCIAL**. El vendedor puede ver contactos, cambiar estado y guardar notas internas; no hay próxima acción programable visible en esta oportunidad y no se registró historial de estado.
- `CHK-COM-5`: **CERRADO / PARCIAL**. El seguimiento programable existía en `Prospectos`, pero la oportunidad pública QA no estaba conectada a ese módulo.
- `CHK-COM-6`: **CERRADO / PASS**. Se agregó el seguimiento programable directamente a la oportunidad pública; la migración interna de Lovable/Supabase quedó aplicada y la función restringida al personal autenticado.
- Evidencia CHK-COM-6: en producción, la oportunidad QA `4ee88798-969f-4aaa-a0a6-f294d9753ef4` guardó el seguimiento para el 20/09/2026 a las 10:00, persistió después de recargar y posteriormente fue limpiado con PASS. La cotización formal `COT-2026-00008` permaneció en borrador y no se contactó al prospecto QA.
- `CHK-COM-7`: **CERRADO / PARCIAL**. La cotización formal QA `COT-2026-00008` fue emitida en producción y mostró “Cotización emitida”, conservando datos, partida y totales. En el corte de cierre de CHK-COM-7 no se había probado el envío al cliente.
- `CHK-COM-8`: **CERRADO / PASS**. La cotización QA `COT-2026-00008` completó E2E real controlado por Gmail y WhatsApp, con envío, recepción y verificación del PDF.
- `CHK-CAT-1`: **CERRADO / PARCIAL**. El diagnóstico read-only final encontró carga y paginación intermitentes, sin defecto reproducible aislado; permanecen no comprobados los valores runtime internos de proveedores, lotes, frescura, release/caché y varios estados de Pricing V2.
- `CHK-COM-9`: **CERRADO / PARCIAL**. La prueba QA post-envío de `COT-2026-00008` confirmó estado, seguimiento, nota y persistencia; la trazabilidad y la existencia de una próxima acción estructurada permanecen parciales y documentadas.
- `CHK-IMP-1-SHADOW-1`: **CERRADO / PASS**. Pricing de Conversión México fue implementado y validado en repositorio exclusivamente como shadow mode; no sustituye `calculate_product_price_v2` ni modifica catálogo, cotizaciones, release, caché o producción.
- `CHK-IMP-1`: **PAUSADO POR PRIORIDAD OPERATIVA**. El padre no queda cerrado ni abandonado. Permanecen pendientes la canasta competitiva real, parámetros definitivos, margen/piso definitivo, datos runtime, G4, impresión y cualquier validación productiva.
- `CHK-OPS-1`: **CERRADO / PARCIAL**. La baseline operativa no mostró un P0 reproducible y el critical path puede utilizarse con guardrails; permanecen riesgos P1/P2 y validaciones runtime pendientes.
- `CHK-AI-SALES-1`: **CERRADO / PASS para el caso QA acotado de 50 libretas**. `CHK-AI-SALES-1-RUNTIME-1B` validó sesión/rol CRM, catálogo y precio público V2 reales, multiturno 50→80, contexto persistido, prospecto/oportunidad QA y cotización formal `BORRADOR` `COT-2026-00009`, sin emitir ni enviar. El canal Web para cliente final y el Super Agente completo siguen fuera de este PASS.
- `CHK-AI-SALES-2`: **CERRADO / PASS del piloto Web cliente local y controlado**. Reutiliza el núcleo de `CHK-AI-SALES-1`; el E2E real con identidad QA creó la oportunidad `3b080274-7e91-4a05-91ce-660132b1ee6f`, reutilizó el prospecto QA `dcddee4c-0796-4200-bc1f-206caa8d21e1` y creó `COT-2026-00010` en `BORRADOR`, sin emisión ni envío. No constituye lanzamiento público ni capacidad anónima de escritura CRM.
- `CHK-AI-SALES-3`: **CERRADO / PASS**. El E2E runtime controlado validó tres líneas reales (libreta, termo y bolsa), referencias y cantidades independientes, variantes, precio V2 y stock observado por línea, retiro/reingreso sin duplicación, persistencia, una oportunidad y una cotización formal multilínea `BORRADOR`. La evidencia CRM es `COT-2026-00011` (`f962b802-1baa-441e-a976-eb5e5cb57371`), oportunidad `112f87ce-8429-41bd-a1b9-b33cbab00aeb` y prospecto QA reutilizado `dcddee4c-0796-4200-bc1f-206caa8d21e1`; no hubo emisión ni envío.
- `CHK-AI-SALES-4`: **CERRADO / PASS**. La primera capa ejecutable de Sector Intelligence + Company Intelligence + Opportunity Context validó dos playbooks piloto, perfil QA reutilizable, perfil mínimo de empresa desconocida, provenance/confidence/last_verified, razones comerciales, kit conceptual y cross-sell sin inventar SKU, precio, stock o disponibilidad. E2E contextual QA: oportunidad `20241fd6-f8e8-49d8-b8d8-49d906ec1a38`, cotización `COT-2026-00013` en `BORRADOR`, dos partidas, total `$12,098.80`, handoff enriquecido y sin emisión/envío.
- `CHK-AI-SALES-5`: **CLOSED / PASS (2026-09-29)**. E2E visual QA completo con fixture neutral: OpenAI Structured Vision V1 → catálogo → candidato explícito → cantidad/MOQ → Pricing V2 y stock observado → product line → oportunidad/cotización QA `BORRADOR` → handoff humano. No se emitió cotización ni se enviaron comunicaciones. El detalle y límites están en `docs/10_QA_EVIDENCE.md`.
- Fase actual: **OPERACIÓN PRIMERO / SUPER AGENTE VISUAL VALIDADO EN QA CONTROLADA**. El flujo público estable continúa sin cambios y Pricing V2 mantiene la autoridad pública.
- Próximo frente mayor: **`CHK-BRAND-WEB-1 — REDEFINICIÓN DE MARCA, COMUNICACIÓN Y EXPERIENCIA WEB`**. No se inicia en este cierre. No activar `VITE_ENABLE_AGENT_QA` ni `VITE_ENABLE_AGENT_WEB_PILOT` en producción ni publicar el piloto; mantener Pricing de Conversión shadow-only, G4 e impresión fuera.
- Gate de lanzamiento público: **`CHK-BRAND-WEB-1 — REDEFINICIÓN DE MARCA, COMUNICACIÓN Y EXPERIENCIA WEB` PENDIENTE**. Es requisito previo para lanzamiento público, promoción activa, campañas de adquisición o escalamiento significativo de tráfico hacia `articulospromocionales.vip`; no bloquea la operación comercial controlada, la atención comercial controlada, `CHK-AI-SALES-1`, QA, CRM ni Pricing shadow.
- Simulación marginal read-only precedente de CHK-IMP-1 (2026-09-27): el modelo por tramos conserva `below_minimum` debajo de `$1,500` y elimina descensos para subtotal base creciente; su análisis de total autoritativo, redondeo y escalas derivadas queda como antecedente comparativo. No se incorporó a la autoridad pública ni se activó en producción; el motor vigente de esta subfase es el simulador separado de Pricing de Conversión México.

### CHK-AI-SALES-1 — Super Agente Web QA (2026-09-27)

**Estado:** **CERRADO / PASS del caso QA acotado** tras `CHK-AI-SALES-1-RUNTIME-1B` (2026-09-27). No equivale a habilitación del canal Web público para cliente final.

- `src/features/agent/` contiene estado estructurado con contratos para Sector Intelligence, Company Intelligence y Opportunity Context; captura inicial, selección/rechazo, cambio de cantidad, recomendación limitada a productos encontrados, herramientas de catálogo/ficha/variantes/stock observado/imagen/URL/precio público V2 y preparación de CRM QA.
- La ruta `/crm/agente-qa` aparece solo si el build se realiza con `VITE_ENABLE_AGENT_QA=true` y exige sesión y rol comercial. Sin la bandera, el build conserva el bundle público previo. No se sustituyó el asistente o flujo comercial existente.
- El guard de CRM usa identidades fijas `QA Automatizado` / `QA PromoHub - NO CONTACTAR` / `qa-promohub@example.com`, solicita confirmación explícita y crea solo una solicitud idempotente, prospecto QA y cotización `BORRADOR` cuando existe precio autoritativo. Las herramientas no tienen acciones de emisión, correo, WhatsApp, Pricing shadow, G4 ni impresión.
- Runtime QA local/controlado con infraestructura integrada y sesión `admin` autorizada: la ruta protegida funcionó; un contexto sin sesión redirigió a `/login`. El build normal sin flag no contiene la ruta QA; no hubo despliegue ni cambio productivo.
- El mensaje real “Quiero 50 libretas para un evento corporativo” devolvió 12 productos del catálogo. Se eligió `Libreta "BOOKRAFT"` (`857df6f5-2abc-4a71-8840-c045262ea194`), variante `Royal Blue`; precio público V2 `priced` de `$42.63 MXN` por pieza antes de IVA e impresión para 80 unidades, mínimo 36, stock observado de la variante 6010. El SKU no está informado en la ficha; no se inventó. Se corrigieron de forma focal la interpretación de “Mejor cotízame 80”, la equivalencia azul/Blue y el resumen visual QA.
- El contexto QA sobrevivió a recarga y quedó en la oportunidad `e4b57510-b78b-4a02-b84c-c3cdb5c2d2ae`; prospecto QA `dcddee4c-0796-4200-bc1f-206caa8d21e1`; cotización `COT-2026-00009` (`1dc1146c-5a0a-4444-ad47-dc9cfa155105`) con una partida BOOKRAFT Royal Blue de 80. Consulta independiente: `status=BORRADOR`, `issued_at=null`, `sent_at=null`, total `$3,956.06 MXN`; personalización sujeta a revisión técnica y handoff humano. `COT-2026-00008` permaneció `EMITIDA` sin alteración.
- QA visual desktop/mobile PASS; caso seguro de 1 libreta devolvió cero opciones sin crear CRM. Validación local: 107/107 tests PASS, `tsc --noEmit` PASS, lint dirigido PASS, builds normal/QA PASS y `git diff --check` PASS; warning de bundle grande no bloqueante.
- **Límites vigentes:** no hay SKU ni timestamp de frescura de stock en los datos observados; la disponibilidad final y la impresión no están confirmadas. No se probó un rol autenticado no comercial, reintento real de idempotencia, `request_quote` ni falla de herramienta; Company Intelligence, Web público para cliente final y agente autónomo completo siguen fuera. Registros QA etiquetados se conservan como evidencia; no se hizo limpieza agresiva.

### CHK-AI-SALES-2 — Piloto Web cliente controlado (2026-09-27)

**Estado:** **CERRADO / PASS del piloto local QA**, no de un lanzamiento público ni de una escritura CRM anónima.

- `/agente-piloto` usa `VITE_ENABLE_AGENT_WEB_PILOT=true` y solo se registra para `localhost`/`127.0.0.1`; con flag OFF devuelve 404. No hay enlace desde Home, catálogo o campañas; lleva `noindex,nofollow`. La ocultación de ruta no es autorización: escribir en CRM exige sesión y rol comercial existentes, además de identidad QA explícita.
- `AgentQaPage` y el piloto comparten `agent-workflow.ts`, `agent-state.ts` y `agent-tools.ts`; el piloto muestra solo información comercial para comprador, no IDs de CRM, trazas, costos ni márgenes. Antes del guardado vuelve a consultar producto, variante y precio autoritativos. La sesión conversacional local sobrevive a recarga en la pestaña; no persiste allí IDs CRM.
- E2E local controlado: solicitud de 50 libretas para evento corporativo, 12 productos reales, BOOKRAFT (`857df6f5-2abc-4a71-8840-c045262ea194`), cambio 50→80 y variante `Royal Blue`; precio V2 `priced` `$42.63 MXN` por pieza antes de IVA/personalización, stock observado de variante 6010, disponibilidad final por confirmar.
- Tras captura explícita de `QA Automatizado` / `QA PromoHub - NO CONTACTAR` / `qa-promohub@example.com` / `5500000000`, la sesión comercial autorizada creó oportunidad `3b080274-7e91-4a05-91ce-660132b1ee6f`, reutilizó sin duplicar el prospecto `dcddee4c-0796-4200-bc1f-206caa8d21e1` y creó cotización `COT-2026-00010` (`63c79c02-79f8-459f-8dd1-7ff46b734f0c`). Conteos por identidad/sesión: 1 prospecto activo, 1 oportunidad y 1 cotización. El contexto de la nueva oportunidad enlaza el prospecto reutilizado; su `web_lead_id` histórico no fue sustituido.
- Verificación independiente: `COT-2026-00010` `BORRADOR`, `issued_at=null`, `sent_at=null`, una partida BOOKRAFT Royal Blue de 80 a `$42.63`, subtotal `$3,410.40`, IVA `$545.66`, total `$3,956.06`; personalización por confirmar y siguiente acción revisión humana. No se pulsaron acciones de emisión, correo ni WhatsApp.
- QA desktop/mobile local, recarga, bandera OFF y regresiones básicas de `/crm/agente-qa`, dashboard CRM y catálogo normal: PASS. Validación final: 113/113 tests, 22/22 dirigidos, types, lint dirigido, builds normal/piloto y `git diff --check` PASS. Warning de bundle grande no bloqueante.
- **Límites:** el piloto no está desplegado ni ofrece escritura CRM pública/anónima; un operador comercial autenticado debe validar la solicitud QA. Stock final, impresión, permisos de rol no comercial, disponibilidad/errores de red en runtime y conversación multiproducto no quedan certificados. `CHK-BRAND-WEB-1` sigue siendo gate de lanzamiento público.

### CHK-IMP-1-SHADOW-1 — Pricing de Conversión México en shadow mode (2026-09-27)

**Estado:** **CERRADO / PASS**.

**Padre:** `CHK-IMP-1`, que queda **PAUSADO POR PRIORIDAD OPERATIVA**, no cerrado ni abandonado.

- Se implementó `src/lib/pricing-conversion-shadow.ts` como motor puro y separable. Recibe `adjusted_cost` explícito, por lo que no vuelve a aplicar el factor CDO/ForPromotional; no contiene fallback Legacy `×1.35`.
- El motor calcula `purchase_base = adjusted_cost × quantity`, `SMALL_ORDER`, `MARKET_AWARE` y `ENTERPRISE`, con transición configurable y continua entre `$4,500` y `$7,500`.
- Las observaciones competitivas son una estructura curada sin scraping. La normalización excluye SKU, moneda, IVA, cantidad, impresión, envío, vigencia o stock no comparables; sin benchmark suficiente se conserva el precio económico interno.
- La salida expone corredor competitivo, piso de rentabilidad, estados comerciales, utilidad/margen, elegibilidad enterprise y comparación opcional contra Current V2. Todas las salidas llevan `shadow_only: true`.
- La implementación no constituye activación, recompute, publicación, sincronización, cambio de caché ni modificación de datos productivos. La subfase queda cerrada con evidencia de repositorio; la canasta y parámetros requieren una fase posterior, y la activación pública requiere otro checkpoint.

## Reconciliación Git ↔ Lovable ↔ Producción — 2026-09-26

- **Git — estado inicial de la reconciliación:** `main` y `origin/main` estaban en `c4d2195` (`feat: agregar acciones manuales de envio de cotizacion`), con divergencia `0 0` y working tree limpio.
- **Git — estado posterior a la reconciliación:** `b4f2aab` (`docs: reconciliar estado envio cotizacion`) fue el commit documental rebasado; el estado final vigente quedó en `bc13a15` (`docs: corregir referencia de estado final`), con divergencia `0 0` y working tree limpio.
- **Lovable:** el proyecto `406ed62b-fa9a-4346-82b6-4b111a4193b3` contiene las acciones `Abrir Gmail` y `Abrir WhatsApp`; durante esta reconciliación no se realizaron modificaciones.
- **Producción:** la cotización formal `COT-2026-00008`, en estado `Emitida`, mostró ambas acciones en `https://articulospromocionales.vip`; la QA fue visual y funcional, sin activar ninguna de ellas.
- **Preparación validada:** Gmail mostró destinatario, asunto y cuerpo preparados; WhatsApp mostró teléfono y mensaje preparados.
- **Envío real:** **NO COMPROBADO**. No se abrió Gmail ni WhatsApp para enviar.
- **Entrega al cliente:** **NO COMPROBADA**.
- **Conclusión:** `c4d2195` queda conciliado entre Git, Lovable y Producción como **IMPLEMENTADO, PRESENTE Y CONFIRMADO FUNCIONALMENTE EN PRODUCCIÓN** mediante `COT-2026-00008`. Esta conciliación no equivale a validar envío ni entrega.

## Jerarquía documental canónica

- Entrada: `docs/00_PROJECT_INDEX.md`.
- Estado vigente y checkpoint: este documento.
- Decisiones: `docs/02_DECISION_LOG.md`.
- Producto: `docs/04_PRODUCT_SCOPE.md`.
- Arquitectura: `docs/05_ARCHITECTURE.md`.
- Operación: `docs/08_OPERATIONS_RUNBOOK.md`.
- Pricing y catálogo V2: `docs/09_PRICING_CATALOG_V2.md`.
- Índice QA: `docs/10_QA_EVIDENCE.md`.
- `supabase/qa/` y `.lovable/plan/`: evidencia detallada/histórica, no autoridad sobre el estado vigente.

## CHK-DOC-1B — Construcción del sistema documental canónico

Estado: **CERRADO / PASS**.

Alcance: crear un índice, decisiones, alcance de producto, arquitectura, runbook operativo, consolidación Pricing/Catálogo V2 e índice QA, y corregir la continuidad actual sin modificar código o infraestructura.

Evidencia de cierre:

- Se crearon `docs/00_PROJECT_INDEX.md`, `docs/02_DECISION_LOG.md`, `docs/04_PRODUCT_SCOPE.md`, `docs/05_ARCHITECTURE.md`, `docs/08_OPERATIONS_RUNBOOK.md`, `docs/09_PRICING_CATALOG_V2.md` y `docs/10_QA_EVIDENCE.md`.
- Se actualizaron únicamente `README.md` y este `docs/MASTER-STATE.md` dentro del alcance autorizado.
- La reentrada documental permite identificar proyecto, repositorio, producción, autoridad, checkpoint abierto, evidencia, pendientes, pricing/catálogo, QA y reglas operativas sin depender de chats.
- `git diff --check`: PASS; enlaces internos y rutas documentales verificadas; no quedaron placeholders de Lovable.
- No se modificaron código, infraestructura, Supabase, Lovable, producción, datos, Auth, `.env`, stashes ni ramas históricas.
- La verificación final de Git, commit y push queda registrada en el informe de cierre de este checkpoint.

Este documento es la fuente de verdad de reentrada del proceso Pricing V2 / CatalogView V2. Consolida la historia verificable en Git, los reportes históricos versionados y el estado operativo reportado desde Lovable/Supabase interno. No sustituye las pruebas funcionales pendientes ni convierte documentación histórica en evidencia de producción actual.

## Clasificación de evidencia

- **Confirmado por Git:** ramas, commits, archivos, diffs y código presente en este checkout.
- **Confirmado por Lovable/Supabase interno:** resultados operativos registrados en planes versionados; requieren nueva consulta en Lovable si se necesita certificar el estado actual.
- **Reporte histórico versionado:** dry run, shadow write y validaciones documentadas en `supabase/qa/`.
- **Pendiente de validación futura:** cualquier cambio posterior a este checkpoint; la QA funcional post-migración quedó cerrada en Fase 4.
- **Auditoría comercial 2026-09-19:** producción respondió; catálogo público comprobado con 992 productos, 15 categorías y precio autoritativo por cantidad. La solicitud QA fue aceptada con referencia `4ee88798-969f-4aaa-a0a6-f294d9753ef4`, recibida completa en CRM, convertida a `COT-2026-00008` inicialmente en borrador y anotada internamente. CHK-COM-6 validó el seguimiento directamente en la oportunidad: guardado, persistencia tras recarga y limpieza QA, todo PASS. CHK-COM-7 validó la emisión de la cotización, pero no se envió al cliente.
- **QA continuidad de producción 2026-09-26:** confirmó el sitio público, catálogo, sesión/CRM y `COT-2026-00008`. Confirmó funcionalmente en producción las acciones manuales `Abrir Gmail` y `Abrir WhatsApp` asociadas a `c4d2195`, incluida la preparación visual de destinatario/asunto/mensaje, sin envío ni entrega comprobados.

## Estado Git y alcance

- Base histórica relevante: `4084872`.
- Commit de limpieza funcional: `94ed71f`.
- Commit documental local inicial: `5ad44a7`.
- En el corte histórico de Fase 3, el remoto estaba sincronizado en `94ed71f`; el estado vigente se registra en la sección de reentrada actual.
- Hay 69 commits desde `main` hasta el estado local actual.
- Muchos commits intermedios son internos de Lovable y usan mensajes genéricos como `Changes`, `Update plan` o `Work in progress`.
- El historial contiene evidencia de Pricing V2 y CatalogView.
- El diff funcional final frente a `4084872` queda limitado a `src/components/CatalogView.tsx`.

## Línea de tiempo técnica

1. **Preparación de tablas shadow y releases.** Los commits `04bc887` y `c63c385` versionaron las tablas shadow V2 y prepararon releases reversibles.
2. **Dry run y shadow write.** Los reportes QA del 2026-08-02 registraron una ejecución `dry_run` completada y un `shadow_write` certificado, sin publish ni cutover.
3. **Precio público V2 por cantidad.** `d118d05` agregó el contrato autoritativo de precio público y `9e40570` agregó sus assertions.
4. **Cotizaciones seguras.** `8ed83d4` agregó el backend expand de cotizaciones V2; los commits posteriores incorporaron adaptadores de frontend, idempotencia y migración del carrito a RPCs seguras, culminando en `67e4e91` y `4084872`.
5. **Refresco de datos y nueva generación.** La secuencia posterior de commits de Lovable documentó refresco de stock/caché, auditoría backend y generación shadow nueva: `b0b726c`, `0230e05` y `6cf6d5f`.
6. **Publicación de release V2.** La documentación versionada de Fase 2 registró la publicación de la release `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b` desde la generación `818d824a…`.
7. **Migración de CatalogView.** La secuencia `8cbd114`, `724543a`, `052c100` y `c82e8f1` preparó y aplicó el cambio de catálogo a `catalog_search_products_v2`.
8. **Limpieza de cambios fuera de alcance.** Se detectaron cambios en `client.ts`, `types.ts` y `previewAuthStorage.ts`; la limpieza los retiró del alcance funcional de Fase 3 y dejó únicamente `CatalogView.tsx`. El resultado quedó registrado en `94ed71f`.
9. **Estado maestro y QA final.** `5ad44a7` creó este documento; los commits posteriores consolidaron la cronología y el cierre documentado de la QA funcional Fase 4. El estado actual está sincronizado en GitHub.

## Fase 1 — Cerrada / certificada

- Generación shadow nueva: `818d824a…`.
- Resultado: 1,524 candidatos; 1,506 con precio; 18 a cotizar; 0 no disponibles; 0 errores; 0 sin resolver.
- Legacy estructuralmente intacto.
- Sin release V2 activa en esta fase.
- Sin cutover.

## Fase 2 — Cerrada / certificada

- Release V2 activa: `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b`.
- Publicada desde la generación `818d824a…`.
- `catalog_price_v2_current_prices`: 1,524 filas.
- 1,506 filas con precio.
- 18 filas a cotizar.
- 0 filas no disponibles.
- Validación backend sin errores.
- Rollback disponible y no ejecutado.
- Legacy intacto.
- `CatalogView` aún no estaba migrado en esta fase.

## Fase 3 — Cerrada / verificada

- `CatalogView` migrado a `catalog_search_products_v2`.
- Listado, ficha y carrito alineados en V2.
- Legacy permanece disponible como respaldo backend.
- Cambio final aceptado contra la base `4084872`: únicamente `src/components/CatalogView.tsx`.
- Diff final: 1 archivo, 14 inserciones y 2 eliminaciones.
- Push realizado a `origin/feat/v2-cutover-preparation`.
- Commit de limpieza: `94ed71f` — `fix: limpiar artefactos lovable fuera de alcance`.
- Working tree limpio.

## Matriz de evidencia por fase

| Fase | Estado | Evidencia Git | Evidencia Lovable/Supabase | Riesgo | Siguiente acción |
|---|---|---|---|---|---|
| Fase 1 — generación shadow | Cerrada / certificada | Código de recomputación, tablas shadow y commits V2 versionados | Reporte histórico de generación `818d824a…`: 1,524 / 1,506 / 18 / 0 / 0 / 0 | Bajo mientras no se publique | Mantener como baseline histórico |
| Fase 2 — release backend | Cerrada / certificada | RPC de publish/rollback, vista de precios actuales y contratos V2 versionados | Reporte operativo de release: 1,524 filas, 1,506 con precio, 18 a cotizar, 0 no disponibles, sin errores | Legacy y V2 coexistieron temporalmente | Mantener rollback y validar comportamiento post-migración |
| Fase 3 — CatalogView V2 | Cerrada / verificada | `CatalogView.tsx` llama `catalog_search_products_v2`; diff autorizado de 14 inserciones y 2 eliminaciones | Estado de release y alineación reportado desde Lovable | Riesgos funcionales cubiertos por Fase 4 | Mantener checkpoint documental |
| Fase 4 — QA funcional final | Cerrada / aprobada | Sin cambios de código ni estructura durante QA | Informe Lovable: 20/20 PASS, cero leads, release vigente y Legacy intacto | Solo observaciones no bloqueantes documentadas | No iniciar nueva funcionalidad |

## Registro de reversiones y limpieza

Durante Fase 3 se detectaron cambios fuera de alcance en:

- `src/integrations/supabase/client.ts`;
- `src/integrations/supabase/types.ts`;
- `src/integrations/supabase/previewAuthStorage.ts`.

Esos cambios fueron revertidos o excluidos del resultado funcional de Fase 3. Esta afirmación corresponde al corte histórico de Fase 3. La limpieza quedó registrada en `94ed71f`; el diff funcional aceptado frente a `4084872` conservó únicamente `src/components/CatalogView.tsx`. Posteriormente, durante CHK-COM-6, Lovable volvió a versionar cambios relacionados con la integración interna de Supabase (`types.ts`, `client.ts`, `previewAuthStorage.ts`) y agregó la migración de seguimiento; quedaron integrados en `65947b6`, `2905a11`, `1aaebee` y el merge `6ac668a`.

## Estado actual

| Área | Estado |
|---|---|
| Backend Pricing V2 | Activo |
| Release V2 | Activa |
| Frontend del catálogo | Alineado a V2 |
| Legacy | No retirado; disponible como respaldo backend |
| QA funcional final post-migración | Cerrada / aprobada: 20/20 PASS |
| AUTH-2 recuperación de contraseña | Cerrada / PASS |
| Auditoría Flujo Comercial E2E V1 | Completada |
| Seguimiento de oportunidades públicas | Validado / PASS en producción |
| Emisión de cotización formal QA | Validada / PASS en producción |
| Envío de cotización formal | Cerrado / PASS: Gmail y WhatsApp E2E controlados, con recepción y PDF verificados |
| Super Agente multiproducto | CHK-AI-SALES-3 CERRADO / PASS; E2E runtime multilínea, CRM, borrador y UI desktop/mobile validados |
| Inteligencia comercial inicial | CHK-AI-SALES-4 CERRADO / PASS; playbooks, perfil QA, provenance y E2E contextual validados |
| CHK-CAT-1 catálogo, precios y stock | CERRADO / PARCIAL; limitaciones runtime documentadas |
| CHK-COM-9 ciclo post-envío y seguimiento comercial | CERRADO / PARCIAL; limitaciones documentadas |
| CHK-IMP-1-SHADOW-1 Pricing de Conversión México | CERRADO / PASS; shadow-only |
| CHK-IMP-1 padre | PAUSADO POR PRIORIDAD OPERATIVA; G4, impresión y activación productiva pendientes |
| CHK-OPS-1 baseline operativa | CERRADO / PARCIAL; sin P0 reproducible, guardrails y riesgos P1/P2 documentados |
| Nueva funcionalidad | No iniciar sin nuevo checkpoint autorizado |

## Pendientes de control

### Pendiente inmediato

- Mantener Legacy y no iniciar correcciones ni desarrollo fuera del alcance aprobado.
- Mantener documentadas las limitaciones de CHK-COM-9 y no iniciar correcciones ni otro checkpoint automáticamente.
- Mantener el resultado de `CHK-IMP-1-SHADOW-1` preservado en Git y el padre pausado hasta definir la canasta competitiva mexicana, validar parámetros y reconciliar el lineage runtime de proveedores antes de cualquier activación. Operar el flujo estable con los guardrails de `docs/07_OPERATIONS_ROADMAP.md`.
- Preservar la evidencia QA de `CHK-AI-SALES-3` y `CHK-AI-SALES-4`; no emitir ni enviar `COT-2026-00011` ni `COT-2026-00013` y no usar los registros QA como operación comercial real.

### No hacer todavía

- No retirar Legacy.
- No iniciar nuevas funcionalidades fuera de un checkpoint autorizado.
- No rediseñar el catálogo.
- No modificar backend, Supabase, migraciones, RLS, grants, secrets o Edge Functions.
- No ejecutar rollback.

## Siguiente paso autorizado

`CHK-OPS-1` queda **CERRADO / PARCIAL**, `CHK-AI-SALES-1` **CERRADO / PASS para el caso QA acotado**, `CHK-AI-SALES-2` **CERRADO / PASS del piloto Web local controlado**, `CHK-AI-SALES-3` **CERRADO / PASS** y `CHK-AI-SALES-4` **CERRADO / PASS**. El canal Web público para cliente final sigue sin autorización de despliegue. `CHK-IMP-1` permanece **PAUSADO POR PRIORIDAD OPERATIVA**. No iniciar otro frente sin autorización explícita; no cargar observaciones productivas, aplicar migraciones, ejecutar recompute/release/publish/sync, modificar G4, continuar impresión ni sustituir `calculate_product_price_v2`.

## Gate de lanzamiento público

`CHK-BRAND-WEB-1 — REDEFINICIÓN DE MARCA, COMUNICACIÓN Y EXPERIENCIA WEB` queda **PENDIENTE** como requisito previo al lanzamiento público. La plataforma puede utilizarse comercialmente de forma controlada desde la baseline operativa aprobada, pero no deben iniciarse promoción activa, campañas de adquisición ni un escalamiento significativo de tráfico hacia `articulospromocionales.vip` hasta cerrar este checkpoint.

El gate debe aprobar, como mínimo:

- posicionamiento, propuesta de valor y mensajes principales;
- hero/home, arquitectura de comunicación, identidad visual, jerarquía y experiencia visual;
- señales de confianza y diferenciación frente a la competencia mexicana;
- comunicación adecuada para pequeños compradores, PyMEs, grandes empresas y compradores corporativos;
- integración conceptual de catálogo, atención inmediata, Super Agente, Pricing competitivo, kits, soluciones B2B y trayectoria histórica de la empresa;
- QA desktop/mobile antes del lanzamiento.

## PE BRAND / WEB CANONICAL STATE

- Phase 2 Brand/Experience: **approved**.
- Phase 3 UX/CRO: **approved**.
- Phase 3A Wireframe Lock: **approved**. La fuente canónica es `docs/brand-web/PE_WIREFRAME_LOCK_V1.md` y conserva el cierre `PE WIREFRAME LOCK V1 — READY FOR STITCH`.
- Phase 5 Visual Direction: **approved**.
- Phase 6 Copy Lock: **owner approved**.
- Phase 7 Build Plan: **prepared**.
- Phase 7C/7D image research: **completed for internal build**.
- Phase 7E image direction: **approved for internal build**.
- **PUBLICATION RIGHTS:** **CLOSED / PASS**. ForPromotional / 4Promotional assets are **CLEARED FOR COMMERCIAL PUBLICATION** by `OWNER CONFIRMED BROAD COMMERCIAL AUTHORIZATION`, including web, catalog, PDP, social media, Google Ads, Meta Ads, email, proposals/presentations, storage/rehosting, crop, resizing, background/composition adaptation and PE graphic integration. The asset must belong effectively to the authorized bank. This does not override third-party restrictions such as Doble Vela `RESTRICTED / DO NOT USE`.
- Category image rights for `T150`, `O090`, `CH002`, `BL163` and `SO019`: **CLEARED** by the same owner confirmation; product identity, taxonomy, public visibility, availability and stock remain separate validations.
- **HERO FINAL ASSET:** **CLOSED / PASS**. **FINAL HERO: `T150`**. Implemented in `src/components/home/HomeHero.tsx` with `public/images/home-hero-t150.jpg` from the authorized ForPromotional bank; responsive validation at 390 / 768 / 1024 / 1440 passed with `object-contain`, centered composition, no distortion and no aggressive crop. Copy, CTAs and Header were unchanged; no new claims, price, SKU, badges, overlays, slider or animations were introduced. Publication rights remain **CLOSED / PASS** under the owner-confirmed broad commercial authorization.
- Solutions V1: **no photography**; rights clearance does not require introducing solution images.

### CHK-BRAND-WEB-B1 — Header + Hero

- **Status:** **CLOSED / PASS**.
- **Canonical implementation HEAD:** `4294d00ef0864b413cfc5f6774fab0c8007a24fa`.
- **Scope closed:** Header + Hero.
- **Evidence:** Header PASS; Hero PASS; Route A PASS; Route B PASS as `PRESENTATIONAL / NON-FUNCTIONAL`; Hero slot PASS; responsive PASS at 390 / 768 / 1024 / 1440; B1 claims PASS; Vitest `205 / 205 PASS`; Build PASS; `git diff --check` PASS; protected surfaces PASS.
- **Functional state:** logo preserved; Catálogo and Cómo funciona functional; Soluciones and Nosotros deferred; Mi solicitud preserved; mobile menu active; no bottom navigation. Hero copy lock applied; Route A functional; Route B visible but disabled; no CRM, WhatsApp, submit, or endpoint; replaceable Hero image slot.
- **TypeScript:** 47 pre-existing errors remain and B1 introduced 0 new errors. The debt is limited to `src/features/agent/lib/agent-attachments.ts`, `src/features/agent/lib/agent-attachments.test.ts`, `src/features/agent/lib/agent-crm.test.ts`, `src/features/agent/lib/agent-quote.test.ts`, `src/features/agent/lib/agent-state.test.ts` and `src/lib/pricing-conversion-shadow.test.ts`. No correction is authorized by this closure.
- **Scope boundary:** B1 CLOSED / PASS does not mean `BRAND-WEB CLOSED`, `PUBLICATION READY` or `LAUNCH READY`.
- **Next authorized phase at B1 closure:** `B2 — Categories + Runtime Taxonomy Validation`.

### CHK-BRAND-WEB-B2 — Home Categories + Runtime Taxonomy Validation

- **Status:** **CLOSED / PASS**.
- **Canonical implementation HEAD:** `423aca2a9508e7e22fc8c00842da0b19479c9936`.
- **Closed scope:** Home Categories; five runtime taxonomy mappings; replacement of the legacy `Productos destacados` section.
- **Evidence:** Copy PASS; routes PASS; runtime safety PASS; legacy claim removal PASS; visual placeholders PASS; responsive PASS at 390 / 768 / 1024 / 1440; Vitest `205 / 205 PASS`; Build PASS; lint PASS for B2 files; protected surfaces PASS.
- **TypeScript:** 47 pre-existing errors remain; B2 introduced 0 new errors. No TypeScript correction is authorized by this closure.
- **Runtime-validated mappings:** `Termos y vasos → bebidas-termos-vasos`; `Libretas → libretas-cuadernos`; `Ropa promocional → textiles-ropa`; `Bolsas y mochilas → bolsas-mochilas-viaje`; `Tecnología → tecnologia`.
- **Regalos ejecutivos:** deferred until public inventory exists. `REGALOS EJECUTIVOS PUBLIC INVENTORY` remains OPEN. The prior observation concerning `premios-regalos-ejecutivos`, `active = true` and public count `0` was not revalidated in B2 and is not treated as new confirmed evidence.
- **Non-blocking URL note:** `/?view=catalog&choose=categories` opens the catalog/selector and is later normalized by `CatalogView` to `/?view=catalog`. This behavior predates B2, does not produce an error, and was not modified.
- **Legacy claim:** `favoritos de nuestros clientes corporativos` was removed from Home with the replacement of the old `Productos destacados` section. This does not certify that every legacy claim on the site is resolved.
- **Next authorized phase:** `B3 — Solutions / Promocionales para cada ocasión`.

### CHK-BRAND-WEB-B3 — Home Solutions + Header Navigation

- **Status:** **CLOSED / PASS**.
- **Canonical integrated HEAD:** `185c3133a28919c4c05ab5cc827cff1afb4e1464`.
- **Closed scope:** Home Solutions; Header `Soluciones` navigation; mobile section scroll fix.
- **Implementation:** new `src/components/home/HomeSolutions.tsx`; modified `src/components/LandingView.tsx`, `src/components/home/HomeHeader.tsx` and `src/pages/Index.tsx`.
- **Functional heads:** B3 implementation `62b63d50f1a03a6755baca0bb92c7dd029f1d985`; mobile fix `3acb4e5fd82571e7c32ab6f50caafd4cbd6984db`; final integrated HEAD `185c3133a28919c4c05ab5cc827cff1afb4e1464`.
- **Solutions:** H2 `Promocionales para cada ocasión`; cards `Eventos y campañas`, `Colaboradores y reconocimiento` and `Regalos corporativos`; one common CTA `Contar mi proyecto`; CTA status `PRESENTATIONAL / DISABLED`.
- **Route B:** no functional implementation yet; no submit, CRM write, endpoint, Edge Function, WhatsApp substitution or automation.
- **Legacy Kits:** removed from Home, including claims about `Solución Todo en Uno`, `Nosotros los armamos`, integration, logistical savings and `Arma tu Kit Multi-Producto`. This does not certify that all legacy claims across the site are resolved.
- **Header:** `Soluciones` points to `#soluciones` from Home, catálogo, PDP and carrito on desktop and mobile. The shared Index navigation helper is behavior-preserving; no `/soluciones` route exists.
- **Mobile fix:** menu close, render/frame wait and subsequent scroll. `HOME MOBILE SOLUTIONS` and `HOME MOBILE HOW IT WORKS` PASS; the fix also corrected the pre-existing Cómo funciona scroll behavior.
- **Validation:** Vitest `205 / 205 PASS`; Build PASS; Lint PASS; `git diff --check` PASS; 47 pre-existing TypeScript errors; B3 introduced 0 new errors; unexpected functional files 0; protected surfaces PASS.
- **Visual state:** no final photography, SKU, supplier URLs or publication-bound assets; no badges; presentational cards; one column mobile and three cards desktop. Publication rights remain OPEN.
- **Next authorized phase:** `B4 — Cómo funciona + confianza + FAQ + CTA final`.

### CHK-BRAND-WEB-B4 — Cómo funciona + Confianza + FAQ + CTA final

- **Status:** **CLOSED / PASS**.
- **Canonical integrated HEAD:** `9f781734ceba12ad8ad5721c54139c938b80e979`.
- **Functional head:** `87b0e81f06cf4f98d1931891b6f82049fe8bb67a`; final remote tip `9f781734ceba12ad8ad5721c54139c938b80e979`.
- **Closed scope:** Cómo funciona, Confianza, FAQ, CTA final and removal of the replaced legacy process/guarantee blocks.
- **Implementation:** new `src/components/home/HomeProcess.tsx`, `src/components/home/HomeTrust.tsx`, `src/components/home/HomeFaq.tsx` and `src/components/home/HomeFinalCta.tsx`; modified `src/components/LandingView.tsx` only.
- **Cómo funciona:** H2 `De la idea a una cotización clara`; three canonical steps; `id="proceso"`. Removed Home claims `+10k productos`, muestra virtual, anticipo, Producción y Envío, calidad premium and entrega puntual.
- **Confianza:** H2 `Claridad antes de decidir`; three blocks `Catálogo abierto`, `Condiciones por producto` and `Revisión comercial`; `id="confianza"`. Removed `Garantía Cero Riesgos`, render and reposición sin costo.
- **FAQ:** H2 `Preguntas frecuentes`; five canonical questions; `id="faq"`; closed by default with `aria-expanded`, `aria-controls`, keyboard operation and visible focus.
- **CTA final:** H2 `Empieza por el camino que ya tienes claro`; CTA A `Explorar catálogo` is functional through the existing catalog route; CTA B `Contar mi proyecto` remains `PRESENTATIONAL / DISABLED` with accessible status `Esta opción aún no está disponible.` Route B functional contract remains OPEN.
- **Home order:** Hero → Categorías → Soluciones → Cómo funciona → Confianza → FAQ → CTA final → Footer.
- **Validation:** Vitest `205 / 205 PASS`; Build PASS; Lint PASS; `git diff --check` PASS; 47 pre-existing TypeScript errors; B4 introduced 0 new errors; responsive PASS at 390 / 768 / 1024 / 1440; unexpected functional files 0; protected surfaces PASS.
- **Claims boundary:** only the legacy claims in the replaced B4 blocks are certified as removed; this does not certify that every legacy claim across the site is resolved.
- **Scope boundary:** B4 CLOSED / PASS does not mean `BRAND-WEB CLOSED`, `PUBLICATION READY` or `LAUNCH READY`.
- **Next step:** before starting a new Build phase, evaluate which currently open gate should be resolved; no new Lovable work is implied automatically.

### CHK-ROUTE-B-RB2 — UI no-write / Preview Only

- **Status:** **CLOSED / PASS**.
- **Scope:** **UI NO-WRITE / PREVIEW ONLY**.
- **Route B state:** **PARTIALLY IMPLEMENTED**. The UI is available for preview and local/mock interaction; it does not create a real lead, quote, CRM record or external submission.
- **Implementation:** created `src/components/ProjectBriefView.tsx`, `src/features/project-brief/lib/project-brief.ts` and `src/features/project-brief/lib/project-brief.test.ts`; modified `src/pages/Index.tsx`, `src/components/LandingView.tsx`, `src/components/home/HomeHero.tsx`, `src/components/home/HomeSolutions.tsx` and `src/components/home/HomeFinalCta.tsx`.
- **Final patch:** `src/components/ProjectBriefView.tsx`, with the approved intro copy and mobile bottom spacing to avoid persistent overlap with the global Asesoría control.
- **RB2 commits:** `8262765`, `2a1688e`, `913b929`.
- **Patch commits:** `866a28d`, `97aa6f8`.
- **Entry points:** Hero, Home Solutions and Home Final CTA → `Contar mi proyecto` → `/?view=brief`. Route A remains unchanged.
- **Validation:** Vitest `213 / 213 PASS`; Build PASS; Lint PASS; `git diff --check` PASS; 47 pre-existing TypeScript errors; RB2 introduced 0 new errors; unexpected functional files 0; protected surfaces PASS.
- **No-write contract:** Supabase writes `0`; Edge Function calls `0`; CRM writes `0`; network writes `0`; PII persistence `0`; no email, WhatsApp or real submit. Success state is local/mock only.
- **Validation contract:** objective and contact name required; email or phone; positive quantity or `quantity_unknown`; valid date or `target_date_unknown`; privacy consent required; no implicit quantity `1`; no required SKU, attachments or payment data.
- **Privacy:** consent required visually; marketing not included; privacy notice link remains non-functional and `/aviso-de-privacidad` is a future route. Route B is not authorized for production publication.
- **Route B functional contract:** **NOT CLOSED YET**.
- **RB3 write integration:** **BLOCKED**.
- **Scope boundary:** RB2 CLOSED / PASS does not close Route B, authorize production publication, or authorize CRM/backend writes.

### CHK-ROUTE-B-RB3 — Technical design and migration specification

- **CHK-ROUTE-B-RB3-TECH-DESIGN:** **CLOSED / PASS** as a documented technical design.
- **CHK-ROUTE-B-RB3-FINAL-MIGRATION-SPEC:** **CLOSED / PASS** as the canonical RB3-A migration specification.
- **Technical design:** complete. The destination remains `cotizaciones_leads`; no new table, direct frontend write, CRM automation, automatic email or automatic WhatsApp is authorized.
- **Canonical decisions:** `public_request_type` is approved with `quote` and `project_brief`, default `quote`; `privacy_url` is defined as `/aviso-de-privacidad`; `marketing_consent` remains `false` in RB3 V1.
- **Implementation state:** no frontend, backend, migration, Supabase, Edge Function, CRM or production changes were made by this documentation checkpoint.
- **RB3 build:** **BLOCKED BY LEGAL GATE**. The write path must remain inactive until `PE-PRIVACY-V1` is legally approved, `/aviso-de-privacidad` is published, the active server-side privacy configuration exists, hosting analytics/cookies/storage disclosure is validated, processor/transfer wording is reviewed and retention is approved.
- **Readiness:** `READY FOR BUILD = NO`; `READY AFTER LEGAL GATE = YES`, subject to controlled implementation and QA.
- **Canonical specification:** `docs/route-b/RB3_FINAL_MIGRATION_SPEC_V1.md`.

### CHK-ROUTE-B-PRIVACY-LEGAL-REVIEW-PACK-V2

- **PE-PRIVACY-V1:** **LEGAL REVIEW DRAFT**.
- **Status:** **READY FOR COUNSEL**.
- **READY FOR EXTERNAL LEGAL REVIEW:** `YES`.
- **READY TO PUBLISH:** `NO`.
- **READY TO ACTIVATE ROUTE B WRITES:** `NO`.
- **LEGAL GATE:** **OPEN**.
- **RB3 technical design:** **CLOSED / PASS**.
- **RB3 build:** **BLOCKED BY LEGAL GATE**.
- **Canonical package:** `docs/route-b/PE_PRIVACY_V1_LEGAL_REVIEW_PACK_V2.md`.
- **No functional changes:** frontend, backend, Supabase, migrations, Edge Functions, CRM and production remain unchanged.
- **Legal items still open:** retention legal validation; Supabase/Lovable legal role; processor/subprocessor wording; transfers/international processing; hosting analytics `/~flock.js`; `session-id` classification; Cloudflare `__cf_bm` disclosure; cookie/storage classification; consent copy validation; ARCO/revocation final procedure.
- **Not reopened:** responsible, domicile, ARCO email, privacy URL, privacy version, marketing deferred, `public_request_type` and the RB3 technical design.

### Open gates

1. **RB3 WRITE INTEGRATION / ROUTE B FUNCTIONAL CONTRACT** — **BLOCKED BY LEGAL GATE**. The technical design and migration specification are closed; implementation remains inactive until the legal blockers listed below are closed.
2. **REGALOS EJECUTIVOS PUBLIC INVENTORY**.

3. **RB3 LEGAL GATE** — final legal approval of `PE-PRIVACY-V1`; publication of `/aviso-de-privacidad`; retention; Supabase/Lovable role; processor/subprocessor wording; transfers/international processing; hosting analytics `/~flock.js`; `session-id`; Cloudflare `__cf_bm`; cookies/storage; consent copy; and ARCO/revocation procedure.

4. **D-013 / CHK-BRAND-WEB-1** permanece **OPEN** y debe cerrarse antes del lanzamiento público, promoción activa, campañas de adquisición o escalamiento significativo de tráfico. Este estado no bloquea la operación comercial controlada ni la preparación documental.

La gobernanza specialist vigente conserva `pe-specialist-orchestrator`, `pe-evidence-claims`, `pe-brand-strategist`, `pe-b2b-buyer-jtbd`, `pe-ux-cro-architect`, `pe-conversion-copy-chief`, `pe-visual-image-director` y `pe-google-ads-intent-miner`. El `SPECIALIST PRE-FLIGHT` es obligatorio antes de cada nueva fase, checkpoint, auditoría, investigación, diseño, copy, preparación de Build o campaña. Se mantiene la regla **NO DEPENDER DE RECORDATORIOS DEL PROPIETARIO**.

No es un rediseño estético aislado: debe partir de la historia y posicionamiento reales, el nuevo modelo de negocio, PromoPro B2B, las líneas estándar y de kits/soluciones, la estrategia de marketing, el mercado y la competencia mexicana, datos históricos de Google Ads/GA4 cuando sean útiles, Super Agente y Pricing de Conversión. El gate no bloquea la operación interna, la atención comercial controlada, la validación y cierre de brechas de `CHK-AI-SALES-1`, QA, CRM ni Pricing shadow.

## Alcance y límites

El cierre registrado aquí cubre la preparación, activación, alineación y QA final descritos para las Fases 1 a 4. No autoriza cambios adicionales en código, Supabase, Lovable, configuración, despliegues o publicaciones.

## Siguiente checkpoint recomendado

`CHK-AI-SALES-4` está **CERRADO / PASS** con inteligencia comercial inicial estructurada y E2E contextual QA. `CHK-AI-SALES-5` está **CLOSED / PASS** para el E2E visual QA controlado del 2026-09-29; el alcance, evidencia, autoridades y límites están registrados en `docs/10_QA_EVIDENCE.md`. `CHK-BRAND-WEB-B1` está **CLOSED / PASS** para Header + Hero, `CHK-BRAND-WEB-B2` está **CLOSED / PASS** para Home Categories y cinco mappings de taxonomía runtime, `CHK-BRAND-WEB-B3` está **CLOSED / PASS** para Home Solutions, navegación `Soluciones` y el fix de scroll móvil, y `CHK-BRAND-WEB-B4` está **CLOSED / PASS** para Cómo funciona, Confianza, FAQ y CTA final. `PUBLICATION RIGHTS` para assets ForPromotional / 4Promotional está **CLOSED / PASS** por confirmación amplia del propietario y `HERO FINAL ASSET` está **CLOSED / PASS** con `T150`; Route B, inventario público de Regalos ejecutivos y `D-013 / CHK-BRAND-WEB-1` continúan abiertos. Estos cierres no equivalen a cerrar `BRAND-WEB-1` ni autorizan publicación o lanzamiento. El piloto no se despliega ni se expone al público, los perfiles de empresa no son todavía un producto CRM general y no se ha validado escritura CRM anónima. `CHK-BRAND-WEB-1` continúa como gate obligatorio antes del lanzamiento público. Antes de activar Pricing debe definirse y validarse la canasta competitiva, aprobar parámetros y autorizar un checkpoint posterior.

Hasta contar con ese checkpoint no se debe retirar el backend Legacy ni iniciar trabajo funcional fuera del alcance comercial.

# Fase 4 — QA funcional final post-migración CatalogView V2 (histórico)

**Estado: CERRADA / APROBADA.**

## Resultado de QA

- QA aprobado: 20/20 pruebas PASS.
- Cero leads creados.
- Cero cambios estructurales.
- Sin cambios en código.
- Sin cambios en backend/Supabase estructural.
- Sin cambios en migraciones.
- Sin cambios en RLS.
- Sin cambios en grants.
- Sin cambios en secrets.
- Sin cambios en Edge Functions.
- Sin deploy.
- Sin publish.
- Sin rollback.

## Release y generación

- Release V2 vigente: `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b`.
- Generación origen: `818d824a…`.

## Catálogo

- 992 productos visibles.
- 24 tarjetas iniciales.
- 42 páginas.
- Búsqueda funcionando.
- Categorías funcionando.
- Subcategorías funcionando.
- Filtro ecológico funcionando.
- Paginación funcionando.

## Precios

- El listado usa V2.
- La ficha usa V2.
- El carrito usa V2.
- El precio de listado, ficha y carrito es consistente.
- La cantidad mínima es visible.
- Los productos sin precio muestran “Precio a cotizar”.

## Estado Supabase validado en QA

- `catalog_price_cache` Legacy intacto con 1,524 filas.
- La release V2 sigue `is_current`.
- `catalog_price_v2_current_prices`: 1,524 filas.
- Shadow: 3,048 filas.
- Releases: 1.

## Legacy y rollback

- Legacy sigue disponible como respaldo.
- Legacy no debe retirarse todavía.
- Rollback disponible.
- Rollback no ejecutado.

## Observaciones no bloqueantes

1. Los 18 productos `request_quote` de V2 no son visibles públicamente por falta de stock; el estado público real expuesto es `unavailable`.
2. Algunas imágenes externas de G4 devuelven 403 por hotlink; el fallback de imagen funciona.
3. Persisten warnings React preexistentes:
   - `forwardRef` en `AssistantWidget`.
   - `fetchPriority` en `SafeProductImage`.

## Estado después de Fase 4

- Pricing V2 backend activo.
- Release V2 activa.
- `CatalogView` alineado a V2.
- Ficha y carrito alineados a V2.
- QA funcional final aprobado.
- Legacy conservado como respaldo.
- En ese momento todavía no se debía hacer merge a `main`; esa decisión histórica quedó superada por el merge controlado `6ac668a`.
- No retirar Legacy todavía.
- En ese momento no se debían iniciar nuevas funcionalidades hasta cerrar el checkpoint documental de Fase 4; Fase 4 ya quedó cerrada y CHK-COM-6 es el checkpoint vigente más reciente.

## Siguiente checkpoint recomendado (histórico)

Checkpoint documental Fase 4:

1. Revisar el diff de `docs/MASTER-STATE.md`.
2. Crear el commit documental.
3. Autorizar el push.
4. Después decidir entre:
   - merge controlado a `main`;
   - QA adicional en producción;
   - backlog de deuda técnica no bloqueante.

# Checkpoint QA pre-merge

**Estado: CERRADO / APROBADO.**

## Evidencia

- Rama validada: `feat/v2-cutover-preparation`.
- HEAD validado: `02c3f00`.
- Sync remoto/local: `0 0`.
- Working tree: limpio.
- `CatalogView` usa `catalog_search_products_v2`.
- `docs/MASTER-STATE.md` contiene Fase 4, QA funcional 20/20, release V2, generación, Legacy y rollback.
- Diff contra base `4084872`:
  - `A docs/MASTER-STATE.md`
  - `M src/components/CatalogView.tsx`
- Diff contra `main` revisado:
  - cambios esperados de Pricing V2 backend;
  - cambios esperados de ficha, carrito y solicitud;
  - cambios esperados de CatalogView V2;
  - migraciones y QA SQL versionados;
  - estado maestro documental.

## Restricciones confirmadas

- No se hicieron cambios de código.
- No se tocó Supabase.
- No se hizo rollback.
- No se hizo deploy.
- No se hizo merge.
- No se hizo push.
- No se inició nueva funcionalidad.

## Resultado

- QA pre-merge aprobado.
- Siguiente paso autorizado, después de cerrar este checkpoint documental: preparar merge controlado a `main`.

# Checkpoint merge controlado a main

**Estado: CERRADO / APROBADO.**

## Evidencia

- Rama destino: `main`.
- Rama origen: `feat/v2-cutover-preparation`.
- Merge realizado como fast-forward.
- `main` avanzó de `f71934a` a `930f36d`.
- Push a `origin/main` exitoso.
- Sync final `origin/main...main`: `0 0`.
- Working tree limpio.
- HEAD final de `main`: `930f36d`.

## Resultado

- Pricing V2 backend versionado quedó integrado en `main`.
- Release V2 activa queda documentada.
- CatalogView V2 quedó integrado en `main`.
- Ficha y carrito V2 quedaron integrados en `main`.
- QA funcional Fase 4 quedó integrado en `main`.
- QA pre-merge quedó integrado en `main`.
- Legacy permanece disponible como respaldo.
- Rollback permanece disponible y no ejecutado.
- No se retiró Legacy.
- No se hizo deploy manual.
- No se modificó Supabase durante el merge.
- No se inició nueva funcionalidad.

## Estado posterior

- `main` es ahora la rama oficial con Pricing V2 + CatalogView V2.
- `feat/v2-cutover-preparation` puede conservarse temporalmente como referencia histórica.
- Cualquier siguiente cambio requiere un checkpoint nuevo.

# Checkpoint QA post-merge en main

**Estado: CERRADO / APROBADO.**

## Evidencia

- Rama validada: `main`.
- HEAD validado: `f0f1cdc`.
- Sync `origin/main...main`: `0 0`.
- Working tree: limpio.
- Git local configurado como `mktoken <mktoken@users.noreply.github.com>`.
- `CatalogView` usa `catalog_search_products_v2`.
- `docs/MASTER-STATE.md` contiene el cierre del merge controlado a `main`.

## Resultado

- `main` quedó estable después del merge y del commit documental.
- Pricing V2 + CatalogView V2 permanecen integrados en `main`.
- Legacy permanece disponible como respaldo.
- Rollback permanece disponible y no ejecutado.
- No se tocó Supabase.
- No se hizo deploy.
- No se inició nueva funcionalidad.

## Estado posterior

- `main` es la rama oficial vigente.
- HEAD oficial documentado: `f0f1cdc`.
- Cualquier cambio posterior requiere checkpoint nuevo.

---

# Checkpoint QA visual preview frontend-only

Estado: VALIDADO / PASS.

Fecha: 2026-09-16
Rama: feat/quote-preview-frontend-only
Commit validado: 8fb08fdcc0282d2f2284acf0b719f38742d18650

QA visual local aprobado en http://127.0.0.1:5174.

Evidencia: catálogo 992 productos; producto GOMA; cantidad 834; color Blanco; personalización Logo a 1 tinta; precio $1,501.20; formato Cotizar productos por separado.

La preview mostró el aviso “Estimación antes de IVA e impresión”, conservó datos al volver a editar y mostró el botón final “Enviar solicitud de cotización”.

Restricción crítica: el botón final no fue presionado y no se crearon leads reales.

Sin cambios en Supabase, migraciones, RLS, grants, secrets, Edge Functions, deploy, publish ni merge.

Consola sin fallos funcionales. Advertencias no bloqueantes: React Router future flags, Radix Dialog accessibility warning y React fetchPriority.

Veredicto: PASS. Checkpoint validado y listo para cierre documental.

## Cierre formal

Estado: CERRADO / APROBADO.

Fecha: 2026-09-16
Rama: feat/quote-preview-frontend-only
HEAD de cierre previo: cc5da36

El checkpoint preview frontend-only cumplió el ciclo: Construido → validado → estado maestro actualizado → commit documental → push sincronizado.

No se presionó el botón final.
No se crearon leads reales.
No se modificó Supabase.
No hubo deploy, publish ni merge.

# QA post-merge main preview frontend-only

Estado: VALIDADO / PASS.

Fecha: 2026-09-16
Rama: main
HEAD validado: ea26c89

Se validó que main quedó sincronizada después del merge del checkpoint preview frontend-only.

Evidencia:

- origin/main...main: 0 0
- working tree limpio
- docs/MASTER-STATE.md contiene el checkpoint QA visual preview frontend-only y su cierre CERRADO / APROBADO
- QuoteCartView contiene `type QuoteStep = "selection" | "form" | "preview" | "success"`
- QuoteCartView contiene “Previsualización de solicitud”
- QuoteCartView contiene “Previsualizar solicitud”
- QuoteCartView contiene “Enviar solicitud de cotización”
- git diff --check sin errores

No se ejecutó envío final.
No se crearon leads reales.
No se modificó Supabase.
No hubo deploy, publish ni merge adicional.

Veredicto: PASS. Main queda estable después del merge del checkpoint preview frontend-only.

# Checkpoint observaciones por producto frontend-only

Estado: CERRADO / APROBADO.

Fecha: 2026-09-16
Rama: feat/quote-item-observations-frontend-only
Commit validado: 6480dd6

Alcance:
Se agregó un campo frontend-only de observaciones por producto en el flujo público de cotización.

Validación técnica:

- bun run test: PASS, 37 tests.
- bunx eslint src/components/QuoteCartView.tsx: PASS.
- bun run build: PASS.
- git diff --check: PASS.
- bun run lint global: FAIL por errores/advertencias preexistentes fuera del archivo trabajado; QuoteCartView.tsx sin errores.

Validación visual:

- La observación apareció en preview.
- La observación se conservó al volver a editar.
- Al eliminar GOMA del carrito local, GOMA ya no apareció.
- La observación asociada ya no apareció.
- No se presionó “Enviar solicitud de cotización”.
- No se creó ningún lead real.

Restricciones cumplidas:

- No se modificó Supabase.
- No se modificaron migraciones.
- No se modificó RLS, grants, secrets ni Edge Functions.
- No se modificó QuoteRequestItem.
- No se modificó buildQuoteRequestItems.
- No se modificó submitPublicQuoteRequest.
- No se modificó src/pages/Index.tsx.
- No hubo deploy, publish ni merge.

Veredicto: PASS. Checkpoint validado y cerrado en rama, pendiente de commit documental y posterior merge controlado a main.

# QA post-merge main observaciones por producto frontend-only

Estado: VALIDADO / PASS.

Fecha: 2026-09-16
Rama: main
HEAD validado: 0023f97

Se validó que main quedó sincronizada después del merge del checkpoint observaciones por producto frontend-only.

Evidencia:

- origin/main...main: 0 0
- working tree limpio
- docs/MASTER-STATE.md contiene el checkpoint observaciones por producto frontend-only y su cierre CERRADO / APROBADO
- QuoteCartView contiene observationsByCartId
- QuoteCartView contiene “Observaciones del producto”
- QuoteCartView contiene maxLength={500}
- QuoteCartView contiene whitespace-pre-wrap
- QuoteCartView conserva el botón “Enviar solicitud de cotización”
- bun run test: PASS, 37 tests
- bunx eslint src/components/QuoteCartView.tsx: PASS
- bun run build: PASS
- git diff --check: PASS

Advertencias no bloqueantes:

- Browserslist desactualizado
- Chunk JS mayor a 500 kB

Restricciones cumplidas:

- No se presionó envío final
- No se crearon leads reales
- No se modificó Supabase/backend
- No hubo deploy, publish ni merge adicional

Veredicto: PASS. Main queda estable después del merge del checkpoint observaciones por producto frontend-only.

# Sub-checkpoint 1 observaciones por producto — persistencia backend compatible

Estado: BUILD COMPLETADO / VALIDACIÓN SQL REAL PENDIENTE.

Fecha: 2026-09-17
Rama: feat/quote-item-observations-backend
Commit build: 4aee0af

Alcance construido:

- Nueva migración: `supabase/migrations/20260917090000_persist_quote_item_observations.sql`
- QA SQL actualizado: `supabase/qa/public_quote_v2_backend_expand_integration.sql`

Cambios previstos:

- RPC `submit_public_quote_request` acepta `observation` opcional dentro de `p_items`.
- `observation` ausente, `null` o string válido.
- Tipos inválidos se rechazan con `observation_must_be_string`.
- Más de 500 caracteres se rechaza con `observation_too_long`.
- El string se normaliza con `btrim`.
- El string vacío se trata como ausente.
- La observación válida se persiste como `observacion` dentro de `articulos_cotizados`.
- No se cambia la firma RPC.
- No se cambian tablas, columnas, RLS ni grants.

Validación realizada:

- `git diff --check`: PASS.
- Revisión estática de migración: PASS.
- Revisión estática de QA SQL: PASS.
- Rama sincronizada con `origin/feat/quote-item-observations-backend`.

Validación pendiente:

- Aplicar migración en PostgreSQL/Supabase seguro.
- Ejecutar QA SQL transaccional.
- Confirmar compilación de RPC.
- Confirmar persistencia real en `articulos_cotizados`.
- Confirmar idempotencia.
- Confirmar rollback.

Bloqueo:
No existen actualmente Supabase CLI, `psql`, Docker ni base PostgreSQL local disponible. No se debe ejecutar contra producción.

Ruta segura recomendada:
Validar en Supabase local con Docker/CLI o en proyecto Supabase staging/descartable.

Restricciones cumplidas:

- No frontend.
- No CRM.
- No deploy.
- No publish.
- No merge.
- No producción.
- No leads reales.

Veredicto: no cerrar como PASS todavía. El sub-checkpoint queda pausado hasta contar con entorno SQL seguro.

# Regla operativa Lovable / GitHub

Estado: VIGENTE.

Fecha: 2026-09-17

Regla:
Nunca asumir que Lovable está en la rama correcta solo porque la rama existe en GitHub o porque fue mencionada en un prompt.

Antes de usar Lovable para analizar, construir, validar o ejecutar algo:

1. Verificar la rama activa en Terminal/GitHub.
2. Verificar visualmente la rama seleccionada dentro de Lovable.
3. Confirmar que ambas coinciden exactamente.
4. Presionar Re-check en Lovable.
5. Solo entonces usar Lovable.
6. Si Lovable no muestra la rama correcta, no usar Lovable para ese checkpoint.

Regla crítica:
El prompt no cambia la rama de Lovable. El selector de rama de Lovable manda.

Motivo:
Se detectó que GitHub/Terminal estaban en `feat/quote-item-observations-backend`, pero Lovable seguía apuntando a `feat/v2-cutover-preparation`. Por lo tanto, desde ahora queda prohibido asumir sincronía entre GitHub y Lovable sin verificación visual.

# Sub-checkpoint 1 observaciones por producto — validación SQL real

Estado: VALIDADO / PASS.

Fecha: 2026-09-17
Rama: feat/quote-item-observations-backend
Commit build: 4aee0af
Commit documental previo: e15e67d
Commit regla operativa Lovable/GitHub: 47236e1

Validación ejecutada:
Se aplicó la migración `supabase/migrations/20260917090000_persist_quote_item_observations.sql` en la base actual del proyecto.

Resultado:

- Migración: PASS.
- RPC activa: `public.submit_public_quote_request(uuid, jsonb, text, jsonb)`.
- La RPC compila.
- La RPC contiene validación `observation`.
- La RPC persiste observación válida como `observacion` dentro de `articulos_cotizados`.
- QA transaccional: PASS.
- Resultado QA: PASS / `transaction_will_rollback`.
- El QA terminó con `ROLLBACK`.
- Conteo `cotizaciones_leads`: inicial 20, final 20.
- Correos `qa+%@example.test`: inicial 0, final 0.
- Release V2 vigente conservada: `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b`.
- Generación V2 vigente: `818d824a-ff5d-4b66-a9c1-6cac56d4c4d5`.
- Rollback requerido: no.
- Errores: ninguno.

Restricciones cumplidas:

- No se modificaron tablas.
- No se modificaron columnas.
- No se modificó RLS.
- No se modificaron grants.
- No se modificó frontend.
- No hubo deploy.
- No hubo publish.
- No hubo merge.
- No se crearon datos persistentes de QA.

Notas:

- La validación se ejecutó sobre la base actual del proyecto porque Lovable confirmó que no existe entorno staging/preview separado.
- La web no está en uso real ni comercial, por lo que el riesgo operativo fue aceptado como bajo.
- El respaldo de la RPC anterior fue capturado antes de aplicar la migración.
- No fue necesario restaurar rollback.

Veredicto:
PASS. Sub-checkpoint 1 validado y listo para cierre documental. La rama todavía no debe considerarse integrada a main hasta completar commit documental, push y merge controlado.

# QA post-merge main — observaciones backend compatible

Estado: VALIDADO / PASS.

Fecha: 2026-09-17
Rama: main
HEAD validado: 71ef148

Evidencia Git:

- `origin/main...main: 0 0`.
- Working tree limpio.
- `git diff --check`: PASS.

Evidencia documental:

- MASTER-STATE contiene Sub-checkpoint 1 observaciones por producto.
- MASTER-STATE contiene Estado: VALIDADO / PASS.
- MASTER-STATE contiene Commit build: 4aee0af.
- MASTER-STATE contiene Regla operativa Lovable / GitHub.

Evidencia técnica:

- Migración presente: `supabase/migrations/20260917090000_persist_quote_item_observations.sql`.
- La migración contiene `CREATE OR REPLACE FUNCTION public.submit_public_quote_request`.
- La migración contiene `observation_must_be_string`.
- La migración contiene `observation_too_long`.
- La migración persiste `observacion` dentro de `articulos_cotizados`.
- QA SQL contiene pruebas de `observation`, `observacion` e `idempotency_key_conflict`.

Resultado previo de validación SQL real:

- Migración: PASS.
- QA transaccional: PASS.
- Conteo `cotizaciones_leads`: 20 → 20.
- Correos `qa+%@example.test`: 0 → 0.
- Release V2 vigente conservada: `2738c0e4-308e-45cd-ba7e-32f2f37c9c6b`.
- Rollback requerido: no.

Nota de control:
Durante la validación, Lovable empujó commits fuera de alcance a la misma rama. Se creó respaldo local `backup/lovable-observations-backend-0dfb9e1`, se verificó que la migración de Lovable era funcionalmente igual salvo salto de línea final, y se restauró la rama remota controlada con `--force-with-lease`.

Veredicto:
PASS. Main queda sincronizado y estable después del merge del Sub-checkpoint 1 backend compatible.

# Regla operativa Lovable — commits automáticos

Estado: VIGENTE.

Fecha: 2026-09-17

Regla:
Lovable puede generar commits, registros, planes o cambios aun cuando el prompt indique “no modificar”, “no hacer commit” o “solo plan”.

Implicación:
No se debe asumir que Lovable respetó el alcance únicamente por el texto del prompt. Después de usar Lovable siempre se debe revisar Git antes de continuar.

Verificación obligatoria después de usar Lovable:

- `git fetch origin`
- `git status --short`
- `git rev-list --left-right --count origin/<rama>...<rama>`
- `git log` comparativo si aparece divergencia
- Revisar archivos modificados antes de pull, merge, rebase o push

Regla crítica:
Si Lovable empuja commits fuera de alcance, no hacer pull automático. Primero auditar, respaldar si aplica y decidir reconciliación controlada.

# Sub-checkpoint 2 observaciones por producto — transporte frontend hacia RPC

Estado: VALIDADO / PASS.

Fecha: 2026-09-17
Rama: feat/quote-item-observations-frontend-transport
Base: main 5a67f18

Objetivo:
Transportar la observación capturada por producto desde QuoteCartView hacia el payload real enviado a la RPC como observation dentro de p\_items.

Cambios:

- QuoteRequestItem ahora acepta observation?: string.
- buildQuoteRequestItems acepta observationsByCartId opcional.
- La observación se asocia por cartId.
- Se aplica trim().
- Se limita defensivamente a 500 caracteres.
- Se omiten observaciones vacías o compuestas solo por espacios.
- Se conserva whitelist estricta del builder.
- No se transportan notes, note ni comment.
- QuoteCartView construye requestItems usando buildQuoteRequestItems(cart, observationsByCartId).
- useMemo incluye observationsByCartId en dependencias.
- submitPublicQuoteRequest no requirió cambio funcional.
- quote-request-id.ts no requirió cambio funcional.

Validación automatizada:

- bun run test: PASS.
- Test dirigido de fingerprint: PASS.
- ESLint selectivo: PASS.
- bun run build: PASS.
- git diff --check: PASS.

QA visual local:

- Observación multilinea aparece en preview: sí.
- Persiste al volver a editar: sí.
- Botón final correcto “Enviar solicitud de cotización”: sí.
- No se presionó envío final: sí.
- Producto eliminado: sí.
- Observación desaparece al eliminar producto: sí.
- Errores visibles: no.

Restricciones cumplidas:

- No Supabase.
- No migraciones.
- No SQL.
- No CRM.
- No Index.tsx.
- No deploy.
- No publish.
- No Lovable.
- No leads reales.

Veredicto:
PASS. El frontend ya transporta observation hacia el payload real de la RPC, sin crear datos reales durante QA.

# QA post-merge main — observaciones frontend transport

Estado: VALIDADO / PASS.

Fecha: 2026-09-17
Rama: main
HEAD validado: 9de4d24

Evidencia Git:

- origin/main...main: 0 0.
- Working tree limpio.
- git diff --check: PASS.

Evidencia automatizada:

- bun run test: PASS.
- Tests: 35/35 PASS.
- bun run build: PASS.
- Advertencias build conocidas: Browserslist desactualizado y chunk mayor a 500 kB.

Evidencia funcional:

- QuoteRequestItem incluye observation?: string.
- QuoteCartView construye requestItems usando buildQuoteRequestItems(cart, observationsByCartId).
- MASTER-STATE contiene Sub-checkpoint 2 observaciones por producto.
- MASTER-STATE contiene Estado: VALIDADO / PASS.
- El frontend transporta observation hacia el payload real de la RPC.

QA visual previo:

- Observación multilinea aparece en preview: sí.
- Persiste al volver a editar: sí.
- Botón final correcto: sí.
- No se presionó envío final: sí.
- Producto eliminado: sí.
- Observación desaparece al eliminar producto: sí.
- Errores visibles: no.

Restricciones cumplidas:

- No Supabase.
- No migraciones.
- No SQL.
- No CRM.
- No Index.tsx.
- No deploy.
- No publish.
- No Lovable.
- No leads reales.

Veredicto:
PASS. El Sub-checkpoint 2 queda integrado en main, validado y listo para cierre documental final.

# Sub-checkpoint 3 observaciones por producto — validación E2E real controlada

Estado: VALIDADO / PASS.

Fecha: 2026-09-17
Rama: main
HEAD validado: 18aaf36

Objetivo:
Validar extremo a extremo que la observación capturada en frontend viaja como observation hacia la RPC y queda persistida como observacion dentro de cotizaciones_leads.articulos_cotizados.

Lead QA:

- Lead id: 7ac53ce1-f35b-4fc9-8f8c-0d1813da9be2
- public_request_id: af21d112-2756-4c7e-8c7d-c34c9c49794c
- Email QA: qa.subcheckpoint3.20260917@example.test
- Nombre: QA Sub-checkpoint 3
- Teléfono: 5550000003
- Producto enviado: GOMA
- Productos enviados: 1
- Lead QA conservado como evidencia.

Observación validada:
QA-SC3-20260917 | Observación E2E: guardar en cotizaciones_leads.articulos_cotizados.observacion.

Evidencia funcional:

- La observación apareció en previsualización antes del envío.
- Se presionó una sola vez “Enviar solicitud de cotización”.
- El lead fue creado desde main HEAD 18aaf36.
- La referencia visible correspondió al lead id.

Evidencia SQL read-only:

- SELECT de lectura confirmó el registro QA.
- articulos_cotizados->0->>'observacion' contiene exactamente la observación esperada.
- COUNT por email QA devolvió total = 1.
- No hay duplicados para el email QA.

Restricciones cumplidas:

- No SQL de escritura.
- No UPDATE.
- No DELETE.
- No INSERT manual.
- No migraciones.
- No modificación de RPC.
- No modificación de frontend.
- No releases alteradas.
- No deploy.
- No publish.
- No commits automáticos de Lovable.
- Lead QA no borrado.

Veredicto:
PASS. El flujo E2E queda validado: textarea frontend → requestItems[].observation → RPC → cotizaciones_leads.articulos_cotizados[0].observacion.

# AUTH-1 — cambio de contraseña desde Mi perfil

Estado: VALIDADO / PASS.

Fecha: 2026-09-18
Rama: main
Commit funcional: 2dd399a

Objetivo:
Permitir que el usuario autenticado cambie su propia contraseña desde CRM > Mi perfil usando Supabase Auth.

Cambios:

- Se agregó tarjeta “Cambiar contraseña” en Mi perfil.
- Se agregaron campos Nueva contraseña y Confirmar nueva contraseña.
- Se agregó validación de requeridos, mínimo 8 caracteres y coincidencia.
- Se usa supabase.auth.updateUser({ password }).
- Se limpia el formulario al éxito.
- Se muestran mensajes de éxito/error sin exponer contraseñas.
- No se modifican perfiles, roles ni usuarios manualmente.

Validación técnica:

- bun run test: PASS.
- password-validation.test.ts: 7/7 PASS.
- bun run build: PASS.
- git diff --check: PASS.

Validación funcional publicada:

- AUTH-1 fue publicado en el CRM.
- El usuario admin accedió a Mi perfil.
- El usuario definió una nueva contraseña.
- El usuario cerró sesión e inició sesión nuevamente con la nueva contraseña.
- Login posterior: PASS.

Restricciones cumplidas:

- No SQL.
- No migraciones.
- No roles.
- No creación de usuarios.
- No service role.
- No exposición de contraseña.
- No cambios de contraseña de otros usuarios.

Veredicto:
PASS. AUTH-1 queda cerrado y permite recuperar acceso local/CRM mediante una contraseña conocida por el usuario.

# Sub-checkpoint 4 observaciones por producto — visualización en CRM

Estado: VALIDADO / PASS.

Fecha: 2026-09-18
Rama: main
Commit funcional: 1886234

Objetivo:
Mostrar en el detalle interno del CRM la observación capturada por producto y persistida como articulos_cotizados[].observacion.

Cambios:

- ArticuloSafe ahora incluye observation: string | null.
- parseArticulos lee primero el campo canónico observacion.
- parseArticulos acepta observation como compatibilidad si falta observacion.
- parseArticulos normaliza valores vacíos o no string a null.
- CotizacionDetail muestra “Observación del cliente” solo cuando existe.
- El texto usa whitespace-pre-wrap para conservar saltos de línea.
- La observación aparece dentro de la tarjeta del producto.
- No se modificó PDF formal.
- No se modificó CSV.
- No se modificaron rutas públicas.
- No se modificó Supabase, RPC ni migraciones.

Validación técnica:

- bun run test: PASS.
- Tests generales: 35/35 PASS.
- cotizacion-format.test.ts: 7/7 PASS.
- bun run build: PASS.
- git diff --check: PASS.

QA visual:

- Detalle del lead QA abre: sí.
- Producto GOMA visible: sí.
- Etiqueta “Observación del cliente” visible: sí.
- Texto coincide exactamente con la observación E2E SC3: sí.
- Ubicación correcta dentro de la tarjeta del producto GOMA y antes de Notas internas: sí.
- Errores visibles: no.
- Consola: sin errores, solo warnings informativos de React Router.
- No se modificaron archivos ni datos durante QA.

Lead QA usado:

- Lead id: 7ac53ce1-f35b-4fc9-8f8c-0d1813da9be2.
- Email QA: qa.subcheckpoint3.20260917@example.test.
- Producto: GOMA.
- Observación: QA-SC3-20260917 | Observación E2E: guardar en cotizaciones_leads.articulos_cotizados.observacion.

Restricciones cumplidas:

- No SQL.
- No leads nuevos.
- No deploy.
- No publish.
- No Lovable.
- No migraciones.
- No RPC.
- No PDF formal.
- No CSV.

Veredicto:
PASS. El CRM interno ya muestra la observación del cliente por producto usando el dato persistido en articulos_cotizados[].observacion.

# Regla operativa Supabase / Lovable

Estado: VIGENTE.

Fecha: 2026-09-18

Regla:
En este proyecto, Supabase debe tratarse como integrado/interno dentro de Lovable.

Implicaciones:

- No asumir acceso externo directo a supabase.com/dashboard.
- No asumir Supabase CLI.
- No pedir service role.
- No pedir credenciales externas de Supabase.
- No ejecutar acciones fuera de Lovable salvo que Lovable abra explícitamente un acceso integrado.
- Para Auth, Database, SQL o configuración, primero buscar dentro de Lovable: Emotional Promos Hub → Cloud / Database / Auth / Settings.

Regla crítica:
Si Lovable no expone una configuración de Supabase, se debe documentar el bloqueo antes de proponer rutas externas o cambios de arquitectura.

Motivo:
Durante AUTH-2 se asumió incorrectamente acceso externo directo a Supabase dashboard para revisar Auth URL Configuration. Esa suposición no aplica como ruta principal en este proyecto.

# AUTH-2A — Recuperación de contraseña desde Login

Estado: VALIDADO / PASS.

Fecha: 2026-09-18
Rama: main
Commit funcional: c4df8f8

Implementado:

- Enlace “¿Olvidaste tu contraseña?” en /login.
- Solicitud mediante supabase.auth.resetPasswordForEmail().
- Respuesta neutral para evitar enumeración de cuentas.
- Redirect a /auth/update-password.
- Contraseña mínima de 8 caracteres y confirmación.
- Actualización mediante supabase.auth.updateUser().
- Acceso directo sin recuperación válida bloqueado.

Validación:

- QA local: PASS.
- Tests generales: 35/35 PASS.
- Tests específicos AUTH-2/AUTH-1: 12/12 PASS.
- Build: PASS.
- git diff --check: PASS.
- Integración a main mediante fast-forward: PASS.

Restricciones durante AUTH-2A:

- No SQL, migraciones ni service role.
- No cambios de roles ni usuarios.
- No acceso externo directo a Supabase.
- No correo real ni cambio real de contraseña.
- No deploy/publish.

# AUTH-2B — Recuperación real por correo

Estado: VALIDADO / PASS — E2E REAL EN PRODUCCIÓN.

Fecha: 2026-09-19
Dominio validado: https://articulospromocionales.vip

Validación E2E real:

- La prueba se realizó sobre la versión publicada usando la cuenta real de administración autorizada.
- La opción “¿Olvidaste tu contraseña?” estuvo visible en Login.
- El primer intento mostró un error transitorio: “No se pudo procesar la solicitud. Intenta nuevamente.”
- Un reintento posterior fue aceptado y mostró el mensaje neutral: “Si el correo existe, recibirás instrucciones para recuperar tu contraseña.”
- Se recibió el correo real de recuperación de Emotional-Promos-Hub, enviado desde `no-reply@auth.lovable.cloud`, con asunto “Password Recovery” y botón “Reset Password”.
- El enlace del correo redirigió correctamente a `https://articulospromocionales.vip/auth/update-password`.
- El formulario de actualización permitió establecer una nueva contraseña sin exponerla en pantalla, mensajes ni URL.
- Se confirmó “Contraseña actualizada. Ya puedes iniciar sesión.”
- El inicio de sesión posterior con la nueva contraseña fue exitoso.
- El acceso al CRM fue exitoso y el rol ADMIN se conservó.

Configuración integrada observada en Lovable:

- Email sign-in activo.
- Site URL configurada como `https://promocionalesemocionales.lovable.app`.
- Redirect URLs relevantes configuradas para `https://articulospromocionales.vip/**` y `https://www.articulospromocionales.vip/**`, además de las gestionadas por Lovable.

Restricciones cumplidas:

- No se usó Supabase externo.
- No se usó Supabase CLI ni service role.
- No se ejecutó SQL.
- No se modificaron tablas, roles, profiles ni usuarios manualmente.
- No se creó ningún usuario adicional.
- No se generó código nuevo durante la validación.
- No se hizo deploy ni publish durante la validación.
- No se documentó ninguna contraseña ni secreto.

Resultado:

PASS. AUTH-2B queda validado mediante recuperación real por correo, actualización real de contraseña, reingreso exitoso y acceso confirmado al CRM.

# AUTH-2 — Recuperación de contraseña

Estado: CERRADO / PASS.

- AUTH-2A: VALIDADO / PASS — implementación y QA local.
- AUTH-2B: VALIDADO / PASS — E2E real en producción.
- Flujo completo: Login → correo real → enlace de recuperación → actualización de contraseña → nuevo Login → CRM.
- El rol ADMIN permaneció intacto.
- La regla operativa Supabase / Lovable se mantiene vigente.

La regla operativa vigente se conserva: Supabase se trata como integrado/interno dentro de Lovable; no se usa supabase.com, Supabase CLI ni service role como ruta operativa.

## PE SPECIALIST GOVERNANCE V1

Estado: VIGENTE.

- Existen 7 Skills especialistas y 1 Skill orquestador para el trabajo de Promocionales Emocionales: `pe-evidence-claims`, `pe-brand-strategist`, `pe-b2b-buyer-jtbd`, `pe-ux-cro-architect`, `pe-conversion-copy-chief`, `pe-visual-image-director`, `pe-google-ads-intent-miner` y `pe-specialist-orchestrator`.
- El `SPECIALIST PRE-FLIGHT` es obligatorio antes de iniciar cualquier nueva fase, checkpoint, investigación, diseño, copy, preparación de Build, campaña o auditoría relevante.
- Work debe consultar los Skills según el tipo de tarea; el orquestador designa lead/supporting specialists, recupera fuentes y decisiones canónicas, revisa dependencias, superficies protegidas y bloqueos, y detiene el trabajo si no existe readiness suficiente.
- Los Skills no pueden cambiar decisiones aprobadas, redefinir posicionamiento, aprobar claims sin evidencia, ordenar Build, publicar ni modificar repositorio, producción, Lovable o Supabase.
- Work coordina; Chat Principal integra; el propietario aprueba decisiones de negocio.
- Lovable construye únicamente checkpoints autorizados y dentro de su alcance aprobado.
- Se mantiene el principio operativo: **NO DEPENDER DE RECORDATORIOS DEL PROPIETARIO**. Las fuentes canónicas deben recuperar Skills, decisiones cerradas, checkpoints pendientes y superficies protegidas sin exigir que el propietario los recuerde.
