import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";

type LeadInsert = Database["public"]["Tables"]["crm_leads"]["Insert"];
type LeadSource = Database["public"]["Enums"]["lead_source"];
type ClientType = Database["public"]["Enums"]["client_type"];
type BudgetRange = Database["public"]["Enums"]["budget_range"];

const SOURCES: LeadSource[] = [
  "llamada_manual",
  "whatsapp",
  "formulario",
  "referido",
  "evento",
  "directorio",
  "base_propia",
  "google_ads",
  "facebook",
];

const CLIENT_TYPES: ClientType[] = [
  "corporativo",
  "agencia_marketing",
  "pyme",
  "evento_feria",
  "gobierno",
  "educacion",
  "cliente_recurrente",
  "prospecto_frio",
];

const BUDGETS: BudgetRange[] = [
  "menos_10000",
  "10000_30000",
  "30000_75000",
  "75000_150000",
  "mas_150000",
  "por_definir",
];

const schema = z
  .object({
    company_name: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
    contact_name: z.string().trim().max(200).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
    email: z.string().trim().email("Correo inválido").max(255).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    state: z.string().trim().max(120).optional().or(z.literal("")),
    industry: z.string().trim().max(160).optional().or(z.literal("")),
    client_type: z.string().optional().or(z.literal("")),
    product_interest: z.string().trim().max(300).optional().or(z.literal("")),
    budget_range: z.string().optional().or(z.literal("")),
    event_date: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    source: z.string(),
    next_follow_up_at: z.string().optional().or(z.literal("")),
  })
  .refine((v) => !!(v.phone || v.whatsapp || v.email), {
    message: "Debes registrar al menos teléfono, WhatsApp o email.",
    path: ["phone"],
  });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const empty = () => ({
  company_name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  state: "",
  industry: "",
  client_type: "",
  product_interest: "",
  budget_range: "",
  event_date: "",
  notes: "",
  source: "llamada_manual" as LeadSource,
  next_follow_up_at: "",
});

export function ProspectForm({ open, onOpenChange }: Props) {
  const auth = useCrmAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setForm(empty());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!auth.user) {
      setError("Sesión no válida.");
      return;
    }

    setSubmitting(true);
    const v = parsed.data;
    const payload: LeadInsert = {
      company_name: v.company_name,
      contact_name: v.contact_name || null,
      phone: v.phone || null,
      whatsapp: v.whatsapp || null,
      email: (v.email || null) as LeadInsert["email"],
      city: v.city || null,
      state: v.state || null,
      industry: v.industry || null,
      client_type: (v.client_type || null) as LeadInsert["client_type"],
      product_interest: v.product_interest || null,
      budget_range: (v.budget_range || null) as LeadInsert["budget_range"],
      event_date: v.event_date || null,
      notes: v.notes || null,
      source: v.source as LeadSource,
      next_follow_up_at: v.next_follow_up_at ? new Date(v.next_follow_up_at).toISOString() : null,
      assigned_to: auth.user.id,
      created_by: auth.user.id,
    };

    const { data, error: insertError } = await supabase
      .from("crm_leads")
      .insert(payload)
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      const msg = insertError.message.includes("crm_leads_dedupe")
        ? "Ya existe un prospecto con estos datos (teléfono, email o empresa)."
        : insertError.message;
      setError(msg);
      toast.error(msg);
      return;
    }

    toast.success("Prospecto creado");
    qc.invalidateQueries({ queryKey: ["crm_leads"] });
    onOpenChange(false);
    reset();
    if (data?.id) navigate(`/crm/prospectos/${data.id}`);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo prospecto</SheetTitle>
          <SheetDescription>
            Registra los datos básicos. Podrás completar más información después.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
          <Field label="Empresa *" htmlFor="company_name">
            <Input id="company_name" required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </Field>
          <Field label="Contacto" htmlFor="contact_name">
            <Input id="contact_name" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" htmlFor="phone">
              <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" inputMode="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </Field>
          </div>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" htmlFor="city">
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Estado" htmlFor="state">
              <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
          </div>
          <Field label="Giro" htmlFor="industry">
            <Input id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de cliente" htmlFor="client_type">
              <Select value={form.client_type} onValueChange={(v) => set("client_type", v)}>
                <SelectTrigger id="client_type"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Presupuesto" htmlFor="budget_range">
              <Select value={form.budget_range} onValueChange={(v) => set("budget_range", v)}>
                <SelectTrigger id="budget_range"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {BUDGETS.map((b) => <SelectItem key={b} value={b}>{b.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Producto / categoría de interés" htmlFor="product_interest">
            <Input id="product_interest" value={form.product_interest} onChange={(e) => set("product_interest", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de evento" htmlFor="event_date">
              <Input id="event_date" type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </Field>
            <Field label="Próximo seguimiento" htmlFor="next_follow_up_at">
              <Input id="next_follow_up_at" type="datetime-local" value={form.next_follow_up_at} onChange={(e) => set("next_follow_up_at", e.target.value)} />
            </Field>
          </div>
          <Field label="Origen" htmlFor="source">
            <Select value={form.source} onValueChange={(v) => set("source", v as LeadSource)}>
              <SelectTrigger id="source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…</>) : "Guardar prospecto"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
