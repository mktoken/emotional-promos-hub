import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { commitQaOperation } from "../lib/agent-crm";
import { isControlledQaContact, type PilotContact } from "../lib/agent-pilot";
import { advanceAgent, agentDraftFingerprint, migrateAgentSession, newAgentSession, type AgentSession } from "../lib/agent-workflow";
import { selectedLineProduct, selectedProductLines } from "../lib/agent-state";
import { AgentProductLines } from "../components/AgentProductLines";

const STORAGE_KEY = "pe-agent-web-pilot-v1";
const welcome = "¿Qué producto promocional necesitas y para cuántas personas? Buscaré opciones reales del catálogo y conservaré cada producto por separado.";
function readSession(): AgentSession {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const value = migrateAgentSession(JSON.parse(saved));
      if (value && !value.operationStarted) return value;
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
  const [error, setError] = useState("");

  useEffect(() => {
    // Persist only buyer-side conversation and a non-sensitive “draft exists” marker.
    const safe = { ...session, state: { ...session.state, crm: {}, trace: [], customer: {},
      company: { intelligenceStatus: "not_requested" as const } }, operationStarted: false };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [session]);
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const active = session.state.productLines.filter((line) => !["removed", "rejected"].includes(line.status));
  const selected = selectedProductLines(session.state);
  const allLinesReady = active.length > 0 && selected.length === active.length;
  const hasSavedDraft = session.draftPrepared === true || Boolean(session.state.crm.draftQuoteId);
  const hasUnsavedChanges = !session.draftFingerprint || session.draftFingerprint !== agentDraftFingerprint(session.state);
  const hasStaffRole = auth.roles.some((role) => ["admin", "sales_manager", "sales_agent"].includes(role));
  const canPrepare = Boolean(allLinesReady && selected.every((line) => {
    const product = selectedLineProduct(line);
    return line.status === "selected" && product?.price.status === "priced" && product.price.isValidQuantity;
  }) && isControlledQaContact(contact) && hasStaffRole && !busy && !session.operationStarted
    && (!hasSavedDraft || hasUnsavedChanges));

  async function send() {
    const text = draft.trim();
    if (!text || busy || session.operationStarted) return;
    setBusy(true); setDraft(""); setError("");
    try {
      const result = await advanceAgent(session, text);
      setSession(result.session);
      if (result.searchFailed) setError("El catálogo no respondió para esa línea. Las demás se conservaron; puedes reintentar o pedir apoyo de un asesor.");
    } catch {
      setError("No fue posible continuar la conversación. Intenta de nuevo.");
    } finally { setBusy(false); }
  }

  async function prepare() {
    if (!canPrepare) return;
    setBusy(true); setError("");
    const operationState = { ...session.state,
      customer: { name: contact.name.trim(), email: contact.email.trim().toLowerCase(), phone: contact.phone.trim() },
      company: { ...session.state.company, name: contact.company.trim() } };
    const frozen = { ...session, state: operationState, operationStarted: true };
    setSession(frozen);
    try {
      const result = await commitQaOperation(operationState);
      const committed = { ...operationState, crm: result,
        trace: [...operationState.trace, { tool: "commit_qa_operation", ok: true, timestamp: new Date().toISOString() }] };
      setSession({ ...frozen, state: committed, operationStarted: false, draftPrepared: true,
        draftFingerprint: agentDraftFingerprint(committed) });
    } catch {
      setError("No se pudo preparar o actualizar el borrador QA. Los cambios podrían estar parcialmente guardados; verifica el CRM antes de reintentar.");
      setSession((previous) => ({ ...previous, operationStarted: false }));
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background px-4 py-6 sm:px-6" data-testid="agent-pilot">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Piloto controlado · No disponible al público</p>
        <h1 className="text-2xl font-semibold">Asistente de promocionales</h1>
        <p className="text-sm text-muted-foreground">Combina productos en una solicitud. Precios, disponibilidad y personalización finales requieren revisión humana.</p>
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
              placeholder="Quiero 50 libretas para un evento corporativo" disabled={busy || session.operationStarted} />
            <Button type="submit" aria-label="Enviar mensaje" disabled={!draft.trim() || busy || session.operationStarted}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <AgentProductLines session={session} setSession={setSession} disabled={busy || session.operationStarted} audience="buyer" />
        </section>
        <aside className="space-y-4">
          <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Tu solicitud</h2>
            <p>Productos activos: {active.length}</p>
            <p>Seleccionados: {selected.length}</p>
            <p>Evento: {session.state.opportunity.eventType ?? "Por confirmar"}</p>
            <p>Ciudad: {session.state.opportunity.deliveryCity ?? "Por confirmar"}</p>
            <p>Personalización: se revisa por producto.</p>
            <p>Precios mostrados antes de IVA; los totales estimados incluyen IVA cuando todas las líneas están cotizables.</p>
          </div>
          {allLinesReady && (!hasSavedDraft || hasUnsavedChanges) && <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">{hasSavedDraft ? "Actualizar borrador QA" : "Preparar solicitud QA"}</h2>
            <p>Se conservará una sola oportunidad y cotización BORRADOR. Solo se admite la identidad QA controlada.</p>
            {(["name", "company", "email", "phone"] as const).map((field) => <label key={field} className="block space-y-1">
              <span>{({ name: "Nombre", company: "Empresa", email: "Correo", phone: "Teléfono" })[field]}</span>
              <Input type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                value={contact[field]} onChange={(event) => setContact({ ...contact, [field]: event.target.value })} disabled={busy} />
            </label>)}
            <Button className="w-full" type="button" onClick={() => void prepare()} disabled={!canPrepare}>
              {hasSavedDraft ? "Actualizar el mismo borrador QA" : "Preparar borrador multilínea para revisión"}
            </Button>
            {!auth.loading && !hasStaffRole && <p className="text-muted-foreground">Para guardar en CRM, un operador con sesión comercial debe validar la solicitud QA.</p>}
          </div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {hasSavedDraft && !hasUnsavedChanges && <p role="status" className="rounded-xl border p-4 text-sm text-green-700">El mismo borrador QA está sincronizado. Sigue en BORRADOR; puedes modificar líneas y actualizarlo.</p>}
          {!allLinesReady && active.length > 0 && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Selecciona y verifica el precio de cada línea para preparar la solicitud.</p>}
        </aside>
      </div>
    </div>
  </main>;
}
