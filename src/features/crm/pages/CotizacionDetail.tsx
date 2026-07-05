import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle,
  Mail,
  Phone,
  Copy,
  Check,
  ShieldAlert,
  Send,
  History,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useCotizacion,
  useCotizacionNotes,
  useCotizacionStatusHistory,
  useCotizacionEmailEvents,
  useStaffProfiles,
  useAsesorProfile,
} from "@/features/crm/hooks/useCotizaciones";
import { useCompanySettings } from "@/features/crm/hooks/useCompanySettings";
import {
  resolveContact,
  buildEmailBody,
  buildGmailUrl,
  buildWaMessage,
  buildWaUrl,
} from "@/features/crm/lib/contact-defaults";
import {
  parseCliente,
  parseArticulos,
  formatDate,
  formatMoney,
  digits,
} from "@/features/crm/lib/cotizacion-format";
import {
  COTIZACION_ESTADOS,
  ESTADO_BADGE,
  ESTADO_LABEL,
  normalizeEstado,
  type CotizacionEstado,
} from "@/features/crm/lib/cotizacion-status";

const STAFF_ROLES = new Set(["admin", "sales_manager", "sales_agent"]);
const MANAGER_ROLES = new Set(["admin", "sales_manager"]);

export default function CotizacionDetail() {
  const { id } = useParams<{ id: string }>();
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF_ROLES.has(r));
  const canReassign = auth.roles.some((r) => MANAGER_ROLES.has(r));

  const cot = useCotizacion(id);
  const notes = useCotizacionNotes(id);
  const history = useCotizacionStatusHistory(id);
  const emails = useCotizacionEmailEvents(id);
  const staff = useStaffProfiles();
  const qc = useQueryClient();

  const [savingEstado, setSavingEstado] = useState(false);
  const [savingAsesor, setSavingAsesor] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [copied, setCopied] = useState(false);

  if (auth.loading || cot.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Necesitas rol de asesor para ver esta cotización.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (cot.error || !cot.data) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No pudimos cargar esta cotización</p>
            <p className="text-sm text-muted-foreground mt-1">
              {cot.error instanceof Error
                ? cot.error.message
                : "Es posible que no exista o no tengas acceso."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/crm/cotizaciones">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const row = cot.data;
  const c = parseCliente(row.datos_cliente);
  const items = parseArticulos(row.articulos_cotizados);
  const est = normalizeEstado(row.estado_cotizacion);
  const wa = digits(c.whatsapp || c.telefono);
  const tel = digits(c.telefono || c.whatsapp);

  const asesorName = (uid: string | null) =>
    uid
      ? (staff.data ?? []).find((s) => s.id === uid)?.full_name ??
        uid.slice(0, 8)
      : "Sin asignar";

  const handleEstado = async (next: CotizacionEstado) => {
    if (next === est) return;
    setSavingEstado(true);
    const { error } = await supabase
      .from("cotizaciones_leads")
      .update({ estado_cotizacion: next })
      .eq("id", row.id);
    setSavingEstado(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ["cotizaciones_leads"] });
    qc.invalidateQueries({ queryKey: ["cotizacion_status_history", row.id] });
  };

  const handleAsesor = async (value: string) => {
    const next = value === "__none__" ? null : value;
    setSavingAsesor(true);
    const { error } = await supabase
      .from("cotizaciones_leads")
      .update({ assigned_to: next })
      .eq("id", row.id);
    setSavingAsesor(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Asesor actualizado");
    qc.invalidateQueries({ queryKey: ["cotizaciones_leads"] });
  };

  const handleAddNote = async () => {
    const trimmed = note.trim();
    if (!trimmed || !auth.user) return;
    setSavingNote(true);
    const { error } = await supabase.from("cotizacion_lead_notes").insert({
      cotizacion_lead_id: row.id,
      note: trimmed,
      user_id: auth.user.id,
    });
    setSavingNote(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote("");
    toast.success("Nota agregada");
    qc.invalidateQueries({ queryKey: ["cotizacion_lead_notes", row.id] });
  };

  const handleCopyEmail = async () => {
    if (!c.email) return;
    try {
      await navigator.clipboard.writeText(c.email);
      setCopied(true);
      toast.success("Email copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const waMessage = encodeURIComponent(
    `Hola ${c.nombre ?? ""}, te contacto de Promocionales Emocionales sobre tu cotización.`,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/crm/cotizaciones" aria-label="Volver a la lista">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {c.nombre ?? "Cotización"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {c.empresa ?? "Sin empresa"} · {formatDate(row.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={ESTADO_BADGE[est]}>{ESTADO_LABEL[est]}</Badge>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          asChild
          variant="outline"
          disabled={!wa}
          className="bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30"
        >
          <a
            href={wa ? `https://wa.me/${wa}?text=${waMessage}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" disabled={!tel} aria-label="Llamar">
          <a href={tel ? `tel:+${tel}` : "#"}>
            <Phone className="w-4 h-4 mr-2" /> Llamar
          </a>
        </Button>
        <Button
          variant="outline"
          disabled={!c.email}
          onClick={() => {
            if (!c.email) return;
            const subject = "Seguimiento a tu solicitud de cotización";
            const body = `Hola ${c.nombre || ""},\n\nGracias por tu solicitud. Te contactamos para dar seguimiento a tu propuesta de promocionales.\n\nSaludos,\n\nPromocionales Emocionales`;
            const url =
              "https://mail.google.com/mail/?view=cm&fs=1" +
              `&to=${encodeURIComponent(c.email)}` +
              `&su=${encodeURIComponent(subject)}` +
              `&body=${encodeURIComponent(body)}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          aria-label="Abrir Gmail"
        >
          <Mail className="w-4 h-4 mr-2" /> Email
        </Button>
        <Button
          variant="outline"
          disabled={!c.email}
          onClick={handleCopyEmail}
          aria-label="Copiar email"
        >
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Copiar email
        </Button>
      </div>

      {/* Acciones staff */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={est}
              onValueChange={(v) => handleEstado(v as CotizacionEstado)}
              disabled={savingEstado}
            >
              <SelectTrigger aria-label="Cambiar estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COTIZACION_ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Asesor asignado</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={row.assigned_to ?? "__none__"}
              onValueChange={handleAsesor}
              disabled={savingAsesor || !canReassign}
            >
              <SelectTrigger aria-label="Asignar asesor">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {(staff.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || s.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canReassign && (
              <p className="text-xs text-muted-foreground mt-2">
                Solo admin o sales_manager pueden reasignar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Datos + Artículos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Nombre" v={c.nombre} />
            <Row k="Empresa" v={c.empresa} />
            <Row k="Email" v={c.email} />
            <Row k="Teléfono" v={c.telefono} />
            <Row k="WhatsApp" v={c.whatsapp} />
            <Row k="Ciudad" v={c.ciudad} />
            {c.notas && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Mensaje</p>
                <p className="whitespace-pre-wrap">{c.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Productos ({items.length})
            </CardTitle>
            <span className="text-sm font-semibold">
              {formatMoney(row.total_estimado)}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin productos.</p>
            )}
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex gap-3 border-b border-border/50 last:border-0 pb-3 last:pb-0"
              >
                {it.imagen_url ? (
                  <img
                    src={it.imagen_url}
                    alt={it.nombre ?? "Producto"}
                    className="w-14 h-14 rounded-md object-contain bg-muted shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted shrink-0 flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {it.nombre ?? "Producto sin nombre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {it.cantidad ?? "?"} × {formatMoney(it.precio_unitario)}
                  </p>
                  {it.personalizacion && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {it.personalizacion}
                    </p>
                  )}
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  {formatMoney(it.subtotal)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas internas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nota">Nueva nota</Label>
            <Textarea
              id="nota"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anota lo que necesites recordar sobre esta cotización…"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddNote}
                disabled={!note.trim() || savingNote}
                size="sm"
              >
                {savingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Agregar nota
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            {notes.isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {!notes.isLoading && (notes.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin notas aún.</p>
            )}
            {(notes.data ?? []).map((n) => (
              <div
                key={n.id}
                className="rounded-md border border-border/60 bg-muted/30 p-3"
              >
                <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {asesorName(n.user_id)} · {formatDate(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historial + Emails */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Historial de estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {!history.isLoading && (history.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
            )}
            {(history.data ?? []).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm border-b border-border/50 last:border-0 py-1.5"
              >
                <div>
                  <span className="text-muted-foreground">
                    {h.old_status ?? "—"}
                  </span>{" "}
                  → <span className="font-medium">{h.new_status}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(h.created_at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" /> Emails enviados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emails.isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {!emails.isLoading && (emails.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin eventos de email.</p>
            )}
            {(emails.data ?? []).map((e) => (
              <div
                key={e.id}
                className="text-sm border-b border-border/50 last:border-0 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{e.email_type}</span>
                  <Badge
                    variant={
                      e.status === "sent" || e.status === "delivered"
                        ? "default"
                        : e.status === "failed" || e.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {e.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {e.recipient_email} · {formatDate(e.sent_at ?? e.created_at)}
                </p>
                {e.error_message && (
                  <p className="text-xs text-destructive mt-0.5">{e.error_message}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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
