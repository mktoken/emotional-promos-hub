# CHK-CATGOV-05G-R1 — SHA-256 hash manifest V2

Status: **FROZEN REPOSITORY PACKAGE / NOT EXECUTED**
Baseline: `55b14f3c345b0151d478a550d61a03bf5c864c10`
Hash algorithm: SHA-256 over the exact repository bytes; no newline
normalization, SQL reformatting, or semantic reconstruction is allowed.

## Deployment artifacts

There is one logical migration and no separate runtime SQL payload. The
internal Lovable/Drizzle migration artifact is only the generated deployment
vehicle; its executable payload must be byte-identical to the canonical
migration below.

| Artifact | SHA-256 | Bytes | Lines |
|---|---|---:|---:|
| `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql` | `b9c78e772203564e13453abbdebe4462dde7c46041a98ceea14b187b52ba7fb4` | 36344 | 790 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V2.sql` | `0577dcb67a707423dc2bef4958213e8848e8840a6ed23faae0e019e2f84bc9a9` | 10352 | 245 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V2.sql` | `9112c3b0bc414a4f3b9c03b672cb5d07d959b523552cf5dd5ee6abce066003d0` | 9960 | 228 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql` | `aed82dc26e5d98a734cd6158c858fe331538d73808c9666c1fcbbbdfc5a9d342` | 2742 | 72 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT_V2.md` | `f237a3c4103fc14a5672bc65e535608de42e3e7892dcb9bf7626ef76d9e31118` | 3747 | 77 |
| `docs/catalog-governance/CHK-CATGOV-05G_R1_DEPLOYMENT_BLOCKER_REMEDIATION.md` | `ba58fb3707a184597b1fae49bbcde9fd1ba3d995f7584573fd2825e17eafd519` | 3487 | 96 |

Runtime payload status: **SAME AS CANONICAL MIGRATION**; no separate payload
file is created or authorized. `drizzle/schema.ts` remains outside this
package and must remain unchanged.

## Frozen RPC definitions

The two RPC definitions are byte-exact slices from the canonical migration,
beginning at `CREATE OR REPLACE FUNCTION` and ending at the corresponding
`$function$;`. Their body hashes are recorded because PostgreSQL stores the
function body in `pg_proc.prosrc` without the surrounding dollar quotes.

| RPC | Definition SHA-256 | Body SHA-256 | Expected `md5(pg_proc.prosrc)` |
|---|---|---|---|
| `public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)` | `2f5774defc3d1759663da65c0c8beeeaca2c9dc0970bb26df6d4c2e7dcd15040` | `1afdce5ca798dfee87280a4a840b7f80b6f4b9b745b2d1c70ceb29c2644bb056` | `e2f5d42471b1a7d2338d94bbe9544bca` |
| `public.get_model_projection_detail_v1(text,text)` | `98031afd59f65b4ef801246a466cee1fbc07d4864cbb6b13ad40d2dcce5ad4a4` | `1e8ac0d1861ace663fe4b81f1b891644a0d772fb605763fb9abb6839f451f02ba` | `7cabef9201a68ac8f80577d032f4721e` |

## Verification rule

The internal operator must locally recompute every listed value before
treating this package as frozen for review. The hash table excludes this
manifest itself to avoid a circular hash.

The operator must stop on any hash mismatch, unexpected generated artifact,
changed canonical migration, changed `drizzle/schema.ts`, or ambiguous
internal apply result. The V2 precheck and postcheck are read-only and must
not execute `public.productos_publicos`, `product_has_available_stock`, or
either projection RPC.

No hash in this manifest authorizes deployment by itself. The only permitted
deployment input is the unchanged canonical migration, and only after the
read-only PRECHECK_V2 returns `READY` (or a complete compatible
`ALREADY_APPLIED` state).
