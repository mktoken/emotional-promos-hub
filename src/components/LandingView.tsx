import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import HomeHero from "@/components/home/HomeHero";
import HomeCategories from "@/components/home/HomeCategories";
import HomeSolutions from "@/components/home/HomeSolutions";

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

      <HomeSolutions />

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
