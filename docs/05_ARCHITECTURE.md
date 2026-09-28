# ARQUITECTURA COMPROBABLE — EMOTIONAL PROMOS HUB

## Alcance

Este documento resume la arquitectura que puede comprobarse en el repositorio. No incluye secretos, valores de `.env`, credenciales ni afirmaciones sobre infraestructura externa que no estén versionadas.

## Vista general

```mermaid
flowchart LR
  V[Visitante público] --> SPA[React/Vite SPA]
  SPA --> CAT[Catálogo V2]
  SPA --> QUOTE[Selección y solicitud]
  QUOTE --> RPCQ[RPC submit_public_quote_request]
  RPCQ --> LEAD[cotizaciones_leads / CRM]
  STAFF[Personal autenticado] --> CRM[CRM / cotizaciones]
  CRM --> FORMAL[Cotización formal]
  FORMAL --> MANUAL[Acciones manuales Gmail / WhatsApp]
  SPA --> AUTH[Supabase Auth interno]
  AUTH --> CRM
  PROVIDERS[Proveedores] --> SYNC[Edge Functions de sincronización]
  SYNC --> CACHE[Cachés y tablas de catálogo]
  CACHE --> RPCP[RPC catalog_search_products_v2]
  RPCP --> CAT
```

## Frontend

Confirmado por `package.json`, `vite.config.ts`, `src/App.tsx` y la estructura de `src/`:

- React 18.
- Vite.
- TypeScript.
- React Router.
- Componentes UI basados en Radix/shadcn y Tailwind.
- React Query.
- Cliente tipado de Supabase.

Rutas principales:

- `/` — experiencia pública.
- `/login` — acceso del equipo.
- `/auth/update-password` — actualización de contraseña desde recuperación.
- `/crm/*` — aplicación CRM autenticada.

Rutas CRM comprobables:

- `/crm`
- `/crm/prospectos`
- `/crm/prospectos/:id`
- `/crm/cotizaciones`
- `/crm/cotizaciones/:id`
- `/crm/cotizaciones-formales`
- `/crm/cotizaciones-formales/:quoteId`
- `/crm/cotizaciones-formales/:quoteId/imprimir`
- `/crm/campanas`
- `/crm/mi-perfil`
- `/crm/configuracion`

## Git, GitHub y Lovable

- GitHub contiene el repositorio `mktoken/emotional-promos-hub`.
- Lovable es el entorno integrado de trabajo y publicación identificado por el proyecto `406ed62b-fa9a-4346-82b6-4b111a4193b3`.
- Git es la evidencia primaria del código.
- Lovable puede crear commits o planes automáticamente; su estado debe compararse con Git antes de integrar.
- La versión publicada en producción requiere validación específica; un commit presente en Git no demuestra por sí solo el despliegue.

## Supabase interno y Auth

El proyecto importa el cliente desde `src/integrations/supabase/client.ts` y usa Auth con:

- `persistSession: true`;
- `autoRefreshToken: true`;
- almacenamiento local o broker de preview según el entorno.

Supabase se trata como integrado dentro de Lovable. No se documentan aquí credenciales ni se asume un Dashboard externo.

Rutas y flujos Auth comprobables:

- login con `signInWithPassword`;
- logout con `signOut`;
- cambio de contraseña con `updateUser`;
- recuperación con `resetPasswordForEmail`;
- actualización en `/auth/update-password`.

## Datos, RPC y tablas relevantes

Las siguientes entidades aparecen en código, migraciones o QA versionado:

- `profiles` y `user_roles` para identidad y roles CRM;
- `cotizaciones_leads` y `articulos_cotizados` para solicitudes y productos;
- `catalog_price_cache` para caché pública Legacy;
- `catalog_price_cache_v2_generations` y `catalog_price_cache_v2_shadow` para generaciones y resultados shadow;
- `catalog_price_v2_releases` para el puntero de release V2;
- `proveedores` y `provider_import_batches` para proveedores e importaciones;
- tablas de productos y catálogo referenciadas por las migraciones y RPCs.

RPCs relevantes:

- `public.submit_public_quote_request`;
- `public.catalog_search_products_v2`;
- `public.get_public_product_price_quote`;
- `public.publish_catalog_price_v2_generation`;
- `public.rollback_catalog_price_v2_to_legacy`;
- `public.set_cotizacion_lead_follow_up`.

La matriz completa vigente de columnas, políticas RLS y grants no está consolidada en un documento único. Consultar migraciones y QA específicos antes de afirmar una configuración actual completa.

## Pricing y catálogo

- `CatalogView` usa la búsqueda V2.
- Pricing V2 tiene generaciones, shadow, release y rollback.
- Legacy se conserva como respaldo.
- La lógica de precio está en funciones/RPC y Edge Functions versionadas, no en una copia independiente del frontend.
- El estado operativo actual de stock y precios requiere validación específica; la arquitectura no equivale a confiabilidad comercial actual.
- El diagnóstico read-only de 2026-09-26 observó carga y paginación intermitentes. `CatalogView` deriva `page` desde la URL, calcula `p_offset` como `(page - 1) * 24` y actualiza los parámetros mediante `goToPage`; no se aisló una causa de código, red, sesión o RPC.

## CRM y cotizaciones

- El CRM se organiza bajo `src/features/crm`.
- Prospectos, cotizaciones, cotizaciones formales, campañas, perfil y configuración tienen páginas separadas.
- La cotización formal tiene edición, impresión/PDF y trabajos de impresión.
- Las acciones Gmail/WhatsApp son aperturas manuales preparadas desde la cotización. Existe evidencia E2E controlada de envío, recepción y PDF para `COT-2026-00008`; no debe extrapolarse a comunicaciones generales.

## Proveedores y sincronizadores

Edge Functions versionadas relevantes:

- `sync-cdo-products` — proveedor `cdo_mx`;
- `sync-forpromotional-products` — proveedor `forpromotional`;
- `sync-g4-products` — proveedor `g4_mx`;
- `refresh-provider-stock` — coordina refrescos;
- `promote-provider-products-to-catalog` — promoción controlada;
- `test-cdo-connection`, `test-forpromotional-connection`, `test-g4-connection` — pruebas de conexión;
- `recompute-catalog-price-cache-v2` — recomputación V2;
- `capture-assistant-lead` y `send-proposal-summary-email` — funciones adicionales versionadas.

La fecha, salud y resultado de la última sincronización operativa de cada proveedor no están documentados como estado vigente.

## Preview frente a producción

- En preview Lovable, `previewAuthStorage.ts` puede intermediar la sesión mediante `postMessage` validado.
- Fuera de las zonas de preview, el cliente usa `localStorage`.
- Producción es `https://articulospromocionales.vip`.
- La validación de producción debe hacerse desde la URL publicada, no solo desde una preview.

## Límites conocidos

- No se documentan secretos ni credenciales.
- No se confirma desde este documento el estado actual de publicación de cada Edge Function.
- No se confirma aquí el estado actual de proveedores, stock, imágenes, fichas ni impresión.
- No se debe usar este documento para declarar un checkpoint cerrado.

## Pricing de Conversión México — shadow mode

`src/lib/pricing-conversion-shadow.ts` implementa un functor puro de simulación. No importa el cliente Supabase, no ejecuta RPCs, no conoce rutas, no escribe cachés y no publica resultados. Su contrato recibe `source_cost`, un `provider_factor` solo para trazabilidad y/o `adjusted_cost` ya resuelto, más cantidad y observaciones opcionales.

La secuencia calculada es:

```text
source_cost → provider_adjustment → adjusted_cost → quantity → purchase_base
→ pricing_regime → internal_economic_price → market_reference
→ competitive_corridor → profitability_floor → recommended_price
```

`purchase_base` es `adjusted_cost × quantity`, antes de markup, impresión, IVA y envío. Los regímenes y límites son configurables: `SMALL_ORDER` desde `$1,500` hasta antes de `$5,000`, `MARKET_AWARE` desde `$5,000` y `ENTERPRISE` desde `$55,000`. La influencia de mercado usa una función continua entre `$4,500` y `$7,500`, sin un salto especial en `$5,000`.

El benchmark es una estructura para observaciones curadas de Compudat, Smart Promocionales, Artículos Promocionales de México y TodoPromocional. La normalización solo conserva mismo SKU, MXN, cantidad comparable, tratamiento homogéneo de IVA, sin impresión ni envío, observación vigente y stock razonable. Se calculan mínimo, P25, mediana, P75, máximo y conteo; la mediana es la referencia central configurable. No hay scraping ni observaciones inventadas en esta implementación.

El precio híbrido combina precio económico y referencia de mercado solo con datos suficientes. Sin benchmark suficiente, la salida conserva el precio interno y marca `market_adjustment_applied: false`. El piso configurable se aplica con `max(floor, hybrid)` y, si rebasa el corredor alto, el resultado se clasifica `NOT_COMPETITIVE` en lugar de ocultarlo. La salida incluye `shadow_only: true` y una comparación opcional contra Current V2; `calculate_product_price_v2` continúa siendo la autoridad pública.

Para enterprise la salida ya puede exponer precio recomendado, benchmark, piso, utilidad, margen y `discount_headroom` (la distancia utilizable sobre el piso cuando este existe). La interfaz `ConversionPricingTelemetry` reserva `quoted_price`, `benchmark_position`, `requested_discount`, `final_price`, `won/lost`, `loss_reason`, `gross_profit` y `lead_source` para una instrumentación futura, sin persistirlos ni aplicar ML en esta fase.

Los defaults de margen y corredor incluidos en el módulo son **SIMULATION DEFAULTS**, no una política comercial permanente. La activación requerirá una canasta competitiva mexicana curada, validación de parámetros, decisión de redondeo y un checkpoint posterior.
