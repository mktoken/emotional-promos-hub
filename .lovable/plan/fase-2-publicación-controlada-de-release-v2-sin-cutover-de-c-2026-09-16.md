# Fase 2 — Publicación controlada de release V2 (sin cutover de CatalogView)

Solo plan. No se ejecuta nada en esta respuesta. Restricciones entendidas: sin cutover, sin tocar frontend/CatalogView, sin migraciones, sin RLS/grants/secrets, sin Edge Functions, sin deploy/publish/commits/ramas, sin tocar `catalog_price_cache`, sin recompute ni shadow write nuevos.

## Hallazgo crítico que cambia el alcance (verificado en base de datos)

La publicación de la release NO es puramente interna. Verificado leyendo las funciones:

- `get_public_product_price_quote` decide su ruta según `catalog_price_v2_releases.is_current`. Hoy, sin release, devuelve precio Legacy (`productos_publicos.precio_desde_mxn`). Al publicar, pasa automáticamente a la ruta V2. Esa función ya la usan el detalle de producto y el carrito de cotización del sitio.
- `catalog_search_products_v2` tiene el mismo interruptor interno, pero el catálogo público sigue llamando a `catalog_search_products` (Legacy), así que el listado no cambia.

Consecuencia: publicar la release cambia los precios visibles en la ficha de producto y en el carrito, mientras el listado sigue con precios Legacy. Habrá diferencia de precio entre listado y ficha hasta la Fase 3. Esto no es un cutover de CatalogView, pero sí es un cambio visible para el público. Requiere aceptación explícita antes de ejecutar.

Otro dato verificado: `catalog_price_v2_current_prices` es una **vista** (0 filas hoy), no una tabla. No se "puebla": se llena sola al existir release actual, leyendo de la tabla shadow. La validación consiste en consultarla, no en escribirla.

## Estado verificado hoy (solo lectura)

| Elemento | Valor |
|---|---|
| Generación `818d824a…` | existe, `certified`, modo shadow_write |
| Filas shadow de esa generación | 1,524 |
| Rule set de la generación | `6dfe8a90…` = `2026-01-v2-draft` (inactivo) |
| Releases V2 | 0 · vista de precios vigentes: 0 filas |
| Rule sets | `2026-01` activo (Legacy), `2026-01-v2-draft` inactivo |
| RPC de publicación | `public.publish_catalog_price_v2_generation(uuid)` |
| RPC de rollback | `public.rollback_catalog_price_v2_to_legacy()` |

Nota: `publish_...` no exige que el rule set esté activo; valida generación, contadores e integridad shadow. No se propone activar ningún rule set.

## Fase 2A — Preflight de release (solo lectura)

Verificar y dejar registrado, todo por consulta:
1. Generación `818d824a…` existe, modo `shadow_write`, estado `certified`.
2. Contadores exactos 1524 / 1524 / 1506 / 18 / 0 / 0 / 0.
3. Shadow: 1,524 filas y 1,524 productos distintos; 1,506 `priced`, 18 `request_quote`, 0 `unavailable`.
4. Contrato de precios: 0 filas `priced` con precio nulo/≤0 o mínimo nulo/≤0; 0 filas `request_quote`/`unavailable` con precio no nulo. (Son las mismas reglas que la función de publicación revalida internamente.)
5. `rule_set_id` de todas las filas shadow igual al de la generación.
6. `catalog_price_v2_releases` sin ninguna fila `is_current = true`.
7. Legacy: `catalog_price_cache` con 1,524 filas y `updated_at` del 18 jul — se captura como huella para comparar después.
8. Existencia y firma de los RPC de publicación y rollback.
9. Se captura una muestra de 10 productos con su precio Legacy y su precio V2 previsto, para medir el salto de precio que verá el público en la ficha.

Si algo de 1–6 falla, la fase se detiene sin publicar.

## Fase 2B — Publicación controlada

- Llamada única: `select * from public.publish_catalog_price_v2_generation('818d824a-ff5d-4b66-a9c1-6cac56d4c4d5')`, ejecutada con sesión de staff (la función exige `auth.uid()` + `is_staff`).
- Escribe únicamente en `catalog_price_v2_releases` (una fila, `is_current = true`). Es idempotente: si ya fuera la release actual, no reescribe.
- No escribe en `catalog_price_cache`, ni en shadow, ni en generaciones, ni en tablas de proveedor, ni en `pricing_rule_sets`.
- Confirmación posterior: exactamente 1 release con `is_current = true` apuntando a `818d824a…`; la vista de precios vigentes devuelve 1,524 filas (1,506 con precio); `catalog_price_cache` idéntico a la huella tomada en 2A.

## Fase 2C — Validación backend después de la release

1. `get_public_product_price_quote` sobre una muestra de productos `priced` en cantidades 1, mínimo, mínimo−1 y una cantidad alta: verificar estado, precio > 0, moneda y bandera de cantidad válida.
2. La misma función sobre productos `request_quote`: debe devolver ese estado y precio nulo.
3. La misma función sobre un producto inexistente en la generación: debe devolver `unavailable` sin error.
4. `catalog_search_products_v2` con y sin filtros: devuelve resultados, `total_count` coherente y estados de precio poblados desde la release.
5. Consistencia contra shadow: conteo de estados vía la vista vigente igual a 1,506 / 18 / 0.
6. Cero excepciones en todas las llamadas.
7. Comparación Legacy vs V2 en la muestra, para reportar la magnitud del cambio de precio en la ficha pública.

## Fase 2D — Disponibilidad de rollback (no se ejecuta)

- RPC disponible: `public.rollback_catalog_price_v2_to_legacy()`, requiere staff.
- Qué hace: marca la release actual como no vigente (`is_current = false`, sella `superseded_at`/`superseded_by`). Con eso, la ficha de producto y el carrito vuelven de inmediato a la ruta Legacy.
- Qué NO hace: no borra filas shadow, no borra generaciones, no toca `catalog_price_cache`, no revierte datos de stock ni nada del frontend.
- Cuándo se usaría: precios incoherentes en producción, fallo de las funciones públicas o queja de negocio por el salto de precio.
- Autorización: se ejecutaría solo con orden explícita, salvo emergencia autorizada por el usuario en el momento.
- Verificación sin ejecutar: se confirma que la función existe, su firma y su lógica; no se invoca.

## Fase 2E — Paro obligatorio

Al cerrar 2C y 2D, la ejecución se detiene. No se migra `CatalogView`, no se toca frontend, no hay deploy, no se retira Legacy, no se activa el rule set V2.

## Tablas y funciones

**Escribiría:** `catalog_price_v2_releases` (una fila).

**Leería:** `catalog_price_cache_v2_generations`, `catalog_price_cache_v2_shadow`, `catalog_price_v2_current_prices` (vista), `pricing_rule_sets`, `catalog_price_cache` (solo lectura, como huella), `productos_publicos`.

**No tocaría:** `catalog_price_cache`, shadow, generaciones, `pricing_rule_sets`, tablas de proveedor/stock/escalas, cualquier tabla de CRM o cotizaciones, RLS, grants, secretos, Edge Functions, archivos del repositorio.

**RPC:** `publish_catalog_price_v2_generation`, `rollback_catalog_price_v2_to_legacy`, `get_public_product_price_quote`, `catalog_search_products_v2`.

## Riesgos

1. **Cambio de precios visible en ficha y carrito** al instante de publicar, con el listado aún en Legacy: precios distintos en la misma sesión del usuario. Riesgo principal.
2. 18 productos pasarán a "solicitar cotización" en la ficha.
3. Datos de CDO parcialmente refrescados (234 de 1,094 filas), por lo que algunos precios V2 se calculan sobre insumos de julio.
4. La sesión de staff necesaria para publicar caduca; habría que renovarla.
5. Mitigación disponible en segundos: rollback de release.

## Condiciones de paro para la ejecución futura

La generación no existe o no está certificada; contadores distintos a 1524/1506/18/0/0/0; integridad shadow fallida; ya existe una release actual inesperada; la publicación exigiría migraciones, cambios de frontend, RLS, grants, secretos o Edge Functions; `catalog_price_cache` resulta afectado; la vista de precios vigentes no se llena; `catalog_search_products_v2` o `get_public_product_price_quote` fallan; no puede confirmarse el rollback.

## Autorización exacta requerida para pasar a Build

Necesito que respondas, textualmente:

1. "Autorizo Fase 2A–2E" (preflight, publicación, validación backend y verificación de rollback).
2. "Acepto que publicar la release cambia los precios de la ficha de producto y del carrito de inmediato, mientras el listado sigue en Legacy" — o bien indicas que se detenga por este motivo.
3. Si autorizas o no el rollback inmediato sin nueva consulta en caso de incoherencia detectada durante 2C.

## VEREDICTO PLAN FASE 2

- ¿Puede planearse sin tocar frontend? Sí; no se modifica ni un archivo del sitio.
- ¿Puede ejecutarse sin migrar CatalogView? Sí; el listado sigue en Legacy.
- ¿Mantiene Legacy activo? Sí en estructura, RPC, caché y rol del listado público; pero la ficha y el carrito dejan de usar el precio Legacy.
- ¿Activa únicamente release V2 backend? La escritura es solo backend (una fila), pero su efecto sí alcanza al público en ficha y carrito. No es una fase invisible.
- ¿Qué autorización necesito? Los tres puntos de la sección anterior.
