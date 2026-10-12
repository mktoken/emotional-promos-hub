-- CHK-CATGOV-05G — read-only post-deployment verification
-- This file is a design/package artifact. It has not been executed here.
-- Run it only after the exact 05F migration artifact has been applied once.

BEGIN TRANSACTION READ ONLY;

WITH
column_meta AS (
  SELECT
    a.attname IS NOT NULL AS column_present,
    format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull AS not_null,
    pg_get_expr(d.adbin, d.adrelid) AS default_expression
  FROM pg_class c
  LEFT JOIN pg_attribute a
    ON a.attrelid = c.oid
   AND a.attname = 'is_public_default'
   AND a.attnum > 0
   AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d
    ON d.adrelid = a.attrelid
   AND d.adnum = a.attnum
  WHERE c.oid = to_regclass('public.catalog_product_model_members')
),
column_check AS (
  SELECT
    COALESCE(column_present, false) AS column_present,
    data_type,
    not_null,
    default_expression,
    COALESCE(column_present, false)
      AND data_type = 'boolean'
      AND not_null
      AND lower(replace(COALESCE(default_expression, ''), ' ', '')) IN ('false', 'false::boolean') AS compatible
  FROM column_meta
),
model_counts AS (
  SELECT count(*)::bigint AS model_count
  FROM public.catalog_product_models
),
membership_counts AS (
  SELECT count(*)::bigint AS membership_count
  FROM public.catalog_product_model_members
),
relationship_counts AS (
  SELECT count(*) FILTER (WHERE md.id IS NOT NULL)::bigint AS intact_relationship_rows
  FROM public.catalog_product_model_members m
  LEFT JOIN public.catalog_product_models md ON md.id = m.model_id
),
default_counts AS (
  SELECT
    count(*) FILTER (WHERE lower(COALESCE(to_jsonb(m) ->> 'is_public_default', 'false')) = 'true')::bigint AS true_default_count,
    COALESCE((
      SELECT sum(model_default_count - 1)::bigint
      FROM (
        SELECT m2.model_id, count(*)::bigint AS model_default_count
        FROM public.catalog_product_model_members m2
        WHERE lower(COALESCE(to_jsonb(m2) ->> 'is_public_default', 'false')) = 'true'
        GROUP BY m2.model_id
        HAVING count(*) > 1
      ) duplicate_models
    ), 0)::bigint AS duplicate_default_rows
  FROM public.catalog_product_model_members m
),
index_check AS (
  SELECT
    count(*) FILTER (WHERE c.relname = 'catalog_model_members_one_public_default_idx')::bigint AS expected_index_count,
    count(*)::bigint AS semantic_unique_default_index_count
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
  WHERE i.indrelid = to_regclass('public.catalog_product_model_members')
    AND i.indisunique
    AND i.indnkeyatts = 1
    AND i.indpred IS NOT NULL
    AND pg_get_expr(i.indpred, i.indrelid) ~* 'is_public_default'
    AND EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = i.indrelid
        AND a.attname = 'model_id'
        AND a.attnum = ANY(i.indkey)
        AND a.attnum > 0
        AND NOT a.attisdropped
    )
),
rpc_oids AS (
  SELECT
    to_regprocedure('public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)') AS search_oid,
    to_regprocedure('public.get_model_projection_detail_v1(text,text)') AS detail_oid
),
rpc_check AS (
  SELECT
    r.search_oid IS NOT NULL AS search_exists,
    r.detail_oid IS NOT NULL AS detail_exists,
    md5(sp.prosrc) = 'e2f5d42471b1a7d2338d94bbe9544bca' AS search_body_matches_manifest,
    md5(dp.prosrc) = '7cabef9201a68ac8f80577d032f4721e' AS detail_body_matches_manifest,
    sp.provolatile = 's' AND sp.prosecdef AND sp.prolang = (SELECT oid FROM pg_language WHERE lanname = 'sql') AS search_execution_contract,
    dp.provolatile = 's' AND dp.prosecdef AND dp.prolang = (SELECT oid FROM pg_language WHERE lanname = 'sql') AS detail_execution_contract,
    EXISTS (SELECT 1 FROM unnest(COALESCE(sp.proconfig, ARRAY[]::text[])) cfg WHERE cfg = 'search_path=public, pg_temp') AS search_safe_search_path,
    EXISTS (SELECT 1 FROM unnest(COALESCE(dp.proconfig, ARRAY[]::text[])) cfg WHERE cfg = 'search_path=public, pg_temp') AS detail_safe_search_path,
    NOT EXISTS (
      SELECT 1 FROM aclexplode(COALESCE(sp.proacl, acldefault('f', sp.proowner))) acl
      WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) AS search_public_execute_revoked,
    NOT EXISTS (
      SELECT 1 FROM aclexplode(COALESCE(dp.proacl, acldefault('f', dp.proowner))) acl
      WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) AS detail_public_execute_revoked,
    CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN has_function_privilege('anon', r.search_oid, 'EXECUTE') ELSE false END AS search_anon_execute,
    CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN has_function_privilege('authenticated', r.search_oid, 'EXECUTE') ELSE false END AS search_authenticated_execute,
    CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN has_function_privilege('anon', r.detail_oid, 'EXECUTE') ELSE false END AS detail_anon_execute,
    CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN has_function_privilege('authenticated', r.detail_oid, 'EXECUTE') ELSE false END AS detail_authenticated_execute
  FROM rpc_oids r
  LEFT JOIN pg_proc sp ON sp.oid = r.search_oid
  LEFT JOIN pg_proc dp ON dp.oid = r.detail_oid
),
public_snapshot AS (
  SELECT
    (SELECT count(*)::bigint FROM public.productos_publicos) AS public_product_count,
    md5(COALESCE(pg_get_functiondef(to_regprocedure('public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)')), '')) AS search_rpc_definition_md5,
    md5(COALESCE(pg_get_viewdef('public.productos_publicos'::regclass, true), '')) AS public_view_definition_md5
),
model_status_snapshot AS (
  SELECT COALESCE(jsonb_object_agg(status, status_count ORDER BY status), '{}'::jsonb) AS status_counts
  FROM (
    SELECT status, count(*)::bigint AS status_count
    FROM public.catalog_product_models
    GROUP BY status
  ) s
),
result AS (
  SELECT
    cc.compatible AS column_pass,
    mc.model_count = 8 AS model_count_pass,
    mm.membership_count = 18 AS membership_count_pass,
    rc.intact_relationship_rows = 18 AS relationship_pass,
    dc.true_default_count = 0 AS defaults_untouched,
    dc.duplicate_default_rows = 0 AS duplicate_defaults_pass,
    ic.expected_index_count = 1 AND ic.semantic_unique_default_index_count = 1 AS uniqueness_index_pass,
    rx.search_exists AND rx.detail_exists AS rpc_presence_pass,
    rx.search_body_matches_manifest AND rx.detail_body_matches_manifest AS rpc_definition_pass,
    rx.search_execution_contract AND rx.detail_execution_contract AS rpc_security_definer_sql_stable_pass,
    rx.search_safe_search_path AND rx.detail_safe_search_path AS safe_search_path_pass,
    rx.search_public_execute_revoked AND rx.detail_public_execute_revoked AS public_execute_revoked_pass,
    rx.search_anon_execute AND rx.search_authenticated_execute AND rx.detail_anon_execute AND rx.detail_authenticated_execute AS intended_grants_pass,
    tp.public_products_present AND tp.existing_search_rpc_present AS existing_public_objects_present,
    ps.public_product_count,
    ps.search_rpc_definition_md5,
    ps.public_view_definition_md5,
    ms.status_counts AS model_status_snapshot,
    dc.true_default_count,
    ic.expected_index_count,
    ic.semantic_unique_default_index_count,
    rx.*
  FROM column_check cc
  CROSS JOIN model_counts mc
  CROSS JOIN membership_counts mm
  CROSS JOIN relationship_counts rc
  CROSS JOIN default_counts dc
  CROSS JOIN index_check ic
  CROSS JOIN rpc_check rx
  CROSS JOIN public_snapshot ps
  CROSS JOIN model_status_snapshot ms
  CROSS JOIN LATERAL (
    SELECT
      to_regclass('public.productos_publicos') IS NOT NULL AS public_products_present,
      to_regprocedure('public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)') IS NOT NULL AS existing_search_rpc_present
  ) tp ON true
)
SELECT
  column_pass
  AND model_count_pass
  AND membership_count_pass
  AND relationship_pass
  AND defaults_untouched
  AND duplicate_defaults_pass
  AND uniqueness_index_pass
  AND rpc_presence_pass
  AND rpc_definition_pass
  AND rpc_security_definer_sql_stable_pass
  AND safe_search_path_pass
  AND public_execute_revoked_pass
  AND intended_grants_pass
  AND existing_public_objects_present AS postcheck_pass,
  column_pass,
  model_count_pass,
  membership_count_pass,
  relationship_pass,
  defaults_untouched,
  duplicate_defaults_pass,
  uniqueness_index_pass,
  rpc_presence_pass,
  rpc_definition_pass,
  rpc_security_definer_sql_stable_pass,
  safe_search_path_pass,
  public_execute_revoked_pass,
  intended_grants_pass,
  existing_public_objects_present,
  public_product_count,
  search_rpc_definition_md5,
  public_view_definition_md5,
  'Compare these two public-object hashes byte-for-byte with PRECHECK output.' AS public_object_comparison_rule,
  model_status_snapshot,
  true_default_count,
  duplicate_default_rows,
  expected_index_count,
  semantic_unique_default_index_count,
  search_exists,
  detail_exists,
  search_body_matches_manifest,
  detail_body_matches_manifest,
  search_execution_contract,
  detail_execution_contract,
  search_safe_search_path,
  detail_safe_search_path,
  search_public_execute_revoked,
  detail_public_execute_revoked,
  search_anon_execute,
  search_authenticated_execute,
  detail_anon_execute,
  detail_authenticated_execute,
  'Compare model_status_snapshot with PRECHECK. No default is assigned by this artifact; no model may become READY solely because of deployment.' AS readiness_rule,
  'This postcheck performs no writes and invokes no business RPC.' AS safety_statement
FROM result;

ROLLBACK;
