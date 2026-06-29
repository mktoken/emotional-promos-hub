## Estado actual del proyecto

- **Supabase / Lovable Cloud:** conectado y operativo. Edge Functions activas (`capture-assistant-lead`, `test-g4-connection`).
- **Secrets ya configurados:** `G4_USER`, `G4_KEY`, `G4_WSDL_URL`, `G4_TEST_KEY`, además de los gestionados (`SUPABASE_*`, `LOVABLE_API_KEY`).
- **Secrets faltantes:** `FORPROMOTIONAL_API_TOKEN`, `CDO_MEXICO_API_TOKEN`, `CDO_TEST_API_TOKEN`.
- **Edge Functions relacionadas con proveedores existentes:** solo `supabase/functions/test-g4-connection/index.ts`. No hay funciones para ForPromotional ni CDO todavía.
- **Frontend:** no hace llamadas directas a APIs de proveedores. No existen variables `VITE_` con tokens, y no deben crearse.

## Dónde se cargan los secrets (sin tocar código)

Los secrets se cargan en **Lovable Cloud → Backend → Edge Function Secrets** (no en `.env`, no en frontend, no como `VITE_*`). Quedan disponibles automáticamente en cualquier Edge Function mediante `Deno.env.get("NOMBRE_DEL_SECRET")`.

Al aprobar Build solicitaré los siguientes secrets mediante el formulario seguro (no se pegan en el chat):

- `FORPROMOTIONAL_API_TOKEN`
- `CDO_MEXICO_API_TOKEN`
- `CDO_TEST_API_TOKEN`

`G4_USER` y `G4_KEY` ya están cargados — no se vuelven a pedir.

## Funciones de prueba propuestas

Tres Edge Functions de **diagnóstico temporal**, mismo patrón que `test-g4-connection`:

1. `**test-g4-connection**` — ya existe. No se modifica.
2. `**test-forpromotional-connection**` — leerá `FORPROMOTIONAL_API_TOKEN` con `Deno.env.get()`, hará una llamada de lectura mínima al endpoint público de ForPromotional/4Promotional para validar credenciales y devolverá `{ ok, status, preview }`. Protegida con `G4_TEST_KEY` (reutilizada como llave de diagnóstico) o un nuevo `PROVIDERS_TEST_KEY` si lo prefieres.
3. `**test-cdo-connection**` — leerá `CDO_MEXICO_API_TOKEN` (y opcionalmente `CDO_TEST_API_TOKEN` para entorno sandbox), hará una llamada de lectura ligera al endpoint de CDO/StockSur y devolverá `{ ok, status, preview }`. Misma protección por llave.

Características comunes:

- CORS estándar.
- No persisten datos.
- No imprimen tokens en logs (solo longitudes / metadatos).
- No se exponen desde ningún componente React.
- Son temporales: marcadas para eliminarse tras validación.

## Archivos que se tocarían en Build (alcance exacto)

Nuevos:

- `supabase/functions/test-forpromotional-connection/index.ts`
- `supabase/functions/test-cdo-connection/index.ts`

No se modifican:

- Home, Catálogo, PDP, Carrito, Cotizador, Checkout WhatsApp, Footer, Navbar, FAB, LandingView, CatalogView, ProductDetailView, QuoteCartView, CRM frontend, asistente, RLS, tablas, enums, tipos de Supabase, `supabase/config.toml` (las funciones son Lovable-managed con `verify_jwt=false` por defecto), ni `test-g4-connection` existente.
- Frontend completamente intacto. Cero variables `VITE_*` nuevas.

## Pasos al aprobar Build

1. Pedir mediante formulario seguro: `FORPROMOTIONAL_API_TOKEN`, `CDO_MEXICO_API_TOKEN`, `CDO_TEST_API_TOKEN`.
2. (Opcional) Confirmar si quieres una llave dedicada `PROVIDERS_TEST_KEY` o reutilizar `G4_TEST_KEY`.
3. Confirmar el endpoint/URL base oficial de **ForPromotional** y de **CDO/StockSur** (REST/SOAP, URL, método de autenticación: Bearer, header custom, query param, etc.). Sin esto no puedo construir el request correcto.
4. Crear los dos archivos listados.
5. Probar con `curl` cada función y reportar resultado.

## Preguntas antes de Build

- ¿Endpoints oficiales y método de autenticación para ForPromotional y CDO?
- ¿Reutilizar `G4_TEST_KEY` como llave de diagnóstico común o crear `PROVIDERS_TEST_KEY`?
- ¿`CDO_TEST_API_TOKEN` apunta a un endpoint sandbox distinto al de producción de CDO?  
  
Apruebo Build con alcance limitado.
  Crea únicamente estas Edge Functions nuevas:
  - supabase/functions/test-forpromotional-connection/index.ts
  - supabase/functions/test-cdo-connection/index.ts
  No cambies nada que no se te pida explícitamente.
  No rediseñes.
  No refactorices archivos no relacionados.
  No optimices por iniciativa propia.
  No modifiques frontend, vistas, estilos, copy, navegación, carrito, checkout, CRM, assistant, RLS, tablas, types ni funciones existentes.
  No modifiques test-g4-connection.
  Secrets requeridos:
  - FORPROMOTIONAL_API_TOKEN
  - CDO_MEXICO_API_TOKEN
  - CDO_TEST_API_TOKEN
  - PROVIDERS_TEST_KEY
  No crear variables VITE_.
  No poner tokens en código.
  No imprimir tokens en logs.
  No devolver tokens.
  No devolver costos completos.
  No devolver proveedor al frontend público.
  ForPromotional:
  Endpoint:
  [https://api-external-clients.4promotional.net/api/products](https://api-external-clients.4promotional.net/api/products)
  Auth:
  authorization: Bearer <FORPROMOTIONAL_API_TOKEN>
  CDO / StockSur:
  Endpoint producción:
  [http://api.mexico.cdopromocionales.com/v2/products](http://api.mexico.cdopromocionales.com/v2/products)
  Auth:
  query param auth_token=<CDO_MEXICO_API_TOKEN>
  Paginación:
  page_size=1&page_number=1
  Endpoint pruebas:
  [http://api.argentina.cdo.dev.yellowspot.com.ar/v2/products](http://api.argentina.cdo.dev.yellowspot.com.ar/v2/products)
  Auth:
  query param auth_token=<CDO_TEST_API_TOKEN>
  Paginación:
  page_size=1&page_number=1
  Cada función debe:
  1. Validar una llave de diagnóstico con PROVIDERS_TEST_KEY.
  2. Leer secrets con Deno.env.get().
  3. Hacer una llamada mínima de lectura.
  4. Devolver solo:
     - ok
     - provider
     - status
     - hasProducts
     - hasPrice
     - hasStock
     - hasImages
     - hasVariants si aplica
     - error_message seguro si falla
  No persistir datos.
  No sincronizar catálogo.
  No modificar base de datos.
  No crear tablas.
  No tocar frontend.
  Al terminar, reporta:
  - archivos creados
  - cómo probar cada función
  - resultado esperado
  - cualquier error encontrado  
