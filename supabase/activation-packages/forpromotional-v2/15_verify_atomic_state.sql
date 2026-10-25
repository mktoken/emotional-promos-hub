-- PE ForPromotional atomic activation package
-- Read-only post-check for the atomic path. Run after either 13 or 14 and
-- before any cron resume. It returns one compact JSON object and performs no
-- writes.

WITH current_release AS (
  SELECT r.id, r.generation_id, g.rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current
), candidate_state AS (
  SELECT c.id, c.status, c.base_generation_id, c.catalog_generation_id,
         c.api_complete, c.api_record_count, c.api_unique_variant_count,
         c.api_duplicate_record_count, c.api_source_fingerprint,
         c.validation_report
  FROM public.forpromotional_atomic_candidates AS c
  WHERE c.status IN ('active','rolled_back','certified')
), forpromo_rule AS (
  SELECT r.rule_set_id, r.cost_factor
  FROM public.provider_pricing_rules AS r
  JOIN current_release AS cr ON cr.rule_set_id = r.rule_set_id
  WHERE r.provider_code = 'forpromotional'
), g4_cdo_live AS (
  SELECT md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.provider_code, r.id)::text, '[]')) AS digest
  FROM public.provider_pricing_rules AS r
  JOIN current_release AS cr ON cr.rule_set_id = r.rule_set_id
  WHERE r.provider_code IN ('g4_mx','cdo_mx')
), g4_cdo_snapshot AS (
  SELECT md5(COALESCE(jsonb_agg(e.value ORDER BY e.value->>'provider_code', e.value->>'id')::text, '[]')) AS digest
  FROM public.pe_forpromotional_activation_backup_v1 AS b,
       jsonb_array_elements(b.rule_rows) AS e(value)
  WHERE b.backup_key = 'current'
    AND e.value->>'provider_code' IN ('g4_mx','cdo_mx')
), candidate_counts AS (
  SELECT c.id,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_cost_shadow AS st
          WHERE st.candidate_id = c.id) AS staged_cost_rows,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_exceptions AS ex
          WHERE ex.candidate_id = c.id) AS exceptions,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_variant_shadow AS v
          WHERE v.candidate_id = c.id) AS private_variants,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_variant_shadow AS v
          WHERE v.candidate_id = c.id
            AND v.publication_state IN ('unpublished','api_only')) AS unpublished_variants,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_local_absences AS a
          WHERE a.candidate_id = c.id) AS absent_local_offers,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_local_absences AS a
          WHERE a.candidate_id = c.id
            AND a.public_mapping_count > 0) AS public_absent_offers,
         (SELECT count(*)::integer
          FROM public.forpromotional_atomic_local_absences AS a
          WHERE a.candidate_id = c.id
            AND a.public_mapping_count > 0
            AND a.resolution_status = 'pending') AS pending_public_decisions,
         EXISTS (
           SELECT 1 FROM public.forpromotional_atomic_restore_meta AS rm
           WHERE rm.candidate_id = c.id
             AND rm.old_release_row IS NOT NULL
             AND rm.old_rule_row IS NOT NULL
             AND rm.old_policy_row IS NOT NULL
         ) AS exact_restore_meta
  FROM candidate_state AS c
)
SELECT jsonb_build_object(
  'current_release_count', (SELECT count(*) FROM current_release),
  'current_generation_id', (SELECT generation_id FROM current_release),
  'current_rule_set_id', (SELECT rule_set_id FROM current_release),
  'candidate', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'api_complete', c.api_complete,
      'api_records', c.api_record_count,
      'unique_variants', c.api_unique_variant_count,
      'duplicate_records', c.api_duplicate_record_count,
      'source_fingerprint', c.api_source_fingerprint,
      'base_generation_id', c.base_generation_id,
      'catalog_generation_id', c.catalog_generation_id,
      'staged_cost_rows', cc.staged_cost_rows,
      'private_variants', cc.private_variants,
      'unpublished_variants', cc.unpublished_variants,
      'absent_local_offers', cc.absent_local_offers,
      'public_absent_offers', cc.public_absent_offers,
      'pending_public_decisions', cc.pending_public_decisions,
      'exact_restore_meta', cc.exact_restore_meta,
      'exceptions', cc.exceptions,
      'validation_report', c.validation_report
    ) ORDER BY c.id)
    FROM candidate_state AS c
    JOIN candidate_counts AS cc ON cc.id = c.id
  ), '[]'::jsonb),
  'forpromotional', jsonb_build_object(
    'factor', (SELECT cost_factor FROM forpromo_rule),
    'policy_enabled', (SELECT enabled FROM public.pricing_policy_flags
                       WHERE policy_key = 'forpromotional_continuous_v1'),
    'active_cron', EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'catalog-stock-refresh-forpromotional' AND active
    ),
    'live_api_cost_rows', (
      SELECT count(*) FROM public.producto_precio_escalas AS s
      JOIN public.producto_proveedor_ofertas AS o ON o.id = s.oferta_id
      JOIN public.proveedores AS p ON p.id = o.proveedor_id
      WHERE p.code = 'forpromotional'
        AND s.source_field = 'forpromotional.api.precio_desc'
    )
  ),
  'g4_cdo_unchanged', (SELECT digest FROM g4_cdo_live)
                       IS NOT DISTINCT FROM (SELECT digest FROM g4_cdo_snapshot),
  'g4_cdo_live_digest', (SELECT digest FROM g4_cdo_live),
  'g4_cdo_snapshot_digest', (SELECT digest FROM g4_cdo_snapshot),
  'rollback_snapshot_present', EXISTS (
    SELECT 1 FROM public.pe_forpromotional_activation_backup_v1
    WHERE backup_key = 'current'
  )
) AS atomic_verification_report;
