import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Target,
  ArrowRight,
  Gift,
  Activity,
  Coffee,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  MessageCircle,
  Loader2,
  PackageX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HomeHero from "@/components/home/HomeHero";

interface LandingViewProps {
  onViewChange: (view: string) => void;
}

interface FeaturedProduct {
  id: string;
  nombre: string;
  categoria: string | null;
  imagen: string | null;
  disponibilidad: number | null;
}

const WHATSAPP_HREF =
  "https://wa.me/5215530311686?text=" +
  encodeURIComponent("Hola, quiero solicitar una propuesta de artículos promocionales para mi empresa.");

export default function LandingView({ onViewChange }: LandingViewProps) {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [errorFeatured, setErrorFeatured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("productos_publicos")
          .select("id,categoria_principal,datos_generales,imagenes,updated_at")
          .order("updated_at", { ascending: false })
          .limit(4);
        if (error) throw error;
        if (cancelled) return;
        const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);
        const pickUrlFromItem = (item: unknown): string | null => {
          if (!item) return null;
          if (isHttpUrl(item)) return item;
          if (typeof item === "object") {
            const url = (item as { url?: unknown }).url;
            if (isHttpUrl(url)) return url;
          }
          return null;
        };
        const getSafeImageUrl = (imgData: unknown): string | null => {
          if (!imgData) return null;
          if (Array.isArray(imgData)) {
            for (const item of imgData) {
              const u = pickUrlFromItem(item);
              if (u) return u;
            }
            return null;
          }
          if (typeof imgData === "string") {
            if (isHttpUrl(imgData)) return imgData;
            try {
              return getSafeImageUrl(JSON.parse(imgData));
            } catch {
              return null;
            }
          }
          if (typeof imgData === "object") return pickUrlFromItem(imgData);
          return null;
        };
        const mapped: FeaturedProduct[] = (data ?? []).map((p: any) => {
          const dg = p.datos_generales ?? {};
          return {
            id: p.id,
            nombre: dg.nombre ?? "Producto",
            categoria: p.categoria_principal ?? null,
            imagen: getSafeImageUrl(p.imagenes),
            disponibilidad:
              typeof dg.stock === "number"
                ? dg.stock
                : typeof dg.disponibilidad === "number"
                  ? dg.disponibilidad
                  : null,
          };
        });
        setFeatured(mapped);
      } catch {
        if (!cancelled) setErrorFeatured(true);
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* HERO (B1) */}
      <HomeHero onExploreCatalog={() => onViewChange("catalog")} />

      {/* PRODUCTOS DESTACADOS REALES */}
      <section className="py-16 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Productos destacados</h2>
              <p className="text-muted-foreground">Algunos de los favoritos de nuestros clientes corporativos.</p>
            </div>
            <button
              onClick={() => onViewChange("catalog")}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              Ver catálogo completo <ArrowRight size={16} />
            </button>
          </div>

          {loadingFeatured ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={20} /> Cargando productos…
            </div>
          ) : errorFeatured || featured.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
              <PackageX size={40} className="mb-3 opacity-60" />
              <p className="font-medium">
                {errorFeatured ? "No pudimos cargar los productos destacados." : "Aún no hay productos destacados."}
              </p>
              <button
                onClick={() => onViewChange("catalog")}
                className="mt-4 text-primary font-semibold hover:underline"
              >
                Explorar el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onViewChange("catalog")}
                  aria-label={`Ver ${p.nombre} en el catálogo`}
                  className="group text-left bg-surface rounded-xl border border-border hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <PackageX size={40} className="text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <div className="p-3 md:p-4">
                    {p.categoria && (
                      <p className="text-[10px] md:text-xs uppercase tracking-wide text-primary font-bold mb-1">
                        {p.categoria}
                      </p>
                    )}
                    <p className="font-bold text-foreground text-sm md:text-base mb-1 line-clamp-2">{p.nombre}</p>
                    {typeof p.disponibilidad === "number" && (
                      <p className="text-xs text-success font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        {p.disponibilidad.toLocaleString("es-MX")} disp.
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* KITS */}
      <section className="py-16 bg-dark-section text-dark-section-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10">
          <Gift size={300} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:flex items-center justify-between gap-12">
            <div className="lg:w-1/2 mb-8 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary font-semibold text-xs mb-4 border border-primary/30">
                <Target size={14} /> Solución Todo en Uno
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ¿Kits de Bienvenida u Onboarding? <br />
                <span className="text-primary">Nosotros los armamos.</span>
              </h2>
              <p className="text-lg text-dark-section-foreground/70 mb-6">
                Sube el nivel de tu empresa. En lugar de artículos sueltos, arma una propuesta tipo "Kit Onboarding"
                completa. Agrega múltiples productos a tu propuesta y nosotros nos encargamos de integrarlos.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-dark-section-foreground/90">
                  <CheckCircle2 className="text-success" size={20} /> Artículos coordinados con tu marca
                </li>
                <li className="flex items-center gap-3 text-dark-section-foreground/90">
                  <CheckCircle2 className="text-success" size={20} /> Ahorro logístico: Un solo proveedor
                </li>
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center shadow-2xl">
                <h3 className="text-2xl font-bold mb-2">Arma tu Kit Multi-Producto</h3>
                <p className="text-dark-section-foreground/70 mb-6">
                  Entra al catálogo, agrega los productos que te gusten a tu propuesta y selecciona la opción
                  "Kit/Paquete" al finalizar tu propuesta.
                </p>
                <button
                  onClick={() => onViewChange("catalog")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Ir al Catálogo <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso" className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Un proceso diseñado para no quitarte tiempo</h2>
            <p className="text-lg text-muted-foreground">
              Sabemos que organizas eventos importantes. Nosotros nos encargamos del trabajo pesado.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border z-0"></div>
            {[
              {
                step: "01",
                title: "Explora y arma tu propuesta",
                desc: "Navega nuestro catálogo de +10k productos, agrégalos a tu propuesta y sube tu logo para ver la muestra virtual.",
              },
              {
                step: "02",
                title: "Asesoría y Anticipo",
                desc: "Un experto afina los detalles contigo. Al aprobar la propuesta y realizar el anticipo acordado, ¡arrancamos!",
              },
              {
                step: "03",
                title: "Producción y Envío",
                desc: "Personalizamos con calidad premium y entregamos puntualmente en la fecha establecida en tu propuesta formal.",
              },
            ].map((item, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary/10 border-4 border-card shadow-lg rounded-full flex items-center justify-center text-2xl font-black text-primary mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GARANTÍA */}
      <section id="garantia" className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ShieldCheck size={64} className="mx-auto mb-6 opacity-70" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestra Garantía Cero Riesgos</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Si tu logotipo o diseño no queda exactamente igual a la muestra digital que aprobaste en el render,{" "}
            <strong>te reponemos el material completo sin costo adicional.</strong>
          </p>
          <button
            onClick={() => onViewChange("catalog")}
            className="bg-card text-primary hover:bg-card/90 font-bold py-4 px-8 rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 mx-auto"
          >
            Entrar al Catálogo <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </>
  );
}
