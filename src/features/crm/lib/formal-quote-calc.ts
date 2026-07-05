// Cálculo de totales de cotización formal. Precios ANTES de IVA.
// No expone costos, márgenes ni datos de proveedor.

export interface ItemLike {
  cantidad: number | null | undefined;
  precio_unitario: number | null | undefined;
  descuento_pct: number | null | undefined;
  setup_fee?: number | null | undefined;
  print_unit_price?: number | null | undefined;
}

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function calcItemSubtotal(item: ItemLike): number {
  const cantidad = n(item.cantidad);
  const precio = n(item.precio_unitario);
  const desc = n(item.descuento_pct);
  const setup = n(item.setup_fee);
  const printUnit = n(item.print_unit_price);
  const base = cantidad * precio * (1 - desc);
  return round2(base + setup + cantidad * printUnit);
}

export interface QuoteTotals {
  subtotal: number;
  tax_amount: number;
  total: number;
}

export function calcQuoteTotals(items: ItemLike[], taxRate: number): QuoteTotals {
  const subtotal = round2(items.reduce((acc, it) => acc + calcItemSubtotal(it), 0));
  const tax_amount = round2(subtotal * n(taxRate));
  const total = round2(subtotal + tax_amount);
  return { subtotal, tax_amount, total };
}

export function formatMoney(v: number | null | undefined): string {
  const num = n(v);
  try {
    return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

export function formatDateMx(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
