import { Link } from "react-router-dom";
import { Loader2, AlertCircle, FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormalQuotes } from "@/features/crm/hooks/useFormalQuotes";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  FORMAL_QUOTE_STATUS_LABEL,
  FORMAL_QUOTE_STATUS_BADGE,
  normalizeFormalStatus,
} from "@/features/crm/lib/formal-quote-status";
import { formatMoney, formatDateMx } from "@/features/crm/lib/formal-quote-calc";

const STAFF = new Set(["admin", "sales_manager", "sales_agent"]);

interface ClienteShape {
  nombre?: string | null;
  empresa?: string | null;
}

export default function FormalQuotesList() {
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF.has(r));
  const q = useFormalQuotes();

  if (auth.loading || q.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <p className="font-medium">Acceso denegado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Necesitas rol de asesor para ver cotizaciones formales.
        </p>
      </Card>
    );
  }

  if (q.error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm">
            {q.error instanceof Error ? q.error.message : "Error cargando cotizaciones."}
          </p>
        </div>
      </Card>
    );
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Cotizaciones formales</h1>
          <p className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "cotización" : "cotizaciones"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/crm/cotizaciones">
            <Plus className="w-4 h-4 mr-2" /> Desde solicitud
          </Link>
        </Button>
      </div>

      {rows.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          Aún no hay cotizaciones formales. Crea una desde una solicitud en
          "Cotizaciones".
        </Card>
      )}

      <div className="grid gap-2">
        {rows.map((r) => {
          const cli = (r.cliente ?? {}) as ClienteShape;
          const status = normalizeFormalStatus(r.status);
          return (
            <Link
              key={r.id}
              to={`/crm/cotizaciones-formales/${r.id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">
                          {r.folio}
                        </span>
                        <Badge variant={FORMAL_QUOTE_STATUS_BADGE[status]}>
                          {FORMAL_QUOTE_STATUS_LABEL[status]}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 truncate">
                        {cli.nombre || "Sin nombre"}
                        {cli.empresa ? ` · ${cli.empresa}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vigencia: {formatDateMx(r.valid_until)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(Number(r.total))}</p>
                      <p className="text-xs text-muted-foreground">
                        IVA {formatMoney(Number(r.tax_amount))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
