import { ArrowRight } from "lucide-react";

interface HomeFinalCtaProps {
  onExploreCatalog: () => void;
  onTellProject: () => void;
}

export default function HomeFinalCta({ onExploreCatalog, onTellProject }: HomeFinalCtaProps) {
  return (
    <section className="py-16 sm:py-20 bg-surface" aria-labelledby="final-cta-title">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border border-t-4 border-t-primary bg-card px-6 py-10 sm:px-12 sm:py-14 text-center">
          <h2 id="final-cta-title" className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Empieza por el camino que ya tienes claro
          </h2>
          <p className="text-lg text-muted-foreground mb-8">Explora productos o cuéntanos lo que necesitas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              Explorar catálogo <ArrowRight size={18} aria-hidden="true" />
            </button>
            {/* Ruta B: navega al Project Brief (RB2, sin escritura). */}
            <button
              type="button"
                  onClick={onTellProject}
              className="min-h-[44px] border-2 border-foreground text-foreground font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center hover:bg-foreground hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              Contar mi proyecto
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
