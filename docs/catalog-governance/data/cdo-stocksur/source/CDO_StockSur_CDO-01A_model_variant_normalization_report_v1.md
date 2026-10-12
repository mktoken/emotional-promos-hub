# CDO/StockSur — CDO-01A Model / Variant Normalization (preliminary)

## Purpose
Reinterpret the CDO/StockSur image bank under the canonical catalog rule:

**MODEL → VARIANT → PROVIDER OFFER**

This is read-only analysis of the uploaded ZIP/image bank. It does not publish, modify Governance, or select final masters.

## Preliminary findings
- Preliminary provider/base SKU codes: **967**
- SKUs with **2+ explicit color values** detected in single-SKU image paths: **387**
- Of those, high-confidence repeated color evidence: **350**
- SKUs with exactly 1 detected color token: **84**
- SKUs with no explicit color token in filenames: **496**

## Interpretation
The bank strongly supports the user's observation that, for a substantial portion of CDO/StockSur, the code such as `C597`, `G21`, `T618`, etc. behaves much more like a **base model/provider SKU**, while color is represented inside image names/folders rather than as a separate public product code.

Examples observed:
- `C597`: images explicitly include `caqui` and `negro`.
- `G21`: many color values under the same code.
- `T618`: many color values under the same code.
- `BP300`: many color values under the same code.

Therefore **967 preliminary SKU codes must not be interpreted as 967 color-level public products**. They are closer to a candidate model universe, subject to further review for size/capacity/material/function differences.

## Important limitation
Color-token extraction is metadata evidence, not final product-family approval. Shared/gama images, compound colors, regional asset names, and multi-SKU images can create false positives. Final canonical grouping must also compare product identity/specifications and not rely on suffix or filename rules alone.

## Next
CDO-01B should:
1. validate candidate model identity beyond color;
2. separate COLOR-only variation from SIZE/CAPACITY/MATERIAL/FUNCTION changes;
3. build one row per candidate variant;
4. preserve provider SKU and exact asset provenance;
5. estimate model count, variant count, and eventual public-card count.
