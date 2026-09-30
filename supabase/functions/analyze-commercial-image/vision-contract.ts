import type { z as zod } from "zod";

export const visionModel = "openai/gpt-6-luna";

const nullableText = { type: ["string", "null"] };
const textList = { type: "array", items: { type: "string" } };
export const visionJsonSchema = {
  type: "object",
  properties: {
    schemaVersion: { type: "string", enum: ["1"] },
    documentType: { type: "string", enum: ["product_photo", "product_screenshot", "logo", "artwork", "competitor_quote", "unknown"] },
    products: { type: "array", items: {
      type: "object", properties: {
        name: nullableText, description: nullableText, category: nullableText,
        colors: textList, materials: textList, components: textList,
        brandingPresent: { type: ["boolean", "null"] }, visibleText: textList,
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["name", "description", "category", "colors", "materials", "components", "brandingPresent", "visibleText", "confidence"],
      additionalProperties: false,
    } },
  },
  required: ["schemaVersion", "documentType", "products"],
  additionalProperties: false,
} as const;

// Inject the same Zod package in Deno (npm:) and in Vitest (local dependency).
export function createVisionV1Schema(z: typeof zod) {
  const product = z.object({
    name: z.string().nullable(), description: z.string().nullable(), category: z.string().nullable(),
    colors: z.array(z.string()), materials: z.array(z.string()), components: z.array(z.string()),
    brandingPresent: z.boolean().nullable(), visibleText: z.array(z.string()),
    confidence: z.enum(["high", "medium", "low"]),
  }).strict();
  return z.object({
    schemaVersion: z.literal("1"),
    documentType: z.enum(["product_photo", "product_screenshot", "logo", "artwork", "competitor_quote", "unknown"]),
    products: z.array(product),
  }).strict();
}

export class VisionContractError extends Error {
  constructor() { super("vision_contract_invalid"); this.name = "VisionContractError"; }
}

type EventRecord = Record<string, unknown>;
const record = (value: unknown): EventRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as EventRecord : null;

export async function readStructuredSse(response: Response): Promise<string> {
  if (!response.body) throw new VisionContractError();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let delta = "";
  let completed: EventRecord | null = null;
  let refusal = false;
  let failed = false;
  let textItems = 0;
  const consume = (frame: string) => {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") return;
    let event: EventRecord;
    try { event = record(JSON.parse(data)) ?? (() => { throw new VisionContractError(); })(); }
    catch { throw new VisionContractError(); }
    const type = event.type;
    if (type === "response.output_text.delta") {
      if (typeof event.delta !== "string") throw new VisionContractError();
      delta += event.delta;
      if (delta.length > 1024 * 1024) throw new VisionContractError();
    } else if (type === "response.refusal.delta" || type === "response.refusal.done") refusal = true;
    else if (type === "response.failed" || type === "response.incomplete" || type === "error") failed = true;
    else if (type === "response.completed") {
      if (completed) throw new VisionContractError();
      completed = record(event.response);
      if (!completed) throw new VisionContractError();
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 1024 * 1024) throw new VisionContractError();
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        consume(buffer.slice(0, boundary).replace(/\r/g, ""));
        buffer = buffer.slice(boundary + 2);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer.replace(/\r/g, ""));
    if (failed || refusal || !completed || completed.status !== "completed") throw new VisionContractError();
    const output = completed.output;
    if (!Array.isArray(output)) throw new VisionContractError();
    let finalText = "";
    for (const item of output) {
      const message = record(item);
      if (message?.type !== "message") continue; // reasoning is intentionally ignored
      if (!Array.isArray(message.content)) throw new VisionContractError();
      for (const part of message.content) {
        const content = record(part);
        if (content?.type === "refusal") throw new VisionContractError();
        if (content?.type === "output_text") {
          if (typeof content.text !== "string") throw new VisionContractError();
          finalText = content.text;
          textItems++;
        }
      }
    }
    if (textItems !== 1 || !finalText.trim() || (delta && delta !== finalText)) throw new VisionContractError();
    return finalText;
  } finally { reader.releaseLock(); }
}
