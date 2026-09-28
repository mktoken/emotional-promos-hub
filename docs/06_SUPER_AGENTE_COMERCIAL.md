# SUPER AGENTE COMERCIAL — EMOTIONAL PROMOS HUB

## Estado y propósito

Este documento canoniza la arquitectura futura del Super Agente Comercial B2B especializado en artículos promocionales. En esta ejecución no se construye el agente completo, no se integra WhatsApp AI y no se cambia el flujo productivo estable.

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

## Primer checkpoint futuro

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

Este checkpoint se define, pero no se implementa en la misión Operación Primero si antes aparece un P0 operativo.

## Relación con el gate de lanzamiento público

`CHK-AI-SALES-1` continúa siendo el siguiente frente operativo y no se interrumpe ni se amplía por la decisión de marca. La operación comercial controlada, QA, CRM y Pricing shadow pueden continuar desde la baseline aprobada.

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
