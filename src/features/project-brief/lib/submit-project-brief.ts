import { supabase } from "@/integrations/supabase/client";
import type { SubmitProjectBriefPayload } from "./project-brief";

export type SubmitProjectBriefResult = "created" | "replay";

export type SubmitProjectBriefInvoker = (
  functionName: string,
  options: { body: SubmitProjectBriefPayload },
) => Promise<{ data: unknown; error: unknown }>;

export class SubmitProjectBriefError extends Error {
  constructor(
    public readonly status: number,
    public readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "SubmitProjectBriefError";
  }
}

export function submitProjectBriefErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Revisa los datos e intenta nuevamente.";
    case 409:
      return "No pudimos confirmar la solicitud. Intenta nuevamente.";
    case 429:
      return "Has enviado varias solicitudes recientemente. Espera un poco antes de intentar nuevamente.";
    case 503:
      return "El servicio no está disponible temporalmente. Intenta más tarde.";
    default:
      return "No pudimos enviar tu solicitud. Intenta nuevamente.";
  }
}

function statusFromError(error: unknown): number {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) return context.status;
    if (context && typeof context === "object" && "status" in context) {
      const status = (context as { status?: unknown }).status;
      if (typeof status === "number") return status;
    }
  }
  return 500;
}

const defaultInvoker: SubmitProjectBriefInvoker = (functionName, options) =>
  supabase.functions.invoke(functionName, options);

export async function submitProjectBrief(
  payload: SubmitProjectBriefPayload,
  invoke: SubmitProjectBriefInvoker = defaultInvoker,
): Promise<SubmitProjectBriefResult> {
  const { data, error } = await invoke("submit-project-brief", { body: payload });

  if (error) {
    const status = statusFromError(error);
    throw new SubmitProjectBriefError(status, submitProjectBriefErrorMessage(status));
  }

  if (!data || typeof data !== "object") {
    throw new SubmitProjectBriefError(500, submitProjectBriefErrorMessage(500));
  }

  const result = (data as { result?: unknown }).result;
  if (result !== "created" && result !== "replay") {
    throw new SubmitProjectBriefError(500, submitProjectBriefErrorMessage(500));
  }

  return result;
}
