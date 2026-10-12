-- CHK-CATGOV-05G — bounded rollback package
-- Execute only after a prior PRECHECK classified READY and the exact 05F
-- migration was applied once. This file has not been executed here.
-- It must run through the internal Lovable/Supabase workflow only.

BEGIN;

DO $$
DECLARE
  v_true_defaults bigint;
  v_search_body_md5 text;
  v_detail_body_md5 text;
BEGIN
  IF to_regclass('public.catalog_product_model_members') IS NULL THEN
    RAISE EXCEPTION '05G rollback blocked: membership table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = 'public.catalog_product_model_members'::regclass
      AND a.attname = 'is_public_default'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION '05G rollback blocked: is_public_default is absent';
  END IF;

  SELECT count(*)
    INTO v_true_defaults
  FROM public.catalog_product_model_members m
  WHERE lower(COALESCE(to_jsonb(m) ->> 'is_public_default', 'false')) = 'true';

  IF v_true_defaults <> 0 THEN
    RAISE EXCEPTION '05G rollback blocked: public defaults exist; no data may be removed';
  END IF;

  IF to_regprocedure('public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)') IS NULL
     OR to_regprocedure('public.get_model_projection_detail_v1(text,text)') IS NULL THEN
    RAISE EXCEPTION '05G rollback blocked: exact projection RPCs are not both present';
  END IF;

  SELECT md5(p.prosrc)
    INTO v_search_body_md5
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)');

  SELECT md5(p.prosrc)
    INTO v_detail_body_md5
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_model_projection_detail_v1(text,text)');

  IF v_search_body_md5 <> 'e2f5d42471b1a7d2338d94bbe9544bca'
     OR v_detail_body_md5 <> '7cabef9201a68ac8f80577d032f4721e' THEN
    RAISE EXCEPTION '05G rollback blocked: projection RPC body does not match the frozen 05F artifact';
  END IF;

  IF to_regclass('public.catalog_model_members_one_public_default_idx') IS NULL THEN
    RAISE EXCEPTION '05G rollback blocked: frozen uniqueness index is absent';
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer);
DROP FUNCTION IF EXISTS public.get_model_projection_detail_v1(text,text);
DROP INDEX IF EXISTS public.catalog_model_members_one_public_default_idx;
DROP INDEX IF EXISTS public.catalog_model_members_public_projection_idx;

ALTER TABLE public.catalog_product_model_members
  DROP COLUMN is_public_default;

COMMIT;
