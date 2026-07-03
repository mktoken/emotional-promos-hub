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
      {/* HERO */}
      <section className="relative bg-card pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-surface rounded-r-full opacity-50 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 text-center lg:text-left mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6 border border-primary/20">
                <Target size={16} />
                <span>Plataforma B2B para Compradores Corporativos</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
                Eleva la presencia de tu marca con los mejores{" "}
                <span className="text-primary">artículos corporativos.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                Accede libremente a nuestro catálogo de +10,000 productos con inventario en tiempo real. Arma tu
                proyecto, visualiza renders virtuales y arma tu propuesta en minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Solicitar propuesta por WhatsApp"
                  className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
                >
                  <MessageCircle size={20} /> Solicitar propuesta por WhatsApp
                </a>
                <button
                  onClick={() => onViewChange("catalog")}
                  aria-label="Explorar catálogo abierto"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-glow-primary transition-all flex items-center justify-center gap-2 text-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  Explorar Catálogo <ArrowRight size={20} />
                </button>
              </div>
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-success" size={18} /> Sin registro previo
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-success" size={18} /> Stock en vivo
                </div>
              </div>
            </div>

            {/* Vitrina desktop: nunca se oculta para evitar espacio vacío en el hero */}
            <div
              className="hidden lg:block lg:col-span-6 relative cursor-pointer group"
              onClick={() => onViewChange("catalog")}
            >
              <div className="bg-card rounded-2xl shadow-xl border border-border p-6 relative z-10 transform transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="absolute -top-4 -right-4 bg-success text-success-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-md transform rotate-3 z-20 flex items-center gap-1">
                  <Activity size={12} className="animate-pulse" /> Catálogo Activo
                </div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Top Ventas Corporativas</h3>
                    <p className="text-sm text-muted-foreground">Haz clic para ver detalles y agregar a tu propuesta</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>

                {loadingFeatured ? (
                  <div className="min-h-[320px] flex items-center justify-center text-muted-foreground">
                    <Loader2 className="animate-spin mr-2" size={20} /> Cargando productos…
                  </div>
                ) : errorFeatured || featured.length === 0 ? (
                  <div className="min-h-[320px] bg-surface rounded-xl border border-border flex flex-col items-center justify-center text-center p-8">
                    <PackageX size={56} className="text-primary mb-4 opacity-80" />
                    <p className="text-lg font-bold text-foreground mb-2">Catálogo listo para tu propuesta</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Explora opciones para eventos, kits corporativos, campañas y regalos empresariales.
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-primary font-semibold text-sm">
                      Ver catálogo <ArrowRight size={16} />
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {featured.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className="bg-surface rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                            {p.imagen ? (
                              <img
                                src={p.imagen}
                                alt={p.nombre}
                                loading="lazy"
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <PackageX size={48} className="text-muted-foreground opacity-50" />
                            )}
                          </div>
                          <p className="font-bold text-foreground text-sm mb-1 line-clamp-2">{p.nombre}</p>
                          {typeof p.disponibilidad === "number" && (
                            <p className="text-xs text-success font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                              {p.disponibilidad.toLocaleString("es-MX")} disp.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border text-center">
                      <span className="text-primary font-semibold text-sm">Explorar artículos disponibles</span>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary/10 rounded-full z-0 opacity-50"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/5 rounded-full z-0 opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

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
