# Rollback — Sub-Build B (Edge Function recompute-catalog-price-cache-v2)

Alcance estrictamente limitado. **No** elimina tablas shadow, **no** toca la caché
pública, **no** modifica rule sets, **no** elimina datos de proveedores.

## 1. Desactivar / eliminar la Edge Function

Eliminar el directorio y re-desplegar:

```
rm -rf supabase/functions/recompute-catalog-price-cache-v2
```

(o solicitar la eliminación de la función desplegada `recompute-catalog-price-cache-v2`).

Efecto: la ruta deja de existir. Ningún dato se ve afectado.

## 2. Eliminar únicamente la generación dry_run creada por esta ejecución

Identificada exclusivamente por su `idempotency_key`:

```sql
-- Verificación previa: debe devolver 0 filas shadow (dry_run nunca escribe shadow)
SELECT count(*) AS shadow_rows
FROM public.catalog_price_cache_v2_shadow s
JOIN public.catalog_price_cache_v2_generations g ON g.id = s.generation_id
WHERE g.idempotency_key = 'dryrun-2026-08-03-subbuild-b-01';

-- Borrado acotado
DELETE FROM public.catalog_price_cache_v2_generations
WHERE idempotency_key = 'dryrun-2026-08-03-subbuild-b-01'
  AND mode = 'dry_run';
```

Si la verificación previa devuelve > 0, **no ejecutar el DELETE** y reportar.

## 3. Lo que este rollback NO hace

- No hace `DROP` de `catalog_price_cache_v2_shadow` ni de `catalog_price_cache_v2_generations`.
- No borra otras generaciones (certificadas o no).
- No modifica `catalog_price_cache`, `productos_publicos`, `catalog_search_products`.
- No cambia `pricing_rule_sets` (el draft `2026-01-v2-draft` sigue inactivo).
