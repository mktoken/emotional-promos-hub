export type Provider = "cdo_mx" | "forpromotional" | "g4_mx";

export const ALL_PROVIDERS: Provider[] = ["cdo_mx", "forpromotional", "g4_mx"];
export const MAX_BATCHES_PER_TICK = 3;
export const STOCK_REFRESH_LOCK_TTL_SECONDS = 900;

const PROVIDER_ALIASES: Record<string, Provider> = {
  cdo: "cdo_mx",
  cdo_mx: "cdo_mx",
  forpromotional: "forpromotional",
  g4: "g4_mx",
  g4_mx: "g4_mx",
};

export function normalizeProvider(raw: string): Provider | null {
  return PROVIDER_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function mexicoCityDay(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function completedToday(
  lastCompletedCycleAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(
    lastCompletedCycleAt &&
    mexicoCityDay(lastCompletedCycleAt) === mexicoCityDay(now),
  );
}

export type ProviderBatchResponse = Record<string, unknown> | null;

export interface ProviderCursorState {
  next_offset: number | null;
  next_page: number | null;
  next_offer_offset: number | null;
  cycle_count: number | null;
  last_completed_cycle_at: string | null;
}

export function advanceProviderCursor(
  provider: Provider,
  cursor: ProviderCursorState,
  response: ProviderBatchResponse,
  pageUsed: number | null = null,
): { ok: true; completed: boolean; cursor: ProviderCursorState } | { ok: false; reason: string } {
  const nextCursor = { ...cursor };

  if (provider === "cdo_mx") {
    const hasMoreOffers = Boolean(response?.has_more_offers);
    const hasMorePages = Boolean(response?.has_more_pages);

    if (hasMoreOffers) {
      const nextOfferOffset = response?.next_offer_offset;
      if (typeof nextOfferOffset !== "number" || nextOfferOffset < 0) {
        return { ok: false, reason: "CDO has_more_offers=true without next_offer_offset" };
      }
      nextCursor.next_page = pageUsed ?? nextCursor.next_page ?? 1;
      nextCursor.next_offer_offset = nextOfferOffset;
      return { ok: true, completed: false, cursor: nextCursor };
    }

    if (hasMorePages) {
      const nextPage = response?.next_page;
      if (typeof nextPage !== "number" || nextPage < 1) {
        return { ok: false, reason: "CDO has_more_pages=true without next_page" };
      }
      nextCursor.next_page = nextPage;
      nextCursor.next_offer_offset = 0;
      return { ok: true, completed: false, cursor: nextCursor };
    }

    nextCursor.next_page = 1;
    nextCursor.next_offer_offset = 0;
    nextCursor.cycle_count = (nextCursor.cycle_count ?? 0) + 1;
    nextCursor.last_completed_cycle_at = new Date().toISOString();
    return { ok: true, completed: true, cursor: nextCursor };
  }

  const hasMore = Boolean(response?.has_more);
  if (hasMore) {
    const nextOffset = response?.next_offset;
    if (typeof nextOffset !== "number" || nextOffset < 0) {
      return { ok: false, reason: `${provider} has_more=true without next_offset` };
    }
    nextCursor.next_offset = nextOffset;
    return { ok: true, completed: false, cursor: nextCursor };
  }

  nextCursor.next_offset = 0;
  nextCursor.cycle_count = (nextCursor.cycle_count ?? 0) + 1;
  nextCursor.last_completed_cycle_at = new Date().toISOString();
  return { ok: true, completed: true, cursor: nextCursor };
}

export function assessProviderBatch(
  provider: Provider,
  response: ProviderBatchResponse,
  httpStatus: number,
): { ok: true } | { ok: false; reason: string } {
  if (!response || httpStatus < 200 || httpStatus >= 300 || response.ok === false) {
    return { ok: false, reason: `HTTP ${httpStatus || 0} or provider response not ok` };
  }

  const status = String(response.status ?? "").toLowerCase();
  const itemsFailed = Number(response.items_failed ?? 0) || 0;
  const stockFailed = Number(response.stock_failed ?? 0) || 0;

  if (status === "partial" || itemsFailed > 0) {
    return { ok: false, reason: `provider batch partial or items_failed=${itemsFailed}` };
  }

  if (provider === "g4_mx" && stockFailed > 0) {
    return { ok: false, reason: `g4 stock_failed=${stockFailed}` };
  }

  return { ok: true };
}

export function cycleStatus(args: {
  providers: Provider[];
  summaries: Record<string, { cycles_completed: number }>;
  errors: unknown[];
}): "in_progress" | "completed" | "failed" {
  if (args.errors.length > 0) return "failed";
  return args.providers.every(
    (provider) => (args.summaries[provider]?.cycles_completed ?? 0) > 0,
  ) ? "completed" : "in_progress";
}
