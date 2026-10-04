import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "¿Hay una cantidad mínima?",
    a: "Depende del producto. En la ficha verás el mínimo aplicable. Si necesitas menos, habrá que ajustar la cantidad o revisar otra opción.",
  },
  {
    q: "¿Qué incluye el precio mostrado?",
    a: "Corresponde al producto y cantidad indicados. Personalización, IVA y envío solo se incluyen cuando se especifica.",
  },
  {
    q: "¿Puedo solicitar artículos personalizados?",
    a: "Sí. La técnica, viabilidad y costo se confirman durante la revisión comercial.",
  },
  {
    q: "¿La disponibilidad está garantizada?",
    a: "No. La disponibilidad mostrada es referencial y se confirma antes de continuar.",
  },
  {
    q: "¿Qué sucede después de enviar mi solicitud?",
    a: "Revisamos tu solicitud y, si es viable, preparamos la cotización. Enviarla no confirma el pedido.",
  },
];

export default function HomeFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 sm:py-20 bg-card scroll-mt-20" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="faq-title" className="text-3xl sm:text-4xl font-extrabold text-foreground mb-8 sm:mb-10">
          Preguntas frecuentes
        </h2>
        <div className="divide-y divide-border border-y border-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            const btnId = `faq-btn-${i}`;
            const panelId = `faq-panel-${i}`;
            return (
              <div key={f.q}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full min-h-[44px] py-5 flex items-center justify-between gap-4 text-left text-base sm:text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <span>{f.q}</span>
                    <ChevronDown
                      size={20}
                      aria-hidden="true"
                      className={`shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="pb-5">
                  <p className="text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
