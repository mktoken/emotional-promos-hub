# AGENTS.md — Promocionales Emocionales

## Alcance y autoridad

Estas instrucciones aplican al repositorio `/Users/macbookpro/Projects/emotional-promos-hub`.

La fuente de verdad es, en este orden:

1. La petición explícita del propietario para la tarea actual.
2. El estado real del repositorio y las fuentes canónicas bajo `docs/`.
3. Estas instrucciones.
4. El registro persistente de especialistas en `.codex/specialists/registry.yaml`.

El registro de especialistas es una capa de enrutamiento y plantillas de rol. No crea agentes autónomos ni autoriza cambios por sí mismo.

## Gobernanza del proyecto

- Mantener un único cerebro comercial y una única lógica de negocio compartida.
- Reutilizar las ocho skills canónicas existentes antes de crear otra skill.
- Ejecutar el pre-flight de `pe-specialist-orchestrator` en tareas de marca, UX, contenido, evidencia o adquisición.
- No reabrir componentes, contratos o datos certificados sin evidencia concreta de regresión.
- No modificar producción, Supabase, Lovable, GitHub, CRM, pricing, stock, proveedores, catálogo o imágenes sin autorización explícita y específica.

## Enrutamiento automático

Al recibir una tarea, identificar primero el dominio, elegir un único perfil líder del registro y añadir solo los perfiles de apoyo imprescindibles. Los perfiles no seleccionados permanecen inactivos.

Orden de selección:

1. `S01` — orquestación y pre-flight.
2. Un líder de dominio (`S02`–`S30`) según el problema.
3. Cero, uno o dos apoyos cuando exista una dependencia verificable.

Límite: máximo tres especialistas activos por tarea; preferir ejecución secuencial cuando no haya independencia real. No convocar los 30 perfiles en bloque.

Las skills ejecutables son las canónicas ya instaladas: `pe-specialist-orchestrator`, `pe-evidence-claims`, `pe-brand-strategist`, `pe-b2b-buyer-jtbd`, `pe-ux-cro-architect`, `pe-conversion-copy-chief`, `pe-visual-image-director` y `pe-google-ads-intent-miner`. El nuevo `pe-project-specialist-registry` solo lee el registro, selecciona el perfil mínimo y remite a esas skills; no duplica sus instrucciones.

## Delegación

- La delegación a subagentes es efímera y solo se usa si la petición del propietario, estas instrucciones o una skill aplicable la autorizan.
- Cada subagente recibe una tarea acotada, un único entregable y una lista explícita de rutas permitidas.
- Por defecto los subagentes son de lectura; no reciben secretos ni acceso de escritura a runtime.
- No delegar cambios funcionales en la misma superficie a más de un agente.
- El agente principal integra y revisa los resultados; una respuesta de un subagente no es una autorización.

## Controles de seguridad

- No imprimir secretos, tokens, URLs privadas ni valores de entorno sensibles.
- No usar credenciales nuevas ni elevar permisos para evitar una limitación de acceso.
- No ejecutar SQL, migraciones, sincronizaciones, Publish, push, merge o rebase salvo autorización explícita.
- No escribir en Supabase, Lovable, CRM o producción desde una tarea de auditoría.
- Antes de cualquier escritura local, revisar `git status --short`, preservar cambios preexistentes y limitar el conjunto de archivos.
- Antes de commit o push, validar rama, remoto, divergencia, staging exacto y pruebas requeridas.
- Si una fuente canónica falta o dos instrucciones entran en conflicto, detenerse y reportarlo; no inventar una fuente ni resolver silenciosamente el conflicto.

## Estado de la arquitectura multiagente

La especificación adjunta “Arquitectura Multiagente Promocionales Emocionales 2026” no está disponible en el entorno inspeccionado. El registro actual se deriva de `docs/MASTER-STATE.md`, `docs/06_SUPER_AGENTE_COMERCIAL.md`, `docs/strategy/PE_AI_PROJECT_ADVISOR_HANDOFF_V1.md` y las ocho skills instaladas. No sustituir esa base por una especificación no verificada.

La instalación de Codex inspeccionada sí admite agentes personalizados persistentes mediante `.codex/agents/*.toml`. Cada definición debe tener `name`, `description` y `developer_instructions`. Esos agentes heredan los permisos del coordinador; las instrucciones read-only no sustituyen al sandbox ni al sistema de aprobaciones. `multi_agent_v1` sigue siendo una vía adicional de delegación efímera.

## Gobernanza de calidad

El estándar permanente de calidad y control está en
`docs/governance/PE_QUALITY_GATES.md`. Complementa estas instrucciones; no las sustituye ni crea una autoridad adicional.
