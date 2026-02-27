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
  Upload,
  MessageCircle,
  Info,
} from "lucide-react";

// Definición segura del cliente de Supabase para evitar errores de compilación
// @ts-ignore
const supabase = typeof window !== "undefined" && (window as any).supabase ? (window as any).supabase : null;

// ESTRATEGIA: Margen de utilidad para Distribuidor (35%)
const GLOBAL_MARKUP = 1.35;
// CONTACTO DE CIERRE ESTRATÉGICO
const WHATSAPP_CONTACT = "5215530311686";

export default function App() {
  const [currentView, setCurrentView] = useState("landing");
  const [quoteCart, setQuoteCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [tabuladores, setTabuladores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // EFECTO: Sincronización Doble con Almacén y Precios de Impresión
  useEffect(() => {
    async function initData() {
      if (!supabase) return;
      setLoading(true);
      try {
        const [prodRes, tabRes] = await Promise.all([
          supabase.from("productos_b2b").select("*").eq("activo", true),
          supabase.from("tabuladores_impresion").select("*").eq("activo", true),
        ]);

        if (prodRes.data) setProducts(prodRes.data);
        if (tabRes.data) setTabuladores(tabRes.data);
      } catch (err) {
        console.error("Falla de sincronización:", err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const addToQuote = (item) => {
    setQuoteCart([...quoteCart, { ...item, cartId: Date.now() }]);
    setCurrentView("cart");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER GAMA ALTA */}
      <nav className="bg-white/90 border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView("landing")}>
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-100 group-hover:rotate-12 transition-all">
            <Package size={24} />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase">
            PROMO<span className="text-blue-600">PRO</span>{" "}
            <span className="text-slate-300 font-light italic text-sm tracking-widest">B2B</span>
          </span>
        </div>
        <button
          onClick={() => setCurrentView("cart")}
          className="relative flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <ShoppingCart size={18} />
          <span className="font-bold text-sm">Cotización ({quoteCart.length})</span>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto">
        {currentView === "landing" && <LandingView onExplore={() => setCurrentView("catalog")} />}
        {currentView === "catalog" && (
          <CatalogView
            products={products}
            loading={loading}
            onSelect={(p) => {
              setSelectedProduct(p);
              setCurrentView("pdp");
            }}
          />
        )}
        {currentView === "pdp" && (
          <ProductDetailView
            product={selectedProduct}
            tabuladores={tabuladores}
            onBack={() => setCurrentView("catalog")}
            onAdd={addToQuote}
          />
        )}
        {currentView === "cart" && (
          <QuoteCartView
            cart={quoteCart}
            onRemove={(id) => setQuoteCart(quoteCart.filter((i) => i.cartId !== id))}
            onBack={() => setCurrentView("catalog")}
          />
        )}
      </main>
    </div>
  );
}

// --- VISTA: LANDING ---
function LandingView({ onExplore }) {
  return (
    <div className="py-32 text-center px-4">
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-10 border border-blue-100">
        <Globe size={12} /> Stock en Vivo: CDO, G4 & 4Promotional
      </div>
      <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-10">
        Cotiza con la <br />
        <span className="text-blue-600 italic">velocidad del B2B.</span>
      </h1>
      <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-14 font-medium leading-relaxed">
        Elimina la espera. Accede al catálogo maestro con precios netos, cálculo de impresión y stock verificado en
        tiempo real.
      </p>
      <button
        onClick={onExplore}
        className="bg-blue-600 text-white font-black py-7 px-16 rounded-[2.5rem] text-xl shadow-2xl hover:-translate-y-2 transition-all active:scale-95"
      >
        ABRIR CATÁLOGO MAESTRO
      </button>
    </div>
  );
}

// --- VISTA: CATÁLOGO ---
function CatalogView({ products, loading, onSelect }) {
  const [query, setQuery] = useState("");

  if (loading)
    return (
      <div className="py-48 text-center">
        <Loader2 size={60} className="mx-auto text-blue-600 animate-spin mb-6" />
        <p className="text-slate-300 font-black uppercase text-xs tracking-[0.5em]">
          Sincronizando Almacenes Nacionales...
        </p>
      </div>
    );

  const filtered = products.filter(
    (p) =>
      p.datos_generales?.nombre?.toLowerCase().includes(query.toLowerCase()) ||
      p.sku_base?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="px-6 py-10">
      <div className="mb-20 max-w-2xl mx-auto relative group">
        <Search
          className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors"
          size={24}
        />
        <input
          type="text"
          placeholder="Buscar por SKU, nombre o categoría..."
          className="w-full pl-16 pr-8 py-7 rounded-[2rem] border-2 border-slate-50 focus:border-blue-600 outline-none font-bold text-lg shadow-2xl shadow-slate-100 transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-[3rem] border border-slate-100 p-8 cursor-pointer hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 group flex flex-col h-full"
            onClick={() => onSelect(prod)}
          >
            <div className="aspect-square bg-white rounded-3xl flex items-center justify-center mb-8 overflow-hidden relative">
              <img
                src={prod.imagenes?.[0]}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                alt={prod.datos_generales?.nombre}
              />
              <div className="absolute top-0 right-0 bg-slate-50 px-3 py-1 rounded-bl-2xl text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {prod.proveedor_nombre}
              </div>
            </div>
            <h3 className="font-black text-slate-900 text-lg mb-2 leading-tight">{prod.datos_generales?.nombre}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">SKU: {prod.sku_base}</p>
            <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-50">
              <p className="text-blue-600 font-black text-2xl">
                ${(prod.costeo?.precio_neto_distribuidor * GLOBAL_MARKUP).toLocaleString()}
              </p>
              <div className="bg-blue-600 text-white p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-blue-100">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VISTA: DETALLE ---
function ProductDetailView({ product, tabuladores, onBack, onAdd }) {
  const [qty, setQty] = useState(1);
  const [tecnica, setTecnica] = useState(tabuladores[0]?.tecnica_nombre || "");
  const [logo, setLogo] = useState(null);

  const unitCost = product.costeo?.precio_neto_distribuidor || 0;
  const unitPriceWithMarkup = unitCost * GLOBAL_MARKUP;

  const tabuladorActual = tabuladores.find((t) => t.tecnica_nombre === tecnica);
  const setupFee = tabuladorActual?.costo_setup_fijo || 0;
  const tarifaRango = tabuladorActual?.tarifas_por_volumen?.find((r) => qty >= r.min && qty <= r.max);
  const printCostUnit = tarifaRango?.costo || 0;

  const totalPartida = unitPriceWithMarkup * qty + printCostUnit * qty + setupFee;

  return (
    <div className="px-6 py-16 grid lg:grid-cols-2 gap-24 items-start">
      <div className="bg-white rounded-[4rem] border border-slate-100 p-16 flex items-center justify-center aspect-square shadow-sm sticky top-32 overflow-hidden group">
        <img
          src={product.imagenes?.[0]}
          className="w-full h-full object-contain"
          alt={product.datos_generales?.nombre}
        />

        {logo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/40 backdrop-blur-sm border-2 border-dashed border-blue-400 p-4 flex items-center justify-center rounded-2xl">
            <img src={logo} className="max-w-full max-h-full object-contain mix-blend-multiply opacity-80" />
            <div className="absolute -top-3 -right-3 bg-blue-600 text-white p-1 rounded-full">
              <ShieldCheck size={16} />
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-300 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Regresar
        </button>
      </div>

      <div className="py-6">
        <div className="flex items-center gap-4 mb-8">
          <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest italic">
            {product.proveedor_nombre}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-blue-500" /> Calidad B2B Certificada
          </span>
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.95]">
          {product.datos_generales?.nombre}
        </h1>
        <p className="text-2xl text-slate-500 mb-14 leading-relaxed font-medium italic">
          "{product.datos_generales?.descripcion}"
        </p>

        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)]">
          <label className="block mb-10 p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-white/5 text-center cursor-pointer hover:bg-white/10 transition-all group">
            <Upload className="mx-auto text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] block text-slate-400">
              Generar Muestra Virtual
            </span>
            <p className="text-xs font-bold text-slate-500 mt-2">Sube tu logo en PNG o JPG</p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setLogo(e.target.files ? URL.createObjectURL(e.target.files[0]) : null)}
            />
          </label>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">
                Técnica de Marcaje
              </label>
              <select
                value={tecnica}
                onChange={(e) => setTecnica(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-5 text-sm text-blue-400 font-black outline-none appearance-none cursor-pointer"
              >
                {tabuladores.map((t) => (
                  <option key={t.id} value={t.tecnica_nombre}>
                    {t.tecnica_nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">
                Unidades (1-1)
              </label>
              <div className="flex items-center justify-between bg-slate-800/50 border border-white/5 p-3 rounded-2xl">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Minus size={20} />
                </button>
                <span className="font-black text-2xl tracking-tighter">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-10">
            <div className="flex justify-between items-baseline mb-12">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                  Inversión Estimada
                </p>
                <p className="text-8xl font-black text-emerald-400 tracking-tighter leading-none">
                  ${totalPartida.toLocaleString()}
                </p>
              </div>
              <span className="text-emerald-400/40 font-black text-sm uppercase">MXN</span>
            </div>
            <button
              onClick={() => onAdd({ ...product, quantity: qty, total: totalPartida, tecnica, logo })}
              className="w-full bg-blue-600 hover:bg-blue-500 py-8 rounded-[2rem] font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 group"
            >
              <ShoppingCart size={28} className="group-hover:rotate-12 transition-transform" /> AÑADIR A COTIZACIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VISTA: CARRITO ---
function QuoteCartView({ cart, onRemove, onBack }) {
  const [sent, setSent] = useState(false);
  const total = cart.reduce((acc, i) => acc + i.total, 0);

  const handleCierreWhatsApp = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nombre = data.get("nombre");
    const empresa = data.get("empresa");

    if (supabase) {
      await supabase.from("cotizaciones_leads").insert([
        {
          datos_cliente: { nombre, empresa },
          articulos_cotizados: cart.map((i) => ({ sku: i.sku_base, qty: i.quantity })),
          total_estimado: total,
        },
      ]);
    }

    const msg = `Hola Neguib, soy ${nombre} de ${empresa}. Me interesa cotizar formalmente: ${cart.map((i) => `${i.quantity}pz de ${i.datos_generales?.nombre}`).join(", ")}. Inversión estimada: $${total.toLocaleString()} MXN.`;
    window.open(`https://wa.me/${WHATSAPP_CONTACT}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
  };

  if (sent)
    return (
      <div className="py-60 text-center px-4 max-w-2xl mx-auto">
        <div className="bg-emerald-50 text-emerald-500 w-32 h-32 flex items-center justify-center rounded-full mx-auto mb-10 shadow-inner border-[12px] border-emerald-500/5">
          <CheckCircle2 size={56} />
        </div>
        <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter italic">¡Negocio en Marcha!</h2>
        <p className="text-xl text-slate-400 font-medium leading-relaxed">
          Se ha abierto una conversación de WhatsApp con el resumen de tu selección. Neguib te atenderá personalmente
          para el cierre.
        </p>
      </div>
    );

  return (
    <div className="px-6 py-20 grid lg:grid-cols-3 gap-20">
      <div className="lg:col-span-2 space-y-8">
        <h1 className="text-5xl font-black mb-16 tracking-tighter flex items-center gap-6">
          <div className="bg-blue-600 text-white p-4 rounded-3xl shadow-xl shadow-blue-100">
            <ShoppingCart size={32} />
          </div>{" "}
          Tu Selección Maestra
        </h1>
        {cart.length === 0 ? (
          <div className="py-40 text-center border-4 border-dashed border-slate-100 rounded-[4rem]">
            <Package size={80} className="mx-auto text-slate-100 mb-8" />
            <p className="text-slate-300 font-black text-2xl tracking-widest uppercase">El carrito está vacío</p>
            <button onClick={onBack} className="mt-8 text-blue-600 font-bold hover:underline">
              Ir al Catálogo
            </button>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.cartId}
              className="bg-white p-10 rounded-[3.5rem] border border-slate-100 flex items-center gap-12 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <div className="w-32 h-32 bg-slate-50 rounded-3xl flex items-center justify-center p-4">
                <img
                  src={item.imagenes?.[0]}
                  className="w-full h-full object-contain"
                  alt={item.datos_generales?.nombre}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-2xl mb-2 tracking-tight leading-none">{item.datos_generales?.nombre}</h4>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">
                  {item.tecnica} | {item.quantity} pz
                </p>
                <div className="flex gap-10 border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Inversión de Partida
                    </p>
                    <p className="font-black text-slate-900 text-xl">${item.total?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemove(item.cartId)}
                className="text-slate-200 hover:text-red-500 hover:bg-red-50 p-4 rounded-2xl transition-all"
              >
                <Trash2 size={32} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900 rounded-[4rem] p-14 text-white h-fit sticky top-32 shadow-[0_60px_100px_-30px_rgba(0,0,0,0.5)]">
        <h3 className="text-2xl font-black mb-12 border-b border-white/5 pb-8 text-blue-400 uppercase tracking-[0.4em] text-center italic">
          Cierre B2B
        </h3>
        <form onSubmit={handleCierreWhatsApp} className="space-y-6">
          <input
            name="nombre"
            placeholder="Nombre completo"
            required
            className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
          />
          <input
            name="empresa"
            placeholder="Empresa / Institución"
            required
            className="w-full bg-white/5 border-white/5 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
          />
          <div className="pt-12 border-t border-white/5 mt-10">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-center">
              Inversión Final Sugerida (Neto)
            </p>
            <p className="text-7xl font-black text-emerald-400 tracking-tighter text-center mb-12 leading-none">
              ${total.toLocaleString()}
            </p>
            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 py-8 rounded-[2.5rem] font-black text-xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-emerald-900/20 active:scale-95"
            >
              <MessageCircle size={24} /> CERRAR POR WHATSAPP
            </button>
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 italic">
              <Info size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Precios netos mas IVA</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
