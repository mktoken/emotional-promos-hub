import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import LandingView from '@/components/LandingView';
import CatalogView from '@/components/CatalogView';
import ProductDetailView from '@/components/ProductDetailView';
import QuoteCartView from '@/components/QuoteCartView';
import type { QuoteItem } from '@/data/mockData';

type ViewType = 'landing' | 'catalog' | 'pdp' | 'cart';

export default function Index() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [quoteCart, setQuoteCart] = useState<QuoteItem[]>([]);

  const addToQuote = (item: Omit<QuoteItem, 'cartId'>) => {
    setQuoteCart([...quoteCart, { ...item, cartId: Date.now() }]);
    setCurrentView('cart');
  };

  const removeFromQuote = (cartId: number) => {
    setQuoteCart(quoteCart.filter(item => item.cartId !== cartId));
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-foreground">
      {/* NAV */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setCurrentView('landing')}
            >
              <img src="/images/logo-pe.gif" alt="Promocionales Emocionales" className="h-12 w-auto" />
            </div>

            <div className="flex items-center space-x-4 md:space-x-8">
              <button
                onClick={() => setCurrentView('catalog')}
                className="hidden md:block text-sm font-bold text-primary hover:text-primary/80 transition px-4 py-2 bg-primary/10 rounded-lg"
              >
                Catálogo +10k
              </button>

              <button
                onClick={() => setCurrentView('cart')}
                className="relative flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition px-3 py-2 bg-secondary hover:bg-muted rounded-lg"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:inline">Mi Cotización</span>
                {quoteCart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-card shadow-sm">
                    {quoteCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* VIEWS */}
      {currentView === 'landing' && <LandingView onViewChange={(v) => setCurrentView(v as ViewType)} />}
      {currentView === 'catalog' && <CatalogView onViewChange={(v) => setCurrentView(v as ViewType)} />}
      {currentView === 'pdp' && <ProductDetailView onBack={() => setCurrentView('catalog')} onAddToQuote={addToQuote} />}
      {currentView === 'cart' && <QuoteCartView cart={quoteCart} onRemove={removeFromQuote} onBack={() => setCurrentView('catalog')} />}
    </div>
  );
}
