
-- =========================================================================
-- Sprint 1: Pricing engine + Print engine + Discounts + Payment terms + Snapshots
-- =========================================================================

-- helper: updated_at trigger function
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

-- =========================================================================
-- 1. pricing_rule_sets
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pricing_rule_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  description text,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rule_sets TO authenticated;
GRANT ALL ON public.pricing_rule_sets TO service_role;
ALTER TABLE public.pricing_rule_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read pricing_rule_sets" ON public.pricing_rule_sets;
CREATE POLICY "staff read pricing_rule_sets" ON public.pricing_rule_sets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write pricing_rule_sets" ON public.pricing_rule_sets;
CREATE POLICY "staff write pricing_rule_sets" ON public.pricing_rule_sets FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_pricing_rule_sets_updated_at ON public.pricing_rule_sets;
CREATE TRIGGER trg_pricing_rule_sets_updated_at BEFORE UPDATE ON public.pricing_rule_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. purchase_levels
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.purchase_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES public.pricing_rule_sets(id) ON DELETE CASCADE,
  level_number int NOT NULL CHECK (level_number BETWEEN 1 AND 6),
  threshold_amount_mxn numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_set_id, level_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_levels TO authenticated;
GRANT ALL ON public.purchase_levels TO service_role;
ALTER TABLE public.purchase_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read purchase_levels" ON public.purchase_levels;
CREATE POLICY "staff read purchase_levels" ON public.purchase_levels FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write purchase_levels" ON public.purchase_levels;
CREATE POLICY "staff write purchase_levels" ON public.purchase_levels FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 3. margin_tiers
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.margin_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES public.pricing_rule_sets(id) ON DELETE CASCADE,
  provider_code text,
  level_number int NOT NULL CHECK (level_number BETWEEN 1 AND 6),
  multiplier numeric(8,4) NOT NULL,
  applies_to text NOT NULL DEFAULT 'product',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- unique con COALESCE para permitir provider_code null
CREATE UNIQUE INDEX IF NOT EXISTS uq_margin_tiers_ruleset_provider_level_applies
  ON public.margin_tiers (rule_set_id, COALESCE(provider_code,''), level_number, applies_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.margin_tiers TO authenticated;
GRANT ALL ON public.margin_tiers TO service_role;
ALTER TABLE public.margin_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read margin_tiers" ON public.margin_tiers;
CREATE POLICY "staff read margin_tiers" ON public.margin_tiers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write margin_tiers" ON public.margin_tiers;
CREATE POLICY "staff write margin_tiers" ON public.margin_tiers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 4. provider_pricing_rules
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.provider_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES public.pricing_rule_sets(id) ON DELETE CASCADE,
  provider_code text NOT NULL,
  base_cost_strategy text NOT NULL CHECK (base_cost_strategy IN ('list_price','list_price_factor','provider_tier_n')),
  provider_tier_number int,
  cost_factor numeric(8,4) NOT NULL DEFAULT 1,
  fallback_strategy text NOT NULL DEFAULT 'manual_review',
  requires_manual_review_on_fallback boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_set_id, provider_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_pricing_rules TO authenticated;
GRANT ALL ON public.provider_pricing_rules TO service_role;
ALTER TABLE public.provider_pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read provider_pricing_rules" ON public.provider_pricing_rules;
CREATE POLICY "staff read provider_pricing_rules" ON public.provider_pricing_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write provider_pricing_rules" ON public.provider_pricing_rules;
CREATE POLICY "staff write provider_pricing_rules" ON public.provider_pricing_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_provider_pricing_rules_updated_at ON public.provider_pricing_rules;
CREATE TRIGGER trg_provider_pricing_rules_updated_at BEFORE UPDATE ON public.provider_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 5. producto_b2b_status
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.producto_b2b_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE CASCADE,
  id_interno text,
  public_visible boolean NOT NULL DEFAULT false,
  stock_status text NOT NULL DEFAULT 'consultar' CHECK (stock_status IN ('disponible','bajo','agotado','consultar')),
  stock_qty int,
  quote_mode text NOT NULL DEFAULT 'consultar_disponibilidad' CHECK (quote_mode IN ('cotizable','consultar_disponibilidad','no_cotizable')),
  kit_eligible boolean NOT NULL DEFAULT false,
  price_valid boolean NOT NULL DEFAULT false,
  image_available boolean NOT NULL DEFAULT false,
  last_stock_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_producto_b2b_status_producto ON public.producto_b2b_status(producto_b2b_id);
CREATE INDEX IF NOT EXISTS idx_producto_b2b_status_idinterno ON public.producto_b2b_status(id_interno);
CREATE INDEX IF NOT EXISTS idx_producto_b2b_status_visible ON public.producto_b2b_status(public_visible);
CREATE INDEX IF NOT EXISTS idx_producto_b2b_status_kit ON public.producto_b2b_status(kit_eligible);
CREATE INDEX IF NOT EXISTS idx_producto_b2b_status_qmode ON public.producto_b2b_status(quote_mode);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_b2b_status TO authenticated;
GRANT ALL ON public.producto_b2b_status TO service_role;
ALTER TABLE public.producto_b2b_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read producto_b2b_status" ON public.producto_b2b_status;
CREATE POLICY "staff read producto_b2b_status" ON public.producto_b2b_status FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write producto_b2b_status" ON public.producto_b2b_status;
CREATE POLICY "staff write producto_b2b_status" ON public.producto_b2b_status FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_producto_b2b_status_updated_at ON public.producto_b2b_status;
CREATE TRIGGER trg_producto_b2b_status_updated_at BEFORE UPDATE ON public.producto_b2b_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 6. producto_b2b_oferta_map
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.producto_b2b_oferta_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE CASCADE,
  id_interno text,
  oferta_id uuid NOT NULL REFERENCES public.producto_proveedor_ofertas(id) ON DELETE CASCADE,
  proveedor_id uuid REFERENCES public.proveedores(id),
  provider_code text,
  is_primary boolean NOT NULL DEFAULT false,
  match_score numeric(6,4),
  match_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oferta_id)
);
CREATE INDEX IF NOT EXISTS idx_pboferta_producto ON public.producto_b2b_oferta_map(producto_b2b_id);
CREATE INDEX IF NOT EXISTS idx_pboferta_provider ON public.producto_b2b_oferta_map(provider_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_b2b_oferta_map TO authenticated;
GRANT ALL ON public.producto_b2b_oferta_map TO service_role;
ALTER TABLE public.producto_b2b_oferta_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read pboferta" ON public.producto_b2b_oferta_map;
CREATE POLICY "staff read pboferta" ON public.producto_b2b_oferta_map FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write pboferta" ON public.producto_b2b_oferta_map;
CREATE POLICY "staff write pboferta" ON public.producto_b2b_oferta_map FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_pboferta_updated_at ON public.producto_b2b_oferta_map;
CREATE TRIGGER trg_pboferta_updated_at BEFORE UPDATE ON public.producto_b2b_oferta_map FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 7. catalog_price_cache  (antes de IVA)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.catalog_price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_b2b_id uuid REFERENCES public.productos_b2b(id) ON DELETE CASCADE,
  id_interno text,
  min_price_before_tax_mxn numeric(12,2),
  tax_included boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'MXN',
  pricing_rule_set_id uuid REFERENCES public.pricing_rule_sets(id),
  provider_code text,
  source_oferta_id uuid REFERENCES public.producto_proveedor_ofertas(id) ON DELETE SET NULL,
  price_status text NOT NULL DEFAULT 'pending' CHECK (price_status IN ('valid','pending','manual_review','unavailable')),
  pricing_warning text,
  calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_cache_producto ON public.catalog_price_cache(producto_b2b_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_status ON public.catalog_price_cache(price_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_price_cache TO authenticated;
GRANT ALL ON public.catalog_price_cache TO service_role;
ALTER TABLE public.catalog_price_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read price_cache" ON public.catalog_price_cache;
CREATE POLICY "staff read price_cache" ON public.catalog_price_cache FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write price_cache" ON public.catalog_price_cache;
CREATE POLICY "staff write price_cache" ON public.catalog_price_cache FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_price_cache_updated_at ON public.catalog_price_cache;
CREATE TRIGGER trg_price_cache_updated_at BEFORE UPDATE ON public.catalog_price_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 8. print_price_books
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_price_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  supplier_name text,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_price_books TO authenticated;
GRANT ALL ON public.print_price_books TO service_role;
ALTER TABLE public.print_price_books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read price_books" ON public.print_price_books;
CREATE POLICY "staff read price_books" ON public.print_price_books FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write price_books" ON public.print_price_books;
CREATE POLICY "staff write price_books" ON public.print_price_books FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_price_books_updated_at ON public.print_price_books;
CREATE TRIGGER trg_price_books_updated_at BEFORE UPDATE ON public.print_price_books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 9. print_techniques
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_id uuid REFERENCES public.print_price_books(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'manual_review' CHECK (status IN ('draft','auto_quote','manual_review','disabled')),
  pricing_mode text NOT NULL DEFAULT 'manual',
  requires_manual_review boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (price_book_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_techniques TO authenticated;
GRANT ALL ON public.print_techniques TO service_role;
ALTER TABLE public.print_techniques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read techniques" ON public.print_techniques;
CREATE POLICY "staff read techniques" ON public.print_techniques FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write techniques" ON public.print_techniques;
CREATE POLICY "staff write techniques" ON public.print_techniques FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_techniques_updated_at ON public.print_techniques;
CREATE TRIGGER trg_techniques_updated_at BEFORE UPDATE ON public.print_techniques FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 10. print_categories
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES public.print_techniques(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  product_keywords text[],
  material_keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technique_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_categories TO authenticated;
GRANT ALL ON public.print_categories TO service_role;
ALTER TABLE public.print_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read print_categories" ON public.print_categories;
CREATE POLICY "staff read print_categories" ON public.print_categories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write print_categories" ON public.print_categories;
CREATE POLICY "staff write print_categories" ON public.print_categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_print_categories_updated_at ON public.print_categories;
CREATE TRIGGER trg_print_categories_updated_at BEFORE UPDATE ON public.print_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 11. print_tariff_ranges
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_tariff_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.print_categories(id) ON DELETE CASCADE,
  min_qty int NOT NULL,
  max_qty int,
  calculation_model text NOT NULL DEFAULT 'manual' CHECK (calculation_model IN ('fixed_minimum','per_piece','fixed_plus_per_piece','size_based','manual')),
  first_ink_price numeric(12,2),
  unit_price numeric(12,4),
  additional_ink_mode text NOT NULL DEFAULT 'manual' CHECK (additional_ink_mode IN ('fixed_amount','half_first_ink','per_piece','manual')),
  additional_ink_price numeric(12,2),
  min_service_price numeric(12,2),
  urgency_multiplier numeric(8,4),
  requires_manual_review boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_tariff_ranges TO authenticated;
GRANT ALL ON public.print_tariff_ranges TO service_role;
ALTER TABLE public.print_tariff_ranges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read tariff_ranges" ON public.print_tariff_ranges;
CREATE POLICY "staff read tariff_ranges" ON public.print_tariff_ranges FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write tariff_ranges" ON public.print_tariff_ranges;
CREATE POLICY "staff write tariff_ranges" ON public.print_tariff_ranges FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_tariff_ranges_updated_at ON public.print_tariff_ranges;
CREATE TRIGGER trg_tariff_ranges_updated_at BEFORE UPDATE ON public.print_tariff_ranges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 12. print_setup_charges
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_setup_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.print_categories(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  charge_unit text NOT NULL CHECK (charge_unit IN ('per_tinta','per_posicion','per_logo','fixed','per_piece')),
  applies_by_default boolean NOT NULL DEFAULT false,
  requires_manual_review boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_setup_charges TO authenticated;
GRANT ALL ON public.print_setup_charges TO service_role;
ALTER TABLE public.print_setup_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read setup_charges" ON public.print_setup_charges;
CREATE POLICY "staff read setup_charges" ON public.print_setup_charges FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write setup_charges" ON public.print_setup_charges;
CREATE POLICY "staff write setup_charges" ON public.print_setup_charges FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_setup_charges_updated_at ON public.print_setup_charges;
CREATE TRIGGER trg_setup_charges_updated_at BEFORE UPDATE ON public.print_setup_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 13. print_extra_charges
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_extra_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.print_categories(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  charge_unit text NOT NULL CHECK (charge_unit IN ('per_piece','fixed','per_position','per_logo')),
  trigger_condition text,
  applies_by_default boolean NOT NULL DEFAULT false,
  requires_manual_review boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_extra_charges TO authenticated;
GRANT ALL ON public.print_extra_charges TO service_role;
ALTER TABLE public.print_extra_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read extra_charges" ON public.print_extra_charges;
CREATE POLICY "staff read extra_charges" ON public.print_extra_charges FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write extra_charges" ON public.print_extra_charges;
CREATE POLICY "staff write extra_charges" ON public.print_extra_charges FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_extra_charges_updated_at ON public.print_extra_charges;
CREATE TRIGGER trg_extra_charges_updated_at BEFORE UPDATE ON public.print_extra_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 14. print_required_inputs
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_required_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES public.print_techniques(id) ON DELETE CASCADE,
  input_key text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technique_id, input_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_required_inputs TO authenticated;
GRANT ALL ON public.print_required_inputs TO service_role;
ALTER TABLE public.print_required_inputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read required_inputs" ON public.print_required_inputs;
CREATE POLICY "staff read required_inputs" ON public.print_required_inputs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write required_inputs" ON public.print_required_inputs;
CREATE POLICY "staff write required_inputs" ON public.print_required_inputs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 15. print_operational_rules
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.print_operational_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_id uuid REFERENCES public.print_price_books(id) ON DELETE CASCADE,
  technique_id uuid REFERENCES public.print_techniques(id) ON DELETE CASCADE,
  normal_lead_time_days int,
  rush_lead_time_days int,
  rush_multiplier numeric(8,4),
  sample_required boolean NOT NULL DEFAULT false,
  sample_cost numeric(12,2),
  change_ink_same_logo_cost numeric(12,2),
  manual_review_threshold jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_operational_rules TO authenticated;
GRANT ALL ON public.print_operational_rules TO service_role;
ALTER TABLE public.print_operational_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read op_rules" ON public.print_operational_rules;
CREATE POLICY "staff read op_rules" ON public.print_operational_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write op_rules" ON public.print_operational_rules;
CREATE POLICY "staff write op_rules" ON public.print_operational_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_op_rules_updated_at ON public.print_operational_rules;
CREATE TRIGGER trg_op_rules_updated_at BEFORE UPDATE ON public.print_operational_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 16. discount_rules
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('volume_discount','manual_discount','negotiated_price')),
  applies_to text NOT NULL CHECK (applies_to IN ('product','print','total')),
  max_discount_percent numeric(8,4),
  min_margin_percent numeric(8,4),
  requires_approval boolean NOT NULL DEFAULT true,
  role_required text,
  is_active boolean NOT NULL DEFAULT true,
  active_from timestamptz,
  active_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_rules TO authenticated;
GRANT ALL ON public.discount_rules TO service_role;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read discount_rules" ON public.discount_rules;
CREATE POLICY "staff read discount_rules" ON public.discount_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write discount_rules" ON public.discount_rules;
CREATE POLICY "staff write discount_rules" ON public.discount_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_discount_rules_updated_at ON public.discount_rules;
CREATE TRIGGER trg_discount_rules_updated_at BEFORE UPDATE ON public.discount_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 17. payment_term_rules
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payment_term_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  condition_type text NOT NULL CHECK (condition_type IN ('personalized_order','non_personalized_order','high_risk_order','manual_override')),
  deposit_percent numeric(8,4) NOT NULL,
  payment_due_stage text NOT NULL DEFAULT 'saldo_antes_de_entrega',
  requires_approval boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_term_rules TO authenticated;
GRANT ALL ON public.payment_term_rules TO service_role;
ALTER TABLE public.payment_term_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read payment_terms" ON public.payment_term_rules;
CREATE POLICY "staff read payment_terms" ON public.payment_term_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write payment_terms" ON public.payment_term_rules;
CREATE POLICY "staff write payment_terms" ON public.payment_term_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_payment_terms_updated_at ON public.payment_term_rules;
CREATE TRIGGER trg_payment_terms_updated_at BEFORE UPDATE ON public.payment_term_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 18. quote_calculation_snapshots
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quote_calculation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  lead_id uuid,
  snapshot jsonb NOT NULL,
  pricing_rule_set_id uuid REFERENCES public.pricing_rule_sets(id),
  print_price_book_id uuid REFERENCES public.print_price_books(id),
  product_subtotal_before_tax numeric(12,2),
  print_subtotal_before_tax numeric(12,2),
  discounts_total numeric(12,2),
  subtotal_before_tax numeric(12,2),
  tax_rate numeric(8,4) NOT NULL DEFAULT 0.16,
  tax_amount numeric(12,2),
  total_with_tax numeric(12,2),
  deposit_percent numeric(8,4),
  deposit_amount numeric(12,2),
  balance_amount numeric(12,2),
  internal_profit numeric(12,2),
  internal_margin_percent numeric(8,4),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quote_calculation_snapshots TO authenticated;
GRANT ALL ON public.quote_calculation_snapshots TO service_role;
ALTER TABLE public.quote_calculation_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read snapshots" ON public.quote_calculation_snapshots;
CREATE POLICY "staff read snapshots" ON public.quote_calculation_snapshots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff insert snapshots" ON public.quote_calculation_snapshots;
CREATE POLICY "staff insert snapshots" ON public.quote_calculation_snapshots FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 19. quote_discounts
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quote_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.quote_calculation_snapshots(id) ON DELETE CASCADE,
  discount_rule_id uuid REFERENCES public.discount_rules(id),
  discount_type text NOT NULL,
  applies_to text NOT NULL,
  amount numeric(12,2),
  percent numeric(8,4),
  reason text NOT NULL,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_discounts TO authenticated;
GRANT ALL ON public.quote_discounts TO service_role;
ALTER TABLE public.quote_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read quote_discounts" ON public.quote_discounts;
CREATE POLICY "staff read quote_discounts" ON public.quote_discounts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write quote_discounts" ON public.quote_discounts;
CREATE POLICY "staff write quote_discounts" ON public.quote_discounts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 20. quote_approval_requests
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quote_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.quote_calculation_snapshots(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason text,
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_approval_requests TO authenticated;
GRANT ALL ON public.quote_approval_requests TO service_role;
ALTER TABLE public.quote_approval_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read approvals" ON public.quote_approval_requests;
CREATE POLICY "staff read approvals" ON public.quote_approval_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write approvals" ON public.quote_approval_requests;
CREATE POLICY "staff write approvals" ON public.quote_approval_requests FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- 21. quote_payment_terms
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quote_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.quote_calculation_snapshots(id) ON DELETE CASCADE,
  payment_term_rule_id uuid REFERENCES public.payment_term_rules(id),
  deposit_percent numeric(8,4),
  deposit_amount numeric(12,2),
  balance_amount numeric(12,2),
  payment_due_stage text,
  manual_override boolean NOT NULL DEFAULT false,
  override_reason text,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_payment_terms TO authenticated;
GRANT ALL ON public.quote_payment_terms TO service_role;
ALTER TABLE public.quote_payment_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read qpt" ON public.quote_payment_terms;
CREATE POLICY "staff read qpt" ON public.quote_payment_terms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write qpt" ON public.quote_payment_terms;
CREATE POLICY "staff write qpt" ON public.quote_payment_terms FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================================
-- SEEDS (idempotentes)
-- =========================================================================

-- rule set base
INSERT INTO public.pricing_rule_sets (name, version, description, is_active, active_from)
VALUES ('Reglas Comerciales Base', '2026-01', 'Reglas comerciales iniciales PromoPro B2B', true, now())
ON CONFLICT (name, version) DO NOTHING;

-- purchase levels
WITH rs AS (SELECT id FROM public.pricing_rule_sets WHERE name='Reglas Comerciales Base' AND version='2026-01')
INSERT INTO public.purchase_levels (rule_set_id, level_number, threshold_amount_mxn)
SELECT rs.id, lvl, amt FROM rs, (VALUES (1,1500),(2,3500),(3,6000),(4,15000),(5,25000),(6,55000)) AS v(lvl, amt)
ON CONFLICT (rule_set_id, level_number) DO NOTHING;

-- margin tiers generales
WITH rs AS (SELECT id FROM public.pricing_rule_sets WHERE name='Reglas Comerciales Base' AND version='2026-01')
INSERT INTO public.margin_tiers (rule_set_id, provider_code, level_number, multiplier, applies_to, notes)
SELECT rs.id, NULL, lvl, mult, 'product', 'Multiplicador general por escala'
FROM rs, (VALUES (1,1.75),(2,1.55),(3,1.32),(4,1.27),(5,1.23),(6,1.20)) AS v(lvl, mult)
ON CONFLICT DO NOTHING;

-- margin tiers G4 (escala 1 = 1.85; 2-6 iguales a generales)
WITH rs AS (SELECT id FROM public.pricing_rule_sets WHERE name='Reglas Comerciales Base' AND version='2026-01')
INSERT INTO public.margin_tiers (rule_set_id, provider_code, level_number, multiplier, applies_to, notes)
SELECT rs.id, 'g4_mx', lvl, mult, 'product', 'Override G4 México'
FROM rs, (VALUES (1,1.85),(2,1.55),(3,1.32),(4,1.27),(5,1.23),(6,1.20)) AS v(lvl, mult)
ON CONFLICT DO NOTHING;

-- provider_pricing_rules
WITH rs AS (SELECT id FROM public.pricing_rule_sets WHERE name='Reglas Comerciales Base' AND version='2026-01')
INSERT INTO public.provider_pricing_rules (rule_set_id, provider_code, base_cost_strategy, provider_tier_number, cost_factor, fallback_strategy, requires_manual_review_on_fallback, notes)
SELECT rs.id, pc, strat, tier, factor, 'manual_review', true, notes
FROM rs, (VALUES
  ('g4_mx','provider_tier_n', 5, 1.0000, 'G4 usa 5ta escala como costo base'),
  ('forpromotional','list_price_factor', NULL, 1.0300, 'ForPromotional lista * 1.03 financiador'),
  ('cdo_mx','list_price', NULL, 1.0000, 'CDO usa precio de lista base')
) AS v(pc, strat, tier, factor, notes)
ON CONFLICT (rule_set_id, provider_code) DO NOTHING;

-- payment_term_rules
INSERT INTO public.payment_term_rules (name, condition_type, deposit_percent, requires_approval, notes)
VALUES
  ('Pedido personalizado', 'personalized_order', 50.0000, false, 'Anticipo default para pedidos personalizados'),
  ('Pedido personalizado especial/riesgoso', 'high_risk_order', 60.0000, true, 'Requiere aprobación'),
  ('Pedido sin personalización', 'non_personalized_order', 100.0000, false, 'Pago completo antes de despacho'),
  ('Override manual', 'manual_override', 0.0000, true, 'Configurable con aprobación')
ON CONFLICT (name) DO NOTHING;

-- print_price_books
INSERT INTO public.print_price_books (name, version, supplier_name, is_active, active_from, notes)
VALUES
  ('Decorados Enero/Febrero 2026 PS Promocionales', '2026-01', 'PS Promocionales', true, now(), 'Lista activa 2026'),
  ('LP Impresión Octubre 2024', '2024-10', 'Interno', false, now() - interval '400 days', 'Histórica')
ON CONFLICT (name, version) DO NOTHING;

-- print_techniques (20) atadas a la lista activa 2026
WITH pb AS (SELECT id FROM public.print_price_books WHERE name='Decorados Enero/Febrero 2026 PS Promocionales' AND version='2026-01')
INSERT INTO public.print_techniques (price_book_id, code, name, status, pricing_mode, requires_manual_review)
SELECT pb.id, code, name, 'manual_review', 'manual', true
FROM pb, (VALUES
  ('serigrafia','Serigrafía'),
  ('tampografia','Tampografía'),
  ('bordado_normal','Bordado Normal'),
  ('bordado_3d','Bordado 3D'),
  ('bordado_coloreel','Bordado Coloreel'),
  ('parche_sublimado_bordado','Parche Sublimado + Bordado'),
  ('parche_tpu','Parche TPU'),
  ('sublimacion','Sublimación'),
  ('dtf','DTF'),
  ('vinil','Vinil'),
  ('uv_cama_plana','UV Cama Plana'),
  ('uv_cilindrica_360','UV Cilíndrica 360'),
  ('uv_cilindrica_una_cara','UV Cilíndrica Una Cara'),
  ('vitrificado','Vitrificado'),
  ('grabado_laser','Grabado Láser'),
  ('grabado_laser_uv','Grabado Láser UV'),
  ('grabado_especial','Grabado Especial'),
  ('gota_resina','Gota de Resina'),
  ('sandblast','Sandblast'),
  ('hot_stamping','Hot Stamping')
) AS v(code, name)
ON CONFLICT (price_book_id, code) DO NOTHING;
