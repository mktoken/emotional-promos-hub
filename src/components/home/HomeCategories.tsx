import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HOME_CATEGORY_CARDS } from "@/components/home/home-category-cards";

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
          HOME_CATEGORY_CARDS.map((c) => c.slug),
        );
      if (cancelled) return;
      setActiveSlugs(error ? new Set() : new Set((data ?? []).map((r) => r.slug)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = activeSlugs ? HOME_CATEGORY_CARDS.filter((c) => activeSlugs.has(c.slug)) : [];

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
                    <div className="w-full aspect-[4/3] bg-primary/[0.06] flex flex-col items-center justify-center gap-3 overflow-hidden">
                      <c.icon size={42} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Explora la categoría
                      </span>
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
