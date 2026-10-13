# CHK-CDO-01D-B8 - CDO human review acceleration / exception strategy assessment

## Scope and guardrails

This is a documentation-only routing assessment after 160 registered human reviews. It does not approve any image, change governance, alter runtime, clear rights, or create Pack 09. `MASTER_APPROVED` remains **0**.

## Evidence from the first 160 reviews

| Metric | Count |
|---|---:|
| Candidate A chosen | 149 |
| Candidate B chosen | 4 |
| Candidate C chosen | 0 |
| Provisional/review selections (`A_PROVISIONAL` + `REVIEW`) | 7 |
| Geometry PASS | 160 |
| Geometry FAIL | 0 |
| Geometry REVIEW | 0 |
| Identity PASS | 153 |
| Identity REVIEW | 7 |
| Identity FAIL | 0 |
| Commercial visual PASS | 160 |
| Commercial visual REVIEW | 0 |
| Commercial visual FAIL | 0 |

The seven identity exceptions are not treated as a rate-based defect: four are unresolved asset relationships, one is a gray/black color conflict (C549), one is a finish conflict on the same black color key (T625), and one is a white-vs-natural-wood identity conflict (BP298). These are evidence-specific exceptions, not proof that other products are equivalent.

Recurring risk signals observed in the ledger and source metadata are: unresolved/UNKNOWN variant relationships; color or finish mismatch; multiple materially different primary candidates; provider-code/asset relationship ambiguity; low-information imagery; marketing or contextual assets; and multi-product or alternate views. The ledger supports their presence as review signals, but does not by itself establish causality for every item.

## Routing of the 193 remaining decisions

| Route | Count |
|---|---:|
| FAST_TRACK_SINGLE_CLEAR_PRIMARY | 147 |
| FAST_TRACK_CLEAR_PRIMARY_PLUS_ALTERNATES | 23 |
| MULTIPLE_PRIMARY_SELECTION_REQUIRED | 5 |
| COLOR_OR_FINISH_RECONCILIATION_REQUIRED | 0 |
| IDENTITY_REVIEW_REQUIRED | 18 |
| GEOMETRY_REVIEW_REQUIRED | 0 |
| LOW_INFORMATION_OR_ASSET_ROLE_REVIEW | 0 |
| OTHER_EXCEPTION | 0 |
| **Total** | **193** |

Fast-track eligibility is limited to records with `TECHNICAL_PASS`, an explicit non-UNKNOWN variant relationship, a `PRIMARY_CANDIDATE`, and no multiple-primary condition. A single primary is routed to a compact contact sheet; a primary with alternates is routed to a contact sheet that preserves the alternate/marketing/detail evidence. These are review routes only.

## Proposed review format and savings

- Conventional remaining packs at 20 decisions: **10**.
- Fast-track pool: **170** decisions.
- Proposed fast-track packs: **3** (target 50-60 items each).
- Exception pool: **23** decisions (5 multiple-primary plus 18 identity).
- Proposed detailed exception packs: **2** (small targeted packs, keeping issue review at approximately 15-20 items per pack where practical).
- Estimated remaining human packs: **5**.

Each fast-track item must still show the primary and any alternate evidence and must retain a human decision field. Exception packs remain detailed and must not be collapsed into bulk approval.

## Recommendation

**TRANSITION_TO_FAST_TRACK_PLUS_EXCEPTION_REVIEW — PENDING USER APPROVAL.**

The recommendation is supported by 153/160 identity PASS and 160/160 geometry and commercial-visual PASS in the registered ledger, with the seven exceptions concentrated in explicit identity/relationship and finish conflicts. It does not authorize silent PASS, automatic approval, rights clearance, publication, or Pack 09 creation.

## Protected surfaces

DB writes: 0. Runtime writes: 0. Lovable: 0. Frontend: 0. Providers: 0. Publication: 0. `MASTER_APPROVED`: 0.
