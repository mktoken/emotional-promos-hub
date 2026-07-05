import { useEffect } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useFormalQuote,
  useFormalQuoteItems,
  logFormalQuoteEvent,
} from "@/features/crm/hooks/useFormalQuotes";
import { useCompanyFull } from "@/features/crm/hooks/useCompanyFull";
import { useBankAccounts } from "@/features/crm/hooks/useBankAccounts";
import { useAsesorProfile } from "@/features/crm/hooks/useCotizaciones";
import {
  calcItemSubtotal,
  calcQuoteTotals,
  formatMoney,
  formatDateMx,
} from "@/features/crm/lib/formal-quote-calc";

const STAFF = new Set(["admin", "sales_manager", "sales_agent"]);

interface ClienteShape {
  nombre?: string | null;
  empresa?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  rfc?: string | null;
  modalidad_cotizacion?: string | null;
  modalidad_cotizacion_label?: string | null;
  formato_propuesta?: string | null;
}

interface CompanySnap {
  nombre_empresa?: string | null;
  email_general?: string | null;
  whatsapp_general?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  logo_url?: string | null;
}
interface AdvisorSnap {
  full_name?: string | null;
  cargo?: string | null;
  email_comercial?: string | null;
  whatsapp?: string | null;
  firma?: string | null;
}
interface BankSnap {
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  clabe?: string | null;
  currency?: string | null;
  reference_instructions?: string | null;
  branch?: string | null;
}

export default function FormalQuotePrint() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const auth = useCrmAuth();
  const loc = useLocation();
  const isStaff = auth.roles.some((r) => STAFF.has(r));

  const q = useFormalQuote(quoteId);
  const items = useFormalQuoteItems(quoteId);
  const companyLive = useCompanyFull();
  const banksLive = useBankAccounts();
  const asesorLive = useAsesorProfile(q.data?.assigned_to);

  useEffect(() => {
    if (q.data?.id) {
      void logFormalQuoteEvent(q.data.id, "PDF_GENERATED", { from: "print_view" });
    }
  }, [q.data?.id]);

  if (auth.loading || q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (!isStaff || !q.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="font-medium">No disponible</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/crm/cotizaciones-formales">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const quote = q.data;
  const cliente = (quote.cliente ?? {}) as ClienteShape;
  const list = items.data ?? [];
  const taxRate = Number(quote.tax_rate ?? 0.16);
  const totals = calcQuoteTotals(list, taxRate);

  // Snapshot preferido si existe; si no, datos vivos
  const company: CompanySnap =
    (quote.company_snapshot as CompanySnap | null) ??
    (companyLive.data
      ? {
          nombre_empresa: companyLive.data.nombre_empresa,
          email_general: companyLive.data.email_general,
          whatsapp_general: companyLive.data.whatsapp_general,
          telefono: companyLive.data.telefono,
          direccion: companyLive.data.direccion,
          logo_url: companyLive.data.logo_url,
        }
      : {});

  const advisor: AdvisorSnap =
    (quote.advisor_snapshot as AdvisorSnap | null) ??
    (asesorLive.data
      ? {
          full_name: asesorLive.data.full_name,
          cargo: asesorLive.data.cargo,
          email_comercial: asesorLive.data.email_comercial,
          whatsapp: asesorLive.data.whatsapp,
          firma: asesorLive.data.firma,
        }
      : {});

  const bank: BankSnap =
    (quote.bank_account_snapshot as BankSnap | null) ??
    (() => {
      const def =
        (banksLive.data ?? []).find((b) => b.is_default) ?? (banksLive.data ?? [])[0];
      if (!def) return {};
      return {
        bank_name: def.bank_name,
        account_holder: def.account_holder,
        account_number: def.account_number,
        clabe: def.clabe,
        currency: def.currency,
        reference_instructions: def.reference_instructions,
        branch: def.branch,
      };
    })();

  const hasDireccion = (company.direccion ?? "").trim() !== "";

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Toolbar (no imprime) */}
      <div className="print:hidden sticky top-0 z-10 border-b bg-white/90 backdrop-blur px-4 py-2 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/crm/cotizaciones-formales/${quote.id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver al editor
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-6 print:p-0">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-6 pb-4 border-b border-neutral-300">
          <div className="min-w-0">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.nombre_empresa ?? "Logo"}
                className="h-16 w-auto object-contain mb-2"
              />
            ) : null}
            <h1 className="text-lg font-bold">
              {company.nombre_empresa ?? "Promocionales Emocionales"}
            </h1>
            {hasDireccion && (
              <p className="text-xs text-neutral-600 whitespace-pre-line">
                {company.direccion}
              </p>
            )}
            <div className="text-xs text-neutral-600 mt-1 space-y-0.5">
              {company.telefono && <p>Tel: {company.telefono}</p>}
              {company.whatsapp_general && <p>WhatsApp: {company.whatsapp_general}</p>}
              {company.email_general && <p>Email: {company.email_general}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Cotización
            </p>
            <p className="text-xl font-mono font-bold">{quote.folio}</p>
            <p className="text-xs text-neutral-600 mt-1">
              Emitida: {formatDateMx(quote.issued_at ?? quote.created_at)}
            </p>
            <p className="text-xs text-neutral-600">
              Válida hasta: <strong>{formatDateMx(quote.valid_until)}</strong>
            </p>
          </div>
        </div>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-6 py-4">
          <div>
            <p className="text-xs uppercase text-neutral-500 mb-1">Cliente</p>
            <p className="font-semibold">{cliente.nombre ?? "—"}</p>
            {cliente.empresa && <p className="text-sm">{cliente.empresa}</p>}
            {cliente.rfc && <p className="text-xs text-neutral-600">RFC: {cliente.rfc}</p>}
            <div className="text-xs text-neutral-600 mt-1 space-y-0.5">
              {cliente.email && <p>{cliente.email}</p>}
              {cliente.telefono && <p>Tel: {cliente.telefono}</p>}
              {cliente.whatsapp && <p>WhatsApp: {cliente.whatsapp}</p>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-500 mb-1">Asesor</p>
            {advisor.full_name && <p className="font-semibold">{advisor.full_name}</p>}
            {advisor.cargo && <p className="text-sm">{advisor.cargo}</p>}
            <div className="text-xs text-neutral-600 mt-1 space-y-0.5">
              {advisor.email_comercial && <p>{advisor.email_comercial}</p>}
              {advisor.whatsapp && <p>WhatsApp: {advisor.whatsapp}</p>}
            </div>
          </div>
        </div>

        {/* Partidas */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="p-2 border border-neutral-300 w-10">#</th>
              <th className="p-2 border border-neutral-300">Producto</th>
              <th className="p-2 border border-neutral-300 text-right w-16">Cant.</th>
              <th className="p-2 border border-neutral-300 text-right w-24">P. Unit.</th>
              <th className="p-2 border border-neutral-300 text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => {
              const sub = calcItemSubtotal(it);
              return (
                <tr key={it.id} className="align-top break-inside-avoid">
                  <td className="p-2 border border-neutral-300 text-xs">
                    {it.position}
                  </td>
                  <td className="p-2 border border-neutral-300">
                    <div className="flex gap-3">
                      {it.imagen_url && (
                        <img
                          src={it.imagen_url}
                          alt={it.modelo_comercial}
                          className="w-14 h-14 object-contain bg-neutral-50 shrink-0 border border-neutral-200"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{it.modelo_comercial}</p>
                        {it.color && (
                          <p className="text-xs text-neutral-600">Color: {it.color}</p>
                        )}
                        {it.descripcion && (
                          <p className="text-xs whitespace-pre-line">{it.descripcion}</p>
                        )}
                        {it.print_method && (
                          <p className="text-xs text-neutral-600">
                            Impresión: {it.print_method}
                            {it.print_colors ? ` · ${it.print_colors} tinta(s)` : ""}
                          </p>
                        )}
                        {(Number(it.setup_fee) > 0 || Number(it.print_unit_price) > 0) && (
                          <p className="text-xs text-neutral-600">
                            {Number(it.setup_fee) > 0 &&
                              `Setup: ${formatMoney(Number(it.setup_fee))} · `}
                            {Number(it.print_unit_price) > 0 &&
                              `Impresión unit.: ${formatMoney(Number(it.print_unit_price))}`}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-xs text-neutral-600 italic mt-0.5">
                            {it.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border border-neutral-300 text-right">
                    {it.cantidad} {it.unidad}
                  </td>
                  <td className="p-2 border border-neutral-300 text-right">
                    {formatMoney(Number(it.precio_unitario))}
                    {Number(it.descuento_pct) > 0 && (
                      <div className="text-xs text-neutral-500">
                        -{(Number(it.descuento_pct) * 100).toFixed(0)}%
                      </div>
                    )}
                  </td>
                  <td className="p-2 border border-neutral-300 text-right font-medium">
                    {formatMoney(sub)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mt-4">
          <div className="w-full sm:w-72 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{formatMoney(totals.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-neutral-300">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
            <p className="text-[10px] text-neutral-500 pt-1">
              Precios en {quote.currency}. Los precios se muestran antes de IVA; el IVA
              se desglosa al final.
            </p>
          </div>
        </div>

        {/* Condiciones */}
        {(quote.condiciones_pago ||
          quote.condiciones_entrega ||
          quote.notas_publicas) && (
          <div className="mt-6 pt-4 border-t border-neutral-300 grid sm:grid-cols-2 gap-4 text-sm break-inside-avoid">
            {quote.condiciones_pago && (
              <div>
                <p className="text-xs uppercase text-neutral-500 mb-1">
                  Condiciones de pago
                </p>
                <p className="whitespace-pre-line">{quote.condiciones_pago}</p>
              </div>
            )}
            {quote.condiciones_entrega && (
              <div>
                <p className="text-xs uppercase text-neutral-500 mb-1">
                  Condiciones de entrega
                </p>
                <p className="whitespace-pre-line">{quote.condiciones_entrega}</p>
              </div>
            )}
            {quote.notas_publicas && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-neutral-500 mb-1">Notas</p>
                <p className="whitespace-pre-line">{quote.notas_publicas}</p>
              </div>
            )}
          </div>
        )}

        {/* Datos bancarios */}
        {(bank.bank_name || bank.clabe || bank.account_number) && (
          <div className="mt-6 pt-4 border-t border-neutral-300 text-sm break-inside-avoid">
            <p className="text-xs uppercase text-neutral-500 mb-1">
              Datos para depósito / transferencia
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
              {bank.bank_name && (
                <p>
                  <strong>Banco:</strong> {bank.bank_name}
                </p>
              )}
              {bank.account_holder && (
                <p>
                  <strong>Beneficiario:</strong> {bank.account_holder}
                </p>
              )}
              {bank.branch && (
                <p>
                  <strong>Sucursal:</strong> {bank.branch}
                </p>
              )}
              {bank.account_number && (
                <p>
                  <strong>Cuenta:</strong> {bank.account_number}
                </p>
              )}
              {bank.clabe && (
                <p>
                  <strong>CLABE:</strong> {bank.clabe}
                </p>
              )}
              {bank.currency && (
                <p>
                  <strong>Moneda:</strong> {bank.currency}
                </p>
              )}
            </div>
            {bank.reference_instructions && (
              <p className="mt-2 text-xs text-neutral-600 whitespace-pre-line">
                {bank.reference_instructions}
              </p>
            )}
          </div>
        )}

        {/* Firma */}
        {(advisor.firma || advisor.full_name) && (
          <div className="mt-8 pt-4 border-t border-neutral-300 break-inside-avoid">
            {advisor.firma && (
              <p className="text-sm whitespace-pre-line">{advisor.firma}</p>
            )}
            {!advisor.firma && advisor.full_name && (
              <p className="text-sm">
                Atentamente,
                <br />
                {advisor.full_name}
                {advisor.cargo ? ` — ${advisor.cargo}` : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
