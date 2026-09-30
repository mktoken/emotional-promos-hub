# SUPER AGENTE COMERCIAL — EMOTIONAL PROMOS HUB

## Estado y propósito

Este documento canoniza la arquitectura del Super Agente Comercial B2B especializado en artículos promocionales. `CHK-AI-SALES-1` cerró PASS para el caso QA acotado de 50 libretas; `CHK-AI-SALES-2` añadió y validó un piloto Web cliente local/controlado sobre el mismo núcleo. No existe un agente autónomo completo ni un canal Web público desplegado. No se integró WhatsApp AI ni se cambió el flujo productivo estable.

El objetivo inicial es llevar una solicitud como **“Quiero 50 libretas para un evento corporativo”** hasta una operación estructurada y lista para revisión humana, sin inventar precios, stock, proveedores, técnicas de impresión ni datos de empresa.

## Principio arquitectónico

Debe existir un solo cerebro comercial central. Web, WhatsApp y futuros canales consumen los mismos contratos de catálogo, Pricing V2, CRM, expediente, inteligencia, reglas y cotización. No se crearán dos agentes con lógica divergente.

```text
Canal Web / WhatsApp
        ↓
Super Agente Comercial Central
        ↓
Sector Intelligence + Company Intelligence + Opportunity Context
        ↓
Catálogo / stock / precio autorizado / alternativas
        ↓
Prospecto → oportunidad → cotización borrador → human handoff
```

## Capas de contexto

### Sector Intelligence Layer

Conocimiento preestudiado y reutilizable por sector y caso de uso:

- sector y subsector;
- necesidades, eventos y audiencias;
- categorías y afinidades de producto;
- productos recomendados y productos a evitar;
- presupuesto, kits, cross-sell y estacionalidad;
- preguntas comerciales y objeciones;
- reglas de recomendación y nivel de confianza.

El agente no debe investigar un sector completo desde cero en cada conversación.

### Company Intelligence Layer

Perfil persistente por empresa, siempre con fuente y confianza:

- nombre, dominio y sitio;
- sector, tamaño y sedes cuando estén sustentados;
- identidad visual, colores y posicionamiento;
- audiencias y contexto;
- cotizaciones, compras y preferencias;
- `source`, `confidence` y `last_verified`.

Una empresa conocida se actualiza puntualmente; no se vuelve a investigar completa sin motivo.

### Opportunity Context

Estado vivo de una oportunidad concreta:

- producto, SKU, cantidad, color y presupuesto;
- evento, audiencia, fecha, entrega, ciudad y urgencia;
- estilo, personalización, logo y técnica solicitada;
- productos seleccionados, descartados y alternativas;
- competidor, intención, siguiente acción y motivo de pérdida si existe.

## Contrato operativo inicial

### Entradas

El agente puede recibir texto, datos de contacto y, en una fase posterior, imágenes, screenshots, logos, arte o productos de referencia. Cada dato debe clasificarse como proporcionado por el cliente, inferido, investigado o confirmado.

### Salidas

Una operación lista para revisión humana debe incluir:

- expediente estructurado;
- producto real, SKU, imagen, URL y disponibilidad comprobada o estado explícito;
- precio autorizado o `request_quote`/`unresolved`/`unavailable`;
- alternativas y productos similares;
- empresa, evento, audiencia, presupuesto y fecha;
- prospecto y oportunidad CRM;
- cotización borrador sin emisión automática;
- preguntas abiertas, confianza por dato y human handoff.

## CHK-AI-SALES-5 — attachments visuales

El estado de oportunidad conserva `attachments[]` sin romper snapshots v1/v2. El intake local/QA valida MIME, extensión/nombre y límite de 10 MB; muestra preview, tipo, estado y permite eliminar antes de guardar. Los archivos pueden vincularse a una o varias líneas sin duplicación física.

Las observaciones están versionadas con `attachmentId`, fecha, fuente, certeza y confianza. El motor del E2E visual QA es OpenAI `openai/gpt-6-luna` por Lovable AI Gateway `/v1/responses`, contrato estricto `commercial_vision_v1` y Zod. La integración Gemini anterior queda como compatibilidad histórica/rollback; su metadata heredada no determina el modelo runtime. Fotos y screenshots derivan criterios, pero producto/SKU salen del catálogo, precio de Pricing V2 y stock de la autoridad existente.

Un candidato visual pre-pricing conserva identidad real de catálogo pero puede existir con cantidad desconocida, precio nulo y stock no comprobado. El MOQ no filtra mientras la cantidad es desconocida; Pricing V2 y stock no se consultan prematuramente. La selección requiere acción explícita del comprador. Solo tras cantidad real y MOQ válido se consulta precio/stock y se transforma el candidato en `AgentProduct`/product line. Disponibilidad final e impresión permanecen por confirmar y el handoff sigue siendo humano.

**Estado:** **CLOSED / PASS** para el E2E QA visual controlado del 2026-09-29: fixture neutral, contrato V1 validado, categoría taza, candidatos reales, SAHARA explícito, 50 piezas, MOQ 44, SKU T 98, precio V2, stock observado, product line, Opportunity Context, oportunidad/cotización `BORRADOR` y handoff. No hubo emisión, correo ni WhatsApp. El PASS no abarca runtime de logo/competidor ni un lanzamiento público. La evidencia completa está en `docs/10_QA_EVIDENCE.md`.

## Niveles de autonomía

1. Informar.
2. Recomendar.
3. Construir la operación.
4. Preparar cotización.
5. Cerrar automáticamente.

El objetivo inicial es **Nivel 4**. El Nivel 5 queda fuera de alcance hasta contar con evidencia, permisos, política de precios, control de comunicaciones y rollback suficientes.

## Guardrails obligatorios

- La autoridad productiva de precio sigue siendo `calculate_product_price_v2`.
- Pricing de Conversión México permanece shadow-only.
- No inventar precio, stock, proveedor, vigencia, plazo o costo de impresión.
- `request_quote`, `unresolved` y `unavailable` deben conservar su estado.
- La impresión se confirma manualmente mientras no exista evidencia completa de técnica, compatibilidad y precio.
- No crear ni modificar prospectos, oportunidades o cotizaciones sin una operación autorizada e idempotente.
- Gmail y WhatsApp siguen siendo acciones manuales con autorización y destinatario controlado.
- Toda recomendación debe poder llevar fuente, fecha y confianza.

## Primer checkpoint — estado parcial

### CHK-AI-SALES-1 — solicitud simple de 50 libretas

Caso único inicial: **“Quiero 50 libretas para un evento corporativo.”**

Criterios de aceptación propuestos:

1. Capturar necesidad, cantidad, evento, fecha, ciudad, empresa y contacto.
2. Resolver producto real o devolver alternativas explícitas.
3. Mostrar imagen, URL, stock y precio autorizado cuando existan.
4. Mantener `request_quote`, `unresolved` o `unavailable` sin inventar valores.
5. Crear expediente, prospecto y oportunidad sin duplicar por reintento.
6. Preparar una cotización borrador y detenerse en human handoff.
7. Registrar fuentes, confianza y campos faltantes.
8. Validar Web primero; reutilizar el mismo contrato para WhatsApp después.

El primer incremento está implementado en `src/features/agent/` como flujo determinista de QA, detrás de `VITE_ENABLE_AGENT_QA=true` y en ruta CRM restringida. `CHK-AI-SALES-1-RUNTIME-1B` validó en sesión CRM autorizada el caso E2E de 50 libretas: catálogo/Precio V2 reales, selección, variante azul, cambio a 80, contexto persistido, prospecto/oportunidad QA y cotización `COT-2026-00009` en `BORRADOR`, sin emisión ni envío. `CHK-AI-SALES-1` queda **CERRADO / PASS para este caso QA acotado**. El asistente histórico de captura sigue disponible sin cambios.

### CHK-AI-SALES-2 — adaptador Web cliente local

El piloto `/agente-piloto` está aislado por `VITE_ENABLE_AGENT_WEB_PILOT=true`, OFF por defecto, y solo se registra en `localhost`/`127.0.0.1`; no aparece en navegación ni SEO. `AgentQaPage` y el piloto usan el mismo `agent-workflow.ts`, estado comercial y herramientas de catálogo, stock observado y precio público V2. La UI compradora no muestra IDs CRM, trazas, costos, márgenes ni controles de emisión/envío. La conversación comienza anónima; el contacto se pide únicamente antes de preparar la operación. Durante QA, solo se acepta identidad controlada y la escritura CRM exige sesión con rol comercial. La ruta oculta y la bandera no sustituyen ese control de acceso.

El E2E local con 50 libretas seleccionó BOOKRAFT Royal Blue a 80 piezas y produjo `COT-2026-00010` en `BORRADOR`, con prospecto QA reutilizado, oportunidad nueva y handoff humano. El producto/variante/precio se reconsultan antes de escribir. El contexto de la oportunidad registra el ID del prospecto reutilizado sin alterar el `web_lead_id` histórico del prospecto. No hubo emisión ni envío. `CHK-AI-SALES-2` queda **CERRADO / PASS del piloto local controlado**; habilitar escritura anónima para clientes reales, desplegar al público, perfiles de empresa y conversación amplia sigue fuera de alcance.

### CHK-AI-SALES-3 — multiproducto y cotización multilínea

Se evolucionó el núcleo compartido en `src/features/agent/`, sin crear otro agente. `OpportunityState` v2 conserva `productLines[]` y una línea activa; cada necesidad tiene candidatos, producto/variante, cantidad, precio V2, stock observado, estado y personalización propios. Se admite migración del estado de una sola línea, referencias por categoría/opción, cambio/reemplazo, retiro y reingreso. Si una referencia no identifica una línea con seguridad, el sistema pregunta y no muta otra.

`/crm/agente-qa` y el piloto local presentan las mismas líneas y resumen comercial. La cotización agrupa productos seleccionados y activos en una sola oportunidad y un solo formal quote `BORRADOR`; sus partidas se reconcilián por `lineId`, se excluyen las retiradas y los totales se calculan antes de IVA, IVA 16% y total con IVA. La personalización se guarda por línea; no se inventa técnica ni precio de impresión. Precio público V2 se reconsulta por producto/cantidad y el stock sigue siendo observado, no disponibilidad final. No se incorpora Pricing Conversion Shadow, WhatsApp, G4, impresión automática, ni envío/emisión.

**Validación disponible:** 40/40 tests dirigidos PASS; suite completa 134/134 PASS; tipos PASS; lint dirigido PASS; build normal y build con flags QA/piloto PASS; `git diff --check` PASS. **E2E runtime:** PASS local/controlado. Se probaron libreta BOOKRAFT (`T671`, 50, Royal Blue), Termo Krypton (`TER-KRI`, 80, Blanco) y Bolsa Kyoto (`C540`, 150), con precio V2 y stock observado por línea, retiro/reingreso, ambigüedad segura, persistencia, handoff y UI desktop/mobile. Se reutilizó el prospecto QA y se creó una sola oportunidad y `COT-2026-00011` en `BORRADOR`, con tres partidas, subtotal `$17,445.40`, IVA `$2,791.26` y total `$20,236.66`; `issued_at` y `sent_at` permanecen vacíos. `CHK-AI-SALES-3` queda **CERRADO / PASS**; no hubo despliegue, emisión ni envío.

### CHK-AI-SALES-4 — inteligencia comercial inicial

`src/features/agent/lib/agent-intelligence.ts` mantiene separadas Sector Intelligence, Company Intelligence y Opportunity Context. Incluye provenance (`FACT`, `INFERENCE`, `USER_PROVIDED`, `INTERNAL_HISTORY`, `EXTERNAL_RESEARCH`), confidence y `lastVerified`. Se cargaron únicamente dos playbooks piloto sustentados por documentación interna: Eventos corporativos y Compras B2B.

La identidad QA reutiliza el perfil `qa-promohub`, mientras una empresa desconocida recibe solo un perfil mínimo con datos proporcionados por el usuario. Las recomendaciones agregan razones comerciales y cross-sell conceptual, y los kits son ideas sin SKU ni precio. Todo producto, SKU, precio, stock y disponibilidad continúa viniendo de las herramientas deterministas del catálogo.

E2E contextual local: el QA recibió “Quiero 50 libretas para un evento corporativo”, recomendó categorías reales con razón de encaje y complemento conceptual, agregó 50 termos, registró fecha `2026-10-15`, Ciudad de México, presupuesto `25000` y personalización pendiente. Se creó una sola oportunidad `20241fd6-f8e8-49d8-b8d8-49d906ec1a38` y `COT-2026-00013` en `BORRADOR`, con Libreta Pocket y Termo Krypton, subtotal `$10,430.00`, IVA `$1,668.80`, total `$12,098.80` y handoff enriquecido. No se emitió ni se envió.

**Validación:** 34/34 pruebas dirigidas de inteligencia/regresión en el corte focal; suite completa **139/139 PASS**; tipos, lint dirigido, build normal y build QA/piloto PASS; `git diff --check` PASS. La inteligencia no está desplegada públicamente, no realiza crawler masivo, no integra WhatsApp AI, visión, Pricing Conversion ni perfiles CRM generales.

## Relación con el gate de lanzamiento público

La validación runtime del caso QA y del piloto Web local está cerrada. El canal público para clientes reales no está autorizado; sus brechas requieren definición y checkpoint separados. La decisión de marca no interrumpe la operación comercial controlada, QA, CRM ni Pricing shadow.

Antes de un lanzamiento público, promoción activa, campañas de adquisición o escalamiento significativo de tráfico hacia `articulospromocionales.vip`, debe cerrarse `CHK-BRAND-WEB-1 — REDEFINICIÓN DE MARCA, COMUNICACIÓN Y EXPERIENCIA WEB`. Ese gate es posterior y transversal: define posicionamiento, comunicación, experiencia e identidad de la web, pero no bloquea el desarrollo controlado del Super Agente.

## Visión e imágenes

El agente podrá interpretar tipo, estilo, color, similitud y referencias visuales para buscar productos comparables y registrar logos. No podrá certificar automáticamente Pantone, técnica de impresión, tamaño final, costo de impresión o viabilidad productiva.

## Fuera de alcance de esta ejecución

- construir el Super Agente completo;
- integrar WhatsApp AI;
- crear scraping de competidores;
- activar Conversion Pricing;
- resolver G4;
- finalizar impresión automática;
- rediseñar la web completa.
