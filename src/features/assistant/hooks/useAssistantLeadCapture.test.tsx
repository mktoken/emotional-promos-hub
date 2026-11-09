// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import { useAssistantLeadCapture } from "./useAssistantLeadCapture";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const BASE_ARGS = {
  captured: { contact_name: "Ana Pérez", whatsapp: "5512345678" },
  messages: [{ role: "user" as const, message: "Busco termos" }],
  privacyConsent: true,
  honeypot: "",
};

describe("useAssistantLeadCapture Turnstile retries", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => REQUEST_ID) });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the same idempotency key when retrying with a fresh Turnstile token", async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { success: true, result: "created" }, error: null })
      .mockResolvedValueOnce({ data: { success: true, result: "replay" }, error: null });
    const { result } = renderHook(() => useAssistantLeadCapture());

    await act(async () => {
      await result.current.submit({ ...BASE_ARGS, turnstileToken: "first-token" });
    });
    await act(async () => {
      await result.current.submit({ ...BASE_ARGS, turnstileToken: "fresh-token" });
    });

    const firstBody = invokeMock.mock.calls[0][1].body;
    const retryBody = invokeMock.mock.calls[1][1].body;
    expect(firstBody.request_id).toBe(REQUEST_ID);
    expect(retryBody.request_id).toBe(firstBody.request_id);
    expect(firstBody.turnstile_token).toBe("first-token");
    expect(retryBody.turnstile_token).toBe("fresh-token");
  });

  it("does not invoke the Edge Function without a challenge token", async () => {
    const { result } = renderHook(() => useAssistantLeadCapture());
    let caught: unknown;

    await act(async () => {
      try {
        await result.current.submit({ ...BASE_ARGS, turnstileToken: "" });
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe("No pudimos registrar la solicitud. Inténtalo de nuevo más tarde.");
  });
});
