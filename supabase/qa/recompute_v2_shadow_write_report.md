# Reporte — Sub-Build B — Recompute Shadow V2 (`shadow_write`)

Fecha: 2026-08-02  
Commit de evidencia previo: `ef1cb1a`  
Función: `supabase/functions/recompute-catalog-price-cache-v2`  
Modo ejecutado: `shadow_write`  
Estado final: `certified`

## 1. Objetivo

Ejecutar una única generación en modo `shadow_write` utilizando la Edge Function existente:

```text
recompute-catalog-price-cache-v2
```

La ejecución debía:

- procesar el universo completo de productos;
- escribir únicamente en la tabla shadow y en la tabla de generaciones;
- mantener V2 inactivo;
- conservar intacta la caché pública;
- verificar idempotencia;
- detenerse sin cutover y sin Publish.

## 2. Restricciones aplicadas

No se autorizaron:

- cambios de código;
- migraciones;
- modificaciones de frontend;
- activación de V2;
- cambios en `catalog_price_cache`;
- cambios en `pricing_rule_sets`;
- cambios en `productos_publicos`;
- cambios en `catalog_search_products`;
- Publish.

Las únicas escrituras autorizadas fueron:

1. Crear y actualizar la generación en:

```text
catalog_price_cache_v2_generations
```

2. Insertar o actualizar los resultados de esa generación en:

```text
catalog_price_cache_v2_shadow
```

## 3. Prechequeos

Todos los prechequeos fueron ejecutados en modo solo lectura.

| Comprobación | Resultado |
|---|---:|
| Generaciones en estado `running` | 0 |
| `idempotency_key` existente | No |
| Filas shadow antes de ejecutar | 0 |
| Candidatos en `catalog_price_cache` | 1524 |
| Productos distintos | 1524 |
| Duplicados en el universo | 0 |
| Rule sets activos | 1 |
| `2026-01-v2-draft` | Inactivo |
| Cambios pendientes en la función | No reportados |

Resultado de prechequeos:

```text
PASS
```

## 4. Identificación de la ejecución

| Campo | Valor |
|---|---|
| Función | `recompute-catalog-price-cache-v2` |
| Estado de la función | Preexistente y ya desplegada |
| Cambios de código | Ninguno |
| Modo | `shadow_write` |
| `idempotency_key` | `shadowwrite-2026-08-02-v2-01` |
| `generation_id` | `45c79265-77bc-416b-b6e0-96d2b37a6e1c` |
| Estado final | `certified` |
| `batch_size` | 100 |

Payload inicial:

```json
{
  "mode": "shadow_write",
  "idempotency_key": "shadowwrite-2026-08-02-v2-01",
  "batch_size": 100,
  "cursor": null
}
```

Las reinvocaciones utilizaron:

- la misma `idempotency_key`;
- el mismo `batch_size`;
- únicamente el `next_cursor` devuelto por la llamada anterior.

No se creó otra generación.

## 5. Contadores finales

| Campo | Valor |
|---|---:|
| `candidate_count` | 1524 |
| `processed_count` | 1524 |
| `priced_count` | 1505 |
| `request_quote_count` | 19 |
| `unavailable_count` | 0 |
| `error_count` | 0 |
| `unresolved_count` | 0 |

Cuadre certificado:

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

## 6. Resultados en shadow

| Comprobación | Resultado |
|---|---:|
| Filas shadow de la generación | 1524 |
| Productos distintos | 1524 |
| Duplicados por producto | 0 |
| Filas con otro rule set | 0 |

Todas las filas pertenecen al rule set:

```text
2026-01-v2-draft
```

## 7. Integridad de precio y MOQ

Para filas con estado `priced` se verificó:

- precio público mayor que cero;
- `minimum_quantity` mayor que cero.

Violaciones encontradas:

```text
0
```

Para filas con estado `request_quote` o `unavailable` se verificó:

- precio público `NULL`.

Violaciones encontradas:

```text
0
```

Resultado de integridad:

```text
PASS
```

## 8. Idempotencia

Después de completar la generación se realizó una única reinvocación con la misma:

```text
idempotency_key = shadowwrite-2026-08-02-v2-01
```

Resultado:

- `reused = true`;
- misma `generation_id`;
- no se creó una segunda generación;
- shadow permaneció con 1524 filas;
- no aparecieron duplicados;
- no se reprocesó con una key nueva.

Resultado de idempotencia:

```text
PASS
```

## 9. Assertions

### A1 — Generación y cuadre interno

```text
PASS
```

La generación terminó en estado `certified` con:

- `processed_count = candidate_count`;
- `error_count = 0`;
- `unresolved_count = 0`;
- suma de estados igual al universo.

### A3 — Shadow total

```text
PASS
```

Filas totales en:

```text
catalog_price_cache_v2_shadow
```

Resultado:

```text
1524
```

Todas corresponden a esta generación certificada.

### A4 — Rule sets

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

```text
PASS
```

`catalog_price_cache` permanece con:

```text
1524 filas
```

Última actualización observada:

```text
2026-07-18
```

La fecha es anterior al `shadow_write`, por lo que la caché pública no fue modificada por esta ejecución.

También se confirmó que:

- `productos_publicos` no cambió;
- `catalog_search_products` no cambió.

### A6 — Universo de candidatos

```text
PASS
```

Universo:

```text
1524
```

`candidate_count`:

```text
1524
```

Ambos valores coinciden.

### A7 — Generaciones y concurrencia

```text
PASS
```

Generaciones en estado `running`:

```text
0
```

Generaciones totales después de esta ejecución:

```text
2
```

Corresponden a:

1. generación `dry_run`;
2. generación `shadow_write`.

No se duplicó trabajo.

## 10. Gates de certificación

| Gate | Resultado |
|---|---|
| Estado final `certified` | PASS |
| `candidate_count = 1524` | PASS |
| `processed_count = 1524` | PASS |
| `priced_count = 1505` | PASS |
| `request_quote_count = 19` | PASS |
| `unavailable_count = 0` | PASS |
| `error_count = 0` | PASS |
| `unresolved_count = 0` | PASS |
| Suma de estados = 1524 | PASS |
| Filas shadow = 1524 | PASS |
| Productos distintos = 1524 | PASS |
| Duplicados = 0 | PASS |
| Integridad de precio y MOQ | PASS |
| Rule set correcto en todas las filas | PASS |
| `2026-01-v2-draft` inactivo | PASS |
| Exactamente un rule set activo | PASS |
| Caché pública intacta | PASS |
| Idempotencia | PASS |
| Sin activación de V2 | PASS |
| Sin cutover | PASS |
| Sin Publish | PASS |

Resultado global:

```text
TODOS LOS GATES PASS
```

## 11. Alcance de escritura confirmado

Las únicas escrituras realizadas fueron:

- creación y actualización de la generación en `catalog_price_cache_v2_generations`;
- creación o actualización de 1524 filas en `catalog_price_cache_v2_shadow`.

No se realizaron escrituras en:

- `catalog_price_cache`;
- `pricing_rule_sets`;
- `productos_publicos`;
- `catalog_search_products`;
- otras tablas de negocio.

## 12. Estado final del sistema

| Componente | Estado |
|---|---|
| Edge Function | Desplegada |
| Generación shadow | `certified` |
| Filas shadow | 1524 |
| Productos distintos | 1524 |
| Duplicados | 0 |
| Caché pública | Intacta |
| Rule set legacy `2026-01` | Activo |
| Rule set `2026-01-v2-draft` | Inactivo |
| V2 | No activado |
| Cutover | No ejecutado |
| Frontend | Sin cambios |
| Publish | No realizado |

## 13. Resultado final

El `shadow_write` del Sub-Build B queda certificado:

- 1524 candidatos procesados.
- 1505 productos con precio.
- 19 productos en solicitud de cotización.
- 0 productos no disponibles.
- 0 errores.
- 0 productos sin resolver.
- 1524 filas shadow.
- 1524 productos distintos.
- 0 duplicados.
- Integridad de precio y MOQ: PASS.
- Idempotencia: PASS.
- Caché pública intacta.
- V2 continúa inactivo.
- No se ejecutó cutover.
- No se realizó Publish.

El proceso se detuvo después de completar y certificar el `shadow_write`.
