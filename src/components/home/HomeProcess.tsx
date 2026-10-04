const STEPS = [
  {
    step: "01",
    title: "Cuéntanos qué necesitas",
    desc: "Elige un producto o comparte el objetivo de tu proyecto.",
  },
  {
    step: "02",
    title: "Revisamos opciones y cotizamos",
    desc: "Validamos producto, cantidad, precio y condiciones aplicables.",
  },
  {
    step: "03",
    title: "Definimos el siguiente paso",
    desc: "Recibes una cotización para revisar antes de cualquier confirmación.",
  },
];

export default function HomeProcess() {
  return (
    <section id="proceso" className="py-16 sm:py-20 bg-card scroll-mt-20" aria-labelledby="proceso-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="proceso-title" className="text-3xl sm:text-4xl font-extrabold text-foreground mb-10 sm:mb-12">
          De la idea a una cotización clara
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {STEPS.map((s) => (
            <li key={s.step} className="flex flex-col gap-3 border-l-2 border-primary pl-5">
              <span className="text-sm font-bold tracking-wide text-primary">{s.step}</span>
              <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
