import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import LandingView from "@/components/LandingView";
import CatalogView from "@/components/CatalogView";
import ProductDetailView from "@/components/ProductDetailView";
import QuoteCartView from "@/components/QuoteCartView";
import ProjectBriefView from "@/components/ProjectBriefView";
import AssistantWidget from "@/features/assistant/components/AssistantWidget";
import type { QuoteSelectionItem, NewQuoteSelectionItem } from "@/features/quotes/lib/quote-selection";

type ViewType = "landing" | "catalog" | "pdp" | "cart" | "brief";

const createCartId = () => Date.now() + Math.floor(Math.random() * 1_000_000);

const getQuoteLineKey = (item: NewQuoteSelectionItem | QuoteSelectionItem) =>
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
  const [quoteCart, setQuoteCart] = useState<QuoteSelectionItem[]>([]);

  const viewParam = searchParams.get("view");
  const currentView: ViewType =
    viewParam === "catalog" || viewParam === "pdp" || viewParam === "cart" || viewParam === "brief" ? viewParam : "landing";
  const selectedProductId = searchParams.get("product");

  const setView = useCallback(
    (v: ViewType) => {
      const next = new URLSearchParams();
      if (v !== "landing") next.set("view", v);
      setSearchParams(next);
    },
    [setSearchParams],
  );

  const addToQuote = (item: NewQuoteSelectionItem) => {
    setQuoteCart((prev) => {
      const newItem: QuoteSelectionItem = { ...item, cartId: createCartId() };
      const newItemKey = getQuoteLineKey(newItem);
      const existingIndex = prev.findIndex((existingItem) => getQuoteLineKey(existingItem) === newItemKey);

      if (existingIndex === -1) {
        return [...prev, newItem];
      }

      return prev.map((existingItem, index) => {
        if (index !== existingIndex) return existingItem;

        const combinedQuantity = Math.min(existingItem.quantity + item.quantity, 1_000_000);

        return {
          ...existingItem,
          quantity: combinedQuantity,
          // La cantidad combinada invalida el precio previo: se reconsulta al servidor.
          pricing: null,
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

  const goToCatalogCategories = useCallback(() => {
    const next = new URLSearchParams();
    next.set("view", "catalog");
    next.set("choose", "categories");
    setSearchParams(next);
  }, [setSearchParams]);

  const pendingSection = useRef<string | null>(null);
  const goToSection = useCallback(
    (id: string) => {
      if (currentView === "landing") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      pendingSection.current = id;
      setView("landing");
    },
    [currentView, setView],
  );
  const goToHowItWorks = useCallback(() => goToSection("proceso"), [goToSection]);
  const goToSolutions = useCallback(() => goToSection("soluciones"), [goToSection]);

  // Scroll al inicio cuando cambia la vista (excepto pdp→catalog, que restaura scroll dentro del catálogo).
  useEffect(() => {
    if (currentView === "landing" && pendingSection.current) {
      const id = pendingSection.current;
      pendingSection.current = null;
      // Espera a que la portada termine de montar (categorías cargan async) antes de desplazar.
      const go = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      const t1 = window.setTimeout(go, 400);
      const t2 = window.setTimeout(go, 1200);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    if (currentView === "landing" || currentView === "cart" || currentView === "brief") {
      window.scrollTo(0, 0);
    }
  }, [currentView]);

  return (
    <div className="min-h-screen bg-surface font-sans text-foreground">
      {/* NAV (B1) */}
      <HomeHeader
        quoteCount={quoteCart.length}
        onLogo={() => setView("landing")}
        onCatalog={goToCatalogCategories}
        onSolutions={goToSolutions}
        onHowItWorks={goToHowItWorks}
        onQuote={() => setView("cart")}
      />

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
        <ProductDetailView productId={selectedProductId} onBack={backFromProduct} onAddToQuote={addToQuote} />
      )}
      {currentView === "brief" && <ProjectBriefView onBack={() => setView("landing")} />}
      {currentView === "cart" && (
        <QuoteCartView
          cart={quoteCart}
          onRemove={removeFromQuote}
          onBack={() => setView("catalog")}
          onSubmitted={() => setQuoteCart([])}
        />
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
          <p className="text-xs">
            <a href="/aviso-de-privacidad" className="opacity-80 hover:opacity-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
              Aviso de Privacidad
            </a>
          </p>
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
