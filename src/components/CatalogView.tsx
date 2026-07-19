import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Filter, Package, Loader2, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface SubcategoryOption {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

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

// Cast estrecho para la RPC v3 (aún no reflejada en tipos generados).
type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: RpcProduct[] | null; error: { message: string } | null }>;

export default function CatalogView({ onViewChange, onOpenProduct }: CatalogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(null);
  const [ecoOnly, setEcoOnly] = useState(false);
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasEcoCollection, setHasEcoCollection] = useState(false);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Carga inicial: categorías y colección Ecológicos.
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
        supabase
          .from("product_collections")
          .select("id")
          .eq("slug", "ecologicos")
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setCategories((catsRes.data ?? []) as CategoryOption[]);
      setHasEcoCollection(!!ecoColRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar subcategorías cuando cambie categoría seleccionada.
  useEffect(() => {
    let cancelled = false;
    if (!selectedCategorySlug) {
      setSubcategories([]);
      return;
    }
    const cat = categories.find((c) => c.slug === selectedCategorySlug);
    if (!cat) {
      setSubcategories([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("product_subcategories")
        .select("id,category_id,name,slug,sort_order")
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      setSubcategories((data ?? []) as SubcategoryOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategorySlug, categories]);

  const fetchPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoadingList(true);
      setErrorList(null);

      try {
        const rpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;
        const { data, error } = await rpc("catalog_search_products", {
          p_query: debouncedSearch || "",
          p_category_slug: selectedCategorySlug || null,
          p_collection_slug: ecoOnly ? "ecologicos" : null,
          p_min_price: null,
          p_max_price: null,
          p_limit: PAGE_SIZE,
          p_offset: (pageIndex - 1) * PAGE_SIZE,
          p_subcategory_slug: selectedSubcategorySlug || null,
        });
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
        setTotalCount(total);
        setProducts((prev) => (append ? [...prev, ...rows] : rows));
      } catch (err) {
        setErrorList(err instanceof Error ? err.message : "Error cargando catálogo");
        if (!append) setProducts([]);
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, selectedCategorySlug, selectedSubcategorySlug, ecoOnly],
  );

  // Reset a página 1 cuando cambian filtros.
  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [debouncedSearch, selectedCategorySlug, selectedSubcategorySlug, ecoOnly, fetchPage]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  const handleSelectCategory = (slug: string | null) => {
    setSelectedCategorySlug(slug);
    setSelectedSubcategorySlug(null);
  };

  const handleSelectSubcategory = (slug: string | null) => {
    setSelectedSubcategorySlug(slug);
  };

  const hasMore = totalCount !== null && products.length < totalCount;

  const categoryButtons = useMemo(
    () => [{ slug: null as string | null, name: "Todos" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))],
    [categories],
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card text-foreground rounded-full py-4 pl-12 pr-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm sticky top-28">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Filter size={18} /> Filtros
              </h3>
              <div className="space-y-6">
                {hasEcoCollection && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Colecciones</h4>
                    <button
                      type="button"
                      onClick={() => setEcoOnly((v) => !v)}
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
                  <div className="space-y-2">
                    {categoryButtons.map((cat) => (
                      <label key={cat.slug ?? "todos"} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategorySlug === cat.slug}
                          onChange={() => handleSelectCategory(cat.slug)}
                          className="text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-sm text-muted-foreground hover:text-foreground">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedCategorySlug && subcategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Subcategorías</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="subcategory"
                          checked={selectedSubcategorySlug === null}
                          onChange={() => handleSelectSubcategory(null)}
                          className="text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-sm text-muted-foreground hover:text-foreground">Todas</span>
                      </label>
                      {subcategories.map((sub) => (
                        <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="subcategory"
                            checked={selectedSubcategorySlug === sub.slug}
                            onChange={() => handleSelectSubcategory(sub.slug)}
                            className="text-primary focus:ring-primary accent-primary"
                          />
                          <span className="text-sm text-muted-foreground hover:text-foreground">{sub.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="font-medium">Cargando catálogo...</p>
              </div>
            ) : errorList ? (
              <div className="text-center py-20 text-destructive">
                <p className="font-semibold mb-2">No pudimos cargar el catálogo.</p>
                <button
                  onClick={() => fetchPage(1, false)}
                  className="mt-2 text-primary underline text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                No encontramos productos con esos filtros. Prueba cambiar la búsqueda o la subcategoría.
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
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-70 text-primary-foreground font-bold px-8 py-3 rounded-xl shadow-sm transition-colors inline-flex items-center gap-2"
                    >
                      {loadingMore ? (
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
    </div>
  );
}
