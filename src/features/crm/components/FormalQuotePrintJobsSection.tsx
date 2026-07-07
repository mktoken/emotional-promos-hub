// Sección operativa para el nuevo modelo de trabajos de impresión.
// USO INTERNO DEL CRM. No exponer al cliente (PDF/email).
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFormalQuotePrintJobs } from "@/features/crm/hooks/useFormalQuotePrintJobs";
import { useFormalQuoteItems, type FormalQuoteItemRow } from "@/features/crm/hooks/useFormalQuotes";
import { usePrintRules } from "@/features/crm/hooks/usePrintRules";
import { usePrintSettings } from "@/features/crm/hooks/usePrintSettings";
import { calcPrintEngine, type PrintEngineResult } from "@/features/crm/lib/print-engine";
import {
  validatePrintJob,
  type PrintJobPricingStatus,
} from "@/features/crm/lib/formal-quote-validation";
import type { FormalQuotePrintJob, FormalQuotePrintJobItem } from "@/features/crm/lib/formal-quote-print-jobs";
import { formatMoney } from "@/features/crm/lib/formal-quote-calc";

interface Props {
  formalQuoteId: string;
  disabled?: boolean;
}

export function FormalQuotePrintJobsSection({ formalQuoteId, disabled }: Props) {
  const [open, setOpen] = useState(true);
  const api = useFormalQuotePrintJobs(formalQuoteId);
  const rules = usePrintRules();
  const settings = usePrintSettings();
  const quoteItemsQuery = useFormalQuoteItems(formalQuoteId);
  const jobs = api.jobs.data ?? [];
  const components = api.components.data ?? [];
  const jobItems = api.items.data ?? [];
  const quoteItems = quoteItemsQuery.data ?? [];

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
    <Card className="border-primary/40">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2 flex-wrap">
                Trabajos de impresión
                <Badge variant="secondary">{jobs.length}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  Sólo CRM · no visible al cliente
                </Badge>
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
              Operativo. Los componentes internos, buffer, logística y overrides
              nunca se muestran en PDF ni en email al cliente.
            </p>

            {api.jobs.isLoading && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Cargando trabajos…
              </div>
            )}

            {!api.jobs.isLoading && jobs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no hay trabajos de impresión. Crea el primero para
                cotizar impresión operativamente.
              </p>
            )}

            {jobs.map((job) => (
              <PrintJobCard
                key={job.id}
                job={job}
                components={components.filter((c) => c.print_job_id === job.id)}
                jobItems={jobItems.filter((ji) => ji.print_job_id === job.id)}
                quoteItems={quoteItems}
                api={api}
                rules={rules}
                settings={settings}
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

type Api = ReturnType<typeof useFormalQuotePrintJobs>;
type Rules = ReturnType<typeof usePrintRules>;
type Settings = ReturnType<typeof usePrintSettings>;

function PrintJobCard({
  job,
  components,
  jobItems,
  quoteItems,
  api,
  rules,
  settings,
  disabled,
}: {
  job: FormalQuotePrintJob;
  components: NonNullable<Api["components"]["data"]>;
  jobItems: FormalQuotePrintJobItem[];
  quoteItems: FormalQuoteItemRow[];
  api: Api;
  rules: Rules;
  settings: Settings;
  disabled?: boolean;
}) {
  const [label, setLabel] = useState(job.job_label);
  const [methodId, setMethodId] = useState(job.print_method_id ?? "");
  const [colors, setColors] = useState<number>(job.print_colors ?? 1);
  const [positions, setPositions] = useState<number>(job.print_positions ?? 1);
  const [qty, setQty] = useState<number>(100);
  const [logistics, setLogistics] = useState(String(job.logistics_fee_mxn ?? 350));
  const [logisticsReason, setLogisticsReason] = useState(
    job.logistics_override_reason ?? "",
  );

  const [overrideAmount, setOverrideAmount] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>(
    job.override_reason ?? "",
  );

  const [result, setResult] = useState<PrintEngineResult | null>(null);
  const [pricingStatus, setPricingStatus] = useState<PrintJobPricingStatus>(
    (job.pricing_status ?? "pendiente") as PrintJobPricingStatus,
  );

  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  const [addItemId, setAddItemId] = useState<string>("");

  const perItemReasons = useMemo<Record<string, string>>(() => {
    const snap = job.calculation_snapshot as { per_item_reasons?: Record<string, string> } | null;
    return snap?.per_item_reasons ?? {};
  }, [job.calculation_snapshot]);

  const methods = rules.methods.data ?? [];
  const defaultLogistics = job.logistics_fee_default_mxn ?? 350;
  const logisticsNum = Number(logistics);
  const logisticsChanged = logisticsNum !== Number(defaultLogistics);
  const logisticsZero = logisticsNum === 0;
  const needsLogisticsReason =
    (logisticsChanged || logisticsZero) && logisticsReason.trim().length === 0;

  const hasIncompleteCharge = useMemo(
    () =>
      components.some(
        (c) =>
          c.component_type === "additional_charge" &&
          (!c.description || !(Number(c.amount_mxn) > 0)),
      ),
    [components],
  );

  const needsOverrideReason =
    overrideAmount.trim().length > 0 && overrideReason.trim().length < 10;

  const isPricingMissing = pricingStatus === "pricing_missing";

  const canApplyAutomatic =
    !!result &&
    !isPricingMissing &&
    !needsLogisticsReason &&
    !hasIncompleteCharge;

  const handleSaveJob = async () => {
    const v = validatePrintJob({
      logistics_fee_default_mxn: defaultLogistics,
      logistics_fee_mxn: logisticsNum,
      logistics_override_reason: logisticsReason,
      print_colors: colors,
      print_positions: positions,
      pricing_status: pricingStatus,
      override_reason: overrideReason,
      job_label: label,
    });
    if (!v.ok) {
      toast.error(v.errors.join(" · "));
      return;
    }
    try {
      const methodName =
        methods.find((m) => m.id === methodId)?.name ??
        job.print_method_name_snapshot ??
        null;
      await api.updateJob.mutateAsync({
        id: job.id,
        values: {
          job_label: label,
          print_method_id: methodId || null,
          print_method_name_snapshot: methodName,
          print_colors: colors,
          print_positions: positions,
          logistics_fee_mxn: logisticsNum,
          logistics_override_reason: logisticsReason || null,
        },
      });
      toast.success("Trabajo actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const handleCalc = () => {
    if (!settings.data) {
      toast.error("Configuración del motor no disponible.");
      return;
    }
    if (!methodId) {
      toast.error("Selecciona una técnica.");
      return;
    }
    const res = calcPrintEngine(
      {
        print_method_id: methodId,
        qty: Math.max(1, Math.floor(qty)),
        colors,
        positions,
        logistics_fee_mxn: logisticsNum,
        logistics_job_count: 1,
        material: null,
        product_category: null,
      },
      settings.data,
      rules.pricing.data ?? [],
      rules.compat.data ?? [],
    );
    setResult(res);
    const missing =
      !res.matched_rule_id || res.suggested_customer_price <= 0;
    setPricingStatus(missing ? "pricing_missing" : "calculado");
    if (missing) {
      toast.warning("PRICING_MISSING: no hay regla válida para esta combinación.");
    }
  };

  const handleApply = async () => {
    if (!canApplyAutomatic || !result) return;
    try {
      await api.updateJob.mutateAsync({
        id: job.id,
        values: {
          customer_unit_price_mxn: result.suggested_unit_price,
          customer_print_price_mxn: result.suggested_customer_price,
          internal_print_cost_mxn: result.internal_total,
          pricing_status: "calculado",
          calculation_snapshot: {
            version: "3.1",
            at: new Date().toISOString(),
            input: {
              print_method_id: methodId,
              qty,
              colors,
              positions,
              logistics_fee_mxn: logisticsNum,
            },
            result,
          } as unknown as never,
        },
      });
      toast.success("Precio de impresión aplicado al trabajo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo aplicar el precio");
    }
  };

  const handleApplyOverride = async () => {
    const val = Number(overrideAmount);
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Ingresa un monto de override válido (>0).");
      return;
    }
    if (overrideReason.trim().length < 10) {
      toast.error("El motivo del override debe tener al menos 10 caracteres.");
      return;
    }
    try {
      await api.updateJob.mutateAsync({
        id: job.id,
        values: {
          customer_unit_price_mxn: val,
          pricing_status: "manual",
          override_reason: overrideReason.trim(),
        },
      });
      setPricingStatus("manual");
      toast.success("Override manual guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar override");
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
      toast.error("Cargo adicional: concepto, motivo y monto (>0) obligatorios.");
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

  const statusBadge = () => {
    switch (pricingStatus) {
      case "calculado":
        return <Badge className="bg-emerald-600">Calculado</Badge>;
      case "manual":
        return <Badge variant="destructive">Override manual</Badge>;
      case "pricing_missing":
        return <Badge variant="destructive">PRICING_MISSING</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
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
          {statusBadge()}
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

      {/* Técnica / colores / posiciones / qty */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Técnica de impresión</Label>
          <Select
            value={methodId}
            onValueChange={setMethodId}
            disabled={disabled || rules.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona técnica" />
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tintas / colores</Label>
          <Input
            type="number"
            min="1"
            value={colors}
            onChange={(e) => setColors(Math.max(1, Number(e.target.value)))}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Posiciones</Label>
          <Input
            type="number"
            min="1"
            value={positions}
            onChange={(e) => setPositions(Math.max(1, Number(e.target.value)))}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Cantidad para cálculo</Label>
          <Input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Logística MXN (default {defaultLogistics})
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
            Motivo logística {logisticsChanged || logisticsZero ? "(obligatorio)" : "(opcional)"}
          </Label>
          <Input
            value={logisticsReason}
            onChange={(e) => setLogisticsReason(e.target.value)}
            disabled={disabled}
            placeholder="Ej. Cliente pasa por su pedido"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveJob}
          disabled={disabled || api.updateJob.isPending}
        >
          Guardar trabajo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCalc}
          disabled={disabled || rules.isLoading || settings.isLoading}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calcular / recalcular
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={disabled || !canApplyAutomatic || api.updateJob.isPending}
          title={
            isPricingMissing
              ? "PRICING_MISSING: no hay regla válida"
              : needsLogisticsReason
                ? "Falta motivo de logística modificada"
                : hasIncompleteCharge
                  ? "Hay cargos adicionales incompletos"
                  : !result
                    ? "Primero calcula el motor"
                    : "Aplicar precio al trabajo"
          }
        >
          Aplicar precio de impresión al trabajo
        </Button>
      </div>

      {/* Resultado del motor */}
      {result && (
        <div className="rounded-md border bg-background p-3 text-xs space-y-1">
          <div className="font-medium text-sm mb-1">Resultado (interno)</div>
          {isPricingMissing ? (
            <p className="text-destructive">
              PRICING_MISSING — no hay regla válida. No se puede aplicar precio automático.
            </p>
          ) : (
            <>
              <ResRow k="Impresión base" v={formatMoney(result.base_print_cost)} />
              <ResRow k="Costos internos adicionales" v={formatMoney(result.additional_internal_costs)} />
              <ResRow k="Logística aplicada" v={formatMoney(result.logistics)} />
              <ResRow k="Buffer (informativo)" v={formatMoney(result.buffer)} />
              <ResRow k="Total interno" v={formatMoney(result.internal_total)} />
              <div className="border-t my-1" />
              <ResRow k="Precio sugerido cliente" v={formatMoney(result.suggested_customer_price)} bold />
              <ResRow k="Precio sugerido unitario" v={formatMoney(result.suggested_unit_price)} />
              <ResRow k="Setup sugerido" v={formatMoney(result.suggested_setup_fee)} />
            </>
          )}
        </div>
      )}

      {/* Override manual */}
      <div className="pt-2 border-t space-y-2">
        <p className="text-xs font-medium">Override manual (opcional)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Precio unitario MXN"
            value={overrideAmount}
            onChange={(e) => setOverrideAmount(e.target.value)}
            disabled={disabled}
          />
          <Input
            className="md:col-span-2"
            placeholder="Motivo (mín. 10 caracteres)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleApplyOverride}
            disabled={disabled || !overrideAmount || needsOverrideReason}
          >
            Aplicar override
          </Button>
        </div>
      </div>

      {/* Componentes internos */}
      <div className="pt-2 border-t">
        <p className="text-xs font-medium mb-2">
          Componentes internos ({components.length})
        </p>
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
                  <span>{formatMoney(Number(c.amount_mxn))}</span>
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

      {/* Cargo adicional manual */}
      <div className="pt-2 border-t space-y-2">
        <p className="text-xs font-medium">Agregar cargo adicional</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            placeholder="Concepto (Reempaque, Urgencia, Traslado, Manejo especial, Otro)"
            value={chargeLabel}
            onChange={(e) => setChargeLabel(e.target.value)}
            disabled={disabled}
            className="md:col-span-2"
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
        </div>
        <Textarea
          placeholder="Motivo/descripción (obligatorio)"
          value={chargeDesc}
          onChange={(e) => setChargeDesc(e.target.value)}
          disabled={disabled}
          rows={2}
        />
        <div className="flex justify-end">
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
            Agregar cargo
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Los cargos automáticos (reempaque, $0.25, $0.35) están deshabilitados.
          Todo cargo adicional debe capturarse manualmente con concepto, importe y motivo.
        </p>
      </div>
    </div>
  );
}

function ResRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
