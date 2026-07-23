import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Loader2,
  Leaf,
  X,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  MoreHorizontal,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeProductImages } from "@/lib/product-images";
import SafeProductImage from "@/components/catalog/SafeProductImage";
import MobileFiltersDrawer from "@/components/catalog/MobileFiltersDrawer";





interface RpcProduct {
  id: string;
  id_interno: string;
  sku_base: string | null;
  nombre: string | null;
  descripcion: string | null;
  imagenes: unknown;
  precio_desde_mxn: number | null;
  categoria_slug: string | null;
  categoria_nombre: string | null;
  subcategoria_slug: string | null;
  subcategoria_nombre: string | null;
  relevance: number | null;
  total_count: number | null;
}

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

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const SCROLL_KEY_PREFIX = "catalog-scroll:";




interface CatalogViewProps {
  onViewChange: (view: string) => void;
  onOpenProduct: (productId: string) => void;
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export default function CatalogView({ onOpenProduct }: CatalogViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado derivado de URL
  const q = searchParams.get("q") ?? "";
  const selectedCategorySlug = searchParams.get("category");
  const selectedSubcategorySlug = searchParams.get("subcategory");
  const ecoOnly = searchParams.get("eco") === "1";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const choose = searchParams.get("choose");
  const isMobile = useIsMobile();

  const [inputValue, setInputValue] = useState(q);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesReloadKey, setCategoriesReloadKey] = useState(0);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasEcoCollection, setHasEcoCollection] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (searchParams.get("choose") !== "categories") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });


  const catalogTopRef = useRef<HTMLDivElement | null>(null);
  const productsTopRef = useRef<HTMLDivElement | null>(null);
  const prevSearchRef = useRef<string | null>(null);
  const autoOpenedCategoriesRef = useRef(false);


  // Actualizar params conservando view=catalog
  const updateParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams);
      next.set("view", "catalog");
      // limpiar returnTo/product si quedaran de una vuelta anterior
      next.delete("returnTo");
      next.delete("product");
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  // Sync input local con URL cuando cambia externamente
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  // Debounce input → URL
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== q) {
        updateParams({ q: trimmed || null, page: null });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // Carga inicial: categorías y colección Ecológicos
  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(false);
    (async () => {
      try {
        const [catsRes, ecoColRes] = await Promise.all([
          supabase
            .from("product_categories")
            .select("id,name,slug,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase.from("product_collections").select("id").eq("slug", "ecologicos").maybeSingle(),
        ]);
        if (cancelled) return;
        if (catsRes.error) throw new Error(catsRes.error.message);
        setCategories((catsRes.data ?? []) as CategoryOption[]);
        setHasEcoCollection(!!ecoColRes.data);
      } catch {
        if (cancelled) return;
        setCategoriesError(true);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoriesReloadKey]);


  // Subcategorías dinámicas vía RPC
  useEffect(() => {
    let cancelled = false;
    if (!selectedCategorySlug) {
      setSubcategories([]);
      return;
    }
    (async () => {
      const rpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;
      const { data, error } = await rpc("get_catalog_subcategories_with_counts", {
        p_category_slug: selectedCategorySlug,
        p_collection_slug: ecoOnly ? "ecologicos" : null,
      });
      if (cancelled) return;
      if (error) {
        setSubcategories([]);
        return;
      }
      const rows = (data as SubcategoryRow[] | null) ?? [];
      setSubcategories(rows.filter((r) => Number(r.product_count) > 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategorySlug, ecoOnly]);

  // Fetch productos con paginación numerada
  const fetchProducts = useCallback(async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      const rpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;
      const { data, error } = await rpc("catalog_search_products", {
        p_query: q,
        p_category_slug: selectedCategorySlug || null,
        p_collection_slug: ecoOnly ? "ecologicos" : null,
        p_min_price: null,
        p_max_price: null,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
        p_subcategory_slug: selectedSubcategorySlug || null,
      });
      if (error) throw new Error(error.message);
      const rows = ((data as RpcProduct[] | null) ?? []);
      const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
      setTotalCount(total);
      setProducts(rows);
    } catch (err) {
      setErrorList(err instanceof Error ? err.message : "Error cargando catálogo");
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoadingList(false);
    }
  }, [q, selectedCategorySlug, selectedSubcategorySlug, ecoOnly, page]);


  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Scroll: restaurar posición si volvemos con la misma URL,
  // o llevar al inicio del listado al cambiar filtros/página.
  useEffect(() => {
    if (loadingList) return;
    const currentSearch = window.location.search;
    const scrollKey = `${SCROLL_KEY_PREFIX}${window.location.pathname}${currentSearch}`;
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(scrollKey) : null;

    if (saved != null) {
      sessionStorage.removeItem(scrollKey);
      const y = Number.parseInt(saved, 10);
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number.isFinite(y) ? y : 0, behavior: "instant" as ScrollBehavior });
      });
    } else if (prevSearchRef.current !== null && prevSearchRef.current !== currentSearch) {
      requestAnimationFrame(() => {
        (productsTopRef.current ?? catalogTopRef.current)?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      });
    }
    prevSearchRef.current = currentSearch;
  }, [loadingList, products]);

  // Cálculos de paginación
  const totalPages = totalCount && totalCount > 0 ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;

  // Si la página actual quedó fuera de rango tras un filtro, corregir en URL.
  useEffect(() => {
    if (loadingList) return;
    if (totalCount === null) return;
    if (page > totalPages) {
      updateParams({ page: totalPages > 1 ? totalPages : null });
    }
  }, [loadingList, totalCount, totalPages, page, updateParams]);

  // Si la subcategoría seleccionada ya no existe para la categoría/colección actual, limpiarla.
  useEffect(() => {
    if (!selectedSubcategorySlug) return;
    if (subcategories.length === 0) return;
    const stillExists = subcategories.some((s) => s.subcategory_slug === selectedSubcategorySlug);
    if (!stillExists) {
      updateParams({ subcategory: null, page: null });
    }
  }, [subcategories, selectedSubcategorySlug, updateParams]);

  // Handlers
  const selectCategory = (slug: string | null) => {
    updateParams({ category: slug, subcategory: null, page: null });
    setMobileFiltersOpen(false);
  };
  const selectSubcategory = (slug: string | null) => {
    updateParams({ subcategory: slug, page: null });
    setMobileFiltersOpen(false);
  };
  const toggleEco = () => {
    updateParams({ eco: ecoOnly ? null : "1", page: null });
  };
  const clearAll = () => {
    const next = new URLSearchParams();
    next.set("view", "catalog");
    setSearchParams(next);
    setInputValue("");
    setMobileFiltersOpen(false);
  };
  const goToPage = (target: number) => {
    const clamped = Math.max(1, Math.min(totalPages, target));
    if (clamped === page) return;
    updateParams({ page: clamped === 1 ? null : clamped });
  };

  const activeCategory = categories.find((c) => c.slug === selectedCategorySlug) ?? null;
  const activeSubcategory = subcategories.find((s) => s.subcategory_slug === selectedSubcategorySlug) ?? null;

  const activeFilterCount =
    (selectedCategorySlug ? 1 : 0) + (selectedSubcategorySlug ? 1 : 0) + (ecoOnly ? 1 : 0) + (q ? 1 : 0);

  const categoryButtons = useMemo(
    () => [{ slug: null as string | null, name: "Todos" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))],
    [categories],
  );

  // División de subcategorías: primeras N como chips + resto en dropdown "Más subcategorías".
  const MAX_VISIBLE_SUBS = 6;
  const { visibleSubs, overflowSubs } = useMemo(() => {
    if (subcategories.length <= MAX_VISIBLE_SUBS) {
      return { visibleSubs: subcategories, overflowSubs: [] as SubcategoryRow[] };
    }
    const base = subcategories.slice(0, MAX_VISIBLE_SUBS);
    const rest = subcategories.slice(MAX_VISIBLE_SUBS);
    // Si la subcategoría activa está en el overflow, promoverla al visible.
    if (
      selectedSubcategorySlug &&
      !base.some((s) => s.subcategory_slug === selectedSubcategorySlug) &&
      rest.some((s) => s.subcategory_slug === selectedSubcategorySlug)
    ) {
      const active = rest.find((s) => s.subcategory_slug === selectedSubcategorySlug)!;
      const newBase = [active, ...base.slice(0, MAX_VISIBLE_SUBS - 1)];
      const newRest = subcategories.filter((s) => !newBase.some((b) => b.subcategory_slug === s.subcategory_slug));
      return { visibleSubs: newBase, overflowSubs: newRest };
    }
    return { visibleSubs: base, overflowSubs: rest };
  }, [subcategories, selectedSubcategorySlug]);

  // Números de página visibles estilo Google (máx ~7 items incluyendo ellipsis).
  const pageNumbers = useMemo<Array<number | "…">>(() => {
    const items: Array<number | "…"> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }
    const add = (n: number | "…") => items.push(n);
    add(1);
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) add("…");
    for (let i = left; i <= right; i++) add(i);
    if (right < totalPages - 1) add("…");
    add(totalPages);
    return items;
  }, [page, totalPages]);




  return (
    <div className="pb-20 bg-surface min-h-screen">
      <div className="bg-dark-section text-dark-section-foreground py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Catálogo Mayorista</h1>
          <p className="text-dark-section-foreground/60 max-w-2xl mx-auto mb-8">
            Inventario enlazado en tiempo real con los principales importadores de México.
          </p>
          <div className="max-w-2xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-muted-foreground" size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar por producto, categoría o SKU..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-card text-foreground rounded-full py-4 pl-12 pr-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div
        ref={catalogTopRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
      >
        {/* Breadcrumb */}
        <nav className="text-xs sm:text-sm text-muted-foreground mb-4 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={clearAll}
            className="hover:text-foreground font-semibold"
          >
            Catálogo
          </button>
          {activeCategory && (
            <>
              <ChevronRight size={14} />
              <button
                type="button"
                onClick={() => selectSubcategory(null)}
                className="hover:text-foreground"
              >
                {activeCategory.name}
              </button>
            </>
          )}
          {activeSubcategory && (
            <>
              <ChevronRight size={14} />
              <span className="text-foreground font-semibold">{activeSubcategory.subcategory_name}</span>
            </>
          )}
        </nav>

        {/* Barra móvil: botón filtros + chips activos */}
        <div className="md:hidden mb-4 flex items-center gap-2 flex-wrap">
          <MobileFiltersDrawer
            open={mobileFiltersOpen}
            onOpenChange={setMobileFiltersOpen}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 ? `Filtros · ${activeFilterCount}` : "Filtros"}
              </button>
            }
            appliedCategorySlug={selectedCategorySlug}
            appliedSubcategorySlug={selectedSubcategorySlug}
            ecoOnly={ecoOnly}
            hasEcoCollection={hasEcoCollection}
            totalCount={totalCount}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            onRetryCategories={() => setCategoriesReloadKey((k) => k + 1)}
            onApply={({ category, subcategory }) => {
              updateParams({ category, subcategory, page: null });
            }}
            onToggleEco={toggleEco}
            onClearAll={clearAll}
          />


          {activeCategory && (
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold"
            >
              {activeCategory.name} <X size={12} />
            </button>
          )}
          {activeSubcategory && (
            <button
              type="button"
              onClick={() => selectSubcategory(null)}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold"
            >
              {activeSubcategory.subcategory_name} <X size={12} />
            </button>
          )}
          {ecoOnly && (
            <button
              type="button"
              onClick={toggleEco}
              className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-3 py-1.5 rounded-full font-semibold"
            >
              Ecológicos <X size={12} />
            </button>
          )}
          {q && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                updateParams({ q: null, page: null });
              }}
              className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full font-semibold"
            >
              "{q}" <X size={12} />
            </button>
          )}
        </div>

        {/* Desktop: chips horizontales de categorías */}
        <div className="hidden md:flex items-center gap-2 flex-wrap mb-3">
          {categoryButtons.map((cat) => {
            const active = selectedCategorySlug === cat.slug;
            return (
              <button
                key={cat.slug ?? "todos"}
                type="button"
                onClick={() => selectCategory(cat.slug)}
                className={`text-sm px-3 py-1.5 rounded-full border transition font-semibold ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
          {hasEcoCollection && (
            <button
              type="button"
              onClick={toggleEco}
              className={`text-sm px-3 py-1.5 rounded-full border transition font-semibold inline-flex items-center gap-1 ${
                ecoOnly
                  ? "bg-success text-success-foreground border-success"
                  : "bg-card text-muted-foreground border-border hover:border-success/50"
              }`}
            >
              <Leaf size={14} /> Ecológicos
            </button>
          )}
        </div>

        {/* Desktop: subcategorías de la categoría activa */}
        {activeCategory && subcategories.length > 0 && (
          <div className="hidden md:flex items-center gap-2 flex-wrap mb-4 border-l-2 border-primary/30 pl-3">
            <button
              type="button"
              onClick={() => selectSubcategory(null)}
              className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
                !selectedSubcategorySlug
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {visibleSubs.map((sub) => {
              const active = selectedSubcategorySlug === sub.subcategory_slug;
              return (
                <button
                  key={sub.subcategory_slug}
                  type="button"
                  onClick={() => selectSubcategory(sub.subcategory_slug)}
                  className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
                    active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sub.subcategory_name} ({Number(sub.product_count).toLocaleString("es-MX")})
                </button>
              );
            })}
            {overflowSubs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold bg-secondary text-muted-foreground hover:text-foreground transition"
                  >
                    <MoreHorizontal size={14} /> Más subcategorías ({overflowSubs.length})
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                  {overflowSubs.map((sub) => (
                    <DropdownMenuItem
                      key={sub.subcategory_slug}
                      onSelect={() => selectSubcategory(sub.subcategory_slug)}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{sub.subcategory_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {Number(sub.product_count).toLocaleString("es-MX")}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}


        {activeFilterCount > 0 && (
          <div className="hidden md:flex items-center gap-2 mb-6">
            <span className="text-xs text-muted-foreground">Filtros activos:</span>
            {q && (
              <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                "{q}"
                <button
                  onClick={() => {
                    setInputValue("");
                    updateParams({ q: null, page: null });
                  }}
                  aria-label="Quitar búsqueda"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-xs font-semibold text-muted-foreground hover:text-destructive underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Grid */}
        <div ref={productsTopRef} className="mt-2 scroll-mt-24">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 size={40} className="animate-spin text-primary" />
              <p className="font-medium">Cargando catálogo...</p>
            </div>
          ) : errorList ? (
            <div className="text-center py-20 text-destructive">
              <p className="font-semibold mb-2">No pudimos cargar el catálogo.</p>
              <button onClick={() => fetchProducts()} className="mt-2 text-primary underline text-sm">
                Reintentar
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="mb-3">
                No encontramos productos con esos filtros. Prueba cambiar la subcategoría o limpiar filtros.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-primary font-semibold underline text-sm"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {totalCount !== null && totalCount > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  Mostrando{" "}
                  <strong className="text-foreground">
                    {((page - 1) * PAGE_SIZE + 1).toLocaleString("es-MX")}
                    –
                    {Math.min(page * PAGE_SIZE, totalCount).toLocaleString("es-MX")}
                  </strong>{" "}
                  de {totalCount.toLocaleString("es-MX")} productos
                  {totalPages > 1 && (
                    <>
                      {" · "}Página {page} de {totalPages}
                    </>
                  )}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => {
                  const nombre = prod.nombre ?? prod.id_interno;
                  const precio = Number(prod.precio_desde_mxn || 0);
                  const imgs = normalizeProductImages(prod.imagenes);

                  return (
                    <div
                      key={prod.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                      onClick={() => onOpenProduct(prod.id)}
                    >
                      <div className="aspect-square bg-white relative flex items-center justify-center overflow-hidden">
                        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border z-10 max-w-[70%] truncate">
                          {prod.categoria_nombre ?? "General"}
                          {prod.subcategoria_nombre ? ` · ${prod.subcategoria_nombre}` : ""}
                        </div>
                        <SafeProductImage
                          images={imgs}
                          alt={nombre ?? "Producto"}
                          loading="lazy"
                          imgClassName="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          placeholderClassName="w-full h-full flex items-center justify-center"
                          placeholderSize={80}
                        />
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-foreground mb-2 line-clamp-1">{nombre}</h3>
                        {precio > 0 && (
                          <p className="text-muted-foreground text-sm mb-4">
                            Desde{" "}
                            <strong className="text-foreground">
                              {precio.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                            </strong>{" "}
                            c/u
                          </p>
                        )}
                        <button className="w-full bg-secondary hover:bg-primary/10 text-secondary-foreground hover:text-primary font-semibold py-2 rounded-lg transition-colors border border-transparent hover:border-primary/20 text-sm">
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-10 flex flex-col items-center gap-3"
                  aria-label="Paginación de catálogo"
                >
                  {/* Mobile compacto */}
                  <div className="flex items-center gap-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1 || loadingList}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold disabled:opacity-40"
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="text-sm text-muted-foreground font-medium px-2">
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages || loadingList}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold disabled:opacity-40"
                    >
                      Siguiente <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Desktop numerado */}
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1 || loadingList}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:border-primary/50 disabled:opacity-40 disabled:hover:border-border"
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    {pageNumbers.map((n, idx) =>
                      n === "…" ? (
                        <span key={`ell-${idx}`} className="px-2 text-muted-foreground select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          onClick={() => goToPage(n)}
                          disabled={loadingList}
                          aria-current={n === page ? "page" : undefined}
                          className={`min-w-9 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                            n === page
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {n}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages || loadingList}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:border-primary/50 disabled:opacity-40 disabled:hover:border-border"
                    >
                      Siguiente <ChevronRight size={16} />
                    </button>
                  </div>
                </nav>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
