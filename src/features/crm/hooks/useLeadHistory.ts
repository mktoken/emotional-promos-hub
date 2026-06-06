import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HistoryItemKind = "activity" | "note" | "log";

export interface HistoryItem {
  id: string;
  kind: HistoryItemKind;
  date: string;
  type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  next_follow_up_at: string | null;
  actor_id: string | null;
}

export function useLeadHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ["crm_lead_history", leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<HistoryItem[]> => {
      const [actsRes, notesRes, logsRes] = await Promise.all([
        supabase
          .from("crm_activities")
          .select("id, type, title, description, outcome, completed_at, due_date, created_at, assigned_to, created_by")
          .eq("lead_id", leadId!)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("crm_notes")
          .select("id, note, created_at, created_by")
          .eq("lead_id", leadId!)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("crm_activity_logs")
          .select("id, action, diff, created_at, actor_id, entity_type, entity_id")
          .in("entity_type", ["lead", "crm_leads"])
          .eq("entity_id", leadId!)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const items: HistoryItem[] = [];

      if (!actsRes.error && actsRes.data) {
        for (const a of actsRes.data) {
          items.push({
            id: `act_${a.id}`,
            kind: "activity",
            date: a.completed_at ?? a.created_at,
            type: a.type as string,
            title: a.title ?? "Actividad",
            description: a.description,
            outcome: (a.outcome as string | null) ?? null,
            next_follow_up_at: a.due_date,
            actor_id: a.assigned_to ?? a.created_by ?? null,
          });
        }
      }

      if (!notesRes.error && notesRes.data) {
        for (const n of notesRes.data) {
          items.push({
            id: `note_${n.id}`,
            kind: "note",
            date: n.created_at,
            type: "nota",
            title: "Nota",
            description: n.note,
            outcome: null,
            next_follow_up_at: null,
            actor_id: n.created_by ?? null,
          });
        }
      }

      if (!logsRes.error && logsRes.data) {
        for (const l of logsRes.data) {
          items.push({
            id: `log_${l.id}`,
            kind: "log",
            date: l.created_at,
            type: l.action,
            title: l.action.replace(/_/g, " "),
            description: l.diff && typeof l.diff === "object" ? JSON.stringify(l.diff) : null,
            outcome: null,
            next_follow_up_at: null,
            actor_id: l.actor_id ?? null,
          });
        }
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items;
    },
  });
}
