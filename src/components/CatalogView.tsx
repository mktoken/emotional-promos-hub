import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Package,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

const pickUrlFromItem = (item: unknown): string | null => {
  if (!item) return null;
  if (isHttpUrl(item)) return item;
  if (typeof item === "object") {
    const url = (item as { url?: unknown }).url;
    if (isHttpUrl(url)) return url;
  }
  return null;
};

const getSafeImageUrl = (imgData: unknown): string | null => {
  if (!imgData) return null;
  if (Array.isArray(imgData)) {
    for (const item of imgData) {
      const u = pickUrlFromItem(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof imgData === "string") {
    if (isHttpUrl(imgData)) return imgData;
    try {
      return getSafeImageUrl(JSON.parse(imgData));
    } catch {
      return null;
    }
  }
  if (typeof imgData === "object") return pickUrlFromItem(imgData);
  return null;
};

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

  const [inputValue, setInputValue] = useState(q);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasEcoCollection, setHasEcoCollection] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const catalogTopRef = useRef<HTMLDivElement | null>(null);
  const productsTopRef = useRef<HTMLDivElement | null>(null);
  const prevSearchRef = useRef<string | null>(null);


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
    (async () => {
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
      setCategories((catsRes.data ?? []) as CategoryOption[]);
      setHasEcoCollection(!!ecoColRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Scroll restore / scroll top al cambiar filtros
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
        catalogTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
    prevSearchRef.current = currentSearch;
  }, [loadingList, products]);

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
  const loadMore = () => {
    updateParams({ page: page + 1 });
  };

  const hasMore = totalCount !== null && products.length < totalCount;
  const activeCategory = categories.find((c) => c.slug === selectedCategorySlug) ?? null;
  const activeSubcategory = subcategories.find((s) => s.subcategory_slug === selectedSubcategorySlug) ?? null;

  const activeFilterCount =
    (selectedCategorySlug ? 1 : 0) + (selectedSubcategorySlug ? 1 : 0) + (ecoOnly ? 1 : 0) + (q ? 1 : 0);

  const categoryButtons = useMemo(
    () => [{ slug: null as string | null, name: "Todos" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))],
    [categories],
  );

  // Panel de filtros reutilizable (desktop sidebar + mobile sheet)
  const FiltersPanel = (
    <div className="space-y-6">
      {hasEcoCollection && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Colecciones</h4>
          <button
            type="button"
            onClick={toggleEco}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
              ecoOnly
                ? "bg-success/10 text-success border-success/30"
                : "bg-secondary text-secondary-foreground border-transparent hover:border-success/30"
            }`}
          >
            <Leaf size={16} />
            Ecológicos
          </button>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Categorías</h4>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {categoryButtons.map((cat) => {
            const active = selectedCategorySlug === cat.slug;
            return (
              <button
                key={cat.slug ?? "todos"}
                type="button"
                onClick={() => selectCategory(cat.slug)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{cat.name}</span>
                {active && <ChevronRight size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategorySlug && subcategories.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Subcategorías</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => selectSubcategory(null)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition ${
                !selectedSubcategorySlug
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {subcategories.map((sub) => {
              const active = selectedSubcategorySlug === sub.subcategory_slug;
              return (
                <button
                  key={sub.subcategory_slug}
                  type="button"
                  onClick={() => selectSubcategory(sub.subcategory_slug)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{sub.subcategory_name}</span>
                  <span className={`text-xs ${active ? "text-primary" : "text-muted-foreground/70"}`}>
                    ({Number(sub.product_count).toLocaleString("es-MX")})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full text-sm font-semibold text-muted-foreground hover:text-destructive border border-border rounded-lg py-2 transition"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );

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
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm"
              >
                <SlidersHorizontal size={16} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="bg-primary-foreground text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-96 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter size={18} /> Filtros
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">{FiltersPanel}</div>
              <SheetFooter className="mt-6">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg"
                >
                  Aplicar filtros
                </button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

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
          <div className="hidden md:flex items-center gap-2 flex-wrap mb-4 pl-1 border-l-2 border-primary/30 pl-3">
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
            {subcategories.map((sub) => {
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
        <div className="mt-2">
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
              {totalCount !== null && (
                <p className="text-sm text-muted-foreground mb-4">
                  Mostrando {products.length.toLocaleString("es-MX")} de{" "}
                  {totalCount.toLocaleString("es-MX")} productos
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => {
                  const nombre = prod.nombre ?? prod.id_interno;
                  const precio = Number(prod.precio_desde_mxn || 0);
                  const imgUrl = getSafeImageUrl(prod.imagenes);

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
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={nombre ?? "Producto"}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <Package
                          size={80}
                          className={`opacity-40 group-hover:scale-110 transition-transform duration-500 text-muted-foreground absolute ${imgUrl ? "hidden" : ""}`}
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

              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={loadingList}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-70 text-primary-foreground font-bold px-8 py-3 rounded-xl shadow-sm transition-colors inline-flex items-center gap-2"
                  >
                    {loadingList ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Cargando...
                      </>
                    ) : (
                      `Cargar más (${(totalCount! - products.length).toLocaleString("es-MX")} restantes)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
