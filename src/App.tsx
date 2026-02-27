import React, { useState, useEffect } from "react";
import {
  Package,
  ShoppingCart,
  Search,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  Globe,
  Building2,
  Info,
} from "lucide-react";

// --- CONFIGURACIÓN DE NEGOCIO ---
const GLOBAL_MARKUP = 1.35; // Ganas 35% sobre el costo de distribuidor
// @ts-ignore - Supabase es inyectado globalmente por Lovable
const supabase = typeof window !== "undefined" && window.supabase ? window.supabase : null;

export default function App() {
  const [currentView, setCurrentView] = useState("landing");
  const [quoteCart, setQuoteCart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // FETCH: Sincronización real con Supabase
  useEffect(() => {
    async function fetchProducts() {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("productos_b2b").select("*").eq("activo", true);

        if (error) throw error;
        if (data) setProducts(data);
      } catch (err: any) {
        console.error("Error al conectar con Supabase:", err.message);
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
    setCurrentView("cart");
  };

  const removeFromQuote = (cartId: number) => {
    setQuoteCart(quoteCart.filter((item) => item.cartId !== cartId));
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-blue-100">
      {/* HEADER PREMIUM */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView("landing")}>
              <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Package size={26} />
              </div>
              <span className="font-black text-2xl tracking-tighter uppercase">
                PROMO<span className="text-blue-600">PRO</span>{" "}
                <span className="text-slate-400 font-light italic">B2B</span>
              </span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setCurrentView("catalog")}
                className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
              >
                Catálogo Maestro
              </button>

              <button
                onClick={() => setCurrentView("cart")}
                className="relative flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-xl"
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline font-bold">Cotización</span>
                {quoteCart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {quoteCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {currentView === "landing" && <LandingView onExplore={() => setCurrentView("catalog")} />}
        {currentView === "catalog" && (
          <CatalogView
            products={products}
            loading={loading}
            calculatePrice={calculateFinalPrice}
            onSelect={(p: any) => {
              setSelectedProduct(p);
              setCurrentView("pdp");
            }}
          />
        )}
        {currentView === "pdp" && (
          <ProductDetailView
            product={selectedProduct}
            calculatePrice={calculateFinalPrice}
            onBack={() => setCurrentView("catalog")}
            onAdd={addToQuote}
          />
        )}
        {currentView === "cart" && (
          <QuoteCartView cart={quoteCart} onRemove={removeFromQuote} onBack={() => setCurrentView("catalog")} />
        )}
      </main>
    </div>
  );
}

// --- VISTAS ---

function LandingView({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-32 text-center">
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100">
        <Globe size={14} /> Inventario en Tiempo Real: CDO, G4 y 4Promotional
      </div>
      <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tight leading-[0.9]">
        Cotiza el futuro <br />
        <span className="text-blue-600 italic">de tu marca hoy.</span>
      </h1>
      <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium">
        Acceso directo a la infraestructura promocional más grande de México. Precios finales B2B con stock verificado
        por unidad.
      </p>
      <button
        onClick={onExplore}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-6 px-14 rounded-2xl shadow-2xl shadow-blue-200 flex items-center gap-3 mx-auto transition-all hover:-translate-y-1 active:scale-95"
      >
        Explorar Catálogo <ArrowRight size={24} />
      </button>
    </div>
  );
}

function CatalogView({ products, loading, calculatePrice, onSelect }: any) {
  const [query, setQuery] = useState("");

  const filtered = products.filter(
    (p: any) =>
      p.datos_generales?.nombre?.toLowerCase().includes(query.toLowerCase()) ||
      p.sku_base?.toLowerCase().includes(query.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 size={50} className="text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Sincronizando Bóveda...</p>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-16 relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
        <input
          type="text"
          placeholder="Busca por nombre o SKU..."
          className="w-full pl-16 pr-8 py-6 rounded-3xl border-2 border-slate-100 focus:border-blue-600 focus:ring-0 outline-none shadow-xl shadow-slate-100 text-xl transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {filtered.map((prod: any) => (
          <div
            key={prod.id}
            className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full"
            onClick={() => onSelect(prod)}
          >
            <div className="aspect-square bg-white flex items-center justify-center p-8 relative overflow-hidden">
              {prod.imagenes && prod.imagenes.length > 0 ? (
                <img
                  src={prod.imagenes[0]}
                  alt={prod.datos_generales?.nombre}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <ImageIcon size={64} className="text-slate-100" />
              )}
              <div className="absolute top-4 left-4 bg-slate-900/5 px-2 py-1 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {prod.proveedor_nombre}
              </div>
            </div>
            <div className="p-8 border-t border-slate-50 mt-auto bg-slate-50/20">
              <h3 className="font-black text-slate-900 text-lg mb-4 truncate">{prod.datos_generales?.nombre}</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Sugerido</p>
                  <p className="text-blue-600 font-black text-2xl">
                    ${calculatePrice(prod.costeo?.precio_neto_distribuidor)}
                  </p>
                </div>
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-12 font-black tracking-widest text-xs uppercase transition-colors"
      >
        <ChevronLeft size={20} /> Regresar al catálogo
      </button>

      <div className="grid lg:grid-cols-2 gap-20 items-start">
        <div className="bg-white rounded-[3.5rem] border border-slate-200 p-12 flex items-center justify-center aspect-square shadow-sm sticky top-32 overflow-hidden">
          <img
            src={product.imagenes?.[0]}
            className="w-full h-full object-contain"
            alt={product.datos_generales?.nombre}
          />
        </div>

        <div className="py-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {product.proveedor_nombre}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck size={12} className="text-emerald-500" /> Stock Asegurado
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">
            {product.datos_generales?.nombre}
          </h1>
          <p className="text-xl text-slate-500 mb-12 leading-relaxed font-medium italic">
            "{product.datos_generales?.descripcion}"
          </p>

          <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-3xl">
            <div className="flex items-center justify-between mb-12">
              <span className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Configurar Unidades</span>
              <div className="flex items-center gap-8 bg-white/5 p-2 rounded-2xl border border-white/10">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-4 hover:bg-white/10 rounded-xl transition-colors active:scale-90"
                >
                  <Minus />
                </button>
                <span className="text-4xl font-black w-20 text-center tracking-tighter">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="p-4 hover:bg-white/10 rounded-xl transition-colors active:scale-90"
                >
                  <Plus />
                </button>
              </div>
            </div>

            <div className="mb-14 border-t border-white/10 pt-12">
              <p className="text-slate-500 text-[10px] mb-3 font-black uppercase tracking-widest">Inversión Estimada</p>
              <div className="flex items-baseline gap-3">
                <p className="text-7xl font-black text-emerald-400 tracking-tighter">
                  ${(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className="text-emerald-400/50 font-bold uppercase text-xs tracking-widest">MXN</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-4 italic font-medium">
                * Precios sugeridos antes de personalización.
              </p>
            </div>

            <button
              onClick={() => onAdd({ ...product, quantity: qty, finalPrice: unitPrice, total: qty * unitPrice })}
              className="w-full bg-blue-600 hover:bg-blue-500 py-7 rounded-[2rem] font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98]"
            >
              <ShoppingCart size={28} /> AGREGAR A COTIZACIÓN
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
        nombre: formData.get("n"),
        empresa: formData.get("e"),
        whatsapp: formData.get("w"),
        email: formData.get("m"),
      },
      articulos_cotizados: cart.map((i: any) => ({
        id: i.id_interno,
        sku: i.sku_base,
        nombre: i.datos_generales?.nombre,
        qty: i.quantity,
        subtotal: i.total,
      })),
      total_estimado: total,
    };

    try {
      const { error } = await supabase.from("cotizaciones_leads").insert([lead]);
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      console.error("Error al guardar lead:", err.message);
      alert("Error al conectar con la base de datos.");
    } finally {
      setSending(false);
    }
  };

  if (sent)
    return (
      <div className="py-48 text-center max-w-2xl mx-auto">
        <div className="bg-emerald-100 text-emerald-600 w-36 h-36 flex items-center justify-center rounded-full mx-auto mb-12 shadow-inner border-8 border-emerald-50">
          <CheckCircle2 size={72} />
        </div>
        <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">¡Solicitud Recibida!</h2>
        <p className="text-2xl text-slate-500 mb-14 font-medium leading-relaxed">
          Neguib Wejebe procesará tu solicitud técnica y se contactará contigo en breve.
        </p>
        <button
          onClick={onBack}
          className="bg-slate-900 text-white font-black py-6 px-14 rounded-2xl text-xl hover:bg-slate-800 transition-all shadow-2xl"
        >
          Volver al Catálogo
        </button>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-5xl font-black mb-16 flex items-center gap-6 tracking-tighter">
        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200">
          <ShoppingCart size={32} />
        </div>{" "}
        Mi Carrito B2B
      </h1>

      <div className="grid lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-10">
          {cart.length === 0 ? (
            <div className="py-32 text-center border-4 border-dashed border-slate-100 rounded-[4rem]">
              <Package size={80} className="mx-auto text-slate-200 mb-8" />
              <p className="text-slate-400 font-black text-2xl tracking-tight uppercase">Vacío.</p>
            </div>
          ) : (
            cart.map((item: any) => (
              <div
                key={item.cartId}
                className="bg-white border border-slate-200 p-10 rounded-[3rem] flex items-center gap-10 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="w-32 h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 p-4">
                  <img
                    src={item.imagenes?.[0]}
                    className="w-full h-full object-contain"
                    alt={item.datos_generales?.nombre}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-2xl mb-2 tracking-tight">
                    {item.datos_generales?.nombre}
                  </h4>
                  <p className="text-xs text-blue-600 font-black uppercase tracking-[0.2em] mb-4">
                    {item.proveedor_nombre}
                  </p>
                  <div className="flex gap-10">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades</p>
                      <p className="font-black text-slate-900 text-lg">{item.quantity} pz</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
                      <p className="font-black text-slate-900 text-lg">${item.total?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.cartId)}
                  className="text-slate-200 p-4 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <Trash2 size={32} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white h-fit sticky top-32 shadow-2xl">
          <h3 className="text-2xl font-black mb-10 border-b border-white/10 pb-8 text-blue-400 uppercase tracking-[0.3em] text-center italic">
            Datos del Lead
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              name="n"
              placeholder="Nombre completo"
              required
              className="w-full bg-white/5 border-white/10 rounded-[1.2rem] p-5 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />
            <input
              name="e"
              placeholder="Empresa"
              required
              className="w-full bg-white/5 border-white/10 rounded-[1.2rem] p-5 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />
            <input
              name="w"
              type="tel"
              placeholder="WhatsApp"
              required
              className="w-full bg-white/5 border-white/10 rounded-[1.2rem] p-5 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />
            <input
              name="m"
              type="email"
              placeholder="Email corporativo"
              required
              className="w-full bg-white/5 border-white/10 rounded-[1.2rem] p-5 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />

            <div className="pt-10 border-t border-white/10 mt-10">
              <div className="flex justify-between items-center mb-10 text-center flex-col">
                <span className="text-slate-500 font-black uppercase text-xs tracking-widest mb-2">
                  Inversión Total Estimada
                </span>
                <span className="text-5xl font-black text-emerald-400 tracking-tighter">${total.toLocaleString()}</span>
              </div>
              <button
                type="submit"
                disabled={cart.length === 0 || sending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-7 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-4 active:scale-95"
              >
                {sending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Building2 size={20} /> ENVIAR COTIZACIÓN
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
