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

  it("requires the exact staged source, factor, mapping, and G4/CDO guard", () => {
    const certify = read("12_certify_atomic_candidate.sql");
    expect(certify).toContain("forpromotional.api.precio_desc");
    expect(certify).toContain("st.factor <> 1.0000");
    expect(certify).toContain("staged offer without its exact public mapping");
    expect(certify).toContain("'g4_mx','cdo_mx'");
    expect(certify).toContain("sampled_control_quantities; exhaustive consecutive validation remains a local test gate");
  });

  it("changes live state only in one guarded transaction and has an atomic reverse path", () => {
    const activate = read("13_activate_atomic_candidate.sql");
    const rollback = read("14_rollback_atomic_candidate.sql");
    expect(activate).toMatch(/^--[\s\S]*BEGIN;/);
    expect(activate).toContain("COMMIT;");
    expect(activate).toContain("catalog_price_v2_release_pointer");
    expect(activate).toContain("cost_factor = 1.0000");
    expect(activate).toContain("enabled = true");
    expect(activate).toContain("v_candidate.catalog_generation_id");
    expect(rollback).toMatch(/^--[\s\S]*BEGIN;/);
    expect(rollback).toContain("jsonb_populate_record(NULL::public.producto_precio_escalas");
    expect(rollback).toContain("jsonb_populate_record(NULL::public.producto_proveedor_stock");
    expect(rollback).toContain("status = 'rolled_back'");
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
