# CHK-CATGOV-05G-R2 — SHA-256 hash manifest V3

Status: **FROZEN REPOSITORY PACKAGE / PRE-DEPLOYMENT CORRECTION / NOT EXECUTED**
Baseline: `15a299812efb7d1214b375aadd6839fed280c5bf`
Hash algorithm: SHA-256 over exact repository bytes; no newline
normalization, SQL reformatting, or semantic reconstruction is allowed.

## Deployment package

There is one logical migration. There is no separate runtime SQL payload. An
internal Lovable/Drizzle artifact may be generated only as the deployment
vehicle, with executable SQL byte-identical to the canonical migration.

| Artifact | SHA-256 | Bytes | Lines |
|---|---|---:|---:|
| `supabase/migrations/20261011090000_catalog_model_public_projection_v1.sql` | `22c6737dec9cc16ed3981f1390234aea61165cf4a90b851ccffb882f854a3aca` | 36324 | 790 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_PRECHECK_V2.sql` | `0577dcb67a707423dc2bef4958213e8848e8840a6ed23faae0e019e2f84bc9a9` | 10352 | 245 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_POSTCHECK_V3.sql` | `102481b31229fd2d6327714d7a33277e6c3f4c071baa3d1cca465ba736d0448a` | 9960 | 228 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ROLLBACK_V1.sql` | `aed82dc26e5d98a734cd6158c858fe331538d73808c9666c1fcbbbdfc5a9d342` | 2742 | 72 |
| `docs/catalog-governance/CHK-CATGOV-05G_MODEL_PROJECTION_ONE_SHOT_DEPLOYMENT_CONTRACT_V3.md` | `29a24aed31891ad4e600160f9ef36585d5d1a7ef59ea3b715eefce74552e2710` | 4182 | 79 |
| `docs/catalog-governance/CHK-CATGOV-05G_R2_MIGRATION_SQL_CORRECTION.md` | `2986d9ed392310e7bd3004862a9c51d8abf653bf607d24b6859174f43b9725e8` | 3159 | 78 |

The old failed migration hash was:
`b9c78e772203564e13453abbdebe4462dde7c46041a98ceea14b187b52ba7fb4`.
It is superseded because the failed transaction rolled back completely and
the logical migration was never successfully applied.

## Frozen RPC definitions

Definitions are byte-exact slices from the corrected migration, beginning at
`CREATE OR REPLACE FUNCTION` and ending at the corresponding `$function$;`.
Body hashes include the initial newline after `AS $function$`, matching
PostgreSQL `pg_proc.prosrc` semantics used by POSTCHECK_V3.

| RPC | Definition SHA-256 | Body SHA-256 | Expected `md5(pg_proc.prosrc)` |
|---|---|---|---|
| `public.catalog_search_model_projection_v1(text,text,text,numeric,numeric,integer,integer,text,text,text,integer,integer)` | `9161191f17a27acb1a2983403c86435969fe0d7817e579d5acc974529eebf1d8` | `cb8fc5fa4b2761a6ebfcd40d1172306e900b1c24246d0ee1072363e8b62b5767` | `4c78fdf1555d6ec080d651071bd70bed` |
| `public.get_model_projection_detail_v1(text,text)` | `718d2898b23b4dce857225f2633dd84b936e074f40957ebf929bc4fa67372afc` | `1d84d91d189b1f0c77f45888503147f2352b34f0b710bb3de8a5229b008db917` | `5d88ba4848f04c39e99600cda8bc4702` |

## Freeze and execution rule

Recompute every listed SHA-256 before any future deployment. The manifest is
not an execution input and is excluded from its own hash table.

The only authorized deployment SQL is the corrected canonical migration,
submitted once through the internal migration vehicle after PRECHECK_V2
returns `READY`. Use POSTCHECK_V3 after apply, then perform read-only RPC
certification and replay PRECHECK_V2 expecting `ALREADY_APPLIED`.

Stop on any hash mismatch, failed precheck/postcheck, changed existing public
object definition, changed model-status snapshot, unexpected generated
Drizzle schema change, ambiguous apply result, or unrelated write.
