// Modal para configurar impresión por partida.
// USO INTERNO DEL CRM. No exponer al cliente.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calculator, Lightbulb, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import type { FormalQuotePrintJob, FormalQuotePrintJobItem } from "@/features/crm/lib/formal-quote-print-jobs";
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
  onSavedManual,
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

  const qiPrintMethod = typeof quoteItem?.print_method === "string" ? quoteItem.print_method : "";
  const personalizacionText = formatPersonalizacion(quoteItem?.personalizacion);
  const descriptionText = getQuoteItemDescription(quoteItem);

  const [methodId, setMethodId] = useState<string>(job.print_method_id ?? qiPrintMethod ?? "");
  const [colors, setColors] = useState<number>(Number(job.print_colors ?? quoteItem?.print_colors ?? 1) || 1);
  const [positions, setPositions] = useState<number>(Number(job.print_positions ?? 1) || 1);

  const [engineResult, setEngineResult] = useState<PrintEngineResult | null>(null);
  const [suggestion, setSuggestion] = useState<PrintSuggestionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [urgency, setUrgency] = useState<boolean>(false);
  const [fondeo, setFondeo] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      setEngineResult(null);
      setSuggestion(null);
      setSaving(false);
      setUrgency(false);
      setFondeo(false);
    } else {
      setQty(String(jobItem.quantity ?? quoteItem?.cantidad ?? 1));
      setPriceTotal(jobItem.allocation_amount_mxn != null ? String(jobItem.allocation_amount_mxn) : "");
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

  const selectedMethodCode = useMemo(
    () => (methodId ? (methods.find((m) => m.id === methodId)?.code ?? "") : "").toLowerCase(),
    [methodId, methods],
  );
  const isUV = selectedMethodCode.startsWith("uv_");
  const isUV360 = selectedMethodCode === "uv_cilindrica_360";
  const isUVFlat = selectedMethodCode.startsWith("uv_cama_plana");
  const isUVOneSide = selectedMethodCode === "uv_cilindrica_una_cara";

  // Ajuste UV: quita placa/negativo/cliché/molde/reempaque/extras del interno,
  // aplica urgencia +30% sobre el base, y suma fondeo opcional en UV 360.
  const adjusted = useMemo(() => {
    if (!engineResult) return null;
    if (!isUV && !urgency && !fondeo) return engineResult;
    const bufferPct = Number(settings.data?.operational_buffer_pct ?? 0) || 0;
    const marginPct = Number(settings.data?.default_margin_pct ?? 0) || 0;
    const minProfit = Number(settings.data?.minimum_profit_mxn ?? 0) || 0;

    let base = engineResult.base_print_cost;
    let additional = engineResult.additional_internal_costs;
    if (isUV) {
      const b = engineResult.cost_breakdown;
      additional = Math.max(0, additional - b.plate - b.negative_positive - b.mold - b.repack - b.extras - b.compat_extra);
    }
    if (urgency) base = Math.round(base * 1.3 * 100) / 100;
    const fondeoActive = fondeo && isUV360;
    const fondeoAmount = fondeoActive ? qtyN * 30 : 0;

    const logistics = engineResult.logistics;
    const preBuffer = base + additional + logistics + fondeoAmount;
    const buffer = Math.round(preBuffer * bufferPct * 100) / 100;
    const internal_total = Math.round((preBuffer + buffer) * 100) / 100;
    const denom = 1 - marginPct;
    const price_by_margin = denom > 0 ? internal_total / denom : internal_total;
    const price_by_min_profit = internal_total + minProfit;
    const suggested_customer_price = Math.round(Math.max(price_by_margin, price_by_min_profit) * 100) / 100;
    const suggested_unit_price = qtyN > 0 ? Math.round((suggested_customer_price / qtyN) * 100) / 100 : 0;

    return {
      ...engineResult,
      base_print_cost: base,
      additional_internal_costs: additional,
      cost_breakdown: isUV
        ? {
            ...engineResult.cost_breakdown,
            plate: 0,
            negative_positive: 0,
            mold: 0,
            repack: 0,
            extras: 0,
            compat_extra: 0,
          }
        : engineResult.cost_breakdown,
      buffer,
      internal_total,
      price_by_margin: Math.round(price_by_margin * 100) / 100,
      price_by_min_profit: Math.round(price_by_min_profit * 100) / 100,
      suggested_customer_price,
      suggested_unit_price,
      // extra info local
      _uv: {
        urgency,
        urgencyDelta: urgency ? Math.round((base - base / 1.3) * 100) / 100 : 0,
        fondeoActive,
        fondeoAmount,
      },
    } as PrintEngineResult & {
      _uv: { urgency: boolean; urgencyDelta: number; fondeoActive: boolean; fondeoAmount: number };
    };
  }, [engineResult, isUV, isUV360, urgency, fondeo, qtyN, settings.data]);

  const perItemReasons = useMemo<Record<string, string>>(() => {
    const snap = job.calculation_snapshot as { per_item_reasons?: Record<string, string> } | null;
    return snap?.per_item_reasons ?? {};
  }, [job.calculation_snapshot]);

  const recomputeJobTotals = async (updatedItem: FormalQuotePrintJobItem, savedReason: string) => {
    const nextItems = allJobItems.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    const fijos = nextItems.filter((i) => i.allocation_mode === "fijo" && i.allocation_amount_mxn != null);
    const total = fijos.reduce((acc, i) => acc + Number(i.allocation_amount_mxn ?? 0), 0);
    const qtySum = fijos.reduce((acc, i) => acc + Number(i.quantity ?? 0), 0);
    const unit = qtySum > 0 ? Math.round((total / qtySum) * 100) / 100 : 0;

    const nextReasons = { ...perItemReasons, [updatedItem.id]: savedReason };
    const prevSnap = (job.calculation_snapshot as Record<string, unknown>) ?? {};
    const prevUv = (prevSnap.per_item_uv as Record<string, unknown>) ?? {};
    const uvEntry = isUV
      ? {
          method_code: selectedMethodCode,
          urgency,
          fondeo: fondeo && isUV360,
          fondeo_amount_mxn: fondeo && isUV360 ? qtyN * 30 : 0,
        }
      : undefined;
    const nextUv = { ...prevUv };
    if (uvEntry) nextUv[updatedItem.id] = uvEntry;
    else delete nextUv[updatedItem.id];

    const nextSnap = {
      ...prevSnap,
      per_item_reasons: nextReasons,
      per_item_uv: nextUv,
    };

    const selectedMethodName = methodId ? (methods.find((m) => m.id === methodId)?.name ?? null) : null;

    await api.updateJob.mutateAsync({
      id: job.id,
      values: {
        calculation_snapshot: nextSnap as unknown as never,
        customer_print_price_mxn: Math.round(total * 100) / 100,
        customer_unit_price_mxn: unit,
        pricing_status: "manual",
        override_reason: savedReason,
        print_method_id: methodId || null,
        print_method_name_snapshot: selectedMethodName,
        print_colors: colors,
        print_positions: positions,
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
      const totalMxn = Math.round(total * 100) / 100;
      const unitMxn = qtyN > 0 ? Math.round((totalMxn / qtyN) * 100) / 100 : 0;
      const methodName = methodId ? (methods.find((m) => m.id === methodId)?.name ?? null) : null;
      if (onSavedManual) {
        try {
          await onSavedManual({
            totalMxn,
            unitMxn,
            qty: qtyN,
            methodId: methodId || null,
            methodName,
            colors,
            positions,
            reason: reason.trim(),
          });
        } catch (err) {
          console.warn("[print-job-item-dialog] onSavedManual failed", err);
        }
      }
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
    const res = suggestPrintMethod(rules.methods.data ?? [], rules.pricing.data ?? [], rules.compat.data ?? [], {
      qty: qtyN,
      colors,
      positions,
      material: null,
      product_category: null,
      personalization_label: personalizacionText || null,
    });
    setSuggestion(res);
    if (!res.primary) toast.warning("Sin sugerencia disponible.");
  };

  useEffect(() => {
    if (!open || suggestion || rules.isLoading) return;
    const hasMethods = (rules.methods.data ?? []).length > 0;
    if (!hasMethods) return;
    const res = suggestPrintMethod(rules.methods.data ?? [], rules.pricing.data ?? [], rules.compat.data ?? [], {
      qty: qtyN,
      colors,
      positions,
      material: null,
      product_category: null,
      personalization_label: personalizacionText || null,
    });
    setSuggestion(res);
  }, [
    open,
    suggestion,
    rules.isLoading,
    rules.methods.data,
    rules.pricing.data,
    rules.compat.data,
    qtyN,
    colors,
    positions,
    personalizacionText,
  ]);

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
    const totalSource = adjusted?.suggested_customer_price ?? engineResult.suggested_customer_price;
    const total = Math.round(totalSource * 100) / 100;
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
      const unitMxn = qtyN > 0 ? Math.round((total / qtyN) * 100) / 100 : 0;
      const methodName = methodId ? (methods.find((m) => m.id === methodId)?.name ?? null) : null;
      if (onSavedManual) {
        try {
          await onSavedManual({
            totalMxn: total,
            unitMxn,
            qty: qtyN,
            methodId: methodId || null,
            methodName,
            colors,
            positions,
            reason: reason.trim(),
          });
        } catch (err) {
          console.warn("[print-job-item-dialog] onSavedManual suggested failed", err);
        }
      }
      toast.success("Precio sugerido aplicado a la partida");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo aplicar");
    } finally {
      setSaving(false);
    }
  };

  const displayName = quoteItem?.modelo_comercial ?? quoteItem?.descripcion ?? quoteItem?.clave_producto ?? "Partida";

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

  const claveDisplay =
    (typeof quoteItem?.clave_producto === "string" && quoteItem.clave_producto.trim()) || "Sin clave";
  const methodName = methodId ? (methods.find((m) => m.id === methodId)?.name ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Impresión de esta partida
            {statusBadge()}
          </DialogTitle>
          <DialogDescription>
            {quoteItem ? `#${quoteItem.position} · ${displayName}` : "Partida"} · Cantidad original:{" "}
            {Number(quoteItem?.cantidad ?? 0).toLocaleString("es-MX")} pzas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen partida (producto / clave / técnica) */}
          <div className="rounded-xl border bg-muted/25 p-3 text-xs space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <p className="text-muted-foreground">Producto</p>
                <p className="font-medium truncate">{displayName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clave / modelo</p>
                <p className="font-medium">{claveDisplay}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cantidad</p>
                <p className="font-medium">{qtyN.toLocaleString("es-MX")} pzas</p>
              </div>
              <div>
                <p className="text-muted-foreground">Técnica aplicada</p>
                <p className="font-medium">{methodName ?? "Sin técnica"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tintas</p>
                <p className="font-medium">{colors}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Posiciones</p>
                <p className="font-medium">{positions}</p>
              </div>
            </div>

            {descriptionText && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-muted-foreground">Descripción comercial</p>
                <p className="font-medium leading-relaxed">{descriptionText}</p>
              </div>
            )}

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-muted-foreground">Técnica sugerida por análisis</p>
              {suggestion?.primary ? (
                <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{suggestion.primary.method.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {suggestion.primary.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Confianza: {suggestion.confidence}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleUseSuggested}>
                    Usar técnica sugerida
                  </Button>
                  {suggestion.reason && <p className="text-muted-foreground basis-full">{suggestion.reason}</p>}
                </div>
              ) : (
                <p className="font-medium mt-1">Sin sugerencia disponible todavía</p>
              )}
            </div>
          </div>

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
                <div className="text-xs text-muted-foreground border rounded px-2 py-2 bg-muted/30 whitespace-pre-line leading-relaxed">
                  {personalizacionText}
                </div>
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
              Captura el precio total o unitario. Se calcula el otro automáticamente. El motivo/referencia es
              obligatorio (mín. 10 caracteres).
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
              <Label className="text-xs">Motivo / referencia (obligatorio, mín. 10 caracteres)</Label>
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
                disabled={disabled || saving || !priceTotal || reason.trim().length < 10}
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
              <Button size="sm" variant="ghost" onClick={handleSuggest} disabled={disabled || rules.isLoading}>
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
                <Select value={methodId} onValueChange={setMethodId} disabled={disabled || rules.isLoading}>
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

            {isUV && (
              <div className="rounded-md border bg-muted/30 p-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Opciones UV</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">Urgencia +30%</p>
                    <p className="text-[11px] text-muted-foreground">Multiplica el costo base UV por 1.30.</p>
                  </div>
                  <Switch checked={urgency} onCheckedChange={setUrgency} disabled={disabled} />
                </div>
                {isUV360 && (
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <div>
                      <p className="text-xs font-medium">Agregar fondeo</p>
                      <p className="text-[11px] text-muted-foreground">
                        Fondeo opcional +$30 por pieza (sólo UV cilíndrica 360°).
                      </p>
                    </div>
                    <Switch checked={fondeo} onCheckedChange={setFondeo} disabled={disabled} />
                  </div>
                )}
              </div>
            )}

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

            {engineResult && (() => {
              const disp = adjusted ?? engineResult;
              const uv = (disp as unknown as { _uv?: { urgency: boolean; urgencyDelta: number; fondeoActive: boolean; fondeoAmount: number } })._uv;
              return (
              <div className="rounded-md border bg-background p-2 text-xs space-y-2">
                {engineResult.warnings.length > 0 && (
                  <ul className="space-y-1">
                    {engineResult.warnings.map((w, i) => (
                      <li
                        key={`${w.code}-${i}`}
                        className={
                          w.severity === "error"
                            ? "text-destructive"
                            : w.severity === "warning"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }
                      >
                        <span className="font-mono text-[10px] mr-1">[{w.code}]</span>
                        {w.message}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-0.5">
                  <p className="font-semibold text-[11px] uppercase text-muted-foreground">
                    Desglose interno calculado (uso CRM)
                  </p>
                  {!isUV && (
                    <p className="text-[11px] text-muted-foreground">
                      Reempaque y cargos extra NO se aplican automáticamente. Agrégalos sólo como cargo adicional
                      manual si realmente aplican.
                    </p>
                  )}
                  <Row
                    k={
                      isUVFlat
                        ? "Impresión UV base"
                        : isUV360
                          ? "Impresión UV 360 base"
                          : isUVOneSide
                            ? "Impresión UV una cara base"
                            : "Impresión base"
                    }
                    v={formatMoney(disp.base_print_cost)}
                  />
                  {uv?.urgency && <Row k="Urgencia +30%" v={formatMoney(uv.urgencyDelta)} />}
                  {uv?.fondeoActive && (
                    <Row k={`Fondeo opcional (${qtyN} × $30)`} v={formatMoney(uv.fondeoAmount)} />
                  )}
                  {disp.cost_breakdown.setup > 0 && (
                    <Row k="Setup / preprensa" v={formatMoney(disp.cost_breakdown.setup)} />
                  )}
                  {disp.cost_breakdown.plate > 0 && (
                    <Row k="Placa / cliché" v={formatMoney(disp.cost_breakdown.plate)} />
                  )}
                  {disp.cost_breakdown.negative_positive > 0 && (
                    <Row k="Negativo / positivo" v={formatMoney(disp.cost_breakdown.negative_positive)} />
                  )}
                  {disp.cost_breakdown.mold > 0 && <Row k="Molde" v={formatMoney(disp.cost_breakdown.mold)} />}
                  {disp.cost_breakdown.repack > 0 && <Row k="Reempaque" v={formatMoney(disp.cost_breakdown.repack)} />}
                  {disp.cost_breakdown.extras > 0 && (
                    <Row k="Cargos extra" v={formatMoney(disp.cost_breakdown.extras)} />
                  )}
                  {disp.cost_breakdown.compat_extra > 0 && (
                    <Row k="Compatibilidad extra" v={formatMoney(disp.cost_breakdown.compat_extra)} />
                  )}
                  <Row k="Logística" v={formatMoney(disp.logistics)} />
                  <Row k="Buffer operativo" v={formatMoney(disp.buffer)} />
                  <Row k="Costo interno total" v={formatMoney(disp.internal_total)} bold />
                </div>

                {status === "pricing_missing" ? (
                  <p className="text-destructive">
                    PRICING_MISSING — no hay regla válida para esta combinación (cantidad {qtyN}, tintas {colors},
                    posiciones {positions}). No se puede aplicar precio automático. Usa la sección A (precio manual).
                  </p>
                ) : (
                  <div className="space-y-0.5 border-t pt-2">
                    <Row
                      k="Precio sugerido TOTAL (referencia interna)"
                      v={formatMoney(engineResult.suggested_customer_price)}
                      bold
                    />
                    <Row k="Precio sugerido UNITARIO" v={formatMoney(engineResult.suggested_unit_price)} />
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={applySuggestedPrice}
                        disabled={disabled || saving || reason.trim().length < 10}
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function getQuoteItemDescription(item: FormalQuoteItemRow | null): string | null {
  const desc = cleanText(item?.descripcion);
  const model = cleanText(item?.modelo_comercial);
  if (!desc) return null;
  if (model && desc.toLowerCase() === model.toLowerCase()) return null;
  return desc;
}

function formatPersonalizacion(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      return formatPersonalizacion(JSON.parse(value));
    } catch {
      return value.trim();
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return String(value);

  const obj = value as Record<string, unknown>;
  const lines: string[] = [];

  const label = cleanText(obj.label) ?? cleanText(obj.tipo) ?? cleanText(obj.logo_format);
  if (label) lines.push(`Tipo: ${label}`);

  const publica = cleanText(obj.publica);
  if (publica) lines.push(`Detalle: ${publica}`);

  const material = cleanText(obj.material);
  if (material) lines.push(`Material: ${material}`);

  const ubicacion = cleanText(obj.ubicacion) ?? cleanText(obj.area_impresion);
  if (ubicacion) lines.push(`Ubicación: ${ubicacion}`);

  const entrega = cleanText(obj.entrega_estimada);
  if (entrega) lines.push(`Entrega estimada: ${entrega}`);

  const tecnica = cleanText(obj.tecnica_sugerida) ?? cleanText(obj.sugerida_economica);
  if (tecnica) lines.push(`Sugerencia original: ${tecnica}`);

  const precioReferencia = typeof obj.precio_referencia_cliente === "number" ? obj.precio_referencia_cliente : null;
  if (precioReferencia != null) {
    lines.push(`Referencia cliente: ${formatMoney(precioReferencia)}`);
  }

  return lines.length > 0 ? lines.join("\n") : JSON.stringify(obj);
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
