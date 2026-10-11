# CHK-CATGOV-04A — G4 Human Review Form V1

Use one completed copy per product in the frozen review matrix. This form is an offline review record. It does not write to the database or to runtime.

## Review record

- Package: CHK-CATGOV-04A
- Package version: V1
- Reviewer:
- Review date/time:
- Batch:
- Review status: PENDING / IN_PROGRESS / COMPLETE

## Product identity

- Group: A / B / C
- producto_b2b_id:
- Provider:
- Provider SKU:
- Product name:
- Variant/color:
- Category:
- Manifest status:
- Initial governance state:
- Current blocking reason, if any:
- Model-family candidate, if any:

## Read-only context

- Current public eligibility: VERIFY LIVE
- Current publication state: VERIFY LIVE
- Current pricing/MOQ/stock context: VERIFY LIVE
- Current runtime image/governance assets: VERIFY LIVE
- Runtime evidence reference:
- No runtime changes made: YES

## Evidence reviewed

Record the exact evidence used. Do not substitute a claim for a source.

- Manifest row:
- Provider/source row:
- Canonical master reference:
- ALT/secondary reference:
- Source filename or asset path:
- SHA-256, if available:
- Source evidence document:
- Product/PDP reference:
- Additional evidence:

## Dimension results

Use only PASS, FAIL, NEEDS_REVIEW, or NOT_APPLICABLE. Each result requires a short evidence note.

| dimension | result | evidence note |
|---|---|---|
| Identity |  |  |
| Data |  |  |
| Content |  |  |
| Image technical |  |  |
| Image identity |  |  |
| Image visual-commercial |  |  |
| Rights/provenance |  |  |
| Governance |  |  |

## Visual inspection notes

- Master inspected: YES / NO / UNAVAILABLE
- ALT/secondary inspected: YES / NO / NOT_PRESENT / UNAVAILABLE
- Provider/source image inspected: YES / NO / UNAVAILABLE
- Product identity visible:
- Exact variant/color visible:
- Crop/completeness:
- Sharpness/scale:
- Contrast/background:
- Watermark or embedded artwork:
- Manufacturer/provider branding:
- Misleading presentation risk:
- Catalog usefulness:
- PDP usefulness:

## Model-family comparison

- Candidate model:
- Compared products:
- Result: MODEL_COMPATIBLE / KEEP_SEPARATE / NEEDS_MORE_EVIDENCE / NOT_APPLICABLE
- Comparison evidence:
- Does not create a model or membership: CONFIRMED

## Decision

Choose exactly one:

- APPROVE
- NEEDS_CORRECTION
- BLOCKED
- DEFERRED

Decision:

Decision rationale:

Open issue codes or references:

Reviewer notes:

## Decision gate

APPROVE is valid only when every applicable dimension is PASS, rights/provenance is PASS, identity is exact, and no blocker remains. A technical image pass is not sufficient for visual or identity approval.

The following remain outside this form and must not be changed as a side effect:

- catalog_approvals;
- catalog_quality_issues;
- catalog_governance_state;
- assets or public image references;
- stock, pricing, mappings, categories, visibility, frontend, schedulers, and Lovable.

## Later persistence contract

If a future checkpoint is separately authorized to persist this record, it must preserve the package version, reviewer, timestamp, evidence references, dimension results, decision, and audit trail. This checkpoint does not perform that write.
