# ESTADO MAESTRO — EMOTIONAL PROMOS HUB

## Identidad de reentrada

- Repositorio: `mktoken/emotional-promos-hub`
- Rama maestra de continuación: `main`
- Commit funcional de CHK-COM-6: `a16ce79` — `feat: programar seguimiento en cotizaciones publicas`.
- `main` y `origin/main`: sincronizados `0 0` al cierre documental de CHK-COM-6.
- Working tree: limpio al cierre de `CHK-COM-6`.
- Push: realizado a `origin/main`.

## Estado de reentrada vigente — 2026-09-19

- `AUTH-2`: **CERRADO / PASS**. Recuperación de contraseña validada en producción.
- `CHK-COM-0`: **CERRADO / PASS**. Estado maestro alineado con `main` y `f1101ce`.
- `CHK-COM-1`: **CERRADO / PASS**. Solicitud pública QA aceptada en producción; referencia `4ee88798-969f-4aaa-a0a6-f294d9753ef4`, un producto, total estimado `$1,800 MXN`, modo de precio `v2`.
- `CHK-COM-2`: **CERRADO / PASS**. La oportunidad QA llegó al CRM con contacto, producto, cantidad, personalización, observación, modalidad, estado y total.
- `CHK-COM-3`: **CERRADO / PASS**. La solicitud QA se convirtió en cotización formal `COT-2026-00008`, en borrador, con partida, subtotal, IVA y total calculados correctamente.
- `CHK-COM-4`: **CERRADO / PARCIAL**. El vendedor puede ver contactos, cambiar estado y guardar notas internas; no hay próxima acción programable visible en esta oportunidad y no se registró historial de estado.
- `CHK-COM-5`: **CERRADO / PARCIAL**. El seguimiento programable existía en `Prospectos`, pero la oportunidad pública QA no estaba conectada a ese módulo.
- `CHK-COM-6`: **CERRADO / PASS**. Se agregó el seguimiento programable directamente a la oportunidad pública; la migración interna de Lovable/Supabase quedó aplicada y la función restringida al personal autenticado.
- Evidencia CHK-COM-6: en producción, la oportunidad QA `4ee88798-969f-4aaa-a0a6-f294d9753ef4` guardó el seguimiento para el 20/09/2026 a las 10:00, persistió después de recargar y posteriormente fue limpiado con PASS. La cotización formal `COT-2026-00008` permaneció en borrador y no se contactó al prospecto QA.
- Checkpoint actual: **CHK-COM-6 CERRADO / PASS**.
- Fase actual: **CORRECCIÓN DE SEGUIMIENTO VALIDADA**. El flujo cliente → CRM → cotización formal → seguimiento QA quedó comprobado en producción; no se declara aún la operación comercial completa hasta revisar los pendientes restantes.
- Próximo paso autorizado: definir el siguiente subcheckpoint comercial, sin iniciar trabajo adicional automáticamente.

Este documento es la fuente de verdad de reentrada del proceso Pricing V2 / CatalogView V2. Consolida la historia verificable en Git, los reportes históricos versionados y el estado operativo reportado desde Lovable/Supabase interno. No sustituye las pruebas funcionales pendientes ni convierte documentación histórica en evidencia de producción actual.

## Clasificación de evidencia

- **Confirmado por Git:** ramas, commits, archivos, diffs y código presente en este checkout.
- **Confirmado por Lovable/Supabase interno:** resultados operativos registrados en planes versionados; requieren nueva consulta en Lovable si se necesita certificar el estado actual.
- **Reporte histórico versionado:** dry run, shadow write y validaciones documentadas en `supabase/qa/`.
- **Pendiente de validación futura:** cualquier cambio posterior a este checkpoint; la QA funcional post-migración quedó cerrada en Fase 4.
- **Auditoría comercial 2026-09-19:** producción respondió; catálogo público comprobado con 992 productos, 15 categorías y precio autoritativo por cantidad. La solicitud QA fue aceptada con referencia `4ee88798-969f-4aaa-a0a6-f294d9753ef4`, recibida completa en CRM, convertida a `COT-2026-00008` en borrador y anotada internamente. CHK-COM-6 validó el seguimiento directamente en la oportunidad: guardado, persistencia tras recarga y limpieza QA, todo PASS. No se emitió ni envió al cliente.

## Estado Git y alcance

- Base histórica relevante: `4084872`.
- Commit de limpieza funcional: `94ed71f`.
- Commit documental local inicial: `5ad44a7`.
- El remoto está sincronizado en `94ed71f`.
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

Esos cambios fueron revertidos o excluidos del resultado funcional final. No forman parte del cambio autorizado de Fase 3. La limpieza quedó registrada en `94ed71f`; el diff funcional aceptado frente a `4084872` conserva únicamente `src/components/CatalogView.tsx`.

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
| Nueva funcionalidad | No iniciar sin nuevo checkpoint autorizado |

## Pendientes de control

### Pendiente inmediato

- Definir el siguiente subcheckpoint comercial a partir de los pendientes de la auditoría.
- Mantener Legacy y no iniciar correcciones ni desarrollo fuera del alcance aprobado.

### No hacer todavía

- No retirar Legacy.
- No hacer merge a `main`.
- No iniciar nuevas funcionalidades.
- No rediseñar el catálogo.
- No modificar backend, Supabase, migraciones, RLS, grants, secrets o Edge Functions.
- No ejecutar rollback.

## Próximo checkpoint autorizado

CHK-COM-6 quedó cerrado con PASS. No hay otro checkpoint iniciado; el siguiente deberá definirse y aprobarse explícitamente, sujeto a la regla Construir → Validar → Estado maestro → Cerrar → Avanzar.

## Alcance y límites

El cierre registrado aquí cubre la preparación, activación, alineación y QA final descritos para las Fases 1 a 4. No autoriza cambios adicionales en código, Supabase, Lovable, configuración, despliegues o publicaciones.

## Siguiente checkpoint recomendado

Definir el siguiente subcheckpoint mínimo para completar la operación comercial V1, sin iniciar trabajo hasta contar con alcance aprobado.

Hasta completar la auditoría y aprobar el siguiente checkpoint no se debe retirar el backend Legacy ni iniciar trabajo funcional fuera del alcance comercial.

# Fase 4 — QA funcional final post-migración CatalogView V2

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
- No hacer merge a `main` todavía.
- No retirar Legacy todavía.
- No iniciar nuevas funcionalidades hasta cerrar el checkpoint documental de Fase 4.

## Siguiente checkpoint recomendado

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
