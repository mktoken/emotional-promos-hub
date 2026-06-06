import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLead } from "@/features/crm/hooks/useLeads";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { LeadHistoryTimeline } from "@/features/crm/components/LeadHistoryTimeline";
import { LeadConversations } from "@/features/crm/components/LeadConversations";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type ActivityType = Database["public"]["Enums"]["activity_type"];
type ActivityOutcome = Database["public"]["Enums"]["activity_outcome"];
type ActivityPriority = Database["public"]["Enums"]["activity_priority"];

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "seguimiento_cotizacion", label: "Seguimiento de cotización" },
  { value: "envio_catalogo", label: "Envío de catálogo" },
];

const OUTCOMES: { value: ActivityOutcome; label: string }[] = [
  { value: "no_contesto", label: "No contestó" },
  { value: "interesado", label: "Interesado" },
  { value: "pidio_informacion", label: "Pidió información" },
  { value: "pidio_cotizacion", label: "Pidió cotización" },
  { value: "llamar_despues", label: "Llamar después" },
  { value: "no_interesado", label: "No interesado" },
];

const PRIORITIES: { value: ActivityPriority; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

// Mapea resultado de actividad → estado del lead
const OUTCOME_TO_STATUS: Partial<Record<ActivityOutcome, LeadStatus>> = {
  no_contesto: "no_contesta",
  interesado: "interesado",
  pidio_informacion: "contactado",
  pidio_cotizacion: "interesado",
  llamar_despues: "llamar_despues",
  no_interesado: "no_interesado",
};

function digits(s: string | null | undefined) {
  return (s ?? "").replace(/\D+/g, "");
}

export default function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading, error } = useLead(id);
  const [openFollow, setOpenFollow] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No pudimos cargar este prospecto</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Es posible que no tengas acceso."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/crm/prospectos">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const waNumber = digits(lead.whatsapp || lead.phone);
  const phoneNumber = digits(lead.phone || lead.whatsapp);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/crm/prospectos" aria-label="Volver a la lista">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{lead.company_name}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {lead.contact_name ?? "Sin contacto"}
            </p>
          </div>
        </div>
        <Badge>{lead.status}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          asChild
          variant="outline"
          disabled={!waNumber}
          className="bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30"
        >
          <a
            href={waNumber ? `https://wa.me/${waNumber}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" disabled={!phoneNumber} aria-label="Llamar">
          <a href={phoneNumber ? `tel:+${phoneNumber}` : "#"}>
            <Phone className="w-4 h-4 mr-2" /> Llamar
          </a>
        </Button>
        <Button asChild variant="outline" disabled={!lead.email} aria-label="Enviar email">
          <a href={lead.email ? `mailto:${lead.email}` : "#"}>
            <Mail className="w-4 h-4 mr-2" /> Email
          </a>
        </Button>
        <Button onClick={() => setOpenFollow(true)} aria-label="Registrar seguimiento">
          <CheckCircle2 className="w-4 h-4 mr-2" /> Seguimiento
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="conversaciones">Conversaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row k="Empresa" v={lead.company_name} />
                <Row k="Contacto" v={lead.contact_name} />
                <Row k="Teléfono" v={lead.phone} />
                <Row k="WhatsApp" v={lead.whatsapp} />
                <Row k="Email" v={lead.email} />
                <Row k="Ciudad" v={lead.city} />
                <Row k="Estado" v={lead.state} />
                <Row k="Giro" v={lead.industry} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row k="Producto de interés" v={lead.product_interest} />
                <Row k="Presupuesto" v={lead.budget_range} />
                <Row k="Fecha de evento" v={lead.event_date} />
                <Row k="Origen" v={lead.source} />
                <Row k="Estado" v={lead.status} />
                <Row k="Próximo seguimiento" v={lead.next_follow_up_at} />
                <Row k="Último contacto" v={lead.last_contacted_at} />
              </CardContent>
            </Card>
          </div>

          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <LeadHistoryTimeline leadId={lead.id} />
        </TabsContent>

        <TabsContent value="conversaciones" className="mt-4">
          <LeadConversations leadId={lead.id} />
        </TabsContent>
      </Tabs>

      <FollowUpDialog
        open={openFollow}
        onOpenChange={setOpenFollow}
        leadId={lead.id}
        currentStatus={lead.status as LeadStatus}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 last:border-0 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right break-words">{v ?? "—"}</span>
    </div>
  );
}

function FollowUpDialog({
  open,
  onOpenChange,
  leadId,
  currentStatus,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const auth = useCrmAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<ActivityType>("llamada");
  const [outcome, setOutcome] = useState<ActivityOutcome | "">("");
  const [priority, setPriority] = useState<ActivityPriority>("media");
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.user) return;
    setSaving(true);

    const nowIso = new Date().toISOString();
    const nextIso = next ? new Date(next).toISOString() : null;
    const newStatus: LeadStatus = outcome
      ? OUTCOME_TO_STATUS[outcome as ActivityOutcome] ?? currentStatus
      : currentStatus;

    // 1) Intentar RPC si existe (best-effort)
    let usedRpc = false;
    try {
      // @ts-expect-error RPC opcional, puede no existir en tipos
      const { error: rpcErr } = await supabase.rpc("register_lead_activity_result", {
        p_lead_id: leadId,
        p_type: type,
        p_outcome: outcome || null,
        p_priority: priority,
        p_note: note.trim() || null,
        p_next_follow_up_at: nextIso,
      });
      if (!rpcErr) usedRpc = true;
    } catch {
      // Silencioso: caemos al flujo manual
    }

    if (!usedRpc) {
      const { error: actErr } = await supabase.from("crm_activities").insert({
        lead_id: leadId,
        type,
        title: ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? "Seguimiento",
        description: note.trim() || null,
        outcome: outcome || null,
        priority,
        completed_at: nowIso,
        due_date: nextIso,
        assigned_to: auth.user.id,
        created_by: auth.user.id,
      });

      if (actErr) {
        setSaving(false);
        toast.error(actErr.message);
        return;
      }

      const { error: upErr } = await supabase
        .from("crm_leads")
        .update({
          status: newStatus,
          next_follow_up_at: nextIso,
          last_contacted_at: nowIso,
        })
        .eq("id", leadId);

      if (upErr) {
        setSaving(false);
        toast.error(upErr.message);
        return;
      }
    }

    setSaving(false);
    toast.success("Seguimiento registrado");
    qc.invalidateQueries({ queryKey: ["crm_leads"] });
    qc.invalidateQueries({ queryKey: ["crm_lead_history", leadId] });
    onOpenChange(false);
    setNote("");
    setOutcome("");
    setNext("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar seguimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fu_type">Tipo de actividad</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger id="fu_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu_outcome">Resultado</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as ActivityOutcome)}>
                <SelectTrigger id="fu_outcome">
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu_priority">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ActivityPriority)}>
                <SelectTrigger id="fu_priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu_next">Próximo seguimiento</Label>
              <Input
                id="fu_next"
                type="datetime-local"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu_note">Nota</Label>
            <Textarea
              id="fu_note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="¿Qué pasó en este contacto?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…</>) : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
