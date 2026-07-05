# Sprint 2.9B — Claridad comercial del flujo de cotización

Diagnóstico enfocado en 6 archivos. Sin migraciones, sin RLS, sin secrets, sin publicar, sin refactor. Cambios visuales mínimos y de texto.

---

## 1. Diagnóstico por problema

### P1 — No queda claro si el precio incluye impresión

- `ProductDetailView.tsx` línea 730: badge dice `MXN + IVA`. No dice "sin impresión".
- Línea 522 (bloque precio inicial): igual, sólo dice `MXN + IVA`.
- Línea 740 `priceNote`: viene de `datos_generales.precio_nota`, fallback dice `"Precio antes de IVA e impresión..."`. Bien, pero está pequeño y separado del número.
- `QuoteCartView.tsx` línea 476: ya dice "Precio antes de IVA e impresión". Correcto.
- Email (línea 89, 155, 170): ya menciona "antes de IVA" y "no incluyen impresión". Correcto pero repetitivo (3 veces).

### P2 — Personalización pública cargada/confusa

- `ProductDetailView.tsx` líneas 590–660: se muestra:
  1. Grid de 6 opciones (`FALLBACK_PERSONALIZATION_RULES`)
  2. Caja "Selección actual" (línea 623)
  3. Checkbox de alternativa económica (línea 631)
  4. Aviso "No necesitas elegir técnica" (línea 651)
  5. Nota de restricción (línea 659)
- Es demasiado. El usuario ve 5 bloques informativos verticales.

### P3 — Kit vs separado no se diferencia visualmente después

- `QuoteCartView.tsx`: se guarda `formato_propuesta` + `modalidad_cotizacion` + `modalidad_cotizacion_label` en `datos_cliente` (líneas 91–93). ✅
- `CotizacionDetail.tsx` línea 415: muestra "Modalidad". ✅
- `FormalQuoteEditor.tsx`: **no lee modalidad** del `cliente` JSON.
- `FormalQuotePrint.tsx`: **no muestra modalidad**.
- `formal-quote-mapping.ts`: no propaga modalidad al `formal_quote` (pero `cliente` = `datos_cliente` completo se copia en `CotizacionDetail.tsx:273`, así que el dato ya vive en `formal_quotes.cliente`).

### P4 — "Sin stock para propuesta" con stock disponible

- `ProductDetailView.tsx` líneas 299–304 y 747–756:
  ```
  canAddToProposal = productAllowsProposal && currentColor.agregableToProposal && availableStock > 0
  ```
- `agregableToProposal` (línea 277) = `v.agregable_a_propuesta ?? stock_total > 0`.
- El bug ocurre cuando la variante activa (`currentColor`) tiene `stock_total = 0` aunque otras variantes sí tengan stock, o cuando `agregable_a_propuesta` es `false` explícito. El botón entonces dice literal "Sin stock para propuesta" aunque el producto SÍ tiene stock en otras variantes.
- Además, si `agregable_a_propuesta` está en `false` pero stock > 0, el mensaje es engañoso: no es un problema de stock sino de política del producto.

### P5 — Email inicial repetitivo

- El disclaimer "antes de IVA / no incluye impresión" aparece 3 veces (línea 89 por producto, 155 banner amarillo, 170 total). Suficiente con 2: banner arriba + total.

### P6 — Cotización formal debe mostrar modalidad

- `FormalQuoteEditor.tsx` y `FormalQuotePrint.tsx` no muestran modalidad. El dato está en `formal_quote.cliente.modalidad_cotizacion_label`.

---

## 2. Cambios mínimos propuestos por archivo

### `src/components/ProductDetailView.tsx`

1. **P1** — En los dos bloques de precio (línea ~522 y ~730), cambiar la etiqueta `MXN + IVA` por `MXN · antes de IVA e impresión`. Y en el subtotal (línea 734), añadir sublínea corta `+ IVA 16% · sin impresión`.
2. **P2** — Colapsar la sección personalización:
  - Mantener el grid de opciones y la caja "Selección actual".
  - Quitar/fusionar el aviso azul (línea 651–657) con el `restriction_note` en un solo texto compacto abajo del grid.
  - Mover el checkbox de alternativa económica a un `<details>` "Ver alternativa económica" cerrado por defecto (solo cambio de wrapper visual, sin tocar la lógica de `includeEconomyAlternative`).
3. **P4** — Corregir el botón (línea 750–756):
  - Si `!productAllowsProposal`: texto `Consulta por WhatsApp` (no "sin stock").
  - Si `productAllowsProposal && availableStock === 0` para la variante actual pero otras variantes con `stock > 0`: texto `Elige un color disponible` y no deshabilitar completamente (o mantener deshabilitado con ese texto).
  - Si `availableStock === 0` en todas: `Sin stock disponible` (no "para propuesta").
  - Regla: cambiar el string estático "Sin stock para propuesta" por una función `getCtaLabel()` con esos 3 casos.

### `src/components/QuoteCartView.tsx`

- Sin cambios funcionales. Sólo (opcional) reforzar en línea 476 el texto: `Precios antes de IVA (16%) y antes de impresión/personalización.` — no requerido si ya se ve bien.

### `src/features/crm/pages/CotizacionDetail.tsx`

- Sin cambios. Ya muestra Modalidad.

### `src/features/crm/pages/FormalQuoteEditor.tsx`

- **P6** — Añadir un `<Badge>` de modalidad en el header del editor:
  - Leer `quote.cliente?.modalidad_cotizacion_label` (o derivar de `modalidad_cotizacion`).
  - Renderizar `KIT` o `INDIVIDUAL` como Badge junto al folio. Read-only.

### `src/features/crm/pages/FormalQuotePrint.tsx`

- **P6** — En el bloque "Cliente" (~línea 210), añadir línea:
  ```
  Modalidad solicitada: {label}
  ```
  Sólo si existe. Sin cambiar estructura ni PDF layout.

### `supabase/functions/send-proposal-summary-email/index.ts`

- **P5** — Reducir repetición:
  - Quitar la línea 90 (`Impresión/personalización: sujeta a validación técnica...`) de cada `renderProductRow`.
  - Mantener el banner amarillo (línea 153–156) como único disclaimer largo.
  - Mantener la línea 170 corta antes del total.
- **P6** (opcional) — Aceptar `modalidad_label` en el payload y mostrarlo debajo del folio (línea 147). No requerido; puede quedar para 2.9C.

---

## 3. Cómo simplificar personalización pública (P2)

Estructura propuesta en `ProductDetailView.tsx`:

```
[ Grid de opciones ]
[ Caja "Selección actual" con mensaje contextual ]
[ <details> Alternativa económica sugerida (si aplica) ]
[ Nota unificada: "No necesitas subir logo aquí. + restriction_note" ]
```

De 5 bloques a 4, con el más ruidoso (el checkbox verde) plegado.

---

## 4. Cómo aclarar precio sin IVA ni impresión (P1)

- Etiquetas junto al precio: `MXN · antes de IVA e impresión`.
- Debajo del subtotal preliminar, línea muted: `+ IVA 16% · sin impresión/personalización`.
- No tocar `priceNote` (ya correcto).
- No repetir 3 veces en la misma vista; una sola frase compacta bajo el número grande.

---

## 5. Cómo corregir botón de stock (P4)

`getCtaLabel()` en `ProductDetailView.tsx`:

```text
if (!productAllowsProposal)                → "Consultar por WhatsApp"  (redirige a WA)
if (allVariantsOutOfStock)                 → "Sin stock disponible"    (disabled)
if (currentVariantOutOfStock, other OK)    → "Elige un color disponible" (disabled)
else                                       → "Agregar a propuesta"
```

Requiere calcular `allVariantsOutOfStock = colors.every(c => !c.agregableToProposal || c.stock === 0)`.

---

## 6. Cómo mostrar modalidad KIT/INDIVIDUAL en CRM y cotización formal (P6)

- Dato ya vive en `cotizaciones_leads.datos_cliente.modalidad_cotizacion_label` y, tras crear la formal, en `formal_quotes.cliente.modalidad_cotizacion_label` (se copia entero en `CotizacionDetail.tsx:273`).
- **Editor**: `<Badge variant="outline">Modalidad: {label}</Badge>` al lado del folio.
- **Print**: línea `Modalidad solicitada: {label}` en el bloque cliente.
- Sin migraciones. Sin tocar `formal-quote-mapping.ts`.

---

## 7. Archivos que NO se tocan

- `src/components/CatalogView.tsx`
- `src/components/LandingView.tsx`
- `src/features/crm/pages/FormalQuotesList.tsx`
- `src/features/crm/lib/formal-quote-mapping.ts`
- `src/features/crm/lib/formal-quote-calc.ts`
- `src/features/crm/hooks/useFormalQuotes.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml` y cualquier otra Edge Function
- RLS, migraciones, `productos_publicos`, secrets, `.env`

---

## 8. Riesgos

- Bajo. Todos los cambios son de texto, orden visual y lectura de campos existentes.
- El botón (P4) es la única lógica nueva; se limita a strings + un `every()` sobre `colors`. No cambia el disabled real cuando corresponde.
- Email: quitar una línea repetida no cambia contrato.
- Modalidad en editor/print: sólo lectura de un campo que ya existe.

## 9. Plan de Build posterior

1. Aplicar cambios en los 6 archivos listados.
2. `tsgo --noEmit` + `npm run build`.
3. Verificar: (a) botón muestra 4 estados correctos, (b) modalidad visible en editor y print, (c) email sin repetición.  
  
BUILD / SPRINT 2.9B CLARIDAD COMERCIAL DEL FLUJO DE COTIZACIÓN.
  INSTRUCCIÓN CRÍTICA DE ALCANCE:
  No cambies nada que no se te pida explícitamente.
  No modifiques archivos no relacionados.
  No refactorices.
  No rediseñes UI completa.
  No cambies Supabase.
  No cambies RLS.
  No ejecutes migraciones.
  No cambies secrets.
  No publiques.
  No uses Try to fix.
  No hagas cambios automáticos fuera del alcance.
  No expongas proveedor, costos, márgenes, raw_payload, provider_sku ni provider_code.
  Objetivo:
  Mejorar claridad comercial del flujo de cotización sin tocar DB/RLS ni flujo de catálogo general.
  Problemas a resolver:
  1. No queda suficientemente claro que el precio NO incluye impresión/personalización.
  2. La sección de personalización pública está cargada.
  3. La modalidad KIT/INDIVIDUAL debe verse en cotización formal editor y print.
  4. El botón muestra "Sin stock para propuesta" aunque puede haber stock en otras variantes o sólo requerir asesor.
  5. El email inicial repite demasiado el disclaimer de impresión.
  Archivos permitidos:
  - src/components/ProductDetailView.tsx
  - src/features/crm/pages/FormalQuoteEditor.tsx
  - src/features/crm/pages/FormalQuotePrint.tsx
  - supabase/functions/send-proposal-summary-email/index.ts
  - src/components/QuoteCartView.tsx SOLO si es estrictamente necesario para reforzar texto de precios
  Archivos prohibidos:
  - src/components/CatalogView.tsx
  - src/components/LandingView.tsx
  - src/features/crm/pages/FormalQuotesList.tsx
  - src/features/crm/lib/formal-quote-mapping.ts
  - src/features/crm/lib/formal-quote-calc.ts
  - src/features/crm/hooks/useFormalQuotes.ts
  - src/integrations/supabase/types.ts
  - supabase/config.toml
  - otras Edge Functions
  - RLS
  - migraciones
  - productos_publicos
  - secrets
  - .env
  CAMBIO 1 — ProductDetailView: precio claro
  En ProductDetailView.tsx:
  - Cambiar etiquetas junto al precio de "MXN + IVA" a:
    "MXN · antes de IVA e impresión"
  - En subtotal preliminar agregar sublínea:
    "+ IVA 16% · sin impresión/personalización"
  - No eliminar priceNote existente.
  - No cambiar cálculo de precios.
  CAMBIO 2 — ProductDetailView: personalización más compacta
  En ProductDetailView.tsx:
  - Mantener grid de opciones.
  - Mantener caja "Selección actual".
  - Mover la alternativa económica a un bloque plegado/compacto tipo "Ver alternativa económica" si ya existe includeEconomyAlternative.
  - Unificar los avisos de personalización en una sola nota compacta:
    "No necesitas subir logo aquí. Tu asesor validará arte, material, área, colores, cantidad y viabilidad."
  - Si existe restriction_note, agregarlo en esa misma nota compacta.
  - No cambiar la lógica de personalización, sólo presentación/copy.
  CAMBIO 3 — ProductDetailView: botón stock/disponibilidad
  Reemplazar el string estático "Sin stock para propuesta" por una función de label.
  Reglas:
  - Si !productAllowsProposal:
    label = "Consultar por WhatsApp"
  - Si todas las variantes tienen stock <= 0:
    label = "Sin stock disponible"
  - Si variante actual tiene stock <= 0 pero existe otra variante con stock > 0:
    label = "Elige un color disponible"
  - Si variante actual tiene stock > 0 pero no es agregable:
    label = "Consultar disponibilidad"
  - Si variante actual es agregable y stock > 0:
    label = "Agregar a propuesta"
  No cambiar productos_publicos ni fuente de datos.
  CAMBIO 4 — FormalQuoteEditor: mostrar modalidad
  En FormalQuoteEditor.tsx:
  - Leer:
    quote.cliente?.modalidad_cotizacion_label
    o quote.cliente?.modalidad_cotizacion
  - Mostrar Badge read-only junto al folio:
    "Modalidad: Cotizar por separado"
    o
    "Modalidad: Armar kit o paquete"
  - Si no existe modalidad, no mostrar badge.
  - No cambiar DB ni mapping.
  CAMBIO 5 — FormalQuotePrint: mostrar modalidad
  En FormalQuotePrint.tsx:
  - En el bloque de datos del cliente, agregar:
    "Modalidad solicitada: {label}"
  - Sólo si existe en quote.cliente.
  - No alterar layout general de impresión.
  CAMBIO 6 — Email inicial menos repetitivo
  En supabase/functions/send-proposal-summary-email/index.ts:
  - Quitar la línea repetida por producto:
    "Impresión/personalización: sujeta a validación técnica..."
  - Mantener el banner principal que aclara:
    no es cotización final, antes de IVA, no incluye impresión/personalización validada.
  - Mantener el texto corto del total:
    "Estimación preliminar de productos (antes de IVA y antes de impresión)"
  - No calcular IVA numérico.
  - No presentar el email como cotización formal.
  Después:
  Ejecuta tsgo --noEmit y npm run build.
  Si modificas la Edge Function, redeploy según flujo de Lovable.
  Reporta:
  1. Archivos modificados.
  2. Confirmación de typecheck/build exitoso.
  3. Confirmación de que no tocaste DB/RLS/migraciones/secrets.
  4. Confirmación de que no tocaste CatalogView/Landing/productos_publicos.
  5. Confirmación de que no expusiste proveedor/costos/márgenes/raw_payload/provider_sku/provider_code.