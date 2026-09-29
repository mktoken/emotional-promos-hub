import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://articulospromocionales.vip",
  "https://www.articulospromocionales.vip",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);
const model = "google/gemini-3.7-flash";
const maxDataUrlLength = 14 * 1024 * 1024;
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function headers(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json" };
}
function reply(request: Request, status: number, body: unknown) { return new Response(JSON.stringify(body), { status, headers: headers(request) }); }
import { normalizeAnalysis } from "./normalize-analysis.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST") return reply(request, 405, { error: "method_not_allowed" });
  if (!allowedOrigins.has(request.headers.get("origin") ?? "")) return reply(request, 403, { error: "origin_not_allowed" });
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply(request, 401, { error: "authentication_required" });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return reply(request, 401, { error: "authentication_required" });
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return reply(request, 503, { error: "ai_gateway_unavailable" });
  try {
    const body = await request.json();
    const attachment = body?.attachment;
    const dataUrl = body?.dataUrl;
    if (!attachment || typeof dataUrl !== "string" || dataUrl.length > maxDataUrlLength || !allowedMime.has(attachment.mimeType) || !Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > 10 * 1024 * 1024) return reply(request, 400, { error: "invalid_attachment" });
    if (!dataUrl.startsWith(`data:${attachment.mimeType};base64,`)) return reply(request, 400, { error: "mime_mismatch" });
    const prompt = `Analiza este archivo visual comercial QA y devuelve SOLO JSON conforme al schema. Extrae solo lo visible. Usa value null, certainty unknown y confidence low cuando no sea legible. Nunca declares SKU, product_id, precio, stock, disponibilidad, Pantone, técnica, impresión, costo o entrega como autoridad. Tipo: ${attachment.type}. Contexto: ${JSON.stringify(body.commercialContext ?? {})}`;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: "Eres un extractor visual comercial conservador. No inventes datos." }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }], response_format: { type: "json_object" }, stream: false }) });
    if (response.status === 402) return reply(request, 402, { error: "credits_unavailable" });
    if (response.status === 429) return reply(request, 429, { error: "rate_limited" });
    if (!response.ok) return reply(request, 502, { error: "ai_gateway_error" });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return reply(request, 200, normalizeAnalysis(parsed));
  } catch (error) {
    console.error("commercial vision failed", error instanceof Error ? error.name : "unknown");
    return reply(request, 502, { error: "vision_processing_failed" });
  }
});
