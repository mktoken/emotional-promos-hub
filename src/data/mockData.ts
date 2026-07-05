import { Coffee, BookOpen, Leaf, Activity, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  icon: LucideIcon;
  color: string;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  stock: number;
  imgAlt: string;
  imageUrl?: string;
  agregableToProposal?: boolean;
  disponibilidad?: string;
  material?: string;
  claveVariante?: string;
}

export type PersonalizationOptionKey =
  | "none"
  | "logo_1_ink"
  | "logo_2_ink"
  | "logo_3_plus_ink"
  | "full_color"
  | "engraving"
  | "advisor_review";

export interface PersonalizationOptionRule {
  label: string;
  status?: "allowed" | "recommended_economy" | "allowed_with_validation" | "manual_review" | "not_recommended" | string;
  message?: string;
}

export interface PersonalizationCapabilities {
  can_personalize?: boolean;
  can_print_1_ink?: boolean;
  can_print_2_ink?: boolean;
  can_print_3_plus_ink?: boolean;
  can_full_color?: boolean;
  can_engrave?: boolean;
  max_recommended_inks?: number;
  economy_recommendation?: PersonalizationOptionKey;
  requires_manual_review?: boolean;
  public_note?: string;
  restriction_note?: string;
  options?: Partial<Record<PersonalizationOptionKey, PersonalizationOptionRule>>;
}

export interface RequestedPersonalization {
  tipo: PersonalizationOptionKey;
  label: string;
  status?: string;
  message?: string;
  requiereRevision?: boolean;
}

export interface EconomyPersonalizationSuggestion {
  tipo: PersonalizationOptionKey;
  label: string;
  incluida: boolean;
  motivo?: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  category: string;
  breadcrumbs: string[];
  description: string;
  basePrice: number;
  colors: ProductColor[];
  images?: string[];
  specs: {
    material: string;
    delivery: string;
  };
  printArea: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
}

export interface QuoteItem {
  cartId: number;
  productId: string;
  name: string;
  sku: string;
  claveProducto?: string;
  modeloComercial?: string;
  descripcionComercial?: string;
  color: ProductColor;
  quantity: number;
  logoFormat: string;
  personalizacionSolicitadaCliente?: RequestedPersonalization;
  personalizacionSugeridaEconomica?: EconomyPersonalizationSuggestion | null;
  requiereRevisionTecnica?: boolean;
  personalizationCompatibilityNote?: string;
  estimatedTotal: number;
  estimatedUnit: number;
  hasVirtualSample: boolean;
  imageUrl?: string;
  entregaEstimada?: string;
  personalizacionPublica?: string;
  material?: string;
}

export const catalogMock: CatalogProduct[] = [
  {
    id: "prod_1",
    name: 'Termo "Matterhorn" 20oz',
    category: "Drinkware",
    price: 185.0,
    stock: 14520,
    icon: Coffee,
    color: "bg-slate-200 text-slate-600",
  },
  {
    id: "prod_2",
    name: "Libreta Curpiel Ejecutiva",
    category: "Oficina",
    price: 95.0,
    stock: 8300,
    icon: BookOpen,
    color: "bg-slate-200 text-slate-600",
  },
  {
    id: "prod_3",
    name: "Bolígrafo Bambú Eco",
    category: "Eco",
    price: 22.5,
    stock: 25000,
    icon: Leaf,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "prod_4",
    name: "Powerbank 10,000mAh",
    category: "Tecnología",
    price: 340.0,
    stock: 3200,
    icon: Activity,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "prod_5",
    name: "Mochila Antirrobo Premium",
    category: "Mochilas",
    price: 450.0,
    stock: 1200,
    icon: Package,
    color: "bg-slate-200 text-slate-600",
  },
  {
    id: "prod_6",
    name: "Taza Cerámica 11oz Blanca",
    category: "Drinkware",
    price: 38.0,
    stock: 45000,
    icon: Coffee,
    color: "bg-slate-200 text-slate-600",
  },
];

export const productMock: ProductDetail = {
  id: "prod_1",
  name: 'Termo "Matterhorn" 20oz',
  sku: "TM-4052",
  category: "Drinkware & Termos",
  breadcrumbs: ["Catálogo", "Drinkware", "Termos Metálicos"],
  description:
    "Termo premium de acero inoxidable con doble pared al vacío. Mantiene bebidas frías por 24h y calientes por 12h. Diseño elegante y ergonómico, ideal para regalos corporativos de alto nivel directivo.",
  basePrice: 185.0,
  colors: [
    { id: "c1", name: "Negro Mate", hex: "#1e293b", stock: 5200, imgAlt: "Termo Negro Mate" },
    { id: "c2", name: "Azul Marino", hex: "#1e3a8a", stock: 4100, imgAlt: "Termo Azul Marino" },
    { id: "c3", name: "Acero Inoxidable", hex: "#cbd5e1", stock: 3800, imgAlt: "Termo Color Acero" },
    { id: "c4", name: "Blanco Nieve", hex: "#f8fafc", stock: 1420, imgAlt: "Termo Blanco" },
  ],
  specs: {
    material: "Acero Inoxidable 304 / Tapa Tritán Libre BPA",
    delivery: "A partir de 10 días hábiles (Sujeto a cotización)",
  },
  printArea: {
    top: "35%",
    left: "35%",
    width: "30%",
    height: "40%",
  },
};
