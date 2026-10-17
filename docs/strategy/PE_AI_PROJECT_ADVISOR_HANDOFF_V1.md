# AI PROJECT ADVISOR — HANDOFF CANÓNICO V1

**Checkpoint:** `CHK-AI-ADVISOR-HANDOFF`
**Fecha de registro:** 2026-10-17
**Estado:** `PARKED / PLANNED`
**Factibilidad:** `PASS WITH CONDITIONS`
**Implementación de la iniciativa:** `NOT STARTED`

## 1. Decisión y continuidad

La iniciativa **Consultor de Proyectos Inteligente** se conserva como trabajo
futuro. La prioridad vigente es cerrar la beta comercial existente, sus
dependencias de Brand/Web y su documentación de cierre. Este documento evita
reconstruir la investigación y las decisiones desde conversaciones anteriores;
no autoriza el desarrollo del asesor ni inicia `CHK-AI-ADVISOR-01`.

El orden vigente es:

1. cerrar las dependencias de `CHK-BRAND-WEB-1` y la certificación E2E/publicación
   controlada que corresponda;
2. cerrar la documentación de beta y de las rutas públicas;
3. obtener autorización expresa del propietario;
4. abrir `CHK-AI-ADVISOR-01` como piloto interno y controlado.

Los cierres de `CHK-AI-SALES-1` a `CHK-AI-SALES-5` se preservan dentro de sus
alcances QA documentados. No equivalen a un asesor público, a un agente autónomo
ni a autorización de publicación.

## 2. Visión comercial y propuesta de valor

El asesor debe ayudar a un comprador empresarial a convertir una necesidad
imprecisa —evento, campaña, onboarding, reconocimiento, regalo o kit— en un
brief comercial claro, opciones reales del catálogo y un siguiente paso revisado
por una persona. La propuesta no es “un chatbot que inventa productos”, sino una
capa de orientación que reduce incertidumbre y acelera el handoff comercial.

La experiencia debe conservar la promesa de Promocionales Emocionales:
claridad, confianza, criterio comercial, sensibilidad de marca y continuidad
humana. El asesor no debe exponerse como argumento tecnológico ni competir con la
marca o con el catálogo.

## 3. Cliente ideal y segmentos preliminares

Estos segmentos son hipótesis comerciales de trabajo, no una certificación de
mercado ni una decisión de targeting:

- empresas y equipos que organizan eventos, congresos, reuniones o activaciones;
- áreas de Recursos Humanos, marketing, compras y administración que necesitan
  artículos útiles para colaboradores, clientes o asistentes;
- PyMEs y compradores corporativos que requieren opciones comparables con
  cantidades, fecha, ciudad y presupuesto claros;
- compradores de regalos corporativos o kits que necesitan una solución
  coherente, no una lista genérica de productos.

La validación de ICP, tamaño de oportunidad, recurrencia, disposición a pagar y
canal de adquisición queda pendiente de evidencia comercial adicional.

## 4. Compradores y trabajos por resolver

Los jobs-to-be-done preliminares son:

- traducir una ocasión o audiencia en categorías y opciones útiles;
- saber qué información falta antes de pedir una cotización;
- comparar producto, cantidad, MOQ, precio autorizado y disponibilidad observada;
- explorar un kit conceptual sin convertir una idea en SKU, precio o stock inventado;
- preparar un brief que un asesor humano pueda revisar sin rehacer la conversación.

La urgencia, autoridad de compra, presupuesto real, criterios de aprobación y
proceso de compras deben preguntarse o marcarse como desconocidos; no deben
inferirse por el sector.

## 5. Flujo esperado y relación con “Tengo un proyecto”

### Ruta A — producto conocido

Catálogo → ficha/PDP → variante y cantidad → precio público V2 y stock
observado, si existen → solicitud/cotización → revisión humana.

### Ruta B — proyecto todavía abierto

“Tengo un proyecto” → objetivo, cantidad o desconocido, fecha o desconocida,
empresa, ocasión, audiencia, presupuesto, ciudad, interés de producto,
personalización, comentarios y contacto → revisión/validación → opciones reales
del catálogo → handoff comercial.

La ruta B actual ya tiene contratos de formulario, privacidad, idempotencia y
envío documentados en los artefactos de `project-brief`; su estado de lanzamiento
comercial y su relación con el gate Brand/Web deben seguir resolviéndose en
`CHK-BRAND-WEB-1`. El futuro asesor puede consumir el brief y enriquecerlo, pero
no debe duplicar la autoridad del formulario ni crear una ruta paralela.

## 6. Evolución del antiguo Kit Builder

El concepto de Kit Builder se conserva como una capacidad de solución: el asesor
puede proponer un kit conceptual y relaciones de cross-sell para revisión. La
idea de kit no publica automáticamente componentes, no crea productos, no fija
SKU, no fija precio y no confirma disponibilidad.

La implementación existente de `conceptualKit` y `crossSellSuggestions` es una
base de QA, no un producto público de kits. La evolución recomendada es
brief → composición conceptual → selección explícita de líneas reales → precio,
stock y MOQ por las autoridades existentes → borrador y handoff humano.

## 7. Arquitectura recomendada

La recomendación canónica es:

**WORKFLOW DETERMINÍSTICO + UN LLM ESPECIALIZADO + HERRAMIENTAS
AUTORITATIVAS + VALIDACIÓN HUMANA.**

No se recomienda crear múltiples agentes autónomos. El workflow debe controlar
estado, preguntas, selección, cantidades, variantes, límites y transiciones. El
LLM puede interpretar lenguaje, resumir, preguntar, ordenar alternativas y
redactar un brief; no puede sustituir las autoridades ni ejecutar acciones no
autorizadas. Las herramientas deben devolver datos con fuente, fecha/estado y
confianza cuando aplique. El nivel inicial termina en revisión humana.

Capas previstas:

1. intake y contexto de oportunidad;
2. recuperación determinística del catálogo;
3. enriquecimiento autoritativo de producto, variante, imagen, precio y stock;
4. razonamiento/recomendación acotado del LLM;
5. resumen, solicitud o cotización en borrador;
6. handoff y revisión humana con trazabilidad.

## 8. Código y componentes reutilizables

La base existente que puede reutilizarse, sin implicar que la iniciativa esté
implementada, incluye:

- `src/features/agent/lib/agent-state.ts`: estado de oportunidad, líneas,
  cantidad, variante, personalización y migración de snapshots;
- `src/features/agent/lib/agent-workflow.ts`: flujo conversacional determinista,
  preguntas, selección, reemplazo y estado multiproducto;
- `src/features/agent/lib/agent-tools.ts`: búsqueda mediante
  `catalog_search_products_v2`, ficha pública, variantes, imágenes, stock
  observado, URL y precio público V2;
- `src/features/agent/lib/agent-intelligence.ts`: playbooks piloto, contexto,
  provenance/confidence y kits conceptuales;
- `src/features/agent/lib/agent-attachments.ts` y `commercial-vision.ts`:
  adjuntos, observaciones, visión estructurada y revisión requerida;
- `src/features/agent/lib/agent-quote.ts` y `agent-crm.ts`: plan/reconciliación
  de borrador, handoff y operaciones QA restringidas;
- `src/features/project-brief/lib/project-brief.ts`,
  `submit-project-brief.ts` y `src/components/ProjectBriefView.tsx`: contrato
  actual de “Tengo un proyecto”.

La reutilización futura debe mantener feature flags, compatibilidad hacia atrás,
idempotencia y separación entre lectura pública y escritura comercial autorizada.

## 9. Skills y capacidades faltantes

Capacidades ya documentadas en el proyecto: workflow multiproducto, catálogo
determinístico, Pricing V2 autoritativo, stock observado, playbooks iniciales,
provenance/confidence, visión estructurada QA, borrador de cotización y handoff.

Capacidades todavía faltantes o no comprobadas como producto:

- evaluación reproducible de 12 proyectos B2B con criterios de salida;
- recuperación de información empresarial persistente con controles de privacidad;
- disponibilidad/stock fresco y SLA de sincronización que puedan comunicarse sin
  prometer de más;
- identidad/SKU/variante y disponibilidad de personalización con evidencia
  suficiente;
- observabilidad de coste, latencia, errores, escalamiento y correcciones humanas;
- controles de abuso, límites, retención, consentimiento y revisión de claims en
  una exposición pública;
- estrategia de fallback cuando no exista precio, stock, imagen o mapping válido;
- benchmark comercial y política de Pricing de Conversión, que permanece
  shadow-only.

## 10. Guardrails comerciales y de evidencia

- `calculate_product_price_v2` y el contrato público de Pricing V2 siguen siendo
  la autoridad de precio; el Pricing de Conversión no se activa.
- El stock es observado o desconocido; no se transforma en promesa de
  disponibilidad, entrega o reserva.
- MOQ, SKU, proveedor, variante, imagen, categoría y publicación deben venir de
  datos autorizados; nunca del texto generado.
- `request_quote`, `unresolved` y `unavailable` se conservan cuando corresponda.
- La personalización, técnica, área, tintas, producción y plazo requieren
  revisión técnica/comercial cuando no exista evidencia completa.
- La IA puede extraer, normalizar, resumir o sugerir, pero no inventar claims,
  especificaciones, precio, stock, identidad, derechos ni disponibilidad.
- Governance y sus readiness states no son una segunda autoridad operativa ni
  publican por sí solos.
- El comprador debe distinguir recomendación, dato observado, inferencia y
  pendiente; cada afirmación relevante debe conservar provenance.
- La creación o modificación de CRM/cotizaciones requiere autorización,
  sesión/rol, idempotencia y estado `BORRADOR` cuando aplique.
- Gmail, WhatsApp y cualquier comunicación permanecen manuales y autorizados.

## 11. Piloto interno de 12 proyectos B2B

El alcance preservado es un piloto de **12 proyectos**, no una prueba ya
ejecutada en este handoff. `CHK-AI-ADVISOR-01` deberá fijar los casos concretos,
fixtures, datos permitidos, identidad QA y limpieza antes de correrlos.

La matriz debe cubrir, como mínimo, solicitudes con producto conocido y abierto,
cantidad/fecha conocidas y desconocidas, variante/color, presupuesto, kit
conceptual, adjunto visual, falta de precio o stock, ambigüedad de identidad,
personalización y handoff. Cada caso debe terminar en una decisión verificable:
opciones reales, pregunta adicional, `request_quote`, `unresolved` o
`unavailable`.

No se declara que los 12 casos estén evaluados ni que exista conversión comercial
por el solo hecho de que existan fixtures o playbooks.

## 12. Criterios de aprobación y revisión humana

El piloto solo puede pasar si demuestra, por caso y en conjunto:

- comprensión suficiente del objetivo y de los campos faltantes;
- selección de productos reales sin inventar SKU, identidad o variante;
- uso correcto de precio V2, MOQ y stock observado/desconocido;
- separación visible entre hecho, inferencia, sugerencia y pendiente;
- preservación de privacidad, consentimiento, provenance y trazabilidad;
- no escritura duplicada, no emisión, no envío y handoff humano verificable;
- comportamiento seguro ante ambigüedad, ausencia de fuente, fallo de herramienta
  y prompt fuera de alcance;
- reversibilidad y compatibilidad con el flujo público estable.

La revisión humana es obligatoria para publicación de claims, elección final de
producto/variante, impresión/personalización, disponibilidad, condiciones
especiales y cualquier acción de CRM/comunicación.

## 13. Riesgos, privacidad, claims y costes

Riesgos principales: alucinación de producto o precio; stale stock; identidad
equivocada; sobrepromesa de disponibilidad/entrega; exposición de PII; escritura
duplicada; fuga de costos internos; dependencia de un proveedor/modelo; latencia;
coste por consulta; abuso; y falsa sensación de automatización comercial.

La política debe minimizar datos, separar PII de contexto analítico, limitar
retención, registrar consentimiento y provenance, y impedir que el modelo vea o
exponga secretos, márgenes o reglas internas innecesarias.

Los costes de modelo, infraestructura, observabilidad, soporte, revisión humana
y oportunidad comercial **no están medidos**. No deben convertirse en una
promesa de margen, ahorro o ROI.

## 14. Dependencias pendientes

- cierre documental y de readiness de `CHK-BRAND-WEB-1`;
- certificación E2E y publicación controlada de las rutas públicas según sus
  dependencias reales;
- catálogo verificable y datos suficientemente frescos para el piloto;
- definición de los 12 fixtures y de los permisos QA;
- política de privacidad/retención y límites de claims para una futura exposición;
- presupuesto/telemetría de modelo y revisión humana disponible;
- autorización expresa del propietario para iniciar `CHK-AI-ADVISOR-01`.

## 15. Gate exacto de reactivación

No reactivar la iniciativa por calendario, entusiasmo, existencia de una RPC o
un commit. Deben cumplirse simultáneamente:

1. `CHK-BRAND-WEB-1` cerrado;
2. beta comercial con QA público/controlado documentada;
3. flujo catálogo → brief → solicitud → CRM → asesor validado en el alcance que
   se pretenda usar;
4. catálogo verificable para los 12 casos;
5. autorización expresa del propietario para abrir `CHK-AI-ADVISOR-01`.

## 16. Siguiente checkpoint y fuentes

El siguiente checkpoint de esta iniciativa, cuando el gate se cumpla, es
`CHK-AI-ADVISOR-01 — piloto interno del asesor`. Este handoff no lo inicia.

Fuentes canónicas disponibles:

- `docs/MASTER-STATE.md`;
- `docs/00_PROJECT_INDEX.md` y `docs/02_DECISION_LOG.md`;
- `docs/04_PRODUCT_SCOPE.md`, `docs/05_ARCHITECTURE.md` y
  `docs/07_OPERATIONS_ROADMAP.md`;
- `docs/06_SUPER_AGENTE_COMERCIAL.md` y `docs/10_QA_EVIDENCE.md`;
- `docs/11_CATALOG_GOVERNANCE_AND_PRODUCT_EXPERIENCE_DIRECTIVE.md`;
- `src/features/agent/` y `src/features/project-brief/`;
- `docs/brand-web/` para el gate Brand/Web;
- investigación de mercado y competencia mexicana conservada en la documentación
  de estrategia disponible al momento del diseño; sus resultados deben tratarse
  como `EXTERNAL_RESEARCH` con fecha y no como hechos runtime.

### Evidencia, hipótesis y límites

- **Evidencia:** existe un núcleo determinista reutilizable, playbooks piloto,
  herramientas de catálogo/precio/stock observado, vision QA, ruta de brief y
  QA controlada documentada en `docs/06_SUPER_AGENTE_COMERCIAL.md` y
  `docs/10_QA_EVIDENCE.md`.
- **Hipótesis:** ICP, segmentación, posicionamiento del asesor, valor de kits,
  impacto en conversión y disposición a pagar requieren validación comercial.
- **No comprobado en este handoff:** un piloto público, un agente autónomo,
  evaluación de 12 proyectos, ROI, costes operativos, stock fresco universal,
  disponibilidad final, impresión, WhatsApp AI y escritura CRM anónima.

**Cierre:** `CHK-AI-ADVISOR-HANDOFF — DOCUMENTED / PARKED`.
No iniciar `CHK-AI-ADVISOR-01` automáticamente.
