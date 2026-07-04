# Plan Sprint 2.6 — Email automático "Resumen preliminar de solicitud de cotización"

Solo análisis. No se implementa, no se hace Build, no se ejecutan migraciones, no se tocan `productos_publicos`, RLS ni Edge Functions existentes.

---

## 0. Estado actual verificado

- `QuoteCartView.tsx` línea 114: `INSERT` en `cotizaciones_leads` con `.insert([payload])` — hoy **no captura el `id` insertado** (no usa `.select().single()`).
- Tras el insert exitoso abre WhatsApp (línea 150) y pasa a `checkoutStep="success"`.
- `payload` ya contiene: `datos_cliente` (nombre, empresa, phone, email), `productos_solicitados` (array con clave_producto, modelo_comercial, color, cantidad, subtotal, personalización solicitada, alternativa económica sugerida, imagen_url), `total_estimado`, `estado_cotizacion`.
- `proposal_email_events` ya existe en BD con FK a `cotizaciones_leads(id)`, columnas: `id`, `cotizacion_lead_id`, `email_type`, `recipient_email`, `status`, `provider_message_id`, `error_message`, `sent_at`, `created_at`.
- Secrets ya configurados: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- No hay dominio de email Lovable configurado (a validar en Build con `check_email_domain_status`).

---

## 1. Archivos exactos a tocar

**Nuevos (2):**

1. `supabase/functions/send-proposal-summary-email/index.ts` — Edge Function nueva, dedicada al envío del resumen preliminar y al registro en `proposal_email_events`. No modifica ninguna función existente.
2. `supabase/functions/send-proposal-summary-email/deno.json` — solo si React Email requiere JSX config; probable no necesario porque el HTML se genera con template string (ver §5).

**Modificados (1, mínimo):**

3. `src/components/QuoteCartView.tsx` — dos cambios acotados:
  - Cambiar `.insert([payload])` por `.insert([payload]).select("id").single()` para capturar el `id`/folio.
  - Después del insert exitoso (y **antes o después de abrir WhatsApp**, ver §4), invocar la nueva Edge Function con `supabase.functions.invoke(...)` en modo **fire-and-forget** (no bloquear el flujo).

**NO se toca:**

- Ninguna Edge Function existente (`capture-assistant-lead`, `sync-*`, `promote-provider-products-to-catalog`).
- `productos_publicos`, RLS, `cotizaciones_leads` schema, `proposal_email_events` schema.
- Diseño ni layout de `QuoteCartView`.

---

## 2. Edge Function recomendada

**Nombre:** `send-proposal-summary-email`
**Ubicación:** `supabase/functions/send-proposal-summary-email/index.ts`
`**verify_jwt`:** false (invocada desde cliente anónimo tras un insert público en `cotizaciones_leads`).

### Contrato de entrada

```ts
POST { cotizacion_lead_id: string }
```

### Responsabilidades (en orden)

1. Validar body con Zod (`cotizacion_lead_id` UUID).
2. Con `SUPABASE_SERVICE_ROLE_KEY`, leer la fila completa de `cotizaciones_leads` por `id` (SELECT único, sin exponer service role al cliente).
3. Extraer `datos_cliente`, `productos_solicitados`, `total_estimado`, `created_at`.
4. Renderizar dos HTMLs (cliente + interno) con la misma plantilla, distinguidos por `email_type`.
5. Enviar vía **Lovable Emails** (`supabase.functions.invoke('send-transactional-email', ...)`) si hay dominio configurado. Alternativa provisional: **Resend connector gateway** si el usuario elige esa ruta (§3).
6. Insertar dos filas en `proposal_email_events` (una por destinatario), status `sent` o `failed`.
7. Responder 200 siempre que el registro se haya intentado; devolver detalle no bloqueante al cliente.

### Idempotencia

`idempotencyKey = "proposal-summary-<lead_id>-<recipient_type>"` para evitar duplicados si el cliente reintenta.

### CORS

Manejar `OPTIONS` + headers estándar para permitir invocación desde el sitio público.

---

## 3. Secrets necesarios

**Ya presentes:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`.

**Faltantes según la vía elegida (decisión pendiente en Build):**

- **Vía A — Lovable Emails (recomendada):** requiere dominio de email verificado + `setup_email_infra` + `scaffold_transactional_email`. No requiere secrets adicionales (usa `LOVABLE_API_KEY`).
- **Vía B — Resend por connector gateway:** requiere el connector `resend` conectado; el secret `RESEND_API_KEY` (clave de conexión al gateway) se inyecta automáticamente. Sin `add_secret` manual.
- **Configuración de destinatarios internos:** nuevo secret `INTERNAL_SALES_EMAIL` (correo de ventas, string). Único secret manual a agregar en Build.
- **Remitente visible:** constante en código (`FROM_EMAIL`, `FROM_NAME`) o secret opcional `PROPOSAL_FROM_EMAIL`. Decidir en Build; por defecto constante.

---

## 4. Cambios mínimos en `QuoteCartView.tsx`

Solo lógica, sin tocar UI. Dos ediciones puntuales alrededor de la línea 114:

### 4.1. Capturar el `id` del insert

```ts
const { data: inserted, error } = await supabase
  .from("cotizaciones_leads")
  .insert([payload])
  .select("id")
  .single();
```

### 4.2. Invocación fire-and-forget del email

Justo después de confirmar `!error`, antes de `window.open(...)`:

```ts
if (inserted?.id) {
  supabase.functions
    .invoke("send-proposal-summary-email", { body: { cotizacion_lead_id: inserted.id } })
    .catch((e) => console.warn("[email] no bloqueante:", e));
}
```

- **Sin `await`.** El correo NO bloquea WhatsApp ni el `checkoutStep="success"`.
- Si falla la invocación, se registra warning en consola y el flujo continúa (la solicitud ya quedó guardada).

### 4.3. Nada más

- No se cambian textos visibles.
- No se agrega loading extra.
- No se modifica el WhatsApp ni el estado de éxito.
- No se agregan nuevos campos al formulario.

---

## 5. Estructura del HTML email

Template único parametrizado por `recipientType: "cliente" | "interno"`. Renderizado como template string (sin React Email) para evitar dependencias JSX en la nueva función.

### Asunto

- Cliente: `Resumen preliminar de solicitud de cotización — Folio {shortId}`
- Interno: `[Nueva solicitud] {empresa} — {nombre} — Folio {shortId}`

### Estructura HTML (bloques)

```
┌ Header (blanco, logo texto, sin colores fuertes)
│   "Promocionales Emocionales"
│   "Resumen preliminar de solicitud de cotización"
│
├ Saludo
│   "Hola {nombre}, gracias por tu interés."
│   "Empresa: {empresa}"
│   "Folio: {shortId}   Fecha: {fecha_local}"
│
├ Aviso destacado (banner amarillo suave)
│   "Este documento NO es una cotización final.
│    Es un resumen preliminar. Precios antes de IVA e impresión.
│    Tu asesor validará técnica, disponibilidad y tiempos."
│
├ Tabla de productos (una fila por item)
│   │ Imagen (60x60, object-contain, fondo blanco)
│   │ Clave: {clave_producto}
│   │ Modelo: {modelo_comercial}
│   │ Color: {color} · Cantidad: {cantidad}
│   │ Personalización solicitada: {personalizacion}
│   │ Alternativa económica sugerida: {personalizacion_sugerida_economica.label} (si aplica)
│   │ Subtotal preliminar: ${subtotal} MXN
│
├ Total preliminar
│   "Estimación preliminar antes de IVA e impresión: ${total} MXN"
│
├ Próximos pasos
│   "1. Tu asesor te contactará por WhatsApp/correo.
│    2. Definiremos técnica de personalización óptima.
│    3. Recibirás propuesta formal con precios finales."
│
├ Datos de contacto de la empresa (footer)
│   WhatsApp, correo, sede
│
└ Nota legal
    "Sujeto a validación comercial, stock y tiempos de entrega."
```

### Reglas de estilo

- Body `background: #ffffff` (obligatorio incluso en tema oscuro).
- Estilos **inline** en cada elemento, sin `<style>` ni CSS externo.
- Ancho máximo 600px.
- Sin `dangerouslySetInnerHTML`; todos los valores se escapan.
- Imágenes: URL absoluta desde `imagen_url` del payload; fallback texto "Sin imagen" si falta.
- Sin links de unsubscribe (el sistema Lovable los agrega si aplica).

### Versión interna

Misma plantilla + bloque adicional al inicio:

```
Nueva solicitud recibida
Cliente: {nombre} <{email}>
Empresa: {empresa}
Teléfono/WhatsApp: {phone}
```

---

## 6. Registro en `proposal_email_events`

Después de cada intento de envío (cliente e interno), insertar una fila:

```sql
INSERT INTO proposal_email_events
  (cotizacion_lead_id, email_type, recipient_email, status, provider_message_id, error_message, sent_at)
VALUES
  ($1, $2, $3, $4, $5, $6, $7);
```

- `email_type`: `"proposal_summary_client"` | `"proposal_summary_internal"`.
- `recipient_email`: email destino.
- `status`: `"sent"` cuando el proveedor devuelve 2xx; `"failed"` si hay error de envío; `"skipped"` si falta configuración (dominio, secret).
- `provider_message_id`: `id` devuelto por Lovable Emails/Resend.
- `error_message`: mensaje resumido (máx 500 chars, sanitizado, sin stack traces ni tokens).
- `sent_at`: `now()` si `status='sent'`, `null` en otros casos.

**Grants:** verificar en Build que `service_role` tiene `INSERT` sobre `proposal_email_events` (la Edge Function usa service role, no requiere policy para `anon`).

**No se hace `.select()` de la tabla al cliente. Solo escribe la Edge Function.**

---

## 7. Riesgos

1. **Sin dominio verificado**: si Lovable Emails no está configurado, el envío falla. Mitigación: en Build, primero `check_email_domain_status`; si no hay dominio, mostrar diálogo de setup ANTES de escribir código de envío. Mientras tanto, `status="skipped"` no bloquea la solicitud.
2. **Fallback silencioso**: si la Edge Function no responde (timeout), el cliente ya cerró la pestaña porque WhatsApp abre en `_blank` y luego navega a success. Aceptable — el registro queda en `cotizaciones_leads` y el email se puede reintentar manualmente desde CRM en futuro sprint.
3. **PII en logs**: no loguear `datos_cliente` completo en la Edge Function. Solo `lead_id` y `status`.
4. **Duplicados**: sin idempotencia se podría reenviar si el cliente hace doble submit. Mitigación: `idempotencyKey` en Lovable Emails o revisar `proposal_email_events` antes de reenviar.
5. **Rate limit del proveedor**: no aplica al volumen actual (1 correo por solicitud).
6. **CORS**: la función es invocada por origen público; asegurar headers `Access-Control-Allow-Origin: *` en respuesta.
7. `**select().single()` puede fallar** si RLS oculta la fila recién insertada. Verificar en Build que la policy INSERT de `cotizaciones_leads` permita `RETURNING id` para `anon` — probablemente ya funciona porque `WITH CHECK (true)`, pero validar.
8. **HTML mal formado en móvil**: usar tabla-based layout, no flexbox/grid.
9. **Imagenes rotas**: URLs firmadas de Supabase pueden expirar; hoy `imagen_url` es pública de proveedor, riesgo bajo.
10. `**INTERNAL_SALES_EMAIL` no configurado**: envío interno se marca `skipped`; solicitud del cliente sigue intacta.

---

## 8. Checklist de aceptación

Funcional:

- Al enviar "Solicitar propuesta formal", `cotizaciones_leads` recibe un INSERT y devuelve `id`.
- La Edge Function `send-proposal-summary-email` se invoca con ese `id`.
- WhatsApp abre igual que hoy (no bloqueado por el email).
- Pantalla de éxito aparece igual que hoy (no bloqueada por el email).
- Si el email falla, la solicitud sigue guardada en BD (verificable con `SELECT * FROM cotizaciones_leads`).

Correo cliente:

- Recibe correo con asunto `Resumen preliminar de solicitud de cotización — Folio ...`.
- Muestra nombre, empresa, folio corto, fecha.
- Muestra tabla con imagen, clave, modelo, color, cantidad, personalización solicitada, alternativa económica (si aplica), subtotal por producto.
- Muestra total preliminar.
- Contiene banner "no es cotización final".
- Renderiza correctamente en Gmail web + iOS Mail.
- Ningún dato de proveedor, costo o margen aparece.

Correo interno:

- Ventas recibe copia con datos de contacto del cliente en el encabezado.
- Mismo detalle de productos.

Registro:

- `proposal_email_events` tiene 2 filas por solicitud (cliente + interno), o 1 fila `skipped` cuando falta configuración.
- `status` refleja el resultado real (`sent` | `failed` | `skipped`).
- `provider_message_id` presente cuando `sent`.
- `error_message` presente y sanitizado cuando `failed`.

No-regresión:

- `productos_publicos` intocable (mismo `pg_get_viewdef`).
- RLS intocable.
- Edge Functions existentes intactas (`capture-assistant-lead`, `sync-*`, `promote-provider-products-to-catalog`).
- UI de `QuoteCartView` visualmente idéntica (mismos textos, mismas clases, mismo layout).
- Catálogo, PDP, Landing intactos.
- `productos_b2b.activo` piloto sigue en `false` para 50 registros.

---

## Alcance exacto del futuro Build (cuando se apruebe)

1. `check_email_domain_status`. Si no hay dominio: diálogo de setup. Si hay: continuar.
2. Si aplica: `setup_email_infra` + `scaffold_transactional_email` (una sola vez, sin retries).
3. Agregar template en `_shared/transactional-email-templates/` para "proposal-summary" (o generar HTML inline dentro de la nueva función; decisión final en Build).
4. Crear `supabase/functions/send-proposal-summary-email/index.ts` (Edge Function nueva).
5. `add_secret` para `INTERNAL_SALES_EMAIL` (único secret manual).
6. Dos `code--line_replace` en `src/components/QuoteCartView.tsx` (capturar `id` + invocar función).
7. `deploy_edge_functions` para la nueva función.
8. Prueba con `curl_edge_functions` pasando un `cotizacion_lead_id` real de test.

Sin migraciones. Sin cambios en tablas. Sin cambios en RLS. Sin cambios en UI visible más allá del handler de envío.  
  
BUILD.

INSTRUCCIÓN CRÍTICA DE ALCANCE:

No cambies nada que no se te pida explícitamente.

No modifiques archivos no relacionados.

No refactorices.

No rediseñes UI.

No cambies productos_publicos.

No cambies RLS.

No ejecutes migraciones.

No modifiques Edge Functions existentes.

No cambies precios.

No cambies stock.

No cambies catálogo.

No cambies WhatsApp salvo lo mínimo necesario para no bloquear el email.

No agregues PDF.

No agregues pago online.

No agregues checkout.

Si detectas mejoras fuera de alcance, repórtalas como recomendación pero no las implementes.

proposal_email_events ya fue validada y acepta:

email_type: customer_summary, internal_notification

status: sent, failed, skipped

Objetivo:

Implementar Sprint 2.6: envío automático de correo “Resumen preliminar de solicitud de cotización” después de guardar una solicitud en cotizaciones_leads.

Contexto:

- El proyecto NO es e-commerce.

- No hay pago online.

- El correo NO es cotización final.

- El correo debe ser un resumen preliminar editable por el equipo.

- WhatsApp debe seguir funcionando aunque el email falle.

- proposal_email_events ya existe.

- Usar email_type:

  - customer_summary

  - internal_notification

- Usar status:

  - sent

  - failed

  - skipped

Configuración:

- INTERNAL_SALES_EMAIL = [promocionalesemocionales@gmail.com](mailto:promocionalesemocionales@gmail.com)

- FROM_NAME = Promocionales Emocionales

- FROM_EMAIL = [promocionalesemocionales@gmail.com](mailto:promocionalesemocionales@gmail.com) si el proveedor lo permite.

- Si Resend requiere dominio verificado, usar fallback seguro configurable con env FROM_EMAIL y registrar skipped/failed si no está configurado.

- Usar RESEND_API_KEY como secret.

Implementar solo:

1. Nueva Edge Function:

   supabase/functions/send-proposal-summary-email/index.ts

2. Modificar únicamente:

   src/components/QuoteCartView.tsx

Cambios en QuoteCartView:

- Cambiar insert en cotizaciones_leads para capturar id:

  .insert([payload]).select("id").single()

- Después del insert exitoso, invocar send-proposal-summary-email con:

  { cotizacion_lead_id: [inserted.id](http://inserted.id) }

- La invocación debe ser no bloqueante.

- Si falla el email, no debe impedir WhatsApp ni pantalla de éxito.

Edge Function:

- Recibe cotizacion_lead_id.

- Usa SUPABASE_SERVICE_ROLE_KEY.

- Lee la fila completa de cotizaciones_leads.

- Extrae datos_cliente, articulos_cotizados, total_estimado, created_at.

- Envía correo al cliente.

- Envía correo interno a INTERNAL_SALES_EMAIL.

- Registra cada intento en proposal_email_events.

- Si falta RESEND_API_KEY, FROM_EMAIL o INTERNAL_SALES_EMAIL, registrar skipped.

- No loguear PII completa.

- No exponer service role.

- Manejar CORS.

Contenido del correo:

Asunto cliente:

Resumen preliminar de solicitud de cotización — Folio {shortId}

Debe incluir:

- nombre

- empresa

- folio

- fecha

- productos con imagen

- clave_producto

- modelo_comercial

- color

- cantidad

- personalización solicitada

- alternativa económica sugerida si aplica

- subtotal preliminar

- total preliminar

- leyenda clara:

  Este documento NO es una cotización final. Es un resumen preliminar. Precios antes de IVA e impresión. Tu asesor validará técnica, disponibilidad, logo, cantidades y tiempos.

Correo interno:

- Mismo resumen

- Datos de contacto visibles: nombre, empresa, email, teléfono

Reglas:

- No tocar UI visible.

- No tocar diseño.

- No tocar productos_publicos.

- No tocar Supabase schema.

- No tocar RLS.

- No tocar Edge Functions existentes.

- No generar PDF.

- No calcular impresión.

- No cambiar precios.

- No exponer proveedor, costos, márgenes, raw_payload ni provider_sku.