# CHK-CATGOV-04A — G4 Pilot Calibration Set V1

The calibration set contains exactly five products from the frozen 30-row review matrix. It is used to align reviewer interpretation before the remaining products are reviewed. None is pre-approved by this document.

| calibration role | provider SKU | producto_b2b_id | source name | current state | reason for selection |
|---|---|---|---|---|---|
| Clear PHASE_3_READY model candidate | lob-sol-azu | dc7cc3e7-aa00-47a3-b4e8-edde4bc0b6d0 | lobby | PHASE_3_READY / NEEDS_REVIEW | Certified package row with a Lobby model candidate and MASTER + ALT context; useful for testing exact identity versus model compatibility. |
| PHASE_3_READY pen | cen-met-neg | 115f29be-eb6d-4606-aa48-1c2ec82a550d | century | PHASE_3_READY / NEEDS_REVIEW | Pen-family review case with MASTER + ALT context; tests identity, product completeness, and variant evidence. |
| PHASE_3_READY non-pen | vas-nom-az1 | 0b889781-de86-4115-9a62-ae1540e1140d | Vaso Nomi | PHASE_3_READY / NEEDS_REVIEW | Non-pen product with a canonical MASTER context; tests category-appropriate image and content review. |
| NO_VALID_MASTER | imp-neg-oro | 7b347c71-0cc9-41de-ad29-d8674fb5da1e | Imperial | NO_VALID_MASTER / BLOCKED | Existing WRONG_MASTER blocker; tests that human review does not force approval where exact visual evidence is absent. |
| BANK_MATCH_REVIEW_REQUIRED | jet-met-neg | b71bc6f7-1b56-4405-9035-c7e5c59ed0bf | Bolígrafo Jet | BANK_MATCH_REVIEW_REQUIRED / BLOCKED | Existing IDENTITY_AMBIGUOUS blocker; tests identity and provenance discipline before any asset or model decision. |

## Calibration procedure

1. Assign the five rows to at least one reviewer independently.
2. Use the human review form for every row, including all applicable dimensions.
3. Inspect master, ALT/provider evidence, manifest, SKU, name, and variant. Mark unavailable evidence explicitly.
4. Do not infer approval from PHASE_3_READY.
5. Compare evidence notes, not just final decisions.
6. Resolve differences in a written calibration note before opening the next batch.
7. Keep all five matrix decisions as PENDING until an authorized human completes the review.

## Calibration consistency checks

- APPROVE requires all applicable dimensions PASS, rights/provenance PASS, and no blocker.
- A technically valid file is not automatically an identity or visual pass.
- Model compatibility is separate from exact product identity.
- NO_VALID_MASTER and BANK_MATCH_REVIEW_REQUIRED remain blocked unless new, deterministic evidence is actually reviewed.
- No calibration result creates a model, membership, approval, issue update, asset, public image reference, or runtime change.
