-- Versiona de forma incremental las tablas V2 ya certificadas en Live.
-- Esta migración NO activa V2, NO publica releases, NO ejecuta cutover
-- y NO modifica catalog_price_cache ni los contratos públicos.
--
-- En Live:
--   - valida el contrato existente;
--   - evita recrear triggers;
--   - evita índices equivalentes duplicados;
--   - conserva generaciones y filas shadow.
--
-- En un entorno nuevo:
--   - crea las dos tablas con el contrato certificado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.catalog_price_cache_v2_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  mode text NOT NULL,
  status text NOT NULL,
  rule_set_id uuid NOT NULL,
  candidate_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  priced_count integer NOT NULL DEFAULT 0,
  request_quote_count integer NOT NULL DEFAULT 0,
  unavailable_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  unresolved_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  request_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_price_cache_v2_generations_idempotency_key_key
    UNIQUE (idempotency_key),

  CONSTRAINT catalog_price_cache_v2_generations_rule_set_id_fkey
    FOREIGN KEY (rule_set_id)
    REFERENCES public.pricing_rule_sets(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CONSTRAINT catalog_price_cache_v2_generations_mode_check
    CHECK (mode IN ('dry_run', 'shadow_write')),

  CONSTRAINT catalog_price_cache_v2_generations_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'certified')),

  CONSTRAINT catalog_price_cache_v2_generations_idempotency_key_length_check
    CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),

  CONSTRAINT catalog_price_cache_v2_generations_nonnegative_counts_check
    CHECK (
      candidate_count >= 0
      AND processed_count >= 0
      AND priced_count >= 0
      AND request_quote_count >= 0
      AND unavailable_count >= 0
      AND error_count >= 0
      AND unresolved_count >= 0
    ),

  CONSTRAINT catalog_price_cache_v2_generations_processed_lte_candidate_check
    CHECK (processed_count <= candidate_count),

  CONSTRAINT catalog_price_cache_v2_generations_certified_contract_check
    CHECK (
      status <> 'certified'
      OR (
        completed_at IS NOT NULL
        AND error_count = 0
        AND unresolved_count = 0
        AND processed_count = candidate_count
      )
    )
);

CREATE TABLE IF NOT EXISTS public.catalog_price_cache_v2_shadow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL,
  product_id uuid NOT NULL,
  rule_set_id uuid NOT NULL,
  public_price_status text NOT NULL,
  price_before_tax_mxn numeric,
  currency text NOT NULL DEFAULT 'MXN',
  minimum_quantity integer,
  computed_at timestamptz NOT NULL DEFAULT now(),
  calculation_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_price_cache_v2_shadow_generation_product_key
    UNIQUE (generation_id, product_id),

  CONSTRAINT catalog_price_cache_v2_shadow_generation_fk
    FOREIGN KEY (generation_id)
    REFERENCES public.catalog_price_cache_v2_generations(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CONSTRAINT catalog_price_cache_v2_shadow_product_fk
    FOREIGN KEY (product_id)
    REFERENCES public.productos_b2b(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CONSTRAINT catalog_price_cache_v2_shadow_rule_set_fk
    FOREIGN KEY (rule_set_id)
    REFERENCES public.pricing_rule_sets(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CONSTRAINT catalog_price_cache_v2_shadow_currency_check
    CHECK (currency = 'MXN'),

  CONSTRAINT catalog_price_cache_v2_shadow_status_check
    CHECK (public_price_status IN ('priced', 'request_quote', 'unavailable')),

  CONSTRAINT catalog_price_cache_v2_shadow_minimum_quantity_check
    CHECK (minimum_quantity IS NULL OR minimum_quantity > 0),

  CONSTRAINT catalog_price_cache_v2_shadow_price_contract_check
    CHECK (
      (
        public_price_status = 'priced'
        AND price_before_tax_mxn IS NOT NULL
        AND price_before_tax_mxn > 0
        AND minimum_quantity IS NOT NULL
        AND minimum_quantity > 0
      )
      OR
      (
        public_price_status IN ('request_quote', 'unavailable')
        AND price_before_tax_mxn IS NULL
      )
    )
);

-- ---------------------------------------------------------------------------
-- Gate 1: columnas, tipos y nullability exactos.
-- Si Live difiere, aborta antes de tocar contratos públicos.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_generation_columns text[];
  v_shadow_columns text[];
BEGIN
  SELECT array_agg(
    format('%s:%s:%s', column_name, udt_name, is_nullable)
    ORDER BY column_name
  )
  INTO v_generation_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'catalog_price_cache_v2_generations';

  IF v_generation_columns IS DISTINCT FROM ARRAY[
    'candidate_count:int4:NO',
    'completed_at:timestamptz:YES',
    'created_at:timestamptz:NO',
    'created_by:uuid:YES',
    'error_count:int4:NO',
    'id:uuid:NO',
    'idempotency_key:text:NO',
    'mode:text:NO',
    'priced_count:int4:NO',
    'processed_count:int4:NO',
    'request_id:uuid:YES',
    'request_quote_count:int4:NO',
    'rule_set_id:uuid:NO',
    'started_at:timestamptz:NO',
    'status:text:NO',
    'unavailable_count:int4:NO',
    'unresolved_count:int4:NO',
    'updated_at:timestamptz:NO'
  ]::text[] THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_schema_drift: columnas, tipos o nullability inesperados';
  END IF;

  SELECT array_agg(
    format('%s:%s:%s', column_name, udt_name, is_nullable)
    ORDER BY column_name
  )
  INTO v_shadow_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'catalog_price_cache_v2_shadow';

  IF v_shadow_columns IS DISTINCT FROM ARRAY[
    'calculation_version:text:NO',
    'computed_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'currency:text:NO',
    'generation_id:uuid:NO',
    'id:uuid:NO',
    'minimum_quantity:int4:YES',
    'price_before_tax_mxn:numeric:YES',
    'product_id:uuid:NO',
    'public_price_status:text:NO',
    'rule_set_id:uuid:NO',
    'updated_at:timestamptz:NO'
  ]::text[] THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_schema_drift: columnas, tipos o nullability inesperados';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Gate 2: constraints estructurales indispensables.
-- Se validan por semántica para no depender del nombre usado en Live.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (idempotency_key)'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_unique_idempotency_key';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE
        'FOREIGN KEY (rule_set_id) REFERENCES pricing_rule_sets(id)%ON UPDATE RESTRICT ON DELETE RESTRICT'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_rule_set_fk_restrict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%dry_run%'
      AND pg_get_constraintdef(oid) ILIKE '%shadow_write%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_mode_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%running%'
      AND pg_get_constraintdef(oid) ILIKE '%completed%'
      AND pg_get_constraintdef(oid) ILIKE '%failed%'
      AND pg_get_constraintdef(oid) ILIKE '%certified%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_status_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%processed_count%'
      AND pg_get_constraintdef(oid) ILIKE '%candidate_count%'
      AND pg_get_constraintdef(oid) ILIKE '%<=%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_processed_candidate_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_generations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%certified%'
      AND pg_get_constraintdef(oid) ILIKE '%completed_at%'
      AND pg_get_constraintdef(oid) ILIKE '%error_count%'
      AND pg_get_constraintdef(oid) ILIKE '%unresolved_count%'
      AND pg_get_constraintdef(oid) ILIKE '%processed_count%'
      AND pg_get_constraintdef(oid) ILIKE '%candidate_count%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_generations_missing_certified_contract_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (generation_id, product_id)'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_generation_product_unique';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE
        'FOREIGN KEY (generation_id) REFERENCES catalog_price_cache_v2_generations(id)%ON UPDATE RESTRICT ON DELETE RESTRICT'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_generation_fk_restrict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE
        'FOREIGN KEY (product_id) REFERENCES productos_b2b(id)%ON UPDATE RESTRICT ON DELETE RESTRICT'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_product_fk_restrict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE
        'FOREIGN KEY (rule_set_id) REFERENCES pricing_rule_sets(id)%ON UPDATE RESTRICT ON DELETE RESTRICT'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_rule_set_fk_restrict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%priced%'
      AND pg_get_constraintdef(oid) ILIKE '%request_quote%'
      AND pg_get_constraintdef(oid) ILIKE '%unavailable%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_status_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catalog_price_cache_v2_shadow'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%price_before_tax_mxn%'
      AND pg_get_constraintdef(oid) ILIKE '%minimum_quantity%'
      AND pg_get_constraintdef(oid) ILIKE '%request_quote%'
      AND pg_get_constraintdef(oid) ILIKE '%unavailable%'
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_shadow_missing_price_contract_check';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Índices: se detectan por definición/columnas, no únicamente por nombre.
-- Esto evita duplicar índices equivalentes ya existentes en Live.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_cache_v2_generations'
      AND indexdef LIKE '% (rule_set_id)%'
  ) THEN
    CREATE INDEX catalog_price_cache_v2_generations_rule_set_id_idx
      ON public.catalog_price_cache_v2_generations (rule_set_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_cache_v2_generations'
      AND indexdef LIKE '% (status)%'
  ) THEN
    CREATE INDEX catalog_price_cache_v2_generations_status_idx
      ON public.catalog_price_cache_v2_generations (status);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_cache_v2_generations'
      AND indexdef LIKE '% (created_at DESC)%'
  ) THEN
    CREATE INDEX catalog_price_cache_v2_generations_created_at_idx
      ON public.catalog_price_cache_v2_generations (created_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_cache_v2_shadow'
      AND indexdef LIKE '% (generation_id, public_price_status)%'
  ) THEN
    CREATE INDEX catalog_price_cache_v2_shadow_generation_status_idx
      ON public.catalog_price_cache_v2_shadow
      (generation_id, public_price_status);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalog_price_cache_v2_shadow'
      AND indexdef LIKE '% (product_id, computed_at DESC)%'
  ) THEN
    CREATE INDEX catalog_price_cache_v2_shadow_product_computed_at_idx
      ON public.catalog_price_cache_v2_shadow
      (product_id, computed_at DESC);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: crear únicamente si no existe ya un trigger que invoque
-- public.update_updated_at_column(). No se hace DROP de triggers Live.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS t
    JOIN pg_proc AS p
      ON p.oid = t.tgfoid
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE t.tgrelid =
      'public.catalog_price_cache_v2_generations'::regclass
      AND NOT t.tgisinternal
      AND p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER trg_catalog_price_cache_v2_generations_updated_at
    BEFORE UPDATE ON public.catalog_price_cache_v2_generations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS t
    JOIN pg_proc AS p
      ON p.oid = t.tgfoid
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE t.tgrelid =
      'public.catalog_price_cache_v2_shadow'::regclass
      AND NOT t.tgisinternal
      AND p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER trg_catalog_price_cache_v2_shadow_updated_at
    BEFORE UPDATE ON public.catalog_price_cache_v2_shadow
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- Seguridad: tablas internas sin acceso directo de cliente.
ALTER TABLE public.catalog_price_cache_v2_generations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catalog_price_cache_v2_shadow
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_price_cache_v2_generations
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.catalog_price_cache_v2_shadow
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.catalog_price_cache_v2_generations
  TO service_role;

GRANT ALL ON TABLE public.catalog_price_cache_v2_shadow
  TO service_role;

-- No debe existir ninguna policy en estas tablas internas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'catalog_price_cache_v2_generations',
        'catalog_price_cache_v2_shadow'
      )
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_internal_tables_must_have_zero_policies';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid IN (
      'public.catalog_price_cache_v2_generations'::regclass,
      'public.catalog_price_cache_v2_shadow'::regclass
    )
      AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION
      'catalog_price_cache_v2_internal_tables_must_have_rls_enabled';
  END IF;
END;
$$;

COMMENT ON TABLE public.catalog_price_cache_v2_generations IS
  'Generaciones auditables de recompute V2. Acceso directo solo backend interno.';

COMMENT ON TABLE public.catalog_price_cache_v2_shadow IS
  'Resultados públicos mínimos por generación V2 certificable. Sin costos ni multiplicadores.';

COMMIT;
