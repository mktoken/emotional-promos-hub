# CHK-CATGOV-05G — SHA-256 hash manifest V1

Status: **FROZEN REPOSITORY PACKAGE / NOT EXECUTED**
Baseline: `0aa853af231b771f3bc3208806891bad8489b9b3`
Hash algorithm: SHA-256 over the exact repository bytes; no newline
normalization, SQL reformatting, or semantic reconstruction is allowed.

## Deployment artifacts

| Artifact | SHA-256 | Bytes | Lines |
|---|---|---:|---:|
| `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql` | `b9c78e772203564e13453abbdebe4462dde7c46041a98ceea14b187b52ba7fb4` | 36344 | 790 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V1.sql` | `ee81d10fa3a45d524195cf2055c9b2308611d894428029d9ad79fdac1811817f` | 10135 | 245 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V1.sql` | `a7c752cf441ab5a1fd1cdcfdc40ff355f513c3ee41d98666359468e2bc6b7347` | 9716 | 226 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql` | `aed82dc26e5d98a734cd6158c858fe331538d73808c9666c1fcbbbdfc5a9d342` | 2742 | 72 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT.md` | `4c8e9ca6a672629fdd6b1923010350a4db329c3a7d30ef0c05d874084babb9a8` | 4334 | 96 |

The deployment plan is documentation-only and is not an execution input:

| Artifact | SHA-256 |
|---|---|
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PUBLIC_PROJECTION_DEPLOYMENT_PLAN.md` | `5f58d7e258465a7c09efc7db9c81aa38fa57093de648dcffacddaead80fd35ec` |

## Frozen RPC definitions

The two RPC definitions are byte-exact slices from the migration, beginning
at `CREATE OR REPLACE FUNCTION` and ending at the corresponding
`$function$;`. Their body hashes are also recorded because PostgreSQL stores
the function body in `pg_proc.prosrc` without the surrounding dollar quotes.

| RPC | Definition SHA-256 | Body SHA-256 | Expected `md5(pg_proc.prosrc)` |
|---|---|---|---|
| `public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)` | `2f5774defc3d1759663da65c0c8beeeaca2c9dc0970bb26df6d4c2e7dcd15040` | `1afdce5ca798dfee87280a4a840b7f80b6f4b9b745b2d1c70ceb29c2644bb056` | `e2f5d42471b1a7d2338d94bbe9544bca` |
| `public.get_model_projection_detail_v1(text,text)` | `98031afd59f65b4ef801246a466cee1fbc07d4864cbb6b13ad40d2dcce5ad4a4` | `1e8ac0d1861ace663fe4b81f1b891644a0d772fb605763fb9abb6839f451f02ba` | `7cabef9201a68ac8f80577d032f4721e` |

## Verification rule

The internal operator must recompute every required SHA-256 and stop on any
mismatch. The SQL precheck/postcheck use the recorded `pg_proc.prosrc` MD5
values as an additional exact-body guard; they do not execute either RPC.

No hash in this manifest authorizes deployment by itself. The only permitted
deployment input is the unchanged 05F migration, and only after the read-only
precheck returns `READY` (or a complete compatible `ALREADY_APPLIED` state).

Manifest itself is not an execution input and is intentionally not included
in its own hash table to avoid a circular hash.
