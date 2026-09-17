# Plan: Sincronizar rama `feat/quote-preview-frontend-only` (sin reconstruir funcionalidad)

## Estado actual del workspace (verificado, solo lectura)

- **Remoto `origin`**: mirror interno de Lovable (`git.private.lovable-gcp.code.storage/406ed62b-fa9a-4346-82b6-4b111a419b3b.git`). Este es el repositorio del proyecto; el repo de GitHub `mktoken/emotional-promos-hub` se sincroniza vía la integración Git Sync de Lovable, no aparece como remoto directo.
- **Rama activa**: `edit/edt-96744991-8faf-46a9-aab2-35979529c6ed` — HEAD `2a940ba`.
- **Ramas existentes**: `edit/*` (3), `feat/v2-cutover-preparation`, `origin/main`.
- **La rama `feat/quote-preview-frontend-only` NO existe** localmente ni en `origin` (listado anterior a fetch).
- Working tree: limpio.

## Pasos

1. `git fetch origin --prune` para actualizar referencias remotas.
2. Listar ramas remotas y locales para buscar `feat/quote-preview-frontend-only` y el commit `8fb08fd`.
3. **Si la rama aparece:**
   - `git checkout feat/quote-preview-frontend-only` (o `git switch -c feat/quote-preview-frontend-only origin/feat/quote-preview-frontend-only` si solo existe en remoto).
   - Verificar HEAD == `8fb08fd`.
   - Verificar en `src/features/quotes/components/QuoteCartView.tsx` (o donde corresponda):
     - `type QuoteStep = "selection" | "form" | "preview" | "success";`
     - Texto `Previsualización de solicitud`
     - Botón de formulario `Previsualizar solicitud`
     - Botón final `Enviar solicitud de cotización`
   - Reportar verificación punto por punto y detenerse (el QA visual ya planeado queda pendiente de ejecución).
4. **Si la rama NO aparece tras fetch:**
   - Reportar el remoto conectado y la lista completa de ramas disponibles.
   - Detenerse sin cambios de rama; indicar que el workspace está conectado al mirror de Lovable y que la rama debe existir en el repo sincronizado (GitHub `mktoken/emotional-promos-hub` → Git Sync) o que el workspace apunta a otra copia.

## Restricciones

- No modificar archivos.
- No reconstruir la funcionalidad.
- No commit, push, merge, deploy ni publish.
- No crear leads reales.
- Solo cambio de rama (checkout) como única operación con estado, si la rama existe.

## Resultado esperado

Workspace en `feat/quote-preview-frontend-only @ 8fb08fd` con los 4 criterios de contenido verificados, o un reporte de bloqueo con el inventario real de remoto y ramas.
