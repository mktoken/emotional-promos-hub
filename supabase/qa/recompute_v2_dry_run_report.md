# Reporte — Sub-Build B — Recompute Shadow V2 (`dry_run`)

Fecha: 2026-08-02  
Commit probado: `1d0a131`  
Función: `supabase/functions/recompute-catalog-price-cache-v2`  
Modo implementado: `dry_run` + `shadow_write`  
Modo autorizado y ejecutado en esta certificación: únicamente `dry_run`

## 1. Contrato de entrada

La Edge Function valida el payload con Zod y `.strict()`.

```json
{
  "mode": "dry_run | shadow_write",
  "idempotency_key": "string (8..200)",
  "batch_size": "int 25..500 (default 200, opcional)",
  "cursor": "uuid | null (opcional)"
}
```

Se rechazan explícitamente campos no autorizados, incluidos:

- `rule_set_id`
- `product_ids`
- `status`
- conteos
- precios
- `minimum_quantity`
- `generation_id`
- proveedor
- rol

Cualquier campo desconocido produce:

```text
400 invalid_payload
```

El cliente no puede seleccionar el rule set, definir el universo de productos, proporcionar conteos ni determinar estados o precios.

## 2. Autoridad de negocio

La única fuente de cálculo de precio es:

```sql
public.calculate_product_price_v2(product_id, qty, rule_set_id)
```

La Edge Function no replica en TypeScript:

- multiplicadores;
- niveles;
- costos;
- MOQ;
- reglas G4;
- reglas CDO;
- reglas ForPromotional;
- cálculo de precio público.

La función SQL de precios no fue modificada durante este Sub-Build.

El rule set se resuelve exclusivamente en servidor con:

```text
version = '2026-01-v2-draft'
is_active = false
```

Debe existir exactamente un rule set que cumpla esas condiciones.

Si no existe exactamente uno, la ejecución se detiene con:

```text
409 draft_rule_set_not_unique
```

## 3. Universo de candidatos

El universo se obtiene desde:

```text
public.catalog_price_cache
```

Solo se consideran filas con `producto_b2b_id` no nulo.

El prechequeo previo a la ejecución confirmó:

| Comprobación | Resultado |
|---|---:|
| Filas de `catalog_price_cache` | 1524 |
| Filas con `producto_b2b_id` no nulo | 1524 |
| `producto_b2b_id` distintos | 1524 |
| Duplicados | 0 |

Por lo tanto, el universo certificado para esta ejecución fue de 1524 productos únicos.

El cliente no puede modificar ni reducir este universo.

## 4. Autorización utilizada

La Edge Function requiere autenticación.

Controles implementados:

- JWT obligatorio.
- Requests anónimos rechazados.
- Validación del usuario autenticado.
- Verificación de permisos staff mediante el mecanismo existente del proyecto.
- El usuario utilizado para la ejecución fue verificado como:
  - autenticado;
  - rol `admin`;
  - `is_staff = true`.
- CORS restringido mediante lista de orígenes permitidos.
- No se utilizó `service_role` en el navegador.
- No se expusieron JWT, access tokens, refresh tokens, cookies ni headers `Authorization`.

La sesión staff fue inyectada desde el Preview del CRM de Lovable.

## 5. Flujo por producto

Para cada producto candidato se ejecuta inicialmente:

```sql
public.calculate_product_price_v2(
  product_id,
  250,
  draft_rule_set_id
)
```

### Resolución de MOQ

Cuando la respuesta inicial contiene:

```text
status = below_minimum
minimum_quantity > 0
```

la función vuelve a calcular el precio utilizando:

```text
qty = minimum_quantity
```

### Mapeo de estados

| Estado de `calculate_product_price_v2` | Estado persistible |
|---|---|
| `valid` | `priced` |
| `manual_review` | `request_quote` |
| `request_quote` | `request_quote` |
| `unavailable` | `unavailable` |
| Cualquier otro estado | `unresolved` |

Los estados desconocidos o no resueltos son bloqueantes para la certificación.

### Validaciones del resultado

Para `priced` se exige:

- precio público mayor que cero;
- MOQ mayor que cero.

Para `request_quote` y `unavailable` se exige:

- precio público `NULL`.

### Datos que no se persisten

La función no guarda en shadow ni en generaciones:

- costo unitario;
- multiplicador;
- margen;
- `provider_code`;
- `source_oferta_id`;
- warnings internos;
- payloads externos;
- credenciales;
- datos sensibles innecesarios.

## 6. Idempotencia, reanudación, concurrencia y logs

### Idempotencia

`idempotency_key` es única en:

```text
catalog_price_cache_v2_generations
```

La ejecución certificada utilizó:

```text
dryrun-2026-08-02-subbuild-b-01
```

No se creó una segunda generación para la misma ejecución.

### Reanudación

El progreso se guarda después de cada lote.

La función admite reanudación mediante:

```text
cursor
```

El cursor corresponde al UUID del último producto procesado.

Cuando queda trabajo, la función devuelve:

```text
next_cursor
```

Las reinvocaciones deben conservar:

- la misma `idempotency_key`;
- el mismo modo;
- el mismo `batch_size`;
- únicamente el cursor devuelto por la invocación anterior.

### Procesamiento por lotes

La ejecución certificada utilizó:

```text
batch_size = 100
```

La función evita mantener una transacción abierta durante todo el universo.

El presupuesto de ejecución por invocación es limitado y permite continuar mediante cursor cuando queda trabajo.

### Logs

Los logs se limitan a información operativa, incluida:

- `request_id`;
- `generation_id`;
- modo;
- lote;
- cursor;
- conteos;
- duración;
- resultado;
- error sanitizado.

No se registran:

- JWT;
- headers `Authorization`;
- `service_role`;
- contraseñas;
- cookies;
- costos;
- multiplicadores;
- PII innecesaria.

## 7. Criterios de certificación

Una generación solo se considera correctamente completada cuando se cumplen todos los siguientes criterios:

```text
processed_count = candidate_count
error_count = 0
unresolved_count = 0
priced_count + request_quote_count + unavailable_count = candidate_count
```

En modo `dry_run`:

- se procesan todos los productos;
- se calculan y validan los resultados;
- no se insertan filas en `catalog_price_cache_v2_shadow`;
- el estado final correcto es `completed`.

## 8. Resultados de pruebas locales

Archivo probado:

```text
supabase/functions/recompute-catalog-price-cache-v2/index.test.ts
```

Resultado:

```text
15 passed
0 failed
```

También se ejecutó `deno check` sobre:

```text
supabase/functions/recompute-catalog-price-cache-v2/logic.ts
supabase/functions/recompute-catalog-price-cache-v2/index.ts
```

Resultado:

```text
Type check: 0
```

Las pruebas cubrieron:

- payload inválido;
- campos desconocidos;
- `batch_size` fuera de rango;
- cursor válido;
- retry por MOQ;
- mapeo de `valid`;
- mapeo de `manual_review`;
- mapeo de `request_quote`;
- mapeo de `unavailable`;
- precio `NULL` para estados sin precio;
- precio positivo obligatorio para `priced`;
- bloqueo por errores;
- bloqueo por `unresolved`;
- sanitización de logs;
- request sin JWT;
- JWT sin permisos suficientes.

Las verificaciones de estado de base de datos se realizaron con:

```text
supabase/qa/recompute_v2_assertions.sql
```

## 9. Prechequeos antes del `dry_run`

Todos los prechequeos fueron ejecutados en modo solo lectura.

| Comprobación | Resultado |
|---|---:|
| Generaciones en estado `running` | 0 |
| Idempotency key existente | No |
| Candidatos | 1524 |
| Productos distintos | 1524 |
| Duplicados | 0 |
| `catalog_price_cache_v2_shadow` | 0 filas |
| Rule sets activos | 1 |
| `2026-01-v2-draft` | Inactivo |

Todos los prechequeos resultaron:

```text
PASS
```

## 10. Ejecución certificada del `dry_run`

### Identificación

| Campo | Valor |
|---|---|
| Fecha | `2026-08-02` |
| Commit probado | `1d0a131` |
| Función | `recompute-catalog-price-cache-v2` |
| Estado de despliegue | Desplegada desde el código existente |
| Cambios de código durante el despliegue | Ninguno |
| Modo | `dry_run` |
| `idempotency_key` | `dryrun-2026-08-02-subbuild-b-01` |
| `generation_id` | `d8cfbb76-db89-40bc-93bb-137244d92209` |
| Estado final | `completed` |

### Payload inicial

```json
{
  "mode": "dry_run",
  "idempotency_key": "dryrun-2026-08-02-subbuild-b-01",
  "batch_size": 100,
  "cursor": null
}
```

Las siguientes invocaciones utilizaron la misma `idempotency_key` y el `next_cursor` devuelto por la ejecución anterior.

No se creó otra generación.

## 11. Contadores finales

| Campo | Valor |
|---|---:|
| `candidate_count` | 1524 |
| `processed_count` | 1524 |
| `priced_count` | 1505 |
| `request_quote_count` | 19 |
| `unavailable_count` | 0 |
| `error_count` | 0 |
| `unresolved_count` | 0 |

### Cuadre final

```text
processed_count = candidate_count
1524 = 1524
```

```text
priced_count + request_quote_count + unavailable_count
1505 + 19 + 0 = 1524
```

Resultado:

```text
PASS
```

No quedaron productos con errores ni estados sin resolver.

## 12. Productos recalculados por MOQ

La lógica de reintento por MOQ fue validada y utilizada cuando correspondía.

Sin embargo, el contador acumulado de productos recalculados mediante `minimum_quantity` no se persiste en:

```text
catalog_price_cache_v2_generations
```

El contador existe por invocación, pero no puede reconstruirse con certeza desde la fila final de la generación.

El baseline previo estimaba aproximadamente:

```text
120 productos resueltos por MOQ
```

Ese valor no se registra como resultado certificado porque no quedó persistido acumulativamente.

Esta limitación:

- no afecta los precios calculados;
- no afecta los estados finales;
- no afecta el cuadre de 1524 productos;
- no afecta los gates de certificación.

Queda registrada como deuda técnica de observabilidad.

## 13. Assertions A1–A7

### A1 — Generación y cuadre interno

Resultado:

```text
PASS
```

La generación existe y contiene:

- modo `dry_run`;
- estado `completed`;
- `processed_count = candidate_count`;
- `error_count = 0`;
- `unresolved_count = 0`;
- suma de estados igual al universo.

### A2 — Filas shadow de la generación

Resultado:

```text
PASS
```

Filas asociadas a esta generación en shadow:

```text
0
```

### A3 — Shadow total

Resultado:

```text
PASS
```

Estado final de:

```text
catalog_price_cache_v2_shadow
```

Filas:

```text
0
```

### A4 — Rule sets

Resultado:

```text
PASS
```

Estado verificado:

| Rule set | Estado |
|---|---|
| `2026-01` | Activo |
| `2026-01-v2-draft` | Inactivo |

Cantidad total de rule sets activos:

```text
1
```

### A5 — Caché pública

Resultado:

```text
PASS
```

`catalog_price_cache` permanece con:

```text
1524 filas
```

Estados `valid` registrados previamente:

```text
1506
```

Última actualización observada:

```text
2026-07-18
```

La fecha es anterior al `dry_run`, por lo que la caché pública no fue modificada por esta ejecución.

También se confirmó que:

- `productos_publicos` no cambió;
- `catalog_search_products` no cambió.

### A6 — Universo de candidatos

Resultado:

```text
PASS
```

Universo de candidatos:

```text
1524
```

`candidate_count` de la generación:

```text
1524
```

Ambos valores coinciden.

### A7 — Generaciones y concurrencia

Resultado:

```text
PASS
```

Generaciones en estado `running`:

```text
0
```

Total de generaciones creadas para esta certificación:

```text
1
```

No se duplicó el trabajo.

## 14. Gates de certificación

| Gate | Resultado |
|---|---|
| `status = completed` | PASS |
| `processed_count = candidate_count` | PASS |
| `error_count = 0` | PASS |
| `unresolved_count = 0` | PASS |
| Suma de estados = `candidate_count` | PASS |
| Shadow de la generación = 0 filas | PASS |
| Shadow total = 0 filas | PASS |
| `catalog_price_cache` intacta | PASS |
| `productos_publicos` sin cambios | PASS |
| `catalog_search_products` sin cambios | PASS |
| Exactamente un rule set activo | PASS |
| `2026-01-v2-draft` inactivo | PASS |
| Sin activación de V2 | PASS |
| Sin `shadow_write` | PASS |
| Sin Publish | PASS |

Resultado global:

```text
TODOS LOS GATES PASS
```

## 15. Alcance de escritura confirmado

La única escritura autorizada y realizada fue la creación y actualización de la fila correspondiente al `dry_run` en:

```text
catalog_price_cache_v2_generations
```

No se realizaron escrituras en:

- `catalog_price_cache_v2_shadow`;
- `catalog_price_cache`;
- `pricing_rule_sets`;
- `productos_publicos`;
- `catalog_search_products`;
- otras tablas de negocio.

## 16. Estado final del sistema

| Componente | Estado final |
|---|---|
| Edge Function | Desplegada |
| Generación | `completed` |
| Shadow | 0 filas |
| Caché pública | Intacta |
| Rule set legacy `2026-01` | Activo |
| Rule set `2026-01-v2-draft` | Inactivo |
| V2 | No activado |
| `shadow_write` | No ejecutado |
| Frontend | Sin cambios |
| Cutover | No ejecutado |
| Publish | No realizado |

## 17. Resultado final

El `dry_run` del Sub-Build B queda certificado con los siguientes resultados:

- 1524 candidatos procesados.
- 1505 productos con precio.
- 19 productos en solicitud de cotización.
- 0 productos no disponibles.
- 0 errores.
- 0 productos sin resolver.
- 0 filas shadow.
- Caché pública intacta.
- V2 inactivo.
- Assertions A1–A7: PASS.
- Todos los gates obligatorios: PASS.
- No se ejecutó `shadow_write`.
- No se realizó Publish.

El proceso se detuvo después de completar y certificar el `dry_run`.
