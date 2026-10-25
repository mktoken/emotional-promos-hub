import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (name: string) => readFileSync(resolve(root, name), "utf8");

describe("ForPromotional atomic activation package", () => {
  it("keeps the candidate flow isolated from public writes until activation", () => {
    const sync = read("functions/sync-forpromotional-products-v2/index.ts");
    const refresh = read("functions/refresh-provider-stock-forpromotional-v2/index.ts");
    expect(sync).toContain('new Set(["dry_run", "shadow_write"])');
    expect(sync).toContain("candidate_id es obligatorio para shadow_write");
    expect(sync).toContain("public_writes: 0");
    expect(sync).toContain("forpromotional_atomic_cost_shadow");
    expect(sync).not.toContain('mode=full');
    expect(refresh).toContain('providerParam !== "forpromotional"');
    expect(refresh).toContain('mode !== "full"');
    expect(refresh).toContain("shadow_only: true");
  });

  it("uses one canonical certification implementation with public-absence and G4/CDO guards", () => {
    const wrapper = read("12_certify_atomic_candidate.sql");
    const certify = read("16_install_forpromotional_automatic_cycle.sql");
    expect(wrapper).toContain("pe_forpromotional_cycle_certify_v1");
    expect(wrapper).not.toContain("UPDATE public.catalog_price_cache_v2_shadow");
    expect(certify).toContain("forpromotional.api.precio_desc");
    expect(certify).toContain("s.factor <> 1.0000");
    expect(certify).toContain("staged offer without exact public mapping");
    expect(certify).toContain("'g4_mx','cdo_mx'");
    expect(certify).toContain("lack a documented decision");
    expect(certify).toContain("retain-current decision");
  });

  it("routes manual activation and rollback through candidate-scoped canonical RPCs", () => {
    const activate = read("13_activate_atomic_candidate.sql");
    const rollback = read("14_rollback_atomic_candidate.sql");
    const canonical = read("16_install_forpromotional_automatic_cycle.sql");
    expect(activate).toMatch(/^--[\s\S]*BEGIN;/);
    expect(activate).toContain("COMMIT;");
    expect(activate).toContain("pe_forpromotional_cycle_activate_v1");
    expect(activate).not.toContain("UPDATE public.producto_precio_escalas");
    expect(rollback).toMatch(/^--[\s\S]*BEGIN;/);
    expect(rollback).toContain("pe_forpromotional_cycle_rollback_v1");
    expect(rollback).not.toContain("UPDATE public.producto_proveedor_stock");
    expect(canonical).toContain("to_jsonb(live_scale)");
    expect(canonical).toContain("to_jsonb(live_stock)");
    expect(canonical).toContain("old_scale_row");
    expect(canonical).toContain("old_stock_row");
    expect(canonical).toContain("jsonb_populate_record(NULL::public.producto_precio_escalas");
    expect(canonical).toContain("jsonb_populate_record(NULL::public.producto_proveedor_stock");
    expect(canonical).not.toContain("v_snapshot_scales_md5");
    expect(rollback).not.toMatch(/DROP[\\s\\S]*CASCADE/);
  });

  it("preserves the installed provider identity and exposes a compact post-check", () => {
    const prepare = read("11_prepare_atomic_candidate.sql");
    const verify = read("15_verify_atomic_state.sql");
    expect(prepare).toContain("p.code = 'forpromotional'");
    expect(prepare).toContain("catalog_price_v2_release_pointer");
    expect(verify).toContain("atomic_verification_report");
    expect(verify).toContain("g4_cdo_unchanged");
    expect(verify).toContain("policy_enabled");
  });
});
