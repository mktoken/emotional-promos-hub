import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { commitQaOperation } from "../lib/agent-crm";
import { customerPrice, customerStock, isControlledQaContact, type PilotContact } from "../lib/agent-pilot";
import { advanceAgent, chooseAgentProduct, newAgentSession, type AgentSession } from "../lib/agent-workflow";
import { findRequestedVariant, handoffReasons, selectedProduct } from "../lib/agent-state";
import { loadRealProducts, recommendProducts } from "../lib/agent-tools";

const STORAGE_KEY = "pe-agent-web-pilot-v1";
const welcome = "¿Qué producto promocional necesitas y para cuántas personas? Puedo ayudarte a encontrar opciones y preparar una solicitud para revisión.";
function readSession(): AgentSession {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const value = JSON.parse(saved) as AgentSession;
      if (value.state?.schemaVersion === 1 && Array.isArray(value.messages) && !value.operationStarted) return value;
    }
  } catch { /* Start a clean session. */ }
  return newAgentSession(welcome);
}

export default function AgentPilotPage() {
  const auth = useCrmAuth();
  const [session, setSession] = useState<AgentSession>(readSession);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState<PilotContact>({ name: "", company: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (saved) { sessionStorage.removeItem(STORAGE_KEY); return; }
    // The local conversation survives reload in this tab. Do not retain CRM IDs or tool traces.
    const safe = { ...session, state: { ...session.state, crm: {}, trace: [], customer: {},
      company: { intelligenceStatus: "not_requested" as const } }, operationStarted: false };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [session, saved]);
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const chosen = selectedProduct(session.state);
  const recommended = recommendProducts(session.state.products);
  const hasStaffRole = auth.roles.some((role) => ["admin", "sales_manager", "sales_agent"].includes(role));
  const canPrepare = Boolean(chosen && chosen.price.status === "priced" && chosen.price.isValidQuantity
    && isControlledQaContact(contact) && hasStaffRole && !busy && !saved);

  async function send() {
    const text = draft.trim();
    if (!text || busy || saved) return;
    setBusy(true); setDraft(""); setError("");
    try {
      const result = await advanceAgent(session, text);
      setSession(result.session);
      if (result.searchFailed) setError("El catálogo no respondió. Intenta de nuevo o solicita apoyo de un asesor.");
    } catch {
      setError("No fue posible continuar la conversación. Intenta de nuevo.");
    } finally { setBusy(false); }
  }

  async function prepare() {
    if (!canPrepare) return;
    setBusy(true); setError("");
    try {
      const requested = selectedProduct(session.state);
      const interest = session.state.opportunity.productInterest;
      const quantity = session.state.opportunity.quantity;
      if (!requested || !interest || !quantity || requested.quantity !== quantity) throw new Error("invalid request");
      const fresh = (await loadRealProducts(interest, quantity)).find((item) => item.id === requested.id);
      if (!fresh || fresh.price.status !== "priced" || !fresh.price.isValidQuantity) throw new Error("unverified product");
      const requestedColor = session.state.opportunity.color;
      const variant = requestedColor ? findRequestedVariant(fresh.variants, requestedColor) : null;
      if (requestedColor && !variant) throw new Error("unverified color");
      const verified = { ...fresh, state: "selected" as const, color: variant?.color ?? null,
        observedStock: variant?.stock ?? fresh.observedStock,
        stockStatus: variant ? (variant.stock === null ? "unknown" as const : "observed" as const) : fresh.stockStatus };
      const state = { ...session.state, products: [verified],
        customer: { name: contact.name.trim(), email: contact.email.trim().toLowerCase(), phone: contact.phone.trim() },
        company: { ...session.state.company, name: contact.company.trim() } };
      const frozen = { ...session, state, operationStarted: true };
      setSession(frozen);
      await commitQaOperation(state);
      setSaved(true);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      setError("No se pudo preparar la solicitud QA. No vuelvas a enviarla; pide al equipo que revise si se creó un borrador.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background px-4 py-6 sm:px-6" data-testid="agent-pilot">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Piloto controlado · No disponible al público</p>
        <h1 className="text-2xl font-semibold">Asistente de promocionales</h1>
        <p className="text-sm text-muted-foreground">Te ayudamos a explorar productos reales. Precio, disponibilidad y personalización finales requieren revisión humana.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div className="max-h-[45vh] min-h-48 space-y-2 overflow-y-auto rounded-xl border bg-card p-4" aria-live="polite">
            {session.messages.map((message, index) => <p key={index} className={`rounded-lg p-2 text-sm ${message.role === "user" ? "ml-6 bg-primary/10" : "mr-6 bg-muted"}`}>
              <strong>{message.role === "user" ? "Tú" : "Asistente"}:</strong> {message.text}
            </p>)}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2">
            <Input aria-label="Mensaje" value={draft} onChange={(event) => setDraft(event.target.value)}
              placeholder="Quiero 50 libretas para un evento corporativo" disabled={busy || saved || session.operationStarted} />
            <Button type="submit" aria-label="Enviar mensaje" disabled={!draft.trim() || busy || saved || session.operationStarted}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="grid gap-3 sm:grid-cols-2">
            {session.state.products.filter((p) => p.state !== "rejected").slice(0, 8).map((product) => <article key={product.id} className="min-w-0 space-y-2 rounded-xl border bg-card p-3 text-sm">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-32 w-full rounded object-contain" />
                : <div className="flex h-32 items-center justify-center rounded bg-muted">Imagen no disponible</div>}
              <h2 className="font-semibold">{product.name}{recommended.some((r) => r.product.id === product.id) ? " · opción sugerida" : ""}</h2>
              {product.sku && <p>Modelo: {product.sku}</p>}
              <p>{customerPrice(product.price.status, product.price.unitPriceBeforeTaxMxn)}</p>
              <p>{customerStock(product.stockStatus, product.observedStock)}</p>
              <p>Color: {product.color ?? "Por elegir"} · Personalización por confirmar.</p>
              <div className="flex flex-wrap gap-2 items-center">
                {product.productUrl && <a className="underline" href={product.productUrl} target="_blank" rel="noopener noreferrer">Ver producto</a>}
                <Button type="button" size="sm" variant={product.state === "selected" ? "default" : "outline"}
                  disabled={busy || saved || session.operationStarted} onClick={() => setSession(chooseAgentProduct(session, product.id))}>Seleccionar</Button>
              </div>
            </article>)}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Tu solicitud</h2>
            <p>Producto: {chosen?.name ?? "Por elegir"}</p>
            <p>Cantidad: {session.state.opportunity.quantity ?? "Por confirmar"}</p>
            <p>Color: {chosen?.color ?? session.state.opportunity.color ?? "Por confirmar"}</p>
            <p>Precio: {chosen ? customerPrice(chosen.price.status, chosen.price.unitPriceBeforeTaxMxn) : "Por consultar"}</p>
            <p>Disponibilidad: {chosen ? customerStock(chosen.stockStatus, chosen.observedStock) : "Por consultar"}</p>
            <p>Personalización: sujeta a revisión técnica.</p>
            <p>Revisión humana: {handoffReasons(session.state).length ? "Necesaria" : "Antes de confirmar condiciones finales"}.</p>
          </div>
          {chosen && <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Preparar solicitud QA</h2>
            <p>Proporciona tus datos solo cuando desees guardar la solicitud. En este piloto se admite únicamente la identidad QA controlada.</p>
            {(["name", "company", "email", "phone"] as const).map((field) => <label key={field} className="block space-y-1">
              <span>{({ name: "Nombre", company: "Empresa", email: "Correo", phone: "Teléfono" })[field]}</span>
              <Input type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                value={contact[field]} onChange={(event) => setContact({ ...contact, [field]: event.target.value })} disabled={busy || saved} />
            </label>)}
            <Button className="w-full" type="button" onClick={() => void prepare()} disabled={!canPrepare}>Preparar borrador para revisión</Button>
            {!auth.loading && !hasStaffRole && <p className="text-muted-foreground">Para guardar en CRM, un operador QA con sesión comercial debe validar la solicitud.</p>}
          </div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {saved && <p role="status" className="rounded-xl border p-4 text-sm text-green-700">Solicitud QA preparada para revisión humana. No se emitió ni envió ninguna cotización.</p>}
        </aside>
      </div>
    </div>
  </main>;
}
