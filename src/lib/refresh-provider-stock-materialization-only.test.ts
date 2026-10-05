import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideMaterializationRequest,
  TARGETED_MATERIALIZATION_MAX_PRODUCTS,
} from "../../supabase/functions/_shared/refresh-provider-stock-contract";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/refresh-provider-stock/index.ts"),
  "utf8",
);
const materializationSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/refresh-provider-stock/materialization-only.ts"),
  "utf8",
);

describe("refresh-provider-stock materialization-only dry run", () => {
  it("preserves dry-run materialization as read-only", () => {
    expect(decideMaterializationRequest({
      mode: "dry_run",
      materializationOnly: false,
      confirmMaterializationWrite: false,
      productIds: ["p1", "p2", "p3"],
    })).toEqual({ kind: "dry_run", reason: "materialization_only_dry_run" });
  });

  it("rejects full targeted requests without materialization_only", () => {
    expect(decideMaterializationRequest({
      mode: "full",
      materializationOnly: false,
      confirmMaterializationWrite: true,
      productIds: ["p1"],
    })).toEqual({ kind: "reject", reason: "targeted_write_requires_explicit_gates" });
  });

  it("rejects full targeted requests without confirmation", () => {
    expect(decideMaterializationRequest({
      mode: "full",
      materializationOnly: true,
      confirmMaterializationWrite: false,
      productIds: ["p1"],
    })).toEqual({ kind: "reject", reason: "targeted_write_requires_explicit_gates" });
  });

  it("rejects more than the canary maximum", () => {
    expect(TARGETED_MATERIALIZATION_MAX_PRODUCTS).toBe(3);
    expect(decideMaterializationRequest({
      mode: "full",
      materializationOnly: true,
      confirmMaterializationWrite: true,
      productIds: ["p1", "p2", "p3", "p4"],
    })).toEqual({ kind: "reject", reason: "max_targeted_products_exceeded" });
  });

  it("accepts only the explicitly confirmed targeted write", () => {
    expect(decideMaterializationRequest({
      mode: "full",
      materializationOnly: true,
      confirmMaterializationWrite: true,
      productIds: ["p1", "p2", "p3"],
    })).toEqual({ kind: "targeted_write", reason: "targeted_materialization_write" });
  });

  it("preserves normal full refresh when no product IDs are supplied", () => {
    expect(decideMaterializationRequest({
      mode: "full",
      materializationOnly: false,
      confirmMaterializationWrite: false,
      productIds: [],
    })).toEqual({ kind: "normal", reason: "normal_refresh" });
  });

  it("short-circuits before refresh writes and provider invocations", () => {
    const shortCircuit = source.indexOf('if (materializationDecision.kind === "dry_run")');
    const targetedWrite = source.indexOf('if (materializationDecision.kind === "targeted_write")');
    const cursorsLoad = source.indexOf('stage = "cursors_load"');
    const runOpen = source.indexOf('stage = "run_open"');
    const providerFetch = source.indexOf("await fetch(endpoint");

    expect(shortCircuit).toBeGreaterThan(-1);
    expect(targetedWrite).toBeGreaterThan(shortCircuit);
    expect(source).toContain('materialization_only: true');
    expect(source).toContain('confirm_materialization_write');
    expect(source).toContain("{ dryRun: false }");
    expect(source).toContain('write_scope: "producto_b2b_status"');
    expect(source).toContain("provider_calls: 0");
    expect(source).toContain("cursor_writes: 0");
    expect(source).toContain("run_table_writes: 0");
    expect(source).toContain("source_stock_writes: 0");
    expect(source).toContain("pricing_v2_writes: 0");
    expect(source).toContain("mapping_writes: 0");
    expect(shortCircuit).toBeLessThan(cursorsLoad);
    expect(targetedWrite).toBeLessThan(cursorsLoad);
    expect(shortCircuit).toBeLessThan(runOpen);
    expect(targetedWrite).toBeLessThan(runOpen);
    expect(shortCircuit).toBeLessThan(providerFetch);
    expect(targetedWrite).toBeLessThan(providerFetch);
    expect(source).toContain("runMaterializationOnlyDryRun");
    expect(materializationSource).toContain('materialization_only: true');
    expect(materializationSource).toContain("writes: 0");
    expect(materializationSource).toContain("{ dryRun: true }");
  });
});
