
-- Ensure updated_at helper exists (safe if already present)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) Shadow cache table (additive, isolated from production)
CREATE TABLE public.catalog_price_cache_shadow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_b2b_id UUID,
  id_interno TEXT,
  min_price_before_tax_mxn NUMERIC,
  tax_included BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'MXN',
  pricing_rule_set_id UUID,
  provider_code TEXT,
  source_oferta_id UUID,
  price_status TEXT NOT NULL DEFAULT 'pending',
  pricing_warning TEXT,
  calculated_at TIMESTAMPTZ,
  -- V2 diagnostic fields
  requested_quantity INTEGER,
  applied_minimum_quantity INTEGER,
  applied_multiplier NUMERIC,
  applied_unit_cost NUMERIC,
  fallback_reason TEXT,
  resolved_via_moq BOOLEAN NOT NULL DEFAULT false,
  shadow_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) GRANTs — service_role only (shadow is internal)
GRANT ALL ON public.catalog_price_cache_shadow TO service_role;
-- Explicitly no grants to anon/authenticated.

-- 3) Enable RLS
ALTER TABLE public.catalog_price_cache_shadow ENABLE ROW LEVEL SECURITY;

-- 4) Policies — no policies granted for anon/authenticated (locked by default).
-- service_role bypasses RLS. We add zero permissive policies for other roles.

-- 5) Helpful indexes for shadow QA queries
CREATE INDEX idx_catalog_price_cache_shadow_producto ON public.catalog_price_cache_shadow(producto_b2b_id);
CREATE INDEX idx_catalog_price_cache_shadow_id_interno ON public.catalog_price_cache_shadow(id_interno);
CREATE INDEX idx_catalog_price_cache_shadow_run ON public.catalog_price_cache_shadow(shadow_run_id);
CREATE INDEX idx_catalog_price_cache_shadow_status ON public.catalog_price_cache_shadow(price_status);

-- 6) updated_at trigger
CREATE TRIGGER trg_catalog_price_cache_shadow_updated_at
BEFORE UPDATE ON public.catalog_price_cache_shadow
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
