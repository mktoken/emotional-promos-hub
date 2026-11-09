import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CapturedData } from "@/features/assistant/lib/assistant-flow";

export interface ChatMsg {
  role: "assistant" | "user";
  message: string;
}

export interface AssistantError {
  message: string;
}

const GENERIC_ERROR = "No pudimos registrar la solicitud. Inténtalo de nuevo más tarde.";

export function useAssistantLeadCapture() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  const [success, setSuccess] = useState(false);
  const requestRef = useRef<{ id: string; payload: string } | null>(null);

  function reset() {
    setError(null);
    setSuccess(false);
    setLoading(false);
    requestRef.current = null;
  }

  async function submit(args: {
    captured: CapturedData;
    messages: ChatMsg[];
    privacyConsent: boolean;
    honeypot: string;
    turnstileToken: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      if (!args.turnstileToken.trim()) throw new Error(GENERIC_ERROR);
      const payloadFingerprint = JSON.stringify({
        captured: args.captured,
        messages: args.messages,
        privacyConsent: args.privacyConsent,
      });
      const requestId = requestRef.current?.payload === payloadFingerprint
        ? requestRef.current.id
        : crypto.randomUUID();
      requestRef.current = { id: requestId, payload: payloadFingerprint };
      const { data, error: functionError } = await supabase.functions.invoke(
        "capture-assistant-lead",
        {
          body: {
            request_id: requestId,
            privacy_consent: args.privacyConsent,
            honeypot: args.honeypot,
            turnstile_token: args.turnstileToken,
            captured: args.captured,
            messages: args.messages,
          },
        },
      );

      if (functionError || !data || typeof data !== "object" || (data as { success?: boolean }).success !== true) {
        throw new Error(GENERIC_ERROR);
      }
      setSuccess(true);
      return { success: true };
    } catch (cause) {
      setError({ message: GENERIC_ERROR });
      throw cause;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, success, reset };
}
