// Modal para configurar impresión por partida.
// USO INTERNO DEL CRM. No exponer al cliente.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calculator, Lightbulb, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormalQuotePrintJobs } from "@/features/crm/hooks/useFormalQuotePrintJobs";
import { usePrintRules } from "@/features/crm/hooks/usePrintRules";
import { usePrintSettings } from "@/features/crm/hooks/usePrintSettings";
import {
  calcPrintEngine,
  suggestPrintMethod,
  type PrintEngineResult,
  type PrintSuggestionResult,
} from "@/features/crm/lib/print-engine";
import type {
  FormalQuotePrintJob,
  FormalQuotePrintJobItem,
} from "@/features/crm/lib/formal-quote-print-jobs";
import { formatMoney } from "@/features/crm/lib/formal-quote-calc";
import type { FormalQuoteItemRow } from "@/features/crm/hooks/useFormalQuotes";

type Api = ReturnType<typeof useFormalQuotePrintJobs>;
type Rules = ReturnType<typeof usePrintRules>;
type Settings = ReturnType<typeof usePrintSettings>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: FormalQuotePrintJob;
  jobItem: FormalQuotePrintJobItem;
  quoteItem: FormalQuoteItemRow | null;
  allJobItems: FormalQuotePrintJobItem[];
  initialReason: string;
  api: Api;
  rules: Rules;
  settings: Settings;
  disabled?: boolean;
  onSavedManual?: (info: {
    totalMxn: number;
    unitMxn: number;
    qty: number;
    methodId: string | null;
    methodName: string | null;
    colors: number;
    positions: number;
    reason: string;
  }) => Promise<void> | void;
}

export function PrintJobItemDialog({
  open,
  onOpenChange,
  job,
  jobItem,
  quoteItem,
  allJobItems,
  initialReason,
  api,
  rules,
  settings,
  disabled,
}: Props) {
  const methods = rules.methods.data ?? [];

  // ==== Estado local (se reinicia al abrir) ====
  const [qty, setQty] = useState<string>(String(jobItem.quantity ?? quoteItem?.cantidad ?? 1));
  const [priceTotal, setPriceTotal] = useState<string>(
    jobItem.allocation_amount_mxn != null ? String(jobItem.allocation_amount_mxn) : "",
  );
  const [priceUnit, setPriceUnit] = useState<string>(() => {
    const q = Number(jobItem.quantity ?? quoteItem?.cantidad ?? 0);
    const a = Number(jobItem.allocation_amount_mxn ?? 0);
    return q > 0 && a > 0 ? String(Math.round((a / q) * 100) / 100) : "";
  });
  const [reason, setReason] = useState<string>(initialReason);

  const qiPrintMethod =
    typeof quoteItem?.print_method === "string" ? quoteItem.print_method : "";
  const personalizacionText =
    typeof quoteItem?.personalizacion === "string"
      ? quoteItem.personalizacion
      : quoteItem?.personalizacion != null
        ? JSON.stringify(quoteItem.personalizacion)
        : "";

  const [methodId, setMethodId] = useState<string>(
    job.print_method_id ?? qiPrintMethod ?? "",
  );
  const [colors, setColors] = useState<number>(
    Number(job.print_colors ?? quoteItem?.print_colors ?? 1) || 1,
  );
  const [positions, setPositions] = useState<number>(
    Number(job.print_positions ?? 1) || 1,
  );

  const [engineResult, setEngineResult] = useState<PrintEngineResult | null>(null);
  const [suggestion, setSuggestion] = useState<PrintSuggestionResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEngineResult(null);
      setSuggestion(null);
      setSaving(false);
    } else {
      setQty(String(jobItem.quantity ?? quoteItem?.cantidad ?? 1));
      setPriceTotal(
        jobItem.allocation_amount_mxn != null ? String(jobItem.allocation_amount_mxn) : "",
      );
      const q = Number(jobItem.quantity ?? quoteItem?.cantidad ?? 0);
      const a = Number(jobItem.allocation_amount_mxn ?? 0);
      setPriceUnit(q > 0 && a > 0 ? String(Math.round((a / q) * 100) / 100) : "");
      setReason(initialReason);
      setMethodId(job.print_method_id ?? qiPrintMethod ?? "");
      setColors(Number(job.print_colors ?? quoteItem?.print_colors ?? 1) || 1);
      setPositions(Number(job.print_positions ?? 1) || 1);
    }
  }, [open, jobItem, quoteItem, job, initialReason]);

  const qtyN = Math.max(1, Math.floor(Number(qty) || 0));

  // Bidirectional total <-> unit
  const handleTotalChange = (v: string) => {
    setPriceTotal(v);
    const total = Number(v);
    if (Number.isFinite(total) && total >= 0 && qtyN > 0) {
      setPriceUnit(String(Math.round((total / qtyN) * 100) / 100));
    } else {
      setPriceUnit("");
    }
  };
  const handleUnitChange = (v: string) => {
    setPriceUnit(v);
    const unit = Number(v);
    if (Number.isFinite(unit) && unit >= 0 && qtyN > 0) {
      setPriceTotal(String(Math.round(unit * qtyN * 100) / 100));
    } else {
      setPriceTotal("");
    }
  };

  const status: "pendiente" | "manual" | "calculado" | "pricing_missing" = useMemo(() => {
    if (engineResult && (!engineResult.matched_rule_id || engineResult.suggested_customer_price <= 0)) {
      return "pricing_missing";
    }
    if (engineResult) return "calculado";
    if (jobItem.allocation_mode === "fijo" && jobItem.allocation_amount_mxn != null) return "manual";
    return "pendiente";
  }, [engineResult, jobItem]);

  const perItemReasons = useMemo<Record<string, string>>(() => {
    const snap = job.calculation_snapshot as { per_item_reasons?: Record<string, string> } | null;
    return snap?.per_item_reasons ?? {};
  }, [job.calculation_snapshot]);

  const recomputeJobTotals = async (
    updatedItem: FormalQuotePrintJobItem,
    savedReason: string,
  ) => {
    const nextItems = allJobItems.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    const fijos = nextItems.filter(
      (i) => i.allocation_mode === "fijo" && i.allocation_amount_mxn != null,
    );
    const total = fijos.reduce((acc, i) => acc + Number(i.allocation_amount_mxn ?? 0), 0);
    const qtySum = fijos.reduce((acc, i) => acc + Number(i.quantity ?? 0), 0);
    const unit = qtySum > 0 ? Math.round((total / qtySum) * 100) / 100 : 0;

    const nextReasons = { ...perItemReasons, [updatedItem.id]: savedReason };
    const nextSnap = {
      ...((job.calculation_snapshot as Record<string, unknown>) ?? {}),
      per_item_reasons: nextReasons,
    };

    await api.updateJob.mutateAsync({
      id: job.id,
      values: {
        calculation_snapshot: nextSnap as unknown as never,
        customer_print_price_mxn: Math.round(total * 100) / 100,
        customer_unit_price_mxn: unit,
      },
    });
  };

  const handleSaveManual = async () => {
    const total = Number(priceTotal);
    if (!Number.isFinite(total) || total < 0) {
      toast.error("Captura precio total o unitario válido (≥ 0).");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("El motivo/referencia debe tener al menos 10 caracteres.");
      return;
    }
    try {
      setSaving(true);
      const updated = await api.updateItem.mutateAsync({
        id: jobItem.id,
        values: {
          allocation_mode: "fijo",
          allocation_amount_mxn: Math.round(total * 100) / 100,
          quantity: qtyN,
        },
      });
      await recomputeJobTotals(updated, reason.trim());
      toast.success("Precio manual guardado y trabajo recalculado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCalcEngine = () => {
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
        qty: qtyN,
        colors,
        positions,
        logistics_fee_mxn: 0, // logística del trabajo, no de la partida
        logistics_job_count: 1,
        material: null,
        product_category: null,
      },
      settings.data,
      rules.pricing.data ?? [],
      rules.compat.data ?? [],
    );
    setEngineResult(res);
    if (!res.matched_rule_id || res.suggested_customer_price <= 0) {
      toast.warning("PRICING_MISSING: no hay regla válida para esta combinación.");
    }
  };

  const handleSuggest = () => {
    const res = suggestPrintMethod(
      rules.methods.data ?? [],
      rules.pricing.data ?? [],
      rules.compat.data ?? [],
      {
        qty: qtyN,
        colors,
        positions,
        material: null,
        product_category: null,
        personalization_label: personalizacionText || null,
      },
    );
    setSuggestion(res);
    if (!res.primary) toast.warning("Sin sugerencia disponible.");
  };

  const handleUseSuggested = () => {
    if (!suggestion?.primary) return;
    setMethodId(suggestion.primary.method.id);
    toast.success(`Técnica sugerida aplicada: ${suggestion.primary.method.name}`);
  };

  const applySuggestedPrice = async () => {
    if (!engineResult || status === "pricing_missing") return;
    if (reason.trim().length < 10) {
      toast.error("Captura motivo/referencia ≥ 10 caracteres para aplicar el precio sugerido.");
      return;
    }
    const total = Math.round(engineResult.suggested_customer_price * 100) / 100;
    try {
      setSaving(true);
      const updated = await api.updateItem.mutateAsync({
        id: jobItem.id,
        values: {
          allocation_mode: "fijo",
          allocation_amount_mxn: total,
          quantity: qtyN,
        },
      });
      await recomputeJobTotals(updated, reason.trim());
      toast.success("Precio sugerido aplicado a la partida");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo aplicar");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    quoteItem?.modelo_comercial ??
    quoteItem?.descripcion ??
    quoteItem?.clave_producto ??
    "Partida";

  const statusBadge = () => {
    switch (status) {
      case "calculado":
        return <Badge className="bg-emerald-600">Calculado</Badge>;
      case "manual":
        return <Badge>Manual</Badge>;
      case "pricing_missing":
        return <Badge variant="destructive">PRICING_MISSING</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Impresión de esta partida
            {statusBadge()}
          </DialogTitle>
          <DialogDescription>
            {quoteItem ? `#${quoteItem.position} · ${displayName}` : "Partida"} · Cantidad
            original: {Number(quoteItem?.cantidad ?? 0).toLocaleString("es-MX")} pzas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Datos base */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cantidad de esta partida</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  // recompute derived side
                  const q = Math.max(1, Math.floor(Number(e.target.value) || 0));
                  if (priceTotal) {
                    const total = Number(priceTotal);
                    if (Number.isFinite(total) && q > 0) {
                      setPriceUnit(String(Math.round((total / q) * 100) / 100));
                    }
                  } else if (priceUnit) {
                    const unit = Number(priceUnit);
                    if (Number.isFinite(unit) && q > 0) {
                      setPriceTotal(String(Math.round(unit * q * 100) / 100));
                    }
                  }
                }}
                disabled={disabled}
              />
            </div>
            {personalizacionText && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Personalización solicitada</Label>
                <p className="text-xs text-muted-foreground border rounded px-2 py-2 bg-muted/30">
                  {personalizacionText}
                </p>
              </div>
            )}
          </div>

          {/* ================= Sección A: Precio manual ================= */}
          <div className="rounded-md border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">A · Precio manual</p>
              <Badge variant="outline" className="text-[10px]">
                allocation_mode = &quot;fijo&quot;
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Captura el precio total o unitario. Se calcula el otro automáticamente.
              El motivo/referencia es obligatorio (mín. 10 caracteres).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Precio TOTAL impresión (MXN)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceTotal}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio UNITARIO impresión (MXN)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={priceUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Motivo / referencia (obligatorio, mín. 10 caracteres)
              </Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={disabled}
                placeholder="Ej. Cotización proveedor XYZ del 2026-07-05, folio 12345"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveManual}
                disabled={
                  disabled || saving || !priceTotal || reason.trim().length < 10
                }
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar precio manual
              </Button>
            </div>
          </div>

          {/* ================= Sección B: Calcular con motor ================= */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">B · Calcular con motor</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSuggest}
                disabled={disabled || rules.isLoading}
              >
                <Lightbulb className="w-4 h-4 mr-1" /> Sugerir técnica
              </Button>
            </div>

            {suggestion?.primary && (
              <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Recomendada:</span>
                  <span>{suggestion.primary.method.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {suggestion.primary.status}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Confianza: {suggestion.confidence}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{suggestion.reason}</p>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={handleUseSuggested}>
                    Usar técnica recomendada
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Técnica</Label>
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

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCalcEngine}
                disabled={disabled || rules.isLoading || settings.isLoading}
              >
                <Calculator className="w-4 h-4 mr-2" /> Calcular con motor
              </Button>
            </div>

            {engineResult && (
              <div className="rounded-md border bg-background p-2 text-xs space-y-1">
                {status === "pricing_missing" ? (
                  <p className="text-destructive">
                    PRICING_MISSING — no hay regla válida para esta combinación
                    (cantidad {qtyN}, tintas {colors}, posiciones {positions}).
                    No se puede aplicar precio automático. Usa la sección A (precio manual).
                  </p>
                ) : (
                  <>
                    <Row
                      k="Precio sugerido TOTAL"
                      v={formatMoney(engineResult.suggested_customer_price)}
                      bold
                    />
                    <Row
                      k="Precio sugerido UNITARIO"
                      v={formatMoney(engineResult.suggested_unit_price)}
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={applySuggestedPrice}
                        disabled={
                          disabled || saving || reason.trim().length < 10
                        }
                        title={
                          reason.trim().length < 10
                            ? "Captura motivo/referencia ≥ 10 caracteres"
                            : "Aplicar precio sugerido a la partida"
                        }
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Aplicar precio sugerido a la partida
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
