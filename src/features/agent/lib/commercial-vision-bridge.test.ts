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

const detectedElementsShape = {
  document_type: "product_photo",
  detected_elements: [{
    element_type: "product",
    description: "Taza de cerámica blanca con interior y asa de color rojo, incluye cuchara de cerámica roja insertada en el asa",
    colors: [{ name: "blanco", coverage: "exterior" }, { name: "rojo", coverage: "interior, asa y cuchara" }],
    materials: ["cerámica"], components: ["taza", "cuchara"], text_present: false, confidence: "high",
  }],
  extracted_text: [],
  notes: "Fotografía de producto en fondo blanco sin texto ni marca visible.",
};

const productShape = {
  media_type: "product_photo",
  product: {
    title: null,
    description: "Taza de cerámica blanca con interior, asa y cuchara a juego en color rojo.",
    category: { value: "Tazas / Artículos para el hogar", certainty: "high", confidence: "high" },
    colors: [{ name: "Blanco", role: "exterior" }, { name: "Rojo", role: "interior / asa / cuchara" }],
    materials: [{ value: "Cerámica", certainty: "high", confidence: "high" }],
    components: ["Taza con asa perforada para soporte", "Cuchara de cerámica"],
    branding: { has_logo: false, text: null },
  },
  text_detected: [],
};

describe("Gemini → Edge Function → cliente → criterios de catálogo", () => {
  it("preserves the observed product signals through the HTTP JSON contract", () => {
    const edgeResponse = normalizeAnalysis(realGeminiShape);
    const invokeData = JSON.parse(JSON.stringify(edgeResponse));
    const normalized = normalizeCommercialVisionPayload(invokeData);
    expect(isCommercialVisualAnalysis(normalized)).toBe(true);
    expect(normalized).toMatchObject({
      analysisStatus: "partial", confidence: "low", attachmentType: "product_photo",
      productName: "Taza de cerámica con cuchara",
      description: "Taza de cerámica blanca con interior y asa de color rojo, incluye cuchara de cerámica roja insertada en el asa.",
      commercialCategory: { value: "taza", certainty: "inferred" },
      normalizedColors: ["blanco", "rojo"], primaryMaterial: { value: "cerámica" },
      keyFeatures: ["cuchara"], brandingDetected: { value: false },
      queryReady: true,
    });
    expect(normalized?.candidateReference.value).toBe("Taza de cerámica con cuchara");
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("taza con cuchara");
    expect(JSON.stringify(normalized)).not.toMatch(/\b(sku|product_id|price|stock)\b/i);
  });

  it("normalizes the observed detected_elements response without inventing visible text or branding", () => {
    const normalized = normalizeCommercialVisionPayload(JSON.parse(JSON.stringify(normalizeAnalysis(detectedElementsShape))));
    expect(isCommercialVisualAnalysis(normalized)).toBe(true);
    expect(normalized).toMatchObject({ productName: null, description: detectedElementsShape.detected_elements[0].description,
      commercialCategory: { value: "taza" }, normalizedColors: ["blanco", "rojo"],
      primaryMaterial: { value: "cerámica" }, keyFeatures: ["cuchara"],
      candidateReference: { confidence: "high" }, confidence: "low", queryReady: true,
      productObservation: { visibleText: { value: null } }, brandingDetected: { value: null } });
    expect(normalized?.searchTerms).toContain("taza con cuchara");
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("taza con cuchara");
  });

  it("normalizes the exact product/media_type shape into the same commercial contract", () => {
    const normalized = normalizeCommercialVisionPayload(JSON.parse(JSON.stringify(normalizeAnalysis(productShape))));
    expect(isCommercialVisualAnalysis(normalized)).toBe(true);
    expect(normalized).toMatchObject({ attachmentType: "product_photo", productName: null,
      description: productShape.product.description, normalizedColors: ["blanco", "rojo"],
      primaryMaterial: { value: "cerámica", confidence: "high" },
      brandingDetected: { value: false }, commercialCategory: { value: "taza", confidence: "high", certainty: "inferred" },
      productObservation: { visibleText: { value: null } }, queryReady: true });
    expect(normalized?.keyFeatures).toContain("cuchara de cerámica");
    expect(normalized?.searchTerms).toContain("taza con cuchara de cerámica");
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toContain("taza con cuchara de cerámica");
  });

  it("keeps compatible product and detected_elements sources deduplicated", () => {
    const normalized = normalizeAnalysis({ ...productShape, detected_elements: detectedElementsShape.detected_elements });
    expect(normalized).toMatchObject({ commercialCategory: { value: "taza" }, normalizedColors: ["blanco", "rojo"], queryReady: true });
    expect(new Set(normalized.normalizedColors).size).toBe(normalized.normalizedColors.length);
    expect(new Set(normalized.keyFeatures).size).toBe(normalized.keyFeatures.length);
    expect(new Set(normalized.searchTerms).size).toBe(normalized.searchTerms.length);
  });

  it("vetoes search when product contradicts another shape despite a spoon feature", () => {
    const normalized = normalizeCommercialVisionPayload(normalizeAnalysis({ ...productShape, extracted_data: {
      product_name: { value: "Termo de acero", confidence: "high" }, description: "Termo metálico", materials: ["acero"],
    } }));
    expect(normalized).toMatchObject({ analysisStatus: "partial", commercialCategory: { value: null }, searchTerms: [], queryReady: false });
    expect(normalized?.keyFeatures?.some((feature) => feature.includes("cuchara"))).toBe(true);
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toBeNull();
  });

  it("does not invent a category or query from an incomplete product shape", () => {
    const normalized = normalizeCommercialVisionPayload(normalizeAnalysis({ media_type: "product_photo", product: {
      title: null, description: null, category: null, colors: [{ name: "Rojo" }], components: [],
    } }));
    expect(normalized).toMatchObject({ attachmentType: "product_photo", commercialCategory: { value: null }, queryReady: false });
    expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toBeNull();
  });

  it("preserves observed text without promoting model-supplied authority fields", () => {
    const normalized = normalizeAnalysis({ ...productShape, text_detected: ["MARCA QA"], sku: "invented",
      product_id: "invented", price: 10, stock: 100, product: { ...productShape.product, sku: "invented", price: 10 } });
    expect(normalized.productObservation.visibleText).toMatchObject({ value: ["MARCA QA"] });
    expect(JSON.stringify(normalized)).not.toMatch(/\b(sku|product_id|price|stock)\b/i);
  });

  it("derives a category from a clear product description when components are absent", () => {
    const normalized = normalizeAnalysis({ document_type: "product_photo", detected_elements: [
      { element_type: "product", description: "Libreta de cartón reciclado", components: [], confidence: "medium" },
    ] });
    expect(normalized).toMatchObject({ commercialCategory: { value: "libreta" }, queryReady: true });
  });

  it("does not query from empty detected elements or non-product elements", () => {
    for (const raw of [
      { detected_elements: [{ element_type: "product", description: null, colors: [], materials: [], components: [] }] },
      { detected_elements: [{ element_type: "logo", description: "Taza roja", components: ["taza"] }] },
    ]) {
      const normalized = normalizeCommercialVisionPayload(normalizeAnalysis(raw));
      expect(normalized).toMatchObject({ queryReady: false, commercialCategory: { value: null } });
      expect(buildSearchCriteriaFromVisualAnalysis(normalized!)).toBeNull();
    }
  });

  it("chooses the richer source without duplicating signals when both shapes are present", () => {
    const both = normalizeAnalysis({ ...detectedElementsShape, extracted_data: realGeminiShape.extracted_data });
    expect(both).toMatchObject({ productName: "Taza de cerámica con cuchara", normalizedColors: ["blanco", "rojo"],
      primaryMaterial: { value: "cerámica" }, keyFeatures: ["cuchara"], queryReady: true });
    const detectedWins = normalizeAnalysis({ ...detectedElementsShape, extracted_data: { product_name: "Taza" } });
    expect(detectedWins).toMatchObject({ productName: null, description: detectedElementsShape.detected_elements[0].description,
      normalizedColors: ["blanco", "rojo"], keyFeatures: ["cuchara"], queryReady: true });
  });

  it("blocks conflicting sources and multiple product elements instead of combining them", () => {
    const conflict = normalizeAnalysis({ ...detectedElementsShape, extracted_data: {
      product_name: { value: "Termo de acero", confidence: "high" }, description: "Termo metálico", materials: ["acero"],
    } });
    expect(conflict).toMatchObject({ analysisStatus: "partial", commercialCategory: { value: null }, searchTerms: [], queryReady: false });
    const normalizedConflict = normalizeCommercialVisionPayload(conflict);
    expect(normalizedConflict?.keyFeatures).toContain("cuchara");
    expect(buildSearchCriteriaFromVisualAnalysis(normalizedConflict!)).toBeNull();
    const multiple = normalizeAnalysis({ ...detectedElementsShape, detected_elements: [
      ...detectedElementsShape.detected_elements, { element_type: "product", description: "Bolsa de algodón" },
    ] });
    expect(multiple).toMatchObject({ analysisStatus: "partial", commercialCategory: { value: null }, queryReady: false });
  });

  it("does not promote model-supplied authority fields to SKU, price or stock", () => {
    const normalized = normalizeAnalysis({ ...detectedElementsShape, sku: "invented", product_id: "invented", price: 10,
      stock: 100, detected_elements: [{ ...detectedElementsShape.detected_elements[0], sku: "invented", price: 10 }] });
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
