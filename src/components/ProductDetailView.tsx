import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, CheckCircle2, Package, Activity,
  PenTool, Image as ImageIcon, Upload, Minus, Plus, ShoppingCart, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { QuoteItem } from '@/data/mockData';

interface ProductDetailViewProps {
  productId: string | null;
  onBack: () => void;
  onAddToQuote: (item: Omit<QuoteItem, 'cartId'>) => void;
}

interface ProductoB2B {
  id: string;
  id_interno: string;
  proveedor_nombre: string;
  sku_base: string | null;
  categoria_principal: string | null;
  datos_generales: { nombre?: string; descripcion?: string } | null;
  variantes: Array<{ sku_variante?: string; color_nombre?: string; color_hex?: string; stock_total?: number }> | null;
  imagenes: string[] | null;
  costeo: { moneda?: string; precio_neto_distribuidor?: number } | null;
  motor_de_personalizacion: { tecnicas_disponibles?: string[]; area_impresion?: { top?: string; left?: string; width?: string; height?: string } } | null;
}

export default function ProductDetailView({ productId, onBack, onAddToQuote }: ProductDetailViewProps) {
  const [product, setProduct] = useState<ProductoB2B | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [logoFormat, setLogoFormat] = useState('1_color');
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [estimatedUnit, setEstimatedUnit] = useState(0);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('productos_b2b')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      if (!error && data) {
        setProduct(data as unknown as ProductoB2B);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [productId]);

  const colors = (product?.variantes ?? []).map((v, i) => ({
    id: `c${i}`,
    name: v.color_nombre ?? 'Default',
    hex: v.color_hex ?? '#94a3b8',
    stock: v.stock_total ?? 0,
    imgAlt: v.color_nombre ?? 'Color',
  }));

  const currentColor = colors[selectedColorIndex] ?? { id: 'c0', name: 'Default', hex: '#94a3b8', stock: 0, imgAlt: '' };
  const basePriceRaw = Number(product?.costeo?.precio_neto_distribuidor ?? 0);
  const basePrice = basePriceRaw * 1.35;
  const productName = product?.datos_generales?.nombre ?? product?.id_interno ?? '';
  const productDesc = product?.datos_generales?.descripcion ?? '';
  const productSku = product?.sku_base ?? '';
  const getSafeImageUrl = (imgData: unknown): string | null => {
    if (!imgData) return null;
    if (Array.isArray(imgData)) return imgData[0] ?? null;
    if (typeof imgData === 'string') {
      try { const parsed = JSON.parse(imgData); return Array.isArray(parsed) ? parsed[0] : parsed; }
      catch { return (imgData as string).startsWith('http') ? imgData : null; }
    }
    return null;
  };
  const mainImage = getSafeImageUrl(product?.imagenes);
  const printArea = product?.motor_de_personalizacion?.area_impresion;

  useEffect(() => {
    const subtotal = basePrice * quantity;
    setEstimatedTotal(subtotal);
    setEstimatedUnit(quantity > 0 ? basePrice : 0);
  }, [quantity, basePrice]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedLogo(URL.createObjectURL(file));
  };

  const handleAddToCart = () => {
    if (!product) return;
    const quoteItem = {
      productId: product.id,
      name: productName,
      sku: productSku,
      color: currentColor,
      quantity,
      logoFormat,
      estimatedTotal,
      estimatedUnit,
      hasVirtualSample: !!uploadedLogo,
      imageUrl: mainImage ?? undefined,
    };
    onAddToQuote(quoteItem);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="font-medium">Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-32 text-muted-foreground">
        <p>Producto no encontrado.</p>
        <button onClick={onBack} className="mt-4 text-primary underline">Volver al catálogo</button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="bg-card border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition font-medium text-sm">
            <ChevronLeft size={16} /> Volver al Catálogo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          {/* GALERÍA */}
          <div className="lg:col-span-5 mb-10 lg:mb-0">
            <div
              className="w-full aspect-square rounded-2xl border border-border flex items-center justify-center mb-4 transition-colors duration-500 relative overflow-hidden sticky top-28 bg-white"
            >
              <div className="absolute top-4 left-4 bg-card/90 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-border flex items-center gap-1.5 z-20">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                {currentColor.stock.toLocaleString()} en Stock
              </div>
              {mainImage ? (
                <img src={mainImage} alt={productName} className="max-w-[80%] max-h-[80%] object-contain z-0" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} />
              ) : null}
              <Package size={200} className={`opacity-40 text-muted-foreground absolute z-0 ${mainImage ? 'hidden' : ''}`} />
              {uploadedLogo && printArea && (
                <div
                  className="absolute border border-primary/30 border-dashed rounded flex items-center justify-center p-1 z-10 overflow-hidden"
                  style={{ top: printArea.top, left: printArea.left, width: printArea.width, height: printArea.height }}
                >
                  <img src={uploadedLogo} alt="Logo Virtual" className="max-w-full max-h-full object-contain" style={{ mixBlendMode: 'multiply', opacity: 0.85 }} />
                </div>
              )}
            </div>
          </div>

          {/* CONFIGURADOR */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="mb-6 border-b border-border pb-6">
              <p className="text-sm font-bold text-muted-foreground mb-1">SKU: {productSku}</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">{productName}</h1>
              <p className="text-muted-foreground mb-4">{productDesc}</p>
            </div>

            {/* Color */}
            {colors.length > 0 && (
              <div className="mb-6 p-6 bg-card rounded-2xl border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Color
                </h3>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color, idx) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`w-12 h-12 rounded-full transition-all flex items-center justify-center shadow-sm ${selectedColorIndex === idx ? 'ring-2 ring-offset-4 ring-primary scale-110' : 'hover:scale-105 border border-border'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColorIndex === idx && <CheckCircle2 size={20} color={color.hex === '#f8fafc' || color.hex === '#cbd5e1' ? '#1e293b' : '#ffffff'} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Diseño */}
            <div className="mb-6 p-6 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm">
              <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Diseño a grabar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { key: '1_color', label: 'Logo a 1 Color', icon: Package },
                  { key: 'full_color', label: 'Varios Colores', icon: Activity },
                  { key: 'text_only', label: 'Solo Texto', icon: PenTool },
                ].map(opt => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setLogoFormat(opt.key)}
                      className={`p-4 rounded-xl border text-sm transition-all flex flex-col items-center text-center gap-3 ${logoFormat === opt.key ? 'border-primary bg-card ring-2 ring-primary/20 shadow-md' : 'border-border bg-card hover:border-primary/40'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${logoFormat === opt.key ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        <OptIcon size={20} />
                      </div>
                      <p className="font-bold text-foreground">{opt.label}</p>
                    </button>
                  );
                })}
              </div>
              <div className="bg-card p-4 rounded-xl border border-primary/20">
                <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><ImageIcon size={16} className="text-primary" /> Muestra Virtual (Opcional)</h4>
                <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="bg-secondary hover:bg-muted text-secondary-foreground font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors border border-border">
                  <Upload size={16} /> Subir Logo (PNG/JPG)
                </button>
              </div>
            </div>

            {/* Precio */}
            <div className="mt-auto bg-dark-section p-6 rounded-2xl shadow-xl border border-dark-section text-dark-section-foreground">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> Inversión Preliminar
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
                <div>
                  <label className="block text-sm text-dark-section-foreground/60 mb-2">Piezas a cotizar (Min. 1)</label>
                  <div className="bg-dark-section/80 rounded-xl p-2 flex items-center justify-between border border-dark-section-foreground/10 w-full">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-dark-section-foreground/10 rounded-lg text-dark-section-foreground/60 hover:text-dark-section-foreground transition-colors"><Minus size={18} /></button>
                    <span className="font-black text-2xl tracking-tight">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-dark-section-foreground/10 rounded-lg text-dark-section-foreground/60 hover:text-dark-section-foreground transition-colors"><Plus size={18} /></button>
                  </div>
                </div>
                <div className="flex flex-col justify-center border-l border-dark-section-foreground/10 pl-6 relative">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-dark-section rotate-45 border-b border-l border-dark-section-foreground/10 hidden sm:block"></div>
                  <p className="text-sm text-dark-section-foreground/60 mb-1">Precio Unitario Estimado</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-success">${estimatedUnit.toFixed(2)}</span>
                    <span className="text-sm text-dark-section-foreground/60 mb-1.5">MXN</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-glow-primary flex justify-center items-center gap-2 text-lg hover:scale-[1.01]"
              >
                Agregar a mi Cotización <ShoppingCart size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}