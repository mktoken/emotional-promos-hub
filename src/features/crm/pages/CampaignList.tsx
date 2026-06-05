import { Loader2, AlertCircle, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "@/features/crm/hooks/useCampaigns";

export default function CampaignList() {
  const { data, isLoading, error } = useCampaigns();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Campañas</h1>
        <p className="text-sm text-muted-foreground">Vista de solo lectura.</p>
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
              <p className="font-medium">No pudimos cargar las campañas</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Verifica tu acceso."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <Card className="p-10 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Aún no hay campañas registradas</p>
          <p className="text-sm text-muted-foreground">
            Las campañas las crea un administrador.
          </p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base truncate">{c.name}</CardTitle>
                {c.is_active ? <Badge>Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {c.objective && <p className="text-muted-foreground">{c.objective}</p>}
              {c.target_segment && (
                <p>
                  <span className="text-muted-foreground">Segmento: </span>
                  {c.target_segment}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
