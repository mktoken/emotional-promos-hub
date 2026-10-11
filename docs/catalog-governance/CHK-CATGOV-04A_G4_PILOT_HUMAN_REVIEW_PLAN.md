# CHK-CATGOV-04A — G4 Pilot Human Review Plan

## Purpose and authority

This document defines the controlled human-review package for the frozen 30-product G4 governance pilot. It is a review protocol and evidence pack only. It does not approve products, publish catalog data, write governance tables, change runtime assets, or alter production behavior.

The canonical package is derived from:

- CHK-CATGOV-03D G4 Governance Pilot Expected Matrix V1
- CHK-CATGOV-03D G4 Governance Pilot Payload V1
- the postcheck/hash-manifest package already committed on main

Review authority is human. No model, asset, issue, or runtime state may be created or updated by this checkpoint.

## Baseline and frozen review set

- Git baseline: 70b54a97a3c326198cb3cf3b338530921ef6abe5
- Branch: main
- Governance pilot: 30 products
- Group A: 20 PHASE_3_READY / NEEDS_REVIEW
- Group B: 4 NO_VALID_MASTER / BLOCKED
- Group C: 6 BANK_MATCH_REVIEW_REQUIRED / BLOCKED
- Current approvals: 0
- Current product models: 0
- Current model memberships: 0
- Current seeded pilot rows: 199
- Review decisions at package creation: PENDING for all 30

The 30 rows are fixed in CHK-CATGOV-04A_G4_PILOT_REVIEW_MATRIX_V1.csv. No product may be added, removed, substituted, or silently reclassified during review.

## Scope guard

This checkpoint permits:

- human inspection of the frozen review pack;
- read-only inspection of the current product, image, governance, pricing, stock, and publication context;
- visual review of the referenced master, ALT, provider, and manifest evidence;
- recording a human review outcome in the review pack outside runtime.

This checkpoint does not permit:

- inserts or updates in catalog_approvals;
- inserts or updates in catalog_quality_issues;
- inserts or updates in catalog_governance_state;
- asset uploads, replacements, deletes, or public URL changes;
- changes to productos_b2b.imagenes;
- changes to stock, pricing, mappings, categories, visibility, frontend, schedulers, or Lovable;
- creating product models or model memberships;
- treating a visual candidate as a mapped, eligible, or public-ready product.

## Review dimensions

Each product is reviewed independently. A reviewer must record a result and evidence note for every applicable dimension.

| dimension | required question | passing evidence |
|---|---|---|
| Identity | Is the exact product, provider SKU, variant, and color unambiguous? | Product identity agrees across provider, product record, manifest, and image evidence. |
| Data | Are the relevant catalog attributes complete and internally consistent? | No unresolved attribute, variant, provider, or identifier contradiction. |
| Content | Is the product content accurate, useful, and free of unsupported claims? | Name and description describe the exact product without invented claims. |
| Image technical | Does the file load and meet technical requirements? | Valid image, adequate dimensions, usable crop, no corruption or unsupported format. |
| Image identity | Does the image show the exact SKU/variant under review? | Exact product and variant can be identified from the master and any ALT. |
| Image visual-commercial | Is the presentation suitable for catalog/PDP use? | Product is complete, legible, appropriately framed, and not misleading. |
| Rights/provenance | Is use supported by the available source evidence? | Source/provenance evidence is present and does not carry an open rights blocker. |
| Governance | Does the evidence support the proposed human decision? | State, issues, evidence, and decision are consistent; no blocker is bypassed. |

Dimension values are PASS, FAIL, NEEDS_REVIEW, or NOT_APPLICABLE. A blank dimension is incomplete, not a pass.

## Decision contract

The only allowed human outcomes are:

- APPROVE: every applicable dimension passes, rights/provenance passes, identity is exact, and no blocker remains.
- NEEDS_CORRECTION: a fix is identifiable, but the product is not approved in the current state.
- BLOCKED: an unresolved blocker prevents a safe decision, including identity ambiguity, wrong master, missing evidence, or rights uncertainty.
- DEFERRED: review cannot be completed with the evidence available in the current batch.

APPROVE is a governance decision only. It does not publish, activate, map, price, stock, upload, or change a public product.

No reviewer may convert NEEDS_REVIEW, NO_VALID_MASTER, or BANK_MATCH_REVIEW_REQUIRED to APPROVE by assumption. The evidence note must explain the exact basis.

## Visual review protocol

For every row, the reviewer must inspect or explicitly mark unavailable:

1. canonical master;
2. ALT or secondary asset when present;
3. provider/source image when available;
4. manifest row and source filename;
5. provider SKU, product name, and variant/color;
6. current runtime image/governance context as read-only evidence.

Do not treat a valid HTTP response, a non-empty URL, or a technically correct image file as visual approval. Record wrong product, crop, completeness, contrast, background, watermark, embedded artwork, manufacturer/provider branding, misleading presentation, and catalog/PDP usefulness when relevant.

## Model-family review

Model review is a human comparison exercise only. It must not create models or memberships.

| model candidate | products | allowed result |
|---|---|---|
| G4_LOBBY | lob-sol-azu, lob-sol-neg, lob-sol-bla | MODEL_COMPATIBLE, KEEP_SEPARATE, NEEDS_MORE_EVIDENCE |
| G4_JELLO_COLORS_BIO | jbi-con-azu, jbi-con-neg, jbi-con-ros | MODEL_COMPATIBLE, KEEP_SEPARATE, NEEDS_MORE_EVIDENCE |
| G4_JELLO_ZEN | jel-zen-azu, jel-zen-ver | MODEL_COMPATIBLE, KEEP_SEPARATE, NEEDS_MORE_EVIDENCE |
| G4_VASO_NOMI | vas-nom-az1, vas-nom-ro1, vas-nom-ve1 | MODEL_COMPATIBLE, KEEP_SEPARATE, NEEDS_MORE_EVIDENCE |
| G4_SPLASH | spl-sol-azu, spl-sol-roj | MODEL_COMPATIBLE, KEEP_SEPARATE, NEEDS_MORE_EVIDENCE |

Model compatibility never overrides product identity, exact variant, rights, or image approval. Imperial/Border candidates (imp-neg-cro, imp-neg-oro, lib-bor-azu, lib-bor-gri) require separate identity and asset review. kbi-tra-ama remains KEEP_SEPARATE until its visual identity is resolved.

## Review order and batches

Recommended order:

1. safe model candidates among Group A;
2. remaining Group A products;
3. Group B NO_VALID_MASTER blockers;
4. Group C BANK_MATCH_REVIEW_REQUIRED blockers.

Use human batches of 5–10 products. Every batch must preserve the fixed row identity and include the reviewer, timestamp, dimension results, decision, and evidence notes.

## Calibration and consistency

The exact five-product calibration set is defined in CHK-CATGOV-04A_G4_PILOT_CALIBRATION_SET_V1.md:

- one clear PHASE_3_READY model candidate;
- one PHASE_3_READY pen;
- one PHASE_3_READY non-pen;
- one NO_VALID_MASTER;
- one BANK_MATCH_REVIEW_REQUIRED.

Before reviewing the remaining rows, reviewers should independently review the five rows, compare the evidence notes, and resolve interpretation differences. Calibration must not pre-approve any row.

Consistency rules:

- same evidence standard for every provider SKU and variant;
- image technical pass never substitutes for image identity pass;
- model compatibility never substitutes for exact identity;
- absence of a blocker is not positive evidence;
- unsupported runtime claims remain UNVERIFIED;
- conflicting evidence produces NEEDS_REVIEW, BLOCKED, or DEFERRED, not an inferred pass;
- a decision must be reproducible from the written evidence note.

## Future write contract (not executed here)

If a later, separately authorized checkpoint records outcomes, it must:

1. identify the product and review package version;
2. record reviewer identity and timestamp;
3. persist one explicit outcome from the decision contract;
4. preserve the evidence references and dimension results;
5. create or update catalog_quality_issues only for an evidenced issue;
6. update catalog_governance_state from the recorded dimensions;
7. insert catalog_approvals only for an explicit APPROVE;
8. append an audit_events record describing the action;
9. use idempotent keys and reject conflicting duplicate decisions;
10. never alter stock, pricing, mappings, categories, visibility, or assets as a side effect.

No SQL, migration, API call, or runtime write is supplied or executed by CHK-CATGOV-04A.

## Closure for this checkpoint

The checkpoint is complete when the review plan, exact 30-row matrix, form, and calibration set are committed as documentation, with:

- database writes: 0;
- governance writes: 0;
- runtime changes: 0;
- asset uploads: 0;
- Lovable execution: 0;
- approvals created: 0.
