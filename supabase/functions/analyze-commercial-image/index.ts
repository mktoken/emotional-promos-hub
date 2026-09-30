import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";
import { createVisionV1Schema, readStructuredSse, visionJsonSchema, visionModel, VisionContractError } from "./vision-contract.ts";
import { failedVisionAnalysis, normalizeVisionV1 } from "./normalize-analysis.ts";

const allowedOrigins = new Set([
  "https://articulospromocionales.vip",
  "https://www.articulospromocionales.vip",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);
const maxDataUrlLength = 14 * 1024 * 1024;
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const schema = createVisionV1Schema(z);

function headers(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json" };
}
function reply(request: Request, status: number, body: unknown) { return new Response(JSON.stringify(body), { status, headers: headers(request) }); }
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
    if (attachment?.mimeType === "application/pdf") return reply(request, 200, { ...failedVisionAnalysis(), analysisStatus: "unsupported", error: "pdf_vision_unsupported" });
    if (!attachment || typeof dataUrl !== "string" || dataUrl.length > maxDataUrlLength || !allowedMime.has(attachment.mimeType) || !Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > 10 * 1024 * 1024) return reply(request, 400, { error: "invalid_attachment" });
    if (!dataUrl.startsWith(`data:${attachment.mimeType};base64,`)) return reply(request, 400, { error: "mime_mismatch" });
    if (attachment.mimeType === "image/gif" && !isSingleFrameGif(dataUrl)) return reply(request, 400, { error: "animated_gif_unsupported" });
    const prompt = `Analiza solo lo visible en esta imagen comercial. No inventes. Usa null si no se puede determinar. Identifica categoría aproximada, colores, materiales, componentes, branding y texto visibles. Tipo declarado: ${attachment.type}.`;
    const runId = request.headers.get("x-lovable-aig-run-id");
    const gatewayHeaders: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" };
    if (runId && /^[a-zA-Z0-9_-]{1,128}$/.test(runId)) gatewayHeaders["X-Lovable-AIG-Run-ID"] = runId;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", { method: "POST", headers: gatewayHeaders, body: JSON.stringify({
      model: visionModel, stream: true, store: false, reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
      instructions: "Eres un extractor visual comercial conservador. No inventes datos. No declares SKU, precio, stock ni impresión como autoridad.",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: dataUrl }] }],
      text: { format: { type: "json_schema", name: "commercial_vision_v1", strict: true, schema: visionJsonSchema } },
    }) });
    if (response.status === 402) return reply(request, 402, { error: "credits_unavailable" });
    if (response.status === 429) return reply(request, 429, { error: "rate_limited" });
    if (!response.ok) return reply(request, 502, { error: "ai_gateway_error" });
    let parsed: unknown;
    try { parsed = JSON.parse(await readStructuredSse(response)); }
    catch { return reply(request, 200, failedVisionAnalysis()); }
    const validated = schema.safeParse(parsed);
    if (!validated.success) return reply(request, 200, failedVisionAnalysis());
    return reply(request, 200, normalizeVisionV1(validated.data));
  } catch (error) {
    console.error("commercial vision failed", error instanceof VisionContractError ? "vision_contract_invalid" : error instanceof Error ? error.name : "unknown");
    return reply(request, 502, { error: "vision_processing_failed" });
  }
});

function isSingleFrameGif(dataUrl: string) {
  try {
    const bytes = Uint8Array.from(atob(dataUrl.split(",", 2)[1]), (character) => character.charCodeAt(0));
    if (bytes.length < 14 || !["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) return false;
    let offset = 13;
    if (bytes[10] & 0x80) offset += 3 * (1 << ((bytes[10] & 7) + 1));
    let frames = 0;
    while (offset < bytes.length) {
      const block = bytes[offset++];
      if (block === 0x3b) return frames === 1;
      if (block === 0x2c) {
        frames++;
        if (frames > 1 || offset + 9 > bytes.length) return false;
        const packed = bytes[offset + 8]; offset += 9;
        if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
        offset++; // LZW minimum code size
      } else if (block === 0x21) offset++; // extension label
      else return false;
      while (offset < bytes.length) { const size = bytes[offset++]; if (size === 0) break; offset += size; }
    }
  } catch { return false; }
  return false;
}
