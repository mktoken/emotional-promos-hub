const SOLUTIONS = [
  {
    title: "Eventos y campañas",
    desc: "Opciones para activaciones, eventos y acciones de marca.",
  },
  {
    title: "Colaboradores y reconocimiento",
    desc: "Ideas para bienvenida, reconocimiento y momentos importantes de tu equipo.",
  },
  {
    title: "Regalos corporativos",
    desc: "Productos para agradecer y fortalecer relaciones profesionales.",
  },
];

export default function HomeSolutions() {
  return (
    <section id="soluciones" className="py-16 sm:py-20 bg-surface scroll-mt-20" aria-labelledby="soluciones-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="soluciones-title" className="text-3xl sm:text-4xl font-extrabold text-foreground mb-10 sm:mb-12">
          Promocionales para cada ocasión
        </h2>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SOLUTIONS.map((s) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6 sm:p-8 border-t-4 border-t-primary">
              <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 sm:mt-12 flex justify-center">
          {/* CTA común presentacional. ROUTE B FUNCTIONAL CONTRACT = OPEN. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-describedby="solutions-cta-status"
            className="min-h-[44px] w-full sm:w-auto border-2 border-foreground text-foreground font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center cursor-not-allowed opacity-60"
          >
            Contar mi proyecto
          </button>
          <span id="solutions-cta-status" className="sr-only">
            Esta opción aún no está disponible.
          </span>
        </div>
      </div>
    </section>
  );
}
