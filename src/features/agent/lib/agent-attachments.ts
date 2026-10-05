import type { AgentProduct } from "./agent-state";
import type { VisualCatalogCandidate } from "./agent-tools";

export type CommercialAttachmentType =
  | "product_photo" | "product_screenshot" | "inspiration_image" | "logo"
  | "artwork" | "competitor_quote" | "other_commercial_document";
export type AttachmentStatus = "pending" | "analyzing" | "completed" | "partial" | "unsupported" | "failed" | "analyzed" | "needs_review" | "rejected" | "error";
export type ObservationCertainty = "OBSERVED" | "INFERRED" | "USER_CONFIRMED" | "UNKNOWN";
export type Confidence = "high" | "medium" | "low";

export interface AttachmentObservation<T = string> {
  value: T | null;
  certainty: ObservationCertainty;
  confidence: Confidence;
  source: "attachment" | "user";
  attachmentId: string;
  observedAt: string;
}

export interface AttachmentAnalysis {
  summary?: AttachmentObservation<string>;
  productReference?: {
    category?: AttachmentObservation<string>;
    material?: AttachmentObservation<string>;
    style?: AttachmentObservation<string>;
    colors?: AttachmentObservation<string[]>;
    features?: AttachmentObservation<string[]>;
    visibleText?: AttachmentObservation<string>;
    possibleUseCase?: AttachmentObservation<string>;
  };
  logoArtwork?: {
    dominantColors?: AttachmentObservation<string[]>;
    orientation?: AttachmentObservation<string>;
    background?: AttachmentObservation<string>;
    complexity?: AttachmentObservation<string>;
    technicalReviewRequired: true;
    printingReviewNotes: string;
  };
  competitorReference?: {
    productName?: AttachmentObservation<string>;
    quantity?: AttachmentObservation<number>;
    unitPriceMxn?: AttachmentObservation<number>;
    totalMxn?: AttachmentObservation<number>;
    iva?: AttachmentObservation<string>;
    printing?: AttachmentObservation<string>;
    shipping?: AttachmentObservation<string>;
    competitorName?: AttachmentObservation<string>;
    observedDate?: AttachmentObservation<string>;
    comparability: "unknown" | "partial" | "comparable";
    humanReviewRequired: true;
  };
}

export interface CommercialAttachment {
  attachmentId: string;
  type: CommercialAttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  source: "qa_upload" | "user_upload" | "crm";
  uploadedAt: string;
  analysisStatus: AttachmentStatus;
  analysis: AttachmentAnalysis;
  confidence: Confidence;
  linkedProductLineIds: string[];
  humanReviewRequired: boolean;
  previewUrl?: string;
  analysisProvider?: "lovable-ai";
  analysisModel?: string;
  analysisError?: string;
  visualAnalysis?: CommercialVisualAnalysis;
  searchCriteria?: string;
  catalogSearchStatus?: "not_started" | "completed" | "no_results" | "failed";
  catalogSearchError?: string;
  candidateProductIds?: string[];
  catalogCandidates?: AgentProduct[];
  visualCandidates?: VisualCatalogCandidate[];
  selectedVisualCandidateId?: string;
}

export interface AttachmentFileMetadata { name: string; type: string; size: number; }
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export interface CommercialVisualObservation {
  value: string | number | boolean | string[] | null;
  confidence: Confidence;
  provenance: "attachment";
  certainty: "observed" | "inferred" | "unknown";
}

export interface CommercialVisualAnalysis {
  analysisStatus: "completed" | "partial" | "unsupported" | "failed";
  attachmentType: CommercialAttachmentType | "unknown";
  productName?: string | null;
  description?: string | null;
  productObservation: Record<string, CommercialVisualObservation>;
  logoObservation: Record<string, CommercialVisualObservation | true> & { technicalReviewRequired: true };
  competitorObservation: Record<string, CommercialVisualObservation>;
  confidence: Confidence;
  provenance: "attachment";
  humanReviewRequired: boolean;
  candidateReference: CommercialVisualObservation;
  commercialCategory?: CommercialVisualObservation;
  searchTerms?: string[];
  normalizedColors?: string[];
  primaryMaterial?: CommercialVisualObservation;
  keyFeatures?: string[];
  brandingDetected?: CommercialVisualObservation;
  usableSignals?: number;
  queryReady?: boolean;
}

const visualObservation = (value: unknown, confidence: Confidence = "low", certainty: CommercialVisualObservation["certainty"] = "observed"): CommercialVisualObservation => ({
  value: value === "" || value === undefined || (Array.isArray(value) && !value.length) ? null : value as CommercialVisualObservation["value"],
  confidence, provenance: "attachment", certainty: value === null || value === undefined ? "unknown" : certainty,
});

function derivedCategory(text: string): string | null {
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/\b(taza|mug)\b/.test(normalized)) return "taza";
  if (/\b(termo|cilindro|botella)\b/.test(normalized)) return normalized.includes("botella") ? "botella" : "termo";
  if (/\b(libreta|cuaderno|notebook)\b/.test(normalized)) return "libreta";
  if (/\b(mochila|backpack)\b/.test(normalized)) return "mochila";
  if (/\b(bolsa|tote)\b/.test(normalized)) return "bolsa";
  if (/\b(pluma|boligrafo|lapicero)\b/.test(normalized)) return "pluma";
  return null;
}

/** Accepts both the Edge Function contract and the raw extracted_data shape returned by the gateway. */
export function normalizeCommercialVisionPayload(raw: unknown): CommercialVisualAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.productObservation && value.logoObservation && value.competitorObservation) return value as unknown as CommercialVisualAnalysis;
  const extracted = value.extracted_data && typeof value.extracted_data === "object" ? value.extracted_data as Record<string, unknown> : null;
  if (!extracted) return null;
  const productName = typeof extracted.product_name === "string" ? extracted.product_name : "";
  const description = typeof extracted.description === "string" ? extracted.description : "";
  const colors = Array.isArray(extracted.colors) ? extracted.colors.filter((item): item is string => typeof item === "string") : [];
  const materials = Array.isArray(extracted.materials) ? extracted.materials.filter((item): item is string => typeof item === "string") : [];
  const features = Array.isArray(extracted.included_accessories) ? extracted.included_accessories.filter((item): item is string => typeof item === "string") : [];
  const category = derivedCategory(`${productName} ${description}`);
  const searchTerms = [...new Set([category, features.length && category ? `${category} con ${features.join(" ")}` : null,
    materials.length && category ? `${category} ${materials[0]}` : null, colors.length && category ? `${category} ${colors.join(" ")}` : null]
    .filter((item): item is string => Boolean(item)))];
  const branding = extracted.branding_or_print;
  const brandingValue = branding && typeof branding === "object" ? (branding as Record<string, unknown>).value : branding;
  const usableSignals = Number(Boolean(category)) + Number(Boolean(productName || description)) + Number(Boolean(colors.length)) + Number(Boolean(materials.length)) + Number(Boolean(features.length));
  return { analysisStatus: value.analysisStatus === "completed" ? "completed" : "partial", attachmentType: "product_photo",
    productObservation: { apparentCategory: visualObservation(category), apparentMaterial: visualObservation(materials[0]), apparentStyle: visualObservation(null, "low", "unknown"), apparentColors: visualObservation(colors), apparentFeatures: visualObservation(features), visibleBrand: visualObservation(brandingValue), visibleText: visualObservation(productName || description), possibleUseCase: visualObservation(null, "low", "unknown") },
    logoObservation: { technicalReviewRequired: true }, competitorObservation: {}, confidence: value.confidence === "high" || value.confidence === "medium" ? value.confidence : "low",
    provenance: "attachment", humanReviewRequired: true, candidateReference: visualObservation(productName || description), commercialCategory: visualObservation(category), searchTerms,
    normalizedColors: colors, primaryMaterial: visualObservation(materials[0]), keyFeatures: features, brandingDetected: visualObservation(brandingValue), usableSignals, queryReady: Boolean(category && usableSignals >= 2) };
}

export function applyVisualAnalysis(attachment: CommercialAttachment, visualAnalysis: CommercialVisualAnalysis): CommercialAttachment {
  const product = visualAnalysis.productObservation;
  const logo = visualAnalysis.logoObservation;
  const competitor = visualAnalysis.competitorObservation;
  const searchCriteria = buildSearchCriteriaFromVisualAnalysis(visualAnalysis);
  return { ...attachment, analysisStatus: visualAnalysis.analysisStatus, analysisProvider: "lovable-ai", analysisModel: "google/gemini-3.7-flash", visualAnalysis,
    searchCriteria: searchCriteria ?? undefined, catalogSearchStatus: searchCriteria ? "not_started" : "no_results",
    confidence: visualAnalysis.confidence, humanReviewRequired: true,
    analysis: { ...attachment.analysis,
      summary: { value: visualAnalysis.analysisStatus === "completed" ? "Análisis visual estructurado completado" : "No pude identificar suficiente información de esta imagen", certainty: visualAnalysis.analysisStatus === "completed" ? "OBSERVED" : "UNKNOWN", confidence: visualAnalysis.confidence, source: "attachment", attachmentId: attachment.attachmentId, observedAt: new Date().toISOString() },
      productReference: { category: product.apparentCategory as unknown as AttachmentObservation<string>, material: product.apparentMaterial as unknown as AttachmentObservation<string>, style: product.apparentStyle as unknown as AttachmentObservation<string>, colors: product.apparentColors as unknown as AttachmentObservation<string[]>, features: product.apparentFeatures as unknown as AttachmentObservation<string[]>, visibleText: product.visibleText as unknown as AttachmentObservation<string>, possibleUseCase: product.possibleUseCase as unknown as AttachmentObservation<string> },
      logoArtwork: { dominantColors: logo.dominantColors as unknown as AttachmentObservation<string[]>, orientation: logo.orientation as unknown as AttachmentObservation<string>, background: logo.backgroundObservation as unknown as AttachmentObservation<string>, complexity: logo.apparentComplexity as unknown as AttachmentObservation<string>, technicalReviewRequired: true, printingReviewNotes: String((logo.reviewNotes as CommercialVisualObservation).value ?? "Revisión técnica requerida") },
      competitorReference: { productName: competitor.visibleProductName as unknown as AttachmentObservation<string>, quantity: competitor.visibleQuantity as unknown as AttachmentObservation<number>, unitPriceMxn: competitor.visibleUnitPrice as unknown as AttachmentObservation<number>, totalMxn: competitor.visibleTotal as unknown as AttachmentObservation<number>, iva: competitor.ivaStatus as unknown as AttachmentObservation<string>, printing: competitor.printingStatus as unknown as AttachmentObservation<string>, shipping: competitor.shippingStatus as unknown as AttachmentObservation<string>, competitorName: competitor.visibleCompetitorName as unknown as AttachmentObservation<string>, comparability: "unknown", humanReviewRequired: true },
    } };
}

/** Builds a conservative catalog query; low-confidence analysis only contributes concrete category or visible text. */
export function buildSearchCriteriaFromVisualAnalysis(visualAnalysis: CommercialVisualAnalysis): string | null {
  if (visualAnalysis.queryReady === false) return null;
  if (visualAnalysis.queryReady && visualAnalysis.searchTerms?.length && (visualAnalysis.usableSignals ?? 0) >= 2) {
    const terms = [...new Set(visualAnalysis.searchTerms.map((term) => term.trim()).filter(Boolean))];
    if (terms.length) return terms.join(" ");
  }
  const values: string[] = [];
  const add = (observation: CommercialVisualObservation | undefined, allowLow = false) => {
    if (!observation || observation.certainty === "unknown" || !observation.value) return;
    if (visualAnalysis.confidence === "low" && !allowLow) return;
    if (Array.isArray(observation.value)) values.push(...observation.value.filter((item): item is string => typeof item === "string"));
    else if (typeof observation.value === "string") values.push(observation.value);
  };
  add(visualAnalysis.productObservation.apparentCategory, true);
  add(visualAnalysis.productObservation.visibleText, true);
  add(visualAnalysis.commercialCategory, true);
  add(visualAnalysis.primaryMaterial, visualAnalysis.confidence !== "low");
  if (visualAnalysis.keyFeatures?.length) values.push(...visualAnalysis.keyFeatures);
  add(visualAnalysis.productObservation.apparentMaterial);
  add(visualAnalysis.productObservation.apparentStyle);
  add(visualAnalysis.productObservation.apparentFeatures);
  add(visualAnalysis.productObservation.apparentColors);
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return normalized.length ? normalized.join(" ") : null;
}

export function isCommercialVisualAnalysis(value: unknown): value is CommercialVisualAnalysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["completed", "partial", "unsupported", "failed"].includes(String(candidate.analysisStatus))
    && candidate.provenance === "attachment"
    && ["high", "medium", "low"].includes(String(candidate.confidence))
    && Boolean(candidate.productObservation && candidate.logoObservation && candidate.competitorObservation);
}

export function validateAttachmentFile(file: AttachmentFileMetadata): string[] {
  const errors: string[] = [];
  if (!ALLOWED_ATTACHMENT_MIME.includes(file.type as typeof ALLOWED_ATTACHMENT_MIME[number])) errors.push("Formato no soportado");
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) errors.push("Tamaño fuera de límite");
  if (!/^[\p{L}\p{N}._ -]{1,160}$/u.test(file.name) || file.name.includes("..")) errors.push("Nombre de archivo no seguro");
  return errors;
}

const observation = <T,>(attachmentId: string, value: T | null, certainty: ObservationCertainty = "UNKNOWN", source: "attachment" | "user" = "attachment"): AttachmentObservation<T> => ({
  value, certainty, confidence: certainty === "UNKNOWN" ? "low" : certainty === "USER_CONFIRMED" ? "high" : "medium",
  source, attachmentId, observedAt: new Date().toISOString(),
});

export function createCommercialAttachment(file: AttachmentFileMetadata, type: CommercialAttachmentType, attachmentId: string = crypto.randomUUID()): CommercialAttachment {
  const errors = validateAttachmentFile(file);
  const needsReview = type === "logo" || type === "artwork" || type === "competitor_quote";
  return {
    attachmentId, type, filename: file.name, mimeType: file.type, size: file.size, source: "user_upload",
    uploadedAt: new Date().toISOString(), analysisStatus: errors.length ? "rejected" : "pending",
    analysis: { summary: observation(attachmentId, errors.length ? null : "Archivo recibido; análisis visual pendiente") },
    confidence: "low", linkedProductLineIds: [], humanReviewRequired: needsReview || Boolean(errors.length),
  };
}

/** Stores only explicit observations; it never derives SKU, price, stock, Pantone or printing cost. */
export function recordAttachmentObservations(
  attachment: CommercialAttachment,
  input: { summary?: string; category?: string; material?: string; style?: string; colors?: string[]; possibleUseCase?: string; dominantColors?: string[]; orientation?: string; background?: string; competitor?: { productName?: string; quantity?: number; unitPriceMxn?: number; totalMxn?: number; iva?: string } },
): CommercialAttachment {
  const id = attachment.attachmentId;
  const productReference = input.category || input.material || input.style || input.colors?.length || input.possibleUseCase ? {
    category: input.category ? observation(id, input.category, "USER_CONFIRMED", "user") : undefined,
    material: input.material ? observation(id, input.material, "USER_CONFIRMED", "user") : undefined,
    style: input.style ? observation(id, input.style, "USER_CONFIRMED", "user") : undefined,
    colors: input.colors?.length ? observation(id, input.colors, "USER_CONFIRMED", "user") : undefined,
    possibleUseCase: input.possibleUseCase ? observation(id, input.possibleUseCase, "USER_CONFIRMED", "user") : undefined,
  } : undefined;
  const competitorReference = input.competitor ? {
    productName: input.competitor.productName ? observation(id, input.competitor.productName, "OBSERVED") : undefined,
    quantity: input.competitor.quantity === undefined ? undefined : observation(id, input.competitor.quantity, "OBSERVED"),
    unitPriceMxn: input.competitor.unitPriceMxn === undefined ? undefined : observation(id, input.competitor.unitPriceMxn, "OBSERVED"),
    totalMxn: input.competitor.totalMxn === undefined ? undefined : observation(id, input.competitor.totalMxn, "OBSERVED"),
    iva: input.competitor.iva ? observation(id, input.competitor.iva, "OBSERVED") : observation(id, null),
    comparability: "unknown" as const, humanReviewRequired: true as const,
  } : undefined;
  return { ...attachment, analysisStatus: "analyzed", confidence: "medium", humanReviewRequired: attachment.humanReviewRequired || Boolean(competitorReference),
    analysis: { ...attachment.analysis, summary: input.summary ? observation(id, input.summary, "USER_CONFIRMED", "user") : attachment.analysis.summary, productReference, competitorReference,
      logoArtwork: attachment.type === "logo" || attachment.type === "artwork" ? { dominantColors: input.dominantColors ? observation(id, input.dominantColors, "USER_CONFIRMED", "user") : observation(id, null), orientation: input.orientation ? observation(id, input.orientation, "USER_CONFIRMED", "user") : observation(id, null), background: input.background ? observation(id, input.background, "USER_CONFIRMED", "user") : observation(id, null), technicalReviewRequired: true, printingReviewNotes: "No certificar Pantone, técnica, tintas, tamaño ni costo; requiere revisión técnica." } : attachment.analysis.logoArtwork },
  };
}

export function removeAttachment(attachments: CommercialAttachment[], attachmentId: string): CommercialAttachment[] {
  return attachments.filter((attachment) => attachment.attachmentId !== attachmentId);
}

export function linkAttachmentToLines(attachment: CommercialAttachment, lineIds: string[]): CommercialAttachment {
  return { ...attachment, linkedProductLineIds: [...new Set(lineIds)] };
}

export function selectVisualCatalogCandidate(attachment: CommercialAttachment, productId: string): CommercialAttachment {
  if (!attachment.visualCandidates?.some((candidate) => candidate.productId === productId)) return attachment;
  return { ...attachment, selectedVisualCandidateId: productId };
}

export function buildVisualSearchCriteria(attachment: CommercialAttachment): string | null {
  const reference = attachment.analysis.productReference;
  const values = [reference?.category?.value, reference?.material?.value, reference?.style?.value, reference?.colors?.value?.join(" ")].filter(Boolean);
  return values.length ? values.join(" ") : null;
}

export function attachmentHandoff(attachments: CommercialAttachment[]) {
  return attachments.map(({ attachmentId, type, filename, analysisStatus, confidence, linkedProductLineIds, humanReviewRequired, analysis, searchCriteria, catalogSearchStatus, candidateProductIds }) => ({
    attachmentId, type, filename, analysisStatus, confidence, linkedProductLineIds, humanReviewRequired,
    summary: analysis.summary?.value ?? null, visualSearchCriteria: searchCriteria ?? buildVisualSearchCriteria({ attachmentId, type, filename, analysisStatus, confidence, linkedProductLineIds, humanReviewRequired, analysis, mimeType: "", size: 0, source: "crm", uploadedAt: "" }),
    catalogSearchStatus: catalogSearchStatus ?? "not_started", candidateProductIds: candidateProductIds ?? [],
    printing: "POR CONFIRMAR", pricingAuthority: "No cambia pricing automáticamente", stockAuthority: "No se infiere desde imagen",
  }));
}
