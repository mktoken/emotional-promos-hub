import { afterEach, describe, expect, it, vi } from "vitest";
import { QuoteRequestIdManager, computePayloadFingerprint } from "./quote-request-id";

describe("QuoteRequestIdManager", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("conserva el UUID para el mismo fingerprint y genera otro al cambiar", () => {
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");

    vi.stubGlobal("crypto", { randomUUID });

    const manager = new QuoteRequestIdManager();
    const first = manager.getOrCreate("payload-a");
    const retry = manager.getOrCreate("payload-a");
    const changed = manager.getOrCreate("payload-b");

    expect(first).toBe("11111111-1111-4111-8111-111111111111");
    expect(retry).toBe(first);
    expect(changed).toBe("22222222-2222-4222-8222-222222222222");
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });

  it("clear elimina el UUID actual", () => {
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");

    vi.stubGlobal("crypto", { randomUUID });

    const manager = new QuoteRequestIdManager();
    manager.getOrCreate("payload-a");
    expect(manager.peek()).not.toBeNull();

    manager.clear();
    expect(manager.peek()).toBeNull();
    expect(manager.getOrCreate("payload-a")).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("crea un fingerprint estable sin timestamps", () => {
    const left = computePayloadFingerprint({
      contact: { email: "a@example.com", name: "Ana" },
      items: [{ quantity: 100, product_id: "p1" }],
    });
    const right = computePayloadFingerprint({
      items: [{ product_id: "p1", quantity: 100 }],
      contact: { name: "Ana", email: "a@example.com" },
    });

    expect(left).toBe(right);
    expect(left).not.toMatch(/\b1[6-9]\d{11}\b/);
  });
});
