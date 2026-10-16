# CHK-CATGOV-05I — G4 Dynamic Model Projection V2

Estado del paquete: preparado en repositorio; no aplicado al runtime.

## Decisión

La activación V1 queda superseded. No se requiere conocer ni crear 104
defaults persistidos para publicar la proyección de modelos.

- is_public_default permanece opcional y solo funciona como preferencia de merchandising.
- La identidad pública del modelo requiere memberships confirmadas y al menos una variante actualmente presente en public.productos_publicos.
- La disponibilidad no gobierna la identidad del modelo; solo participa en ranking del representante y en el estado de cada variante.
- La variante representante se deriva en runtime con prioridad: default existente válido; imagen válida con disponibilidad positiva; imagen válida; cualquier variante pública; SKU estable y luego product_id.
- Precio, stock, MOQ, SKU e imagen del detalle se leen de la misma variante seleccionada.
- No se modifican imágenes, stock, pricing, categorías, mapping, CDO ni ForPromotional.

## Alcance de V2

La migración valida 104 modelos y 289 memberships, aprueba únicamente esos estados
de governance y reemplaza las dos RPC públicas manteniendo sus firmas y columnas.
No aplica runtime en este checkpoint.

## Aplicación futura

Aplicar primero la migración V2 en el runtime autorizado y después ejecutar el
postcheck read-only versionado. Si el preflight no obtiene exactamente 104 modelos,
289 memberships o estados válidos, la migración debe fallar cerradamente.
