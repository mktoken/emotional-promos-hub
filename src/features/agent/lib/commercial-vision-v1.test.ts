import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createVisionV1Schema, readStructuredSse, visionJsonSchema, visionModel, VisionContractError } from "../../../../supabase/functions/analyze-commercial-image/vision-contract";
import { failedVisionAnalysis, normalizeVisionV1 } from "../../../../supabase/functions/analyze-commercial-image/normalize-analysis";
import { buildSearchCriteriaFromVisualAnalysis, normalizeCommercialVisionPayload } from "./agent-attachments";

const schema = createVisionV1Schema(z);
const product = { name: "Taza de cerámica con cuchara", description: "Taza blanca y roja con cuchara", category: "taza",
  colors: ["blanco", "rojo"], materials: ["cerámica"], components: ["cuchara"], brandingPresent: false,
  visibleText: [], confidence: "low" as const };
const valid = { schemaVersion: "1", documentType: "product_photo", products: [product] };
const parse = (value: unknown) => { const result = schema.safeParse(value); return result.success ? normalizeVisionV1(result.data) : failedVisionAnalysis(); };
const sse = (events: unknown[]) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });

describe("OpenAI structured vision V1", () => {
  it("pins Luna and uses a strict supported schema", () => {
    expect(visionModel).toBe("openai/gpt-6-luna");
    expect(visionJsonSchema.additionalProperties).toBe(false);
    expect(visionJsonSchema.properties.schemaVersion.enum).toEqual(["1"]);
    expect(JSON.stringify(visionJsonSchema)).not.toMatch(/sku|product_id|price|stock/i);
    expect(schema.safeParse(valid).success).toBe(true);
  });
  it.each(["high", "medium", "low"])("accepts %s confidence", (confidence) => {
    expect(schema.safeParse({ ...valid, products: [{ ...product, confidence }] }).success).toBe(true);
  });
  it("maps a valid taza to catalog criteria without inventing authority", () => {
    const result = normalizeCommercialVisionPayload(parse(valid));
    expect(result).toMatchObject({ commercialCategory: { value: "taza" }, queryReady: true, confidence: "low" });
    expect(buildSearchCriteriaFromVisualAnalysis(result!)).toContain("taza con cuchara");
    expect(JSON.stringify(result)).not.toMatch(/"(?:sku|product_id|price|stock)":/i);
    expect(result?.brandingDetected?.value).toBe(false);
  });
  it("derives another category from a visual product hint", () => {
    const result = parse({ ...valid, products: [{ ...product, name: "Mochila azul", description: "Mochila de poliéster", category: "mochila", colors: ["azul"], materials: ["poliéster"], components: [] }] });
    expect(result).toMatchObject({ commercialCategory: { value: "mochila" }, queryReady: true });
  });
  it("uses an explicit canonical hint with a named product, but never a hint alone", () => {
    const named = { ...product, name: "Artículo promocional", description: null, category: "taza", colors: [], materials: [], components: [] };
    expect(parse({ ...valid, products: [named] }).queryReady).toBe(true);
    expect(parse({ ...valid, products: [{ ...named, name: null }] }).queryReady).toBe(false);
  });
  it("vetoes zero and multiple products", () => {
    expect(parse({ ...valid, products: [] }).queryReady).toBe(false);
    expect(parse({ ...valid, products: [product, product] }).queryReady).toBe(false);
    expect(buildSearchCriteriaFromVisualAnalysis(normalizeCommercialVisionPayload(parse({ ...valid, products: [] }))!)).toBeNull();
  });
  it("rejects invalid versions, confidence, missing fields, unknown properties and authority fields", () => {
    expect(schema.safeParse({ ...valid, schemaVersion: "2" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, products: [{ ...product, confidence: 0.5 }] }).success).toBe(false);
    expect(schema.safeParse({ ...valid, products: [{ ...product, confidence: "certain" }] }).success).toBe(false);
    const { colors: _colors, ...missing } = product;
    expect(schema.safeParse({ ...valid, products: [missing] }).success).toBe(false);
    expect(schema.safeParse({ ...valid, extra: true }).success).toBe(false);
    for (const field of ["sku", "price", "stock"]) expect(schema.safeParse({ ...valid, products: [{ ...product, [field]: "invented" }] }).success).toBe(false);
    expect(parse({ ...valid, products: [{ ...product, confidence: "certain" }] }).queryReady).toBe(false);
  });
  it("rejects malformed JSON before Zod", () => expect(() => JSON.parse("{" )).toThrow());
  it("fails closed when evidence is insufficient or categories conflict", () => {
    expect(parse({ ...valid, products: [{ ...product, name: null, description: null, category: null, colors: [], materials: [], components: [] }] }).queryReady).toBe(false);
    expect(parse({ ...valid, products: [{ ...product, category: "mochila" }] }).queryReady).toBe(false);
    expect(failedVisionAnalysis()).toMatchObject({ analysisStatus: "failed", queryReady: false, error: "vision_contract_invalid" });
  });
  it("parses fragmented SSE and excludes reasoning", async () => {
    const text = JSON.stringify(valid);
    const response = sse([{ type: "response.output_text.delta", delta: text },
      { type: "response.completed", response: { status: "completed", output: [{ type: "reasoning", content: [{ type: "reasoning_text", text: "private" }] },
        { type: "message", content: [{ type: "output_text", text }] }] } }]);
    expect(JSON.parse(await readStructuredSse(response))).toEqual(valid);
  });
  it("rejects refusal, incomplete stream, errors and incompatible multiple outputs", async () => {
    const text = JSON.stringify(valid);
    await expect(readStructuredSse(sse([{ type: "response.refusal.done" }, { type: "response.completed", response: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] } }]))).rejects.toBeInstanceOf(VisionContractError);
    await expect(readStructuredSse(sse([{ type: "response.output_text.delta", delta: text }]))).rejects.toBeInstanceOf(VisionContractError);
    await expect(readStructuredSse(sse([{ type: "response.failed" }]))).rejects.toBeInstanceOf(VisionContractError);
    await expect(readStructuredSse(sse([{ type: "response.completed", response: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }, { type: "output_text", text }] }] } }]))).rejects.toBeInstanceOf(VisionContractError);
  });
});
