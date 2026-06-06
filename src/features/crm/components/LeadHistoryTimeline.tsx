import {
  Phone,
  MessageCircle,
  Mail,
  FileText,
  StickyNote,
  RefreshCw,
  CheckCircle2,
  Send,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeadHistory, type HistoryItem } from "@/features/crm/hooks/useLeadHistory";

const TYPE_LABEL: Record<string, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  reunion: "Reunión",
  seguimiento_cotizacion: "Seguimiento de cotización",
  envio_catalogo: "Envío de catálogo",
  envio_mockup: "Envío de mockup",
  revision_arte: "Revisión de arte",
  seguimiento_pago: "Seguimiento de pago",
  seguimiento_produccion: "Seguimiento de producción",
  seguimiento_entrega: "Seguimiento de entrega",
  recompra: "Recompra",
  nota: "Nota",
};

const OUTCOME_LABEL: Record<string, string> = {
  sin_respuesta: "Sin respuesta",
  interesado: "Interesado",
  no_interesado: "No interesado",
  solicita_cotizacion: "Solicita cotización",
  solicita_muestra: "Solicita muestra",
  solicita_ajuste: "Solicita ajuste",
  aprobado: "Aprobado",
  pospuesto: "Pospuesto",
  perdido: "Perdido",
  ganado: "Ganado",
  no_contesto: "No contestó",
  pidio_informacion: "Pidió información",
  pidio_cotizacion: "Pidió cotización",
  llamar_despues: "Llamar después",
};

function iconFor(item: HistoryItem) {
  if (item.kind === "note") return <StickyNote className="w-4 h-4" />;
  if (item.kind === "log") return <RefreshCw className="w-4 h-4" />;
  switch (item.type) {
    case "llamada":
      return <Phone className="w-4 h-4" />;
    case "whatsapp":
      return <MessageCircle className="w-4 h-4" />;
    case "email":
      return <Mail className="w-4 h-4" />;
    case "envio_catalogo":
      return <Send className="w-4 h-4" />;
    case "seguimiento_cotizacion":
      return <FileText className="w-4 h-4" />;
    default:
      return <CheckCircle2 className="w-4 h-4" />;
  }
}

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export function LeadHistoryTimeline({ leadId }: { leadId: string }) {
  const { data, isLoading, error } = useLeadHistory(leadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">No pudimos cargar el historial</p>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Revisa tu acceso."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aún no hay seguimientos registrados</p>
      </Card>
    );
  }

  return (
    <ol className="relative border-l border-border pl-4 sm:pl-6 space-y-4">
      {data.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[1.4rem] sm:-left-[2rem] top-2 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/30">
            {iconFor(item)}
          </span>
          <Card className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  {TYPE_LABEL[item.type] ?? item.title}
                </p>
                <p className="text-xs text-muted-foreground">{fmt(item.date)}</p>
              </div>
              {item.outcome && (
                <Badge variant="outline" className="text-xs">
                  {OUTCOME_LABEL[item.outcome] ?? item.outcome}
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                {item.description}
              </p>
            )}
            {item.next_follow_up_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Próximo seguimiento: {fmt(item.next_follow_up_at)}
              </p>
            )}
            {item.actor_id && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Agente: {item.actor_id.slice(0, 8)}
              </p>
            )}
          </Card>
        </li>
      ))}
    </ol>
  );
}
