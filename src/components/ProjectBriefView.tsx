import { useRef, useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import {
  OBJECTIVE_MAX,
  emptyBrief,
  validateBrief,
  mockSubmitBrief,
  type BriefErrors,
  type ProjectBriefDraft,
} from "@/features/project-brief/lib/project-brief";

// Route B — RB2 UI NO-WRITE. Envío simulado; ningún dato sale del navegador.

interface ProjectBriefViewProps {
  onBack: () => void;
}

type Stage = "form" | "summary" | "sending" | "success";

const inputClass =
  "w-full min-h-[44px] rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
const labelClass = "block text-sm font-semibold text-foreground mb-1";
const errClass = "mt-1 text-sm font-medium text-destructive";
const checkRow = "mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm text-foreground cursor-pointer";

const OPTIONAL: { key: keyof ProjectBriefDraft; label: string; hint?: string }[] = [
  { key: "occasion", label: "Ocasión o tipo de proyecto", hint: "Ej. evento, bienvenida, fin de año." },
  { key: "audience", label: "¿Para quién es?", hint: "Clientes, colaboradores, asistentes…" },
  { key: "budget", label: "Presupuesto aproximado", hint: "Nos ayuda a sugerir opciones realistas." },
  { key: "city", label: "Ciudad de entrega" },
  { key: "product_interest", label: "Producto o categoría que tienes en mente" },
  { key: "personalization", label: "Personalización", hint: "Ej. logo a una tinta, grabado." },
];

export default function ProjectBriefView({ onBack }: ProjectBriefViewProps) {
  const [b, setB] = useState<ProjectBriefDraft>(emptyBrief);
  const [errors, setErrors] = useState<BriefErrors>({});
  const [stage, setStage] = useState<Stage>("form");
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ProjectBriefDraft>(k: K, v: ProjectBriefDraft[K]) => setB((p) => ({ ...p, [k]: v }));
  const desc = (k: string) => (errors[k as keyof BriefErrors] ? `${k}-error` : undefined);
  const Err = ({ k }: { k: keyof BriefErrors }) =>
    errors[k] ? (
      <p id={`${k}-error`} className={errClass}>
        {errors[k]}
      </p>
    ) : null;

  const scrollTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));

  const review = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateBrief(b);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setStage("summary");
    scrollTop();
  };

  const send = async () => {
    if (stage === "sending") return;
    setStage("sending");
    await mockSubmitBrief(b);
    setStage("success");
    scrollTop();
  };

  const summaryRows: [string, string][] = [
    ["Qué necesitas resolver", b.project_objective.trim()],
    ["Cantidad", b.quantity_unknown ? "Aún no la sé" : b.quantity],
    ["Fecha objetivo", b.target_date_unknown ? "Aún no la sé" : b.target_date],
    ...(b.company_not_applicable ? ([["Empresa o marca", "No aplica"]] as [string, string][]) : b.company.trim() ? ([["Empresa o marca", b.company.trim()]] as [string, string][]) : []),
    ["Nombre", b.contact_name.trim()],
    ...(b.email.trim() ? ([["Correo", b.email.trim()]] as [string, string][]) : []),
    ...(b.phone.trim() ? ([["Teléfono", b.phone.trim()]] as [string, string][]) : []),
    ...OPTIONAL.filter((o) => String(b[o.key]).trim()).map((o) => [o.label, String(b[o.key]).trim()] as [string, string]),
    ...(b.comments.trim() ? ([["Comentarios", b.comments.trim()]] as [string, string][]) : []),
  ];

  return (
    <main className="pt-10 pb-28 sm:py-14 bg-surface" data-route-b="rb2-demo-no-write">
      <div ref={topRef} className="max-w-2xl mx-auto px-4 sm:px-6 scroll-mt-24">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded mb-6"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Volver al inicio
        </button>

        {stage === "success" ? (
          <section role="status" aria-live="polite" className="rounded-2xl border border-border border-t-4 border-t-primary bg-card p-6 sm:p-10 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-lg text-foreground leading-relaxed">
              Recibimos tu solicitud. La revisaremos y te contactaremos para continuar. Enviar esta solicitud no confirma pedido, precio, disponibilidad ni producción.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-8 min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              Volver al inicio
            </button>
          </section>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">Cuéntanos tu proyecto</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Cuéntanos qué necesitas, aunque todavía no tengas claro el producto. Con esta información podremos revisar tu solicitud y continuar contigo.
            </p>

            {stage === "form" && (
              <form ref={formRef} onSubmit={review} noValidate className="space-y-8">
                <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
                  <legend className="px-1 text-base font-bold text-foreground">Tu necesidad</legend>
                  <div>
                    <label htmlFor="project_objective" className={labelClass}>¿Qué necesitas resolver? *</label>
                    <textarea
                      id="project_objective"
                      rows={4}
                      maxLength={OBJECTIVE_MAX}
                      value={b.project_objective}
                      onChange={(e) => set("project_objective", e.target.value)}
                      aria-invalid={!!errors.project_objective}
                      aria-describedby={["objective-count", desc("project_objective")].filter(Boolean).join(" ")}
                      className={`${inputClass} min-h-[112px]`}
                    />
                    <p id="objective-count" className="mt-1 text-xs text-muted-foreground">
                      {b.project_objective.length}/{OBJECTIVE_MAX}
                    </p>
                    <Err k="project_objective" />
                  </div>

                  <div>
                    <label htmlFor="quantity" className={labelClass}>Cantidad estimada *</label>
                    <input
                      id="quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={b.quantity}
                      disabled={b.quantity_unknown}
                      onChange={(e) => set("quantity", e.target.value)}
                      aria-invalid={!!errors.quantity}
                      aria-describedby={desc("quantity")}
                      className={inputClass}
                    />
                    <label className={checkRow}>
                      <input type="checkbox" className="h-5 w-5 accent-primary" checked={b.quantity_unknown} onChange={(e) => setB((p) => ({ ...p, quantity_unknown: e.target.checked, quantity: e.target.checked ? "" : p.quantity }))} />
                      Aún no la sé
                    </label>
                    <Err k="quantity" />
                  </div>

                  <div>
                    <label htmlFor="target_date" className={labelClass}>Fecha objetivo *</label>
                    <input
                      id="target_date"
                      type="date"
                      value={b.target_date}
                      disabled={b.target_date_unknown}
                      onChange={(e) => set("target_date", e.target.value)}
                      aria-invalid={!!errors.target_date}
                      aria-describedby={desc("target_date")}
                      className={inputClass}
                    />
                    <label className={checkRow}>
                      <input type="checkbox" className="h-5 w-5 accent-primary" checked={b.target_date_unknown} onChange={(e) => setB((p) => ({ ...p, target_date_unknown: e.target.checked, target_date: e.target.checked ? "" : p.target_date }))} />
                      Aún no la sé
                    </label>
                    <Err k="target_date" />
                  </div>
                </fieldset>

                <details className="rounded-2xl border border-border bg-card p-5 sm:p-6 group">
                  <summary className="min-h-[44px] flex items-center cursor-pointer font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                    Más detalles (opcional)
                  </summary>
                  <p className="text-sm text-muted-foreground mt-1 mb-5">Si los tienes, nos ayudan a proponerte opciones más precisas. Puedes enviar sin ellos.</p>
                  <div className="space-y-5">
                    {OPTIONAL.map((o) => (
                      <div key={o.key}>
                        <label htmlFor={o.key} className={labelClass}>{o.label}</label>
                        <input
                          id={o.key}
                          type="text"
                          value={String(b[o.key])}
                          onChange={(e) => set(o.key, e.target.value as never)}
                          aria-describedby={o.hint ? `${o.key}-hint` : undefined}
                          className={inputClass}
                        />
                        {o.hint && <p id={`${o.key}-hint`} className="mt-1 text-xs text-muted-foreground">{o.hint}</p>}
                      </div>
                    ))}
                    <div>
                      <label htmlFor="comments" className={labelClass}>Comentarios adicionales</label>
                      <textarea id="comments" rows={3} value={b.comments} onChange={(e) => set("comments", e.target.value)} className={`${inputClass} min-h-[88px]`} />
                    </div>
                  </div>
                </details>

                <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
                  <legend className="px-1 text-base font-bold text-foreground">¿Cómo te contactamos?</legend>
                  <div>
                    <label htmlFor="contact_name" className={labelClass}>Nombre *</label>
                    <input id="contact_name" type="text" autoComplete="name" value={b.contact_name} onChange={(e) => set("contact_name", e.target.value)} aria-invalid={!!errors.contact_name} aria-describedby={desc("contact_name")} className={inputClass} />
                    <Err k="contact_name" />
                  </div>
                  <div>
                    <label htmlFor="company" className={labelClass}>Empresa o marca</label>
                    <input id="company" type="text" autoComplete="organization" value={b.company} disabled={b.company_not_applicable} onChange={(e) => set("company", e.target.value)} className={inputClass} />
                    <label className={checkRow}>
                      <input type="checkbox" className="h-5 w-5 accent-primary" checked={b.company_not_applicable} onChange={(e) => setB((p) => ({ ...p, company_not_applicable: e.target.checked, company: e.target.checked ? "" : p.company }))} />
                      No aplica
                    </label>
                  </div>
                  <p id="contact-help" className="text-sm text-muted-foreground">Indica al menos un correo o un teléfono.</p>
                  <div>
                    <label htmlFor="email" className={labelClass}>Correo</label>
                    <input id="email" type="email" inputMode="email" autoComplete="email" value={b.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!(errors.email || errors.contact)} aria-describedby={["contact-help", desc("email"), desc("contact")].filter(Boolean).join(" ")} className={inputClass} />
                    <Err k="email" />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>Teléfono</label>
                    <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={b.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!(errors.phone || errors.contact)} aria-describedby={["contact-help", desc("phone"), desc("contact")].filter(Boolean).join(" ")} className={inputClass} />
                    <Err k="phone" />
                  </div>
                  <Err k="contact" />
                </fieldset>

                <div>
                  <label className="flex items-start gap-3 min-h-[44px] cursor-pointer text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-primary"
                      checked={b.privacy_consent}
                      onChange={(e) => set("privacy_consent", e.target.checked)}
                      aria-invalid={!!errors.privacy_consent}
                      aria-describedby={desc("privacy_consent")}
                    />
                    <span>
                      He leído el{" "}
                      <a href="/aviso-de-privacidad" target="_blank" rel="noopener" className="font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">Aviso de Privacidad</a>{" "}
                      y autorizo el uso de mis datos para revisar esta solicitud y contactarme sobre ella. *
                    </span>
                  </label>
                  <Err k="privacy_consent" />
                </div>

                <button type="submit" className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary">
                  Revisar solicitud
                </button>
              </form>
            )}

            {(stage === "summary" || stage === "sending") && (
              <section aria-labelledby="brief-summary-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 id="brief-summary-title" className="text-xl font-bold text-foreground mb-4">Revisa tu solicitud</h2>
                <dl className="divide-y divide-border">
                  {summaryRows.map(([k, v]) => (
                    <div key={k} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-semibold text-muted-foreground">{k}</dt>
                      <dd className="sm:col-span-2 text-foreground whitespace-pre-wrap break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={send}
                    disabled={stage === "sending"}
                    className="min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                  >
                    {stage === "sending" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                    Enviar solicitud
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("form")}
                    disabled={stage === "sending"}
                    className="min-h-[44px] border-2 border-foreground text-foreground font-bold py-3 px-8 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Editar
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
