-- CHK-CATGOV-05G-R1 — read-only precheck V2
-- Repository package only. Not executed by this checkpoint.
-- This version uses catalog metadata for public objects and never reads the
-- contents of public.productos_publicos.

BEGIN TRANSACTION READ ONLY;

WITH
table_state AS (
  SELECT
    to_regclass('public.catalog_product_models') IS NOT NULL AS models_table_present,
    to_regclass('public.catalog_product_model_members') IS NOT NULL AS members_table_present,
    to_regclass('public.productos_publicos') IS NOT NULL AS public_products_present,
    to_regprocedure('public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)') IS NOT NULL AS existing_search_rpc_present
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
  SELECT
    count(*)::bigint AS membership_rows,
    count(*) FILTER (WHERE md.id IS NOT NULL)::bigint AS intact_relationship_rows
  FROM public.catalog_product_model_members m
  LEFT JOIN public.catalog_product_models md ON md.id = m.model_id
),
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
column_state AS (
  SELECT
    COALESCE(column_present, false) AS column_present,
    data_type,
    not_null,
    default_expression,
    CASE
      WHEN NOT COALESCE(column_present, false) THEN 'MISSING'
      WHEN data_type = 'boolean'
       AND not_null
       AND lower(replace(COALESCE(default_expression, ''), ' ', '')) IN ('false', 'false::boolean')
        THEN 'COMPATIBLE'
      ELSE 'CONFLICT'
    END AS state
  FROM column_meta
),
default_counts AS (
  SELECT
    count(*) FILTER (
      WHERE lower(COALESCE(to_jsonb(m) ->> 'is_public_default', 'false')) = 'true'
    )::bigint AS true_default_count,
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
index_state AS (
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
index_classification AS (
  SELECT
    expected_index_count,
    semantic_unique_default_index_count,
    CASE
      WHEN semantic_unique_default_index_count = 0 THEN 'MISSING'
      WHEN semantic_unique_default_index_count = 1 AND expected_index_count = 1 THEN 'COMPATIBLE'
      ELSE 'CONFLICT'
    END AS state
  FROM index_state
),
rpc_oids AS (
  SELECT
    to_regprocedure('public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)') AS search_oid,
    to_regprocedure('public.get_model_projection_detail_v1(text,text)') AS detail_oid
),
rpc_inventory AS (
  SELECT
    r.search_oid,
    r.detail_oid,
    (SELECT count(*)::bigint FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'catalog_search_model_projection_v1') AS search_name_count,
    (SELECT count(*)::bigint FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_model_projection_detail_v1') AS detail_name_count,
    sp.prosrc AS search_prosrc,
    dp.prosrc AS detail_prosrc,
    sp.provolatile AS search_volatile,
    dp.provolatile AS detail_volatile,
    sp.prosecdef AS search_security_definer,
    dp.prosecdef AS detail_security_definer,
    sp.proconfig AS search_config,
    dp.proconfig AS detail_config,
    sp.prolang AS search_lang,
    dp.prolang AS detail_lang,
    sp.proacl AS search_acl,
    dp.proacl AS detail_acl,
    sp.proowner AS search_owner,
    dp.proowner AS detail_owner
  FROM rpc_oids r
  LEFT JOIN pg_proc sp ON sp.oid = r.search_oid
  LEFT JOIN pg_proc dp ON dp.oid = r.detail_oid
),
rpc_classification AS (
  SELECT
    CASE
      WHEN search_oid IS NULL AND search_name_count = 0 THEN 'MISSING'
      WHEN search_oid IS NULL OR search_name_count <> 1 THEN 'CONFLICT'
      WHEN md5(search_prosrc) <> '4c78fdf1555d6ec080d651071bd70bed' THEN 'CONFLICT'
      WHEN search_volatile <> 's' OR NOT search_security_definer THEN 'CONFLICT'
      WHEN search_lang <> (SELECT oid FROM pg_language WHERE lanname = 'sql') THEN 'CONFLICT'
      WHEN NOT EXISTS (SELECT 1 FROM unnest(COALESCE(search_config, ARRAY[]::text[])) cfg WHERE cfg = 'search_path=public, pg_temp') THEN 'CONFLICT'
      WHEN EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(search_acl, acldefault('f', search_owner))) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      ) THEN 'CONFLICT'
      ELSE 'COMPATIBLE'
    END AS search_state,
    CASE
      WHEN detail_oid IS NULL AND detail_name_count = 0 THEN 'MISSING'
      WHEN detail_oid IS NULL OR detail_name_count <> 1 THEN 'CONFLICT'
      WHEN md5(detail_prosrc) <> '5d88ba4848f04c39e99600cda8bc4702' THEN 'CONFLICT'
      WHEN detail_volatile <> 's' OR NOT detail_security_definer THEN 'CONFLICT'
      WHEN detail_lang <> (SELECT oid FROM pg_language WHERE lanname = 'sql') THEN 'CONFLICT'
      WHEN NOT EXISTS (SELECT 1 FROM unnest(COALESCE(detail_config, ARRAY[]::text[])) cfg WHERE cfg = 'search_path=public, pg_temp') THEN 'CONFLICT'
      WHEN EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(detail_acl, acldefault('f', detail_owner))) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      ) THEN 'CONFLICT'
      ELSE 'COMPATIBLE'
    END AS detail_state
  FROM rpc_inventory
),
public_object_snapshot AS (
  SELECT
    to_regclass('public.productos_publicos') AS productos_publicos_identity,
    to_regprocedure('public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)') AS catalog_search_products_v2_identity,
    md5(COALESCE(pg_get_viewdef(to_regclass('public.productos_publicos'), true), '')) AS productos_publicos_definition_md5,
    md5(COALESCE(pg_get_functiondef(to_regprocedure('public.catalog_search_products_v2(text,text,text,numeric,numeric,integer,integer,text)')), '')) AS catalog_search_products_v2_definition_md5
),
base_classification AS (
  SELECT
    CASE
      WHEN NOT ts.models_table_present OR NOT ts.members_table_present OR NOT ts.public_products_present OR NOT ts.existing_search_rpc_present THEN 'BLOCKED'
      WHEN mc.model_count <> 8 OR mm.membership_count <> 18 OR rc.intact_relationship_rows <> 18 THEN 'BLOCKED'
      WHEN dc.true_default_count <> 0 OR dc.duplicate_default_rows <> 0 THEN 'CONFLICT'
      WHEN cs.state = 'CONFLICT' OR ic.state = 'CONFLICT' OR rcx.search_state = 'CONFLICT' OR rcx.detail_state = 'CONFLICT' THEN 'CONFLICT'
      WHEN cs.state = 'COMPATIBLE' AND ic.state = 'COMPATIBLE' AND rcx.search_state = 'COMPATIBLE' AND rcx.detail_state = 'COMPATIBLE' THEN 'ALREADY_APPLIED'
      ELSE 'READY'
    END AS deployment_state
  FROM table_state ts
  CROSS JOIN model_counts mc
  CROSS JOIN membership_counts mm
  CROSS JOIN relationship_counts rc
  CROSS JOIN column_state cs
  CROSS JOIN default_counts dc
  CROSS JOIN index_classification ic
  CROSS JOIN rpc_classification rcx
)
SELECT
  bc.deployment_state,
  bc.deployment_state = 'READY' AS ready_to_deploy,
  bc.deployment_state = 'ALREADY_APPLIED' AS already_applied,
  bc.deployment_state IN ('BLOCKED', 'CONFLICT') AS stop_required,
  ts.models_table_present,
  ts.members_table_present,
  ts.public_products_present,
  ts.existing_search_rpc_present,
  mc.model_count,
  mm.membership_count,
  rc.membership_rows,
  rc.intact_relationship_rows,
  rc.intact_relationship_rows = 18 AS model_relationships_intact,
  cs.column_present,
  cs.data_type AS is_public_default_type,
  cs.not_null AS is_public_default_not_null,
  cs.default_expression AS is_public_default_default,
  cs.state AS is_public_default_state,
  dc.true_default_count,
  dc.duplicate_default_rows,
  ic.expected_index_count,
  ic.semantic_unique_default_index_count,
  ic.state AS uniqueness_index_state,
  rcx.search_state AS search_rpc_state,
  rcx.detail_state AS detail_rpc_state,
  pos.productos_publicos_identity,
  pos.catalog_search_products_v2_identity,
  pos.productos_publicos_definition_md5,
  pos.catalog_search_products_v2_definition_md5,
  'Compare both metadata definition hashes byte-for-byte before and after apply; neither object may change.' AS public_object_comparison_rule,
  'Metadata introspection only: no public view/function contents are executed.' AS public_object_safety_rule,
  'No defaults are assigned by the 05G artifact; true_default_count must remain 0.' AS default_rule,
  'No SQL write, RPC invocation, provider call, Storage call, or frontend action is performed by this precheck.' AS safety_statement
FROM base_classification bc
CROSS JOIN table_state ts
CROSS JOIN model_counts mc
CROSS JOIN membership_counts mm
CROSS JOIN relationship_counts rc
CROSS JOIN column_state cs
CROSS JOIN default_counts dc
CROSS JOIN index_classification ic
CROSS JOIN rpc_classification rcx
CROSS JOIN public_object_snapshot pos;

ROLLBACK;
