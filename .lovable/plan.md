# Sprint 2.9A — Plan (diagnóstico y build futuro, no aplicar aún)

## 1. Diagnóstico

### 1.1 ¿Quién abre WhatsApp automáticamente?

Archivo: `src/components/QuoteCartView.tsx`, función `submitQuote`, línea ~165:

```
window.open(`https://wa.me/5215530311686?text=${encodeURIComponent(mensaje)}`, "_blank");
```

Se ejecuta después del INSERT en `cotizaciones_leads` y antes de pasar a `checkoutStep = "success"`. Es lo que dispara la apertura automática.

En la vista `success` (líneas ~188-197) ya existe un botón "Acelerar por WhatsApp" que es el CTA opcional correcto — ese se conserva tal cual.

### 1.2 ¿Cómo se está creando la `formal_quote` desde `cotizaciones_leads`?

En `src/features/crm/pages/CotizacionDetail.tsx` (líneas ~262-315). El botón "Crear cotización formal":

1. `INSERT` en `formal_quotes` con `cotizacion_lead_id`, `cliente` (raw `datos_cliente`), `assigned_to`, `created_by`.
2. Llama a `mapLeadArticulosToItems(row.articulos_cotizados)` (`src/features/crm/lib/formal-quote-mapping.ts`).
3. `INSERT` masivo en `formal_quote_items`.
4. Loguea evento `CREATED`.

El botón usa `useFormalQuoteByLead(id)` (`useFormalQuotes.ts`) para saber si ya existe una formal; si existe, muestra "Ver cotización formal ({folio})". Es decir, la UI ya evita mostrar dos veces el botón de crear, pero **no hay guard en DB ni en la mutación** — un doble-click o dos pestañas pueden crear duplicados.

### 1.3 Campos que se copian actualmente (via `mapLeadArticulosToItems`)

Por cada artículo del lead se inserta en `formal_quote_items`:

- `position` (idx+1)
- `source` = `"CATALOG"`
- `clave_producto` (desde `clave_producto` / `clave`)
- `modelo_comercial` (desde `modelo_comercial` / `nombre` / `name` / `titulo` / `title`)
- `descripcion` = `null`
- `color`
- `imagen_url`
- `cantidad` (min 1, redondeado)
- `unidad` = `"PZA"`
- `precio_unitario` (desde `precio_unitario` / `unit_price` / `price` / `precio`)
- `descuento_pct` = 0
- `subtotal` = 0  ← **incorrecto: no se recalcula al insertar**
- `personalizacion` (objeto JSONB si viene, si no `{}`)
- `print_method`, `print_colors` = null
- `setup_fee`, `print_unit_price` = 0
- `notes` = null

### 1.4 Campos que hay que copiar y que hoy no se están usando

Datos que **sí** existen en `articulos_cotizados` (ver `QuoteCartView.tsx` líneas 82-108) y que actualmente no llegan a `formal_quote_items`:

- `precio_unitario_estimado` → hoy sólo se lee `precio_unitario` / `unit_price` / `price`. Debe considerarse como fuente prioritaria.
- `subtotal` (calculado por front) → debería servir como *referencia* para comparar contra `cantidad × precio_unitario` recalculado.
- `personalizacion` (string legible tipo "Logo a 1 tinta") → hoy sólo se acepta si es objeto; si viene string, se pierde. Debe guardarse en un campo texto (posibles: `notes`, o dentro del JSON de `personalizacion` bajo `label`).
- `personalizacion_solicitada_cliente` (objeto `{ tipo, label, requiereRevision, message }`) → debería guardarse dentro de `personalizacion` JSONB.
- `personalizacion_publica`, `personalizacion_sugerida_economica`, `compatibilidad_personalizacion`, `requiere_revision_tecnica` → mismo destino JSONB, sin exponer costos ni proveedor.
- `material`, `logo_format`, `entrega_estimada`, `muestra_virtual` → guardarlos también dentro de `personalizacion` JSONB (o `notes` para entrega). Nada de esto expone datos sensibles.
- `producto_id` del catálogo → útil para futura validación de precio de referencia; guardarlo dentro de `personalizacion.producto_id` o en `clave_producto` como fallback.

### 1.5 `subtotal` mal calculado

Al insertar items se manda `subtotal: 0`. `formal-quote-calc.ts` sí sabe calcular (`calcItemSubtotal`), pero solamente se usa en el editor. Necesitamos calcular el subtotal por partida antes del INSERT.

## 2. Cambios propuestos (no aplicar aún)

### 2.1 WhatsApp público — sólo opcional

`src/components/QuoteCartView.tsx`, en `submitQuote`:

- **Eliminar** el bloque que construye `resumen`/`mensaje` y la llamada `window.open("https://wa.me/...", "_blank")` (líneas ~136-165).
- Dejar sólo:
  - INSERT en `cotizaciones_leads`
  - invocación fire-and-forget a `send-proposal-summary-email`
  - `setCheckoutStep("success")`
- El botón "Acelerar por WhatsApp" en la pantalla success (líneas ~188-197) queda igual.

### 2.2 Mapping enriquecido de lead → formal_quote_items

`src/features/crm/lib/formal-quote-mapping.ts`:

- Añadir lectura de `precio_unitario_estimado` como fuente prioritaria de `precio_unitario`.
- Calcular `subtotal` con `calcItemSubtotal({ cantidad, precio_unitario, descuento_pct: 0, setup_fee: 0, print_unit_price: 0 })`.
- Extender el JSONB `personalizacion` con un shape estable:
  ```
  {
    label: string | null,             // texto legible
    tipo: string | null,              // logo_1_ink, engraving, etc.
    requiere_revision_tecnica: bool,
    publica: string | null,
    sugerida_economica: { label, incluida } | null,
    compatibilidad: string | null,
    material: string | null,
    logo_format: string | null,
    entrega_estimada: string | null,
    muestra_virtual: bool | null,
    producto_id: number | string | null,
    subtotal_referencia_cliente: number | null,   // el subtotal que vio el cliente
    precio_referencia_cliente: number | null      // el precio unitario que vio el cliente
  }
  ```
- Seguir sin copiar `proveedor`, `costos`, `margen`, `raw_payload`, `provider_sku`.

### 2.3 Anti-duplicados de `formal_quotes`

Dos capas:

1. **UI ya cubre** el caso feliz vía `useFormalQuoteByLead`. Reforzar en `CotizacionDetail.tsx`:
  - Antes del INSERT, hacer un `select id` en `formal_quotes` por `cotizacion_lead_id = row.id`. Si existe, navegar directo a `/crm/cotizaciones-formales/{id}` y no insertar.
  - Deshabilitar el botón mientras `creatingFormal || formal.isLoading || !!formal.data`.
2. **DB (opcional, no aplicar en este sprint según instrucción "no migraciones"):** dejar documentado que a futuro convendría un índice único parcial `unique (cotizacion_lead_id) where cotizacion_lead_id is not null`. **No se hace en 2.9A.**

### 2.4 Advertencia de precio contra referencia

En `FormalQuoteEditor.tsx`, cuando existan `personalizacion.precio_referencia_cliente` y `personalizacion.subtotal_referencia_cliente` en un item:

- Comparar contra `precio_unitario` y `calcItemSubtotal(item)` actuales.
- Si `abs(precio_unitario - precio_referencia_cliente) / precio_referencia_cliente > 0.01` (1%), mostrar `<Alert variant="destructive">` inline con el mensaje: "El precio unitario difiere del precio de referencia mostrado al cliente ($X). Confirma antes de emitir."
- Si `abs(subtotal - subtotal_referencia_cliente) > 0.01`, mostrar aviso "Subtotal recalculado (Y). Referencia del cliente: (X)."
- El aviso es sólo visual, no bloquea guardar.
- Botón "Recalcular subtotales" que corre `calcItemSubtotal` sobre cada item y hace `UPDATE` masivo (opcional en fase 1, puede ir a fase 2).

Al montar el editor, correr una vez `calcItemSubtotal` sobre cada partida cuyo `subtotal = 0` y persistir el valor calculado (evita el bug actual de `subtotal: 0`).

### 2.5 Texto del email inicial

`supabase/functions/send-proposal-summary-email/index.ts`, en `renderProductRow` y `renderEmail`:

- Cambiar el título de la línea del subtotal por partida (línea 89):
  - Actual: `Subtotal preliminar: $${subtotal} MXN`
  - Nuevo: `Subtotal preliminar (antes de IVA): $${subtotal} MXN`
- Agregar una línea inmediatamente debajo del subtotal por partida:
  - `Impresión: sujeta a validación técnica de arte, material, área y cantidad. No incluida en este subtotal.`
- En el bloque de advertencia (líneas 152-155), reemplazar el texto por:
  - "**Este documento NO es una cotización final.** Es un resumen preliminar. Los precios mostrados son **antes de IVA (16%)** y **no incluyen impresión/personalización**. Tu asesor validará técnica, área, colores, cantidades y tiempos antes de emitir la propuesta formal."
- Total (líneas 168-171): cambiar la etiqueta a `Estimación preliminar de productos (antes de IVA y antes de impresión):`
- No agregar `+ IVA` como número calculado — sólo texto aclaratorio.

## 3. Archivos que se tocarían en el Build

- `src/components/QuoteCartView.tsx` — quitar `window.open` de WhatsApp automático dentro de `submitQuote`. Nada más.
- `src/features/crm/lib/formal-quote-mapping.ts` — enriquecer mapping y calcular `subtotal` con `formal-quote-calc.ts`.
- `src/features/crm/pages/CotizacionDetail.tsx` — guard anti-duplicado antes del INSERT.
- `src/features/crm/pages/FormalQuoteEditor.tsx` — mostrar advertencias de precio/subtotal, autocálculo al montar de items con `subtotal = 0`.
- `supabase/functions/send-proposal-summary-email/index.ts` — ajustes de texto ("+ IVA (16%)", impresión sujeta a validación técnica).

## 4. Archivos prohibidos (no tocar)

- `src/components/CatalogView.tsx`
- `src/components/ProductDetailView.tsx`
- `src/components/LandingView.tsx`
- `productos_publicos`, RLS, migraciones, secrets, otras Edge Functions
- Cotizador inteligente, kits, motor de precios de impresión

## 5. Plan de Build mínimo (orden)

1. `formal-quote-mapping.ts`: extender mapping (usar `precio_unitario_estimado`, calcular `subtotal`, poblar JSONB `personalizacion` extendido).
2. `CotizacionDetail.tsx`: `select` previo por `cotizacion_lead_id` y short-circuit si ya existe. Deshabilitar botón durante carga.
3. `FormalQuoteEditor.tsx`: leer `personalizacion.precio_referencia_cliente` y `subtotal_referencia_cliente`, mostrar `<Alert>` de discrepancia; auto-persistir subtotal recalculado si viene en 0.
4. `QuoteCartView.tsx`: eliminar `window.open` automático; mantener vista `success` con CTA opcional.
5. `send-proposal-summary-email/index.ts`: ajustar copies ("antes de IVA (16%)", "impresión sujeta a validación técnica", nada de "precio final"). Redeploy de la función.
6. `tsgo --noEmit` + `npm run build`.

## 6. Riesgos

- Cambiar `mapLeadArticulosToItems` puede afectar cotizaciones formales ya creadas si se re-ejecuta; el mapping sólo se corre al **crear**, así que no hay riesgo retroactivo.
- Guardar más datos en `personalizacion` JSONB — cuidar que no incluya nada del proveedor (`raw_payload`, `provider_sku`, costos). El whitelist se mantiene.
- Al quitar `window.open` de WhatsApp automático, algunos usuarios pueden extrañar la redirección: mitigado por el botón "Acelerar por WhatsApp" ya presente en pantalla success.
- El aviso de discrepancia depende de que futuras cotizaciones traigan `precio_referencia_cliente`. Cotizaciones formales creadas antes del cambio no tendrán ese dato → el aviso simplemente no aparece (comportamiento aceptable).  
  
BUILD / SPRINT 2.9A HOTFIX COTIZACIÓN FORMAL + FLUJO PÚBLICO.
  INSTRUCCIÓN CRÍTICA DE ALCANCE:
  No cambies nada que no se te pida explícitamente.
  No modifiques archivos no relacionados.
  No refactorices.
  No rediseñes UI pública.
  No cambies Catálogo.
  No cambies ProductDetailView.
  No cambies LandingView.
  No cambies productos_publicos.
  No cambies RLS.
  No ejecutes migraciones.
  No cambies secrets.
  No agregues checkout ni pagos.
  No implementes kits.
  No implementes cotizador inteligente.
  No implementes motor de precios de impresión todavía.
  No expongas proveedor, costos, márgenes, raw_payload, provider_sku ni provider_code.
  Si detectas algo adicional, repórtalo como recomendación pero NO lo cambies.
  Objetivo:
  Aplicar Sprint 2.9A para:
  1. Quitar apertura automática de WhatsApp al enviar solicitud pública.
  2. Mejorar prellenado de cotización formal desde la solicitud.
  3. Evitar duplicados de formal_quote por cotizacion_lead_id.
  4. Calcular subtotal inicial de partidas al crear formal_quote_items.
  5. Mostrar advertencias si el precio de la cotización formal difiere del precio preliminar visto por el cliente.
  6. Ajustar el email inicial para aclarar “antes de IVA” y “antes de impresión/personalización validada”.
  Archivos permitidos:
  - src/components/QuoteCartView.tsx
  - src/features/crm/lib/formal-quote-mapping.ts
  - src/features/crm/lib/formal-quote-calc.ts solo si es estrictamente necesario
  - src/features/crm/pages/CotizacionDetail.tsx
  - src/features/crm/pages/FormalQuoteEditor.tsx
  - supabase/functions/send-proposal-summary-email/index.ts
  Archivos prohibidos:
  - src/components/CatalogView.tsx
  - src/components/ProductDetailView.tsx
  - src/components/LandingView.tsx
  - src/components/QuoteCartView.tsx fuera del cambio específico de WhatsApp automático
  - productos_publicos
  - otras Edge Functions
  - RLS
  - migraciones
  - secrets
  - rutas públicas no relacionadas
  - cotizador inteligente
  - kits
  CAMBIO 1 — WhatsApp público opcional:
  En src/components/QuoteCartView.tsx:
  - Eliminar la apertura automática de WhatsApp dentro de submitQuote.
  - Quitar o desactivar el [window.open](http://window.open) automático hacia wa.me/api.whatsapp.com.
  - Mantener el botón “Acelerar por WhatsApp” en la pantalla de éxito.
  - El flujo debe ser:
    INSERT cotizaciones_leads
    invoke fire-and-forget de send-proposal-summary-email
    setCheckoutStep("success")
  - El cliente debe quedarse en la pantalla “Solicitud Exitosa”.
  CAMBIO 2 — Mapping enriquecido lead → formal_quote_items:
  En src/features/crm/lib/formal-quote-mapping.ts:
  - Usar precio_unitario_estimado como fuente prioritaria de precio_unitario.
  - Si no existe, usar precio_unitario / unit_price / price / precio.
  - Copiar campos seguros:
    clave_producto
    modelo_comercial
    color
    imagen_url
    cantidad
    precio_unitario
    personalizacion solicitada
  - Calcular subtotal inicial usando:
    cantidad  *precio_unitario*  (1 - descuento_pct) + setup_fee + cantidad * print_unit_price
  - No insertar subtotal = 0 si se puede calcular.
  - Guardar dentro de personalizacion JSONB, solo datos seguros:
    label
    tipo
    requiere_revision_tecnica
    publica
    sugerida_economica
    compatibilidad
    material
    logo_format
    entrega_estimada
    muestra_virtual
    producto_id
    subtotal_referencia_cliente
    precio_referencia_cliente
  - No guardar proveedor, costos, márgenes, raw_payload, provider_sku ni provider_code.
  CAMBIO 3 — Anti-duplicados:
  En src/features/crm/pages/CotizacionDetail.tsx:
  - Antes de crear una formal_quote, consultar si ya existe una con cotizacion_lead_id = [row.id](http://row.id).
  - Si existe, navegar a /crm/cotizaciones-formales/{id}.
  - Si no existe, crearla.
  - Deshabilitar el botón mientras se crea o mientras carga la formal_quote existente.
  - Si ya existe, mostrar “Ver cotización formal” en lugar de “Crear cotización formal”.
  CAMBIO 4 — Advertencias de precio:
  En src/features/crm/pages/FormalQuoteEditor.tsx:
  - Si personalizacion.precio_referencia_cliente existe, comparar contra precio_unitario actual.
  - Si difiere más de 1%, mostrar alerta visual:
    “El precio unitario difiere del precio de referencia mostrado al cliente. Confirma antes de emitir.”
  - Si personalizacion.subtotal_referencia_cliente existe, comparar contra subtotal calculado.
  - Si difiere, mostrar alerta:
    “El subtotal fue recalculado. Referencia del cliente: $X. Subtotal actual: $Y.”
  - No bloquear guardar.
  - Si una partida carga con subtotal = 0, recalcularlo automáticamente usando formal-quote-calc y persistirlo.
  CAMBIO 5 — Email inicial:
  En supabase/functions/send-proposal-summary-email/index.ts:
  - Cambiar texto por partida:
    “Subtotal preliminar (antes de IVA): $X MXN”
  - Agregar línea por partida:
    “Impresión/personalización: sujeta a validación técnica de arte, material, área, colores y cantidad. No incluida en este subtotal.”
  - Cambiar advertencia principal a:
    “Este documento NO es una cotización final. Es un resumen preliminar. Los precios mostrados son antes de IVA (16%) y no incluyen impresión/personalización validada. Tu asesor validará técnica, área, colores, cantidades, stock y tiempos antes de emitir la propuesta formal.”
  - Cambiar total a:
    “Estimación preliminar de productos (antes de IVA y antes de impresión):”
  - No calcular IVA numérico en este email inicial.
  - No presentar el email inicial como cotización formal.
  Después:
  Ejecuta tsgo --noEmit y npm run build.
  Si modificas la Edge Function, confirma que queda lista/deployada según flujo de Lovable.
  Reporta:
  1. Archivos modificados.
  2. Confirmación de build/typecheck exitoso.
  3. Confirmación de que no tocaste DB/RLS/migraciones/secrets.
  4. Confirmación de que no tocaste Catálogo/ProductDetail/Landing/productos_publicos.
  5. Confirmación de que no expusiste proveedor/costos/márgenes/raw_payload/provider_sku/provider_code.