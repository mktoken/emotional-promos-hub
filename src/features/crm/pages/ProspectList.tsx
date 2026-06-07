import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLeads, type CrmLead } from "@/features/crm/hooks/useLeads";
import { ProspectForm } from "@/features/crm/components/ProspectForm";

const STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  contactado: "Contactado",
  interesado: "Interesado",
  no_contesta: "No contesta",
  llamar_despues: "Llamar después",
  no_interesado: "No interesado",
  convertido: "Convertido",
  descartado: "Descartado",
};

const SOURCE_LABEL: Record<string, string> = {
  cotizacion_web: "Cotización web",
  whatsapp: "WhatsApp",
  formulario: "Formulario",
  google_ads: "Google Ads",
  facebook: "Facebook",
  llamada_manual: "Llamada manual",
  csv_import: "Importación",
  referido: "Referido",
  evento: "Evento",
  directorio: "Directorio",
  base_propia: "Base propia",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export default function ProspectList() {
  const { data, isLoading, error } = useLeads();
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prospectos</h1>
          <p className="text-sm text-muted-foreground">
            Solo verás los prospectos que tienes asignados o creaste.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo prospecto
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No pudimos cargar los prospectos</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Verifica tu acceso e intenta nuevamente."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <Card className="p-10 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Aún no hay prospectos</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crea tu primer prospecto para empezar a darle seguimiento.
          </p>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo prospecto
          </Button>
        </Card>
      )}

      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Contacto</th>
                  <th className="px-3 py-2 font-medium">Tel / WhatsApp</th>
                  <th className="px-3 py-2 font-medium">Origen</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Próximo seg.</th>
                  <th className="px-3 py-2 font-medium">Agente</th>
                </tr>
              </thead>
              <tbody>
                {data!.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link to={`/crm/prospectos/${l.id}`} className="text-primary hover:underline font-medium">
                        {l.company_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{l.contact_name ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {l.phone ?? l.whatsapp ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{SOURCE_LABEL[l.source] ?? l.source}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.next_follow_up_at)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {l.assigned_to ? l.assigned_to.slice(0, 8) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data!.map((l) => (
              <ProspectMobileCard key={l.id} lead={l} />
            ))}
          </div>
        </>
      )}

      <ProspectForm open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

function ProspectMobileCard({ lead }: { lead: CrmLead }) {
  return (
    <Link to={`/crm/prospectos/${lead.id}`}>
      <Card className="p-4 hover:border-primary/40 transition">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{lead.company_name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {lead.contact_name ?? "Sin contacto"}
            </p>
          </div>
          <Badge>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{lead.phone ?? lead.whatsapp ?? "—"}</span>
          <span>Seg: {fmtDate(lead.next_follow_up_at)}</span>
        </div>
      </Card>
    </Link>
  );
}
