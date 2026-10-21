# PE Quality Gates — Gobernanza permanente

**Estado:** `GOVERNANCE_LOCAL_READY_FOR_REVIEW`
**Remediación:** `GOVERNANCE_CORRECTIONS_READY_FOR_FINAL_APPROVAL`
**Checkpoint:** `PE_QUALITY_GOVERNANCE_BUILD_01`
**Alcance:** documentación y gobernanza local; no cambia código funcional,
runtime, Supabase, Lovable, GitHub, CRM ni publicación.
**Autoridad de estado:** `docs/MASTER-STATE.md`
**Base verificada:** `origin/main` en
`38fda2887058dcddb60769353903f0f86d11aa87`.

## 1. Propósito y límites

Este documento convierte seis controles permanentes en un estándar operativo
reutilizable. Son capas lógicas de control, no seis tablas, seis agentes
autónomos ni seis autoridades comerciales.

Las autoridades runtime permanecen en sus contratos actuales:

- identidad y producto: `productos_b2b`;
- ofertas, variantes y mappings: tablas y contratos existentes;
- stock: fuentes de stock y status vigentes;
- precio y MOQ: Pricing V2;
- categorías: tablas y asignaciones existentes;
- elegibilidad pública: `producto_b2b_status.public_visible` y la proyección
  pública vigente;
- imágenes: Storage y `catalog-image-admin` según su contrato vigente;
- búsqueda: `catalog_search_products_v2` y cualquier proyección versionada
  aprobada para su alcance;
- solicitudes y CRM: contratos existentes de cotización/handoff;
- privacidad: `PE-PRIVACY-V1` y el gate operativo correspondiente.

Governance puede conservar evidencia, normalizar propuestas, registrar issues,
calcular readiness y recomendar una proyección controlada. No puede publicar,
reemplazar Pricing V2, repartir stock, cambiar una relación comercial ni
convertir una imagen o un hash en un master aprobado.

## 2. Jerarquía de decisión

1. Petición explícita del propietario para el checkpoint actual.
2. `docs/MASTER-STATE.md` para estado, checkpoint y siguiente paso.
3. `docs/02_DECISION_LOG.md` para decisiones permanentes.
4. Contratos especializados: alcance, arquitectura, Pricing V2, QA, claims,
   privacidad y directivas de catálogo.
5. Evidencia runtime fechada y reproducible.
6. Registro de especialistas y skills como mecanismo de enrutamiento, nunca
   como autoridad de negocio.

La separación de autoridades es explícita:

- `docs/MASTER-STATE.md` es la autoridad del estado operativo, checkpoint,
  alcance vigente y siguiente paso.
- `docs/02_DECISION_LOG.md` es la autoridad del historial de decisiones
  permanentes aprobadas.
- La petición humana actual gobierna el alcance autorizado del checkpoint.
- Cada contrato especializado conserva su propia autoridad runtime.
- Una contradicción se registra y bloquea únicamente la decisión o superficie
  afectada. Solo un defecto crítico transversal de seguridad, privacidad o
  integridad comercial puede bloquear fuera de ese alcance.

Si dos fuentes discrepan, ninguna se sobrescribe silenciosamente. Se conserva
la evidencia, se marca el conflicto y se requiere decisión humana registrada.

## 3. Estados comunes

- `DRAFT`: propuesta sin revisión suficiente.
- `READY_FOR_REVIEW`: evidencia y alcance preparados para revisión humana.
- `PASS`: comprobación completa dentro del alcance declarado.
- `PASS_WITH_CONDITIONS`: usable solo con límites explícitos.
- `NOT_VERIFIED`: falta una prueba, una fuente o una lectura runtime.
- `BLOCKED`: existe un bloqueo concreto que impide avanzar.
- `SUPERSEDED`: reemplazado por una decisión o versión posterior.
- `APPLIED`: aplicado al destino autorizado; no implica visualización pública.
- `CLOSED`: checkpoint cerrado con evidencia y decisión registrada.

`PASS`, `APPLIED` y `CLOSED` deben incluir alcance, fecha, ambiente, fuentes y
evidencia enlazable. Un mock, una captura aislada, una URL existente, un hash
coincidente o una respuesta de un agente no son suficientes por sí solos.

### Clase de evidencia y veredicto

La clase de evidencia y el veredicto son campos independientes. La clase
describe qué se observó; el veredicto describe qué decisión permite tomar:

- `STATIC_REVIEWED`: inspección de código, contrato, configuración o documento,
  sin ejecutar el destino.
- `TESTED_WITH_MOCKS`: prueba con fixtures, mocks o datos sintéticos.
- `VISUALLY_VERIFIED`: observación real de la interfaz en el ambiente declarado.
- `INTEGRATION_VERIFIED`: integración comprobada entre componentes o servicios
  en el ambiente declarado, sin afirmar necesariamente producción.
- `LIVE_VERIFIED`: comprobación contra el runtime real, con fecha y alcance.
- `NOT_VERIFIED`: no existe evidencia suficiente para una clase superior.

Cada registro de evidencia conserva como mínimo: SHA o artefacto exacto,
ambiente, procedimiento/prueba, fecha, responsable, alcance, resultado,
limitaciones y caducidad cuando aplique. Si cambia el artefacto, la
certificación anterior permanece como registro histórico y no certifica
automáticamente la versión modificada.

El `verdict` (`PASS`, `PASS_WITH_CONDITIONS`, `NOT_VERIFIED`, `BLOCKED`,
`CLOSED` u otro estado permitido) nunca se deduce solamente del nombre de la
clase de evidencia.

### Ciclo de vida de un hallazgo

Los hallazgos de calidad siguen, según corresponda, estos estados:

`OPEN` → `DIAGNOSED` → `FIX_PROPOSED` → `IMPLEMENTED_PENDING_QA` →
`VERIFIED_CLOSED`.

Una prueba fallida usa `QA_FAILED`; un cierre con alcance restringido usa
`CLOSED_WITH_LIMITATIONS`. No se usa `VERIFIED_CLOSED` sin evidencia posterior
a la corrección. Un cambio independiente no hereda automáticamente el bloqueo
de un P1 histórico, salvo que active un defecto crítico transversal de
seguridad, privacidad o integridad comercial.

## 4. G01 — Decisión única y gestión de conflictos

**Responsable:** S01/orquestador; decisión final del propietario o del
responsable humano del checkpoint.

**Activación:** dos propuestas, dos contratos, dos nombres para el mismo
estado, discrepancia entre runtime y documentación o cambio que afecte varias
superficies protegidas.

**Fuente:** petición actual, `MASTER-STATE.md`, decision log y contrato
especializado aplicable.

**Evidencia:** decision ID, alcance, alternativas, fuentes, fecha, impacto,
opción elegida, superseded, dependencias, owner y revisión.

**Estados/bloqueos:** `DRAFT → READY_FOR_REVIEW → CLOSED` con una decisión;
`BLOCKED` si falta autoridad; `SUPERSEDED` para la opción anterior. No se
permiten dos políticas activas.

**Excepciones/aprobación:** una emergencia solo puede limitar el impacto y
requiere registro humano posterior. Cambios de negocio, contratos, claims o
publicación requieren aprobación humana.

**Cumplimiento:** un único decision ID y fuente vigente deben poder citarse
desde `MASTER-STATE.md`; el historial queda marcado como histórico.

Los conflictos documentales 05D/05F/05H/05I se mantienen registrados y no se
resuelven por inferencia. Su efecto bloqueante se limita a futuros checkpoints
que alteren defaults, proyección pública o activación de modelos relacionados.
No bloquean por sí solos mejoras independientes.

## 5. G02 — Certificación exacta

**Responsable:** S02/evidencia, con S26/QA y el dueño del artefacto.

**Activación:** certificación de código, SQL, RPC, contrato, asset, runtime,
release o afirmación comercial.

**Fuente:** artefacto exacto, commit/SHA, ambiente real, contrato canónico y
evidencia fechada.

**Evidencia:** ruta, SHA-256 o commit, ambiente, versión, prueba/comando,
resultado, muestra, limitaciones, responsable y caducidad. En imágenes:
proveedor, SKU/variante, rol, dimensiones, MIME, derechos y estado visual.

**Estados/bloqueos:** `PASS` solo si hash y ambiente corresponden; cualquier
cambio posterior vuelve a `NOT_VERIFIED`. Diferencia de build o provenance
faltante es `BLOCKED`.

**Excepciones/aprobación:** `PASS_WITH_CONDITIONS` solo con condición, alcance
y owner escritos. `MASTER_APPROVED`, `PUBLIC_READY` y release requieren
aprobación humana.

**Cumplimiento:** ningún informe puede decir “validado” sin artefacto,
ambiente y evidencia.

## 6. G03 — Verificación de contratos y permisos

**Responsables:** S23/S24 para PostgreSQL/Supabase, S25 para TypeScript y S22
para Pricing V2 cuando aplique.

**Activación:** RPC, vista, tabla, tipos, permisos, `SECURITY DEFINER`,
`search_path`, payload, columnas, firma, precio, MOQ, stock, imagen o solicitud.

**Fuentes:** migración y definición instalada, contratos versionados, tipos TS,
consumidores reales, RLS/grants y documentación de autoridad.

**Evidencia:** firma y argumentos, `RETURNS TABLE` en orden, tipos,
nullabilidad relevante, grants por rol, seguridad, dependencias, errores,
consumidor, prueba focal y runtime cuando se afirme instalación.

**Estados/bloqueos:** diferencia de firma, columna o permiso es `BLOCKED`;
solo análisis estático es `NOT_VERIFIED` para runtime; RPC ausente o wrapper
incompatible impide release.

**Excepciones/aprobación:** cambios de contrato requieren nuevo checkpoint,
migración versionada, compatibilidad y autorización. No se corrigen contratos
históricos desde este documento.

**Cumplimiento:** búsqueda V2 y Pricing V2 se protegen contra modificaciones
fuera de sus checkpoints.

## 7. G04 — Release QA Gate B2B

**Responsables:** S27/release gate y S26/QA; apoyos S05/S11/S12, S22, S24 o
S29 solo cuando exista dependencia concreta.

**Activación:** antes de commit/push de release, aplicación SQL, sincronización
con Lovable, Preview o Publish, y tras cualquier cambio comercial.

Un release documental modifica únicamente estándares, índices, estado o
evidencia. Un cambio funcional modifica código, SQL, contratos, datos o
runtime. El primero exige trazabilidad documental y aprobación del alcance;
no implica que exista readiness de runtime. El segundo activa además los gates
técnicos y comerciales de la superficie modificada.

**Fuente:** `MASTER-STATE.md`, alcance, build/commit exacto, autoridades de
Pricing/stock/catálogo y evidencia del entorno destino.

**Evidencia:** Home → Route A → catálogo → búsqueda/filtro → PDP → variante →
cantidad/MOQ → solicitud; Home → Route B → brief → revisión; responsive
390/768/desktop; accesibilidad focal; estados loading/error/empty; contratos,
pruebas, diferencias de build y resultado de integración cuando aplique.

La criticidad de release se registra separada de la prioridad comercial:
`R0 BLOCKER` exige `NO-GO`; `R1 CONDITIONAL` exige condiciones antes de
promover la capacidad afectada; `R2 NON_BLOCKING` puede permanecer en backlog
o medición. `P1` comercial no implica `R0`.

**Estados/bloqueos:** P0/P1 bloquea cuando está dentro del alcance de este
release o cuando revela un defecto crítico transversal de seguridad, privacidad
o integridad comercial. Un P1 histórico independiente no bloquea
automáticamente otra superficie. Drift de release, contrato no probado,
Publish no verificable o escritura no autorizada es `BLOCKED`/`NO-GO`. Prueba
no ejecutada es `NOT_VERIFIED`.

**Excepciones/aprobación:** un piloto puede tener alcance reducido, identidad QA
 y no publicación; debe declarar qué queda fuera. Publish y cambios de autoridad
requieren aprobación humana.

**Cumplimiento:** release cerrado = commit/SHA, artefactos, pruebas,
diferencias, responsables y rollback documentados.

## 8. G05 — Cierre de fallas con evidencia posterior

**Responsables:** S26/QA y S02/evidencia; el dueño de la superficie confirma
alcance.

**Activación:** después de corrección, rollback, hotfix, contrato, asset o
remediación de claim.

**Fuente:** fallo reproducible, diff exacto, artefacto nuevo, misma prueba o
equivalente y evidencia posterior en el mismo ambiente.

**Evidencia:** hallazgo, repro antes, cambio, repro después, regresiones,
commit/SHA, ambiente, fecha, límites y superficies ajenas sin cambios.

**Estados/bloqueos:** el hallazgo puede estar `OPEN`, `DIAGNOSED`,
`FIX_PROPOSED`, `IMPLEMENTED_PENDING_QA` o `QA_FAILED`. Solo pasa a
`VERIFIED_CLOSED` si el defecto no reproduce y las regresiones pasan con
evidencia posterior. Un alcance restringido puede cerrar como
`CLOSED_WITH_LIMITATIONS`. Análisis estático usa
`evidence_class=STATIC_REVIEWED`; el veredicto de runtime permanece
`NOT_VERIFIED`. Una fuente externa rota es `EXTERNAL_DEPENDENCY`.

**Excepciones/aprobación:** no se cierra por mock, captura no reproducible o
desaparición temporal. P0/P1, claims, imágenes, identidad y disponibilidad
requieren aprobación humana.

**Cumplimiento:** distinguir siempre “fix aplicado” de “runtime confirmado”.

## 9. G06 — Integridad y procedencia comercial

**Responsables:** S19; S21 identidad; S16 imágenes; S20 stock; S22 Pricing;
S29 handoff; S24 seguridad, solo cuando exista dependencia concreta.

**Activación:** producto, modelo, variante, proveedor, imagen, SKU, precio,
MOQ, stock, solicitud, CRM, privacidad o claim.

**Fuentes:** payload proveedor, identidad canónica, oferta autorizada, Pricing
V2, stock observado, proyección pública, Storage, contrato CRM y privacidad.

**Evidencia:** cadena producto → variante → oferta → proveedor → imagen/SKU →
precio/MOQ → stock → solicitud; elegibilidad; provenance y derechos; separación
entre observado y confirmación final; ausencia de SKU sintético o foto cruzada.

La integridad comercial distingue dos clases:

- **A — información incompleta no confirmada:** un dato informativo ausente o
  pendiente puede mostrarse como “por confirmar”, siempre que no se presente
  como una confirmación comercial.
- **B — identidad ambigua:** si producto, variante, oferta, precio o MOQ no
  pueden asociarse de forma autoritativa, la selección no puede presentarse
  como confirmada. Debe conservarse el bloqueo o estado pendiente y solicitar
  evidencia; no se corrige con cambios cosméticos.

**Estados/bloqueos:** asociación ambigua, SKU sintético público, imagen sin
identidad, precio sin autoridad, stock general asignado a color, MOQ no
respaldado o privacidad incompleta es `BLOCKED`. Dato faltante se muestra
“por confirmar”, nunca se infiere.

**Excepciones/aprobación:** ninguna coincidencia por posición, similitud, color,
URL, hash o nombre reemplaza relación autoritativa. Una excepción requiere
owner, alcance y evidencia explícitos.

**Cumplimiento:** governance es read model auditable; no reemplaza stock,
Pricing, mappings o publicación.

## 10. Checklist único de cierre

1. G01: una decisión y fuente vigente.
2. G02: artefacto, SHA, ambiente y evidencia.
3. G03: contratos, tipos, permisos y consumidores compatibles.
4. G04: recorrido comercial, responsive, estados y release exacto.
5. G05: evidencia posterior sin regresión.
6. G06: identidad, provenance, precio, MOQ, stock, imágenes, solicitudes y
   privacidad conservan sus autoridades.
7. `MASTER-STATE.md` actualizado con estado, alcance, fecha y siguiente gate.
8. Sin cambios fuera de alcance, secretos, SQL aplicado o Publish no autorizado.

## 11. Excepciones y aprobación

Toda excepción registra `exception_id`, regla, motivo, alcance, riesgo,
mitigación, owner, aprobador humano, caducidad y criterio de retorno.

Los especialistas recomiendan; no votan, conceden permisos ni autorizan
publicación. El orquestador integra. El propietario conserva la decisión de
negocio y release.

## 12. Plan de mejoras por paquetes

Estos paquetes son backlog gobernado; no autorizan desarrollo.

| Paquete | Prioridad | Dependencias | Especialistas | Criterio mínimo | Gates |
|---|---|---|---|---|---|
| P01 Identidad comercial y variantes | P1 | producto/oferta; catálogo | S19, S21, S26 | nombre, color, SKU y oferta coinciden | G01–G06 |
| P02 Claves técnicas visibles | P1 | P01 | S21, S25, S05 | ningún `FP|`, `CDO|` o nombre proveedor público | G01, G03, G05, G06 |
| P03 Claims y mensajes | P1 | claims gate y copy owner | S02, S06, S03 | cada claim clasificado y aprobado | G01, G02, G05, G06 |
| P04 Overflow móvil | P1 | build y QA 390/768 | S12, S25, S26 | cero overflow y controles utilizables | G03–G05 |
| P05 SEO, metadata y sitemap | P1 | release y dominio | S17, S25, S26 | metadata/canonical/robots/sitemap coherentes | G01–G05 |
| P06 Buscador global | P1 | Search V2 y rendimiento | S10, S17, S18, S26 | búsqueda accesible y no-resultados recuperables | G01, G03–G05 |
| P07 Navegación y Route B | P1 | Copy Lock, brief y CRM | S05, S29, S26 | Route B accesible y handoff consistente | G01, G04–G06 |
| P08 Responsive integral | P2 | release y viewport matrix | S12, S13, S26 | 390/768/1024/1440 sin solapamientos | G02, G04, G05 |
| P09 Solicitud, formularios y CRM | P1 | CRM/privacy y QA | S29, S24, S26 | campos, consentimiento, idempotencia y estados | G03–G06 |
| P10 Analítica, observabilidad y rendimiento | P2 | autorización de medición | S18, S30, S26 | métricas y errores medibles, sin claims inventados | G01–G05 |

La prioridad indicada en la tabla es comercial. La criticidad de release se
determina por G04 para cada alcance y no se deriva automáticamente de P1/P2.
P06 es prioridad comercial P1 para el siguiente paquete de navegación y
reutiliza búsqueda V2; no se implementa en este checkpoint ni bloquea por sí
solo mejoras independientes.

Por defecto, P06 tiene criticidad de release `R2 NON_BLOCKING`. Puede subir a
`R1 CONDITIONAL` al preparar un cutover o cambio de contrato, y solo es `R0`
si existe evidencia de ruptura del buscador vigente, pérdida de identidad,
precio o MOQ, exposición de variantes bloqueadas o regresión de la ruta
comercial crítica.

## 13. Secuencia y revisión

1. Resolver release y estado de `CHK-BRAND-WEB-1`.
2. Abrir checkpoint para P01/P02/P03 si el propietario lo prioriza.
3. Corregir P04/P05 antes de promoción pública.
4. Validar P07/P09 con QA controlado sin datos reales.
5. Medir P06/P08/P10 antes de ampliar alcance.

La inclusión de un paquete no autoriza su implementación. Revisar este estándar
cuando cambie una autoridad runtime, contrato, privacidad, release o alcance.
No crear un segundo Decision Ledger.
