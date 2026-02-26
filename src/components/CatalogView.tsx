import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { catalogMock } from '@/data/mockData';

interface CatalogViewProps {
  onViewChange: (view: string) => void;
}

export default function CatalogView({ onViewChange }: CatalogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

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
                    {['Todos', 'Drinkware', 'Oficina', 'Eco', 'Tecnología', 'Mochilas'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="category" defaultChecked={cat === 'Todos'} className="text-primary focus:ring-primary accent-primary" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogMock.map(prod => {
                const IconComponent = prod.icon;
                return (
                  <div key={prod.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => onViewChange('pdp')}>
                    <div className={`aspect-square ${prod.color} relative flex items-center justify-center transition-colors`}>
                      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border">
                        {prod.category}
                      </div>
                      <IconComponent size={80} className="opacity-40 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-success font-bold mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> {prod.stock.toLocaleString()} disp.
                      </p>
                      <h3 className="font-bold text-foreground mb-2 line-clamp-1">{prod.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">Desde <strong className="text-foreground">${prod.price.toFixed(2)}</strong> c/u</p>
                      <button className="w-full bg-secondary hover:bg-primary/10 text-secondary-foreground hover:text-primary font-semibold py-2 rounded-lg transition-colors border border-transparent hover:border-primary/20 text-sm">
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
