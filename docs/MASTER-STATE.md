# ESTADO MAESTRO — EMOTIONAL PROMOS HUB

## Identidad de reentrada

- Repositorio: `mktoken/emotional-promos-hub`
- Rama maestra de continuación: `feat/v2-cutover-preparation`
- Commit maestro actual: `4c32c60` — `fix: limpiar cambios fuera de alcance en fase 3`
- Working tree: limpio al cierre de Fase 3.
- Push: realizado a `origin/feat/v2-cutover-preparation`.

Este documento registra el estado maestro del proceso Pricing V2 / CatalogView V2 al cierre de la Fase 3. No sustituye los reportes QA históricos ni certifica por sí mismo nuevas pruebas funcionales posteriores a la migración.

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

## Estado actual

| Área | Estado |
|---|---|
| Backend Pricing V2 | Activo |
| Release V2 | Activa |
| Frontend del catálogo | Alineado a V2 |
| Legacy | No retirado; disponible como respaldo backend |
| QA funcional final post-migración | Pendiente |
| Nueva funcionalidad | No iniciar todavía |

## Alcance y límites

El cierre registrado aquí cubre la preparación, activación y alineación descritas para las Fases 1, 2 y 3. No implica que se hayan ejecutado pruebas funcionales finales post-migración ni autoriza cambios adicionales en código, Supabase, Lovable, configuración, despliegues o publicaciones.

## Siguiente checkpoint recomendado

Ejecutar QA funcional final post-migración de `CatalogView` V2.

Hasta completar ese checkpoint no se debe avanzar a nueva funcionalidad ni retirar el backend Legacy.
