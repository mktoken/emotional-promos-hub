-- CHK-CATALOG-P0-STOCK-AUTO-SYNC-BUILD-V1
-- Durable lock for refresh-provider-stock.
-- This migration does not create or activate cron jobs.

CREATE TABLE IF NOT EXISTS public.stock_refresh_locks (
  scope text PRIMARY KEY,
  lock_token uuid NOT NULL,
  run_id uuid,
  locked_until timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_refresh_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stock_refresh_locks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_refresh_locks TO service_role;

CREATE OR REPLACE FUNCTION public.acquire_stock_refresh_lock(
  p_scope text,
  p_lock_token uuid,
  p_run_id uuid,
  p_ttl_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  IF p_scope IS NULL OR p_scope NOT IN (
    'cdo_mx',
    'forpromotional',
    'g4_mx',
    'catalog_materialization'
  ) THEN
    RAISE EXCEPTION 'invalid stock refresh lock scope';
  END IF;

  IF p_ttl_seconds < 60 OR p_ttl_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid stock refresh lock ttl';
  END IF;

  INSERT INTO public.stock_refresh_locks (
    scope,
    lock_token,
    run_id,
    locked_until,
    acquired_at,
    updated_at
  )
  VALUES (
    p_scope,
    p_lock_token,
    p_run_id,
    now() + make_interval(secs => p_ttl_seconds),
    now(),
    now()
  )
  ON CONFLICT (scope) DO UPDATE
  SET
    lock_token = EXCLUDED.lock_token,
    run_id = EXCLUDED.run_id,
    locked_until = EXCLUDED.locked_until,
    acquired_at = now(),
    updated_at = now()
  WHERE public.stock_refresh_locks.locked_until <= now()
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_stock_refresh_lock(
  p_scope text,
  p_lock_token uuid,
  p_ttl_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_renewed boolean := false;
BEGIN
  IF p_ttl_seconds < 60 OR p_ttl_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid stock refresh lock ttl';
  END IF;

  UPDATE public.stock_refresh_locks
  SET
    locked_until = now() + make_interval(secs => p_ttl_seconds),
    updated_at = now()
  WHERE scope = p_scope
    AND lock_token = p_lock_token
    AND locked_until > now();

  v_renewed := FOUND;
  RETURN v_renewed;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_stock_refresh_lock(
  p_scope text,
  p_lock_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.stock_refresh_locks
  SET
    locked_until = now(),
    updated_at = now()
  WHERE scope = p_scope
    AND lock_token = p_lock_token;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_stock_refresh_lock(text, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_stock_refresh_lock(text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_stock_refresh_lock(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_stock_refresh_lock(text, uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_stock_refresh_lock(text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_stock_refresh_lock(text, uuid) TO service_role;
