import { useState } from "react";
import { ClipboardList, Menu, X } from "lucide-react";

interface HomeHeaderProps {
  quoteCount: number;
  onLogo: () => void;
  onCatalog: () => void;
  onSolutions: () => void;
  onHowItWorks: () => void;
  onQuote: () => void;
}

const linkClass =
  "min-h-[44px] inline-flex items-center px-3 text-sm font-semibold text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

export default function HomeHeader({ quoteCount, onLogo, onCatalog, onSolutions, onHowItWorks, onQuote }: HomeHeaderProps) {
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => () => {
    if (!open) {
      fn();
      return;
    }
    setOpen(false);
    // Ejecutar después de que el menú móvil se cierre y la página se reacomode,
    // para que el desplazamiento a la sección no quede bajo la cabecera.
    requestAnimationFrame(() => requestAnimationFrame(fn));
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50" aria-label="Principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <button type="button" onClick={run(onLogo)} aria-label="Ir al inicio" className="flex items-center">
            <img src="/images/logo-pe.gif" alt="Promocionales Emocionales" className="h-12 w-auto" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={onCatalog} className={linkClass}>
              Catálogo
            </button>
            <button type="button" onClick={onSolutions} className={linkClass}>
              Soluciones
            </button>
            <button type="button" onClick={onHowItWorks} className={linkClass}>
              Cómo funciona
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={run(onQuote)}
              className="relative min-h-[44px] flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition px-3 py-2 bg-secondary hover:bg-muted rounded-lg"
            >
              <ClipboardList size={20} aria-hidden="true" />
              <span className="hidden sm:inline">Mi solicitud</span>
              <span className="sr-only sm:hidden">Mi solicitud</span>
              {quoteCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-card">
                  {quoteCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-foreground hover:bg-secondary"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="home-mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id="home-mobile-menu" className="md:hidden border-t border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            <button type="button" onClick={run(onCatalog)} className={`${linkClass} justify-start`}>
              Catálogo
            </button>
            <button type="button" onClick={run(onSolutions)} className={`${linkClass} justify-start`}>
              Soluciones
            </button>
            <button type="button" onClick={run(onHowItWorks)} className={`${linkClass} justify-start`}>
              Cómo funciona
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
