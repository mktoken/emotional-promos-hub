## Cambio

Reemplazar el `order("updated_at", ...)` en `src/components/CatalogView.tsx` por orden ascendente de `precio_desde_mxn` con nulls al final, manteniendo paginación y filtros.

### Edición única en `src/components/CatalogView.tsx`

En `fetchPage`, cambiar:

```ts
q = q.order("updated_at", { ascending: false }).range(from, to);
```

por:

```ts
q = q
  .order("precio_desde_mxn", { ascending: true, nullsFirst: false })
  .order("id", { ascending: true }) // desempate estable para paginación
  .range(from, to);
```

### Por qué

- `nullsFirst: false` deja precios null al final (soportado por PostgREST/Supabase).
- Añadir `order("id", ...)` como segundo criterio evita que productos con el mismo `precio_desde_mxn` "salten" entre páginas al usar Cargar más.
- El orden se aplica dentro de `fetchPage`, así que aplica automáticamente a: búsqueda, filtro por categoría, filtro Ecológicos y páginas siguientes.
- No se filtran precios 0/null (no hay lógica previa `price_status`); simplemente quedan al final vía `nullsFirst: false`. Los precios 0, si existieran, aparecerán primero por definición aritmética — no se cambia esa semántica porque no se pidió filtrarlos, solo no ponerlos antes de precios reales; si aparecen 0 antes de precios reales en Preview, se evalúa un filtro `.gt("precio_desde_mxn", 0)` como follow-up.

### No se toca

- Categorías consolidadas, colección Ecológicos, exclusión G4 (ya vacía), lazy loading, ProductDetail, cotizador, impresión, PDF, Edge Functions, SQL, RLS.

### Validación

- `tsgo --noEmit`
- `bun run build`
- No publicar.
