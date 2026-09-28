import { describe, expect, it } from "vitest";
import { isCommercialVisualAnalysis } from "./agent-attachments";

const observation = (value: string | null = null) => ({ value, confidence: "low", provenance: "attachment", certainty: "unknown" });
const result = { analysisStatus: "partial", attachmentType: "product_photo", productObservation: { apparentCategory: observation("mochila") }, logoObservation: { technicalReviewRequired: true }, competitorObservation: { ivaStatus: observation() }, confidence: "low", provenance: "attachment", humanReviewRequired: true, candidateReference: observation() };

describe("CommercialVisionProcessor contract", () => {
  it("accepts structured partial output with unknowns", () => expect(isCommercialVisualAnalysis(result)).toBe(true));
  it("rejects prose or output without provenance", () => expect(isCommercialVisualAnalysis({ ...result, provenance: "model" })).toBe(false));
});
