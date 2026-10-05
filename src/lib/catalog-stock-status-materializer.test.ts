import { describe, expect, it, vi } from "vitest";
import { recomputeProductStockStatus } from "../../supabase/functions/_shared/catalog-stock-status";
import { runMaterializationOnlyDryRun } from "../../supabase/functions/refresh-provider-stock/materialization-only";

type Row = Record<string, unknown>;

function createFakeClient(initialTables: Record<string, Row[]>) {
  const tables = new Map(Object.entries(initialTables).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]));
  const writes: Array<{ table: string; operation: string; row: Row }> = [];
  const calls: string[] = [];

  const client = {
    from(table: string) {
      calls.push(table);
      let rows = tables.get(table) ?? [];
      let pendingUpdate: Row | null = null;
      let pendingInsert: Row | null = null;

      const query = {
        select() {
          return query;
        },
        in(column: string, values: string[]) {
          rows = rows.filter((row) => values.includes(String(row[column])));
          return query;
        },
        eq(column: string, value: unknown) {
          if (pendingUpdate) {
            const target = rows.find((row) => row[column] === value);
            if (target) {
              Object.assign(target, pendingUpdate);
              writes.push({ table, operation: "update", row: { ...target } });
            }
            return query;
          }
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        order(column: string, options: { ascending: boolean }) {
          rows = [...rows].sort((left, right) => {
            const leftValue = String(left[column] ?? "");
            const rightValue = String(right[column] ?? "");
            return options.ascending
              ? leftValue.localeCompare(rightValue)
              : rightValue.localeCompare(leftValue);
          });
          return query;
        },
        update(values: Row) {
          pendingUpdate = values;
          return query;
        },
        insert(values: Row) {
          pendingInsert = values;
          return query;
        },
        then(resolve: (value: { data: Row[]; error: null }) => unknown) {
          if (pendingInsert) {
            const inserted = { ...pendingInsert };
            const currentRows = tables.get(table) ?? [];
            currentRows.push(inserted);
            tables.set(table, currentRows);
            writes.push({ table, operation: "insert", row: inserted });
            return Promise.resolve(resolve({ data: [inserted], error: null }));
          }
          return Promise.resolve(resolve({ data: rows, error: null }));
        },
      };

      return query;
    },
    writes,
    calls,
  };

  return client;
}

const baseTables = {
  producto_b2b_oferta_map: [
    { producto_b2b_id: "p1", oferta_id: "o1", provider_code: "cdo_mx", id_interno: "pp-p1" },
    { producto_b2b_id: "p1", oferta_id: "o2", provider_code: "g4_mx", id_interno: "pp-p1" },
  ],
  producto_proveedor_ofertas: [
    { id: "o1", provider_raw_product_id: "r1", imagen_url: "https://img/o1", activo: true },
    { id: "o2", provider_raw_product_id: "r2", imagen_url: "https://img/o2", activo: true },
  ],
  // Deliberately no productos_b2b_id: the operational map is the lineage used here.
  provider_raw_products: [
    { id: "r1", activo: true },
    { id: "r2", activo: true },
  ],
  producto_proveedor_stock: [
    { oferta_id: "o1", cantidad: 20, updated_at: "2026-10-01T10:00:00.000Z" },
    { oferta_id: "o2", cantidad: 35, updated_at: "2026-10-03T10:00:00.000Z" },
  ],
  producto_b2b_status: [
    {
      id: "s1",
      producto_b2b_id: "p1",
      id_interno: "pp-p1",
      public_visible: true,
      stock_status: "bajo",
      stock_qty: 20,
      quote_mode: "cotizable",
      kit_eligible: true,
      price_valid: true,
      image_available: true,
      last_stock_sync_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
  ],
};

describe("catalog stock status materializer", () => {
  it("resolves affected products through oferta_map with multiple providers", async () => {
    const client = createFakeClient(baseTables);
    const result = await recomputeProductStockStatus(
      client as Parameters<typeof recomputeProductStockStatus>[0],
      ["p1"],
      { dryRun: false, affectedOfferIds: ["o1", "o2"] },
    );

    expect(result.failed_product_ids).toEqual([]);
    expect(result.recomputed_product_ids).toEqual(["p1"]);
    expect(result.products[0]).toMatchObject({
      provider_codes: ["cdo_mx", "g4_mx"],
      computed_stock_qty: 55,
      computed_stock_status: "disponible",
      computed_last_stock_sync_at: "2026-10-03T10:00:00.000Z",
      changed: true,
    });
    expect(client.writes).toHaveLength(1);
    expect(client.writes[0].table).toBe("producto_b2b_status");
  });

  it("supports dry-run without writes and reports the product delta", async () => {
    const client = createFakeClient(baseTables);
    const result = await recomputeProductStockStatus(
      client as Parameters<typeof recomputeProductStockStatus>[0],
      ["p1"],
      { dryRun: true, affectedOfferIds: ["o1", "o2"] },
    );

    expect(result.dry_run).toBe(true);
    expect(result.products[0].changed).toBe(true);
    expect(result.recomputed_product_ids).toEqual([]);
    expect(client.writes).toEqual([]);
  });

  it("is idempotent when the status already matches the source", async () => {
    const tables = structuredClone(baseTables);
    tables.producto_b2b_status[0] = {
      ...tables.producto_b2b_status[0],
      public_visible: true,
      stock_status: "disponible",
      stock_qty: 55,
      quote_mode: "cotizable",
      kit_eligible: true,
      last_stock_sync_at: "2026-10-03T10:00:00.000Z",
    };
    const client = createFakeClient(tables);
    const result = await recomputeProductStockStatus(
      client as Parameters<typeof recomputeProductStockStatus>[0],
      ["p1"],
      { dryRun: false },
    );

    expect(result.products[0].changed).toBe(false);
    expect(result.recomputed_product_ids).toEqual([]);
    expect(client.writes).toEqual([]);
  });

  it("runs materialization-only dry-run without refresh writes or provider work", async () => {
    const client = createFakeClient(baseTables);
    const providerFetch = vi.spyOn(globalThis, "fetch");

    const result = await runMaterializationOnlyDryRun(
      client as Parameters<typeof runMaterializationOnlyDryRun>[0],
      ["p1"],
    );

    expect(result).toMatchObject({
      ok: true,
      mode: "dry_run",
      materialization_only: true,
      writes: 0,
      affected_offers: 2,
      affected_products: 1,
      recomputed_products: 0,
      failed_products: 0,
    });
    expect(result.products[0]).toMatchObject({
      product_id: "p1",
      computed_stock_qty: 55,
      computed_last_stock_sync_at: "2026-10-03T10:00:00.000Z",
    });
    expect(result.errors).toEqual([]);
    expect(client.writes).toEqual([]);
    expect(client.calls).not.toEqual(expect.arrayContaining([
      "stock_refresh_runs",
      "stock_refresh_run_items",
      "stock_refresh_cursors",
      "producto_b2b_status",
    ]));
    expect(providerFetch).not.toHaveBeenCalled();

    providerFetch.mockRestore();
  });
});
