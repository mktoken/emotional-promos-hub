import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ForPromotional parallel deployment contract", () => {
  it("routes the parallel orchestrator only to the v2 ForPromotional sync", () => {
    const source = read("functions/refresh-provider-stock-forpromotional-v2/index.ts");
    expect(source).toContain('providerParam !== "forpromotional"');
    expect(source).toContain("/sync-forpromotional-products-v2?");
    expect(source).not.toContain("/sync-g4-products?");
    expect(source).not.toContain("/sync-cdo-products?");
    expect(source).not.toContain("/sync-forpromotional-products?");
    expect(source).toContain('if (mode !== "full")');
    expect(source).toContain('"x-stock-refresh-key": CRON_KEY');
  });

  it("keeps dry_run before the first database write in the v2 sync", () => {
    const source = read("functions/sync-forpromotional-products-v2/index.ts");
    const dryRun = source.indexOf('if (mode === "dry_run")');
    expect(dryRun).toBeGreaterThan(-1);
    expect(source.slice(dryRun)).toContain("items_upserted: 0");
    expect(source).toContain('if (mode !== "dry_run")');
    expect(source).toContain("providedWriteKey !== WRITE_KEY");
    expect(source).not.toContain('stage = "batch_open"');
    expect(source).not.toContain('from("provider_import_batches")');
  });

  it("switches and restores only the captured ForPromotional cron route", () => {
    const activate = read("08_switch_forpromotional_cron_to_v2.sql");
    const pause = read("09_pause_v2_for_rollback.sql");
    expect(activate).toContain("catalog-stock-refresh-forpromotional");
    expect(activate).toContain("/refresh-provider-stock-forpromotional-v2?");
    expect(activate).toContain("provider=g4_mx");
    expect(activate).toContain("provider=cdo_mx");
    expect(pause).toContain("current cron is not the exact approved v2 route");
  });

  it("requires the continuous policy to remain disabled for dry-run", () => {
    const guard = read("00b_parallel_dry_run_guard.sql");
    expect(guard).toContain("continuous_policy_disabled");
    expect(guard).toContain("enabled = true");
    expect(guard).toContain("cron_still_uses_original_route");
  });

  it("uses one stable policy key independently of the public version label", () => {
    const install = read("03_install_policy_disabled.sql");
    expect(install).toContain("WHERE f.policy_key = 'forpromotional_continuous_v1'");
    expect(install).not.toContain("WHERE f.policy_key = v_policy_version");
  });
});
