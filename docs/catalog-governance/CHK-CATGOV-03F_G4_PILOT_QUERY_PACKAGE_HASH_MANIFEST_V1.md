# CHK-CATGOV-03F — G4 Governance Query-Executor Package Hash Manifest

## Classification

This package is a **CONTROLLED GOVERNANCE SEED / SHADOW IMPORT**.
It is not a schema migration, runtime catalog migration, or publication operation.

All hashes are SHA-256 over the exact UTF-8 repository bytes. SQL line counts use
LF-separated lines as stored in Git.

## Canonical inputs and executable artifacts

| Artifact | SHA-256 | UTF-8 bytes | Lines |
| --- | --- | ---: | ---: |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_PAYLOAD_V1.json` | `a058ed41ab300aed7cae3b09d9ef1d907a5f88729c89f8ab2adea5a12f6d9582` | 100807 | 1 |
| `CHK-CATGOV-03D_G4_GOVERNANCE_PILOT_EXPECTED_MATRIX_V1.md` | `d41a8d6262f06134b4be8b85b5837d5b0af905b64282110fd65598cae88674e9` | 8182 | 63 |
| `CHK-CATGOV-03F_G4_PILOT_PRECHECK_V1.sql` | `58cfc31ce3a66a025e58e47c0abb7b8f5172b45b562d7041852ecc105081164e` | 41125 | 441 |
| `CHK-CATGOV-03F_G4_PILOT_APPLY_INSERTS_V1.sql` | `90d3651aa06b18d99cfcd98fa26ebdf42a552204bf67f20241a403adee9db282` | 65908 | 238 |
| `CHK-CATGOV-03F_G4_PILOT_POSTCHECK_V1.sql` | `d5e7f85f7332873328476ae9c3fb85702739b00df2afdd2a12080cfe1735838e` | 79958 | 429 |
| `CHK-CATGOV-03F_G4_PILOT_ROLLBACK_V1.sql` | `41645ed27d7dcd47de6a3a2b5102d0c2b9998f1a5f4fa608117aac03018a8caf` | 9045 | 236 |
| `CHK-CATGOV-03F_G4_PILOT_ONE_SHOT_LOVABLE_CONTRACT_V3.md` | `57ab31c8baa97ee43cff82f57fa3206345da51add5ca49c70386da716406181f` | 6336 | 152 |

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

## Safety classification

- Precheck: SELECT-only.
- Apply: INSERT-only, deterministic IDs, no transaction assumed.
- Postcheck: SELECT-only, field-by-field and relationship validation.
- Rollback: DELETE-only, explicit deterministic IDs in reverse FK order.
- Runtime product, stock, pricing, mapping, publication, image, Storage, provider,
  frontend, scheduler, and schema authorities are outside the package.
