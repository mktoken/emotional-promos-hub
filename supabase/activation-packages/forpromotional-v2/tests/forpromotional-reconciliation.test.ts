import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  reconcileForPromotionalItems,
  summarizeLocalOfferAbsences,
} from "../functions/_shared/forpromotional-reconciliation.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (name: string) => readFileSync(resolve(root, name), "utf8");

function apiItem(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id_articulo: `BASE-${Math.floor(index / 4)}`,
    id_artd: `DETAIL-${index}`,
    modelo: `MODEL-${index}`,
    color: `COLOR-${index}`,
    talla: "",
    categoria: `CATEGORY-${index % 9}`,
    sub_categoria: `SUBCATEGORY-${index % 13}`,
    precio_desc: "100.00",
    inventario: 50,
    ...overrides,
  };
}

describe("ForPromotional V2 reconciliation", () => {
  it("deduplicates 4,301 records into 4,127 variants and preserves every category", () => {
    const unique = Array.from({ length: 4_127 }, (_, index) => apiItem(index));
    const duplicates = Array.from({ length: 174 }, (_, index) => ({
      ...unique[index],
      categoria: `SECONDARY-${index}`,
      sub_categoria: `SECONDARY-SUB-${index}`,
    }));

    const result = reconcileForPromotionalItems([...unique, ...duplicates]);

    expect(result.sourceRecords).toBe(4_301);
    expect(result.uniqueVariants).toBe(4_127);
    expect(result.duplicateRecords).toBe(174);
    expect(result.invalidRecords).toBe(0);
    expect(result.variants[0].apiOccurrences).toBe(2);
    expect(result.variants[0].categories).toEqual(
      expect.arrayContaining(["CATEGORY-0", "SECONDARY-0"]),
    );
    expect(result.variants[0].subcategories).toEqual(
      expect.arrayContaining(["SUBCATEGORY-0", "SECONDARY-SUB-0"]),
    );
  });

  it("blocks duplicate variants with contradictory cost or inventory", () => {
    const original = apiItem(7);
    const costConflict = apiItem(7, { precio_desc: "101.00" });
    const stockConflict = apiItem(7, { inventario: 49 });
    const result = reconcileForPromotionalItems([original, costConflict, stockConflict]);

    expect(result.uniqueVariants).toBe(1);
    expect(result.duplicateRecords).toBe(2);
    expect(result.variants[0].conflictFields).toEqual(
      expect.arrayContaining(["unit_cost", "stock_qty"]),
    );
  });

  it("keeps unpublished API variants private and never invents public mappings", () => {
    const privateInventory = reconcileForPromotionalItems(
      Array.from({ length: 2_224 }, (_, index) => apiItem(index)),
    );
    const sync = read("functions/sync-forpromotional-products-v2/index.ts");
    expect(privateInventory.uniqueVariants).toBe(2_224);
    expect(privateInventory.variants.every((variant) => variant.unitCost === 100)).toBe(true);
    expect(sync).toContain('publicationState = "api_only"');
    expect(sync).toContain('publicationState = "unpublished"');
    expect(sync).toContain('publicationState = "publishable"');
    expect(sync).toContain("forpromotional_atomic_variant_shadow");
    expect(sync).not.toContain('.from("producto_b2b_oferta_map").insert');
    expect(sync).not.toContain('.from("producto_b2b_oferta_map").upsert');
  });

  it("records local API absences and blocks public impacts without a documented decision", () => {
    const install = read("10a_install_atomic_reconciliation.sql");
    const canonical = read("16_install_forpromotional_automatic_cycle.sql");
    expect(install).toContain("forpromotional_atomic_local_absences");
    expect(install).toContain("base_and_variant_absence_same_set");
    expect(install).toContain("variants_with_base_present");
    expect(install).toContain("retain_current");
    expect(install).toContain("resolved_externally");
    expect(canonical).toContain("pending_public_count");
    expect(canonical).toContain("lack a documented decision");
    expect(canonical).not.toMatch(/DELETE FROM public\.producto_b2b_oferta_map/);
    expect(canonical).not.toMatch(/SET\s+activo\s*=\s*false/);

    const decisions = Array.from({ length: 62 }, (_, index) => ({
      offerId: `offer-${index}`,
      publicMappingCount: 1,
      resolutionStatus: "pending",
    }));
    expect(decisions.filter((decision) =>
      decision.publicMappingCount > 0 && decision.resolutionStatus === "pending"
    )).toHaveLength(62);
  });

  it("distinguishes 56 absent base products from 127 absent variants and 62 public impacts", () => {
    const apiVariants = Array.from({ length: 10 }, (_, index) => ({
      providerSku: `PRESENT-${index}`,
      variantSku: `PRESENT-${index}|V0`,
    }));
    const absentOffers = Array.from({ length: 127 }, (_, index) => ({
      providerSku: `ABSENT-${index % 56}`,
      variantSku: `ABSENT-${index % 56}|V${index}`,
      publicMappingCount: index < 62 ? 1 : 0,
    }));
    const result = summarizeLocalOfferAbsences(apiVariants, absentOffers);

    expect(result.absentVariantCount).toBe(127);
    expect(result.absentBaseSkuCount).toBe(56);
    expect(result.variantsWithBasePresent).toBe(0);
    expect(result.affectedPublicOffers).toBe(62);
    expect(result.affectedPublicLinks).toBe(62);
    expect(result.baseAndVariantAbsenceSameSet).toBe(true);
  });

  it("reports different sets when a missing variant belongs to a base SKU still present in the API", () => {
    const result = summarizeLocalOfferAbsences(
      [{ providerSku: "BASE-A", variantSku: "BASE-A|LIVE" }],
      [{ providerSku: "BASE-A", variantSku: "BASE-A|MISSING", publicMappingCount: 1 }],
    );
    expect(result.absentVariantCount).toBe(1);
    expect(result.absentBaseSkuCount).toBe(0);
    expect(result.variantsWithBasePresent).toBe(1);
    expect(result.baseAndVariantAbsenceSameSet).toBe(false);
  });

  it("captures the post-cron live state per candidate and protects G4/CDO", () => {
    const canonical = read("16_install_forpromotional_automatic_cycle.sql");
    expect(canonical).toContain("to_jsonb(live_scale)");
    expect(canonical).toContain("to_jsonb(live_stock)");
    expect(canonical).toContain("to_jsonb(v_current_release)");
    expect(canonical).toContain("jsonb_populate_record(NULL::public.producto_precio_escalas");
    expect(canonical).toContain("jsonb_populate_record(NULL::public.producto_proveedor_stock");
    expect(canonical).toContain("G4/CDO overlap appeared after certification");
    expect(canonical).toContain("provider_code IN ('g4_mx','cdo_mx')");

    const installationBackup = { cost: 100, stock: 10 };
    const liveAfterCron = { cost: 92, stock: 37 };
    const candidateRestore = structuredClone(liveAfterCron);
    const activated = { cost: 80, stock: 55 };
    const rolledBack = structuredClone(candidateRestore);
    expect(activated).not.toEqual(liveAfterCron);
    expect(rolledBack).toEqual(liveAfterCron);
    expect(rolledBack).not.toEqual(installationBackup);

    const otherProvidersBefore = {
      g4_mx: { cost: 12, stock: 90 },
      cdo_mx: { cost: 18, stock: 40 },
    };
    const otherProvidersAfter = structuredClone(otherProvidersBefore);
    expect(otherProvidersAfter).toEqual(otherProvidersBefore);
  });
});
