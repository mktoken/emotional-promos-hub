# CHK-CATGOV-03E-R4 — G4 Governance Query-Executor Package Hash Manifest V3

## Classification

This package is a **CONTROLLED GOVERNANCE SEED / SHADOW IMPORT**.
It is not a schema migration, runtime catalog migration, or publication
operation.

Package V3 records the PostgreSQL CTE grammar remediation after R2 stopped
before APPLY with error `42601`. PRECHECK_V1, PRECHECK_V2, and POSTCHECK_V1
remain preserved historical evidence. PRECHECK_V3 and POSTCHECK_V2 are the
authorized artifacts for the next controlled execution.

Hashes are SHA-256 over the exact UTF-8 repository bytes. Line counts use
LF-separated lines as stored in Git.

## Canonical inputs and Package V3 artifacts

| Artifact | SHA-256 | UTF-8 bytes | Lines |
| --- | --- | ---: | ---: |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json` | `a058ed41ab300aed7cae3b09d9ef1d907a5f88729c89f8ab2adea5a12f6d9582` | 100807 | 1 |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md` | `d41a8d6262f06134b4be8b85b5837d5b0af905b64282110fd65598cae88674e9` | 8182 | 63 |
| `CHK-CATGOV-03F_G4_PILOT_PRECHECK_V3.sql` | `d66d6dd3e3dd34a2315246c415312f20d52fbd0ee3937a0d914ab14bbbfbee09` | 41753 | 441 |
| `CHK-CATGOV-03F_G4_PILOT_APPLY_INSERTS_V1.sql` | `90d3651aa06b18d99cfcd98fa26ebdf42a552204bf67f20241a403adee9db282` | 65908 | 238 |
| `CHK-CATGOV-03F_G4_PILOT_POSTCHECK_V2.sql` | `2689c8092076f471e727aaf18171a1a67560fad1864a4e0f99983e3f060746aa` | 79548 | 429 |
| `CHK-CATGOV-03F_G4_PILOT_ROLLBACK_V1.sql` | `41645ed27d7dcd47de6a3a2b5102d0c2b9998f1a5f4fa608117aac03018a8caf` | 9045 | 236 |
| `CHK-CATGOV-03F_G4_PILOT_ONE_SHOT_LOVABLE_CONTRACT_V5.md` | `1ea973e67fff89195d691e32984920aec844c696a78832e22af1ea4379c949f7` | 9098 | 222 |

## Static validation scope

- PRECHECK_V3: SELECT-only; 14 `VALUES` blocks; 364 valid row
  constructors; 0 typed CTE aliases; every CTE alias/projection arity
  matches and no duplicate aliases were found.
- APPLY_INSERTS_V1: INSERT-only; 8 statements; 199 rows; explicit column
  and row arity PASS for 7/9/10/17/10/8/7/7 columns.
- POSTCHECK_V2: SELECT-only; 9 `VALUES` blocks; 229 valid row
  constructors; 0 typed CTE aliases; every CTE alias/projection arity
  matches and no duplicate aliases were found.
- ROLLBACK_V1: DELETE-only; 8 statements in FK-safe reverse order with
  deterministic pilot IDs.
- PRECHECK_V2 → PRECHECK_V3 semantic normalization: unchanged.
- POSTCHECK_V1 → POSTCHECK_V2 semantic normalization: unchanged.
- Runtime catalog writes in this checkpoint: 0.
- DDL, UPDATE, BEGIN, COMMIT, DO, random UUID, provider, and Storage calls:
  0.

The Work environment had no PostgreSQL parser or `psql`; the syntax result is
therefore reproducible static PostgreSQL-oriented validation, not runtime
proof.

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

- SELECT file execution: **CONFIRMED**.
- INSERT file execution: **NOT YET TESTED**.
- Database execution in this checkpoint: 0.
- Lovable execution in this checkpoint: 0.
- Drizzle migrations, journal, and snapshots modified: 0.
