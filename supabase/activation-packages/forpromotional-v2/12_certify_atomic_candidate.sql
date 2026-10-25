-- PE ForPromotional atomic activation package
-- Manual entry point for the canonical certification RPC installed by 16.
-- This wrapper contains no duplicate certification rules.

BEGIN;

DO $certify_candidate$
DECLARE
  v_candidate_id uuid;
  v_candidate_count integer;
BEGIN
  SELECT count(*)::integer
  INTO v_candidate_count
  FROM public.forpromotional_atomic_candidates
  WHERE status = 'building';

  IF v_candidate_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one building ForPromotional candidate is required; found %',
      v_candidate_count;
  END IF;

  SELECT id INTO v_candidate_id
  FROM public.forpromotional_atomic_candidates
  WHERE status = 'building';

  PERFORM public.pe_forpromotional_cycle_certify_v1(v_candidate_id);
END
$certify_candidate$;

COMMIT;

SELECT id AS candidate_id, status, api_complete, certified_at,
       base_generation_id, catalog_generation_id, validation_report
FROM public.forpromotional_atomic_candidates
WHERE status = 'certified';
