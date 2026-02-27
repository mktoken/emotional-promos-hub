import { useState, useEffect } from 'react';
import { Search, Filter, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProductoB2B {
  id: string;
  id_interno: string;
  proveedor_nombre: string;
  sku_base: string | null;
  categoria_principal: string | null;
  datos_generales: { nombre?: string; descripcion?: string } | null;
  variantes: Array<{ sku_variante?: string; color_nombre?: string; stock_total?: number }> | null;
  imagenes: string[] | null;
  costeo: { moneda?: string; precio_neto_distribuidor?: number } | null;
  activo: boolean | null;
}

interface CatalogViewProps {
  onViewChange: (view: string) => void;
}

export default function CatalogView({ onViewChange }: CatalogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<ProductoB2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos_b2b')
        .select('*');

      if (!error && data) {
        setProductos(data as unknown as ProductoB2B[]);
      }
      setLoading(false);
    }
    fetchProductos();
  }, []);

  const categories = ['Todos', ...new Set(productos.map(p => p.categoria_principal).filter(Boolean))];

  const filtered = productos.filter(p => {
    const nombre = p.datos_generales?.nombre ?? '';
    const matchSearch = nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku_base ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'Todos' || p.categoria_principal === selectedCategory;
    return matchSearch && matchCategory;
  });

  const getTotalStock = (p: ProductoB2B) =>
    (p.variantes ?? []).reduce((sum, v) => sum + (v.stock_total ?? 0), 0);

  return (
    <div className="pb-20 bg-surface min-h-screen">
      <div className="bg-dark-section text-dark-section-foreground py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Catálogo Mayorista</h1>
          <p className="text-dark-section-foreground/60 max-w-2xl mx-auto mb-8">Inventario enlazado en tiempo real con los principales importadores de México.</p>
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
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Filter size={18} /> Filtros</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Categorías</h4>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === cat}
                          onChange={() => setSelectedCategory(cat as string)}
                          className="text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-sm text-muted-foreground hover:text-foreground">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="font-medium">Cargando catálogo...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">No se encontraron productos.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(prod => {
                  const stock = getTotalStock(prod);
                  const nombre = prod.datos_generales?.nombre ?? prod.id_interno;
                  const precio = prod.costeo?.precio_neto_distribuidor ?? 0;
                  const imgUrl = prod.imagenes?.[0];

                  return (
                    <div key={prod.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => onViewChange('pdp')}>
                        <div className="aspect-square bg-secondary relative flex items-center justify-center overflow-hidden">
                          <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border z-10">
                            {prod.categoria_principal ?? 'General'}
                          </div>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={nombre}
                              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Package size={80} className={`opacity-40 group-hover:scale-110 transition-transform duration-500 text-muted-foreground absolute ${imgUrl ? 'hidden' : ''}`} />
                      </div>
                      <div className="p-5">
                        <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${stock > 0 ? 'text-success' : 'text-destructive'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stock > 0 ? 'bg-success animate-pulse' : 'bg-destructive'}`}></span>
                          {stock > 0 ? `${stock.toLocaleString()} disp.` : 'Sin stock'}
                        </p>
                        <h3 className="font-bold text-foreground mb-2 line-clamp-1">{nombre}</h3>
                        <p className="text-muted-foreground text-sm mb-4">Desde <strong className="text-foreground">${precio.toFixed(2)}</strong> c/u</p>
                        <button className="w-full bg-secondary hover:bg-primary/10 text-secondary-foreground hover:text-primary font-semibold py-2 rounded-lg transition-colors border border-transparent hover:border-primary/20 text-sm">
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
