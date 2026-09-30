import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyVisualAnalysis, buildSearchCriteriaFromVisualAnalysis, createCommercialAttachment, linkAttachmentToLines, selectVisualCatalogCandidate, type CommercialAttachment, type CommercialAttachmentType } from "../lib/agent-attachments";
import { fileToDataUrl, lovableCommercialVisionProcessor } from "../lib/commercial-vision";
import { loadRealProducts, loadVisualCatalogCandidates } from "../lib/agent-tools";
import { setProductLineCandidates } from "../lib/agent-state";
import { chooseAgentProduct, type AgentSession } from "../lib/agent-workflow";

const types: Array<[CommercialAttachmentType, string]> = [
  ["product_photo", "Foto de producto"], ["product_screenshot", "Screenshot de producto"], ["inspiration_image", "Inspiración"],
  ["logo", "Logo"], ["artwork", "Arte"], ["competitor_quote", "Referencia competidora"], ["other_commercial_document", "Otro documento"],
];

export function AgentAttachments({ session, setSession, disabled = false }: { session: AgentSession; setSession: (session: AgentSession) => void; disabled?: boolean }) {
  const [type, setType] = useState<CommercialAttachmentType>("product_photo");
  const [error, setError] = useState<string | null>(null);
  const files = useRef<Record<string, File>>({});
  function add(file: File) {
    const attachment = createCommercialAttachment({ name: file.name, type: file.type, size: file.size }, type);
    if (attachment.analysisStatus === "rejected") { setError("Archivo rechazado: formato, tamaño o nombre no válido."); return; }
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const lineIds = session.state.productLines.filter((line) => !["removed", "rejected"].includes(line.status)).map((line) => line.lineId);
    const linked = linkAttachmentToLines({ ...attachment, previewUrl }, lineIds);
    files.current[linked.attachmentId] = file;
    setSession({ ...session, state: { ...session.state, attachments: [...session.state.attachments, linked] } });
    setError(null);
  }
  function remove(attachmentId: string) {
    delete files.current[attachmentId];
    setSession({ ...session, state: { ...session.state, attachments: session.state.attachments.filter((item) => item.attachmentId !== attachmentId) } });
  }
  function selectVisualCandidate(attachment: CommercialAttachment, candidateId: string) {
    const selected = selectVisualCatalogCandidate(attachment, candidateId);
    if (selected === attachment) return;
    setSession({ ...session, state: { ...session.state, attachments: session.state.attachments.map((item) =>
      item.attachmentId === attachment.attachmentId ? selected : item) } });
  }
  async function analyze(attachment: CommercialAttachment) {
    const file = files.current[attachment.attachmentId];
    if (!file) { setError("El archivo ya no está disponible en esta sesión; vuelve a adjuntarlo."); return; }
    if (attachment.visualAnalysis && attachment.analysisStatus !== "failed") return;
    setSession({ ...session, state: { ...session.state, attachments: session.state.attachments.map((item) => item.attachmentId === attachment.attachmentId ? { ...item, analysisStatus: "analyzing" as const, analysisError: undefined } : item) } });
    try {
      const result = await lovableCommercialVisionProcessor.analyzeCommercialImage({ attachment, dataUrl: await fileToDataUrl(file), commercialContext: { lineIds: attachment.linkedProductLineIds } });
      const analyzed = applyVisualAnalysis(attachment, result);
      const criteria = buildSearchCriteriaFromVisualAnalysis(result);
      let nextState = { ...session.state, attachments: session.state.attachments.map((item) => item.attachmentId === attachment.attachmentId ? analyzed : item) };
      if (criteria) {
        try {
          const activeLine = nextState.productLines.find((line) => line.lineId === nextState.activeProductLineId
            && !["removed", "rejected"].includes(line.status));
          const quantity = activeLine?.quantity ?? null;
          if (quantity === null) {
            const visualCandidates = await loadVisualCatalogCandidates(criteria);
            const candidateProductIds = visualCandidates.map((product) => product.productId);
            nextState = { ...nextState, attachments: nextState.attachments.map((item) => item.attachmentId === attachment.attachmentId
              ? { ...item, catalogSearchStatus: candidateProductIds.length ? "completed" as const : "no_results" as const,
                candidateProductIds, catalogCandidates: undefined, visualCandidates, selectedVisualCandidateId: undefined, catalogSearchError: undefined }
              : item) };
          } else {
            const catalogCandidates = await loadRealProducts(criteria, quantity);
            const candidateProductIds = catalogCandidates.map((product) => product.id);
            nextState = { ...nextState, attachments: nextState.attachments.map((item) => item.attachmentId === attachment.attachmentId
              ? { ...item, catalogSearchStatus: candidateProductIds.length ? "completed" as const : "no_results" as const,
                candidateProductIds, catalogCandidates, visualCandidates: undefined, selectedVisualCandidateId: undefined, catalogSearchError: undefined }
              : item) };
          }
        } catch (cause) {
          nextState = { ...nextState,
            attachments: nextState.attachments.map((item) => item.attachmentId === attachment.attachmentId ? { ...item, catalogSearchStatus: "failed" as const, catalogSearchError: cause instanceof Error ? cause.message : "No se pudo consultar el catálogo." } : item),
          };
        }
      }
      setSession({ ...session, state: nextState });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo analizar la imagen.";
      setSession({ ...session, state: { ...session.state, attachments: session.state.attachments.map((item) => item.attachmentId === attachment.attachmentId ? { ...item, analysisStatus: "failed" as const, analysisError: message } : item) } });
    }
  }
  return <div className="space-y-3 rounded-xl border bg-card p-4 text-sm" data-testid="agent-attachments">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Referencias visuales</h2><span className="text-xs text-muted-foreground">QA · máximo 10 MB</span></div>
    <p className="text-xs text-muted-foreground">La imagen no sustituye catálogo, precio, stock ni revisión técnica. Las observaciones visuales deben confirmarse.</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Tipo de archivo" value={type} onChange={(event) => setType(event.target.value as CommercialAttachmentType)} disabled={disabled} className="rounded-md border bg-background px-2 py-1">
        {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 hover:bg-muted">
        <Paperclip className="h-4 w-4" /> Adjuntar
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) add(file); event.currentTarget.value = ""; }} />
      </label>
    </div>
    {error && <p className="text-destructive" role="alert">{error}</p>}
    {!session.state.attachments.length && <p className="text-muted-foreground">Sin archivos adjuntos.</p>}
    <div className="space-y-2">{session.state.attachments.map((attachment) => <AttachmentRow key={attachment.attachmentId} attachment={attachment} onAnalyze={() => void analyze(attachment)} onSelectVisualCandidate={(candidateId) => selectVisualCandidate(attachment, candidateId)} onSelectCandidate={(candidateId) => {
      const line = session.state.productLines.find((item) => item.lineId === session.state.activeProductLineId && !["removed", "rejected"].includes(item.status))
        ?? session.state.productLines.find((item) => !["removed", "rejected"].includes(item.status));
      if (!line || !attachment.catalogCandidates) return;
      const withCandidates = setProductLineCandidates(session.state, line.lineId, attachment.catalogCandidates);
      const selectedSession = chooseAgentProduct({ ...session, state: withCandidates }, candidateId, line.lineId);
      setSession({ ...selectedSession, state: { ...selectedSession.state, attachments: selectedSession.state.attachments.map((item) => item.attachmentId === attachment.attachmentId ? { ...item, linkedProductLineIds: [line.lineId] } : item) } });
    }} onRemove={() => remove(attachment.attachmentId)} />)}</div>
  </div>;
}

function AttachmentRow({ attachment, onAnalyze, onSelectCandidate, onSelectVisualCandidate, onRemove }: { attachment: CommercialAttachment; onAnalyze: () => void; onSelectCandidate: (candidateId: string) => void; onSelectVisualCandidate: (candidateId: string) => void; onRemove: () => void }) {
  const [summary, setSummary] = useState(attachment.analysis.summary?.value ?? "");
  return <div className="flex items-start gap-3 rounded-md border p-2">
    {attachment.previewUrl ? <img src={attachment.previewUrl} alt="Vista previa de referencia QA" className="h-12 w-12 rounded object-cover" /> : <Paperclip className="mt-1 h-5 w-5" />}
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{attachment.filename}</p><p className="text-xs text-muted-foreground">{attachment.type} · {attachment.analysisStatus} · {attachment.confidence}</p>
      {attachment.analysisStatus === "pending" && <Button type="button" size="sm" variant="outline" onClick={onAnalyze}>Analizar con IA</Button>}
      {attachment.analysisError && <p className="text-destructive">{attachment.analysisError}</p>}
      {attachment.searchCriteria && <p className="text-xs text-muted-foreground">Criterios de catálogo: {attachment.searchCriteria}</p>}
      {attachment.catalogSearchStatus === "failed" && <p className="text-destructive">El análisis visual quedó conservado; la búsqueda de catálogo requiere reintento.</p>}
      {attachment.catalogSearchStatus === "no_results" && <p className="text-xs text-muted-foreground">No encontré candidatos verificados; solicita una aclaración.</p>}
      {attachment.visualCandidates?.length ? <div className="mt-2 space-y-2"><p className="text-xs font-medium">Referencias reales del catálogo. Selecciona una; precio y suficiencia de stock requieren una cantidad.</p>{attachment.visualCandidates.slice(0, 6).map((candidate) => <div key={candidate.productId} className="rounded border p-2 text-xs">
        {candidate.imageUrl ? <img src={candidate.imageUrl} alt={`Imagen de ${candidate.name}`} className="mb-2 h-16 w-16 rounded object-cover" /> : null}
        <p className="font-medium">{candidate.name}</p><p>SKU: {candidate.sku ?? "No informado"}</p>
        {candidate.description ? <p>{candidate.description}</p> : null}
        {candidate.minimumQuantity !== null ? <p>Pedido mínimo del catálogo: {candidate.minimumQuantity} piezas</p> : <p>Pedido mínimo: por confirmar</p>}
        <p>Precio pendiente de cantidad · stock para cantidad no verificado</p>
        <Button type="button" size="sm" variant="outline" onClick={() => onSelectVisualCandidate(candidate.productId)}>
          {attachment.selectedVisualCandidateId === candidate.productId ? "Referencia seleccionada" : "Seleccionar referencia"}
        </Button>
        {attachment.selectedVisualCandidateId === candidate.productId ? <p role="status">Referencia elegida. Indica la cantidad (por ejemplo, “50 piezas”) para validar MOQ, precio y stock.</p> : null}
      </div>)}</div> : null}
      {attachment.catalogCandidates?.length ? <div className="mt-2 space-y-2"><p className="text-xs font-medium">Opciones parecidas del catálogo; selecciona una para asociarla a la línea activa.</p>{attachment.catalogCandidates.slice(0, 6).map((candidate) => <div key={candidate.id} className="rounded border p-2 text-xs"><p className="font-medium">{candidate.name}</p><p>SKU: {candidate.sku ?? "No informado"} · {candidate.price.status}</p><p>{candidate.stockStatus === "observed" ? `Stock observado: ${candidate.observedStock}` : "Stock no observado"}</p><Button type="button" size="sm" variant="outline" onClick={() => onSelectCandidate(candidate.id)}>Seleccionar candidato visual</Button></div>)}</div> : null}
      <input aria-label={`Resumen de ${attachment.filename}`} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Resultado resumido confirmado por QA" className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${attachment.filename}`} onClick={onRemove}><X className="h-4 w-4" /></Button>
  </div>;
}
