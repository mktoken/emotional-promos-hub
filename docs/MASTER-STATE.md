# ESTADO MAESTRO — EMOTIONAL PROMOS HUB

## Identidad de reentrada

- Repositorio: `mktoken/emotional-promos-hub`
- Rama maestra de continuación: `feat/v2-cutover-preparation`
- Commit maestro actual: `94ed71f` — `fix: limpiar artefactos lovable fuera de alcance`
- Working tree: limpio al cierre de Fase 4 documental.
- Push: realizado a `origin/feat/v2-cutover-preparation`.

Este documento es la fuente de verdad de reentrada del proceso Pricing V2 / CatalogView V2. Consolida la historia verificable en Git, los reportes históricos versionados y el estado operativo reportado desde Lovable/Supabase interno. No sustituye las pruebas funcionales pendientes ni convierte documentación histórica en evidencia de producción actual.

## Clasificación de evidencia

- **Confirmado por Git:** ramas, commits, archivos, diffs y código presente en este checkout.
- **Confirmado por Lovable/Supabase interno:** resultados operativos registrados en planes versionados; requieren nueva consulta en Lovable si se necesita certificar el estado actual.
- **Reporte histórico versionado:** dry run, shadow write y validaciones documentadas en `supabase/qa/`.
- **Pendiente de validación futura:** cualquier cambio posterior a este checkpoint; la QA funcional post-migración quedó cerrada en Fase 4.

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
| Nueva funcionalidad | No iniciar todavía |

## Pendientes de control

### Pendiente inmediato

- Cerrar la consolidación documental mediante revisión del diff de este archivo.
- Crear el commit documental de cierre de Fase 4.
- Autorizar posteriormente el push si el commit aún no está sincronizado.
- Mantener Legacy y no iniciar nueva funcionalidad.

### No hacer todavía

- No retirar Legacy.
- No hacer merge a `main`.
- No iniciar nuevas funcionalidades.
- No rediseñar el catálogo.
- No modificar backend, Supabase, migraciones, RLS, grants, secrets o Edge Functions.
- No ejecutar rollback.

## Próximo checkpoint autorizado

El checkpoint documental consiste en revisar y aceptar el cierre de Fase 4 en este archivo. Una vez cerrado, no se debe avanzar a nueva funcionalidad; cualquier merge a `main`, QA adicional en producción o deuda técnica requiere una decisión separada.

## Alcance y límites

El cierre registrado aquí cubre la preparación, activación, alineación y QA final descritos para las Fases 1 a 4. No autoriza cambios adicionales en código, Supabase, Lovable, configuración, despliegues o publicaciones.

## Siguiente checkpoint recomendado

Después de cerrar este checkpoint documental, decidir por separado entre merge controlado a `main`, QA adicional en producción o backlog de deuda técnica no bloqueante.

Hasta completar ambos checkpoints no se debe avanzar a nueva funcionalidad ni retirar el backend Legacy.

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
