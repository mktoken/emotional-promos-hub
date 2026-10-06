-- CHK-CATALOG-P0-STOCK-AUTO-SYNC-BUILD-REMEDIATION-V1
-- Persists the second CDO cursor dimension without changing provider rows.
-- This migration is prepared only; it is not executed by this checkpoint.

ALTER TABLE public.stock_refresh_cursors
  ADD COLUMN IF NOT EXISTS next_offer_offset integer;

COMMENT ON COLUMN public.stock_refresh_cursors.next_offer_offset IS
  'CDO offer offset within the current provider page; NULL for non-CDO providers.';

ALTER TABLE public.stock_refresh_run_items
  ADD COLUMN IF NOT EXISTS offer_offset_used integer;

COMMENT ON COLUMN public.stock_refresh_run_items.offer_offset_used IS
  'CDO offer offset used for this batch; NULL for non-CDO providers.';
