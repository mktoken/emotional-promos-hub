import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  ClipboardList,
  Package,
  Trash2,
  FileText,
  Users,
  ArrowRight,
  MessageSquare,
  Settings2,
  Image as ImageIcon,
  User,
  Building,
  Phone,
  Mail,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  fetchPublicProductPriceQuote,
  estimatedLineTotal,
  isValidQuoteQuantity,
  type PublicPriceQuote,
} from "@/features/catalog/lib/public-product-price";
import {
  submitPublicQuoteRequest,
  toQuoteSubmissionError,
  validateContact,
  CONTACT_FIELD_ORDER,
  type ContactErrors,
  type ContactField,
  type QuoteContact,
  type QuoteFormat,
  type QuoteSubmissionResult,
} from "@/features/quotes/lib/public-quote-request";
import { QuoteRequestIdManager, computePayloadFingerprint } from "@/features/quotes/lib/quote-request-id";
import { buildQuoteRequestItems, type QuoteSelectionItem } from "@/features/quotes/lib/quote-selection";

interface QuoteCartViewProps {
  cart: QuoteSelectionItem[];
  onRemove: (cartId: number) => void;
  onBack: () => void;
  onSubmitted?: () => void;
}

const quoteFormatLabels: Record<QuoteFormat, string> = {
  individual: "Cotizar productos por separado",
  kit: "Armar kit o paquete",
};

interface LinePricingState {
  loading: boolean;
  error: boolean;
  quote: PublicPriceQuote | null;
}

const formatMoney = (value: number) =>
  value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function QuoteCartView({ cart, onRemove, onBack, onSubmitted }: QuoteCartViewProps) {
  const [step, setStep] = useState<"selection" | "form" | "success">("selection");
  const [quoteFormat, setQuoteFormat] = useState<QuoteFormat | null>(null);
  const [contact, setContact] = useState<QuoteContact>({ name: "", company: "", email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteSubmissionResult | null>(null);
  const [pricingByLine, setPricingByLine] = useState<Record<number, LinePricingState>>({});
  const [pricingReloadToken, setPricingReloadToken] = useState(0);

  const requestIdManagerRef = useRef(new QuoteRequestIdManager());
  const submittingRef = useRef(false);
  const pricingRequestRef = useRef(0);
  const fieldRefs = useRef<Partial<Record<ContactField, HTMLInputElement | null>>>({});

  const pricingKey = useMemo(
    () => cart.map((item) => `${item.cartId}:${item.productId}:${item.quantity}`).join("|"),
    [cart],
  );

  // Precio autoritativo por línea (siempre para la cantidad actual).
  useEffect(() => {
    if (cart.length === 0) {
      setPricingByLine({});
      return;
    }

    const requestSeq = pricingRequestRef.current + 1;
    pricingRequestRef.current = requestSeq;

    setPricingByLine((prev) => {
      const next: Record<number, LinePricingState> = {};
      for (const item of cart) {
        next[item.cartId] = { loading: true, error: false, quote: prev[item.cartId]?.quote ?? null };
      }
      return next;
    });

    void Promise.all(
      cart.map(async (item) => {
        if (!isValidQuoteQuantity(item.quantity)) {
          return [item.cartId, { loading: false, error: true, quote: null }] as const;
        }
        try {
          const quote = await fetchPublicProductPriceQuote(item.productId, item.quantity);
          return [item.cartId, { loading: false, error: false, quote }] as const;
        } catch {
          return [item.cartId, { loading: false, error: true, quote: null }] as const;
        }
      }),
    ).then((entries) => {
      if (pricingRequestRef.current !== requestSeq) return;
      const next: Record<number, LinePricingState> = {};
      for (const [cartId, state] of entries) next[cartId] = state;
      setPricingByLine(next);
    });
  }, [pricingKey, pricingReloadToken, cart]);

  const lineStates = cart.map((item) => ({
    item,
    pricing: pricingByLine[item.cartId] ?? { loading: true, error: false, quote: null },
  }));

  const pricingLoading = lineStates.some((line) => line.pricing.loading);
  const pricingHasError = lineStates.some((line) => line.pricing.error);
  const blockingLines = lineStates.filter(
    (line) => line.pricing.quote?.status === "below_minimum" || line.pricing.quote?.status === "unavailable",
  );
  const hasRequestQuoteLine = lineStates.some((line) => line.pricing.quote?.status === "request_quote");
  const allPriced =
    lineStates.length > 0 &&
    lineStates.every((line) => line.pricing.quote?.status === "priced" && line.pricing.quote.unitPriceBeforeTaxMxn !== null);

  const estimatedTotal = allPriced
    ? lineStates.reduce((sum, line) => sum + (estimatedLineTotal(line.pricing.quote, line.item.quantity) ?? 0), 0)
    : null;

  const canSubmit =
    cart.length > 0 &&
    cart.length <= 50 &&
    !pricingLoading &&
    !pricingHasError &&
    blockingLines.length === 0 &&
    quoteFormat !== null;

  const requestItems = useMemo(() => buildQuoteRequestItems(cart), [cart]);

  const payloadFingerprint = useMemo(
    () =>
      computePayloadFingerprint({
        contact: {
          name: contact.name.trim(),
          company: contact.company.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
        },
        quote_format: quoteFormat,
        items: requestItems,
      }),
    [contact, quoteFormat, requestItems],
  );

  const getPersonalizationLabel = (item: QuoteSelectionItem) =>
    item.personalizacionSolicitadaCliente?.label ||
    (item.logoFormat === "none"
      ? "Sin personalización"
      : item.logoFormat === "logo_1_ink"
        ? "Logo a 1 tinta"
        : item.logoFormat === "logo_2_ink"
          ? "Logo a 2 tintas"
          : item.logoFormat === "logo_3_plus_ink"
            ? "Logo a 3+ tintas"
            : item.logoFormat === "full_color"
              ? "Full color"
              : item.logoFormat === "engraving"
                ? "Grabado"
                : "Por definir con asesor");

  const getEconomySuggestionLabel = (item: QuoteSelectionItem) =>
    item.personalizacionSugeridaEconomica?.incluida ? item.personalizacionSugeridaEconomica.label : "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContact((prev) => ({ ...prev, [name]: value }));
  };

  const focusFirstError = useCallback((errors: ContactErrors) => {
    const firstField = CONTACT_FIELD_ORDER.find((field) => errors[field]);
    if (firstField) fieldRefs.current[firstField]?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!quoteFormat) {
      setSubmitError("Selecciona un formato de cotización válido.");
      setStep("selection");
      return;
    }

    const errors = validateContact(contact);
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError(null);
      focusFirstError(errors);
      return;
    }

    if (!canSubmit) {
      setSubmitError("Revisa los productos seleccionados antes de enviar la solicitud.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const requestId = requestIdManagerRef.current.getOrCreate(payloadFingerprint);

    try {
      const submission = await submitPublicQuoteRequest({
        requestId,
        contact,
        quoteFormat,
        items: requestItems,
      });
      setResult(submission);
      requestIdManagerRef.current.clear();
      setStep("success");
      onSubmitted?.();
    } catch (error) {
      setSubmitError(toQuoteSubmissionError(error).userMessage);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-surface">
        <div className="bg-card p-8 md:p-12 rounded-2xl shadow-xl border border-border text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Solicitud de cotización enviada</h2>
          <h3 className="text-xl text-muted-foreground mb-6">Gracias, {contact.name}.</h3>
          <p className="text-muted-foreground mb-4">
            Recibimos <strong>{result?.itemCount ?? 0} productos</strong> de <strong>{contact.company}</strong>. Tu
            asesor dará seguimiento para confirmar personalización, disponibilidad y tiempos.
          </p>
          <div className="rounded-xl border border-border bg-surface p-4 mb-6 text-left">
            <p className="text-xs text-muted-foreground">Referencia de solicitud</p>
            <p className="font-mono text-sm font-bold text-foreground break-all">{result?.quoteId}</p>
            <p className="text-xs text-muted-foreground mt-3">Total estimado</p>
            <p className="font-bold text-foreground">
              {result?.totalEstimated !== null && result?.totalEstimated !== undefined
                ? `$${formatMoney(result.totalEstimated)} MXN`
                : "Total por confirmar"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Estimación antes de IVA e impresión. Tu asesor confirmará la propuesta formal.
            </p>
          </div>
          <a
            href={`https://wa.me/5215530311686?text=${encodeURIComponent(
              `Hola, soy ${contact.name}. Acabo de enviar mi solicitud de cotización para ${contact.company}.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <MessageSquare size={20} /> Dar seguimiento por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-surface min-h-screen">
      <div className="bg-dark-section text-dark-section-foreground py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={step === "form" ? () => setStep("selection") : onBack}
            className="flex items-center gap-2 text-dark-section-foreground/60 hover:text-dark-section-foreground transition font-medium text-sm mb-6"
          >
            <ChevronLeft size={16} />{" "}
            {step === "form" ? "Volver a los productos seleccionados" : "Seguir explorando catálogo"}
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3">
            {step === "form" ? (
              <Users className="text-primary" size={36} />
            ) : (
              <FileText className="text-primary" size={36} />
            )}
            {step === "form" ? "Datos de contacto" : "Solicitud de cotización"}
          </h1>
          <p className="mt-3 text-sm text-dark-section-foreground/70 max-w-2xl">
            {step === "form"
              ? "Completa tus datos para que podamos validar personalización, disponibilidad y tiempos antes de emitir la propuesta."
              : "Revisa los productos seleccionados antes de enviar tu solicitud de cotización."}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {cart.length === 0 ? (
          <div className="bg-card p-12 rounded-2xl shadow-sm border border-border text-center">
            <ClipboardList size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No hay productos seleccionados</h3>
            <p className="text-muted-foreground mb-6">Aún no has agregado productos a tu solicitud de cotización.</p>
            <button
              onClick={onBack}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition"
            >
              Explorar productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {step === "selection" &&
                lineStates.map(({ item, pricing }) => (
                  <div
                    key={item.cartId}
                    className="bg-card p-4 rounded-xl border border-border shadow-sm flex gap-4 items-center"
                  >
                    <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0 border border-border overflow-hidden bg-secondary">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <Package
                        size={32}
                        className={`opacity-40 text-muted-foreground ${item.imageUrl ? "hidden" : ""}`}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.claveProducto || item.sku ? `Clave: ${item.claveProducto || item.sku} | ` : ""}
                        Color: {item.color.name}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          Cant: <strong>{item.quantity}</strong>
                        </span>
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                          Personalización: <strong>{getPersonalizationLabel(item)}</strong>
                        </span>
                        {getEconomySuggestionLabel(item) && (
                          <span className="bg-success/10 text-success px-2 py-1 rounded">
                            Alternativa económica: <strong>{getEconomySuggestionLabel(item)}</strong>
                          </span>
                        )}
                        {item.requiereRevisionTecnica && (
                          <span className="bg-amber-500/10 text-amber-700 px-2 py-1 rounded">Revisión técnica</span>
                        )}
                        {item.entregaEstimada && (
                          <span className="bg-success/10 text-success px-2 py-1 rounded">
                            Entrega estimada: {item.entregaEstimada}
                          </span>
                        )}
                        {item.hasVirtualSample && (
                          <span className="bg-success/10 text-success px-2 py-1 rounded flex items-center gap-1">
                            <ImageIcon size={12} /> Muestra Virtual
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs" aria-live="polite">
                        {pricing.loading ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Loader2 size={12} className="animate-spin" /> Consultando precio...
                          </span>
                        ) : pricing.error ? (
                          <span className="inline-flex items-center gap-2 text-destructive">
                            <AlertTriangle size={12} /> No pudimos consultar el precio.
                            <button
                              type="button"
                              onClick={() => setPricingReloadToken((token) => token + 1)}
                              className="underline underline-offset-2 font-bold"
                            >
                              Reintentar
                            </button>
                          </span>
                        ) : pricing.quote?.status === "below_minimum" ? (
                          <span className="text-destructive font-bold">
                            Requiere una cantidad mínima de{" "}
                            {pricing.quote.minimumQuantity?.toLocaleString("es-MX") ?? "mayor"} piezas.
                          </span>
                        ) : pricing.quote?.status === "unavailable" ? (
                          <span className="text-destructive font-bold">No disponible para cotización.</span>
                        ) : pricing.quote?.status === "request_quote" ? (
                          <span className="text-muted-foreground font-medium">Precio por confirmar</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">
                        {pricing.quote?.status === "priced"
                          ? `$${formatMoney(estimatedLineTotal(pricing.quote, item.quantity) ?? 0)}`
                          : pricing.loading
                            ? "—"
                            : "Por confirmar"}
                      </p>
                      <button
                        onClick={() => onRemove(item.cartId)}
                        aria-label={`Quitar ${item.name} de la solicitud`}
                        className="text-destructive/60 hover:text-destructive p-1 bg-destructive/10 hover:bg-destructive/20 rounded transition-colors mt-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

              {step === "selection" && blockingLines.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle size={16} /> Corrige estos productos para poder enviar la solicitud
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
                    {blockingLines.map((line) => (
                      <li key={line.item.cartId}>
                        {line.item.name} —{" "}
                        {line.pricing.quote?.status === "below_minimum"
                          ? `cantidad mínima ${line.pricing.quote.minimumQuantity?.toLocaleString("es-MX") ?? "mayor"}`
                          : "no disponible para cotización"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === "form" && (
                <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">
                    Datos de contacto
                  </h3>
                  <form id="quote-request-form" onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-name" className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                          <User size={14} /> Nombre completo *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          ref={(el) => (fieldRefs.current.name = el)}
                          value={contact.name}
                          onChange={handleInputChange}
                          aria-invalid={contactErrors.name ? "true" : undefined}
                          aria-describedby={contactErrors.name ? "contact-name-error" : undefined}
                          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card"
                        />
                        {contactErrors.name && (
                          <p id="contact-name-error" className="mt-1 text-xs font-medium text-destructive">
                            {contactErrors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="contact-company" className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                          <Building size={14} /> Nombre de tu empresa *
                        </label>
                        <input
                          id="contact-company"
                          type="text"
                          name="company"
                          ref={(el) => (fieldRefs.current.company = el)}
                          value={contact.company}
                          onChange={handleInputChange}
                          aria-invalid={contactErrors.company ? "true" : undefined}
                          aria-describedby={contactErrors.company ? "contact-company-error" : undefined}
                          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card"
                        />
                        {contactErrors.company && (
                          <p id="contact-company-error" className="mt-1 text-xs font-medium text-destructive">
                            {contactErrors.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-phone" className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                          <Phone size={14} /> WhatsApp / Teléfono *
                        </label>
                        <input
                          id="contact-phone"
                          type="tel"
                          name="phone"
                          ref={(el) => (fieldRefs.current.phone = el)}
                          value={contact.phone}
                          onChange={handleInputChange}
                          aria-invalid={contactErrors.phone ? "true" : undefined}
                          aria-describedby={contactErrors.phone ? "contact-phone-error" : undefined}
                          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card"
                        />
                        {contactErrors.phone && (
                          <p id="contact-phone-error" className="mt-1 text-xs font-medium text-destructive">
                            {contactErrors.phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                          <Mail size={14} /> Correo corporativo *
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          ref={(el) => (fieldRefs.current.email = el)}
                          value={contact.email}
                          onChange={handleInputChange}
                          aria-invalid={contactErrors.email ? "true" : undefined}
                          aria-describedby={contactErrors.email ? "contact-email-error" : undefined}
                          className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none bg-surface focus:bg-card"
                        />
                        {contactErrors.email && (
                          <p id="contact-email-error" className="mt-1 text-xs font-medium text-destructive">
                            {contactErrors.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </form>

                  {submitError && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive"
                    >
                      {submitError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden sticky top-28">
                {step === "selection" && (
                  <div className="bg-surface p-6 border-b border-border">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" /> ¿Cómo quieres cotizar estos productos?
                    </h3>
                    {quoteFormat ? (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <p className="text-xs font-medium text-primary">Formato seleccionado</p>
                        <p className="mt-1 font-bold text-foreground">{quoteFormatLabels[quoteFormat]}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Esta solicitud se enviará con un solo formato.
                        </p>
                        <button
                          type="button"
                          onClick={() => setQuoteFormat(null)}
                          className="mt-3 text-xs font-bold text-primary underline underline-offset-4"
                        >
                          Cambiar formato
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setQuoteFormat("individual")}
                          className="block w-full p-4 border rounded-xl cursor-pointer transition-all text-left border-border hover:border-primary/40 bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <FileText size={18} className="mt-0.5 text-primary shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-foreground">Cotizar productos por separado</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Cada producto se presentará como una opción independiente.
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuoteFormat("kit")}
                          className="block w-full p-4 border rounded-xl cursor-pointer transition-all text-left border-border hover:border-primary/40 bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <Package size={18} className="mt-0.5 text-primary shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-foreground">Armar kit o paquete</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Ideal para onboarding, eventos, campañas o regalos corporativos.
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {step === "form" && (
                  <div className="bg-surface p-6 border-b border-border">
                    <h3 className="font-bold text-foreground mb-4">Resumen de la solicitud</h3>
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Formato</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-foreground">
                          {quoteFormat ? quoteFormatLabels[quoteFormat] : "No seleccionado"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep("selection")}
                          className="text-xs font-bold text-primary underline underline-offset-4"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-4">
                      {lineStates.map(({ item, pricing }) => (
                        <li key={item.cartId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground line-clamp-1 pr-4">
                            {item.quantity}x {item.modeloComercial || item.name}
                          </span>
                          <span className="font-medium text-foreground">
                            {pricing.quote?.status === "priced"
                              ? `$${formatMoney(estimatedLineTotal(pricing.quote, item.quantity) ?? 0)}`
                              : "Por confirmar"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-6 bg-dark-section text-dark-section-foreground">
                  <div className="flex justify-between items-center mb-2" aria-live="polite">
                    <span className="text-dark-section-foreground/60">
                      {estimatedTotal !== null ? "Total estimado" : "Total por confirmar"}
                    </span>
                    <span className="text-2xl font-black text-success">
                      {pricingLoading ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : estimatedTotal !== null ? (
                        `$${formatMoney(estimatedTotal)}`
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  {hasRequestQuoteLine && estimatedTotal === null && (
                    <p className="text-xs text-dark-section-foreground/60 mb-2">
                      Hay productos con precio por confirmar.
                    </p>
                  )}
                  <p className="text-xs text-dark-section-foreground/60 mb-6">
                    El servidor recalculará precios y cantidades al enviar la solicitud. Precio antes de IVA e
                    impresión.
                  </p>

                  {pricingHasError && (
                    <button
                      type="button"
                      onClick={() => setPricingReloadToken((token) => token + 1)}
                      className="w-full mb-3 bg-dark-section-foreground/10 hover:bg-dark-section-foreground/15 text-dark-section-foreground font-bold py-3 rounded-xl transition-all border border-dark-section-foreground/15 flex justify-center items-center gap-2"
                    >
                      <RefreshCw size={16} /> Reintentar consulta de precios
                    </button>
                  )}

                  {step === "selection" ? (
                    <div className="space-y-3">
                      <button
                        disabled={!canSubmit}
                        onClick={() => {
                          if (!quoteFormat) return;
                          setStep("form");
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Revisar solicitud <ArrowRight size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={onBack}
                        className="w-full bg-dark-section-foreground/10 hover:bg-dark-section-foreground/15 text-dark-section-foreground font-bold py-3 rounded-xl transition-all border border-dark-section-foreground/15"
                      >
                        Agregar más productos
                      </button>
                    </div>
                  ) : (
                    <button
                      form="quote-request-form"
                      type="submit"
                      disabled={submitting || !canSubmit}
                      className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" /> Enviando solicitud...
                        </>
                      ) : (
                        "Enviar solicitud de cotización"
                      )}
                    </button>
                  )}
                  <p className="text-xs text-dark-section-foreground/60 text-center mt-4">
                    Solicitar una cotización no genera un pedido ni compromiso alguno.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
