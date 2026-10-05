import { describe, expect, it, vi } from "vitest";
import {
  buildSubmitProjectBriefPayload,
  emptyBrief,
  type SubmitProjectBriefPayload,
} from "./project-brief";
import {
  submitProjectBrief,
  submitProjectBriefErrorMessage,
  type SubmitProjectBriefInvoker,
} from "./submit-project-brief";

const requestId = "11111111-1111-4111-8111-111111111111";
const payload: SubmitProjectBriefPayload = buildSubmitProjectBriefPayload(
  {
    ...emptyBrief(),
    project_objective: "Regalos para evento anual",
    contact_name: "Ana",
    email: "ana@empresa.com",
    quantity: "100",
    target_date: "2026-12-01",
    privacy_consent: true,
  },
  requestId,
);

describe("Route B RB3-C Edge Function adapter", () => {
  it("invoca submit-project-brief y lleva created a success", async () => {
    const invoke = vi.fn<SubmitProjectBriefInvoker>().mockResolvedValue({
      data: { ok: true, result: "created", request_id: requestId },
      error: null,
    });

    await expect(submitProjectBrief(payload, invoke)).resolves.toBe("created");
    expect(invoke).toHaveBeenCalledWith("submit-project-brief", { body: payload });
  });

  it("lleva replay al mismo resultado de éxito", async () => {
    const invoke = vi.fn<SubmitProjectBriefInvoker>().mockResolvedValue({
      data: { ok: true, result: "replay", request_id: requestId },
      error: null,
    });

    await expect(submitProjectBrief(payload, invoke)).resolves.toBe("replay");
  });

  it("conserva el mismo request_id en un retry manual", async () => {
    const invoke = vi.fn<SubmitProjectBriefInvoker>()
      .mockResolvedValueOnce({ data: null, error: Object.assign(new Error("network"), { context: { status: 500 } }) })
      .mockResolvedValueOnce({ data: { ok: true, result: "replay", request_id: requestId }, error: null });

    await expect(submitProjectBrief(payload, invoke)).rejects.toMatchObject({ status: 500 });
    await expect(submitProjectBrief(payload, invoke)).resolves.toBe("replay");
    expect(invoke.mock.calls[0][1].body.request_id).toBe(invoke.mock.calls[1][1].body.request_id);
  });

  it.each([
    [400, "Revisa los datos e intenta nuevamente."],
    [409, "No pudimos confirmar la solicitud. Intenta nuevamente."],
    [429, "Has enviado varias solicitudes recientemente. Espera un poco antes de intentar nuevamente."],
    [503, "El servicio no está disponible temporalmente. Intenta más tarde."],
    [500, "No pudimos enviar tu solicitud. Intenta nuevamente."],
  ])("mapea HTTP %s al mensaje público aprobado", (status, message) => {
    expect(submitProjectBriefErrorMessage(status)).toBe(message);
  });
});
