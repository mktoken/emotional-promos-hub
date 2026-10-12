# CDO/StockSur canonical source bundle v1

This bundle restores the exact 11 derived source artifacts required by `CHK-CDO-01B`.

It intentionally excludes:
- raw ZIP image banks,
- raw images,
- runtime/database exports,
- any publication artifacts.

The files are analytical/derived evidence only. Verify each file against the included SHA-256 manifest before using them.

These artifacts are sufficient to resume the normalization audit that was previously blocked because Work could not see the session-local files.
