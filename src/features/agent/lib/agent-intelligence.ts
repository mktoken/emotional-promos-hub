import type { CompanyContext, OpportunityState, SectorContext } from "./agent-state";

export type IntelligenceSource = "FACT" | "INFERENCE" | "USER_PROVIDED" | "INTERNAL_HISTORY" | "EXTERNAL_RESEARCH";
export type Confidence = "high" | "medium" | "low";

export interface Provenance {
  source: IntelligenceSource;
  reference: string;
  confidence: Confidence;
  lastVerified: string;
}

export interface SectorPlaybook {
  id: string;
  sector: string;
  subsector: string;
  description: string;
  commonUseCases: string[];
  commonEvents: string[];
  commonAudiences: string[];
  recommendedCategories: string[];
  productAffinities: string[];
  productsToAvoid: string[];
  budgetPatterns: string[];
  stylePreferences: string[];
  formalityLevel: string;
  relevantQuestions: string[];
  kitIdeas: string[];
  crossSell: string[];
  objections: string[];
  commercialNotes: string[];
  seasonality: string[];
  provenance: Provenance;
}

export interface CompanyProfile {
  profileId: string;
  companyName: string;
  domain?: string;
  website?: string;
  sector?: string;
  subsector?: string;
  size?: string;
  locations?: string[];
  brandAttributes: string[];
  brandColors?: string[];
  audiences: string[];
  positioning?: string;
  knownEvents: string[];
  knownPreferences: string[];
  previousQuotes: string[];
  previousPurchases: string[];
  commercialNotes: string[];
  provenance: Provenance[];
}

export interface OpportunityContext {
  useCase?: string;
  eventType?: string;
  eventDate?: string;
  deliveryCity?: string;
  audience?: string;
  quantityPeople?: number;
  budgetTotal?: number;
  urgency?: string;
}

export interface CommercialContext {
  sector: SectorPlaybook | null;
  company: CompanyProfile | null;
  opportunity: OpportunityContext;
}

const QA_PROVENANCE: Provenance = {
  source: "INTERNAL_HISTORY", reference: "CHK-AI-SALES-1/2/3 QA", confidence: "high", lastVerified: "2026-09-28",
};

export const PILOT_SECTOR_PLAYBOOKS: SectorPlaybook[] = [
  {
    id: "corporate-events",
    sector: "Eventos corporativos",
    subsector: "Congresos, reuniones y activaciones internas",
    description: "Compras promocionales para eventos corporativos con necesidad de claridad, cantidades y revisión humana.",
    commonUseCases: ["evento corporativo", "onboarding", "regalo para asistentes"],
    commonEvents: ["congreso", "convención", "reunión corporativa", "evento interno"],
    commonAudiences: ["asistentes", "equipos internos", "clientes corporativos"],
    recommendedCategories: ["libretas y cuadernos", "bolígrafos", "termos", "bolsas"],
    productAffinities: ["libreta", "termo", "bolsa"],
    productsToAvoid: [],
    budgetPatterns: ["comparar costo por persona", "separar producto de personalización"],
    stylePreferences: ["sobrio", "útil", "coherente con la marca"],
    formalityLevel: "corporativa",
    relevantQuestions: ["¿Cuál es la audiencia principal?", "¿Qué fecha y ciudad requiere la entrega?", "¿Se necesita logo o impresión?"],
    kitIdeas: ["kit de bienvenida corporativo", "kit de asistente a evento"],
    crossSell: ["libreta → bolígrafo", "libreta → termo", "termo → bolsa"],
    objections: ["presupuesto por persona", "tiempo de entrega", "personalización por confirmar"],
    commercialNotes: ["La disponibilidad final y la impresión requieren revisión humana."],
    seasonality: ["temporadas de congresos y eventos internos"],
    provenance: { ...QA_PROVENANCE, reference: "docs/04_PRODUCT_SCOPE.md; CHK-AI-SALES QA" },
  },
  {
    id: "b2b-solutions",
    sector: "Compras B2B",
    subsector: "Kits y soluciones promocionales para empresas",
    description: "Compras empresariales que pueden agrupar artículos útiles en una solución conceptual, sin fijar SKUs ni precios por anticipado.",
    commonUseCases: ["kit corporativo", "solución para equipos", "regalo empresarial"],
    commonEvents: ["onboarding", "campaña interna", "reunión comercial"],
    commonAudiences: ["PyMEs", "equipos corporativos", "compradores B2B"],
    recommendedCategories: ["escritura", "libretas y cuadernos", "bebidas, termos y vasos", "bolsas, mochilas y viaje"],
    productAffinities: ["libreta", "bolígrafo", "termo", "bolsa"],
    productsToAvoid: [],
    budgetPatterns: ["presupuesto total", "comparación por cantidad", "cotización por solución"],
    stylePreferences: ["práctico", "consistente", "escalable"],
    formalityLevel: "B2B",
    relevantQuestions: ["¿La compra es para un evento o para uso recurrente?", "¿Qué audiencia recibirá la solución?", "¿Qué productos ya utiliza la empresa?"],
    kitIdeas: ["kit de onboarding", "kit de reunión comercial"],
    crossSell: ["libreta → bolígrafo", "termo → bolsa", "bolsa → accesorio de escritura"],
    objections: ["presupuesto total", "consistencia de cantidades", "disponibilidad por confirmar"],
    commercialNotes: ["Las ideas de kit son conceptuales; cada componente debe validarse en catálogo."],
    seasonality: ["altas de personal y campañas corporativas"],
    provenance: { source: "INTERNAL_HISTORY", reference: "docs/04_PRODUCT_SCOPE.md; docs/07_OPERATIONS_ROADMAP.md", confidence: "medium", lastVerified: "2026-09-28" },
  },
];

export const QA_COMPANY_PROFILE: CompanyProfile = {
  profileId: "qa-promohub",
  companyName: "QA Automatizado",
  domain: "qa-promohub.example.com",
  sector: "Eventos corporativos",
  subsector: "Congresos, reuniones y activaciones internas",
  brandAttributes: ["QA controlada", "revisión humana"],
  audiences: ["asistentes corporativos"],
  knownEvents: ["evento corporativo"],
  knownPreferences: [],
  previousQuotes: [],
  previousPurchases: [],
  commercialNotes: ["Identidad exclusiva para pruebas; no contactar."],
  provenance: [QA_PROVENANCE],
};

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function findSectorPlaybook(sector?: string, useCase?: string): SectorPlaybook | null {
  const haystack = normalize(`${sector ?? ""} ${useCase ?? ""}`);
  return PILOT_SECTOR_PLAYBOOKS.find((playbook) => playbook.commonUseCases.some((item) => haystack.includes(normalize(item))))
    || PILOT_SECTOR_PLAYBOOKS.find((playbook) => haystack.includes(normalize(playbook.sector)))
    || null;
}

export function loadKnownCompanyProfile(company?: Pick<CompanyContext, "name" | "domain" | "profileId">): CompanyProfile | null {
  if (!company) return null;
  const values = [company.profileId, company.name, company.domain].filter(Boolean).map((value) => normalize(value!));
  return values.some((value) => ["qa-promohub", "qa automatizado", "qa-promohub@example.com"].includes(value)) ? QA_COMPANY_PROFILE : null;
}

export function createMinimalCompanyProfile(input: { name?: string; domain?: string; sector?: string; website?: string }): CompanyProfile {
  const now = new Date().toISOString().slice(0, 10);
  return {
    profileId: `company-${normalize(input.name || "unknown").replace(/[^a-z0-9]+/g, "-") || "unknown"}`,
    companyName: input.name?.trim() || "Empresa no identificada",
    domain: input.domain?.trim() || undefined, website: input.website?.trim() || undefined,
    sector: input.sector?.trim() || undefined, brandAttributes: [], audiences: [], knownEvents: [],
    knownPreferences: [], previousQuotes: [], previousPurchases: [], commercialNotes: [],
    provenance: [{ source: "USER_PROVIDED", reference: "captura del usuario", confidence: "high", lastVerified: now }],
  };
}

export function composeCommercialContext(state: Pick<OpportunityState, "company" | "opportunity" | "sectorContext" | "sectorPlaybook" | "companyProfile">): CommercialContext {
  const company = state.companyProfile ?? loadKnownCompanyProfile(state.company);
  const sector = state.sectorPlaybook
    ?? (state.sectorContext?.sector ? findSectorPlaybook(state.sectorContext.sector) : null)
    ?? (company?.sector ? findSectorPlaybook(company.sector) : null);
  return { sector, company, opportunity: { ...state.opportunity } };
}

export function toSectorContext(playbook: SectorPlaybook): SectorContext {
  return {
    sector: playbook.sector, subsector: playbook.subsector, useCases: playbook.commonUseCases,
    audiences: playbook.commonAudiences, preferredCategories: playbook.recommendedCategories,
    preferredProducts: playbook.productAffinities, productsToAvoid: playbook.productsToAvoid,
    kits: playbook.kitIdeas, suggestedQuestions: playbook.relevantQuestions, objections: playbook.objections,
    crossSell: playbook.crossSell, style: playbook.stylePreferences.join(", "), formality: playbook.formalityLevel,
    source: playbook.provenance.reference, confidence: playbook.provenance.confidence === "high" ? 0.9 : 0.65,
    lastVerified: playbook.provenance.lastVerified,
  };
}

export function qaCommercialContext() {
  const sector = PILOT_SECTOR_PLAYBOOKS[0];
  return { sectorPlaybook: sector, sectorContext: toSectorContext(sector), companyProfile: QA_COMPANY_PROFILE,
    company: { profileId: QA_COMPANY_PROFILE.profileId, name: QA_COMPANY_PROFILE.companyName,
      domain: QA_COMPANY_PROFILE.domain, sector: QA_COMPANY_PROFILE.sector, intelligenceStatus: "found" as const } };
}

export function recommendationRationale(context: CommercialContext, productInterest: string): string | null {
  if (!context.sector) return null;
  const match = context.sector.productAffinities.some((item) => normalize(productInterest).includes(normalize(item)));
  return match ? `Encaja con ${context.sector.sector.toLowerCase()} y la audiencia definida; confirmar precio, stock y personalización con catálogo.` : null;
}

export function contextualQuestions(context: CommercialContext): string[] {
  if (!context.sector) return [];
  return context.sector.relevantQuestions.filter((question) => {
    const normalized = normalize(question);
    if (normalized.includes("fecha") && (context.opportunity.eventDate || context.opportunity.deliveryCity)) return false;
    if (normalized.includes("audiencia") && context.opportunity.audience) return false;
    return true;
  });
}

export function conceptualKit(context: CommercialContext): { name: string; components: string[]; note: string } | null {
  const idea = context.sector?.kitIdeas[0];
  if (!idea) return null;
  return { name: idea, components: context.sector.productAffinities.slice(0, 3), note: "Concepto comercial; resolver componentes, precio y disponibilidad en catálogo." };
}

export function crossSellSuggestions(context: CommercialContext, productInterest: string): string[] {
  const normalized = normalize(productInterest);
  return (context.sector?.crossSell ?? []).filter((suggestion) => normalize(suggestion).startsWith(`${normalized} →`));
}
