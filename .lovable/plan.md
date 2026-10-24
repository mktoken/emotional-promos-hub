# Verificación final — Precios ForPromotional (resultado solo lectura)

Consulta: 2026-10-24 06:30 UTC, API privada ForPromotional, 7 claves. Sin cambios en código, base de datos, precios ni inventarios.

## Valores reales de la API

| Producto | id_articulo | precio | precio_desc | opc_promo | opc_unico | desc_promo | producto_promocion | inventario (variantes) |
|---|---|---|---|---|---|---|---|---|
| WAATI | AG 003 | 76.50 | 57.38 | N | N | 0 | NO | Gris 6,502 / Negro 10,894 |
| ALBORA | AL 25115 | 10.10 | 7.58 | N | N | 0 | NO | Negro 19,046 |
| MISO | T 215 | 21.46 | 11.80 | S | N | 45 | SI | 8 colores (p. ej. Negro 66,272; Morado 1,679) |
| IBIZA | T 68P | 53.20 | 26.60 | S | N | 50 | SI | Amarillo 3,776 |
| KÁPHE | T 162 ALEBRIJE (la clave "T 162" sola no existe) | 360.00 | 144.00 | S | N | 60 | SI | Negro 19 |
| TARO | T 326 | 19.15 | 14.36 | N | S | 25 | NO | 6 colores (p. ej. Negro 54,043) |
| SPARK | T 131 | 18.11 | 13.58 | N | S | 25 | NO | 13 colores (p. ej. Azul 108,540; Azul sólido 5) |

No existe el campo `descuento_promocion`; el equivalente es `desc_promo` (%).

## Costo efectivo de compra

| Producto | Modalidad API | Lista | Especial | Costo a usar | Lo que usa hoy el sincronizador |
|---|---|---|---|---|---|
| WAATI | Normal | 76.50 | 57.38 | 57.38 | 76.50 (error, +33%) |
| ALBORA | Normal | 10.10 | 7.58 | 7.58 | 10.10 (error, +33%) |
| MISO | Promoción | 21.46 | 11.80 | 11.80 | 11.80 OK |
| IBIZA | Promoción | 53.20 | 26.60 | 26.60 | 26.60 OK |
| KÁPHE | Promoción | 360.00 | 144.00 | 144.00 | 144.00 OK |
| TARO | Precio único | 19.15 | 14.36 | 14.36 | 14.36 OK |
| SPARK | Precio único | 18.11 | 13.58 | 13.58 | 13.58 OK |

Comparación con el Excel del 24 de octubre: NO COMPROBADA — el Excel no se adjuntó. El caso confirmado en el pedido es ALBORA ($7.57).

## ALBORA: $10.10 → $7.57 vs $7.58

10.10 × 0.75 = 7.575 exacto. La API redondea al centavo hacia arriba (7.58). El Excel muestra 7.57, que corresponde a truncar o a redondeo con error de coma flotante (7.574999…). Diferencia: $0.01 por pieza. Recomendación: usar `precio_desc` tal como lo entrega la API (fuente oficial), no recalcular.

## Detección de promociones

La API no entrega fechas de inicio ni fin. Solo permite detectarlas por comparación entre consultas: `opc_promo` / `producto_promocion` cambian a S/SI y `precio_desc` / `desc_promo` cambian. El sincronizador sí lo detecta automáticamente en cada corrida, pero no puede anticipar vigencias.

## Hallazgo bloqueante

Para productos Normales la API ya entrega en `precio_desc` el precio de lista −25%, pero el sincronizador actual usa `precio` (lista completa). Todos los productos Normales de ForPromotional quedan con costo ~33% más alto de lo real.

## Regla correcta para el sincronizador (sin Excel)

```text
si opc_unico = S  -> costo = precio_desc   (precio único)
si opc_promo = S  -> costo = precio_desc   (promoción)
si no             -> costo = precio_desc   (normal, ya trae -25%)
respaldo: si precio_desc vacío o <= 0 -> costo = redondear(precio × 0.75, 2)
si precio_desc > precio -> revisión manual
```

## Cambio propuesto (requiere autorización explícita, no incluido en esta verificación)

1. Ajustar solo la regla de selección de precio de `sync-forpromotional-products` para la modalidad Normal.
2. Agregar prueba con los 7 casos anteriores.
3. Desplegar solo esa función, luego recálculo Pricing V2 dirigido a ForPromotional en dry-run antes de cualquier escritura.
