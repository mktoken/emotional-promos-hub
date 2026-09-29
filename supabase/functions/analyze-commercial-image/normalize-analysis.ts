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
type Confidence = "high" | "medium" | "low";
const confidenceOf = (value: unknown): Confidence => ["high", "medium", "low"].includes(String(value)) ? value as Confidence : "low";
const observation = (value: unknown, certainty: "observed" | "inferred" = "observed", confidence: Confidence = "low") =>
  value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)
    ? unknownObservation()
    : { value, confidence, provenance: "attachment", certainty };
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

interface ProductSignals {
  productName: string | null;
  description: string | null;
  colors: string[];
  materials: string[];
  accessories: string[];
  visibleText: string[];
  brandingDetected: boolean | string | null;
  category: string | null;
  candidateConfidence: Confidence;
  materialConfidence: Confidence;
  ambiguous: boolean;
}

const emptySignals = (): ProductSignals => ({ productName: null, description: null, colors: [], materials: [], accessories: [],
  visibleText: [], brandingDetected: null, category: null, candidateConfidence: "low", materialConfidence: "low", ambiguous: false });
const lower = (items: string[]) => [...new Set(items.map((item) => item.toLowerCase()))];
const visibleTextOf = (raw: RecordValue) => listText(raw.extracted_text, "text");

function fromExtractedData(raw: RecordValue): ProductSignals | null {
  const extracted = asRecord(raw.extracted_data);
  if (!extracted) return null;
  const productName = knownText(extracted.product_name);
  const description = knownText(extracted.description);
  const nameCategory = deriveCategory(productName ?? "");
  const descriptionCategory = deriveCategory(description ?? "");
  const ambiguous = Boolean(nameCategory && descriptionCategory && nameCategory !== descriptionCategory);
  const branding = asRecord(extracted.branding_or_print);
  const brandingDetected = branding && branding.value === null && String(branding.certainty ?? "").toLowerCase() === "detected"
    ? false : knownText(branding?.value ?? extracted.branding_or_print);
  return { productName, description, colors: lower(listText(extracted.colors, "name")),
    materials: lower(listText(extracted.materials, "value")), accessories: lower(listText(extracted.included_accessories, "item")),
    visibleText: visibleTextOf(raw), brandingDetected, category: ambiguous ? null : nameCategory ?? descriptionCategory,
    candidateConfidence: confidenceOf(asRecord(extracted.product_name)?.confidence ?? asRecord(extracted.description)?.confidence),
    materialConfidence: confidenceOf(asRecord(Array.isArray(extracted.materials) ? extracted.materials[0] : null)?.confidence), ambiguous };
}

function fromDetectedElements(raw: RecordValue): ProductSignals | null {
  if (!Array.isArray(raw.detected_elements)) return null;
  const products = raw.detected_elements.map(asRecord).filter((item): item is RecordValue => item?.element_type === "product");
  if (!products.length) return null;
  if (products.length !== 1) return { ...emptySignals(), ambiguous: true };
  const product = products[0];
  const description = knownText(product.description);
  const components = lower(listText(product.components, "value"));
  const componentCategories = [...new Set(components.map(deriveCategory).filter((item): item is NonNullable<ReturnType<typeof deriveCategory>> => item !== null))];
  const descriptionCategory = deriveCategory(description ?? "");
  const ambiguous = componentCategories.length > 1 || Boolean(descriptionCategory && componentCategories.length && descriptionCategory !== componentCategories[0]);
  const category = ambiguous ? null : componentCategories[0] ?? descriptionCategory;
  return { ...emptySignals(), description, colors: lower(listText(product.colors, "name")),
    materials: lower(listText(product.materials, "value")),
    accessories: componentCategories.length ? components.filter((item) => !deriveCategory(item)) : [], visibleText: visibleTextOf(raw),
    category, candidateConfidence: confidenceOf(product.confidence), ambiguous };
}

const signalCount = (signals: ProductSignals) => Number(Boolean(signals.productName)) + Number(Boolean(signals.description))
  + Number(Boolean(signals.colors.length)) + Number(Boolean(signals.materials.length)) + Number(Boolean(signals.accessories.length))
  + Number(Boolean(signals.category)) + Number(signals.brandingDetected !== null);
const disjoint = (left: string[], right: string[]) => left.length > 0 && right.length > 0 && !left.some((item) => right.includes(item));
function conflicting(left: ProductSignals, right: ProductSignals) {
  return Boolean(left.category && right.category && left.category !== right.category)
    || disjoint(left.colors, right.colors) || disjoint(left.materials, right.materials)
    || (left.brandingDetected !== null && right.brandingDetected !== null && left.brandingDetected !== right.brandingDetected);
}

export function normalizeAnalysis(raw: unknown) {
  const value = asRecord(raw) ?? {};
  const extracted = fromExtractedData(value);
  const detected = fromDetectedElements(value);
  // Prefer the richer valid source; extracted_data wins ties. Never merge conflicting observations.
  const selected = extracted && detected ? signalCount(extracted) >= signalCount(detected) ? extracted : detected
    : extracted ?? detected ?? emptySignals();
  const ambiguous = selected.ambiguous || Boolean(extracted?.ambiguous || detected?.ambiguous)
    || Boolean(extracted && detected && conflicting(extracted, detected));
  const { productName, description, colors, materials, accessories, visibleText, brandingDetected } = selected;
  const category = ambiguous ? null : selected.category;
  const searchTerms = ambiguous ? [] : [...new Set([
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
  return { analysisStatus: ambiguous ? "partial" : ["completed", "partial", "unsupported", "failed"].includes(String(value.analysisStatus)) ? value.analysisStatus : "partial",
    attachmentType: ["product_photo", "product_screenshot", "logo", "artwork", "competitor_quote", "unknown"].includes(String(value.attachmentType)) ? value.attachmentType : value.document_type === "product_photo" ? "product_photo" : "unknown",
    productName, description,
    productObservation: Object.fromEntries(productKeys.map((key) => [key,
      key === "apparentCategory" ? observation(category, "inferred") : key === "apparentMaterial" ? observation(materials[0], "inferred")
        : key === "apparentColors" ? observation(colors) : key === "apparentFeatures" ? observation(accessories)
          : key === "visibleText" ? observation(visibleText) : safeObservation(productObservation?.[key])])),
    logoObservation: { ...Object.fromEntries(logoKeys.map((key) => [key, safeObservation(logoObservation?.[key])])), technicalReviewRequired: true },
    competitorObservation: Object.fromEntries(competitorKeys.map((key) => [key, safeObservation(competitorObservation?.[key])])),
    confidence: confidenceOf(value.confidence), provenance: "attachment", humanReviewRequired: true,
    candidateReference: observation(productName || description, "observed", selected.candidateConfidence),
    commercialCategory: observation(category, "inferred"), searchTerms, normalizedColors: colors,
    primaryMaterial: observation(materials[0], "inferred", selected.materialConfidence), keyFeatures: accessories,
    brandingDetected: observation(brandingDetected), usableSignals, queryReady: Boolean(!ambiguous && category && usableSignals >= 2) };
}
