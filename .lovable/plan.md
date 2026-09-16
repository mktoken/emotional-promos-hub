# Corrección de alcance Fase 3 — Hallazgos y plan de limpieza mínima

## Estado verificado (solo lectura, ya confirmado con git)

1. **`src/integrations/supabase/client.ts` y `src/integrations/supabase/previewAuthStorage.ts` no fueron modificados en Fase 3.** Los commits de Fase 3 (`c82e8f1`, `8cbd114`) solo tocaron `src/components/CatalogView.tsx` y un archivo de plan. Esos dos archivos de autenticación se modificaron por última vez en commits antiguos de la plataforma (`da34fda`, `b42b155`) y son **archivos autogenerados por Lovable** (está prohibido editarlos). Su contenido actual incluye el "broker" de sesión de la vista previa, que el editor genera automáticamente. No hay nada que revertir ahí; intentar revertirlos rompería la sesión de la vista previa.

2. **`src/components/CatalogView.tsx`**: contiene únicamente el cambio funcional aprobado (llamada a `catalog_search_products_v2` + etiquetas de estado de precio). Se conserva tal cual.

3. **`.lovable/plan.md`**: no existe en disco actualmente. La plataforma lo archivó automáticamente a `.lovable/plan/fase-3-migración-...-2026-09-16.md` al aprobarse el plan. No fue eliminado por error; es el comportamiento normal.

4. **`.lovable/plan/*.md` (4 archivos)**: son archivos de documentación generados automáticamente por Lovable al aprobar cada plan. Están rastreados en git desde commits previos de la plataforma. Son inertes (no afectan la app).

5. El árbol de trabajo está limpio: no hay cambios sin confirmar.

## Conclusión del diagnóstico

El remoto ya está en el estado que pides: el único cambio funcional de Fase 3 es `CatalogView.tsx`. Los archivos de auth/preview no fueron tocados por mí y no deben tocarse (autogenerados). Lo único que sobra en el repo es documentación de planes en `.lovable/`.

## Plan de ejecución (mínimo)

Opción única de limpieza, solo si la apruebas:

1. **Eliminar del repo los 4 archivos** de `.lovable/plan/` (documentación generada: auditoría, fase-1, fase-2, fase-3). Se eliminan del disco; quedan en el historial de git y en el chat.
2. **Nada más.** No se toca `CatalogView.tsx`, ni auth, ni backend, ni Supabase, ni RLS, ni grants, ni secrets, ni Edge Functions.
3. No hay deploy ni publish: la plataforma confirmará el cambio como un commit normal del repositorio.

Si prefieres conservar esos 4 archivos como registro histórico de las fases, entonces **no hay ningún cambio que hacer**: el remoto ya coincide con tu objetivo.

## Archivos que quedarían modificados

- Eliminados: 4 archivos bajo `.lovable/plan/` (opcional, según tu decisión).
- Modificados: ninguno.
- `src/components/CatalogView.tsx` se conserva intacto.

## Condiciones de paro

Si al eliminar apareciera cualquier otro cambio inesperado en el árbol de trabajo, me detengo y reporto antes de continuar.

## Autorización exacta requerida

Responde una de estas dos opciones:

1. "Autorizo eliminar los 4 archivos de .lovable/plan/" — ejecuto la limpieza y reporto.
2. "Conserva los archivos de plan" — no ejecuto nada; el estado actual ya cumple tu objetivo.
