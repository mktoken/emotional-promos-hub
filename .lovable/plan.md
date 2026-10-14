# CHK-CDO-01K — Incorporar los 43 modelos CDO faltantes

Confirmado en vivo (solo lectura): CDO tiene **446** modelos activos, **403** ya enlazados y **43** faltantes, con **124** ofertas activas sin enlazar. Coincide con la orden.

## Pasos

1. **Lista fija**: guardar los 43 modelos faltantes y sus 124 ofertas (IDs exactos). Si al ejecutar el número cambia, STOP.
2. **Pre-chequeo por modelo (solo lectura)**: nombre, oferta activa, costo > 0, MOQ, stock e imagen del proveedor; 0 ofertas ya enlazadas; 0 ambiguas. Si alguno falla, se reporta como BLOCKED y no se crea.
3. **Simulación**: correr la función de promoción existente en modo `dry_run` solo para CDO, sin piloto, y confirmar que propone exactamente esos 43.
4. **Escritura**: correr la misma función en modo `full` solo para esos 43. Crea el producto en el catálogo y enlaza sus ofertas. Todo queda **no publicado y no visible**.
5. **Verificación**:
   - creados 43; total CDO enlazado 446; 124 ofertas enlazadas; ambiguos 0;
   - sin costo / stock / MOQ / imagen: 0;
   - los 403 modelos previos sin cambios;
   - release de precios, visibilidad y catálogo público sin cambios.
6. **Reporte** en el formato pedido y STOP.

## Qué no se hace

No publicar, no cambiar visibilidad, no calcular ni activar precios, no tocar reglas de precio, no modificar los 403 existentes, no usar el banco de imágenes para crear productos.

## Puntos a revisar antes de escribir

- La función de promoción usa por defecto una cuota piloto y una clave de prueba; se usará con `pilot=false` y límite que cubra solo los 43. Si su comportamiento no permite limitarse a esa lista exacta, o si marcaría los productos como visibles, me detengo y lo reporto antes de escribir.
