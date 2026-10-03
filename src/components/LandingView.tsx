import {
  CheckCircle2,
  Target,
  ArrowRight,
  Gift,
  ShieldCheck,
} from "lucide-react";
import HomeHero from "@/components/home/HomeHero";
import HomeCategories from "@/components/home/HomeCategories";

interface LandingViewProps {
  onViewChange: (view: string) => void;
}

const WHATSAPP_HREF =
  "https://wa.me/5215530311686?text=" +
  encodeURIComponent("Hola, quiero solicitar una propuesta de artículos promocionales para mi empresa.");

export default function LandingView({ onViewChange }: LandingViewProps) {
  return (
    <>
      {/* HERO (B1) */}
      <HomeHero onExploreCatalog={() => onViewChange("catalog")} />

      <HomeCategories />

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
