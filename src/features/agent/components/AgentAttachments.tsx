import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCommercialAttachment, linkAttachmentToLines, type CommercialAttachment, type CommercialAttachmentType } from "../lib/agent-attachments";
import type { AgentSession } from "../lib/agent-workflow";

const types: Array<[CommercialAttachmentType, string]> = [
  ["product_photo", "Foto de producto"], ["product_screenshot", "Screenshot de producto"], ["inspiration_image", "Inspiración"],
  ["logo", "Logo"], ["artwork", "Arte"], ["competitor_quote", "Referencia competidora"], ["other_commercial_document", "Otro documento"],
];

export function AgentAttachments({ session, setSession, disabled = false }: { session: AgentSession; setSession: (session: AgentSession) => void; disabled?: boolean }) {
  const [type, setType] = useState<CommercialAttachmentType>("product_photo");
  const [error, setError] = useState<string | null>(null);
  function add(file: File) {
    const attachment = createCommercialAttachment({ name: file.name, type: file.type, size: file.size }, type);
    if (attachment.analysisStatus === "rejected") { setError("Archivo rechazado: formato, tamaño o nombre no válido."); return; }
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const lineIds = session.state.productLines.filter((line) => !["removed", "rejected"].includes(line.status)).map((line) => line.lineId);
    const linked = linkAttachmentToLines({ ...attachment, previewUrl }, lineIds);
    setSession({ ...session, state: { ...session.state, attachments: [...session.state.attachments, linked] } });
    setError(null);
  }
  function remove(attachmentId: string) {
    setSession({ ...session, state: { ...session.state, attachments: session.state.attachments.filter((item) => item.attachmentId !== attachmentId) } });
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
    <div className="space-y-2">{session.state.attachments.map((attachment) => <AttachmentRow key={attachment.attachmentId} attachment={attachment} onRemove={() => remove(attachment.attachmentId)} />)}</div>
  </div>;
}

function AttachmentRow({ attachment, onRemove }: { attachment: CommercialAttachment; onRemove: () => void }) {
  const [summary, setSummary] = useState(attachment.analysis.summary?.value ?? "");
  return <div className="flex items-start gap-3 rounded-md border p-2">
    {attachment.previewUrl ? <img src={attachment.previewUrl} alt="Vista previa de referencia QA" className="h-12 w-12 rounded object-cover" /> : <Paperclip className="mt-1 h-5 w-5" />}
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{attachment.filename}</p><p className="text-xs text-muted-foreground">{attachment.type} · {attachment.analysisStatus} · {attachment.confidence}</p>
      <input aria-label={`Resumen de ${attachment.filename}`} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Resultado resumido confirmado por QA" className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs" />
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${attachment.filename}`} onClick={onRemove}><X className="h-4 w-4" /></Button>
  </div>;
}
