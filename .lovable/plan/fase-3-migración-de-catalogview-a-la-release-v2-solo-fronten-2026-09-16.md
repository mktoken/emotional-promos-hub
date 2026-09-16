# Fase 3 — Migración de CatalogView a la release V2 (solo frontend)

Solo plan. No se ejecuta nada en esta respuesta. Restricciones entendidas: sin backend, sin Supabase, sin migraciones, sin RPC nuevas, sin Edge Functions, sin RLS/grants/secrets, sin recompute, sin shadow write, sin release, sin rollback, sin retirar Legacy, sin rediseño de UI, sin tocar CRM, WhatsApp, auth ni proveedores.

## Verificado antes de planear

Firma real de ambas RPC (leídas del catálogo de funciones):

| Aspecto | `catalog_search_products` (Legacy) | `catalog_search_products_v2` |
|---|---|---|
| Parámetros | `p_query, p_category_slug, p_collection_slug, p_min_price, p_max_price, p_limit, p_offset, p_subcategory_slug` | **idénticos** |
| Columnas comunes | `id, id_interno, sku_base, nombre, descripcion, imagenes, precio_desde_mxn, categoria_slug, categoria_nombre, subcategoria_slug, subcategoria_nombre, relevance, total_count` | las mismas |
| Columnas extra | — | `public_price_status`, `currency`, `minimum_quantity`, `pricing_generation_id` |

Conclusión clave: los argumentos son iguales y V2 es un superconjunto de columnas. No hay campos perdidos, así que paginación, búsqueda, categorías, subcategorías y colección ecológica siguen funcionando sin cambios de contrato.

Estado actual en el archivo `src/components/CatalogView.tsx` (813 líneas):
- Línea 207: única llamada a `catalog_search_products`.
- Líneas 16–30: interfaz local `RpcProduct`.
- Línea 219: `total_count` se toma de la primera fila (sirve igual en V2).
- Líneas 695 y 721–729: el precio se muestra solo si `precio_desde_mxn > 0`; hoy los productos sin precio quedan sin ninguna etiqueta.

## Archivos

**Revisaría:** `src/components/CatalogView.tsx`, `src/components/ProductDetailView.tsx`, `src/features/catalog/lib/public-product-price.ts`, `src/pages/Index.tsx`, `src/components/catalog/MobileFiltersDrawer.tsx`.

**Probablemente tocaría:** únicamente `src/components/CatalogView.tsx`. Opcionalmente un archivo nuevo de prueba `src/test/catalog-v2-contract.test.ts` si autorizas prueba automatizada.

**No tocaría:** ProductDetailView, QuoteCartView, Index, adaptadores de precio V2, tipos generados, CRM, assistant, Edge Functions, SQL, nada de Supabase.

## Fase 3A — Preflight frontend

1. Confirmar que la línea 207 es la única llamada Legacy del listado.
2. Confirmar que ningún otro componente depende de la forma de `RpcProduct` del catálogo.
3. Consultar `catalog_search_products_v2` (solo lectura) para conocer cuántos resultados del listado público llegan como `priced`, `request_quote` o `below_minimum`, y si `minimum_quantity` viene poblado.
4. Verificar que `total_count` de V2 coincide con el de Legacy (ambos devolvieron 992 en la validación de Fase 2).
5. Confirmar que `id` sigue siendo el mismo identificador que consume `onOpenProduct` → ProductDetailView.

## Fase 3B — Cambio mínimo

Un solo archivo, `src/components/CatalogView.tsx`:

1. **Interfaz `RpcProduct` (líneas 16–30):** añadir `public_price_status: string | null`, `currency: string | null`, `minimum_quantity: number | null`. No se quita nada.
2. **Llamada (línea 207):** cambiar el nombre de la función a `catalog_search_products_v2`. Los argumentos quedan idénticos.
3. **Tarjeta de producto (líneas 693–733):** mostrar según el estado:
   - `priced` con precio > 0 → texto actual "Desde $X c/u", más "Mínimo N pzas" si `minimum_quantity > 1`.
   - `request_quote` o sin precio → etiqueta discreta "Precio a cotizar" con las clases existentes del bloque de precio.
   - `below_minimum` o cualquier otro estado → mismo tratamiento de "Precio a cotizar".
   Sin colores nuevos, sin componentes nuevos, sin cambio de layout: se reemplaza solo el contenido del párrafo de precio.
4. Nada más: paginación, filtros, scroll, drawer móvil, navegación y estados de carga quedan intactos.

**Riesgos de compatibilidad:** bajos. El único riesgo real es que algún producto del listado llegue con estado no `priced` y hoy se renderice sin texto; el cambio lo cubre explícitamente.

## Fase 3C — Validación funcional

Con el navegador sobre la app en ejecución:
1. Carga inicial del catálogo: total de resultados y primera página.
2. Búsqueda por texto.
3. Filtro por categoría y por subcategoría.
4. Filtro de colección ecológica.
5. Paginación: página 2 y regreso a la 1; conteo "X–Y de Z".
6. Producto con precio: la tarjeta muestra el mismo importe que la ficha.
7. Producto en "solicitar cotización": etiqueta correcta, sin precio inventado.
8. Producto con cantidad mínima: la nota de mínimo coincide con la ficha.
9. Click en tarjeta → ficha correcta; botón volver conserva scroll y filtros.
10. Agregar al carrito desde la ficha y revisar el resumen.
11. Consistencia listado/ficha/carrito en una muestra de productos.
12. Cero errores en consola.

Opcional (si lo autorizas): prueba estática que verifique que CatalogView llama a `catalog_search_products_v2` y no a la Legacy.

## Fase 3D — No regresión

Se confirma por inspección y prueba que no se modifican ni se rompen: ProductDetailView, carrito, envío de solicitud de cotización, CRM, WhatsApp, autenticación, Edge Functions, Supabase, y el backend Legacy (la RPC `catalog_search_products` sigue existiendo y operativa, solo deja de ser llamada por el listado). Se ejecuta la suite de pruebas existente para confirmar que sigue en verde.

## Fase 3E — Reversión

Revertir es un cambio de una palabra: volver la línea de la llamada a `catalog_search_products` y, si se desea, quitar los campos añadidos a la interfaz. Se hace en el mismo archivo, en minutos, sin tocar Supabase, sin desactivar la release V2 y sin rollback backend. La release V2 seguiría sirviendo ficha y carrito, regresando al estado actual de Fase 2.

## Riesgos

1. Diferencia de precio visible entre el listado de hoy (Legacy) y el de mañana (V2): en la muestra de Fase 2 el promedio V2 fue 11.7% menor, con 1,019 productos a la baja y 241 al alza. Al migrar, el listado baja de precio de forma visible para el público.
2. Hasta 18 productos pueden pasar a "Precio a cotizar" en el listado.
3. Los datos de CDO quedaron refrescados solo parcialmente (234 de 1,094 filas), así que algunos precios V2 se calcularon sobre insumos de julio.
4. Si V2 devolviera menos resultados que Legacy, el catálogo perdería productos; por eso se compara `total_count` antes y después.

## Condiciones de paro

V2 no devuelve los campos necesarios; hace falta tocar backend, Supabase, migraciones, RLS, grants, secrets o Edge Functions; se rompe paginación, búsqueda, navegación a ficha o carrito; error visible en el catálogo público; el cambio exigiría más archivos que `CatalogView.tsx`; `total_count` de V2 difiere del de Legacy; o la solución pasaría por rediseñar o reestructurar.

## Autorización exacta requerida

Necesito que respondas textualmente:

1. "Autorizo Fase 3A–3E" (preflight, cambio mínimo en CatalogView, validación y no regresión).
2. "Acepto que el listado público pase a precios V2, con cambio visible de precios y hasta 18 productos en 'Precio a cotizar'".
3. Si autorizas o no añadir un archivo de prueba automatizada además de `CatalogView.tsx`.

## VEREDICTO PLAN FASE 3

- ¿Migrar CatalogView a V2 sin tocar backend? Sí. La RPC V2 ya existe, está publicada y acepta los mismos argumentos.
- ¿Sin modificar Supabase? Sí. Ninguna escritura, migración ni cambio de permisos.
- ¿Legacy disponible como respaldo? Sí. `catalog_search_products` queda intacta y la reversión es cambiar el nombre de la llamada.
- ¿Qué archivos tocaría exactamente? `src/components/CatalogView.tsx`; opcionalmente un test nuevo si lo autorizas.
- ¿Qué validaría? Carga, búsqueda, categorías, subcategorías, ecológico, paginación, estados de precio, mínimo, navegación a ficha, carrito, consistencia entre las tres vistas y consola sin errores.
- ¿Qué autorización necesito? Los tres puntos de la sección anterior.
