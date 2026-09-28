import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { AgentProductLines } from "../components/AgentProductLines";
import { AgentAttachments } from "../components/AgentAttachments";
import { commitQaOperation, QA_CONTACT } from "../lib/agent-crm";
import { selectedLineProduct, selectedProductLines } from "../lib/agent-state";
import { advanceAgent, agentDraftFingerprint, migrateAgentSession, newAgentSession, type AgentSession } from "../lib/agent-workflow";
import { qaCommercialContext } from "../lib/agent-intelligence";

const STORAGE_KEY = "pe-agent-qa-session-v1";
function readSession(): AgentSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = migrateAgentSession(JSON.parse(raw));
      if (parsed) {
        const intelligence = qaCommercialContext();
        return { ...parsed, state: { ...parsed.state, ...intelligence } };
      }
    }
  } catch { /* sesión nueva */ }
  return newAgentSession(undefined, qaCommercialContext());
}

export default function AgentQaPage() {
  const auth = useCrmAuth();
  const [session, setSession] = useState<AgentSession>(readSession);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaConfirmed, setQaConfirmed] = useState(false);

  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }, [session]);

  if (auth.loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (!auth.roles.some((role) => ["admin", "sales_manager", "sales_agent"].includes(role))) {
    return <p className="p-6">Se requiere rol comercial para la prueba QA.</p>;
  }

  const state = session.state;
  const active = state.productLines.filter((line) => !["removed", "rejected"].includes(line.status));
  const selected = selectedProductLines(state);
  const completed = session.draftPrepared === true || Boolean(state.crm.draftQuoteId);
  const hasUnsavedChanges = !session.draftFingerprint || session.draftFingerprint !== agentDraftFingerprint(state);
  const allReady = active.length > 0 && selected.length === active.length && selected.every((line) => {
    const product = selectedLineProduct(line);
    return line.status === "selected" && product?.price.status === "priced" && product.price.isValidQuantity;
  });

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy || session.operationStarted) return;
    setBusy(true); setError(null); setDraft("");
    try {
      const result = await advanceAgent(session, text);
      if (result.searchFailed) setError("No se pudo consultar esa línea del catálogo. Las demás se conservaron; reintenta cuando esté disponible.");
      setSession(result.session);
    } finally { setBusy(false); }
  }

  async function saveQa() {
    if (!qaConfirmed || !allReady || busy || session.operationStarted || (completed && !hasUnsavedChanges)) return;
    setBusy(true); setError(null);
    const frozenSession = { ...session, operationStarted: true };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(frozenSession));
    setSession(frozenSession);
    try {
      const result = await commitQaOperation(state);
      const committed = { ...state, crm: result,
        trace: [...state.trace, { tool: "commit_qa_operation", ok: true, timestamp: new Date().toISOString() }] };
      setSession({ ...frozenSession, state: committed, operationStarted: false, draftPrepared: true,
        draftFingerprint: agentDraftFingerprint(committed) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se completó la operación QA. Revisa antes de reintentar.");
      setSession((previous) => ({ ...previous, operationStarted: false }));
    } finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-5">
    <div>
      <h1 className="text-2xl font-bold">Super Agente Web — QA controlada</h1>
      <p className="text-sm text-muted-foreground">Sesión QA de productos múltiples. La operación termina en una sola oportunidad y una cotización BORRADOR para revisión humana.</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-4">
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border bg-card p-4" aria-live="polite">
          {session.messages.map((msg, index) => <p key={index} className={`rounded-lg p-2 text-sm ${msg.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"}`}>
            <strong>{msg.role === "user" ? "Cliente QA" : "Agente"}:</strong> {msg.text}
          </p>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2">
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Quiero 50 libretas para un evento corporativo"
            disabled={busy || session.operationStarted} aria-label="Mensaje" />
          <Button type="submit" aria-label="Enviar mensaje" disabled={!draft.trim() || busy || session.operationStarted}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
        <AgentProductLines session={session} setSession={setSession} disabled={busy || session.operationStarted} audience="advisor" />
        <AgentAttachments session={session} setSession={setSession} disabled={busy || session.operationStarted} />
      </section>
      <aside className="space-y-4">
        <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Operación QA para revisión</h2>
          <p>Cliente: {QA_CONTACT.name} · {QA_CONTACT.email}</p>
          <p>Empresa: {QA_CONTACT.company}</p>
          <p>Sector Intelligence: {state.sectorPlaybook?.sector ?? "No cargado"} · confianza {state.sectorContext?.confidence ?? "—"}</p>
          <p>Company Intelligence: {state.companyProfile?.companyName ?? "Perfil mínimo"} · {state.companyProfile ? "reutilizable" : "no cargado"}</p>
          <p>Evento: {state.opportunity.eventType ?? "Por confirmar"}</p>
          <p>Fecha: {state.opportunity.eventDate ?? "Por confirmar"}</p>
          <p>Ciudad: {state.opportunity.deliveryCity ?? "Por confirmar"}</p>
          <p>Presupuesto: {state.opportunity.budgetTotal ?? "Por confirmar"}</p>
          <p>Líneas activas: {active.length} · seleccionadas: {selected.length}</p>
          <p>Personalización e impresión: estado propio por línea; cualquier técnica/costo queda para revisión humana.</p>
          <p>Siguiente acción: asesor revisa productos, precios V2, stock observado y borrador.</p>
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <label className="flex items-start gap-2"><input type="checkbox" checked={qaConfirmed} onChange={(event) => setQaConfirmed(event.target.checked)} />
            Confirmo que esta prueba usa solo identidades QA y preparará una sola oportunidad y una cotización borrador QA.</label>
          {(allReady && (!completed || hasUnsavedChanges)) && <Button className="w-full" onClick={() => void saveQa()} disabled={!qaConfirmed || !allReady || busy || session.operationStarted}>
            <ShieldCheck className="mr-2 h-4 w-4" /> {completed ? "Actualizar el mismo borrador QA" : "Preparar operación QA multilínea"}
          </Button>}
          {error && <p className="text-destructive" role="alert">{error}</p>}
          {state.crm.prospectId && <p>Prospecto QA: <Link className="underline" to={`/crm/prospectos/${state.crm.prospectId}`}>{state.crm.prospectId}</Link></p>}
          {state.crm.opportunityId && <p>Oportunidad QA: <Link className="underline" to={`/crm/cotizaciones/${state.crm.opportunityId}`}>{state.crm.opportunityId}</Link></p>}
          {state.crm.draftQuoteId && <p>Borrador QA: <Link className="underline" to={`/crm/cotizaciones-formales/${state.crm.draftQuoteId}`}>{state.crm.draftQuoteId}</Link></p>}
          {completed && !hasUnsavedChanges && <p role="status" className="font-semibold text-green-700">El mismo borrador QA está sincronizado. Permanece BORRADOR; no emitida ni enviada.</p>}
          {!allReady && active.length > 0 && <p className="text-muted-foreground">Selecciona una opción con precio V2 válido para cada producto activo.</p>}
        </div>
      </aside>
    </div>
  </div>;
}
