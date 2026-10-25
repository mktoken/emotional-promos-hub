import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ForPromotional automatic cycle contract", () => {
  it("installs private idempotent cycle state and service-role RPCs", () => {
    const sql = read("16_install_forpromotional_automatic_cycle.sql");
    expect(sql).toContain("forpromotional_atomic_cycle_runs");
    expect(sql).toContain("forpromotional_atomic_cycle_state");
    expect(sql).toContain("idempotency_key");
    expect(sql).toContain("stale_after interval");
    expect(sql).toContain("pe_forpromotional_cycle_begin_v1");
    expect(sql).toContain("pe_forpromotional_cycle_certify_v1");
    expect(sql).toContain("pe_forpromotional_cycle_activate_v1");
    expect(sql).toContain("pe_forpromotional_cycle_rollback_v1");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public, pg_temp");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION");
    expect(sql).toContain("REVOKE ALL ON FUNCTION");
    expect(sql).toContain("forpromotional.api.precio_desc");
    expect(sql).toContain("factor 1.0000");
    expect(sql).toContain("'g4_mx','cdo_mx'");
    expect(sql).not.toContain("CASCADE");
  });

  it("publishes only after all API pages, certification and an atomic RPC", () => {
    const source = read("functions/run-forpromotional-atomic-cycle-v1/index.ts");
    expect(source).toContain("pe_forpromotional_cycle_begin_v1");
    expect(source).toContain('mode: "shadow_write"');
    expect(source).toContain("pe_forpromotional_cycle_certify_v1");
    expect(source).toContain("pe_forpromotional_cycle_activate_v1");
    expect(source).toContain("last_valid_generation_remains: true");
    expect(source).toContain("API reconciliation changed during paginated cycle");
    expect(source).toContain("api_unique_variants");
    expect(source).toContain("api_duplicate_records");
    expect(source).toContain("automatic_cycle_disabled");
    expect(source).not.toContain("sync-forpromotional-products?");
    expect(source).not.toContain("provider=g4_mx");
    expect(source).not.toContain("provider=cdo_mx");
  });

  it("switches the cron exactly once and keeps the new writer disabled until enabled", () => {
    const switchSql = read("17_switch_cron_to_automatic_cycle.sql");
    const enableSql = read("18_enable_automatic_cycle.sql");
    const pauseSql = read("19_pause_automatic_cycle_for_rollback.sql");
    expect(switchSql).toContain("/run-forpromotional-atomic-cycle-v1?");
    expect(switchSql).toContain("automatic_enabled = false");
    expect(switchSql).toContain("pause the original cron first");
    expect(enableSql).toContain("automatic_enabled = true");
    expect(enableSql).toContain("/run-forpromotional-atomic-cycle-v1?");
    expect(pauseSql).toContain("cron.unschedule");
    expect(pauseSql).toContain("divergent");
  });

  it("lists every automatic-cycle artifact in the package manifest", () => {
    const manifest = read("MANIFEST.txt");
    for (const entry of [
      "16_install_forpromotional_automatic_cycle.sql",
      "17_switch_cron_to_automatic_cycle.sql",
      "18_enable_automatic_cycle.sql",
      "19_pause_automatic_cycle_for_rollback.sql",
      "20_verify_automatic_cycle.sql",
      "functions/run-forpromotional-atomic-cycle-v1/index.ts",
      "tests/forpromotional-automatic-cycle.test.ts",
    ]) {
      expect(manifest).toContain(entry);
    }
  });

  it("provides a read-only stale-data and route health report", () => {
    const sql = read("20_verify_automatic_cycle.sql");
    expect(sql).toContain("automatic_cycle_health");
    expect(sql).toContain("stale");
    expect(sql).toContain("last_success_at");
    expect(sql).toContain("approved_route");
    expect(sql).not.toContain("UPDATE ");
    expect(sql).not.toContain("INSERT ");
    expect(sql).not.toContain("DELETE ");
  });
});
