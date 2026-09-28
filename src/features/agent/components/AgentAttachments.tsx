import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyVisualAnalysis, buildSearchCriteriaFromVisualAnalysis, createCommercialAttachment, linkAttachmentToLines, type CommercialAttachment, type CommercialAttachmentType } from "../lib/agent-attachments";
import { fileToDataUrl, lovableCommercialVisionProcessor } from "../lib/commercial-vision";
import { loadRealProducts } from "../lib/agent-tools";
import { setProductLineCandidates } from "../lib/agent-state";
import type { AgentSession } from "../lib/agent-workflow";

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
          const linkedLines = nextState.productLines.filter((line) => attachment.linkedProductLineIds.includes(line.lineId) && line.quantity !== null && !["removed", "rejected"].includes(line.status));
          const candidatesByLine = await Promise.all(linkedLines.map(async (line) => [line.lineId, await loadRealProducts(`${criteria} ${line.productInterest}`, line.quantity!)] as const));
          const candidateProductIds = candidatesByLine.flatMap(([, products]) => products.map((product) => product.id));
          nextState = { ...nextState,
            attachments: nextState.attachments.map((item) => item.attachmentId === attachment.attachmentId ? { ...item, catalogSearchStatus: candidateProductIds.length ? "completed" as const : "no_results" as const, candidateProductIds, catalogSearchError: undefined } : item),
          };
          for (const [lineId, products] of candidatesByLine) nextState = setProductLineCandidates(nextState, lineId, products);
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
    <div className="space-y-2">{session.state.attachments.map((attachment) => <AttachmentRow key={attachment.attachmentId} attachment={attachment} onAnalyze={() => void analyze(attachment)} onRemove={() => remove(attachment.attachmentId)} />)}</div>
  </div>;
}

function AttachmentRow({ attachment, onAnalyze, onRemove }: { attachment: CommercialAttachment; onAnalyze: () => void; onRemove: () => void }) {
  const [summary, setSummary] = useState(attachment.analysis.summary?.value ?? "");
  return <div className="flex items-start gap-3 rounded-md border p-2">
    {attachment.previewUrl ? <img src={attachment.previewUrl} alt="Vista previa de referencia QA" className="h-12 w-12 rounded object-cover" /> : <Paperclip className="mt-1 h-5 w-5" />}
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{attachment.filename}</p><p className="text-xs text-muted-foreground">{attachment.type} · {attachment.analysisStatus} · {attachment.confidence}</p>
      {attachment.analysisStatus === "pending" && <Button type="button" size="sm" variant="outline" onClick={onAnalyze}>Analizar con IA</Button>}
      {attachment.analysisError && <p className="text-destructive">{attachment.analysisError}</p>}
      {attachment.searchCriteria && <p className="text-xs text-muted-foreground">Criterios de catálogo: {attachment.searchCriteria}</p>}
      {attachment.catalogSearchStatus === "failed" && <p className="text-destructive">El análisis visual quedó conservado; la búsqueda de catálogo requiere reintento.</p>}
      {attachment.catalogSearchStatus === "no_results" && <p className="text-xs text-muted-foreground">No encontré candidatos verificados; solicita una aclaración.</p>}
      <input aria-label={`Resumen de ${attachment.filename}`} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Resultado resumido confirmado por QA" className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${attachment.filename}`} onClick={onRemove}><X className="h-4 w-4" /></Button>
  </div>;
}
