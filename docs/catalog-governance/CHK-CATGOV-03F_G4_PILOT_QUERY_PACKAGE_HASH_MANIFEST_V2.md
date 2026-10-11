# CHK-CATGOV-03F — G4 Governance Query-Executor Package Hash Manifest V2

## Classification

This package is a **CONTROLLED GOVERNANCE SEED / SHADOW IMPORT**.
It is not a schema migration, runtime catalog migration, or publication operation.

Package V2 records the syntax remediation after R1 stopped before APPLY with
PostgreSQL error `42601`. PRECHECK_V1 remains preserved as historical evidence;
PRECHECK_V2 is the authorized precheck for the next execution.

Hashes are SHA-256 over the exact UTF-8 repository bytes. Line counts use
LF-separated lines as stored in Git.

## Canonical inputs and Package V2 artifacts

| Artifact | SHA-256 | UTF-8 bytes | Lines |
| --- | --- | ---: | ---: |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json` | `a058ed41ab300aed7cae3b09d9ef1d907a5f88729c89f8ab2adea5a12f6d9582` | 100807 | 1 |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md` | `d41a8d6262f06134b4be8b85b5837d5b0af905b64282110fd65598cae88674e9` | 8182 | 63 |
| `CHK-CATGOV-03F_G4_PILOT_PRECHECK_V2.sql` | `1bfe01e698649b75f2a76ced67cf69f90ce1cf76234754a1c9d57b1c364a1ba7` | 41853 | 441 |
| `CHK-CATGOV-03F_G4_PILOT_APPLY_INSERTS_V1.sql` | `90d3651aa06b18d99cfcd98fa26ebdf42a552204bf67f20241a403adee9db282` | 65908 | 238 |
| `CHK-CATGOV-03F_G4_PILOT_POSTCHECK_V1.sql` | `d5e7f85f7332873328476ae9c3fb85702739b00df2afdd2a12080cfe1735838e` | 79958 | 429 |
| `CHK-CATGOV-03F_G4_PILOT_ROLLBACK_V1.sql` | `41645ed27d7dcd47de6a3a2b5102d0c2b9998f1a5f4fa608117aac03018a8caf` | 9045 | 236 |
| `CHK-CATGOV-03F_G4_PILOT_ONE_SHOT_LOVABLE_CONTRACT_V4.md` | `771968b2484f86e215348f91778f69981abe739f50539209cb5aa53fabea8a2c` | 8479 | 203 |

## Static validation scope

- PRECHECK_V2: SELECT-only; 13 `VALUES` blocks; 364 valid row constructors.
- APPLY_INSERTS_V1: INSERT-only; 8 statements; 199 rows; explicit arity PASS.
- POSTCHECK_V1: SELECT-only; balanced CTE/VALUES syntax and expected checks.
- ROLLBACK_V1: DELETE-only; 8 statements in FK-safe reverse order.
- Runtime writes in APPLY: 0.
- Runtime writes in ROLLBACK: 0.
- DDL, UPDATE, BEGIN, COMMIT, DO, random UUID, provider, and Storage calls: 0.

The Work environment had no PostgreSQL parser or `psql`; the syntax result is
therefore reproducible static PostgreSQL-oriented validation, not runtime proof.

## Frozen package counts

- Products: 30
- Source documents: 2
- Product and asset evidence: 61 total
- Product content: 30
- Assets: 31
- Asset links: 31
- Quality issues: 10
- Governance state: 30
- Audit events: 4
- Attribute definitions: 0
- Attribute values: 0
- Models: 0
- Memberships: 0
- Approvals: 0
- Governance state `NEEDS_REVIEW`: 20
- Governance state `BLOCKED`: 10

## Execution state

- SELECT file execution: CONFIRMED.
- INSERT file execution: NOT YET TESTED.
- Database execution in this checkpoint: 0.
- Lovable execution in this checkpoint: 0.
- Drizzle migrations, journal, and snapshots modified: 0.
