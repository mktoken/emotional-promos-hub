import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Leaf, Loader2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface SubcategoryRow {
  category_slug: string;
  category_name: string;
  subcategory_slug: string;
  subcategory_name: string;
  product_count: number;
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

interface MobileFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  // Estado APLICADO actualmente (fuente de verdad = URL)
  appliedCategorySlug: string | null;
  appliedSubcategorySlug: string | null;
  appliedEcoOnly: boolean;
  hasEcoCollection: boolean;
  totalCount: number | null;
  // Datos
  categories: CategoryOption[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  onRetryCategories: () => void;
  // Acción: aplicar selección pendiente (única forma de tocar la URL desde aquí)
  onApply: (patch: {
    category: string | null;
    subcategory: string | null;
    ecoOnly: boolean;
  }) => void;
}

export default function MobileFiltersDrawer({
  open,
  onOpenChange,
  trigger,
  appliedCategorySlug,
  appliedSubcategorySlug,
  appliedEcoOnly,
  hasEcoCollection,
  totalCount,
  categories,
  categoriesLoading,
  categoriesError,
  onRetryCategories,
  onApply,
}: MobileFiltersDrawerProps) {
  // Estado PENDIENTE (solo se materializa al pulsar el CTA)
  const [pendingCategory, setPendingCategory] = useState<string | null>(appliedCategorySlug);
  const [pendingSubcategory, setPendingSubcategory] = useState<string | null>(appliedSubcategorySlug);
  const [pendingEcoOnly, setPendingEcoOnly] = useState<boolean>(appliedEcoOnly);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(appliedCategorySlug);
  const [applying, setApplying] = useState(false);

  // Subcategorías del nodo expandido
  const [expandedSubs, setExpandedSubs] = useState<SubcategoryRow[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState(false);

  // Al abrir el drawer: pending := applied (descarta cualquier pendiente previo).
  useEffect(() => {
    if (open) {
      setPendingCategory(appliedCategorySlug);
      setPendingSubcategory(appliedSubcategorySlug);
      setPendingEcoOnly(appliedEcoOnly);
      setExpandedSlug(appliedCategorySlug);
      setApplying(false);
    }
  }, [open, appliedCategorySlug, appliedSubcategorySlug, appliedEcoOnly]);

  const loadSubcategories = useCallback(
    async (slug: string) => {
      setExpandedLoading(true);
      setExpandedError(false);
      try {
        const rpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;
        const { data, error } = await rpc("get_catalog_subcategories_with_counts", {
          p_category_slug: slug,
          p_collection_slug: pendingEcoOnly ? "ecologicos" : null,
        });
        if (error) throw new Error(error.message);
        const rows = ((data as SubcategoryRow[] | null) ?? []).filter(
          (r) => Number(r.product_count) > 0,
        );
        setExpandedSubs(rows);
      } catch {
        setExpandedError(true);
        setExpandedSubs([]);
      } finally {
        setExpandedLoading(false);
      }
    },
    [pendingEcoOnly],
  );

  useEffect(() => {
    if (!open) return;
    if (!expandedSlug) {
      setExpandedSubs([]);
      return;
    }
    loadSubcategories(expandedSlug);
  }, [open, expandedSlug, loadSubcategories]);

  const handleToggleExpand = (slug: string) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  };

  const selectAllProducts = () => {
    setPendingCategory(null);
    setPendingSubcategory(null);
    setPendingEcoOnly(false);
    setExpandedSlug(null);
  };

  const selectCategoryAll = (slug: string) => {
    setPendingCategory(slug);
    setPendingSubcategory(null);
  };

  const selectSubcategory = (categorySlug: string, subSlug: string) => {
    setPendingCategory(categorySlug);
    setPendingSubcategory(subSlug);
  };

  const togglePendingEco = () => {
    setPendingEcoOnly((v) => !v);
  };

  const handleApply = () => {
    if (applying) return;
    setApplying(true);
    onApply({
      category: pendingCategory,
      subcategory: pendingSubcategory,
      ecoOnly: pendingEcoOnly,
    });
    onOpenChange(false);
  };

  // "Limpiar" NO cierra el drawer, NO toca la URL, NO ejecuta búsqueda.
  // Solo limpia el estado pendiente para permitir elegir otra cosa.
  const handleClearPending = () => {
    setPendingCategory(null);
    setPendingSubcategory(null);
    setPendingEcoOnly(false);
    setExpandedSlug(null);
  };

  const pendingMatchesApplied =
    pendingCategory === appliedCategorySlug &&
    pendingSubcategory === appliedSubcategorySlug &&
    pendingEcoOnly === appliedEcoOnly;

  const pendingIsEmpty =
    pendingCategory === null && pendingSubcategory === null && !pendingEcoOnly;

  const ctaLabel =
    pendingMatchesApplied && totalCount !== null && totalCount > 0
      ? `Ver ${totalCount.toLocaleString("es-MX")} productos`
      : "Aplicar filtros";

  const isAllSelected = pendingIsEmpty;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] sm:w-96 p-0 flex flex-col h-dvh"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        {/* Lista con scroll independiente */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {/* Categorías */}
          <section aria-labelledby="mf-categorias" className="mb-4">
            <h3
              id="mf-categorias"
              className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-2 mb-2"
            >
              Categorías
            </h3>

            {/* Todos los productos */}
            <button
              type="button"
              onClick={selectAllProducts}
              role="radio"
              aria-checked={isAllSelected}
              className={`w-full min-h-11 flex items-center px-3 py-3 rounded-lg text-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isAllSelected
                  ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                  : "text-foreground hover:bg-secondary border border-transparent"
              }`}
            >
              <span className="flex-1">Todos los productos</span>
              {isAllSelected && (
                <span className="text-[10px] uppercase font-bold tracking-wide">Seleccionado</span>
              )}
            </button>

            {/* Estados de carga/error/vacío */}
            {categoriesLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin" />
                Cargando categorías...
              </div>
            ) : categoriesError ? (
              <div className="px-3 py-4 text-sm">
                <p className="text-destructive mb-2">No pudimos cargar las categorías.</p>
                <button
                  type="button"
                  onClick={onRetryCategories}
                  className="text-primary font-semibold underline"
                >
                  Reintentar
                </button>
              </div>
            ) : categories.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No hay categorías disponibles.
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5" role="radiogroup" aria-label="Categoría">
                {categories.map((cat) => {
                  const isExpanded = expandedSlug === cat.slug;
                  const isPendingCat =
                    pendingCategory === cat.slug && pendingSubcategory === null;
                  const isPendingInBranch = pendingCategory === cat.slug;
                  const showSubs = isExpanded;

                  return (
                    <li key={cat.slug}>
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(cat.slug)}
                        aria-expanded={isExpanded}
                        aria-controls={`mf-subs-${cat.slug}`}
                        className={`w-full min-h-11 flex items-center gap-2 px-3 py-3 rounded-lg text-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isPendingInBranch
                            ? "bg-primary/5 text-foreground font-semibold"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="flex-1 truncate">{cat.name}</span>
                        {isPendingCat && (
                          <span className="text-[10px] uppercase font-bold tracking-wide text-primary">
                            Sel.
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {showSubs && (
                        <div
                          id={`mf-subs-${cat.slug}`}
                          className="pl-4 ml-2 border-l-2 border-primary/20 mt-1 mb-2 space-y-0.5"
                        >
                          {/* Todas en [categoría] */}
                          <button
                            type="button"
                            onClick={() => selectCategoryAll(cat.slug)}
                            role="radio"
                            aria-checked={isPendingCat}
                            className={`w-full min-h-11 flex items-center px-3 py-2.5 rounded-lg text-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isPendingCat
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                          >
                            <span className="flex-1">Todas en {cat.name}</span>
                            {isPendingCat && (
                              <span className="text-[10px] uppercase font-bold tracking-wide">
                                Sel.
                              </span>
                            )}
                          </button>

                          {expandedLoading ? (
                            <div className="flex items-center gap-2 px-3 py-3 text-muted-foreground text-xs">
                              <Loader2 size={14} className="animate-spin" />
                              Cargando subcategorías...
                            </div>
                          ) : expandedError ? (
                            <div className="px-3 py-2 text-xs">
                              <p className="text-destructive mb-1">Error al cargar.</p>
                              <button
                                type="button"
                                onClick={() => loadSubcategories(cat.slug)}
                                className="text-primary font-semibold underline"
                              >
                                Reintentar
                              </button>
                            </div>
                          ) : expandedSubs.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground italic">
                              Sin subcategorías.
                            </p>
                          ) : (
                            expandedSubs.map((sub) => {
                              const isSel =
                                pendingCategory === cat.slug &&
                                pendingSubcategory === sub.subcategory_slug;
                              return (
                                <button
                                  key={sub.subcategory_slug}
                                  type="button"
                                  onClick={() =>
                                    selectSubcategory(cat.slug, sub.subcategory_slug)
                                  }
                                  role="radio"
                                  aria-checked={isSel}
                                  className={`w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isSel
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  }`}
                                >
                                  <span className="truncate flex-1">{sub.subcategory_name}</span>
                                  <span
                                    className={`text-xs ${
                                      isSel ? "text-primary" : "text-muted-foreground/70"
                                    }`}
                                  >
                                    ({Number(sub.product_count).toLocaleString("es-MX")})
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Colecciones */}
          {hasEcoCollection && (
            <section aria-labelledby="mf-colecciones" className="mb-4">
              <h3
                id="mf-colecciones"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-2 mb-2"
              >
                Colecciones
              </h3>
              <button
                type="button"
                onClick={togglePendingEco}
                aria-pressed={pendingEcoOnly}
                className={`w-full min-h-11 flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  pendingEcoOnly
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-secondary text-secondary-foreground border-transparent hover:border-success/30"
                }`}
              >
                <Leaf size={16} />
                <span className="flex-1 text-left">Ecológicos</span>
                {pendingEcoOnly && <X size={14} aria-hidden />}
              </button>
            </section>
          )}
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 border-t border-border bg-card px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearPending}
            disabled={pendingIsEmpty}
            className="min-h-11 px-4 text-sm font-semibold text-muted-foreground hover:text-destructive underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="flex-1 min-h-11 bg-primary text-primary-foreground font-bold rounded-lg px-4 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {applying ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 size={16} className="animate-spin" />
                Aplicando...
              </span>
            ) : (
              ctaLabel
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
