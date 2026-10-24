-- PE ForPromotional atomic activation package
-- Creates an independent candidate by cloning the entire currently published
-- Pricing V2 generation. Public release pointer and live provider data remain
-- unchanged. Returns the candidate_id required by the v2 shadow sync.

BEGIN;

DO $prepare$
DECLARE
  v_provider_id uuid;
  v_base_generation_id uuid;
  v_rule_set_id uuid;
  v_generation_id uuid := gen_random_uuid();
  v_candidate_id uuid := gen_random_uuid();
  v_source_count integer;
  v_current_release_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pe_forpromotional_atomic_activation_v1', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog_price_v2_release_pointer', 0));

  IF to_regclass('public.forpromotional_atomic_candidates') IS NULL THEN
    RAISE EXCEPTION 'Atomic staging is not installed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.forpromotional_atomic_candidates
    WHERE status IN ('building','certified')
  ) THEN
    RAISE EXCEPTION 'An unfinished atomic candidate already exists';
  END IF;

  SELECT p.id
  INTO v_provider_id
  FROM public.proveedores AS p
  WHERE p.code = 'forpromotional';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ForPromotional provider is missing';
  END IF;

  SELECT count(*)::integer
  INTO v_current_release_count
  FROM public.catalog_price_v2_releases
  WHERE is_current = true;
  IF v_current_release_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one current Pricing V2 release is required; found %', v_current_release_count;
  END IF;

  SELECT r.generation_id, g.rule_set_id
  INTO v_base_generation_id, v_rule_set_id
  FROM public.catalog_price_v2_releases AS r
  JOIN public.catalog_price_cache_v2_generations AS g ON g.id = r.generation_id
  WHERE r.is_current = true
  FOR UPDATE OF r, g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exactly one current Pricing V2 release is required';
  END IF;

  SELECT count(*)::integer
  INTO v_source_count
  FROM public.catalog_price_cache_v2_shadow
  WHERE generation_id = v_base_generation_id;
  IF v_source_count <= 0 THEN
    RAISE EXCEPTION 'Current generation has no shadow rows';
  END IF;

  INSERT INTO public.catalog_price_cache_v2_generations (
    id, idempotency_key, mode, status, rule_set_id,
    candidate_count, processed_count, priced_count,
    request_quote_count, unavailable_count, error_count, unresolved_count,
    started_at
  ) VALUES (
    v_generation_id,
    'forpromotional-atomic-' || v_candidate_id::text,
    'shadow_write',
    'running',
    v_rule_set_id,
    v_source_count,
    0, 0, 0, 0, 0, 0,
    now()
  );

  INSERT INTO public.catalog_price_cache_v2_shadow (
    generation_id, product_id, rule_set_id, public_price_status,
    price_before_tax_mxn, currency, minimum_quantity, computed_at,
    calculation_version
  )
  SELECT
    v_generation_id, s.product_id, s.rule_set_id, s.public_price_status,
    s.price_before_tax_mxn, s.currency, s.minimum_quantity, s.computed_at,
    s.calculation_version
  FROM public.catalog_price_cache_v2_shadow AS s
  WHERE s.generation_id = v_base_generation_id;

  IF (SELECT count(*) FROM public.catalog_price_cache_v2_shadow WHERE generation_id = v_generation_id)
     <> v_source_count THEN
    RAISE EXCEPTION 'Candidate generation clone is incomplete';
  END IF;

  INSERT INTO public.forpromotional_atomic_candidates (
    id, status, provider_id, base_generation_id, catalog_generation_id,
    rule_set_id, factor, api_complete, validation_report
  ) VALUES (
    v_candidate_id, 'building', v_provider_id, v_base_generation_id,
    v_generation_id, v_rule_set_id, 1.0000, false,
    jsonb_build_object('source_rows', v_source_count)
  );
END
$prepare$;

COMMIT;

SELECT
  id AS candidate_id,
  base_generation_id,
  catalog_generation_id,
  rule_set_id,
  status,
  api_complete
FROM public.forpromotional_atomic_candidates
WHERE status = 'building';
