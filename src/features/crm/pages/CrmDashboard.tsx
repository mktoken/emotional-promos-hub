import { Link } from "react-router-dom";
import {
  Users,
  Megaphone,
  Plus,
  Loader2,
  AlertCircle,
  CalendarClock,
  AlertTriangle,
  Inbox,
  Star,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLeads, type CrmLead } from "@/features/crm/hooks/useLeads";
import { useCampaigns } from "@/features/crm/hooks/useCampaigns";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function CrmDashboard() {
  const leads = useLeads();
  const campaigns = useCampaigns();

  const list = leads.data ?? [];
  const now = new Date();
  const sod = startOfToday();
  const eod = endOfToday();

  const vencidos = list.filter(
    (l) => l.next_follow_up_at && new Date(l.next_follow_up_at) < sod,
  );
  const hoy = list.filter(
    (l) =>
      l.next_follow_up_at &&
      new Date(l.next_follow_up_at) >= sod &&
      new Date(l.next_follow_up_at) <= eod,
  );
  const nuevos = list.filter(
    (l) => (l.status === "nuevo" || l.status === "asignado") && !l.last_contacted_at,
  );
  const interesados = list.filter((l) => l.status === "interesado");
  const pidieronCotizacion = list.filter((l) =>
    (l.notes ?? "").toLowerCase().includes("cotiz"),
  );
  const proximos = list
    .filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at) > now)
    .sort(
      (a, b) =>
        new Date(a.next_follow_up_at!).getTime() -
        new Date(b.next_follow_up_at!).getTime(),
    )
    .slice(0, 10);

  const loading = leads.isLoading || campaigns.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Tu cola de trabajo de hoy.</p>
        </div>
        <Button asChild>
          <Link to="/crm/prospectos">
            <Plus className="w-4 h-4 mr-2" /> Nuevo prospecto
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : leads.error ? (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No pudimos cargar tu cola</p>
              <p className="text-sm text-muted-foreground mt-1">
                {leads.error instanceof Error
                  ? leads.error.message
                  : "Revisa tu acceso."}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Vencidos"
              value={vencidos.length}
              icon={<AlertTriangle className="w-4 h-4" />}
              accent
            />
            <StatCard
              label="Para hoy"
              value={hoy.length}
              icon={<CalendarClock className="w-4 h-4" />}
            />
            <StatCard
              label="Nuevos sin contactar"
              value={nuevos.length}
              icon={<Inbox className="w-4 h-4" />}
            />
            <StatCard
              label="Interesados"
              value={interesados.length}
              icon={<Star className="w-4 h-4" />}
            />
            <StatCard
              label="Pidieron cotización"
              value={pidieronCotizacion.length}
              icon={<FileText className="w-4 h-4" />}
            />
            <StatCard
              label="Campañas"
              value={campaigns.data?.length ?? 0}
              icon={<Megaphone className="w-4 h-4" />}
            />
            <StatCard
              label="Total asignados"
              value={list.length}
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <QueueList
              title="Seguimientos vencidos"
              icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
              leads={vencidos}
              emptyText="Sin vencidos. ¡Bien hecho!"
              showDate
            />
            <QueueList
              title="Seguimientos de hoy"
              icon={<CalendarClock className="w-4 h-4 text-primary" />}
              leads={hoy}
              emptyText="No hay seguimientos programados para hoy."
              showDate
            />
            <QueueList
              title="Nuevos sin contactar"
              icon={<Inbox className="w-4 h-4 text-primary" />}
              leads={nuevos}
              emptyText="Todos los nuevos han sido contactados."
            />
            <QueueList
              title="Interesados"
              icon={<Star className="w-4 h-4 text-primary" />}
              leads={interesados}
              emptyText="Aún no hay prospectos interesados."
            />
            <QueueList
              title="Pidieron cotización"
              icon={<FileText className="w-4 h-4 text-primary" />}
              leads={pidieronCotizacion}
              emptyText="No hay solicitudes registradas en notas."
            />
            <QueueList
              title="Próximos seguimientos"
              icon={<CalendarClock className="w-4 h-4 text-primary" />}
              leads={proximos}
              emptyText="No tienes seguimientos próximos."
              showDate
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent && value > 0 ? "border-destructive/40" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <span className={accent && value > 0 ? "text-destructive" : "text-primary"}>
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function QueueList({
  title,
  icon,
  leads,
  emptyText,
  showDate,
}: {
  title: string;
  icon: React.ReactNode;
  leads: CrmLead[];
  emptyText: string;
  showDate?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon} {title}
          <Badge variant="outline" className="ml-auto">
            {leads.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {leads.slice(0, 8).map((l) => (
              <li key={l.id}>
                <Link
                  to={`/crm/prospectos/${l.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:text-primary group focus-visible:outline-none focus-visible:text-primary"
                  aria-label={`Ir al prospecto ${l.company_name}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.contact_name ?? "Sin contacto"}
                      {showDate && l.next_follow_up_at
                        ? ` · ${fmt(l.next_follow_up_at)}`
                        : ""}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              </li>
            ))}
            {leads.length > 8 && (
              <li className="pt-2">
                <Link
                  to="/crm/prospectos"
                  className="text-xs text-primary hover:underline"
                >
                  Ver todos ({leads.length})
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
