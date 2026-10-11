# CHK-CATGOV-05C-A — G4 Model + Membership Execution Hash Manifest

**Algorithm:** SHA-256
**Mode:** preparation only; no SQL executed
**Baseline:** `2f55f4d505750a58e79a0b496d9c67531c4b8419`

The certified 05B payload and membership matrix are carried forward unchanged. The 05B precheck/postcheck were not edited; their required 05C additions are versioned as V2 files.

| SHA-256 | File | Role |
|---|---|---|
| `0992280398d095896e0647df41c98b47bd2ed1433c183cb36a40038a42ba780d` | `docs/catalog-governance/CHK-CATGOV-05B_G4_MODEL_SEED_PAYLOAD_V1.json` | certified 05B payload |
| `98f819028a52639379ae292783a8d9ad165571ce309944faa57827f766ca0d7c` | `docs/catalog-governance/CHK-CATGOV-05B_G4_MODEL_MEMBERSHIP_MATRIX_V1.csv` | certified 05B membership matrix |
| `ccf80e8d7caaabc71d7f98c0176d979c41724489ac9c35f0f022964fc319b174` | `docs/catalog-governance/CHK-CATGOV-05C_G4_MODEL_SEED_PRECHECK_V2.sql` | fail-closed precheck with READY_TO_APPLY |
| `5141daabe6eeea13a65f8078afaca681062ea751b496f6576a33a881fd4b9d89` | `docs/catalog-governance/CHK-CATGOV-05C_G4_MODEL_MEMBERSHIP_APPLY_V1.sql` | data-only apply |
| `b3a23d43db86b834eb9819c8da830af83af72980e7ee134a5da2c83d5c219f88` | `docs/catalog-governance/CHK-CATGOV-05C_G4_MODEL_SEED_POSTCHECK_V2.sql` | complete postcheck |
| `5515dd12fdc32cd68a9290bec3ba04a58707a703ed2f6d0eea9d5f8ac6a0fe22` | `docs/catalog-governance/CHK-CATGOV-05B_G4_MODEL_SEED_ROLLBACK_V1.sql` | bounded rollback design |
| `26ffabf625553ac3e2a3f3f7c37ed90a53f2180894957c2b8877b7d54bb3fe6a` | `docs/catalog-governance/CHK-CATGOV-05C_G4_MODEL_MEMBERSHIP_ONE_SHOT_EXECUTION_CONTRACT.md` | Lovable internal executor contract |

This manifest intentionally excludes itself. Recompute all hashes immediately before any future execution authorization.
