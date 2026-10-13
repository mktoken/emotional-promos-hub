# CHK-CDO-01E2 — Provider Response Decision Map

**Current status:** `NOT CURRENTLY REQUIRED`; all three former provider-
evidence cases were resolved from current official StockSur Mexico site
evidence supplied by the user.
**Historical logic:** retained below for traceability only; it is not a request
to contact StockSur now.
**Open provider-evidence cases:** `0`.

T622 and BP254 remain resolved from existing evidence and are not reopened.

## EC742

| Historical provider answer | Historical analytical action |
|---|---|
| File maps to `azul`, `gris`, or `rosa` | Reassign to the exact existing color key while preserving the historical unresolved key and SHA. |
| File is another official commercial color/variant | Create a provider-named analytical key while preserving the unresolved key as history. |
| File is generic/marketing | Classify it as alternate/generic and do not use it as a color master. |
| File is obsolete | Mark the source historical/obsolete and exclude it from current selection. |
| Current official site lists the literal `celeste` | Current resolution: record `color::celeste`; do not rename it to `azul pastel`. |

**Current decision:** the provider-defined set is `rosa`, `gris y negro`,
`azul`, `gris`, and `celeste`. The exact celeste filename maps to
`color::celeste`; generic imagery remains unassigned unless its relationship is
already determinable.

## T575

| Historical provider answer | Historical analytical action |
|---|---|
| Cobre and negro are separate current variants | Split analytically into `color::cobre` and `color::negro` using exact provider identifiers. |
| They share T575 and differ by current color | Create provider-named color relationships and map confirmed source files. |
| One image is alternate/obsolete | Keep the current provider-named key and preserve the other source historically. |
| `T575 frente.jpg` is confirmed as negro | Link the generic primary to `color::negro` and retain black alternates as supporting views. |
| Current site does not show cobre as a current color | Current resolution: support `color::negro`; preserve cobre unassigned and not publication-certified. |

**Current decision:** T575 `negro` is current-provider-supported. Historical
`cobre` is not declared nonexistent; it is preserved without current
publication certification.

## T625

| Historical provider answer | Historical analytical action |
|---|---|
| Copper/gold and silver are separate current finishes | Create provider-named finish keys equivalent to `negro+cobre/dorado` and `negro+plata`. |
| One finish is current and the other is obsolete | Keep the current relationship and preserve the old asset historically. |
| One SKU has a finish option | Keep one model with provider-defined finish membership. |
| Provider uses another distinction | Use exact provider terminology; do not invent labels. |
| Current site shows negro with silver/stainless-steel base | Current resolution: retain `color::negro` for the current silver-base version; do not create current copper/gold keys. |

**Current decision:** T625 current `negro` is the black-body,
silver/stainless-steel-base version. Historical copper/gold assets remain
preserved and not publicable unless future official evidence reactivates them.

No current provider response is required. Any future external evidence would
still require a new analytical checkpoint, rights review, and publication gate;
it would not create `MASTER_APPROVED` automatically.
