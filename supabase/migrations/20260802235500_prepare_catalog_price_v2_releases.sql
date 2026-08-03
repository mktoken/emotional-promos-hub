-- Prepara un puntero reversible para publicar una generación V2 certificada.
-- NO publica ninguna generación.
-- NO activa pricing_rule_sets.
-- NO modifica catalog_price_cache, productos_publicos ni el frontend.
-- La tabla catalog_price_v2_releases queda vacía al aplicar esta migración
-- por primera vez.

BEGIN;

-- ============================================================================
-- 1. Releases: puntero reversible a una generación shadow certificada
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.catalog_price_v2_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid,
  superseded_at timestamptz,
  superseded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_price_v2_releases_generation_id_key
    UNIQUE (generation_id),

  CONSTRAINT catalog_price_v2_releases_generation_id_fkey
    FOREIGN KEY (generation_id)
    REFERENCES public.catalog_price_cache_v2_generations(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CONSTRAINT catalog_price_v2_releases_current_requires_publication_check
    CHECK (
      NOT is_current
      OR (
        published_at IS NOT NULL
        AND published_by IS NOT NULL
        AND superseded_at IS NULL
        AND superseded_by IS NULL
      )
    ),

  CONSTRAINT catalog_price_v2_releases_superseded_pair_check
    CHECK (
      (superseded_at IS NULL AND superseded_by IS NULL)
      OR
      (superseded_at IS NOT NULL AND superseded_by IS NOT NULL)
    )
);

-- Verifica que una ejecución previa incompleta no haya dejado un contrato distinto.
DO $$
DECLARE
  v_columns text[];
BEGIN
  SELECT array_agg(
    format('%s:%s:%s', column_name, udt_name, is_nullable)
    ORDER BY ordinal_position
  )
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'catalog_price_v2_releases';

  IF v_columns IS DISTINCT FROM ARRAY[
    'id:uuid:NO',
    'generation_id:uuid:NO',
    'is_current:bool:NO',
    'published_at:timestamptz:YES',
    'published_by:uuid:YES',
    'superseded_at:timestamptz:YES',
    'superseded_by:uuid:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO'
  ]::text[] THEN
    RAISE EXCEPTION
      'catalog_price_v2_releases_schema_drift: columnas, tipos o nullability inesperados';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
  catalog_price_v2_releases_one_current_idx
ON public.catalog_price_v2_releases (is_current)
WHERE is_current;

CREATE INDEX IF NOT EXISTS
  catalog_price_v2_releases_created_at_idx
ON public.catalog_price_v2_releases (created_at DESC);

-- Crear el trigger de updated_at únicamente si no existe uno equivalente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS t
    JOIN pg_proc AS p
      ON p.oid = t.tgfoid
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE t.tgrelid = 'public.catalog_price_v2_releases'::regclass
      AND NOT t.tgisinternal
      AND p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER trg_catalog_price_v2_releases_updated_at
    BEFORE UPDATE ON public.catalog_price_v2_releases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

ALTER TABLE public.catalog_price_v2_releases
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_price_v2_releases
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.catalog_price_v2_releases
  TO service_role;

-- No se permiten policies directas. La autoridad es exclusivamente RPC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_v2_releases'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_v2_releases_must_have_zero_policies';
  END IF;
END;
$$;

COMMENT ON TABLE public.catalog_price_v2_releases IS
  'Puntero reversible a una generación V2 certificada. Escritura únicamente mediante RPC staff.';

-- ============================================================================
-- 2. Vista segura de la generación publicada
-- ============================================================================

CREATE OR REPLACE VIEW public.catalog_price_v2_current_prices
WITH (security_barrier = true)
AS
SELECT
  s.product_id,
  s.generation_id,
  s.rule_set_id,
  s.public_price_status,
  s.price_before_tax_mxn,
  s.currency,
  s.minimum_quantity,
  s.computed_at
FROM public.catalog_price_v2_releases AS r
JOIN public.catalog_price_cache_v2_shadow AS s
  ON s.generation_id = r.generation_id
WHERE r.is_current = true;

REVOKE ALL ON TABLE public.catalog_price_v2_current_prices
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.catalog_price_v2_current_prices
  TO anon, authenticated;

COMMENT ON VIEW public.catalog_price_v2_current_prices IS
  'Contrato público mínimo de la generación V2 actualmente publicada. Sin costos ni datos internos.';

-- ============================================================================
-- 3. Publicación transaccional de una generación certificada
-- ============================================================================

CREATE OR REPLACE FUNCTION public.publish_catalog_price_v2_generation(
  p_generation_id uuid
)
RETURNS TABLE (
  release_id uuid,
  generation_id uuid,
  is_current boolean,
  published_at timestamptz,
  reused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor uuid;
  v_generation public.catalog_price_cache_v2_generations%ROWTYPE;
  v_release_id uuid;
  v_published_at timestamptz;
  v_shadow_rows bigint;
  v_distinct_products bigint;
  v_priced_rows bigint;
  v_request_quote_rows bigint;
  v_unavailable_rows bigint;
  v_rule_set_mismatches bigint;
  v_contract_violations bigint;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL OR NOT public.is_staff(v_actor) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  IF p_generation_id IS NULL THEN
    RAISE EXCEPTION 'generation_id_required'
      USING ERRCODE = '22004';
  END IF;

  -- Serializa publish y rollback para impedir dos punteros concurrentes.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('catalog_price_v2_release_pointer', 0)
  );

  SELECT g.*
  INTO v_generation
  FROM public.catalog_price_cache_v2_generations AS g
  WHERE g.id = p_generation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'generation_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_generation.mode <> 'shadow_write' THEN
    RAISE EXCEPTION 'generation_mode_not_shadow_write'
      USING ERRCODE = '23514';
  END IF;

  IF v_generation.status <> 'certified' THEN
    RAISE EXCEPTION 'generation_not_certified'
      USING ERRCODE = '23514';
  END IF;

  IF v_generation.candidate_count <= 0
     OR v_generation.processed_count <> v_generation.candidate_count
     OR v_generation.error_count <> 0
     OR v_generation.unresolved_count <> 0
     OR (
       v_generation.priced_count
       + v_generation.request_quote_count
       + v_generation.unavailable_count
     ) <> v_generation.candidate_count
  THEN
    RAISE EXCEPTION 'generation_counters_not_certified'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    count(*),
    count(DISTINCT s.product_id),
    count(*) FILTER (WHERE s.public_price_status = 'priced'),
    count(*) FILTER (WHERE s.public_price_status = 'request_quote'),
    count(*) FILTER (WHERE s.public_price_status = 'unavailable'),
    count(*) FILTER (
      WHERE s.rule_set_id IS DISTINCT FROM v_generation.rule_set_id
    ),
    count(*) FILTER (
      WHERE
        (
          s.public_price_status = 'priced'
          AND (
            s.price_before_tax_mxn IS NULL
            OR s.price_before_tax_mxn <= 0
            OR s.minimum_quantity IS NULL
            OR s.minimum_quantity <= 0
          )
        )
        OR
        (
          s.public_price_status IN ('request_quote', 'unavailable')
          AND s.price_before_tax_mxn IS NOT NULL
        )
    )
  INTO
    v_shadow_rows,
    v_distinct_products,
    v_priced_rows,
    v_request_quote_rows,
    v_unavailable_rows,
    v_rule_set_mismatches,
    v_contract_violations
  FROM public.catalog_price_cache_v2_shadow AS s
  WHERE s.generation_id = p_generation_id;

  IF v_shadow_rows <> v_generation.candidate_count
     OR v_distinct_products <> v_generation.candidate_count
     OR v_priced_rows <> v_generation.priced_count
     OR v_request_quote_rows <> v_generation.request_quote_count
     OR v_unavailable_rows <> v_generation.unavailable_count
     OR v_rule_set_mismatches <> 0
     OR v_contract_violations <> 0
  THEN
    RAISE EXCEPTION 'shadow_generation_integrity_failed'
      USING ERRCODE = '23514';
  END IF;

  -- Idempotencia: si ya es la release actual, no vuelve a escribir.
  SELECT r.id, r.published_at
  INTO v_release_id, v_published_at
  FROM public.catalog_price_v2_releases AS r
  WHERE r.generation_id = p_generation_id
    AND r.is_current = true
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_release_id,
      p_generation_id,
      true,
      v_published_at,
      true;
    RETURN;
  END IF;

  -- Supersede el puntero anterior, si existe.
  UPDATE public.catalog_price_v2_releases AS r
  SET
    is_current = false,
    superseded_at = now(),
    superseded_by = v_actor
  WHERE r.is_current = true;

  -- Publica o vuelve a publicar la generación indicada.
  INSERT INTO public.catalog_price_v2_releases (
    generation_id,
    is_current,
    published_at,
    published_by,
    superseded_at,
    superseded_by
  )
  VALUES (
    p_generation_id,
    true,
    now(),
    v_actor,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT
    catalog_price_v2_releases_generation_id_key
  DO UPDATE SET
    is_current = true,
    published_at = EXCLUDED.published_at,
    published_by = EXCLUDED.published_by,
    superseded_at = NULL,
    superseded_by = NULL
  RETURNING
    id,
    catalog_price_v2_releases.published_at
  INTO
    v_release_id,
    v_published_at;

  RETURN QUERY
  SELECT
    v_release_id,
    p_generation_id,
    true,
    v_published_at,
    false;
END;
$function$;

REVOKE ALL ON FUNCTION
  public.publish_catalog_price_v2_generation(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.publish_catalog_price_v2_generation(uuid)
TO authenticated;

COMMENT ON FUNCTION
  public.publish_catalog_price_v2_generation(uuid)
IS
  'Publica de forma atómica una generación shadow certificada. Requiere sesión staff.';

-- ============================================================================
-- 4. Rollback transaccional a legacy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rollback_catalog_price_v2_to_legacy()
RETURNS TABLE (
  release_id uuid,
  generation_id uuid,
  rolled_back boolean,
  superseded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor uuid;
  v_release_id uuid;
  v_generation_id uuid;
  v_superseded_at timestamptz;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL OR NOT public.is_staff(v_actor) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('catalog_price_v2_release_pointer', 0)
  );

  SELECT r.id, r.generation_id
  INTO v_release_id, v_generation_id
  FROM public.catalog_price_v2_releases AS r
  WHERE r.is_current = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      NULL::uuid,
      false,
      NULL::timestamptz;
    RETURN;
  END IF;

  v_superseded_at := now();

  UPDATE public.catalog_price_v2_releases
  SET
    is_current = false,
    superseded_at = v_superseded_at,
    superseded_by = v_actor
  WHERE id = v_release_id;

  RETURN QUERY
  SELECT
    v_release_id,
    v_generation_id,
    true,
    v_superseded_at;
END;
$function$;

REVOKE ALL ON FUNCTION
  public.rollback_catalog_price_v2_to_legacy()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.rollback_catalog_price_v2_to_legacy()
TO authenticated;

COMMENT ON FUNCTION
  public.rollback_catalog_price_v2_to_legacy()
IS
  'Retira atómicamente el puntero V2 actual y vuelve a legacy. Requiere sesión staff.';

COMMIT;
