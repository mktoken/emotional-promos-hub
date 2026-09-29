type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;

const knownText = (value: unknown): string | null => {
  const candidate = asRecord(value);
  if (candidate) {
    if (String(candidate.certainty ?? "").toLowerCase() === "unknown") return null;
    return knownText(candidate.value);
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && !/^(unknown|desconocido|null|n\/a)$/i.test(text) ? text : null;
};

const listText = (value: unknown, key: string): string[] =>
  Array.isArray(value) ? [...new Set(value.map((item) => knownText(asRecord(item)?.[key] ?? item)).filter((item): item is string => Boolean(item)))] : [];

const unknownObservation = () => ({ value: null, confidence: "low", provenance: "attachment", certainty: "unknown" });
const observation = (value: unknown, certainty: "observed" | "inferred" = "observed") =>
  value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)
    ? unknownObservation()
    : { value, confidence: "low", provenance: "attachment", certainty };
const safeObservation = (value: unknown) => {
  const candidate = asRecord(value);
  return candidate && "value" in candidate ? candidate : unknownObservation();
};

function deriveCategory(text: string) {
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/\b(taza|mug)\b/.test(normalized)) return "taza";
  if (/\b(termo|cilindro|botella)\b/.test(normalized)) return normalized.includes("botella") ? "botella" : "termo";
  if (/\b(libreta|cuaderno|notebook)\b/.test(normalized)) return "libreta";
  if (/\b(mochila|backpack)\b/.test(normalized)) return "mochila";
  if (/\b(bolsa|tote)\b/.test(normalized)) return "bolsa";
  if (/\b(pluma|boligrafo|lapicero)\b/.test(normalized)) return "pluma";
  return null;
}

export function normalizeAnalysis(raw: unknown) {
  const value = asRecord(raw) ?? {};
  const extracted = asRecord(value.extracted_data) ?? {};
  const productName = knownText(extracted.product_name) ?? "";
  const description = knownText(extracted.description) ?? "";
  const colors = listText(extracted.colors, "name").map((item) => item.toLowerCase());
  const materials = listText(extracted.materials, "value").map((item) => item.toLowerCase());
  const accessories = listText(extracted.included_accessories, "item").map((item) => item.toLowerCase());
  const branding = asRecord(extracted.branding_or_print);
  const brandingValue = branding && "value" in branding && branding.value === null && String(branding.certainty ?? "").toLowerCase() === "detected"
    ? false : knownText(branding?.value ?? extracted.branding_or_print);
  const category = deriveCategory(`${productName} ${description}`);
  const searchTerms = [...new Set([
    category,
    accessories.length && category ? `${category} con ${accessories.join(" ")}` : null,
    materials.length && category ? `${category} ${materials[0]}` : null,
    colors.length && category ? `${category} ${colors.join(" ")}` : null,
  ].filter((item): item is string => Boolean(item)))];
  const usableSignals = Number(Boolean(category)) + Number(Boolean(productName || description)) + Number(Boolean(colors.length)) + Number(Boolean(materials.length)) + Number(Boolean(accessories.length));
  const productKeys = ["apparentCategory", "apparentMaterial", "apparentStyle", "apparentColors", "apparentFeatures", "visibleBrand", "visibleText", "possibleUseCase"];
  const logoKeys = ["dominantColors", "orientation", "backgroundObservation", "apparentComplexity", "reviewNotes"];
  const competitorKeys = ["visibleProductName", "visibleQuantity", "visibleUnitPrice", "visibleTotal", "ivaStatus", "printingStatus", "shippingStatus", "visibleCompetitorName"];
  const productObservation = asRecord(value.productObservation);
  const logoObservation = asRecord(value.logoObservation);
  const competitorObservation = asRecord(value.competitorObservation);
  return { analysisStatus: ["completed", "partial", "unsupported", "failed"].includes(String(value.analysisStatus)) ? value.analysisStatus : "partial",
    attachmentType: ["product_photo", "product_screenshot", "logo", "artwork", "competitor_quote", "unknown"].includes(String(value.attachmentType)) ? value.attachmentType : value.document_type === "product_photo" ? "product_photo" : "unknown",
    productObservation: Object.fromEntries(productKeys.map((key) => [key,
      key === "apparentCategory" ? observation(category, "inferred") : key === "apparentMaterial" ? observation(materials[0], "inferred")
        : key === "apparentColors" ? observation(colors) : key === "apparentFeatures" ? observation(accessories)
          : key === "visibleText" ? observation(productName || description) : safeObservation(productObservation?.[key])])),
    logoObservation: { ...Object.fromEntries(logoKeys.map((key) => [key, safeObservation(logoObservation?.[key])])), technicalReviewRequired: true },
    competitorObservation: Object.fromEntries(competitorKeys.map((key) => [key, safeObservation(competitorObservation?.[key])])),
    confidence: ["high", "medium", "low"].includes(String(value.confidence)) ? value.confidence : "low", provenance: "attachment", humanReviewRequired: true, candidateReference: observation(productName || description),
    commercialCategory: observation(category, "inferred"), searchTerms, normalizedColors: colors, primaryMaterial: observation(materials[0], "inferred"), keyFeatures: accessories,
    brandingDetected: brandingValue === false ? observation(false) : observation(brandingValue), usableSignals, queryReady: Boolean(category && usableSignals >= 2) };
}
