import { Backpack, BookOpen, Coffee, Cpu, Shirt, type LucideIcon } from "lucide-react";

export interface HomeCategoryCard {
  label: string;
  slug: string;
  icon: LucideIcon;
}

// "Regalos ejecutivos" diferida hasta que exista inventario público (decisión del propietario, opción D).
export const HOME_CATEGORY_CARDS: HomeCategoryCard[] = [
  { label: "Termos y vasos", slug: "bebidas-termos-vasos", icon: Coffee },
  { label: "Libretas", slug: "libretas-cuadernos", icon: BookOpen },
  { label: "Ropa promocional", slug: "textiles-ropa", icon: Shirt },
  { label: "Bolsas y mochilas", slug: "bolsas-mochilas-viaje", icon: Backpack },
  { label: "Tecnología", slug: "tecnologia", icon: Cpu },
];
