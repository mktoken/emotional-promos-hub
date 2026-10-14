# CHK-CDO-01J-C — Guardar precio V2 (shadow) de los 248 productos CDO

Objetivo único: guardar el precio V2 de los mismos 248 productos CDO que ya pasaron la simulación de CHK-CDO-01J-B. No se repite la simulación.

## Pasos

1. **Lista de productos**: usar exactamente los 248 IDs ya certificados en 01J-B (misma lista, 248 únicos). No se arma una lista nueva.
2. **Foto previa (solo lectura)**:
   - versiones de precio: 6; release activo: 2738c0e4… (generación 818d824a…);
   - filas shadow totales: 3048; filas shadow de los 248: 0;
   - precios activos de los 155 CDO que ya tenían precio (se guarda copia para comparar).
3. **Ejecución**: llamar una vez a `recompute-catalog-price-cache-v2` con `mode=shadow_write`, nueva `idempotency_key` (`chk-cdo-01j-c-shadow-20261014`), `batch_size=250` y los 248 IDs. Si no termina en un lote, continuar con `next_cursor` y la misma clave hasta llegar a 248.
4. **Verificación posterior (solo lectura)**:
   - procesados 248, válidos 248, sin resolver 0, errores 0;
   - nueva generación creada en estado `certified`, con su ID;
   - 248 filas shadow en esa generación, todas de los 248 IDs;
   - 0 productos fuera de los 248 escritos;
   - release activo sin cambio; precios activos de los 155 CDO idénticos;
   - catálogo público y visibilidad sin cambios.
5. **Reporte** en el formato pedido y STOP.

## Qué no se hace

No publicar la generación, no tocar releases, visibilidad, productos, mappings, categorías, imágenes ni reglas de precio, no recálculo global, no código ni migraciones.

## Si algo falla

Si hay errores, sin resolver o un número distinto de 248: reportar PARTIAL/FAIL y detenerse sin reintentar ni corregir. Las filas shadow no afectan el catálogo público.
