// Configurador de impresión POR PARTIDA.
// USO INTERNO DEL CRM. No exponer al cliente (PDF / email / frontend público).
//
// Este componente vive dentro de cada tarjeta de partida del FormalQuoteEditor.
// Su objetivo es reemplazar el motor global como flujo principal de impresión.
//
// Flujo:
//  1. Si la partida NO tiene trabajo/asignación de impresión → botón crea
//     automáticamente un trabajo (formal_quote_print_jobs) + asignación
//     (formal_quote_print_job_items) y abre el modal.
//  2. Si ya existe → abre el modal directamente para editar precio manual,
//     técnica, tintas y posiciones.
//  3. Al guardar precio manual desde el modal, se sincronizan también los
//     campos legacy (print_method, print_colors, print_unit_price, setup_fee,
//     subtotal) de formal_quote_items para no romper PDF/totales actuales.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFormalQuotePrintJobs } from "@/features/crm/hooks/useFormalQuotePrintJobs";
import {
  useUpdateFormalQuoteItem,
  type FormalQuoteItemRow,
} from "@/features/crm/hooks/useFormalQuotes";
import { usePrintRules } from "@/features/crm/hooks/usePrintRules";
import { usePrintSettings } from "@/features/crm/hooks/usePrintSettings";
import { calcItemSubtotal, formatMoney } from "@/features/crm/lib/formal-quote-calc";
import { PrintJobItemDialog } from "@/features/crm/components/PrintJobItemDialog";

interface Props {
  formalQuoteId: string;
  item: FormalQuoteItemRow;
  disabled?: boolean;
}

export function QuoteItemPrintConfigurator({ formalQuoteId, item, disabled }: Props) {
  const api = useFormalQuotePrintJobs(formalQuoteId);
  const rules = usePrintRules();
  const settings = usePrintSettings();
  const updateLegacyItem = useUpdateFormalQuoteItem();

  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [openJobItemId, setOpenJobItemId] = useState<string | null>(null);

  const jobs = api.jobs.data ?? [];
  const jobItems = api.items.data ?? [];

  // Asignación existente para esta partida (si hay).
  const existingJobItem = useMemo(
    () => jobItems.find((ji) => ji.formal_quote_item_id === item.id) ?? null,
    [jobItems, item.id],
  );
  const existingJob = useMemo(
    () =>
      existingJobItem
        ? (jobs.find((j) => j.id === existingJobItem.print_job_id) ?? null)
        : null,
    [jobs, existingJobItem],
  );

  const activeJob = openJobId
    ? (jobs.find((j) => j.id === openJobId) ?? existingJob)
    : existingJob;
  const activeJobItem = openJobItemId
    ? (jobItems.find((ji) => ji.id === openJobItemId) ?? existingJobItem)
    : existingJobItem;
  const allJobItemsForActive = useMemo(
    () =>
      activeJob ? jobItems.filter((ji) => ji.print_job_id === activeJob.id) : [],
    [jobItems, activeJob],
  );

  const initialReason = useMemo(() => {
    if (!activeJob || !activeJobItem) return "";
    const snap = activeJob.calculation_snapshot as
      | { per_item_reasons?: Record<string, string> }
      | null;
    return snap?.per_item_reasons?.[activeJobItem.id] ?? "";
  }, [activeJob, activeJobItem]);

  const handleOpen = async () => {
    if (disabled) return;
    try {
      // 1) Reutilizar si ya existe.
      if (existingJobItem && existingJob) {
        setOpenJobId(existingJob.id);
        setOpenJobItemId(existingJobItem.id);
        setOpen(true);
        return;
      }

      // 2) Crear job + asignación mínima para esta partida.
      setPreparing(true);
      const newJob = await api.createJob.mutateAsync({
        position: jobs.length,
        job_label: "Trabajo de impresión",
        logistics_fee_default_mxn: 350,
        logistics_fee_mxn: 350,
        pricing_status: "pendiente",
      });
      const qty = Math.max(1, Math.floor(Number(item.cantidad ?? 1)));
      const newItem = await api.assignItem.mutateAsync({
        print_job_id: newJob.id,
        formal_quote_item_id: item.id,
        quantity: qty,
        allocation_mode: "proporcional",
      });
      setOpenJobId(newJob.id);
      setOpenJobItemId(newItem.id);
      setOpen(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo preparar el trabajo de impresión",
      );
    } finally {
      setPreparing(false);
    }
  };

  // Sincronizar campos legacy para no romper PDF/totales actuales.
  // Sólo se tocan columnas que existen en formal_quote_items.
  const handleSyncLegacy = async (info: {
    totalMxn: number;
    unitMxn: number;
    qty: number;
    methodId: string | null;
    methodName: string | null;
    colors: number;
    positions: number;
    reason: string;
  }) => {
    const patch: Partial<FormalQuoteItemRow> = {
      print_unit_price: info.unitMxn,
      setup_fee: 0,
      print_colors: info.colors,
    };
    if (info.methodName) patch.print_method = info.methodName;
    const merged: FormalQuoteItemRow = {
      ...item,
      ...patch,
    } as FormalQuoteItemRow;
    const newSubtotal = calcItemSubtotal(merged);
    try {
      await updateLegacyItem.mutateAsync({
        id: item.id,
        values: {
          ...patch,
          subtotal: newSubtotal,
        },
      });
    } catch (e) {
      // No bloquear si alguna columna no aplica.
      console.warn("[quote-item-print-configurator] legacy sync failed", e);
    }
  };

  const statusBadge = (() => {
    if (!existingJobItem) {
      return (
        <Badge variant="outline" className="text-[10px]">
          Sin impresión
        </Badge>
      );
    }
    const status = existingJob?.pricing_status ?? "pendiente";
    if (status === "manual")
      return <Badge className="text-[10px]">Manual</Badge>;
    if (status === "calculado")
      return (
        <Badge className="bg-emerald-600 text-[10px]">Calculado</Badge>
      );
    if (status === "pricing_missing")
      return (
        <Badge variant="destructive" className="text-[10px]">
          PRICING_MISSING
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-[10px]">
        Pendiente
      </Badge>
    );
  })();

  const totalMxn = existingJobItem?.allocation_amount_mxn ?? null;
  const unitMxn =
    totalMxn != null && existingJobItem && Number(existingJobItem.quantity ?? 0) > 0
      ? totalMxn / Number(existingJobItem.quantity)
      : null;

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Printer className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Impresión de esta partida</span>
          {statusBadge}
          {existingJob?.print_method_name_snapshot && (
            <Badge variant="secondary" className="text-[10px]">
              {existingJob.print_method_name_snapshot}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleOpen}
          disabled={disabled || preparing || api.createJob.isPending || api.assignItem.isPending}
        >
          {(preparing || api.createJob.isPending || api.assignItem.isPending) && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Configurar impresión
        </Button>
      </div>
      {existingJobItem && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Total impresión</p>
            <p className="font-medium">
              {totalMxn != null ? formatMoney(totalMxn) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Unitario impresión</p>
            <p className="font-medium">
              {unitMxn != null ? formatMoney(unitMxn) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tintas / Posiciones</p>
            <p className="font-medium">
              {existingJob?.print_colors ?? "—"} · {existingJob?.print_positions ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Modo</p>
            <p className="font-medium capitalize">
              {existingJobItem.allocation_mode ?? "proporcional"}
            </p>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Uso interno. Los costos, buffers y componentes internos nunca se muestran al cliente.
      </p>

      {open && activeJob && activeJobItem && (
        <PrintJobItemDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setOpenJobId(null);
              setOpenJobItemId(null);
            }
          }}
          job={activeJob}
          jobItem={activeJobItem}
          quoteItem={item}
          allJobItems={allJobItemsForActive}
          initialReason={initialReason}
          api={api}
          rules={rules}
          settings={settings}
          disabled={disabled}
          onSavedManual={handleSyncLegacy}
        />
      )}
    </div>
  );
}
