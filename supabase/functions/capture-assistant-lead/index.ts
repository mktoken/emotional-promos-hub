import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createCaptureAssistantLeadHandler,
  createCloudflareTurnstileVerifier,
  isAssistantCaptureEnabled,
} from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";

function readAdminKey(): string {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw);
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Continue to the legacy service role secret.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const adminKey = readAdminKey();
const admin = supabaseUrl && adminKey
  ? createClient(supabaseUrl, adminKey, { auth: { persistSession: false } })
  : null;
const turnstileVerifier = createCloudflareTurnstileVerifier(
  Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY") ?? "",
);
const turnstileAllowedHostnames = new Set(
  (Deno.env.get("CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES") ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean),
);

Deno.serve(createCaptureAssistantLeadHandler({
  captureEnabled: isAssistantCaptureEnabled(Deno.env.get("PE_ASSISTANT_CAPTURE_ENABLED")),
  rpc: admin
    ? async (args) => await admin.rpc("capture_assistant_lead_internal", args)
    : null,
  turnstileVerifier,
  turnstileAllowedHostnames,
}));
