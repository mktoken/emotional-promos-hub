import { describe, expect, it } from "vitest";
import { attachmentHandoff, buildSearchCriteriaFromVisualAnalysis, buildVisualSearchCriteria, createCommercialAttachment, linkAttachmentToLines, recordAttachmentObservations, removeAttachment, validateAttachmentFile } from "./agent-attachments";

describe("commercial attachment guardrails", () => {
  it("accepts supported files and rejects unsupported or oversized files", () => {
    expect(validateAttachmentFile({ name: "producto.png", type: "image/png", size: 100 })).toEqual([]);
    expect(validateAttachmentFile({ name: "producto.exe", type: "application/octet-stream", size: 100 })).toContain("Formato no soportado");
    expect(validateAttachmentFile({ name: "producto.png", type: "image/png", size: 10 * 1024 * 1024 + 1 })).toContain("Tamaño fuera de límite");
    expect(validateAttachmentFile({ name: "../secreto.png", type: "image/png", size: 100 })).toContain("Nombre de archivo no seguro");
  });

  it("keeps provenance and explicit unknowns without inventing catalog facts", () => {
    const pending = createCommercialAttachment({ name: "termo.png", type: "image/png", size: 100 }, "product_photo", "att-1");
    const analyzed = recordAttachmentObservations(pending, { category: "termo", material: "metal", colors: ["azul"] });
    expect(analyzed.analysisStatus).toBe("analyzed");
    expect(analyzed.analysis.productReference?.category?.certainty).toBe("USER_CONFIRMED");
    expect(buildVisualSearchCriteria(analyzed)).toContain("termo");
    expect(attachmentHandoff([analyzed])[0]).toMatchObject({ printing: "POR CONFIRMAR", pricingAuthority: "No cambia pricing automáticamente", stockAuthority: "No se infiere desde imagen" });
    expect(attachmentHandoff([analyzed])[0]).not.toHaveProperty("sku");
  });

  it("handles logo review, multi-line links, competitor unknown IVA and removal", () => {
    const logo = recordAttachmentObservations(createCommercialAttachment({ name: "marca.png", type: "image/png", size: 10 }, "logo", "logo-1"), { dominantColors: ["azul"], orientation: "horizontal" });
    expect(logo.humanReviewRequired).toBe(true);
    expect(logo.analysis.logoArtwork?.technicalReviewRequired).toBe(true);
    const linked = linkAttachmentToLines(logo, ["line-1", "line-2", "line-1"]);
    expect(linked.linkedProductLineIds).toEqual(["line-1", "line-2"]);
    const competitor = recordAttachmentObservations(createCommercialAttachment({ name: "competencia.png", type: "image/png", size: 10 }, "competitor_quote", "comp-1"), { competitor: { productName: "Producto visible", quantity: 50, totalMxn: 1000 } });
    expect(competitor.analysis.competitorReference?.iva?.certainty).toBe("UNKNOWN");
    expect(removeAttachment([linked, competitor], "comp-1")).toHaveLength(1);
  });

  it("uses only concrete category/text signals for low-confidence visual search", () => {
    const observation = (value: string | string[] | null, certainty: "observed" | "inferred" | "unknown" = "observed") => ({ value, confidence: "low" as const, provenance: "attachment" as const, certainty });
    const visual = {
      analysisStatus: "partial" as const, attachmentType: "product_photo" as const,
      productObservation: {
        apparentCategory: observation("mochila"), apparentMaterial: observation("piel", "inferred"),
        apparentStyle: observation("ejecutivo", "inferred"), apparentColors: observation(["azul"], "inferred"),
        apparentFeatures: observation(["cierre"], "inferred"), visibleBrand: observation(null, "unknown"),
        visibleText: observation("K22"), possibleUseCase: observation("evento", "inferred"),
      },
      logoObservation: { technicalReviewRequired: true }, competitorObservation: {}, confidence: "low" as const,
      provenance: "attachment" as const, humanReviewRequired: true, candidateReference: observation(null, "unknown"),
    };
    expect(buildSearchCriteriaFromVisualAnalysis(visual)).toBe("mochila K22");
  });

  it("does not search when visual observations are unknown", () => {
    const unknown = { value: null, confidence: "low" as const, provenance: "attachment" as const, certainty: "unknown" as const };
    const visual = { analysisStatus: "partial" as const, attachmentType: "unknown" as const,
      productObservation: { apparentCategory: unknown, visibleText: unknown }, logoObservation: { technicalReviewRequired: true },
      competitorObservation: {}, confidence: "low" as const, provenance: "attachment" as const,
      humanReviewRequired: true, candidateReference: unknown };
    expect(buildSearchCriteriaFromVisualAnalysis(visual)).toBeNull();
  });
});
