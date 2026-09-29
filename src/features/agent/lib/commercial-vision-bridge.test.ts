import { describe, expect, it } from "vitest";
import { normalizeAnalysis } from "../../../../supabase/functions/analyze-commercial-image/normalize-analysis";
import { buildSearchCriteriaFromVisualAnalysis, isCommercialVisualAnalysis, normalizeCommercialVisionPayload } from "./agent-attachments";

const realGeminiShape = {
  document_type: "product_photo",
  extracted_data: {
    product_name: { value: "Taza de cerámica con cuchara", certainty: "detected", confidence: "high" },
    description: { value: "Taza de cerámica blanca con interior y asa de color rojo, incluye cuchara de cerámica roja insertada en el asa.", certainty: "detected", confidence: "high" },
    colors: [{ name: "Blanco", hex_estimate: "#FFFFFF", part: "exterior" }, { name: "Rojo", hex_estimate: "#D02C2F", part: "interior, asa y cuchara" }],
    materials: [{ value: "Cerámica", certainty: "inferred", confidence: "medium" }],
    branding_or_print: { value: null, certainty: "detected", confidence: "high" },
    included_accessories: [{ item: "Cuchara", color: "Rojo", material: "Cerámica" }],
  },
};

describe("Gemini → Edge Function → cliente → criterios de catálogo", () => {
  it("preserves the observed product signals through the HTTP JSON contract", () => {
    const edgeResponse = normalizeAnalysis(realGeminiShape);
    const invokeData = JSON.parse(JSON.stringify(edgeResponse));
    const normalized = normalizeCommercialVisionPayload(invokeData);
    expect(isCommercialVisualAnalysis(normalized)).toBe(true);
    expect(normalized).toMatchObject({
      analysisStatus: "partial", confidence: "low", attachmentType: "product_photo",
      commercialCategory: { value: "taza", certainty: "inferred" },
      normalizedColors: ["blanco", "rojo"], primaryMaterial: { value: "cerámica" },
      keyFeatures: ["cuchara"], brandingDetected: { value: false },
      queryReady: true,
    });
    expect(normalized?.candidateReference.value).toBe("Taza de cerámica con cuchara");
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("taza con cuchara");
    expect(JSON.stringify(normalized)).not.toMatch(/\b(sku|product_id|price|stock)\b/i);
  });

  it("keeps useful evidence when global status is partial and product name is high confidence", () => {
    const normalized = normalizeAnalysis({ ...realGeminiShape, analysisStatus: "partial", confidence: "low" });
    expect(normalized).toMatchObject({ commercialCategory: { value: "taza" }, queryReady: true, analysisStatus: "partial", confidence: "low" });
  });

  it("falls back safely for empty and malformed extraction", () => {
    for (const raw of [null, "malformed", { extracted_data: {} }]) {
      const normalized = normalizeCommercialVisionPayload(normalizeAnalysis(raw));
      expect(normalized).toMatchObject({ queryReady: false, usableSignals: 0, confidence: "low" });
      expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toBeNull();
    }
  });

  it("excludes UNKNOWN/null and never converts unknown branding into printing", () => {
    const normalized = normalizeAnalysis({ document_type: "product_photo", extracted_data: {
      product_name: { value: "UNKNOWN", certainty: "unknown" },
      description: { value: null, certainty: "unknown" },
      colors: [{ name: "UNKNOWN" }], materials: [{ value: null }], included_accessories: [{ item: "UNKNOWN" }],
      branding_or_print: { value: null, certainty: "unknown" },
    } });
    expect(normalized).toMatchObject({ normalizedColors: [], keyFeatures: [], brandingDetected: { value: null }, queryReady: false });
    expect(normalized.searchTerms).toEqual([]);
  });
});
