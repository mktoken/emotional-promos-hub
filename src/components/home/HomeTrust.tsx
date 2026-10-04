const SIGNALS = [
  { title: "Catálogo abierto", desc: "Explora opciones sin registrarte." },
  {
    title: "Condiciones por producto",
    desc: "Precio, cantidad mínima y disponibilidad se muestran o se confirman según cada caso.",
  },
  { title: "Revisión comercial", desc: "Confirmamos personalización y condiciones antes de continuar." },
];

export default function HomeTrust() {
  return (
    <section id="confianza" className="py-16 sm:py-20 bg-surface scroll-mt-20" aria-labelledby="confianza-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="confianza-title" className="text-3xl sm:text-4xl font-extrabold text-foreground mb-10 sm:mb-12">
          Claridad antes de decidir
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SIGNALS.map((s) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
