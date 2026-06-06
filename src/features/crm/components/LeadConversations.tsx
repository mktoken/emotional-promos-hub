import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquareText, Inbox, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
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

export function LeadConversations({ leadId }: { leadId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["crm_chat_sessions", leadId],
    queryFn: async () => {
      const { data: sessions, error: sErr } = await supabase
        .from("crm_chat_sessions")
        .select("id, source, status, summary, captured_data, created_at, completed_at")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (sErr) throw sErr;

      const ids = (sessions ?? []).map((s) => s.id);
      let msgsBySession: Record<string, Array<{ role: string; message: string; created_at: string }>> = {};
      if (ids.length > 0) {
        const { data: msgs, error: mErr } = await supabase
          .from("crm_chat_messages")
          .select("session_id, role, message, created_at")
          .in("session_id", ids)
          .order("created_at", { ascending: true });
        if (mErr) throw mErr;
        msgsBySession = (msgs ?? []).reduce<typeof msgsBySession>((acc, m) => {
          (acc[m.session_id] ||= []).push(m);
          return acc;
        }, {});
      }
      return (sessions ?? []).map((s) => ({ ...s, messages: msgsBySession[s.id] ?? [] }));
    },
  });

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
          <p className="text-sm">
            {error instanceof Error ? error.message : "No pudimos cargar las conversaciones."}
          </p>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aún no hay conversaciones</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((s) => (
        <Card key={s.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquareText className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {s.source === "asistente_virtual" ? "Asistente virtual" : s.source}
                </p>
                <p className="text-xs text-muted-foreground">{fmt(s.created_at)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">{s.status}</Badge>
          </div>

          {s.summary && (
            <p className="text-sm whitespace-pre-wrap bg-secondary/50 rounded p-2">{s.summary}</p>
          )}

          {s.captured_data && Object.keys(s.captured_data as object).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Datos capturados
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {Object.entries(s.captured_data as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right break-words">
                      {v === true ? "Sí" : v === false ? "No" : String(v ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {s.messages.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver mensajes ({s.messages.length})
              </summary>
              <div className="mt-2 space-y-1.5 max-h-80 overflow-y-auto">
                {s.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-2 py-1.5 whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      ))}
    </div>
  );
}
