import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HomeCategoryCard {
  label: string;
  slug: string;
  /** Slot reemplazable: URL del asset aprobado cuando exista. */
  imageSrc?: string;
}

// "Regalos ejecutivos" diferida hasta que exista inventario público (decisión del propietario, opción D).
const CARDS: HomeCategoryCard[] = [
  { label: "Termos y vasos", slug: "bebidas-termos-vasos" },
  { label: "Libretas", slug: "libretas-cuadernos" },
  { label: "Ropa promocional", slug: "textiles-ropa" },
  { label: "Bolsas y mochilas", slug: "bolsas-mochilas-viaje" },
  { label: "Tecnología", slug: "tecnologia" },
];

export default function HomeCategories() {
  const navigate = useNavigate();
  const [activeSlugs, setActiveSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("slug")
        .eq("is_active", true)
        .in(
          "slug",
          CARDS.map((c) => c.slug),
        );
      if (cancelled) return;
      setActiveSlugs(error ? new Set() : new Set((data ?? []).map((r) => r.slug)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = activeSlugs ? CARDS.filter((c) => activeSlugs.has(c.slug)) : [];

  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Encuentra lo que necesitas</h2>

        {activeSlugs === null ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} aria-label="Cargando" />
          </div>
        ) : (
          visible.length > 0 && (
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {visible.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => navigate(`/?view=catalog&category=${encodeURIComponent(c.slug)}`)}
                    className="group w-full min-h-[44px] text-left bg-surface rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                      {c.imageSrc ? (
                        <img
                          src={c.imageSrc}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-contain p-4"
                        />
                      ) : (
                        <ImageIcon size={32} className="text-muted-foreground opacity-40" aria-hidden="true" />
                      )}
                    </div>
                    <p className="p-4 font-bold text-foreground text-sm md:text-base group-hover:text-primary transition-colors">
                      {c.label}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/?view=catalog&choose=categories")}
            className="min-h-[44px] px-6 inline-flex items-center gap-2 rounded-lg border border-border bg-surface font-semibold text-foreground hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver todo el catálogo <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
