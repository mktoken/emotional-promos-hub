import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CapturedData } from "@/features/assistant/lib/assistant-flow";

export interface ChatMsg {
  role: "assistant" | "user";
  message: string;
}

export function useAssistantLeadCapture() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setSuccess(true);
      return data as { ok: boolean; lead_id: string; session_id: string };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al enviar la solicitud";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, success };
}
