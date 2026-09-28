import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { loadRealProducts, recommendProducts } from "../lib/agent-tools";
import { commitQaOperation, QA_CONTACT } from "../lib/agent-crm";
import { captureMessage, createOpportunityState, handoffReasons, nextQuestion,
  findRequestedVariant, rejectProduct, selectProduct, selectedProduct, updateQuantity, type OpportunityState } from "../lib/agent-state";

const STORAGE_KEY = "pe-agent-qa-session-v1";
interface Session { state: OpportunityState; messages: Array<{ role: "user" | "agent"; text: string }>; operationStarted?: boolean }
const makeSession = (): Session => ({
  state: createOpportunityState(crypto.randomUUID()),
  messages: [{ role: "agent", text: "Cuéntame qué producto y cantidad necesitas. Buscaré opciones reales del catálogo." }],
});
function readSession(): Session {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Session;
      if (parsed.state?.schemaVersion === 1 && Array.isArray(parsed.messages)) return parsed;
    }
  } catch { /* sesión nueva */ }
  return makeSession();
}

export default function AgentQaPage() {
  const auth = useCrmAuth();
  const [session, setSession] = useState<Session>(readSession);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaConfirmed, setQaConfirmed] = useState(false);
  const [completed, setCompleted] = useState(() => Boolean(session.state.crm.draftQuoteId));

  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }, [session]);

  if (auth.loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (!auth.roles.some((role) => ["admin", "sales_manager", "sales_agent"].includes(role))) {
    return <p className="p-6">Se requiere rol comercial para la prueba QA.</p>;
  }

  const state = session.state;
  const chosen = selectedProduct(state);
  const recommendations = recommendProducts(state.products);
  const append = (current: Session, role: "user" | "agent", text: string): Session => ({
    ...current, messages: [...current.messages, { role, text }],
  });
  const trace = (current: OpportunityState, tool: string, ok: boolean): OpportunityState => ({
    ...current, trace: [...current.trace, { tool, ok, timestamp: new Date().toISOString() }],
  });

  async function search(current: Session) {
    const interest = current.state.opportunity.productInterest;
    const quantity = current.state.opportunity.quantity;
    if (!interest || !quantity) return current;
    try {
      const products = await loadRealProducts(interest, quantity);
      const next = { ...current, state: trace({ ...current.state, products }, "search_products", true) };
      return append(next, "agent", products.length
        ? `Encontré ${products.length} productos reales. Revisa precio y stock observados; selecciona una opción.`
        : "No encontré productos compatibles con esa cantidad. Puedo dejar la búsqueda para revisión humana.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al consultar el catálogo.");
      return append({ ...current, state: trace(current.state, "search_products", false) }, "agent",
        "No pude consultar el catálogo. No recomendaré productos sin datos; intenta de nuevo o solicita revisión humana.");
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy || completed || session.operationStarted) return;
    setBusy(true); setError(null); setDraft("");
    let current = append(session, "user", text);
    const before = current.state;
    const previousSelectedId = selectedProduct(before)?.id;
    current = { ...current, state: captureMessage(before, text) };
    const ordinal = text.match(/(?:la|opci[oó]n)\s*(primera|segunda|tercera|1|2|3)/i);
    if (ordinal && recommendations.length) {
      const index = ({ primera: 0, segunda: 1, tercera: 2, "1": 0, "2": 1, "3": 2 } as Record<string, number>)[ordinal[1].toLowerCase()];
      if (recommendations[index]) current = { ...current, state: selectProduct(current.state, recommendations[index].product.id) };
    }
    if (/\b(esa no|otra opci[oó]n)\b/i.test(text) && chosen) current = { ...current, state: rejectProduct(current.state, chosen.id) };
    const quantityChanged = current.state.opportunity.quantity !== before.opportunity.quantity && Boolean(before.opportunity.quantity);
    if (quantityChanged) {
      current = { ...current, state: updateQuantity(current.state, current.state.opportunity.quantity!) };
    }
    if (current.state.opportunity.productInterest && current.state.opportunity.quantity &&
      (!current.state.products.length || current.state.opportunity.quantity !== before.opportunity.quantity)) {
      current = await search(current);
      if (previousSelectedId && current.state.products.some((p) => p.id === previousSelectedId)) {
        current = { ...current, state: selectProduct(current.state, previousSelectedId) };
      }
    }
    const requestedColor = current.state.opportunity.color;
    const selected = selectedProduct(current.state);
    if (selected && requestedColor && (quantityChanged || requestedColor !== before.opportunity.color || selected.id !== previousSelectedId)) {
      const variant = findRequestedVariant(selected.variants, requestedColor);
      current = { ...current, state: { ...current.state, products: current.state.products.map((p) => p.id === selected.id
        ? { ...p, color: variant?.color ?? null, observedStock: variant?.stock ?? null,
          stockStatus: variant?.stock === null || !variant ? "unknown" as const : "observed" as const } : p) } };
      if (!variant) current = append(current, "agent", `No tengo evidencia de variante ${requestedColor} para ese producto.`);
    }
    current = append(current, "agent", nextQuestion(current.state));
    setSession(current); setBusy(false);
  }

  async function select(id: string) {
    if (session.operationStarted) return;
    const updated = selectProduct(state, id);
    setSession(append({ ...session, state: updated }, "agent", nextQuestion(updated)));
  }

  async function saveQa() {
    if (!qaConfirmed || !chosen || busy || completed) return;
    setBusy(true); setError(null);
    const frozenSession = { ...session, operationStarted: true };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(frozenSession));
    setSession(frozenSession);
    try {
      const result = await commitQaOperation(state);
      setSession({ ...frozenSession, state: { ...state, crm: result,
        trace: [...state.trace, { tool: "commit_qa_operation", ok: true, timestamp: new Date().toISOString() }] } });
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se completó la operación QA.");
    } finally { setBusy(false); }
  }

  return <div className="max-w-5xl mx-auto space-y-5">
    <div>
      <h1 className="text-2xl font-bold">Super Agente Web — QA controlada</h1>
      <p className="text-sm text-muted-foreground">Sesión {state.sessionId}. La operación termina en revisión humana.</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-4">
        <div className="rounded-xl border bg-card p-4 space-y-2 max-h-72 overflow-y-auto" aria-live="polite">
          {session.messages.map((msg, i) => <p key={i} className={`text-sm p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
            <strong>{msg.role === "user" ? "Cliente QA" : "Agente"}:</strong> {msg.text}
          </p>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2">
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Quiero 50 libretas para un evento corporativo" disabled={busy || completed || session.operationStarted} aria-label="Mensaje" />
          <Button type="submit" disabled={!draft.trim() || busy || completed || session.operationStarted}>{busy ? <Loader2 className="animate-spin" /> : <Send />}</Button>
        </form>
        <div className="space-y-3">
          {recommendations.map(({ label, product }) => <article key={product.id} className="flex gap-3 rounded-xl border bg-card p-3">
            {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-20 w-20 rounded object-contain" />}
            <div className="min-w-0 flex-1 text-sm space-y-1">
              <p className="font-semibold">{label}: {product.name}</p>
              <p>SKU: {product.sku ?? "No informado"} · {product.quantity} piezas</p>
              <p>Precio unitario: {product.price.status === "priced" && product.price.unitPriceBeforeTaxMxn !== null
                ? `$${product.price.unitPriceBeforeTaxMxn.toFixed(2)} MXN antes de IVA e impresión` : product.price.status}</p>
              <p>Stock observado: {product.observedStock ?? "No comprobado"}. Disponibilidad final por confirmar.</p>
              <p>Personalización: sujeta a revisión técnica.</p>
              <div className="flex flex-wrap gap-2 items-center">
                <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver ficha real</a>
                <Button type="button" size="sm" variant="outline" onClick={() => void select(product.id)} disabled={busy || session.operationStarted}>Seleccionar</Button>
              </div>
            </div>
          </article>)}
          {state.products.filter((p) => !recommendations.some((r) => r.product.id === p.id) && p.state !== "rejected")
            .slice(0, 3).map((product) => <article key={product.id} className="flex gap-3 rounded-xl border bg-card p-3 text-sm">
              {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-20 w-20 shrink-0 rounded object-contain" />}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">{product.name} · {product.sku ?? "SKU no informado"}</p>
                <p>Precio: {product.price.status}. Stock observado: {product.observedStock ?? "No comprobado"}.</p>
                <p>Disponibilidad y personalización sujetas a revisión humana.</p>
                <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver ficha real</a>
                <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => void select(product.id)} disabled={session.operationStarted}>Seleccionar</Button>
              </div>
            </article>)}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
          <h2 className="font-semibold">Operación lista para revisión</h2>
          <p>Cliente: {QA_CONTACT.name} · {QA_CONTACT.email}</p>
          <p>Empresa: {QA_CONTACT.company}</p>
          <p>Evento: {state.opportunity.eventType ?? "Por confirmar"}</p>
          <p>Fecha: {state.opportunity.eventDate ?? "Por confirmar"}</p>
          <p>Ciudad: {state.opportunity.deliveryCity ?? "Por confirmar"}</p>
          <p>Presupuesto: {state.opportunity.budgetTotal ?? "Por confirmar"}</p>
          <p>Producto: {chosen?.name ?? "Sin seleccionar"}</p>
          <p>SKU: {chosen?.sku ?? "No informado"}</p>
          <p>Cantidad: {chosen?.quantity ?? state.opportunity.quantity ?? "Por confirmar"}</p>
          <p>Color: {chosen?.color ?? state.opportunity.color ?? "Por confirmar"}</p>
          <p>Precio: {chosen?.price.status === "priced" && chosen.price.unitPriceBeforeTaxMxn !== null
            ? `$${chosen.price.unitPriceBeforeTaxMxn.toFixed(2)} MXN por pieza antes de IVA e impresión (priced)`
            : chosen?.price.status ?? "No consultado"}</p>
          <p>Stock: {chosen?.stockStatus === "observed"
            ? `${chosen.observedStock} observado; disponibilidad final por confirmar`
            : "No comprobado"}</p>
          <p>Logo: {state.art.logoReceived ? "Recibido; revisión técnica pendiente"
            : state.art.technicalReviewRequired ? "Solicitado; archivo pendiente; revisión técnica requerida" : "No solicitado"}</p>
          <p>Pendientes: {handoffReasons(state).join("; ") || "Revisión humana"}</p>
          <p>Siguiente acción: asesor revisa producto, stock, personalización y borrador.</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
          <label className="flex gap-2 items-start"><input type="checkbox" checked={qaConfirmed} onChange={(e) => setQaConfirmed(e.target.checked)} />
            Confirmo que esta prueba usa solo identidades QA y que crearé prospecto, oportunidad y borrador QA.</label>
          <Button className="w-full" onClick={() => void saveQa()} disabled={!qaConfirmed || !chosen || chosen.price.status !== "priced" || busy || completed}>
            <ShieldCheck className="w-4 h-4 mr-2" /> Preparar operación QA
          </Button>
          {error && <p className="text-destructive" role="alert">{error}</p>}
          {state.crm.prospectId && <p>Prospecto QA: <Link className="underline" to={`/crm/prospectos/${state.crm.prospectId}`}>{state.crm.prospectId}</Link></p>}
          {state.crm.opportunityId && <p>Oportunidad QA: <Link className="underline" to={`/crm/cotizaciones/${state.crm.opportunityId}`}>{state.crm.opportunityId}</Link></p>}
          {state.crm.draftQuoteId && <p>Borrador QA: <Link className="underline" to={`/crm/cotizaciones-formales/${state.crm.draftQuoteId}`}>{state.crm.draftQuoteId}</Link></p>}
          {completed && <p className="text-green-700 font-semibold">Operación QA preparada para revisión humana. No emitida ni enviada.</p>}
        </div>
      </aside>
    </div>
  </div>;
}
