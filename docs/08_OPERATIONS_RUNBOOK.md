# RUNBOOK OPERATIVO Y DE CONTINUIDAD

## Objetivo

Permitir que una nueva sesión continúe el proyecto sin depender de chats, memoria conversacional o supuestos sobre Lovable y Supabase.

## A. Reentrada segura

1. Abrir `/Users/macbookpro/Projects/emotional-promos-hub`.
2. Leer `docs/00_PROJECT_INDEX.md`.
3. Leer `docs/MASTER-STATE.md` y localizar el checkpoint vigente.
4. Verificar la rama:

   ```sh
   git branch --show-current
   ```

5. Actualizar únicamente las referencias remotas:

   ```sh
   git fetch origin
   ```

6. Comparar estado local y remoto:

   ```sh
   git rev-parse HEAD
   git rev-parse origin/main
   git rev-list --left-right --count main...origin/main
   git status --short --branch
   ```

7. Si hay divergencia, archivos modificados, commits inesperados o una rama distinta, detenerse y auditar antes de integrar.
8. Leer el documento especializado correspondiente al trabajo.
9. No desarrollar hasta conocer el criterio de cierre del checkpoint.

## B. Gobernanza obligatoria

```text
Construir
→ Validar
→ Actualizar MASTER-STATE
→ Cerrar checkpoint
→ Commit/push
→ Verificar main = origin/main y 0 0
→ Avanzar
```

Un cambio de código no se considera cerrado solo porque exista en Git, Lovable o una preview.

## C. Uso seguro de Lovable

Antes de usar Lovable:

1. Verificar rama y HEAD en Git.
2. Verificar visualmente la rama seleccionada en Lovable.
3. Confirmar que coinciden exactamente.
4. Usar Re-check cuando corresponda.
5. Revisar Git después de cada sesión.

Lovable puede crear commits, planes o cambios aunque el prompt solicite solo lectura. Ante una divergencia:

- no hacer pull automático;
- listar commits y archivos;
- identificar cambios funcionales, documentales y de plan;
- decidir integración explícitamente;
- no usar force-push sin autorización específica.

## D. Supabase

Supabase es interno/integrado en Lovable para este proyecto.

No asumir ni ejecutar como ruta operativa:

- Dashboard externo de Supabase;
- `supabase login`;
- `supabase link`;
- `supabase db push`;
- CLI externa;
- `service_role`;
- credenciales externas;
- SQL de escritura fuera de un checkpoint aprobado.

Si Lovable no expone una configuración o acción integrada, documentar el bloqueo antes de proponer otra ruta.

## E. Producción

URL: <https://articulospromocionales.vip>

Para QA read-only:

1. Abrir producción como cliente nuevo cuando el alcance sea público.
2. No crear solicitudes reales salvo que el checkpoint autorice un caso QA controlado.
3. No enviar correos ni WhatsApp sin autorización explícita.
4. Para CRM, usar solo una sesión ya autenticada; no pedir ni cambiar contraseñas fuera del alcance.
5. No modificar cotizaciones o prospectos reales.
6. Registrar PASS, PARCIAL, FAIL, NO COMPROBADO o REQUIERE INTERVENCIÓN.
7. No confundir una pantalla visible con una operación comercial completa.

## F. Divergencias Git

Ante una divergencia:

1. Detener modificaciones.
2. Registrar HEAD local, remoto, ahead/behind y working tree.
3. Listar commits exclusivos de cada lado.
4. Inspeccionar archivos y diffs.
5. Revisar cambios de código antes de integrar.
6. No hacer pull, merge, rebase, cherry-pick o push hasta definir estrategia.
7. Si hay conflicto, detenerse; no improvisar.

## G. Estados de checkpoint

- **OPEN / ABIERTO:** trabajo o validación pendiente.
- **PASS / CERRADO:** criterio completo comprobado.
- **PARTIAL / PARCIAL:** parte comprobada, pero falta un requisito del alcance.
- **BLOCKED / BLOQUEADO:** no puede avanzar sin cambio externo o decisión.
- **NO COMPROBADO:** no existe evidencia suficiente para afirmarlo.

## H. Cierre de checkpoint

Antes de cerrar:

- validar el comportamiento definido;
- registrar límites y no comprobados;
- actualizar `MASTER-STATE.md`;
- revisar únicamente los archivos autorizados;
- ejecutar `git diff --check`;
- crear commit con mensaje claro;
- hacer push normal;
- verificar `main = origin/main`, divergencia `0 0` y working tree limpio.

## I. Prohibiciones

- No force-push sin autorización específica.
- No tocar stashes históricos.
- No fusionar ramas históricas automáticamente.
- No ejecutar migraciones o sincronizadores para “ver qué pasa”.
- No usar chats como autoridad permanente.
- No copiar secretos desde `.env`.
- No modificar datos reales durante QA read-only.
- No publicar sin un checkpoint que lo autorice.

## J. Separación de proyectos

Emotional Promos Hub no debe mezclarse con:

- Portal Maestro / Terrenos en Mérida;
- otros repositorios o proyectos Lovable;
- `promocionales.org`.

`promocionales.org` no es fuente de verdad de Emotional Promos Hub.

## K. Referencias de continuidad

- Estado vigente: `docs/MASTER-STATE.md`.
- Índice: `docs/00_PROJECT_INDEX.md`.
- Decisiones: `docs/02_DECISION_LOG.md`.
- Producto: `docs/04_PRODUCT_SCOPE.md`.
- Arquitectura: `docs/05_ARCHITECTURE.md`.
- Pricing y catálogo: `docs/09_PRICING_CATALOG_V2.md`.
- QA: `docs/10_QA_EVIDENCE.md`.
