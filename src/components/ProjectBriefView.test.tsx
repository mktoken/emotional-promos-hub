import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectBriefView from "./ProjectBriefView";

const mocked = vi.hoisted(() => ({
  submitProjectBrief: vi.fn(),
}));

vi.mock("@/features/project-brief/lib/submit-project-brief", () => ({
  submitProjectBrief: mocked.submitProjectBrief,
  SubmitProjectBriefError: class SubmitProjectBriefError extends Error {
    userMessage = this.message;
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("ProjectBriefView RB3-C submit", () => {
  it("bloquea doble submit mientras la misma solicitud está pendiente", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    let resolveSubmit: (result: "created" | "replay") => void = () => {};
    mocked.submitProjectBrief.mockImplementation(
      () => new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    render(<ProjectBriefView onBack={vi.fn()} />);
    fireEvent.change(document.getElementById("project_objective")!, { target: { value: "Regalos para evento anual" } });
    fireEvent.change(document.getElementById("quantity")!, { target: { value: "100" } });
    fireEvent.change(document.getElementById("target_date")!, { target: { value: "2026-12-01" } });
    fireEvent.change(document.getElementById("contact_name")!, { target: { value: "Ana" } });
    fireEvent.change(document.getElementById("email")!, { target: { value: "ana@empresa.com" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Aviso de Privacidad/ }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar solicitud" }));

    const sendButton = screen.getByRole("button", { name: "Enviar solicitud" });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(mocked.submitProjectBrief).toHaveBeenCalledTimes(1);
    expect(mocked.submitProjectBrief.mock.calls[0][0].request_id).toEqual(expect.any(String));

    resolveSubmit("created");
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });
});
