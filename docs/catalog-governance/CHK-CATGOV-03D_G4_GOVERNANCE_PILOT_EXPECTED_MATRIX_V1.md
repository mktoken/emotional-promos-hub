# CHK-CATGOV-03D — G4 Governance Pilot Expected Matrix V1

## Exact package counts

| table | expected inserts | expected updates | expected deletes | notes |
|---|---:|---:|---:|---|
| `catalog_source_documents` | 2 | 0 | 0 | deterministic package rows |
| `catalog_source_evidence` | 61 | 0 | 0 | deterministic package rows |
| `catalog_attribute_definitions` | 0 | 0 | 0 | deterministic package rows |
| `catalog_attribute_values` | 0 | 0 | 0 | deterministic package rows |
| `catalog_product_models` | 0 | 0 | 0 | deterministic package rows |
| `catalog_product_content` | 30 | 0 | 0 | deterministic package rows |
| `catalog_product_model_members` | 0 | 0 | 0 | deterministic package rows |
| `catalog_asset_registry` | 31 | 0 | 0 | deterministic package rows |
| `catalog_product_asset_links` | 31 | 0 | 0 | deterministic package rows |
| `catalog_quality_issues` | 10 | 0 | 0 | deterministic package rows |
| `catalog_approvals` | 0 | 0 | 0 | deterministic package rows |
| `catalog_governance_state` | 30 | 0 | 0 | deterministic package rows |
| `audit_events` | 4 | 0 | 0 | deterministic package rows |

**State distribution:** NEEDS_REVIEW 20; BLOCKED 10; OTHER 0. **Approvals:** 0.

## Product matrix (30/30)

| producto_b2b_id | SKU | source name | manifest status | initial state | source docs | evidence | attributes | content | assets | links | issues | model candidate | memberships | approvals | expected readiness | blocking reason |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|---|
| dc7cc3e7-aa00-47a3-b4e8-edde4bc0b6d0 | lob-sol-azu | lobby | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_LOBBY | 0 | 0 | NEEDS_REVIEW | - |
| 7e09a141-a116-48a9-bc9b-35f2b0898045 | jbi-con-azu | jello colors bio | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_JELLO_COLORS_BIO | 0 | 0 | NEEDS_REVIEW | - |
| eb35ff6c-1d67-4630-8799-2df62b95e79a | jel-zen-azu | jello zen | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_JELLO_ZEN | 0 | 0 | NEEDS_REVIEW | - |
| 7955df9c-8e9c-4203-9f65-505faf5d69cb | lib-bor-azu | libreta border | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 16dfa60b-f22f-4304-9899-14bdc4d63de4 | moc-dia-azu | mochila takayama diagonal | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 0b889781-de86-4115-9a62-ae1540e1140d | vas-nom-az1 | Vaso Nomi | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_VASO_NOMI | 0 | 0 | NEEDS_REVIEW | - |
| a8214d09-27a5-48b0-aa7e-68ec8a2707d9 | spl-sol-azu | Splash | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_SPLASH | 0 | 0 | NEEDS_REVIEW | - |
| b7d2252a-9a16-4caa-9651-d8d7fdc7fe11 | lon-del-gob | lonchera takayama deli | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 115f29be-eb6d-4606-aa48-1c2ec82a550d | cen-met-neg | century | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 3b1efba6-a127-49f4-b98b-fa4eb0b84249 | imp-neg-cro | Imperial | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 38edd673-b077-4c9a-a0f1-ceb4e3d8a9aa | lob-sol-neg | lobby | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_LOBBY | 0 | 0 | NEEDS_REVIEW | - |
| 6a4f917b-f915-4da2-ae22-58ef089b2ecc | lob-sol-bla | lobby | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_LOBBY | 0 | 0 | NEEDS_REVIEW | - |
| 0c5fd12d-e232-4c0c-ae64-5524da62cdf9 | jbi-con-neg | jello colors bio | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_JELLO_COLORS_BIO | 0 | 0 | NEEDS_REVIEW | - |
| d129e6c7-ec52-4d0b-a304-33f7c9c1b316 | jbi-con-ros | jello colors bio | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_JELLO_COLORS_BIO | 0 | 0 | NEEDS_REVIEW | - |
| 9287b3dd-d356-4bf6-b41c-c0728cbfaadb | jel-zen-ver | jello zen | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 2 | 2 | 0 | G4_JELLO_ZEN | 0 | 0 | NEEDS_REVIEW | - |
| 5a3b2909-d914-49e9-943c-b189f93b99b6 | vas-nom-ro1 | Vaso Nomi | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_VASO_NOMI | 0 | 0 | NEEDS_REVIEW | - |
| 045d2c3e-4d9d-4594-b941-d9ecce15a6b6 | vas-nom-ve1 | Vaso Nomi | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_VASO_NOMI | 0 | 0 | NEEDS_REVIEW | - |
| e20c1edf-3015-4b9d-bbd5-b283ad0a0f44 | spl-sol-roj | Splash | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | G4_SPLASH | 0 | 0 | NEEDS_REVIEW | - |
| 9acc5a78-2b14-4db9-94df-a8dc2112fa60 | lib-pea-aob | Libreta Peach | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 2e43d69f-5b79-45c6-9a73-d71f27dc2a02 | lib-ski-vec | Libreta Skin | PHASE_3_READY | NEEDS_REVIEW | g4-image-manifest.csv; g4-web-assets-v1.csv | 1 | 0 | 1 | 1 | 1 | 0 | - | 0 | 0 | NEEDS_REVIEW | - |
| 7b347c71-0cc9-41de-ad29-d8674fb5da1e | imp-neg-oro | Imperial | NO_VALID_MASTER | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | WRONG_MASTER |
| 5e03ff91-3b06-467c-a4ea-0d1f061b7eb4 | lib-bor-gri | Libreta Border | NO_VALID_MASTER | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | WRONG_MASTER |
| 8c318ffb-b6ad-4568-a158-9c381051190a | moc-sac-neg | Mochila Takayama Sack | NO_VALID_MASTER | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | WRONG_MASTER |
| ce09b0d8-0fb9-4616-974a-db6b77f8e97d | vas-ven-ace | Vaso Venti | NO_VALID_MASTER | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | WRONG_MASTER |
| b71bc6f7-1b56-4405-9035-c7e5c59ed0bf | jet-met-neg | Bolígrafo Jet | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |
| 2ec3bee5-e6eb-461c-b865-53a281a5bbdf | kbi-tra-ama | Koi Bio Translúcida Tinta Azul | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |
| bedfed32-c529-4fb4-80f2-75be2ca8c09d | lob-so2-aob | Lobby 2 | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |
| 84c5e928-4005-4909-afbf-ee7fba3ccd19 | moc-atd-neg | Mochila Takayama Atomik Deluxe | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |
| 3f011890-ce8f-4294-a715-762858c8221d | lon-ben-gri | Lonchera Takayama Bento | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |
| e4bb005b-f7f2-45eb-81e1-ddcdd842a55d | jbi-min-azu | Jello Milky Bio tinta negra | BANK_MATCH_REVIEW_REQUIRED | BLOCKED | g4-image-manifest.csv | 1 | 0 | 1 | 0 | 0 | 1 | - | 0 | 0 | BLOCKED | IDENTITY_AMBIGUOUS |

## Interpretation

- `content` is a non-public `HUMAN_REVIEW_REQUIRED` shadow row only.
- 31 asset rows/links cover the 20 PHASE_3_READY products; no storage action or public URL is proposed.
- Model candidates are listed in the payload only; model and membership inserts are deliberately 0 pending human confirmation.
- Quality issues use only schema-valid issue codes: `WRONG_MASTER` for four `NO_VALID_MASTER` rows and `IDENTITY_AMBIGUOUS` for six `BANK_MATCH_REVIEW_REQUIRED` rows.
