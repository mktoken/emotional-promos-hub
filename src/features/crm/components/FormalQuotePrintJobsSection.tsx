// Sección temporal/experimental para el nuevo modelo de trabajos de impresión.
// USO INTERNO DEL CRM. No exponer al cliente (PDF/email).
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFormalQuotePrintJobs } from "@/features/crm/hooks/useFormalQuotePrintJobs";
import {
  validatePrintJob,
  type PrintJobPricingStatus,
} from "@/features/crm/lib/formal-quote-validation";
import type { FormalQuotePrintJob } from "@/features/crm/lib/formal-quote-print-jobs";

interface Props {
  formalQuoteId: string;
  disabled?: boolean;
}

export function FormalQuotePrintJobsSection({ formalQuoteId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const api = useFormalQuotePrintJobs(formalQuoteId);
  const jobs = api.jobs.data ?? [];
  const components = api.components.data ?? [];

  const handleCreate = async () => {
    try {
      await api.createJob.mutateAsync({
        position: jobs.length,
        job_label: `Trabajo de impresión ${jobs.length + 1}`,
      });
      toast.success("Trabajo de impresión creado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el trabajo");
    }
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                Trabajos de impresión — nuevo modelo
                <Badge variant="outline">experimental · interno</Badge>
                <Badge variant="secondary">{jobs.length}</Badge>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Datos internos. Nunca se muestran al cliente en PDF ni email.
            </p>

            {api.jobs.isLoading && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Cargando trabajos…
              </div>
            )}

            {!api.jobs.isLoading && jobs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no hay trabajos de impresión para esta cotización.
              </p>
            )}

            {jobs.map((job) => (
              <PrintJobCard
                key={job.id}
                job={job}
                components={components.filter((c) => c.print_job_id === job.id)}
                api={api}
                disabled={disabled}
              />
            ))}

            <Button
              onClick={handleCreate}
              disabled={disabled || api.createJob.isPending}
              variant="secondary"
              size="sm"
            >
              {api.createJob.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Crear trabajo de impresión
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PrintJobCard({
  job,
  components,
  api,
  disabled,
}: {
  job: FormalQuotePrintJob;
  components: ReturnType<typeof useFormalQuotePrintJobs>["components"]["data"] extends
    | infer T
    | undefined
    ? T extends Array<infer U>
      ? U[]
      : never
    : never;
  api: ReturnType<typeof useFormalQuotePrintJobs>;
  disabled?: boolean;
}) {
  const [label, setLabel] = useState(job.job_label);
  const [logistics, setLogistics] = useState(String(job.logistics_fee_mxn ?? 0));
  const [logisticsReason, setLogisticsReason] = useState(
    job.logistics_override_reason ?? "",
  );

  // Cargo adicional (local, minimal)
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  const handleSaveLogistics = async () => {
    const fee = Number(logistics);
    const v = validatePrintJob({
      logistics_fee_default_mxn: job.logistics_fee_default_mxn,
      logistics_fee_mxn: fee,
      logistics_override_reason: logisticsReason,
      pricing_status: job.pricing_status as PrintJobPricingStatus,
      override_reason: job.override_reason,
      job_label: label,
    });
    if (!v.ok) {
      toast.error(v.errors.join(" · "));
      return;
    }
    try {
      await api.updateJob.mutateAsync({
        id: job.id,
        values: {
          job_label: label,
          logistics_fee_mxn: fee,
          logistics_override_reason: logisticsReason || null,
        },
      });
      toast.success("Trabajo actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este trabajo de impresión?")) return;
    try {
      await api.deleteJob.mutateAsync(job.id);
      toast.success("Trabajo eliminado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const handleAddCharge = async () => {
    const amount = Number(chargeAmount);
    if (!chargeLabel.trim() || !chargeDesc.trim() || !(amount > 0)) {
      toast.error("Cargo adicional: label, descripción y monto (>0) obligatorios.");
      return;
    }
    try {
      await api.addCharge.mutateAsync({
        printJobId: job.id,
        input: {
          label: chargeLabel.trim(),
          description: chargeDesc.trim(),
          amount_mxn: amount,
        },
      });
      setChargeLabel("");
      setChargeDesc("");
      setChargeAmount("");
      toast.success("Cargo adicional agregado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo agregar el cargo");
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Nombre del trabajo</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="text-xs">
            {job.pricing_status}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={disabled || api.deleteJob.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">
            Logística MXN (default {job.logistics_fee_default_mxn})
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={logistics}
            onChange={(e) => setLogistics(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Motivo (obligatorio si cambia logística o es $0)
          </Label>
          <Input
            value={logisticsReason}
            onChange={(e) => setLogisticsReason(e.target.value)}
            disabled={disabled}
            placeholder="Ej. Cliente pasa por su pedido"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSaveLogistics}
          disabled={disabled || api.updateJob.isPending}
        >
          {api.updateJob.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Guardar trabajo
        </Button>
      </div>

      {/* Componentes internos */}
      <div className="pt-2 border-t">
        <p className="text-xs font-medium mb-2">Componentes internos ({components.length})</p>
        {components.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin componentes.</p>
        )}
        {components.length > 0 && (
          <ul className="text-xs space-y-1">
            {components.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {c.component_type}
                  </Badge>
                  <span>{c.label}</span>
                  {c.description && (
                    <span className="text-muted-foreground">— {c.description}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span>${Number(c.amount_mxn).toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      api.deleteComponent
                        .mutateAsync(c.id)
                        .then(() => toast.success("Componente eliminado"))
                        .catch((e: unknown) =>
                          toast.error(
                            e instanceof Error ? e.message : "No se pudo eliminar",
                          ),
                        )
                    }
                    disabled={disabled}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cargo adicional */}
      <div className="pt-2 border-t space-y-2">
        <p className="text-xs font-medium">Agregar cargo adicional</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            placeholder="Concepto"
            value={chargeLabel}
            onChange={(e) => setChargeLabel(e.target.value)}
            disabled={disabled}
          />
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Monto MXN"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={handleAddCharge}
            disabled={disabled || api.addCharge.isPending}
          >
            {api.addCharge.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Agregar
          </Button>
        </div>
        <Textarea
          placeholder="Motivo/descripción (obligatorio)"
          value={chargeDesc}
          onChange={(e) => setChargeDesc(e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </div>
    </div>
  );
}
