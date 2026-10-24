import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ForPromotional disabled installation gate", () => {
  it("blocks preexisting active or already-installed automatic state", () => {
    const guard = read("00c_disabled_install_guard.sql");
    const install = read("16_install_forpromotional_automatic_cycle.sql");
    expect(guard).toContain("policy_table_not_installed");
    expect(guard).toContain("atomic_staging_not_installed");
    expect(guard).toContain("automatic_cycle_not_installed");
    expect(guard).toContain("original_cron_route_preserved");
    expect(guard).toContain("provider=forpromotional");
    expect(guard).toContain("provider=g4_mx");
    expect(guard).toContain("provider=cdo_mx");
    expect(install).toContain("existing ForPromotional cycle is enabled");
    expect(install).toContain("automatic_enabled = true");
    expect(install).toContain("automatic_enabled boolean NOT NULL DEFAULT false");
  });

  it("provides an installation-only rollback without touching commercial data", () => {
    const rollback = read("21_rollback_disabled_install.sql");
    expect(rollback).toContain("v_backup.function_rows");
    expect(rollback).toContain("cron state diverged");
    expect(rollback).toContain("to_regclass('public.forpromotional_atomic_candidates')");
    expect(rollback).toContain("EXECUTE $check_candidate$");
    expect(rollback).toContain("to_regclass('public.forpromotional_atomic_cycle_state')");
    expect(rollback).toContain("EXECUTE $check_automatic$");
    expect(rollback).toContain("DROP TABLE IF EXISTS public.forpromotional_atomic_candidates");
    expect(rollback).toContain("DROP TABLE IF EXISTS public.pricing_policy_flags");
    expect(rollback).not.toMatch(/UPDATE\s+public\.(producto_precio_escalas|producto_proveedor_stock|provider_pricing_rules|catalog_price_v2_releases)/i);
    expect(rollback).not.toMatch(/DELETE\s+FROM\s+public\.(producto_precio_escalas|producto_proveedor_stock|producto_proveedor_ofertas)/i);
    expect(rollback).not.toContain("CASCADE");
  });

  it("keeps activation and cron switch scripts outside automatic migrations", () => {
    const manifest = read("MANIFEST.txt");
    expect(manifest).toContain("17_switch_cron_to_automatic_cycle.sql");
    expect(manifest).toContain("18_enable_automatic_cycle.sql");
    expect(manifest).toContain("21_rollback_disabled_install.sql");
  });
});
