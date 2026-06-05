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
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const STATUSES: LeadStatus[] = [
  "nuevo",
  "asignado",
  "contactado",
  "interesado",
  "no_contesta",
  "llamar_despues",
  "no_interesado",
  "convertido",
  "descartado",
];

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

      {/* Quick actions */}
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
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.user) return;
    setSaving(true);

    const updates: Database["public"]["Tables"]["crm_leads"]["Update"] = {
      status,
      next_follow_up_at: next ? new Date(next).toISOString() : null,
    };

    const { error: upErr } = await supabase.from("crm_leads").update(updates).eq("id", leadId);

    if (upErr) {
      setSaving(false);
      toast.error(upErr.message);
      return;
    }

    if (note.trim()) {
      const { error: actErr } = await supabase.from("crm_activities").insert({
        lead_id: leadId,
        type: "llamada",
        title: "Seguimiento",
        description: note.trim(),
        completed_at: new Date().toISOString(),
        assigned_to: auth.user.id,
        created_by: auth.user.id,
      });
      if (actErr) {
        setSaving(false);
        toast.error(actErr.message);
        return;
      }
    }

    setSaving(false);
    toast.success("Seguimiento registrado");
    qc.invalidateQueries({ queryKey: ["crm_leads"] });
    onOpenChange(false);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar seguimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fu_status">Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
              <SelectTrigger id="fu_status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
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
          <div className="space-y-1.5">
            <Label htmlFor="fu_note">Notas</Label>
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
