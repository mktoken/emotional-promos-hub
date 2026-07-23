import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, MessageCircle } from "lucide-react";
import LandingView from "@/components/LandingView";
import CatalogView from "@/components/CatalogView";
import ProductDetailView from "@/components/ProductDetailView";
import QuoteCartView from "@/components/QuoteCartView";
import AssistantWidget from "@/features/assistant/components/AssistantWidget";
import type { QuoteItem } from "@/data/mockData";

type ViewType = "landing" | "catalog" | "pdp" | "cart";

const createCartId = () => Date.now() + Math.floor(Math.random() * 1_000_000);

const getQuoteLineKey = (item: Omit<QuoteItem, "cartId"> | QuoteItem) =>
  [
    item.productId,
    item.claveProducto || item.sku || "",
    item.color?.claveVariante || item.color?.id || item.color?.name || "",
    item.logoFormat || "",
    item.personalizacionSugeridaEconomica?.incluida ? item.personalizacionSugeridaEconomica.tipo : "",
  ].join("|");

const SCROLL_KEY_PREFIX = "catalog-scroll:";

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [quoteCart, setQuoteCart] = useState<QuoteItem[]>([]);

  const viewParam = searchParams.get("view");
  const currentView: ViewType =
    viewParam === "catalog" || viewParam === "pdp" || viewParam === "cart" ? viewParam : "landing";
  const selectedProductId = searchParams.get("product");

  const setView = useCallback(
    (v: ViewType) => {
      const next = new URLSearchParams();
      if (v !== "landing") next.set("view", v);
      setSearchParams(next);
    },
    [setSearchParams],
  );

  const addToQuote = (item: Omit<QuoteItem, "cartId">) => {
    setQuoteCart((prev) => {
      const newItem: QuoteItem = { ...item, cartId: createCartId() };
      const newItemKey = getQuoteLineKey(newItem);
      const existingIndex = prev.findIndex((existingItem) => getQuoteLineKey(existingItem) === newItemKey);

      if (existingIndex === -1) {
        return [...prev, newItem];
      }

      return prev.map((existingItem, index) => {
        if (index !== existingIndex) return existingItem;

        const combinedQuantity = existingItem.quantity + item.quantity;
        const estimatedUnit = item.estimatedUnit || existingItem.estimatedUnit || 0;

        return {
          ...existingItem,
          quantity: combinedQuantity,
          estimatedUnit,
          estimatedTotal: estimatedUnit * combinedQuantity,
          imageUrl: item.imageUrl ?? existingItem.imageUrl,
          entregaEstimada: item.entregaEstimada ?? existingItem.entregaEstimada,
          personalizacionPublica: item.personalizacionPublica ?? existingItem.personalizacionPublica,
          personalizacionSolicitadaCliente:
            item.personalizacionSolicitadaCliente ?? existingItem.personalizacionSolicitadaCliente,
          personalizacionSugeridaEconomica:
            item.personalizacionSugeridaEconomica ?? existingItem.personalizacionSugeridaEconomica,
          requiereRevisionTecnica: item.requiereRevisionTecnica ?? existingItem.requiereRevisionTecnica,
          personalizationCompatibilityNote:
            item.personalizationCompatibilityNote ?? existingItem.personalizationCompatibilityNote,
          material: item.material ?? existingItem.material,
        };
      });
    });
    setView("cart");
  };

  const removeFromQuote = (cartId: number) => {
    setQuoteCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const openProduct = (productId: string) => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    try {
      sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${returnTo}`, String(window.scrollY));
    } catch {
      /* ignore */
    }
    const next = new URLSearchParams();
    next.set("view", "pdp");
    next.set("product", productId);
    next.set("returnTo", returnTo);
    setSearchParams(next);
  };

  const backFromProduct = useCallback(() => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      try {
        const url = new URL(returnTo, window.location.origin);
        navigate(`${url.pathname}${url.search}`);
        return;
      } catch {
        /* ignore */
      }
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    setView("catalog");
  }, [searchParams, navigate, setView]);

  // Scroll al inicio cuando cambia la vista (excepto pdp→catalog, que restaura scroll dentro del catálogo).
  useEffect(() => {
    if (currentView === "landing" || currentView === "cart") {
      window.scrollTo(0, 0);
    }
  }, [currentView]);

  return (
    <div className="min-h-screen bg-surface font-sans text-foreground">
      {/* NAV */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("landing")}>
              <img src="/images/logo-pe.gif" alt="Promocionales Emocionales" className="h-12 w-auto" />
            </div>

            <div className="flex items-center space-x-4 md:space-x-8">
              <button
                onClick={() => setView("catalog")}
                className="hidden md:block text-sm font-bold text-primary hover:text-primary/80 transition px-4 py-2 bg-primary/10 rounded-lg"
              >
                Catálogo +10k
              </button>

              <button
                onClick={() => setView("cart")}
                className="relative flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition px-3 py-2 bg-secondary hover:bg-muted rounded-lg"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:inline">Mi Propuesta</span>
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
      {currentView === "landing" && (
        <LandingView
          onViewChange={(v) => {
            if (v === "catalog") {
              const next = new URLSearchParams();
              next.set("view", "catalog");
              next.set("choose", "categories");
              setSearchParams(next);
              return;
            }
            setView(v as ViewType);
          }}
        />
      )}
      {currentView === "catalog" && (
        <CatalogView onViewChange={(v) => setView(v as ViewType)} onOpenProduct={openProduct} />
      )}
      {currentView === "pdp" && (
        <ProductDetailView
          productId={selectedProductId}
          onBack={backFromProduct}
          onAddToQuote={addToQuote}
        />
      )}
      {currentView === "cart" && (
        <QuoteCartView cart={quoteCart} onRemove={removeFromQuote} onBack={() => setView("catalog")} />
      )}

      {/* Footer Corporativo */}
      <footer className="bg-foreground text-background py-8 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <address className="not-italic text-xs opacity-70">
            Sede Operativa: Av. Lomas Verdes 825, Centro Comercial Heliplaza, Loc. 213E. Naucalpan, Edomex. C.P. 53125
          </address>
          <div className="text-xs flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <a
              href="tel:+5215530311686"
              aria-label="Llamar al 55 3031 1686"
              className="opacity-80 hover:opacity-100 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              📞 55 3031 1686
            </a>
            <span className="opacity-40 hidden sm:inline">|</span>
            <a
              href="mailto:promocionalesemocionales@gmail.com"
              aria-label="Enviar correo a promocionalesemocionales@gmail.com"
              className="opacity-80 hover:opacity-100 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              ✉️ promocionalesemocionales@gmail.com
            </a>
          </div>
          <p className="text-[10px] opacity-50 pt-2">
            © {new Date().getFullYear()} Promocionales Emocionales. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Botón Flotante WhatsApp */}
      <a
        href="https://wa.me/5215530311686"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_25px_rgba(37,211,102,0.5)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
      >
        <MessageCircle size={32} />
      </a>

      {/* Asistente virtual */}
      <AssistantWidget />
    </div>
  );
}
