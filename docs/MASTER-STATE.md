# ESTADO MAESTRO — EMOTIONAL PROMOS HUB

## Identidad de reentrada

- Repositorio: `mktoken/emotional-promos-hub`
- Rama maestra de continuación: `feat/v2-cutover-preparation`
- Commit maestro actual: `4c32c60` — `fix: limpiar cambios fuera de alcance en fase 3`
- Working tree: limpio al cierre de Fase 3.
- Push: realizado a `origin/feat/v2-cutover-preparation`.

Este documento es la fuente de verdad de reentrada del proceso Pricing V2 / CatalogView V2. Consolida la historia verificable en Git, los reportes históricos versionados y el estado operativo reportado desde Lovable/Supabase interno. No sustituye las pruebas funcionales pendientes ni convierte documentación histórica en evidencia de producción actual.

## Clasificación de evidencia

- **Confirmado por Git:** ramas, commits, archivos, diffs y código presente en este checkout.
- **Confirmado por Lovable/Supabase interno:** resultados operativos registrados en planes versionados; requieren nueva consulta en Lovable si se necesita certificar el estado actual.
- **Reporte histórico versionado:** dry run, shadow write y validaciones documentadas en `supabase/qa/`.
- **Pendiente de validación futura:** comportamiento funcional post-migración, estado remoto actual y cualquier cambio posterior a este checkpoint.

## Estado Git y alcance

- Base histórica relevante: `4084872`.
- Commit de limpieza funcional: `4c32c60`.
- Commit documental local inicial: `5ad44a7`.
- El remoto permanece en `4c32c60`; los commits documentales locales todavía están pendientes de push.
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
8. **Limpieza de cambios fuera de alcance.** Se detectaron cambios en `client.ts`, `types.ts` y `previewAuthStorage.ts`; la limpieza los retiró del alcance funcional de Fase 3 y dejó únicamente `CatalogView.tsx`. El resultado remoto quedó en `4c32c60`.
9. **Estado maestro.** `5ad44a7` creó este documento; el presente cambio amplía su cronología y matriz de evidencia. Estos commits documentales aún no están en GitHub.

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
- Commit de limpieza: `4c32c60` — `fix: limpiar cambios fuera de alcance en fase 3`.
- Working tree limpio.

## Matriz de evidencia por fase

| Fase | Estado | Evidencia Git | Evidencia Lovable/Supabase | Riesgo | Siguiente acción |
|---|---|---|---|---|---|
| Fase 1 — generación shadow | Cerrada / certificada | Código de recomputación, tablas shadow y commits V2 versionados | Reporte histórico de generación `818d824a…`: 1,524 / 1,506 / 18 / 0 / 0 / 0 | Bajo mientras no se publique | Mantener como baseline histórico |
| Fase 2 — release backend | Cerrada / certificada | RPC de publish/rollback, vista de precios actuales y contratos V2 versionados | Reporte operativo de release: 1,524 filas, 1,506 con precio, 18 a cotizar, 0 no disponibles, sin errores | Legacy y V2 coexistieron temporalmente | Mantener rollback y validar comportamiento post-migración |
| Fase 3 — CatalogView V2 | Cerrada / verificada | `CatalogView.tsx` llama `catalog_search_products_v2`; diff autorizado de 14 inserciones y 2 eliminaciones | Estado de release y alineación reportado desde Lovable; no sustituye QA funcional | Posibles regresiones visuales/funcionales aún no probadas | Ejecutar QA funcional final |

## Registro de reversiones y limpieza

Durante Fase 3 se detectaron cambios fuera de alcance en:

- `src/integrations/supabase/client.ts`;
- `src/integrations/supabase/types.ts`;
- `src/integrations/supabase/previewAuthStorage.ts`.

Esos cambios fueron revertidos o excluidos del resultado funcional final. No forman parte del cambio autorizado de Fase 3. La limpieza quedó registrada en `4c32c60`; el diff funcional aceptado frente a `4084872` conserva únicamente `src/components/CatalogView.tsx`.

## Estado actual

| Área | Estado |
|---|---|
| Backend Pricing V2 | Activo |
| Release V2 | Activa |
| Frontend del catálogo | Alineado a V2 |
| Legacy | No retirado; disponible como respaldo backend |
| QA funcional final post-migración | Pendiente |
| Nueva funcionalidad | No iniciar todavía |

## Pendientes de control

### Pendiente inmediato

- Cerrar la consolidación documental mediante revisión del diff de este archivo.
- Crear el commit documental de ampliación.
- Autorizar posteriormente el push de los commits documentales locales.
- Después del checkpoint documental, ejecutar QA funcional final post-migración.

### No hacer todavía

- No retirar Legacy.
- No hacer merge a `main`.
- No iniciar nuevas funcionalidades.
- No rediseñar el catálogo.
- No modificar backend, Supabase, migraciones, RLS, grants, secrets o Edge Functions.
- No ejecutar rollback.

## Próximo checkpoint autorizado

El checkpoint documental consiste en revisar y aceptar esta ampliación del estado maestro. Hasta cerrarlo no se debe avanzar a QA funcional. Una vez autorizado el paso siguiente, el checkpoint operativo será el QA funcional final post-migración de `CatalogView` V2.

## Alcance y límites

El cierre registrado aquí cubre la preparación, activación y alineación descritas para las Fases 1, 2 y 3. No implica que se hayan ejecutado pruebas funcionales finales post-migración ni autoriza cambios adicionales en código, Supabase, Lovable, configuración, despliegues o publicaciones.

## Siguiente checkpoint recomendado

Después de cerrar este checkpoint documental, ejecutar QA funcional final post-migración de `CatalogView` V2.

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
