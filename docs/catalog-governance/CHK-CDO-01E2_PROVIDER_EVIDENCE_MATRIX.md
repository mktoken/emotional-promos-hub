# CHK-CDO-01E2 — Provider Evidence Matrix

**Scope:** exactly the three cases still requiring external provider evidence.
**Source of truth:** CHK-CDO-01E1 reconciliation and its analytical plan.
**Boundary:** preparation only; no provider contact, live normalization,
publication, or master approval.

## EC742

- **provider_code:** `EC742`
- **current_status:** `NEEDS_PROVIDER_EVIDENCE`
- **known_evidence:** The source bank contains a generic primary candidate and
  a `celeste` primary candidate. The same model also has explicit `azul`,
  `gris`, and `rosa` source literals; the analytical matrix uses `cyan` while
  the filename uses `celeste`. Existing evidence does not prove an alias,
  alternate view, or distinct commercial variant.
- **exact_missing_fact:** For each unresolved asset, identify whether it is
  an existing color/variant, a new commercial color/variant, a generic or
  marketing image without a color assignment, or an obsolete asset.
- **exact_provider_question:** Does each file below belong to `azul`, `gris`,
  `rosa`, another official EC742 variant, a generic/marketing role, or an
  obsolete product image?
- **acceptable_answer_types:** One classification per file plus the official
  provider color/variant name, or explicit `generic/marketing`, or
  `obsolete/not current`.
- **source filenames:**
  - `EC2/EC742/EC742 cerrado frente.jpg`
  - `EC2/EC742/alt=promocional_publicitario_organizador_cables_EC742_celeste_cerrado_frente.jpg`
- **SHA prefixes:** `4d591ce5e52c`, `4f98c71dd465`
- **decision unlocked:** Existing variant answer enables reassignment to that
  exact analytical variant; new-variant answer enables a provider-named
  analytical key; generic/marketing answer removes the asset from unresolved
  variant assignment; obsolete answer marks it historical and non-current.

## T575

- **provider_code:** `T575`
- **current_status:** `PARTIALLY_RESOLVED`
- **known_evidence:** `T575 cobre frente.jpg` is an exact primary source
  literal. Controlled source-bank alternates explicitly contain `T575 negro`,
  while the unresolved black-side primary is the generic `T575 frente.jpg`.
  The missing link is whether that generic primary is the same commercial
  black variant.
- **exact_missing_fact:** Confirm the commercial relationship between the
  generic primary and the black source literals, and confirm whether copper
  and black are separate sellable variants or separate SKU/sub-SKU records.
- **exact_provider_question:** Are COBRE and NEGRO separate sellable T575
  variants? If yes, what are the official provider color names and identifiers,
  and which source file corresponds to each? Does `T575 frente.jpg` represent
  NEGRO, or is it a different/obsolete source?
- **acceptable_answer_types:** `YES, separate color variants` with official
  names and mapping; `YES, separate SKU/sub-SKU` with identifiers; `NO, one
  variant` with the valid official name and obsolete/alternate designation;
  or an explicit provider-defined distinction.
- **source filenames:**
  - `ttt2/tt3/T575/T575 cobre frente.jpg`
  - `ttt2/tt3/T575/T575 frente.jpg`
  - `T21/tt2/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo_le.jpg`
  - `ttt2/tt3/T575/alt_-promocional_publicitario_mug_T575_negro_frente_logo.jpg`
- **SHA prefixes:** `4aa27c9dcd40`, `11ed25a9afc4`, `2630d0b37fdf`,
  `75035482fe30`
- **decision unlocked:** Separate color variants enable analytical
  `color::cobre` and `color::negro`; separate identifiers enable distinct
  provider-linked keys; one-variant confirmation enables a single provider-
  named key with the other source classified as alternate or obsolete.

## T625

- **provider_code:** `T625`
- **current_status:** `PARTIALLY_RESOLVED`
- **known_evidence:** The source bank repeatedly labels one primary family
  `negro_cobre`; a generic `negro` primary is also present. EX01 describes the
  generic candidate visually as a silver-base finish, but no `plata` or
  `silver` provider literal/alias exists in the preserved source manifest.
- **exact_missing_fact:** Confirm whether copper/gold-base and silver-base are
  separate commercial variants, one variant with a changed/obsolete finish, or
  one provider SKU with a finish option; provide the official names and
  identifiers.
- **exact_provider_question:** Are the black body with copper/gold lower
  finish and the black body with silver lower finish two separate commercial
  versions? If yes, what are the official provider names and SKU/sub-SKU
  identifiers, and which image is current for each? If not, which finish is
  current and is the other image obsolete or an alternate?
- **acceptable_answer_types:** `YES, separate variants/finishes` with official
  names and identifiers; `NO, one variant` with current/obsolete designation;
  `same SKU with finish option`; or another provider-defined distinction with
  its official terminology.
- **source filenames:**
  - `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente.jpg`
  - `T22/T625/alt=promocional_publicitario_mug_T625_negro_frente.jpg`
  - `T22/T625/alt=promocional_publicitario_mug_T625_negro_cobre_frente_logo.jpg`
- **SHA prefixes:** `9f32973b7e1b`, `bd8f676059f7`, `ae1d016e86f4`
- **decision unlocked:** Separate finishes enable provider-named analytical
  keys equivalent to `negro+cobre/dorado` and `negro+plata`; same-SKU finish
  option enables one model with distinct analytical finish membership; current/
  obsolete answer enables preservation of the valid image and historical
  classification of the other.
