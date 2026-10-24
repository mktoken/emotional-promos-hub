-- PE ForPromotional atomic activation package
-- Installs private staging only. It does not change public costs, stock,
-- factors, releases, feature flags, quotes, cron or provider data.

BEGIN;

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'building',
  provider_id uuid NOT NULL REFERENCES public.proveedores(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  base_generation_id uuid NOT NULL REFERENCES public.catalog_price_cache_v2_generations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  catalog_generation_id uuid NOT NULL UNIQUE REFERENCES public.catalog_price_cache_v2_generations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  rule_set_id uuid NOT NULL REFERENCES public.pricing_rule_sets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  policy_key text NOT NULL DEFAULT 'forpromotional_continuous_v1',
  policy_version text NOT NULL DEFAULT 'forpromotional-continuous-v1',
  factor numeric NOT NULL DEFAULT 1.0000,
  api_complete boolean NOT NULL DEFAULT false,
  api_completed_at timestamptz,
  certified_at timestamptz,
  activated_at timestamptz,
  rolled_back_at timestamptz,
  validation_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_candidates_status_check
    CHECK (status IN ('building','certified','active','superseded','rolled_back','failed')),
  CONSTRAINT forpromotional_atomic_candidates_factor_check CHECK (factor = 1.0000),
  CONSTRAINT forpromotional_atomic_candidates_policy_check
    CHECK (policy_key = 'forpromotional_continuous_v1' AND policy_version = 'forpromotional-continuous-v1'),
  CONSTRAINT forpromotional_atomic_candidates_api_completion_check
    CHECK ((NOT api_complete AND api_completed_at IS NULL) OR (api_complete AND api_completed_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS forpromotional_atomic_one_open_candidate_idx
ON public.forpromotional_atomic_candidates ((true))
WHERE status IN ('building','certified');

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_cost_shadow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.forpromotional_atomic_candidates(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  offer_id uuid NOT NULL REFERENCES public.producto_proveedor_ofertas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  scale_id uuid NOT NULL REFERENCES public.producto_precio_escalas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  stock_id uuid NOT NULL REFERENCES public.producto_proveedor_stock(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.productos_b2b(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  provider_sku text NOT NULL,
  variant_sku text NOT NULL,
  unit_cost numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  source_field text NOT NULL,
  factor numeric NOT NULL DEFAULT 1.0000,
  supplier_moq integer NOT NULL,
  stock_qty integer NOT NULL,
  stock_status text NOT NULL,
  commercial_mode text NOT NULL,
  control_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  api_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_cost_shadow_candidate_offer_key UNIQUE (candidate_id, offer_id),
  CONSTRAINT forpromotional_atomic_cost_shadow_cost_check CHECK (unit_cost > 0),
  CONSTRAINT forpromotional_atomic_cost_shadow_currency_check CHECK (currency = 'MXN'),
  CONSTRAINT forpromotional_atomic_cost_shadow_source_check CHECK (source_field = 'forpromotional.api.precio_desc'),
  CONSTRAINT forpromotional_atomic_cost_shadow_factor_check CHECK (factor = 1.0000),
  CONSTRAINT forpromotional_atomic_cost_shadow_moq_check CHECK (supplier_moq > 0),
  CONSTRAINT forpromotional_atomic_cost_shadow_stock_check CHECK (stock_qty >= 0),
  CONSTRAINT forpromotional_atomic_cost_shadow_stock_status_check CHECK (stock_status IN ('disponible','bajo','agotado'))
);

CREATE TABLE IF NOT EXISTS public.forpromotional_atomic_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.forpromotional_atomic_candidates(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  provider_sku text NOT NULL,
  variant_key text NOT NULL,
  reason text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forpromotional_atomic_exceptions_key UNIQUE (candidate_id, provider_sku, variant_key, reason)
);

ALTER TABLE public.forpromotional_atomic_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_cost_shadow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forpromotional_atomic_exceptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.forpromotional_atomic_candidates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_cost_shadow FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.forpromotional_atomic_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_cost_shadow TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forpromotional_atomic_exceptions TO service_role;

COMMENT ON TABLE public.forpromotional_atomic_candidates IS
  'Private ForPromotional candidate tied to a cloned Pricing V2 generation; never public until one atomic activation transaction.';
COMMENT ON TABLE public.forpromotional_atomic_cost_shadow IS
  'Private API precio_desc and stock snapshot for an atomic candidate. No public reads.';

COMMIT;
