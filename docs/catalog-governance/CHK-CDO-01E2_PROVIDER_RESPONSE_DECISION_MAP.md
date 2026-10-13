# CHK-CDO-01E2 — Provider Response Decision Map

**Status:** analytical only; no provider response has been received.
**Scope:** EC742, T575, and T625 only. T622 and BP254 are intentionally
excluded because CHK-CDO-01E marked them `RESOLVED_FROM_EXISTING_EVIDENCE`.

## EC742

| Provider answer | Analytical action unlocked |
|---|---|
| File maps to `azul`, `gris`, or `rosa` | Reassign that source relationship to the exact existing analytical color key; preserve the historical unresolved key and source SHA. |
| File is another official commercial color/variant | Create a new analytical variant key using the provider's official name; preserve the unresolved key as history. |
| File is generic/marketing and has no color assignment | Remove it from unresolved variant assignment and classify it by its confirmed role; do not treat it as a master. |
| File is obsolete/not current | Mark the source relationship historical/obsolete; do not use it for current public selection. |
| Answer is ambiguous or incomplete | Keep `NEEDS_PROVIDER_EVIDENCE`; do not normalize. |

## T575

| Provider answer | Analytical action unlocked |
|---|---|
| Cobre and negro are separate color variants sharing provider code `T575` | Split analytically into `color::cobre` and `color::negro`; map each confirmed source file and preserve the unresolved key. |
| Cobre and negro have separate SKU/sub-SKU identifiers | Create separate provider-linked analytical variant relationships using the exact identifiers; do not infer identifiers from filenames. |
| They are one variant and one image is alternate/obsolete | Keep one provider-named analytical key; classify the other source relationship as alternate or obsolete and preserve its history. |
| `T575 frente.jpg` is confirmed as negro | Link the generic primary to `color::negro`; retain the black alternates as supporting views according to their roles. |
| `T575 frente.jpg` is not negro or the answer is incomplete | Keep the black-side relationship unresolved and request the missing source mapping. |

## T625

| Provider answer | Analytical action unlocked |
|---|---|
| Copper/gold and silver are separate commercial finishes/variants | Create provider-named analytical keys equivalent to `negro+cobre/dorado` and `negro+plata`; map current images and identifiers separately. |
| They are separate SKU/sub-SKU records | Create distinct provider-linked finish/variant relationships; preserve the current `color::negro` historical key. |
| One finish is current and the other is obsolete/old | Keep the current provider-named relationship and classify the obsolete source as historical; do not discard its provenance. |
| One SKU has a finish option | Keep one T625 model and create separate analytical finish membership under the provider's official terminology. |
| Provider uses another distinction | Use the exact official terminology and identifiers; do not invent `plata`, `cobre`, or `dorado` labels. |
| Answer is ambiguous or incomplete | Keep `PARTIALLY_RESOLVED`; do not split or publish. |

Every unlocked action remains subject to a later analytical normalization
checkpoint, rights review, and independent publication gate. No provider answer
alone creates `MASTER_APPROVED` or `PUBLIC_READY`.
