import { ArrowRight } from "lucide-react";

const T150_HERO_SRC = "/images/home-hero-t150.jpg";

interface HomeHeroProps {
  onExploreCatalog: () => void;
  onTellProject: () => void;
  /** Slot reemplazable: cuando exista el asset final aprobado, pasar su URL aquí. */
  imageSrc?: string;
  imageAlt?: string;
}

export default function HomeHero({
  onExploreCatalog,
  onTellProject,
  imageSrc = T150_HERO_SRC,
  imageAlt = "Vaso térmico promocional en un entorno de escritorio",
}: HomeHeroProps) {
  return (
    <section className="bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-4">
              Promocionales para empresas
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Artículos promocionales que dejan marca.
            </h1>
            <p className="hidden sm:block text-lg text-muted-foreground mb-10 max-w-xl">
              Explora productos para tu empresa o cuéntanos tu proyecto.
              <br />
              Te ayudamos a encontrar opciones y avanzar con claridad.
            </p>
            <p className="sm:hidden text-base text-muted-foreground mb-8">
              Explora productos o cuéntanos tu proyecto.
              <br />
              Te ayudamos a encontrar opciones claras.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <p className="text-sm font-semibold text-foreground">Sé qué producto necesito</p>
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="min-h-[44px] w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-5 rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  Explorar catálogo <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <p className="text-sm font-semibold text-foreground">Tengo un proyecto</p>
                {/* Ruta B: navega al Project Brief (RB2, sin escritura). */}
                <button
                  type="button"
                  onClick={onTellProject}
                  className="min-h-[44px] w-full border-2 border-foreground text-foreground font-bold py-3 px-5 rounded-lg inline-flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  Contar mi proyecto
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/3] w-full rounded-2xl border border-border bg-card overflow-hidden">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full bg-muted" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
