-- PE ForPromotional atomic activation package
-- Manual entry point for the canonical candidate-scoped rollback RPC installed
-- by 16. It restores the values captured immediately before activation.

BEGIN;

DO $rollback_candidate$
DECLARE
  v_candidate_id uuid;
  v_candidate_count integer;
BEGIN
  SELECT count(*)::integer
  INTO v_candidate_count
  FROM public.forpromotional_atomic_candidates
  WHERE status = 'active';

  IF v_candidate_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one active ForPromotional candidate is required; found %',
      v_candidate_count;
  END IF;

  SELECT id INTO v_candidate_id
  FROM public.forpromotional_atomic_candidates
  WHERE status = 'active';

  PERFORM public.pe_forpromotional_cycle_rollback_v1(v_candidate_id);
END
$rollback_candidate$;

COMMIT;

SELECT c.id AS candidate_id, c.status AS candidate_status,
       r.generation_id, r.is_current,
       f.enabled AS policy_enabled, rule.cost_factor AS forpromotional_factor
FROM public.forpromotional_atomic_candidates AS c
JOIN public.catalog_price_v2_releases AS r
  ON r.generation_id = c.base_generation_id AND r.is_current
JOIN public.pricing_policy_flags AS f
  ON f.policy_key = 'forpromotional_continuous_v1'
JOIN public.provider_pricing_rules AS rule
  ON rule.rule_set_id = c.rule_set_id AND rule.provider_code = 'forpromotional'
WHERE c.status = 'rolled_back';
