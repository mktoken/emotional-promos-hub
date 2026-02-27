import { useState } from 'react';
import {
  ChevronLeft, CheckCircle2, ShoppingCart, Package, Trash2,
  FileText, Users, ArrowRight, MessageSquare, Settings2,
  Image as ImageIcon, User, Building, Phone, Mail
} from 'lucide-react';
import type { QuoteItem } from '@/data/mockData';

interface QuoteCartViewProps {
  cart: QuoteItem[];
  onRemove: (cartId: number) => void;
  onBack: () => void;
}

export default function QuoteCartView({ cart, onRemove, onBack }: QuoteCartViewProps) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [quoteFormat, setQuoteFormat] = useState('individual');
  const [leadData, setLeadData] = useState({ name: '', company: '', email: '', phone: '' });

  const grandTotal = cart.reduce((sum, item) => sum + item.estimatedTotal, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLeadData({ ...leadData, [e.target.name]: e.target.value });

  const submitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('success');
  };

  if (checkoutStep === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-surface">
        <div className="bg-card p-8 md:p-12 rounded-2xl shadow-xl border border-border text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">¡Solicitud Exitosa!</h2>
          <h3 className="text-xl text-muted-foreground mb-6">Gracias, {leadData.name}.</h3>
          <p className="text-muted-foreground mb-8">
            Hemos recibido los <strong>{cart.length} productos</strong> de <strong>{leadData.company}</strong>. Tu asesor te enviará la cotización oficial en breve.
          </p>
          <a
            href={`https://wa.me/525512345678?text=Hola,%20soy%20${leadData.name}.%20Acabo%20de%20enviar%20mi%20solicitud%20de%20cotizaci%C3%B3n.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <MessageSquare size={20} /> Acelerar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-surface min-h-screen">
      <div className="bg-dark-section text-dark-section-foreground py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={checkoutStep === 'form' ? () => setCheckoutStep('cart') : onBack}
            className="flex items-center gap-2 text-dark-section-foreground/60 hover:text-dark-section-foreground transition font-medium text-sm mb-6"
          >
            <ChevronLeft size={16} /> {checkoutStep === 'form' ? 'Volver al Carrito' : 'Seguir explorando catálogo'}
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3">
            {checkoutStep === 'form' ? <Users className="text-primary" size={36} /> : <FileText className="text-primary" size={36} />}
            {checkoutStep === 'form' ? 'Tus Datos de Contacto' : 'Mi Solicitud de Cotización'}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {cart.length === 0 ? (
          <div className="bg-card p-12 rounded-2xl shadow-sm border border-border text-center">
            <ShoppingCart size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Tu lista está vacía</h3>
            <p className="text-muted-foreground mb-6">Aún no has agregado ningún producto para cotizar.</p>
            <button onClick={onBack} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition">
              Explorar Productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {checkoutStep === 'cart' && cart.map((item) => (
                <div key={item.cartId} className="bg-card p-4 rounded-xl border border-border shadow-sm flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0 border border-border overflow-hidden bg-secondary">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} />
                    ) : null}
                    <Package size={32} className={`opacity-40 text-muted-foreground ${item.imageUrl ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">SKU: {item.sku} | Color: {item.color.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded">Cant: <strong>{item.quantity}</strong></span>
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">Logo: {item.logoFormat === '1_color' ? '1 Color' : item.logoFormat === 'full_color' ? 'Full Color' : 'Solo Texto'}</span>
                      {item.hasVirtualSample && <span className="bg-success/10 text-success px-2 py-1 rounded flex items-center gap-1"><ImageIcon size={12} /> Muestra Virtual</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">${item.estimatedTotal.toLocaleString('es-MX')}</p>
                    <button onClick={() => onRemove(item.cartId)} className="text-destructive/60 hover:text-destructive p-1 bg-destructive/10 hover:bg-destructive/20 rounded transition-colors mt-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {checkoutStep === 'form' && (
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">Detalles del Comprador</h3>
                  <form id="checkout-form" onSubmit={submitQuote} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><User size={14} /> Nombre Completo *</label>
                        <input type="text" name="name" required value={leadData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Building size={14} /> Nombre de tu Empresa *</label>
                        <input type="text" name="company" required value={leadData.company} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Phone size={14} /> WhatsApp / Teléfono *</label>
                        <input type="tel" name="phone" required value={leadData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Mail size={14} /> Correo Corporativo *</label>
                        <input type="email" name="email" required value={leadData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card" />
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden sticky top-28">
                {checkoutStep === 'cart' && (
                  <div className="bg-surface p-6 border-b border-border">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" /> Formato de Propuesta
                    </h3>
                    <div className="space-y-3">
                      <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${quoteFormat === 'individual' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40 bg-card'}`}>
                        <div className="flex items-start gap-3">
                          <input type="radio" name="format" value="individual" checked={quoteFormat === 'individual'} onChange={() => setQuoteFormat('individual')} className="mt-1 accent-primary" />
                          <div>
                            <p className="font-bold text-sm text-foreground">Opciones Individuales</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Para comparar opciones.</p>
                          </div>
                        </div>
                      </label>
                      <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${quoteFormat === 'kit' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40 bg-card'}`}>
                        <div className="flex items-start gap-3">
                          <input type="radio" name="format" value="kit" checked={quoteFormat === 'kit'} onChange={() => setQuoteFormat('kit')} className="mt-1 accent-primary" />
                          <div>
                            <p className="font-bold text-sm text-foreground">Kit / Paquete Integrado</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Cotizado todo junto.</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {checkoutStep === 'form' && (
                  <div className="bg-surface p-6 border-b border-border">
                    <h3 className="font-bold text-foreground mb-4">Resumen del Pedido</h3>
                    <ul className="space-y-3 mb-4">
                      {cart.map(item => (
                        <li key={item.cartId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground line-clamp-1 pr-4">{item.quantity}x {item.name}</span>
                          <span className="font-medium text-foreground">${item.estimatedTotal.toLocaleString('es-MX')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-6 bg-dark-section text-dark-section-foreground">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-dark-section-foreground/60">Gran Total (Aprox)</span>
                    <span className="text-2xl font-black text-success">${grandTotal.toLocaleString('es-MX')}</span>
                  </div>
                  {checkoutStep === 'cart' ? (
                    <button onClick={() => setCheckoutStep('form')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                      Continuar con mis datos <ArrowRight size={20} />
                    </button>
                  ) : (
                    <button form="checkout-form" type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2">
                      Confirmar y Solicitar Cotización
                    </button>
                  )}
                  <p className="text-xs text-dark-section-foreground/60 text-center mt-4">Sin compromisos de pago.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
