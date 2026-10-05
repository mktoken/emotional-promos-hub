import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/refresh-provider-stock/index.ts"),
  "utf8",
);
const materializationSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/refresh-provider-stock/materialization-only.ts"),
  "utf8",
);

describe("refresh-provider-stock materialization-only dry run", () => {
  it("short-circuits before refresh writes and provider invocations", () => {
    const shortCircuit = source.indexOf(
      'if (mode === "dry_run" && materializeProductIds.length > 0)',
    );
    const cursorsLoad = source.indexOf('stage = "cursors_load"');
    const runOpen = source.indexOf('stage = "run_open"');
    const providerFetch = source.indexOf("await fetch(endpoint");

    expect(shortCircuit).toBeGreaterThan(-1);
    expect(shortCircuit).toBeLessThan(cursorsLoad);
    expect(shortCircuit).toBeLessThan(runOpen);
    expect(shortCircuit).toBeLessThan(providerFetch);
    expect(source).toContain("runMaterializationOnlyDryRun");
    expect(materializationSource).toContain('materialization_only: true');
    expect(materializationSource).toContain("writes: 0");
    expect(materializationSource).toContain("{ dryRun: true }");
  });
});
