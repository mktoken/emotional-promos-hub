# PLAN — QA FUNCIONAL FINAL POST-MIGRACIÓN CATALOGVIEW V2

## 1. Alcance del QA

Validar la experiencia real del usuario final sobre la rama `feat/v2-cutover-preparation` (HEAD `d0c2c33`) después de la migración de `CatalogView` a `catalog_search_products_v2`.

- Cobertura: catálogo público completo (listado, búsqueda, filtros, paginación, ficha, carrito, solicitud de cotización, CTA WhatsApp).
- Toda la ejecución es contra el preview local de Lovable (`http://localhost:8080`) vía navegador automatizado (Playwright) + consultas SQL de solo lectura (`SELECT`).
- No se crean productos, no se edita precio/stock, no se toca ninguna tabla V2/Legacy salvo el insert controlado de UN lead de prueba (sección 4, item QA-15), que puede omitirse si no se autoriza.

## 2. Datos / productos de prueba

Selección previa por SQL de solo lectura (antes del QA en navegador):

- **P1 — precio V2 normal:** un producto con `public_price_status = 'priced'` de `catalog_price_v2_current_prices` (p. ej. el primero del listado, ya observado con precio y mínimo en Fase 3).
- **P2 — precio a cotizar:** uno de los 18 productos con `public_price_status = 'request_quote'`.
- **P3 — below_minimum:** un producto cuyo `minimum_quantity` > 1 para validar el estado en ficha con cantidad 1.
- **Categoría de prueba:** una categoría con subcategorías y al menos 25 productos (para paginación) y presencia en colección ecológica.
- Datos de contacto del lead de prueba (solo si QA-15 se ejecuta): nombre/correo/teléfono claramente identificables como "QA TEST — borrar", para localizarlo y borrarlo después con autorización.

## 3. Acciones manuales (navegador automatizado, usuario final real)

| ID | Prueba | Acción |
|---|---|---|
| QA-1 | Carga inicial | Abrir `/` → "Explorar Catálogo"; verificar render de tarjetas, imágenes, precios. |
| QA-2 | Total visible | Leer contador/total y compararlo contra `total_count` de `catalog_search_products_v2` (992 en Fase 3). |
| QA-3 | Búsqueda por texto | Buscar un término real (p. ej. "taza"); verificar resultados y total. |
| QA-4 | Filtro categoría | Aplicar una categoría; verificar que los resultados pertenecen a ella. |
| QA-5 | Filtro subcategoría | Aplicar subcategoría dentro de la anterior. |
| QA-6 | Filtro ecológico | Activar colección eco; comparar total contra RPC con filtro eco (11 con query en Fase 3). |
| QA-7 | Paginación | Avanzar a página 2; verificar que cambian los productos y no hay duplicados con página 1. |
| QA-8 | Precio V2 | En P1, verificar "Desde $X c/u" y que coincide con `catalog_price_v2_current_prices`. |
| QA-9 | Precio a cotizar | En P2, verificar texto exacto "Precio a cotizar" (sin precio numérico). |
| QA-10 | Cantidad mínima | Verificar que la tarjeta/ficha muestra el mínimo cuando aplica. |
| QA-11 | Listado → ficha | Click en tarjeta; verificar que abre la ficha correcta (mismo producto). |
| QA-12 | Consistencia listado vs ficha | Comparar precio "Desde" del listado contra el precio de la ficha en la cantidad mínima vía `get_public_product_price_quote`. |
| QA-13 | Agregar al carrito | Agregar P1 con cantidad válida; verificar badge/contador del carrito. |
| QA-14 | Consistencia ficha vs carrito | Verificar que el ítem del carrito refleja producto, cantidad y precio estimado coherente. |
| QA-15 | Solicitud de cotización (punto seguro) | Llenar formulario con datos de prueba y **detener antes del submit final**; validar estados del botón, protección de doble envío y textos. (El submit real solo con autorización explícita, ver sección 9.) |
| QA-16 | WhatsApp / CTA | Verificar presencia visual del CTA y que el enlace `wa.me` tiene número y mensaje precargado (sin hacer click que envíe nada). |
| QA-17 | Consola / red | Capturar errores de consola y requests fallidos durante todo el recorrido. |
| QA-18 | Legacy como respaldo | Solo lectura SQL: confirmar que `catalog_search_products` y `catalog_price_cache` siguen presentes e intactos (1524 filas) sin usarlos en el flujo. |
| QA-19 | Sin rollback | Confirmar que `catalog_price_v2_releases` sigue con `is_current = true` en la release `2738c0e4…` y que nadie llamó al RPC de rollback. |
| QA-20 | Sin alteración de Supabase | Diff de conteos antes/después del QA: `catalog_price_cache`, `catalog_price_cache_v2_shadow`, `catalog_price_v2_releases`, `pricing_rule_sets` idénticos. |

## 4. Consultas / verificaciones (todo SELECT o lectura de preview)

- Conteos y precios en `catalog_price_v2_current_prices` para P1/P2/P3 (antes del QA).
- Llamadas públicas RPC (rol anon, igual que el navegador): `catalog_search_products_v2` con y sin filtros, `get_public_product_price_quote` para P1/P3.
- Estado de release: `SELECT id, is_current, published_at FROM catalog_price_v2_releases`.
- Conteos de respaldo Legacy: `SELECT count(*) FROM catalog_price_cache` (debe seguir 1524).
- Capturas de pantalla en cada paso QA-1 a QA-16; consola y red del navegador para QA-17.
- Snapshot de conteos al final (QA-20) y comparación contra el snapshot inicial.

## 5. Qué NO tocaría

- Ningún archivo de código, ni `CatalogView.tsx` ni ningún otro.
- Ninguna tabla, migración, RLS, grant, secret ni Edge Function.
- No ejecutar recompute, shadow write, publish de release, ni rollback.
- No hacer deploy, publish, commit, push, merge ni cambio de rama.
- No usar la ruta Legacy como flujo principal (solo verificación de existencia).
- No borrar ni crear datos salvo, como máximo y solo con autorización explícita, el lead de prueba de QA-15.

## 6. Criterios de aprobación

- QA-1 a QA-14 y QA-16/17 pasan sin errores funcionales ni errores nuevos de consola/red (se toleran los warnings React preexistentes de refs ya documentados).
- Totales de catálogo coinciden entre UI y RPC V2.
- Precios UI = precios V2 en listado, ficha y carrito.
- QA-18/19/20 confirman Legacy intacto, release vigente y cero alteraciones de datos.

## 7. Criterios de bloqueo (detener y reportar)

- Cualquier diferencia de precio entre listado, ficha o RPC.
- Productos "Precio a cotizar" mostrando precio numérico, o productos con precio mostrando "Precio a cotizar".
- Errores JS que rompan navegación, filtros o carrito.
- Totales UI ≠ RPC V2.
- Cualquier cambio inesperado en conteos de tablas (QA-20).
- Cualquier 4xx/5xx en llamadas RPC del flujo público.

## 8. Riesgos

- **Lead de prueba real:** si se autoriza el submit completo de QA-15, se genera un lead real en el CRM; mitigación: datos marcados "QA TEST" y borrado posterior autorizado. Si no se autoriza, QA-15 queda en "formulario validado, submit no ejecutado".
- **Precios dinámicos:** un refresh de stock entre la selección de productos y la prueba podría cambiar estados; mitigación: ejecutar la selección y el QA en la misma sesión.
- **Warnings preexistentes:** los avisos de refs de React ya documentados no son regresión; se distinguen de errores nuevos.
- **Datos de proveedor:** stock/precio provienen de datos reales; el QA no los controla ni los modifica.

## 9. Autorización exacta que necesito para ejecutar en Build

Una sola autorización con estas dos decisiones explícitas:

1. **Autorización base:** "Autorizo ejecutar el QA funcional final (QA-1 a QA-20) en modo Build: navegador automatizado contra el preview local, capturas de pantalla, y consultas SQL de solo lectura. Sin modificar código, Supabase, ni datos."
2. **Decisión sobre QA-15 (elegir una):**
   - a) "QA-15 sin submit: validar formulario hasta el punto seguro, sin insertar lead." (recomendada), o
   - b) "Autorizo el submit de un lead de prueba marcado 'QA TEST' y su borrado posterior."

## VEREDICTO PLAN QA

- **¿Puede ejecutarse sin modificar código?** Sí. Todo el QA es navegación de usuario final + SQL de solo lectura.
- **¿Puede ejecutarse sin tocar Supabase estructuralmente?** Sí. Solo `SELECT`; cero DDL, cero migraciones, cero cambios de RLS/grants/secrets/functions.
- **¿Puede ejecutarse sin crear datos reales innecesarios?** Sí, con la opción 9.2a (QA-15 sin submit). Con la opción 9.2b se crea exactamente 1 lead de prueba identificable y borrable.
- **¿Qué evidencia entregaré al terminar?** Reporte QA-1…QA-20 con resultado por prueba, capturas de pantalla de cada paso, log de consola/red, totales UI vs RPC, comparación de conteos antes/después y veredicto final GO/NO-GO.
- **¿Qué autorización exacta necesito para pasar a Build?** La descrita en la sección 9: autorización base + decisión explícita sobre QA-15 (9.2a o 9.2b).
