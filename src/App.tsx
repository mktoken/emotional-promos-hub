aimport React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, Search, ChevronRight, ChevronLeft, 
  Trash2, Loader2, Image as ImageIcon, CheckCircle2, 
  Minus, Plus, ArrowRight, ShieldCheck, Globe, Building2, Info
} from 'lucide-react';

// --- CONFIGURACIÓN DE NEGOCIO ---
const GLOBAL_MARKUP = 1.35; // Margen del 35%
// @ts-ignore - Supabase inyectado por Lovable
const supabase = (typeof window !== 'undefined' && window.supabase) ? window.supabase : null;

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [quoteCart, setQuoteCart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // FETCH: Sincronización real con Supabase (Tu base de datos de 45 productos)
  useEffect(() => {
    async function fetchProducts() {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('productos_b2b')
          .select('*')
          .eq('activo', true);
        
        if (error) throw error;
        if (data) setProducts(data);
      } catch (err: any) {
        console.error("Error de conexión:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const calculateFinalPrice = (netPrice: number) => {
    return (netPrice * GLOBAL_MARKUP).toFixed(2);
  };

  const addToQuote = (item: any) => {
    setQuoteCart([...quoteCart, { ...item, cartId: Date.now() }]);
    setCurrentView('cart'); 
  };

  const removeFromQuote = (cartId: number) => {
    setQuoteCart(quoteCart.filter(item => item.cartId !== cartId));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100">
      {/* HEADER DE ALTA GAMA */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setCurrentView('landing')}
            >
              <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200 group-hover:rotate-12 transition-all duration-500">
                <Package size={26} />
              </div>
              <span className="font-black text-2xl tracking-tighter uppercase text-slate-900">
                PROMO<span className="text-blue-600">PRO</span> <span className="text-slate-400 font-light italic">B2B</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('catalog')} 
                className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 px-5 py-2.5 rounded-xl transition-all"
              >
                Catálogo Maestro
              </button>
              
              <button 
                onClick={() => setCurrentView('cart')} 
                className="relative flex items-center gap-3 text-sm font-bold bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200"
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline">Cotización</span>
                {quoteCart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {quoteCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {currentView === 'landing' && <LandingView onExplore={() => setCurrentView('catalog')} />}
        {currentView === 'catalog' && (
          <CatalogView 
            products={products} 
            loading={loading} 
            calculatePrice={calculateFinalPrice}
            onSelect={(p: any) => { setSelectedProduct(p); setCurrentView('pdp'); }} 
          />
        )}
        {currentView === 'pdp' && (
          <ProductDetailView 
            product={selectedProduct} 
            calculatePrice={calculateFinalPrice}
            onBack={() => setCurrentView('catalog')} 
            onAdd={addToQuote} 
          />
        )}
        {currentView === 'cart' && (
          <QuoteCartView 
            cart={quoteCart} 
            onRemove={removeFromQuote} 
            onBack={() => setCurrentView('catalog')} 
          />
        )}
      </main>
    </div>
  );
}

// --- VISTAS RESTAURADAS ---

function LandingView({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-40 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-10 border border-blue-100 shadow-sm">
          <Globe size={14} /> Inventario Nacional en Tiempo Real
        </div>
        <h1 className="text-6xl md:text-9xl font-black text-slate-900 mb-10 tracking-tight leading-[0.85]">
          Artículos que <br/>
          <span className="text-blue-600 italic">venden tu marca.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 mb-16 max-w-3xl mx-auto font-medium leading-relaxed">
          La primera plataforma B2B en México conectada directamente a las bodegas de CDO, G4 y 4Promotional.
        </p>
        <button 
          onClick={onExplore}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-black py-7 px-16 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] flex items-center gap-4 mx-auto transition-all hover:-translate-y-2 active:scale-95"
        >
          Explorar Catálogo Maestro <ArrowRight size={28} />
        </button>
      </div>
      {/* Efecto de rejilla de fondo decorativa */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="grid grid-cols-12 gap-4 h-full">
          {[...Array(48)].map((_, i) => <div key={i} className="border border-slate-900 h-24 w-full rounded-xl"></div>)}
        </div>
      </div>
    </div>
  );
}

function CatalogView({ products, loading, calculatePrice, onSelect }: any) {
  const [query, setQuery] = useState('');

  const filtered = products.filter((p: any) => 
    p.datos_generales?.nombre?.toLowerCase().includes(query.toLowerCase()) ||
    p.sku_base?.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-56">
      <Loader2 size={60} className="text-blue-600 animate-spin mb-6" />
      <p className="text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">Sincronizando Bóveda de Datos...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="mb-24 relative max-w-3xl mx-auto">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={28} />
        <input 
          type="text"
          placeholder="Busca termos, libretas, tecnología..."
          className="w-full pl-20 pr-10 py-7 rounded-[2.5rem] border-2 border-slate-50 focus:border-blue-600 focus:ring-0 outline-none shadow-2xl shadow-slate-100 text-2xl font-medium transition-all placeholder:text-slate-300"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
        {filtered.map((prod: any) => (
          <div 
            key={prod.id} 
            className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer group flex flex-col h-full"
            onClick={() => onSelect(prod)}
          >
            <div className="aspect-square bg-white flex items-center justify-center p-12 relative overflow-hidden">
              {prod.imagenes && prod.imagenes.length > 0 ? (
                <img 
                  src={prod.imagenes[0]} 
                  alt={prod.datos_generales?.nombre}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <ImageIcon size={80} className="text-slate-50" />
              )}
              <div className="absolute top-8 left-8 bg-slate-900/5 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 border border-white/50 uppercase tracking-widest">
                {prod.proveedor_nombre}
              </div>
            </div>
            <div className="p-10 flex flex-col flex-1 bg-slate-50/30">
              <h3 className="font-black text-slate-900 text-xl mb-3 leading-tight">{prod.datos_generales?.nombre}</h3>
              <p className="text-xs text-slate-400 font-bold mb-8 tracking-[0.2em] uppercase">SKU: {prod.sku_base}</p>
              <div className="mt-auto flex justify-between items-center pt-8 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo B2B</p>
                  <p className="text-blue-600 font-black text-3xl tracking-tighter">${calculatePrice(prod.costeo?.precio_neto_distribuidor)}</p>
                </div>
                <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-100 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <ChevronRight size={22} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetailView({ product, calculatePrice, onBack, onAdd }: any) {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const unitPrice = parseFloat(calculatePrice(product.costeo?.precio_neto_distribuidor));

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <button onClick={onBack} className="flex items-center gap-3 text-slate-400 hover:text-blue-600 mb-16 font-black tracking-[0.3em] text-[10px] uppercase transition-colors">
        <ChevronLeft size={20} /> Volver al catálogo maestro
      </button>

      <div className="grid lg:grid-cols-2 gap-24 items-start">
        <div className="bg-white rounded-[4rem] border border-slate-100 p-20 flex items-center justify-center aspect-square shadow-sm sticky top-32 overflow-hidden">
          <img 
            src={product.imagenes?.[0]} 
            className="w-full h-full object-contain" 
            alt={product.datos_generales?.nombre} 
          />
        </div>

        <div className="py-6">
          <div className="flex items-center gap-4 mb-8">
            <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-2xl uppercase tracking-widest">
              {product.proveedor_nombre}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck size={16} className="text-emerald-500" /> Stock Verificado
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-10 leading-[0.9] tracking-tighter">
            {product.datos_generales?.nombre}
          </h1>
          <p className="text-2xl text-slate-400 mb-16 leading-relaxed font-medium italic">
            "{product.datos_generales?.descripcion}"
          </p>

          <div className="bg-slate-900 rounded-[3.5rem] p-14 text-white shadow-3xl">
            <div className="flex items-center justify-between mb-14">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Cantidad</span>
                <span className="text-xs text-blue-400 font-bold italic">Piezas por unidad</span>
              </div>
              <div className="flex items-center gap-10 bg-white/5 p-3 rounded-[2.5rem] border border-white/10">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 text-blue-400"><Minus size={24}/></button>
                <span className="text-5xl font-black w-24 text-center tracking-tighter">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 text-blue-400"><Plus size={24}/></button>
              </div>
            </div>
            
            <div className="mb-14 border-t border-white/10 pt-12">
              <p className="text-slate-500 text-[10px] mb-4 font-black uppercase tracking-[0.4em]">Inversión Estimada Parcial</p>
              <div className="flex items-baseline gap-4">
                <p className="text-8xl font-black text-emerald-400 tracking-tighter">
                  ${(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className="text-emerald-400/40 font-black uppercase text-sm tracking-widest">MXN</span>
              </div>
            </div>

            <button 
              onClick={() => onAdd({ ...product, quantity: qty, finalPrice: unitPrice, total: qty * unitPrice })}
              className="w-full bg-blue-600 hover:bg-blue-500 py-8 rounded-[2.5rem] font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-5 active:scale-[0.98] group"
            >
              <ShoppingCart size={32} className="group-hover:rotate-12 transition-transform" /> AGREGAR A MI COTIZACIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteCartView({ cart, onRemove, onBack }: any) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const total = cart.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    setSending(true);

    const formData = new FormData(e.currentTarget);
    const lead = {
      datos_cliente: {
        nombre: formData.get('n'),
        empresa: formData.get('e'),
        whatsapp: formData.get('w'),
        email: formData.get('m')
      },
      articulos_cotizados: cart.map((i: any) => ({ 
        id: i.id_interno, 
        sku: i.sku_base,
        nombre: i.datos_generales?.nombre,
        qty: i.quantity, 
        subtotal: i.total 
      })),
      total_estimado: total
    };

    try {
      const { error } = await supabase.from('cotizaciones_leads').insert([lead]);
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      console.error("Error al guardar lead:", err.message);
      alert("Error crítico de base de datos.");
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="py-60 px-4 text-center max-w-3xl mx-auto">
      <div className="bg-emerald-50 text-emerald-500 w-44 h-44 flex items-center justify-center rounded-full mx-auto mb-14 shadow-inner border-[16px] border-emerald-500/5">
        <CheckCircle2 size={80} />
      </div>
      <h2 className="text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-none">¡Cotización en Trámite!</h2>
      <p className="text-2xl text-slate-400 mb-16 leading-relaxed font-medium">
        Neguib Wejebe ha recibido tu solicitud y la procesará técnicamente en unos minutos.
      </p>
      <button onClick={onBack} className="bg-slate-900 text-white font-black py-7 px-16 rounded-[2.5rem] text-xl hover:bg-slate-800 transition-all shadow-2xl">
        Seguir Explorando el Catálogo
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <h1 className="text-6xl font-black mb-20 flex items-center gap-8 tracking-tighter">
        <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-xl shadow-blue-100"><ShoppingCart size={40} /></div> Carrito de Cotización
      </h1>

      <div className="grid lg:grid-cols-3 gap-20">
        <div className="lg:col-span-2 space-y-12">
          {cart.length === 0 ? (
            <div className="py-48 text-center border-4 border-dashed border-slate-50 rounded-[4rem]">
              <Package size={120} className="mx-auto text-slate-100 mb-10" />
              <p className="text-slate-300 font-black text-3xl tracking-tight uppercase">Tu selección está vacía.</p>
            </div>
          ) : (
            cart.map((item: any) => (
              <div key={item.cartId} className="bg-white border border-slate-100 p-12 rounded-[4rem] flex items-center gap-12 shadow-sm hover:shadow-2xl transition-all group">
                <div className="w-44 h-44 bg-slate-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 p-8 group-hover:scale-105 transition-transform">
                  <img src={item.imagenes?.[0]} className="w-full h-full object-contain" alt={item.datos_generales?.nombre} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-3xl mb-3 tracking-tighter leading-none">{item.datos_generales?.nombre}</h4>
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] mb-6">{item.proveedor_nombre}</p>
                  <div className="flex gap-14">
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 text-center">Piezas</p>
                      <p className="font-black text-slate-900 text-3xl tracking-tighter">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 text-center">Subtotal</p>
                      <p className="font-black text-slate-900 text-3xl tracking-tighter">${item.total?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => onRemove(item.cartId)} className="text-slate-200 p-6 hover:text-red-500 hover:bg-red-50 rounded-[2rem] transition-all">
                  <Trash2 size={40} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-900 rounded-[4.5rem] p-16 text-white h-fit sticky top-32 shadow-[0_60px_100px_-20px_rgba(0,0,0,0.4)]">
          <h3 className="text-2xl font-black mb-12 border-b border-white/5 pb-10 text-blue-400 uppercase tracking-[0.4em] text-center italic leading-none">Datos de la Solicitud</h3>
          <form onSubmit={handleSubmit} className="space-y-8">
            <input name="n" placeholder="Nombre completo" required className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all focus:bg-white/10" />
            <input name="e" placeholder="Razón Social / Empresa" required className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all focus:bg-white/10" />
            <input name="w" type="tel" placeholder="WhatsApp (10 dígitos)" required className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all focus:bg-white/10" />
            <input name="m" type="email" placeholder="Email Corporativo" required className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all focus:bg-white/10" />
            
            <div className="pt-12 border-t border-white/5 mt-12 text-center">
              <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.4em] block mb-4">Inversión Estimada Total</span>
              <span className="text-7xl font-black text-emerald-400 tracking-tighter mb-14 block leading-none">${total.toLocaleString()}</span>
              
              <button 
                type="submit" 
                disabled={cart.length === 0 || sending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-8 rounded-[2.5rem] font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-5 active:scale-95"
              >
                {sending ? <Loader2 className="animate-spin" /> : <><Building2 size={24} /> ENVIAR SOLICITUD</>}
              </button>
              <div className="mt-8 flex items-center justify-center gap-2 text-slate-600">
                <Info size={14}/>
                <span className="text-[10px] font-bold uppercase tracking-widest italic">Precios antes de IVA y marcaje</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
