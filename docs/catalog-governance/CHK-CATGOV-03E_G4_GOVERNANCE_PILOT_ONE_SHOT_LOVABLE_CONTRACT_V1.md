# CHK-CATGOV-03E — One-shot Lovable Internal Execution Contract V1

**Purpose:** one future Lovable intervention for preflight, internal migration generation/application, and live QA. This document is preparation only; no DB, migration, Storage, or provider action has been performed.

## Exact inputs

Use only these repository artifacts:

- [payload](./CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json)
- [apply SQL](./CHK-CATGOV-03E_G4_GOVERNANCE_PILOT_APPLY_V1.sql)
- [rollback SQL](./CHK-CATGOV-03E_G4_GOVERNANCE_PILOT_ROLLBACK_V1.sql)
- [expected matrix](./CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md)
- [hash manifest](./CHK-CATGOV-03E_G4_GOVERNANCE_PILOT_HASH_MANIFEST_V1.md)

Expected hashes:

- payload: `a058ed41ab300aed7cae3b09d9ef1d907a5f88729c89f8ab2adea5a12f6d9582`
- apply SQL: `54aab7707d0b256fcb709e5ea79dad9353583295354bb981c3d0b994f905407b`
- rollback SQL: `19dbcf34e1a7e960aa23ff6194995f73b136ee25f245b54416e599dc84e9d04b`
- expected matrix: `d41a8d6262f06134b4be8b85b5837d5b0af905b64282110fd65598cae88674e9`

Operation identity is exactly `G4_GOVERNANCE_PILOT_V1`. Scope is exactly the 30 frozen G4 product IDs in the payload.

## STEP A — read-only runtime preflight

Before generating or applying anything, inspect the internal Supabase runtime read-only:

1. Confirm all 13 Governance tables and required columns/check contracts exist.
2. Confirm the 30 runtime product IDs exist exactly once.
3. Confirm no package deterministic IDs or semantic keys collide with incompatible Governance rows.
4. Confirm the existing Governance state for the 30 products is empty or an exact compatible replay.
5. Confirm no existing product-scope attributes, model memberships, approvals, or candidate model keys conflict.
6. Confirm runtime authorities are not queried for writes and no Storage/provider/scheduler operation is requested.

Do not reveal secrets or private runtime values. If any check fails, stop before migration generation.

## STEP B — exact package comparison

Compute SHA-256 in the internal workflow and compare against the hash manifest. Compare the apply SQL byte-for-byte, not by semantic similarity. If any hash differs, stop before apply. Do not regenerate the payload or “repair” it in Lovable.

## STEP C — migration input

Use the exact apply SQL as the only data payload. Preserve:

- transaction boundary;
- preconditions;
- conflict guards;
- FK-safe order;
- explicit deterministic IDs;
- 0 rows for attribute definitions, attribute values, models, memberships, and approvals;
- post-insert assertions.

Do not add a second migration, extra table, schema change, index, trigger, runtime table write, Storage action, provider call, or frontend change.

## STEP D — internal migration generation

Create exactly one internal Supabase migration from the unchanged apply SQL. The migration may be generated only after Steps A–C pass. Do not create a Work/Drizzle migration, journal entry, snapshot, or local migration number.

## STEP E — apply exactly once

Apply the generated migration once through the internal Lovable/Supabase workflow. No manual SQL replay, no second Build, no retry after a partial/unknown result. If the apply result is ambiguous, stop and obtain runtime state read-only.

## STEP F — same-intervention post-apply QA

Read-only QA must assert exact final counts:

| table/result | expected |
|---|---:|
| products represented | 30 |
| source documents | 2 |
| source evidence | 61 |
| attribute definitions | 0 package rows |
| attribute values | 0 package rows |
| content | 30 |
| assets | 31 |
| asset links | 31 |
| quality issues | 10 |
| governance state | 30 |
| NEEDS_REVIEW | 20 |
| BLOCKED | 10 |
| EDITORIAL_READY | 0 |
| models | 0 package rows |
| memberships | 0 package rows |
| approvals | 0 package rows |
| audit events | 4 |

Also verify:

- every frozen product ID appears exactly once;
- all 10 blocked products retain an open blocker;
- no Governance row is public authority;
- runtime products, images, stock, pricing, publication, mappings, Storage, frontend, and provider systems are unchanged;
- Governance queue can see the pilot states;
- Governance detail loads pilot data;
- D4 duplicate check remains row count = distinct product count, duplicates = 0;
- negative-state QA is deferred if no safe runtime fixture exists, without inserting supplemental products.

Do not recertify all of Build 2.

## STEP G — report

Return the internal migration identifier, exact applied hash, commit/result, all QA counts, and any stop condition. If any preflight, hash comparison, apply, or QA assertion fails, report BLOCKED and do not start a second attempt.

## Explicit prohibitions

No application of this package from Work. No external Supabase CLI/dashboard. No provider sync, cron, Storage upload, runtime product mutation, pricing/stock/mapping/publication mutation, or frontend change.
