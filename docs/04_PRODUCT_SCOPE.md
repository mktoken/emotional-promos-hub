# ALCANCE DEL PRODUCTO — EMOTIONAL PROMOS HUB

## Fuente y límite

Este documento describe el producto que puede demostrarse mediante el repositorio, `MASTER-STATE.md` y la evidencia QA existente. No convierte ideas de planes históricos en funcionalidades actuales.

## Propósito demostrado

Emotional Promos Hub es una plataforma B2B para que compradores corporativos exploren artículos promocionales, armen una selección y soliciten una cotización que el equipo comercial pueda trabajar en un CRM.

El sistema actual combina:

- experiencia pública de catálogo;
- selección de productos y solicitud de cotización;
- CRM interno para prospectos y cotizaciones;
- cotización formal;
- seguimiento interno;
- autenticación para el equipo comercial;
- fuentes de productos, precios e inventario de proveedores.

## Usuarios y roles comprobables

| Usuario | Estado | Evidencia |
|---|---|---|
| Visitante público | IMPLEMENTADO / VALIDADO | Home, catálogo y solicitud pública comprobados en producción |
| Personal comercial autenticado | IMPLEMENTADO / VALIDADO | `/crm`, `useCrmAuth`, perfiles y roles en el código |
| `sales_agent` | IMPLEMENTADO en control de navegación | Rol incluido en `CrmSidebar`; permisos completos no documentados aquí |
| `sales_manager` | IMPLEMENTADO en control de navegación | Rol incluido en `CrmSidebar`; permisos completos no documentados aquí |
| `admin` | IMPLEMENTADO en control de navegación | Acceso adicional a configuración; matriz completa de permisos pendiente |

## Flujo funcional principal

```text
Cliente
  → Home público
  → Catálogo y búsqueda
  → Ficha de producto
  → Selección, cantidad y observaciones
  → Solicitud de cotización
  → Prospecto / oportunidad en CRM
  → Cotización formal
  → Emisión
  → Acciones manuales Gmail / WhatsApp
  → Seguimiento comercial
```

## Áreas del producto

### Catálogo y productos

- **IMPLEMENTADO:** listado, búsqueda, categorías, ficha, imágenes y selección.
- **VALIDADO:** catálogo público y navegación fueron comprobados en producción; el corte documentado reportó 992 productos visibles y 42 páginas.
- **PENDIENTE:** confiabilidad operativa actual de stock, precios, imágenes y fichas de proveedor.

### Solicitud de cotización

- **IMPLEMENTADO:** selección, cantidades, modalidad, datos de contacto y observaciones por producto.
- **VALIDADO:** flujo QA cliente → CRM y persistencia de observaciones mediante los sub-checkpoints documentados.
- **PARCIAL:** los totales pueden ser estimados o quedar por confirmar según el estado del precio.

### CRM y cotización formal

- **IMPLEMENTADO:** prospectos, oportunidades, seguimiento, cotizaciones y cotizaciones formales.
- **VALIDADO:** solicitud QA recibida, convertida en `COT-2026-00008`, emitida y visible para el vendedor.
- **PARCIAL:** la gestión completa posterior al envío todavía requiere validación real.

### Auth

- **IMPLEMENTADO:** login, cambio de contraseña y recuperación.
- **VALIDADO:** AUTH-1 y AUTH-2, incluida recuperación real por correo en producción.

### Observaciones por producto

- **IMPLEMENTADO:** captura pública, transporte, persistencia y visualización interna.
- **VALIDADO:** sub-checkpoints 1–4 y evidencia E2E QA.

### Gmail y WhatsApp

- **IMPLEMENTADO:** acciones manuales `Abrir Gmail` y `Abrir WhatsApp`.
- **VALIDADO:** presencia en Lovable y producción; destinatario, asunto y mensaje preparados visualmente.
- **NO COMPROBADO:** envío real y entrega al cliente.

### Pricing V2, proveedores y stock

- **IMPLEMENTADO:** contratos, funciones, cachés, releases, proveedores y sincronizadores versionados.
- **VALIDADO:** dry run, shadow write, assertions y estados de Pricing V2 en los cortes históricos indicados.
- **PENDIENTE / NO COMPROBADO:** que los precios y existencias actuales sean operativamente confiables para operar sin revisión comercial.

### Impresión y personalización

- **IMPLEMENTADO:** campos de personalización, trabajos de impresión y componentes de cotización formal.
- **PARCIAL:** en la evidencia QA de `COT-2026-00008` la impresión figuró pendiente.
- **NO COMPROBADO:** proveedor, costo y precio real de impresión para operación comercial.

## Fuera del alcance o no comprobado

- Envío real de correo.
- Envío real de WhatsApp.
- Entrega al cliente.
- Stock actual de cada proveedor.
- Precios actuales y reglas operativas de descuentos.
- Aprobación de excepciones comerciales.
- Disponibilidad actual de imágenes y fichas de producto.
- Estrategia de conversión, campañas y publicaciones.
- Roadmap y backlog aprobados.
- Matriz completa de permisos por rol.
