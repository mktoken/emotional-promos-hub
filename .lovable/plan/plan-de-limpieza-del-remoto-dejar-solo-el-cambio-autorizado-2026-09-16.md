# Plan de limpieza del remoto — dejar solo el cambio autorizado de Fase 3

Solo plan. No se ejecuta nada hasta autorización explícita.

## 1. Estado real verificado (diff contra 4084872)

| Archivo | Estado | Origen real |
|---|---|---|
| `src/components/CatalogView.tsx` | M (+16/-3) | Cambio funcional aprobado (Fase 3) |
| `src/integrations/supabase/client.ts` | M (2 líneas) | Regeneración automática de la plataforma (auth de preview) |
| `src/integrations/supabase/previewAuthStorage.ts` | A (88 líneas) | Archivo autogenerado nuevo de la plataforma |
| `src/integrations/supabase/types.ts` | M (22 líneas) | Regeneración automática: `PostgrestVersion 14.1 → 14.5` + paréntesis en genéricos |
| `.lovable/plan.md` | D | Archivado/borrado por el flujo de planes |

Ninguno de los tres archivos de `integrations/supabase` fue editado a mano durante Fase 3.

## 2. ¿Es indispensable `types.ts`?

No. Verificado: el commit base `4084872` **ya contiene** la definición de `catalog_search_products_v2` en `types.ts`. El diff actual solo cambia la versión declarada de PostgREST y añade paréntesis en tipos genéricos. `CatalogView.tsx` compila igual con la versión base. Por lo tanto `types.ts` se revierte.

## 3. Archivos que quedarían finalmente modificados

- `src/components/CatalogView.tsx` (único cambio funcional)
- `.lovable/plan.md` restaurado a su contenido de `4084872` (vuelve a existir, sin borrado pendiente)

## 4. Archivos que se revertirían

- `src/integrations/supabase/client.ts` → contenido de `4084872` (vuelve a `storage: localStorage`)
- `src/integrations/supabase/previewAuthStorage.ts` → eliminado (no existía en `4084872`)
- `src/integrations/supabase/types.ts` → contenido de `4084872`

## 5. ¿Se puede dejar el remoto con solo `CatalogView.tsx`?

Sí para el código: el único archivo de código modificado quedaría `CatalogView.tsx`. La excepción es `.lovable/plan.md`, que se restaura precisamente para eliminar el borrado no autorizado (queda idéntico al base, sin diff neto).

**Advertencia obligatoria:** `client.ts`, `previewAuthStorage.ts` y `types.ts` son archivos generados por la plataforma. Si la plataforma vuelve a regenerarlos (sesión de preview, refresco de esquema), reaparecerán automáticamente en un mensaje posterior. La reversión es válida ahora, pero no puedo garantizar que la plataforma no los regenere después. Revertir `client.ts` puede además hacer que el login del preview deje de compartir sesión con el editor (el app publicado no se afecta).

## 6. Pasos exactos de ejecución (tras autorización)

1. `git checkout 4084872 -- src/integrations/supabase/client.ts src/integrations/supabase/types.ts`
2. `rm src/integrations/supabase/previewAuthStorage.ts`
3. `git checkout 4084872 -- .lovable/plan.md`
4. Verificación: `git diff --stat 4084872 HEAD` debe mostrar únicamente `src/components/CatalogView.tsx`
5. Typecheck (`tsgo --noEmit`) y tests para confirmar que `CatalogView.tsx` compila sin los tipos regenerados
6. Detenerse y entregar reporte

Sin backend, Supabase, migraciones, RLS, grants, secrets, Edge Functions, deploy ni publish.

## 7. Condiciones de parada

- Si el typecheck falla al revertir `types.ts` → se detiene, se restaura `types.ts` y se reporta, sin tocar nada más.
- Si el diff final muestra cualquier archivo extra → se detiene y se reporta antes de continuar.

## 8. Autorización exacta requerida

> "Autorizo ejecutar la limpieza: revertir `client.ts` y `types.ts` al estado de 4084872, eliminar `previewAuthStorage.ts`, restaurar `.lovable/plan.md`, conservando únicamente el cambio de `CatalogView.tsx`. Acepto que los archivos autogenerados de la plataforma puedan regenerarse y que el login del preview pueda dejar de compartir sesión con el editor."
