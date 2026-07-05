import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Printer,
  Send,
  ChevronDown,
  Calculator,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useFormalQuote,
  useFormalQuoteItems,
  useUpdateFormalQuote,
  useInsertFormalQuoteItem,
  useUpdateFormalQuoteItem,
  useDeleteFormalQuoteItem,
  logFormalQuoteEvent,
  type FormalQuoteItemRow,
} from "@/features/crm/hooks/useFormalQuotes";
import { useCompanyFull } from "@/features/crm/hooks/useCompanyFull";
import { useBankAccounts } from "@/features/crm/hooks/useBankAccounts";
import { useAsesorProfile } from "@/features/crm/hooks/useCotizaciones";
import {
  calcItemSubtotal,
  calcQuoteTotals,
  formatMoney,
} from "@/features/crm/lib/formal-quote-calc";
import {
  FORMAL_QUOTE_STATUS_LABEL,
  FORMAL_QUOTE_STATUS_BADGE,
  FORMAL_QUOTE_STATUSES,
  normalizeFormalStatus,
} from "@/features/crm/lib/formal-quote-status";
import { usePrintSettings } from "@/features/crm/hooks/usePrintSettings";
import { usePrintRules } from "@/features/crm/hooks/usePrintRules";
import {
  calcPrintEngine,
  type PrintEngineResult,
} from "@/features/crm/lib/print-engine";
import type { Json } from "@/integrations/supabase/types";

const STAFF = new Set(["admin", "sales_manager", "sales_agent"]);

interface ClienteShape {
  nombre?: string | null;
  empresa?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  rfc?: string | null;
}

export default function FormalQuoteEditor() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const nav = useNavigate();
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF.has(r));
  const qc = useQueryClient();

  const quote = useFormalQuote(quoteId);
  const items = useFormalQuoteItems(quoteId);
  const company = useCompanyFull();
  const banks = useBankAccounts();
  const asesor = useAsesorProfile(quote.data?.assigned_to);

  const updateQuote = useUpdateFormalQuote(quoteId);
  const insertItem = useInsertFormalQuoteItem(quoteId);
  const updateItem = useUpdateFormalQuoteItem();
  const deleteItem = useDeleteFormalQuoteItem(quoteId);

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [cliente, setCliente] = useState<ClienteShape>({});
  const [validUntil, setValidUntil] = useState<string>("");
  const [condPago, setCondPago] = useState<string>("");
  const [condEntrega, setCondEntrega] = useState<string>("");
  const [notasPub, setNotasPub] = useState<string>("");
  const [notasInt, setNotasInt] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0.16);

  // ===== Motor interno de impresión (Sprint 3.0C) — datos INTERNOS del CRM =====
  const printSettings = usePrintSettings();
  const printRules = usePrintRules();
  const [peOpen, setPeOpen] = useState<boolean>(false);
  const [peItemId, setPeItemId] = useState<string>("");
  const [peMethodId, setPeMethodId] = useState<string>("");
  const [peColors, setPeColors] = useState<number>(1);
  const [pePositions, setPePositions] = useState<number>(1);
  const [peMaterial, setPeMaterial] = useState<string>("");
  const [peCategory, setPeCategory] = useState<string>("");
  const [peLogisticsFee, setPeLogisticsFee] = useState<number>(350);
  const [peLogisticsJobs, setPeLogisticsJobs] = useState<number>(1);
  const [peResult, setPeResult] = useState<PrintEngineResult | null>(null);
  const [peOverride, setPeOverride] = useState<string>("");
  const [peOverrideReason, setPeOverrideReason] = useState<string>("");
  const [peOverrideError, setPeOverrideError] = useState<string>("");

  useEffect(() => {
    if (!quote.data) return;
    setCliente((quote.data.cliente ?? {}) as ClienteShape);
    setValidUntil(quote.data.valid_until ?? "");
    setCondPago(quote.data.condiciones_pago ?? "");
    setCondEntrega(quote.data.condiciones_entrega ?? "");
    setNotasPub(quote.data.notas_publicas ?? "");
    setNotasInt(quote.data.notas_internas ?? "");
    setTaxRate(Number(quote.data.tax_rate ?? 0.16));
    setPeLogisticsFee(Number(quote.data.logistics_fee_mxn ?? 350));
    setPeLogisticsJobs(Number(quote.data.logistics_job_count ?? 1));
    setPeOverride(
      quote.data.price_override_mxn != null
        ? String(quote.data.price_override_mxn)
        : "",
    );
    setPeOverrideReason(quote.data.price_override_reason ?? "");
  }, [quote.data]);

  useEffect(() => {
    if (selectedBankId) return;
    const snap = (quote.data?.bank_account_snapshot ?? null) as {
      id?: string;
    } | null;
    if (snap?.id) {
      setSelectedBankId(snap.id);
      return;
    }
    const def = (banks.data ?? []).find((b) => b.is_default) ?? (banks.data ?? [])[0];
    if (def) setSelectedBankId(def.id);
  }, [banks.data, quote.data, selectedBankId]);

  // Auto-recalcular subtotales de partidas que vengan en 0 (bug legacy)
  useEffect(() => {
    const list = items.data;
    if (!list || list.length === 0) return;
    if (isStaff !== true) return;
    const toFix = list.filter((it) => {
      const calc = calcItemSubtotal(it);
      return Number(it.subtotal ?? 0) === 0 && calc > 0;
    });
    if (toFix.length === 0) return;
    void (async () => {
      for (const it of toFix) {
        const calc = calcItemSubtotal(it);
        const { error } = await supabase
          .from("formal_quote_items")
          .update({ subtotal: calc })
          .eq("id", it.id);
        if (error) {
          console.warn("[formal-quote] recalc subtotal failed", error.message);
        }
      }
      qc.invalidateQueries({ queryKey: ["formal_quote_items", quoteId] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.data]);

  const totals = useMemo(() => {
    const list = items.data ?? [];
    return calcQuoteTotals(list, taxRate);
  }, [items.data, taxRate]);

  if (auth.loading || quote.isLoading) {
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
      </Card>
    );
  }

  if (quote.error || !quote.data) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No pudimos cargar esta cotización</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/crm/cotizaciones-formales">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const q = quote.data;
  const status = normalizeFormalStatus(q.status);
  const isLocked = status === "ACEPTADA" || status === "CANCELADA";

  // ===== Handlers Motor de impresión (INTERNO) =====
  const peSelectedItem =
    (items.data ?? []).find((it) => it.id === peItemId) ?? null;
  const peQty = Math.max(1, Math.floor(Number(peSelectedItem?.cantidad ?? 0)));

  const handleCalcPrint = () => {
    if (!printSettings.data) {
      toast.error("Configuración del motor no disponible.");
      return;
    }
    if (!peMethodId) {
      toast.error("Selecciona una técnica.");
      return;
    }
    if (!peSelectedItem) {
      toast.error("Selecciona una partida.");
      return;
    }
    const result = calcPrintEngine(
      {
        print_method_id: peMethodId,
        qty: peQty,
        colors: peColors,
        positions: pePositions,
        logistics_fee_mxn: peLogisticsFee,
        logistics_job_count: peLogisticsJobs,
        material: peMaterial || null,
        product_category: peCategory || null,
      },
      printSettings.data,
      printRules.pricing.data ?? [],
      printRules.compat.data ?? [],
    );
    setPeResult(result);
  };

  const handleApplySuggested = async () => {
    if (!peResult || !peSelectedItem) return;
    try {
      const newUnit = peResult.suggested_unit_price;
      const newSetup = peResult.suggested_setup_fee;
      const merged = {
        ...peSelectedItem,
        print_unit_price: newUnit,
        setup_fee: newSetup,
        print_method: peMethodId
          ? (printRules.methods.data ?? []).find((m) => m.id === peMethodId)?.name ??
            peSelectedItem.print_method ??
            null
          : peSelectedItem.print_method,
        print_colors: peColors,
      };
      const newSubtotal = calcItemSubtotal(merged);
      await updateItem.mutateAsync({
        id: peSelectedItem.id,
        values: {
          print_unit_price: newUnit,
          setup_fee: newSetup,
          print_method: merged.print_method,
          print_colors: peColors,
          subtotal: newSubtotal,
        },
      });
      await handleSaveSnapshot(peResult, false);
      toast.success("Precio sugerido aplicado a la partida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al aplicar precio");
    }
  };

  const handleSaveSnapshot = async (
    result: PrintEngineResult,
    withOverride: boolean,
  ) => {
    const snapshot = {
      version: "3.0C",
      generated_at: new Date().toISOString(),
      input: {
        item_id: peSelectedItem?.id ?? null,
        print_method_id: peMethodId,
        qty: peQty,
        colors: peColors,
        positions: pePositions,
        material: peMaterial || null,
        product_category: peCategory || null,
      },
      settings: {
        default_margin_pct: printSettings.data?.default_margin_pct ?? null,
        minimum_profit_mxn: printSettings.data?.minimum_profit_mxn ?? null,
        operational_buffer_pct: printSettings.data?.operational_buffer_pct ?? null,
      },
      result,
      override: withOverride
        ? {
            price_override_mxn: Number(peOverride),
            reason: peOverrideReason,
            at: new Date().toISOString(),
          }
        : null,
    };
    const patch: {
      logistics_fee_mxn: number;
      logistics_job_count: number;
      print_engine_snapshot: Json;
      price_override_mxn?: number | null;
      price_override_reason?: string | null;
    } = {
      logistics_fee_mxn: peLogisticsFee,
      logistics_job_count: peLogisticsJobs,
      print_engine_snapshot: snapshot as unknown as Json,
    };
    if (withOverride) {
      patch.price_override_mxn = Number(peOverride);
      patch.price_override_reason = peOverrideReason;
    }
    await updateQuote.mutateAsync(patch as never);
    await logFormalQuoteEvent(q.id, "PRINT_ENGINE_SNAPSHOT", {
      override: withOverride,
    });
  };

  const handleSaveSnapshotClick = async () => {
    if (!peResult) {
      toast.error("Primero calcula el motor.");
      return;
    }
    try {
      await handleSaveSnapshot(peResult, false);
      toast.success("Snapshot guardado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar snapshot");
    }
  };

  const handleSaveOverride = async () => {
    setPeOverrideError("");
    const val = Number(peOverride);
    if (!peOverride || !Number.isFinite(val) || val <= 0) {
      setPeOverrideError("Ingresa un monto de override válido.");
      return;
    }
    if (!peOverrideReason || peOverrideReason.trim().length < 10) {
      setPeOverrideError("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    try {
      if (peResult) {
        await handleSaveSnapshot(peResult, true);
      } else {
        await updateQuote.mutateAsync({
          price_override_mxn: val,
          price_override_reason: peOverrideReason,
        } as never);
      }
      toast.success("Override manual guardado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar override");
    }
  };

  const handleClearOverride = async () => {
    try {
      await updateQuote.mutateAsync({
        price_override_mxn: null,
        price_override_reason: null,
      } as never);
      setPeOverride("");
      setPeOverrideReason("");
      setPeOverrideError("");
      toast.success("Override removido.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };


  const handleSaveHeader = async () => {
    try {
      await updateQuote.mutateAsync({
        cliente: cliente as unknown as never,
        valid_until: validUntil || undefined,
        condiciones_pago: condPago || null,
        condiciones_entrega: condEntrega || null,
        notas_publicas: notasPub || null,
        notas_internas: notasInt || null,
        tax_rate: taxRate,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total: totals.total,
      });
      await logFormalQuoteEvent(q.id, "UPDATED", { section: "header" });
      toast.success("Guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleAddManual = async () => {
    try {
      const nextPos = (items.data ?? []).reduce((m, it) => Math.max(m, it.position), 0) + 1;
      await insertItem.mutateAsync({
        position: nextPos,
        source: "MANUAL",
        modelo_comercial: "Nuevo producto",
        cantidad: 1,
        precio_unitario: 0,
        descuento_pct: 0,
        subtotal: 0,
        unidad: "PZA",
        setup_fee: 0,
        print_unit_price: 0,
      });
      toast.success("Partida agregada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const patchItem = async (
    it: FormalQuoteItemRow,
    values: Partial<FormalQuoteItemRow>,
  ) => {
    const merged: FormalQuoteItemRow = { ...it, ...values };
    const newSubtotal = calcItemSubtotal(merged);
    await updateItem.mutateAsync({
      id: it.id,
      values: {
        ...values,
        subtotal: newSubtotal,
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta partida?")) return;
    await deleteItem.mutateAsync(id);
    toast.success("Eliminada");
  };

  const handlePersistTotals = async () => {
    await updateQuote.mutateAsync({
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      tax_rate: taxRate,
    });
  };

  const handleEmitir = async () => {
    try {
      await handlePersistTotals();
      const selectedBank = (banks.data ?? []).find((b) => b.id === selectedBankId);
      const bank_account_snapshot = selectedBank
        ? {
            id: selectedBank.id,
            bank_name: selectedBank.bank_name,
            account_holder: selectedBank.account_holder,
            account_number: selectedBank.account_number,
            clabe: selectedBank.clabe,
            currency: selectedBank.currency,
            reference_instructions: selectedBank.reference_instructions,
            branch: selectedBank.branch,
          }
        : null;
      const company_snapshot = company.data
        ? {
            nombre_empresa: company.data.nombre_empresa,
            email_general: company.data.email_general,
            whatsapp_general: company.data.whatsapp_general,
            telefono: company.data.telefono,
            direccion: company.data.direccion,
            logo_url: company.data.logo_url,
          }
        : null;
      const advisor_snapshot = asesor.data
        ? {
            id: asesor.data.id,
            full_name: asesor.data.full_name,
            cargo: asesor.data.cargo,
            email_comercial: asesor.data.email_comercial,
            whatsapp: asesor.data.whatsapp,
            firma: asesor.data.firma,
          }
        : null;

      await updateQuote.mutateAsync({
        status: "EMITIDA",
        issued_at: new Date().toISOString(),
        company_snapshot: company_snapshot as unknown as never,
        advisor_snapshot: advisor_snapshot as unknown as never,
        bank_account_snapshot: bank_account_snapshot as unknown as never,
      });
      await logFormalQuoteEvent(q.id, "ISSUED", {});
      toast.success("Cotización emitida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al emitir");
    }
  };

  const handleStatusChange = async (next: string) => {
    if (next === status) return;
    const { error } = await supabase
      .from("formal_quotes")
      .update({ status: next })
      .eq("id", q.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["formal_quotes"] });
    toast.success("Estado actualizado");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/crm/cotizaciones-formales" aria-label="Volver">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-mono">{q.folio}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant={FORMAL_QUOTE_STATUS_BADGE[status]}>
                {FORMAL_QUOTE_STATUS_LABEL[status]}
              </Badge>
              {(() => {
                const cli = (q.cliente ?? {}) as Record<string, unknown>;
                const label =
                  (typeof cli.modalidad_cotizacion_label === "string" && cli.modalidad_cotizacion_label) ||
                  (cli.modalidad_cotizacion === "KIT"
                    ? "Armar kit o paquete"
                    : cli.modalidad_cotizacion === "INDIVIDUAL"
                      ? "Cotizar por separado"
                      : null);
                return label ? (
                  <Badge variant="outline">Modalidad: {label}</Badge>
                ) : null;
              })()}
              <span className="text-xs text-muted-foreground">
                Total: {formatMoney(totals.total)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void logFormalQuoteEvent(q.id, "PDF_GENERATED", {});
              nav(`/crm/cotizaciones-formales/${q.id}/imprimir`);
            }}
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
          </Button>
          {status === "BORRADOR" && (
            <Button size="sm" onClick={handleEmitir} disabled={updateQuote.isPending}>
              <Send className="w-4 h-4 mr-2" /> Marcar como emitida
            </Button>
          )}
        </div>
      </div>

      {/* Status + valid_until */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger aria-label="Cambiar estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAL_QUOTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {FORMAL_QUOTE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vigencia</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={validUntil ?? ""}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={isLocked}
              aria-label="Vigencia"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">IVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                disabled={isLocked}
                aria-label="Tasa de IVA"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ({(taxRate * 100).toFixed(0)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field
            label="Nombre"
            value={cliente.nombre ?? ""}
            onChange={(v) => setCliente({ ...cliente, nombre: v })}
            disabled={isLocked}
          />
          <Field
            label="Empresa"
            value={cliente.empresa ?? ""}
            onChange={(v) => setCliente({ ...cliente, empresa: v })}
            disabled={isLocked}
          />
          <Field
            label="Email"
            value={cliente.email ?? ""}
            onChange={(v) => setCliente({ ...cliente, email: v })}
            disabled={isLocked}
          />
          <Field
            label="Teléfono"
            value={cliente.telefono ?? ""}
            onChange={(v) => setCliente({ ...cliente, telefono: v })}
            disabled={isLocked}
          />
          <Field
            label="WhatsApp"
            value={cliente.whatsapp ?? ""}
            onChange={(v) => setCliente({ ...cliente, whatsapp: v })}
            disabled={isLocked}
          />
          <Field
            label="RFC (opcional)"
            value={cliente.rfc ?? ""}
            onChange={(v) => setCliente({ ...cliente, rfc: v })}
            disabled={isLocked}
          />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Partidas ({items.data?.length ?? 0})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddManual}
            disabled={isLocked || insertItem.isPending}
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar manual
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          {!items.isLoading && (items.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin partidas. Agrega una manualmente.
            </p>
          )}
          {(items.data ?? []).map((it) => (
            <ItemEditor
              key={it.id}
              item={it}
              disabled={isLocked}
              onPatch={(v) => patchItem(it, v)}
              onDelete={() => handleDelete(it.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Motor de impresión (INTERNO — Sprint 3.0C) */}
      <Card className="border-primary/30">
        <Collapsible open={peOpen} onOpenChange={setPeOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              aria-expanded={peOpen}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">
                  Motor de impresión (interno)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Sólo CRM · no se muestra al cliente
                </Badge>
                {q.price_override_mxn != null && (
                  <Badge variant="destructive" className="text-[10px]">
                    Override manual activo
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${peOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {(printSettings.isLoading || printRules.isLoading) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando reglas
                  internas…
                </div>
              )}
              {(printSettings.error || printRules.error) && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  No se pudieron cargar las reglas internas.
                </div>
              )}
              {!printSettings.isLoading && !printSettings.data && (
                <div className="rounded-md border border-amber-500/50 bg-amber-50 p-2 text-xs text-amber-900">
                  No hay configuración de motor cargada.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Partida con impresión</Label>
                  <Select value={peItemId} onValueChange={setPeItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona partida" />
                    </SelectTrigger>
                    <SelectContent>
                      {(items.data ?? []).map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          #{it.position} · {it.modelo_comercial ?? "Sin nombre"}
                          {" · "}
                          {it.cantidad ?? 0} pzs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Técnica</Label>
                  <Select value={peMethodId} onValueChange={setPeMethodId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona técnica" />
                    </SelectTrigger>
                    <SelectContent>
                      {(printRules.methods.data ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={peQty}
                    disabled
                    aria-readonly="true"
                  />
                </div>
                <div>
                  <Label>Tintas / colores</Label>
                  <Input
                    type="number"
                    min={1}
                    value={peColors}
                    onChange={(e) => setPeColors(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <Label>Posiciones</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pePositions}
                    onChange={(e) =>
                      setPePositions(Math.max(1, Number(e.target.value)))
                    }
                  />
                </div>
                <div>
                  <Label>Material (opcional)</Label>
                  <Input
                    value={peMaterial}
                    placeholder="p.ej. plastico, PET, metal"
                    onChange={(e) => setPeMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Categoría producto (opcional)</Label>
                  <Input
                    value={peCategory}
                    placeholder="p.ej. termo, pluma, textil"
                    onChange={(e) => setPeCategory(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Logística MXN por trabajo</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={peLogisticsFee}
                    onChange={(e) =>
                      setPeLogisticsFee(Math.max(0, Number(e.target.value)))
                    }
                  />
                </div>
                <div>
                  <Label>Cantidad de trabajos</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={peLogisticsJobs}
                    onChange={(e) =>
                      setPeLogisticsJobs(Math.max(0, Math.floor(Number(e.target.value))))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleCalcPrint}
                  disabled={
                    isLocked ||
                    !peMethodId ||
                    !peItemId ||
                    printSettings.isLoading ||
                    printRules.isLoading
                  }
                >
                  <Calculator className="w-4 h-4 mr-2" /> Calcular impresión
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplySuggested}
                  disabled={!peResult || isLocked || updateItem.isPending}
                >
                  Aplicar precio sugerido
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveSnapshotClick}
                  disabled={!peResult || isLocked || updateQuote.isPending}
                >
                  Guardar snapshot
                </Button>
              </div>

              {peResult && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {peResult.compatibility_status === "recommended" && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">
                        Recomendada
                      </Badge>
                    )}
                    {peResult.compatibility_status === "allowed" && (
                      <Badge variant="secondary">Permitida</Badge>
                    )}
                    {peResult.compatibility_status === "validation_required" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        Validación requerida
                      </Badge>
                    )}
                    {peResult.compatibility_status === "not_recommended" && (
                      <Badge variant="destructive">No recomendada</Badge>
                    )}
                    {peResult.compatibility_status == null && (
                      <Badge variant="outline">Sin compatibilidad</Badge>
                    )}
                    {peResult.applied_min_profit && (
                      <Badge variant="outline">Utilidad mínima aplicada</Badge>
                    )}
                  </div>

                  {peResult.warnings.length > 0 && (
                    <div className="space-y-1">
                      {peResult.warnings.map((w) => (
                        <div
                          key={w.code}
                          className={`flex items-start gap-2 rounded p-2 ${
                            w.severity === "error"
                              ? "bg-destructive/10 text-destructive"
                              : w.severity === "warning"
                                ? "bg-amber-50 text-amber-900"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-mono mr-1">{w.code}</span>
                            {w.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 pt-2 border-t border-border/50">
                    <PeRow k="Costo base impresión" v={peResult.base_print_cost} />
                    <PeRow
                      k="Costos adicionales internos"
                      v={peResult.additional_internal_costs}
                    />
                    <PeRow k="Logística interna" v={peResult.logistics} />
                    <PeRow k="Buffer operativo" v={peResult.buffer} />
                    <PeRow k="Costo interno completo" v={peResult.internal_total} />
                    <PeRow k="Precio por margen 40%" v={peResult.price_by_margin} />
                    <PeRow k="Precio por utilidad mín." v={peResult.price_by_min_profit} />
                    <PeRow
                      k="Precio sugerido cliente"
                      v={peResult.suggested_customer_price}
                      strong
                    />
                    <PeRow
                      k="Precio unitario cliente"
                      v={peResult.suggested_unit_price}
                      strong
                    />
                    <PeRow k="Utilidad estimada" v={peResult.estimated_profit} />
                    <PeRow k="Piezas facturables" v={peResult.billable_qty} raw />
                  </div>
                </div>
              )}

              <div className="rounded-md border border-amber-500/40 bg-amber-50/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-medium text-amber-900">
                    Override manual del precio de impresión
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Precio impresión MXN (override)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={peOverride}
                      onChange={(e) => setPeOverride(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Motivo (mín. 10 caracteres)</Label>
                    <Textarea
                      rows={2}
                      value={peOverrideReason}
                      onChange={(e) => setPeOverrideReason(e.target.value)}
                    />
                  </div>
                </div>
                {peOverrideError && (
                  <p className="text-xs text-destructive">{peOverrideError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveOverride}
                    disabled={isLocked || updateQuote.isPending}
                  >
                    Guardar override
                  </Button>
                  {q.price_override_mxn != null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearOverride}
                      disabled={isLocked || updateQuote.isPending}
                    >
                      Quitar override
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground italic">
                Motor interno. Los costos, márgenes, logística, buffer, snapshot y
                override NO se muestran en PDF ni email al cliente.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Totales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <TotalRow k="Subtotal" v={formatMoney(totals.subtotal)} />
          <TotalRow
            k={`IVA (${(taxRate * 100).toFixed(0)}%)`}
            v={formatMoney(totals.tax_amount)}
          />
          <div className="flex justify-between font-semibold text-base pt-2 border-t border-border/50">
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Condiciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condiciones y notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="condp">Condiciones de pago</Label>
            <Textarea
              id="condp"
              rows={2}
              value={condPago}
              onChange={(e) => setCondPago(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label htmlFor="conde">Condiciones de entrega</Label>
            <Textarea
              id="conde"
              rows={2}
              value={condEntrega}
              onChange={(e) => setCondEntrega(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label htmlFor="notaspub">Notas públicas (aparecen en la cotización)</Label>
            <Textarea
              id="notaspub"
              rows={2}
              value={notasPub}
              onChange={(e) => setNotasPub(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label htmlFor="notasint">Notas internas (no se imprimen)</Label>
            <Textarea
              id="notasint"
              rows={2}
              value={notasInt}
              onChange={(e) => setNotasInt(e.target.value)}
              disabled={isLocked}
            />
          </div>
        </CardContent>
      </Card>

      {/* Banco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos bancarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {banks.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {!banks.isLoading && (banks.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay cuentas bancarias activas.
            </p>
          )}
          {(banks.data ?? []).length > 0 && (
            <Select
              value={selectedBankId}
              onValueChange={setSelectedBankId}
              disabled={isLocked}
            >
              <SelectTrigger aria-label="Cuenta bancaria">
                <SelectValue placeholder="Selecciona cuenta" />
              </SelectTrigger>
              <SelectContent>
                {(banks.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bank_name} · {b.account_holder}
                    {b.is_default ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Al emitir se guarda un snapshot con los datos exactos del banco.
          </p>
        </CardContent>
      </Card>

      {/* Guardar */}
      <div className="flex justify-end sticky bottom-2 z-10">
        <Button
          onClick={handleSaveHeader}
          disabled={updateQuote.isPending || isLocked}
          className="shadow-lg"
        >
          {updateQuote.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const id = "f_" + label.replace(/\W+/g, "_");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function TotalRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function ItemEditor({
  item,
  disabled,
  onPatch,
  onDelete,
}: {
  item: FormalQuoteItemRow;
  disabled?: boolean;
  onPatch: (values: Partial<FormalQuoteItemRow>) => Promise<void>;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState<FormalQuoteItemRow>(item);
  useEffect(() => setLocal(item), [item]);

  const subtotal = calcItemSubtotal(local);

  const pz = (local.personalizacion ?? null) as Record<string, unknown> | null;
  const precioRef =
    pz && typeof pz === "object" && typeof pz["precio_referencia_cliente"] === "number"
      ? (pz["precio_referencia_cliente"] as number)
      : null;
  const subtotalRef =
    pz && typeof pz === "object" && typeof pz["subtotal_referencia_cliente"] === "number"
      ? (pz["subtotal_referencia_cliente"] as number)
      : null;
  const precioActual = Number(local.precio_unitario ?? 0);
  const priceDiffs =
    precioRef !== null &&
    precioRef > 0 &&
    Math.abs(precioActual - precioRef) / precioRef > 0.01;
  const subtotalDiffs =
    subtotalRef !== null && Math.abs(subtotal - subtotalRef) > 0.01;

  const commit = (values: Partial<FormalQuoteItemRow>) => {
    void onPatch(values);
  };

  return (
    <div className="border border-border/60 rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={item.source === "MANUAL" ? "secondary" : "outline"}>
            {item.source}
          </Badge>
          <span className="text-xs text-muted-foreground">#{item.position}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Eliminar partida"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label>Modelo comercial</Label>
          <Input
            value={local.modelo_comercial ?? ""}
            onChange={(e) => setLocal({ ...local, modelo_comercial: e.target.value })}
            onBlur={() => commit({ modelo_comercial: local.modelo_comercial })}
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Color</Label>
          <Input
            value={local.color ?? ""}
            onChange={(e) => setLocal({ ...local, color: e.target.value })}
            onBlur={() => commit({ color: local.color })}
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            rows={2}
            value={local.descripcion ?? ""}
            onChange={(e) => setLocal({ ...local, descripcion: e.target.value })}
            onBlur={() => commit({ descripcion: local.descripcion })}
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Imagen (URL)</Label>
          <Input
            value={local.imagen_url ?? ""}
            onChange={(e) => setLocal({ ...local, imagen_url: e.target.value })}
            onBlur={() => commit({ imagen_url: local.imagen_url })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <NumField
          label="Cantidad"
          value={local.cantidad}
          step={1}
          onChange={(n) => setLocal({ ...local, cantidad: n })}
          onCommit={(n) => commit({ cantidad: n })}
          disabled={disabled}
        />
        <NumField
          label="Precio unit."
          value={local.precio_unitario}
          step={0.01}
          onChange={(n) => setLocal({ ...local, precio_unitario: n })}
          onCommit={(n) => commit({ precio_unitario: n })}
          disabled={disabled}
        />
        <NumField
          label="Descuento (0-1)"
          value={local.descuento_pct}
          step={0.01}
          onChange={(n) => setLocal({ ...local, descuento_pct: n })}
          onCommit={(n) => commit({ descuento_pct: n })}
          disabled={disabled}
        />
        <div>
          <Label>Unidad</Label>
          <Input
            value={local.unidad ?? "PZA"}
            onChange={(e) => setLocal({ ...local, unidad: e.target.value })}
            onBlur={() => commit({ unidad: local.unidad })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
        <div>
          <Label>Técnica impresión</Label>
          <Input
            value={local.print_method ?? ""}
            onChange={(e) => setLocal({ ...local, print_method: e.target.value })}
            onBlur={() => commit({ print_method: local.print_method })}
            disabled={disabled}
            placeholder="Serigrafía / Sublimación..."
          />
        </div>
        <NumField
          label="Tintas"
          value={local.print_colors}
          step={1}
          onChange={(n) => setLocal({ ...local, print_colors: n })}
          onCommit={(n) => commit({ print_colors: n })}
          disabled={disabled}
        />
        <NumField
          label="Setup fee"
          value={local.setup_fee}
          step={0.01}
          onChange={(n) => setLocal({ ...local, setup_fee: n })}
          onCommit={(n) => commit({ setup_fee: n })}
          disabled={disabled}
        />
        <NumField
          label="Precio impresión/u"
          value={local.print_unit_price}
          step={0.01}
          onChange={(n) => setLocal({ ...local, print_unit_price: n })}
          onCommit={(n) => commit({ print_unit_price: n })}
          disabled={disabled}
        />
      </div>

      <div>
        <Label>Notas de partida</Label>
        <Textarea
          rows={2}
          value={local.notes ?? ""}
          onChange={(e) => setLocal({ ...local, notes: e.target.value })}
          onBlur={() => commit({ notes: local.notes })}
          disabled={disabled}
        />
      </div>

      {(priceDiffs || subtotalDiffs) && (
        <div className="rounded-md border border-amber-500/50 bg-amber-50 text-amber-900 p-2 text-xs space-y-1">
          {priceDiffs && precioRef !== null && (
            <p>
              ⚠ El precio unitario ({formatMoney(precioActual)}) difiere del precio de referencia
              mostrado al cliente ({formatMoney(precioRef)}). Confirma antes de emitir.
            </p>
          )}
          {subtotalDiffs && subtotalRef !== null && (
            <p>
              ⚠ El subtotal fue recalculado. Referencia del cliente: {formatMoney(subtotalRef)}. Subtotal
              actual: {formatMoney(subtotal)}.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1 border-t border-border/50">
        <span className="text-sm">
          Subtotal partida:{" "}
          <span className="font-semibold">{formatMoney(subtotal)}</span>
        </span>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  step,
  onChange,
  onCommit,
  disabled,
}: {
  label: string;
  value: number | null;
  step: number;
  onChange: (n: number) => void;
  onCommit: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={(e) => onCommit(Number(e.target.value))}
        disabled={disabled}
      />
    </div>
  );
}
