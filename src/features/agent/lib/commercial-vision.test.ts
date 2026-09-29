import { describe, expect, it } from "vitest";
import { buildSearchCriteriaFromVisualAnalysis, isCommercialVisualAnalysis, normalizeCommercialVisionPayload } from "./agent-attachments";

const observation = (value: string | null = null) => ({ value, confidence: "low", provenance: "attachment", certainty: "unknown" });
const result = { analysisStatus: "partial", attachmentType: "product_photo", productObservation: { apparentCategory: observation("mochila") }, logoObservation: { technicalReviewRequired: true }, competitorObservation: { ivaStatus: observation() }, confidence: "low", provenance: "attachment", humanReviewRequired: true, candidateReference: observation() };

describe("CommercialVisionProcessor contract", () => {
  it("accepts structured partial output with unknowns", () => expect(isCommercialVisualAnalysis(result)).toBe(true));
  it("rejects prose or output without provenance", () => expect(isCommercialVisualAnalysis({ ...result, provenance: "model" })).toBe(false));

  it("normalizes the real extracted_data shape for a ceramic mug fixture", () => {
    const normalized = normalizeCommercialVisionPayload({ document_type: "product_photo", extracted_data: {
      product_name: "Taza de cerámica con cuchara",
      description: "Taza de cerámica blanca con interior y asa de color rojo, incluye cuchara de cerámica roja insertada en el asa.",
      colors: ["blanco", "rojo"], materials: ["cerámica"], branding_or_print: null, included_accessories: ["cuchara"],
    }});
    expect(normalized).toMatchObject({ commercialCategory: { value: "taza" }, primaryMaterial: { value: "cerámica" }, normalizedColors: ["blanco", "rojo"], keyFeatures: ["cuchara"], brandingDetected: { value: null }, queryReady: true });
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("taza");
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("cerámica");
  });

  it("keeps low-confidence output blocked when there are no usable signals", () => {
    const normalized = normalizeCommercialVisionPayload({ document_type: "product_photo", extracted_data: { product_name: "", description: "", colors: [], materials: [], branding_or_print: null, included_accessories: [] }});
    expect(normalized).toMatchObject({ queryReady: false, usableSignals: 0 });
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toBeNull();
  });
});
