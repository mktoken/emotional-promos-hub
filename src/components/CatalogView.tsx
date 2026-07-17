import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, Package, Loader2, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductoCard {
  id: string;
  id_interno: string;
  sku_base: string | null;
  categoria_principal: string | null;
  datos_generales: { nombre?: string; descripcion?: string } | null;
  variantes: Array<{ stock_total?: number }> | null;
  imagenes: unknown[] | null;
  precio_desde_mxn: number | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const CARD_SELECT =
  "id,id_interno,sku_base,categoria_principal,datos_generales,variantes,imagenes,precio_desde_mxn";

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

// Interseca dos arrays de strings preservando el orden del primero.
function intersect(a: string[] | null, b: string[] | null): string[] | null {
  if (a === null) return b;
  if (b === null) return a;
  const setB = new Set(b);
  return a.filter((id) => setB.has(id));
}

// Normaliza texto para matching de intención de búsqueda.
function normalizeText(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Mapa intención → slug de categoría consolidada.
const INTENT_TO_SLUG: Record<string, string> = {
  termo: "bebidas-termos-vasos", termos: "bebidas-termos-vasos",
  vaso: "bebidas-termos-vasos", vasos: "bebidas-termos-vasos",
  cilindro: "bebidas-termos-vasos", cilindros: "bebidas-termos-vasos",
  botella: "bebidas-termos-vasos", botellas: "bebidas-termos-vasos",
  taza: "bebidas-termos-vasos", tazas: "bebidas-termos-vasos",
  mug: "bebidas-termos-vasos", drinkware: "bebidas-termos-vasos",
  boligrafo: "escritura", boligrafos: "escritura",
  pluma: "escritura", plumas: "escritura",
  lapiz: "escritura", marcador: "escritura",
  libreta: "oficina-libretas-papeleria", libretas: "oficina-libretas-papeleria",
  agenda: "oficina-libretas-papeleria", agendas: "oficina-libretas-papeleria",
  cuaderno: "oficina-libretas-papeleria", cuadernos: "oficina-libretas-papeleria",
  oficina: "oficina-libretas-papeleria", papeleria: "oficina-libretas-papeleria",
  mochila: "bolsas-mochilas-viaje", mochilas: "bolsas-mochilas-viaje",
  bolsa: "bolsas-mochilas-viaje", bolsas: "bolsas-mochilas-viaje",
  maleta: "bolsas-mochilas-viaje", maletas: "bolsas-mochilas-viaje",
  viaje: "bolsas-mochilas-viaje", tote: "bolsas-mochilas-viaje",
  morral: "bolsas-mochilas-viaje", hielera: "bolsas-mochilas-viaje",
  usb: "tecnologia", tecnologia: "tecnologia",
  bocina: "tecnologia", audifono: "tecnologia",
  cargador: "tecnologia", cable: "tecnologia",
  powerbank: "tecnologia", "power bank": "tecnologia",
  playera: "textiles-ropa", polo: "textiles-ropa",
  sudadera: "textiles-ropa", textil: "textiles-ropa",
  ropa: "textiles-ropa", camisa: "textiles-ropa",
  gorra: "gorras-accesorios", gorras: "gorras-accesorios",
  cachucha: "gorras-accesorios", visera: "gorras-accesorios",
  llavero: "llaveros-identificadores", llaveros: "llaveros-identificadores",
  gafete: "llaveros-identificadores", lanyard: "llaveros-identificadores",
  credencial: "llaveros-identificadores", identificador: "llaveros-identificadores",
};

function detectIntentSlug(query: string): string | null {
  const n = normalizeText(query);
  if (!n) return null;
  return INTENT_TO_SLUG[n] ?? null;
}

const sel = (s: string): string => s; // evita parseo de tipos costoso de PostgREST

export default function CatalogView({ onViewChange, onOpenProduct }: CatalogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [ecoOnly, setEcoOnly] = useState(false);
  const [products, setProducts] = useState<ProductoCard[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // IDs precargados: G4 (a excluir) y Ecológicos (a filtrar).
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [ecoIds, setEcoIds] = useState<string[]>([]);
  const [prereqReady, setPrereqReady] = useState(false);

  // Cache de IDs por categoría para evitar refetch al cambiar de página.
  const categoryIdsCache = useRef<Map<string, string[]>>(new Map());

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Carga inicial: categorías e IDs de la colección Ecológicos.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catsRes, ecoColRes] = await Promise.all([
          supabase
            .from("product_categories")
            .select("id,name,slug,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("product_collections")
            .select("id,slug")
            .eq("slug", "ecologicos")
            .maybeSingle(),
        ]);

        if (cancelled) return;

        setCategories((catsRes.data ?? []) as CategoryOption[]);
        setExcludeIds([]);

        const ecoCollectionId = (ecoColRes.data as { id: string } | null)?.id ?? null;
        if (ecoCollectionId) {
          const { data: ecoAssign } = await supabase
            .from("product_collection_assignments")
            .select("producto_b2b_id")
            .eq("collection_id", ecoCollectionId);
          if (!cancelled) {
            setEcoIds(((ecoAssign ?? []) as Array<{ producto_b2b_id: string }>).map((r) => r.producto_b2b_id));
          }
        }
      } catch {
        // silencioso: si falla, catálogo cae a productos sin filtros server-side
      } finally {
        if (!cancelled) setPrereqReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Obtiene los IDs de una categoría (cacheados).
  const getCategoryProductIds = useCallback(async (categoryId: string): Promise<string[]> => {
    const cached = categoryIdsCache.current.get(categoryId);
    if (cached) return cached;
    const { data } = await supabase
      .from("product_category_assignments")
      .select("producto_b2b_id")
      .eq("category_id", categoryId);
    const ids = ((data ?? []) as Array<{ producto_b2b_id: string }>).map((r) => r.producto_b2b_id);
    categoryIdsCache.current.set(categoryId, ids);
    return ids;
  }, []);

  // Ejecuta una página de productos aplicando filtros.
  const fetchPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoadingList(true);
      setErrorList(null);

      try {
        // Determinar IDs permitidos según filtros de categoría/colección/intención.
        let allowedIds: string[] | null = null;
        if (selectedCategoryId) {
          allowedIds = await getCategoryProductIds(selectedCategoryId);
        }
        if (ecoOnly) {
          allowedIds = intersect(allowedIds, ecoIds);
        }

        // Detección de intención: si la búsqueda coincide con una palabra clave,
        // usamos los IDs de la categoría consolidada correspondiente en vez de un LIKE textual.
        let intentApplied = false;
        if (debouncedSearch.length >= 2 && !selectedCategoryId) {
          const slug = detectIntentSlug(debouncedSearch);
          if (slug) {
            const cat = categories.find((c) => c.slug === slug);
            if (cat) {
              const intentIds = await getCategoryProductIds(cat.id);
              allowedIds = intersect(allowedIds, intentIds);
              intentApplied = true;
            }
          }
        }

        // Si el filtro produce lista vacía, no hay resultados.
        if (allowedIds !== null && allowedIds.length === 0) {
          setProducts(append ? (prev) => prev : []);
          setTotalCount(0);
          return;
        }

        let q = supabase
          .from("productos_publicos")
          .select(sel(CARD_SELECT), { count: "exact" })
          .eq("activo", true);

        if (allowedIds && allowedIds.length > 0) {
          q = q.in("id", allowedIds);
        }
        if (excludeIds.length > 0) {
          q = q.not("id", "in", `(${excludeIds.join(",")})`);
        }
        // Sólo aplicar filtro textual server-side si NO se aplicó una intención por categoría.
        if (!intentApplied && debouncedSearch.length >= 2) {
          const like = `%${debouncedSearch}%`;
          q = q.or(
            [
              `id_interno.ilike.${like}`,
              `sku_base.ilike.${like}`,
              `categoria_principal.ilike.${like}`,
              `datos_generales->>nombre.ilike.${like}`,
              `datos_generales->>descripcion.ilike.${like}`,
              `datos_generales->>modelo_comercial.ilike.${like}`,
              `datos_generales->>nombre_comercial.ilike.${like}`,
            ].join(","),
          );
        }

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.order("updated_at", { ascending: false }).range(from, to);

        const { data, error, count } = await q.returns<ProductoCard[]>();
        if (error) throw error;

        setTotalCount(count ?? null);
        if (append) {
          setProducts((prev) => [...prev, ...(data ?? [])]);
        } else {
          setProducts(data ?? []);
        }
      } catch (err) {
        setErrorList(err instanceof Error ? err.message : "Error cargando catálogo");
        if (!append) setProducts([]);
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [selectedCategoryId, ecoOnly, ecoIds, excludeIds, debouncedSearch, getCategoryProductIds],
  );

  // Al cambiar filtros/búsqueda o cuando termina la carga de prerequisitos, resetea a página 0.
  useEffect(() => {
    if (!prereqReady) return;
    setPage(0);
    fetchPage(0, false);
  }, [prereqReady, debouncedSearch, selectedCategoryId, ecoOnly, fetchPage]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  const getTotalStock = (p: ProductoCard) =>
    (p.variantes ?? []).reduce((sum, v) => sum + (Number(v?.stock_total) || 0), 0);

  const hasMore = totalCount !== null && products.length < totalCount;

  const categoryButtons = useMemo(
    () => [{ id: null as string | null, name: "Todos" }, ...categories.map((c) => ({ id: c.id, name: c.name }))],
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
                {ecoIds.length > 0 && (
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
                      <span className="ml-auto text-xs opacity-70">{ecoIds.length}</span>
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Categorías</h4>
                  <div className="space-y-2">
                    {categoryButtons.map((cat) => (
                      <label key={cat.id ?? "todos"} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategoryId === cat.id}
                          onChange={() => setSelectedCategoryId(cat.id)}
                          className="text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-sm text-muted-foreground hover:text-foreground">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
                  onClick={() => fetchPage(0, false)}
                  className="mt-2 text-primary underline text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">No se encontraron productos.</div>
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
                    const stock = getTotalStock(prod);
                    const nombre = prod.datos_generales?.nombre ?? prod.id_interno;
                    const precio = Number(prod.precio_desde_mxn || 0);
                    const imgUrl = getSafeImageUrl(prod.imagenes);

                    return (
                      <div
                        key={prod.id}
                        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                        onClick={() => onOpenProduct(prod.id)}
                      >
                        <div className="aspect-square bg-white relative flex items-center justify-center overflow-hidden">
                          <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border z-10">
                            {prod.categoria_principal ?? "General"}
                          </div>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={nombre}
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
                          <p
                            className={`text-xs font-bold mb-1 flex items-center gap-1 ${stock > 0 ? "text-success" : "text-destructive"}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${stock > 0 ? "bg-success animate-pulse" : "bg-destructive"}`}
                            ></span>
                            {stock > 0 ? `${stock.toLocaleString()} disp.` : "Sin stock"}
                          </p>
                          <h3 className="font-bold text-foreground mb-2 line-clamp-1">{nombre}</h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            Desde{" "}
                            <strong className="text-foreground">
                              {precio.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                            </strong>{" "}
                            c/u
                          </p>
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
