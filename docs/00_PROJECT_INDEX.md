# ÍNDICE DEL PROYECTO — EMOTIONAL PROMOS HUB

## Propósito

Este es el punto de entrada documental del proyecto. Una nueva sesión debe comenzar aquí y continuar hacia `MASTER-STATE.md` antes de leer documentación especializada.

Este índice no reemplaza el estado maestro ni duplica su estado técnico completo.

## Identidad

- Proyecto: **Emotional Promos Hub / Promocionales Emocionales**.
- Repositorio: `mktoken/emotional-promos-hub`.
- Producción: <https://articulospromocionales.vip>.
- Proyecto Lovable: `406ed62b-fa9a-4346-82b6-4b111a4193b3`.
- Rama maestra: `main`.
- Gestor de paquetes documentado por el proyecto: Bun (`bun.lock`).

El estado Git y el checkpoint vigente no se mantienen aquí. La fuente de verdad para esos datos es `docs/MASTER-STATE.md`.

## Orden de lectura recomendado

1. `docs/00_PROJECT_INDEX.md` — orientación y autoridad documental.
2. `docs/MASTER-STATE.md` — estado vigente, checkpoint y siguiente paso autorizado.
3. `docs/08_OPERATIONS_RUNBOOK.md` — cómo continuar sin romper la gobernanza.
4. El documento especializado que corresponda:
   - producto: `docs/04_PRODUCT_SCOPE.md`;
   - arquitectura: `docs/05_ARCHITECTURE.md`;
   - precios y catálogo: `docs/09_PRICING_CATALOG_V2.md`;
   - evidencia QA: `docs/10_QA_EVIDENCE.md`;
   - decisiones: `docs/02_DECISION_LOG.md`.

## Jerarquía y autoridad

| Nivel | Documento o ubicación | Autoridad | Cuándo consultarlo |
|---|---|---|---|
| 1 | `docs/MASTER-STATE.md` | Estado formal vigente | Siempre al iniciar o cerrar un checkpoint |
| 2 | `docs/02_DECISION_LOG.md` | Decisiones permanentes | Antes de cuestionar una decisión ya adoptada |
| 2 | `docs/04_PRODUCT_SCOPE.md` | Producto y alcance | Antes de ampliar o reinterpretar funcionalidades |
| 2 | `docs/08_OPERATIONS_RUNBOOK.md` | Continuidad operativa | Antes de usar Git, Lovable o producción |
| 3 | `docs/05_ARCHITECTURE.md` | Arquitectura comprobable | Para entender componentes y flujos |
| 3 | `docs/09_PRICING_CATALOG_V2.md` | Contrato de precios y catálogo | Para temas de inventario, precios y releases |
| 4 | `docs/10_QA_EVIDENCE.md` | Índice de pruebas | Para localizar evidencia de validación |
| 4 | `supabase/qa/` | Reportes y scripts QA detallados | Para revisar evidencia primaria específica |
| 4 | `.lovable/plan/` | Evidencia interna/histórica de Lovable | Solo para contexto de una sesión Lovable |

Si existe una discrepancia, el estado vigente debe resolverse en `MASTER-STATE.md` y mediante Git; un plan interno de Lovable o un chat no lo sustituye.

## Sistemas y fuentes

- **Git/GitHub:** evidencia primaria del código, archivos, commits y ramas.
- **Lovable:** entorno de trabajo integrado y fuente de evidencia sobre acciones realizadas allí; no sustituye la verificación Git.
- **Producción:** evidencia del comportamiento publicado; no demuestra por sí sola qué commit está desplegado.
- **Supabase:** en este proyecto se trata como servicio interno/integrado dentro de Lovable. No se asume una operación externa independiente.
- **`supabase/qa/`:** evidencia técnica versionada, no estado operativo vigente por sí misma.
- **`.lovable/plan/`:** material interno/histórico de Lovable, no autoridad formal.

## Reglas canónicas de continuidad

1. Construir → Validar → Actualizar `MASTER-STATE.md` → Cerrar checkpoint → Commit/push → Verificar sincronización → Avanzar.
2. Un cambio existente en código no equivale automáticamente a un checkpoint cerrado.
3. Git/GitHub es la evidencia primaria del código; `MASTER-STATE.md` es la evidencia primaria del estado formal.
4. Lovable y producción se validan cuando el alcance lo requiere.
5. Supabase se trata como interno/integrado en Lovable; no asumir Dashboard externo, CLI, `supabase login`, `supabase link`, `db push`, `service_role` ni credenciales externas.
6. Las divergencias Git se auditan antes de pull, merge, rebase o push.
7. Chats de ChatGPT, Work y conversaciones de Lovable **NO son fuente permanente de verdad**.
8. No mezclar Emotional Promos Hub con otros proyectos, repositorios o dominios.
9. `promocionales.org` no es fuente de verdad de Emotional Promos Hub.
10. No leer, copiar ni modificar `.env` dentro de un checkpoint documental ordinario.

## Estados de evidencia

- **IMPLEMENTADO:** existe en el código o configuración versionada.
- **VALIDADO / PASS:** fue comprobado mediante una prueba identificable.
- **PARCIAL:** funciona, pero el alcance completo no está comprobado.
- **PENDIENTE:** está definido como trabajo futuro o validación pendiente.
- **NO COMPROBADO:** no existe evidencia suficiente para afirmarlo.
- **HISTÓRICO:** evidencia válida para su corte, pero no necesariamente vigente.

## Puerta de entrada para una sesión nueva

Antes de desarrollar:

1. Verificar que el repositorio sea `mktoken/emotional-promos-hub`.
2. Leer `MASTER-STATE.md` completo o la sección de reentrada y su historial relevante.
3. Confirmar rama, HEAD, `origin/main`, divergencia y working tree.
4. Identificar el checkpoint abierto y su criterio de cierre.
5. Leer el runbook antes de usar Lovable, Supabase interno o producción.
