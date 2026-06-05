import { Link } from "react-router-dom";
import { Users, Megaphone, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/features/crm/hooks/useLeads";
import { useCampaigns } from "@/features/crm/hooks/useCampaigns";

export default function CrmDashboard() {
  const leads = useLeads();
  const campaigns = useCampaigns();

  const totalLeads = leads.data?.length ?? 0;
  const nuevos = leads.data?.filter((l) => l.status === "nuevo" || l.status === "asignado").length ?? 0;
  const seguimientos =
    leads.data?.filter(
      (l) => l.next_follow_up_at && new Date(l.next_follow_up_at) <= new Date(),
    ).length ?? 0;
  const totalCampaigns = campaigns.data?.length ?? 0;

  const loading = leads.isLoading || campaigns.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad comercial.</p>
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
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Prospectos" value={totalLeads} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Nuevos / asignados" value={nuevos} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Seguimientos vencidos" value={seguimientos} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Campañas" value={totalCampaigns} icon={<Megaphone className="w-4 h-4" />} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
