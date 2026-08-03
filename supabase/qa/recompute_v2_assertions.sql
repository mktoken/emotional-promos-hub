-- ============================================================================
-- ASSERTIONS READ-ONLY — Sub-Build B (dry_run Shadow V2)
-- Ejecutar tal cual. Cero escrituras.
-- Reemplazar :KEY por la idempotency_key del dry_run ejecutado.
-- ============================================================================

\set KEY 'dryrun-2026-08-03-subbuild-b-01'

-- A1. La generación dry_run existe, está completed y cuadra internamente.
SELECT
  id                AS generation_id,
  mode,
  status,
  candidate_count,
  processed_count,
  priced_count,
  request_quote_count,
  unavailable_count,
  error_count,
  unresolved_count,
  (processed_count = candidate_count)                                        AS processed_ok,
  (priced_count + request_quote_count + unavailable_count = candidate_count) AS status_sum_ok,
  (error_count = 0 AND unresolved_count = 0)                                 AS clean_ok,
  (mode = 'dry_run' AND status = 'completed')                                AS mode_status_ok
FROM public.catalog_price_cache_v2_generations
WHERE idempotency_key = :'KEY';

-- A2. dry_run NO escribió ninguna fila shadow (debe ser 0).
SELECT count(*) AS shadow_rows_for_generation
FROM public.catalog_price_cache_v2_shadow s
JOIN public.catalog_price_cache_v2_generations g ON g.id = s.generation_id
WHERE g.idempotency_key = :'KEY';

-- A3. La tabla shadow completa sigue vacía (0 filas nuevas en el proyecto).
SELECT count(*) AS shadow_rows_total FROM public.catalog_price_cache_v2_shadow;

-- A4. V2 continúa inactivo: exactamente un rule set activo y es el legacy.
SELECT version, is_active
FROM public.pricing_rule_sets
ORDER BY is_active DESC, version;

-- A5. Caché pública sin cambios estructurales ni de volumen esperado.
SELECT
  count(*)                                    AS cache_rows,
  count(*) FILTER (WHERE price_status='valid') AS cache_valid,
  max(updated_at)                              AS cache_last_update
FROM public.catalog_price_cache;

-- A6. Universo de candidatos usado por la función (debe igualar candidate_count).
SELECT count(DISTINCT producto_b2b_id) AS candidate_universe
FROM public.catalog_price_cache
WHERE producto_b2b_id IS NOT NULL;

-- A7. No existen otras generaciones running (concurrencia liberada).
SELECT mode, status, count(*)
FROM public.catalog_price_cache_v2_generations
GROUP BY mode, status
ORDER BY mode, status;
