import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_BATCHES_PER_TICK,
  advanceProviderCursor,
  assessProviderBatch,
  completedToday,
  cycleStatus,
  createInitialProviderCursor,
  mexicoCityDay,
  normalizeProvider,
} from "../../supabase/functions/_shared/refresh-provider-stock-runtime";

const refreshSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/refresh-provider-stock/index.ts"),
  "utf8",
);
const runtimeSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/refresh-provider-stock-runtime.ts"),
  "utf8",
);
const lockMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261005090000_catalog_stock_refresh_lock_v1.sql"),
  "utf8",
);
const cdoCursorMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261005100000_catalog_stock_refresh_cdo_cursor_v1.sql"),
  "utf8",
);
const cronControl = readFileSync(
  resolve(process.cwd(), "supabase/sql/catalog-stock-refresh-cron-v1.sql"),
  "utf8",
);
const cronRollback = readFileSync(
  resolve(process.cwd(), "supabase/sql/catalog-stock-refresh-cron-rollback-v1.sql"),
  "utf8",
);
const cronPreflight = readFileSync(
  resolve(process.cwd(), "supabase/sql/catalog-stock-refresh-cron-preflight-readonly-v1.sql"),
  "utf8",
);
const supabaseConfig = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8",
);

describe("refresh-provider-stock runtime contract", () => {
  it("normalizes canonical provider codes and existing cron aliases", () => {
    expect(normalizeProvider("cdo")).toBe("cdo_mx");
    expect(normalizeProvider("cdo_mx")).toBe("cdo_mx");
    expect(normalizeProvider("g4")).toBe("g4_mx");
    expect(normalizeProvider("g4_mx")).toBe("g4_mx");
    expect(normalizeProvider("forpromotional")).toBe("forpromotional");
    expect(normalizeProvider("unknown")).toBeNull();
  });

  it("keeps production ticks bounded to three batches", () => {
    expect(MAX_BATCHES_PER_TICK).toBe(3);
  });

  it("calculates the Mexico City operational day", () => {
    expect(mexicoCityDay("2026-10-05T05:30:00.000Z")).toBe("2026-10-04");
    expect(mexicoCityDay("2026-10-05T07:30:00.000Z")).toBe("2026-10-05");
  });

  it("blocks a second completed cycle on the same operational day", () => {
    expect(
      completedToday("2026-10-05T12:00:00.000Z", new Date("2026-10-05T18:00:00.000Z")),
    ).toBe(true);
    expect(
      completedToday("2026-10-04T12:00:00.000Z", new Date("2026-10-05T18:00:00.000Z")),
    ).toBe(false);
  });

  it("rejects partial provider batches before materialization", () => {
    expect(assessProviderBatch("cdo_mx", { ok: true, status: "partial" }, 200)).toMatchObject({ ok: false });
    expect(assessProviderBatch("forpromotional", { ok: true, items_failed: 1 }, 200)).toMatchObject({ ok: false });
    expect(assessProviderBatch("g4_mx", { ok: true, stock_failed: 1 }, 200)).toMatchObject({ ok: false });
  });

  it("initializes every provider cursor with the production NOT NULL contract", () => {
    expect(createInitialProviderCursor("cdo_mx")).toEqual({
      next_offset: 0,
      next_page: 1,
      next_offer_offset: 0,
      cycle_count: 0,
      last_completed_cycle_at: null,
    });
    expect(createInitialProviderCursor("forpromotional")).toEqual({
      next_offset: 0,
      next_page: 1,
      next_offer_offset: null,
      cycle_count: 0,
      last_completed_cycle_at: null,
    });
    expect(createInitialProviderCursor("g4_mx")).toEqual({
      next_offset: 0,
      next_page: 1,
      next_offer_offset: null,
      cycle_count: 0,
      last_completed_cycle_at: null,
    });
  });

  it("accepts complete batches and requires every provider cycle for completion", () => {
    expect(assessProviderBatch("g4_mx", { ok: true, status: "ok", stock_failed: 0 }, 200)).toEqual({ ok: true });
    expect(cycleStatus({
      providers: ["cdo_mx"],
      summaries: { cdo_mx: { cycles_completed: 0 } },
      errors: [],
    })).toBe("in_progress");
    expect(cycleStatus({
      providers: ["cdo_mx", "g4_mx"],
      summaries: {
        cdo_mx: { cycles_completed: 1 },
        g4_mx: { cycles_completed: 1 },
      },
      errors: [],
    })).toBe("completed");
    expect(cycleStatus({
      providers: ["cdo_mx"],
      summaries: { cdo_mx: { cycles_completed: 1 } },
      errors: [{ provider: "cdo_mx" }],
    })).toBe("failed");
  });

  it("keeps CDO offer and page cursors separate until both dimensions finish", () => {
    const initial = {
      next_offset: 0,
      next_page: 2,
      next_offer_offset: 0,
      cycle_count: 0,
      last_completed_cycle_at: null,
    };

    const offers = advanceProviderCursor("cdo_mx", initial, {
      has_more_pages: true,
      has_more_offers: true,
      next_page: 3,
      next_offer_offset: 500,
    }, 2);
    expect(offers).toMatchObject({ ok: true, completed: false });
    if (offers.ok) {
      expect(offers.cursor.next_page).toBe(2);
      expect(offers.cursor.next_offer_offset).toBe(500);
    }

    const nextPage = advanceProviderCursor("cdo_mx", initial, {
      has_more_pages: true,
      has_more_offers: false,
      next_page: 3,
    }, 2);
    expect(nextPage).toMatchObject({ ok: true, completed: false });
    if (nextPage.ok) {
      expect(nextPage.cursor.next_page).toBe(3);
      expect(nextPage.cursor.next_offer_offset).toBe(0);
    }

    const complete = advanceProviderCursor("cdo_mx", initial, {
      has_more_pages: false,
      has_more_offers: false,
    }, 2);
    expect(complete).toMatchObject({ ok: true, completed: true });
    if (complete.ok) {
      expect(complete.cursor.next_page).toBe(1);
      expect(complete.cursor.next_offer_offset).toBe(0);
      expect(complete.cursor.cycle_count).toBe(1);
    }

    expect(advanceProviderCursor("cdo_mx", initial, {
      has_more_pages: true,
      has_more_offers: true,
    }, 2)).toMatchObject({ ok: false });
    expect(advanceProviderCursor("cdo_mx", initial, {
      has_more_pages: true,
      has_more_offers: false,
    }, 2)).toMatchObject({ ok: false });
  });

  it("keeps retries on the same non-CDO cursor when next_offset is invalid", () => {
    const cursor = {
      next_offset: 100,
      next_page: 1,
      next_offer_offset: null,
      cycle_count: 0,
      last_completed_cycle_at: null,
    };
    expect(advanceProviderCursor("forpromotional", cursor, { has_more: true })).toMatchObject({ ok: false });
    const next = advanceProviderCursor("g4_mx", cursor, { has_more: true, next_offset: 200 });
    expect(next).toMatchObject({ ok: true, completed: false });
    if (next.ok) expect(next.cursor.next_offset).toBe(200);
  });

  it("keeps the production orchestration contract explicit", () => {
    expect(refreshSource).toContain('req.headers.get("x-stock-refresh-key")');
    expect(refreshSource).toContain('url.searchParams.get("cron_key")');
    expect(refreshSource).toContain("providedHeaderCron.length > 0");
    expect(refreshSource).toContain('jsonResponse(401');
    expect(refreshSource).toContain("MAX_BATCHES_PER_TICK");
    expect(refreshSource).toContain("batchesExecuted < maxBatches");
    expect(refreshSource).toContain('sync_stock: "true"');
    expect(refreshSource).toContain("cycle_status");
    expect(refreshSource).toContain("renew_stock_refresh_lock");
    expect(refreshSource).toContain("release_stock_refresh_lock");
    expect(refreshSource).toContain("items_failed");
    expect(refreshSource).toContain("stock_failed");
    expect(refreshSource).toContain("has_more");
    expect(refreshSource).toContain("next_offset");
    expect(refreshSource).toContain("next_page");
    expect(refreshSource).toContain("already_completed_today");
    expect(refreshSource).toContain('lockScopes = mode === "full"');
    expect(refreshSource).toContain('"catalog_materialization",');
    expect(refreshSource).toContain("reset_cursor_not_allowed_in_full_mode");
    expect(refreshSource).toContain("has_more_pages");
    expect(refreshSource).toContain("has_more_offers");
    expect(refreshSource).toContain("next_offer_offset");
    expect(refreshSource).toContain(".upsert(cursorRows");
    expect(refreshSource).toContain("createInitialProviderCursor(p)");
    expect(refreshSource).not.toContain('next_offset: p === "cdo_mx" ? null : 0');
    expect(refreshSource).not.toContain('next_page: p === "cdo_mx" ? 1 : null');
    expect(cdoCursorMigration).toContain("stock_refresh_run_items");
    expect(supabaseConfig).toContain('[functions.refresh-provider-stock]');
    expect(supabaseConfig).toContain('[functions.refresh-provider-stock]\nverify_jwt = false');
  });

  it("does not advance cursors after a failed provider or materialization batch", () => {
    const failedBatchGuard = refreshSource.indexOf('if (itemStatus === "failed")');
    const cursorAdvance = refreshSource.indexOf("advanceProviderCursor(");
    expect(failedBatchGuard).toBeGreaterThan(-1);
    expect(cursorAdvance).toBeGreaterThan(failedBatchGuard);
    expect(refreshSource).toContain("status materialization failed");
    expect(runtimeSource).toContain("provider batch partial or items_failed");
    expect(runtimeSource).toContain("g4 stock_failed");
  });

  it("defines durable lock acquire, renew, and release contracts", () => {
    expect(lockMigration).toContain("stock_refresh_locks");
    expect(lockMigration).toContain("acquire_stock_refresh_lock");
    expect(lockMigration).toContain("renew_stock_refresh_lock");
    expect(lockMigration).toContain("release_stock_refresh_lock");
    expect(lockMigration).toContain("catalog_materialization");
    expect(lockMigration).not.toContain("'all'");
    expect(refreshSource).toContain("providerParam === \"all\" ? [...ALL_PROVIDERS]");
    expect(refreshSource).toContain("acquireLock(supabase, \"catalog_materialization\"");
    expect(refreshSource).toContain("releaseLock(supabase, \"catalog_materialization\"");
  });

  it("prepares only the three versioned cron jobs and keeps secrets out of URLs", () => {
    expect(cronControl).toContain("catalog-stock-refresh-cdo");
    expect(cronControl).toContain("catalog-stock-refresh-forpromotional");
    expect(cronControl).toContain("catalog-stock-refresh-g4");
    expect(cronControl).toContain("max_batches=3");
    expect(cronControl).toContain("0-55/5 14-21 * * *");
    expect(cronControl).toContain("1-56/5 14-21 * * *");
    expect(cronControl).toContain("2-57/5 14-21 * * *");
    expect(cronControl).not.toContain("0-55/5 8-15 * * *");
    expect(cronControl).toContain("x-stock-refresh-key");
    expect(cronControl).toContain("vault.decrypted_secrets");
    expect(cronControl).not.toContain("cron_key=");
    expect(cronControl).not.toContain("STOCK_REFRESH_CRON_KEY=");
    expect(cronControl).toContain("cron-preflight-readonly-v1.sql");
    expect(cronPreflight).toContain("current_setting('cron.timezone', true)");
    expect(cronPreflight).toContain("stock_refresh_cursors");
    expect(cronPreflight).toContain("c.is_nullable = 'NO'");
    expect(cronPreflight).toContain("c.is_nullable = 'YES'");
    expect(cronPreflight).toContain("stock_refresh_runs");
    expect(cronPreflight).toContain("c.column_name = 'result'");
    expect(cronPreflight).toContain("c.data_type = 'jsonb'");
    expect(cronPreflight).toContain("c.column_name = 'error'");
    expect(cronPreflight).toContain("c.column_name = 'finished_at'");
    expect(cronPreflight).toContain("vault_runtime_capability");
    expect(cronPreflight).toContain("to_regclass('vault.secrets')");
    expect(cronPreflight).toContain("secret_metadata");
    expect(cronPreflight).not.toMatch(/decrypted_secret(?!s)/);
    expect(cronPreflight).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b|cron\.schedule|net\.http_post/i);
    expect(cronRollback).toContain("catalog-stock-refresh-cdo");
    expect(cronRollback).toContain("cron.unschedule");
    expect(cronRollback).not.toContain("stock_refresh_runs");
  });

  it("does not add a destructive stale-run cleanup", () => {
    expect(refreshSource).not.toMatch(/stock_refresh_runs[\s\S]{0,160}\.delete\(/);
    expect(cronControl).not.toContain("stock_refresh_runs");
    expect(refreshSource).toContain('cycle_status: "in_progress"');
    expect(refreshSource.indexOf('stage = "run_close"')).toBeLessThan(refreshSource.indexOf('stage = "cursors_save"'));
    expect(refreshSource).toContain("runItemError");
    expect(refreshSource).toContain("preCursorRunUpdate.error");
  });
});
