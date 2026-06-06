import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CapturedData } from "@/features/assistant/lib/assistant-flow";

export interface ChatMsg {
  role: "assistant" | "user";
  message: string;
}

export interface AssistantError {
  stage?: string;
  error?: string;
  details?: string | null;
  message: string;
}

async function extractEdgeError(fnErr: unknown): Promise<AssistantError> {
  // supabase.functions.invoke returns FunctionsHttpError with `.context` (Response).
  const fallback: AssistantError = {
    message:
      fnErr instanceof Error
        ? fnErr.message
        : "Error al enviar la solicitud",
  };
  try {
    const anyErr = fnErr as { context?: Response; message?: string };
    const ctx = anyErr?.context;
    if (ctx && typeof ctx.clone === "function") {
      const txt = await ctx.clone().text();
      try {
        const parsed = JSON.parse(txt) as {
          stage?: string;
          error?: string;
          details?: string | null;
          message?: string;
        };
        const stage = parsed.stage;
        const error = parsed.error ?? parsed.message;
        const details = parsed.details ?? null;
        const parts: string[] = ["No se pudo registrar la solicitud."];
        if (stage) parts.push(`Etapa: ${stage}.`);
        if (error) parts.push(`Detalle: ${error}.`);
        return {
          stage,
          error,
          details: typeof details === "string" ? details : details ? JSON.stringify(details) : null,
          message: parts.join(" "),
        };
      } catch {
        if (txt) return { ...fallback, message: txt.slice(0, 500) };
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function useAssistantLeadCapture() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }

  async function submit(args: {
    captured: CapturedData;
    summary: string;
    messages: ChatMsg[];
  }) {
    setLoading(true);
    setError(null);
    try {
      const visitor_id =
        typeof window !== "undefined"
          ? localStorage.getItem("pe_visitor_id") ??
            (() => {
              const id = crypto.randomUUID();
              localStorage.setItem("pe_visitor_id", id);
              return id;
            })()
          : null;

      const { data, error: fnErr } = await supabase.functions.invoke(
        "capture-assistant-lead",
        { body: { ...args, visitor_id } },
      );

      if (fnErr) {
        const parsed = await extractEdgeError(fnErr);
        console.error("[assistant] edge error", {
          stage: parsed.stage,
          error: parsed.error,
          details: parsed.details,
        });
        setError(parsed);
        throw new Error(parsed.message);
      }
      if (data && typeof data === "object" && (data as { success?: boolean }).success === false) {
        const d = data as { stage?: string; error?: string; details?: string | null };
        const parts: string[] = ["No se pudo registrar la solicitud."];
        if (d.stage) parts.push(`Etapa: ${d.stage}.`);
        if (d.error) parts.push(`Detalle: ${d.error}.`);
        const parsed: AssistantError = {
          stage: d.stage,
          error: d.error,
          details: typeof d.details === "string" ? d.details : null,
          message: parts.join(" "),
        };
        console.error("[assistant] edge response error", parsed);
        setError(parsed);
        throw new Error(parsed.message);
      }
      setSuccess(true);
      return data as { success: boolean; lead_id: string; session_id: string; reused: boolean };
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, success, reset };
}
