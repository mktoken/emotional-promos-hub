import { calcItemSubtotal, calcQuoteTotals, formatMoney } from "@/features/crm/lib/formal-quote-calc";
import { Button } from "@/components/ui/button";
import { chooseAgentProduct, type AgentSession } from "../lib/agent-workflow";
import { clearProductLineColor, handoffReasons, removeProductLine, selectedLineProduct, selectedProductLines,
  setProductLineColor, type AgentProductLine } from "../lib/agent-state";
import { orderedProductOptions, recommendProducts } from "../lib/agent-tools";

interface Props {
  session: AgentSession;
  setSession: (session: AgentSession) => void;
  disabled?: boolean;
  audience: "buyer" | "advisor";
}

function labelForStatus(line: AgentProductLine): string {
  return ({ considering: "Por seleccionar", selected: "Seleccionada", rejected: "Rechazada",
    removed: "Eliminada", requires_review: "Revisión requerida" })[line.status];
}

export function AgentProductLines({ session, setSession, disabled = false, audience }: Props) {
  const lines = session.state.productLines;
  const selected = selectedProductLines(session.state);
  const priced = selected.filter((line) => {
    const product = selectedLineProduct(line);
    return product?.price.status === "priced" && product.price.unitPriceBeforeTaxMxn !== null;
  });
  const totals = calcQuoteTotals(priced.map((line) => {
    const product = selectedLineProduct(line)!;
    return { cantidad: line.quantity, precio_unitario: product.price.unitPriceBeforeTaxMxn, descuento_pct: 0 };
  }), 0.16);
  const complete = selected.length > 0 && lines.filter((line) => !["removed", "rejected"].includes(line.status)).every((line) => line.status === "selected");

  if (!lines.length) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Aún no hay líneas de producto.</p>;

  return <section className="space-y-3" aria-label="Líneas de productos">
    <h2 className="font-semibold">Productos de esta conversación</h2>
    {lines.map((line, lineIndex) => {
      const chosen = selectedLineProduct(line);
      const options = orderedProductOptions(line.candidates);
      const recommended = recommendProducts(line.candidates);
      const labels = new Map(recommended.map((item) => [item.product.id, item.label]));
      return <article key={line.lineId} className={`space-y-3 rounded-xl border bg-card p-3 ${line.status === "removed" ? "opacity-70" : ""}`}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">{lineIndex + 1}. {line.productInterest} · {line.quantity ?? "cantidad por confirmar"}</h3>
            <p className="text-xs text-muted-foreground">{labelForStatus(line)}{line.color ? ` · ${line.color}` : ""}</p>
          </div>
          {line.status !== "removed" && line.status !== "rejected" && <Button size="sm" variant="outline" disabled={disabled}
            onClick={() => setSession({ ...session, state: removeProductLine(session.state, line.lineId) })}>Quitar línea</Button>}
        </header>
        {line.status === "removed" ? <p className="text-sm text-muted-foreground">Se conserva el historial; no forma parte de la cotización.</p>
          : line.candidates.length === 0 ? <p className="text-sm text-muted-foreground">No hay candidatos verificados para esta búsqueda todavía.</p>
            : <div className="grid gap-3 sm:grid-cols-2">
              {options.map((product) => <div key={product.id} className={`min-w-0 space-y-2 rounded-lg border p-3 text-sm ${product.id === line.selectedProductId ? "border-primary ring-1 ring-primary" : ""}`}>
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-28 w-full rounded object-contain" />
                  : <div className="flex h-28 items-center justify-center rounded bg-muted">Imagen no disponible</div>}
                <p className="font-medium">{product.name}{labels.has(product.id) ? ` · ${labels.get(product.id)}` : ""}</p>
                <p>SKU: {product.sku ?? "No informado"}</p>
                <p>{product.price.status === "priced" && product.price.unitPriceBeforeTaxMxn !== null
                  ? `${formatMoney(product.price.unitPriceBeforeTaxMxn)} por pieza antes de IVA e impresión`
                  : `Precio: ${product.price.status}`}</p>
                <p>{product.stockStatus === "observed" ? `Stock observado: ${product.observedStock}; disponibilidad final por confirmar`
                  : "Stock no observado; disponibilidad por confirmar"}</p>
                {product.productUrl && <a className="underline" href={product.productUrl} target="_blank" rel="noopener noreferrer">Ver ficha real</a>}
                <div><Button type="button" size="sm" variant={product.id === line.selectedProductId ? "default" : "outline"}
                  disabled={disabled || product.state === "rejected"}
                  onClick={() => setSession(chooseAgentProduct(session, product.id, line.lineId))}>
                  {product.id === line.selectedProductId ? "Seleccionada" : "Seleccionar esta opción"}
                </Button></div>
                {product.id === line.selectedProductId && product.variants.length > 0 && <label className="block space-y-1">
                  <span>Variante / color</span>
                  <select className="w-full rounded-md border bg-background p-2" aria-label={`Variante de ${line.productInterest}`}
                    value={line.selectedVariant ?? ""} disabled={disabled}
                    onChange={(event) => setSession({ ...session, state: event.target.value
                      ? setProductLineColor(session.state, line.lineId, event.target.value)
                      : clearProductLineColor(session.state, line.lineId) })}>
                    <option value="">Sin variante elegida</option>
                    {product.variants.map((variant) => <option key={variant.color} value={variant.color}>
                      {variant.color} · stock {variant.stock ?? "no observado"}
                    </option>)}
                  </select>
                </label>}
              </div>)}
            </div>}
        {chosen && <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p>Precio unitario: {chosen.price.status === "priced" && chosen.price.unitPriceBeforeTaxMxn !== null
            ? `${formatMoney(chosen.price.unitPriceBeforeTaxMxn)} antes de IVA e impresión` : chosen.price.status}</p>
          {chosen.price.status === "priced" && chosen.price.unitPriceBeforeTaxMxn !== null && line.quantity !== null
            && <p>Subtotal línea: {formatMoney(calcItemSubtotal({ cantidad: line.quantity,
              precio_unitario: chosen.price.unitPriceBeforeTaxMxn, descuento_pct: 0 }))} antes de IVA</p>}
          <p>Personalización: {line.personalizationStatus === "requested_review" ? "Solicitada; técnica y costo por confirmar"
            : line.personalizationStatus === "no_print_requested" ? "Sin impresión solicitada" : "Por confirmar"}</p>
        </div>}
      </article>;
    })}
    {selected.length > 0 && <div className="rounded-xl border bg-muted/30 p-4 text-sm">
      <h3 className="font-semibold">Totales preliminares · MXN</h3>
      {priced.map((line) => {
        const product = selectedLineProduct(line)!;
        const subtotal = calcItemSubtotal({ cantidad: line.quantity, precio_unitario: product.price.unitPriceBeforeTaxMxn, descuento_pct: 0 });
        return <p key={line.lineId}>{line.productInterest}: {formatMoney(subtotal)} antes de IVA</p>;
      })}
      {!complete || priced.length !== selected.length
        ? <p>Total pendiente: revisa cada línea y precio.</p>
        : <><p>Subtotal antes de IVA: {formatMoney(totals.subtotal)}</p>
          <p>IVA (16%): {formatMoney(totals.tax_amount)}</p>
          <p className="font-semibold">Total con IVA: {formatMoney(totals.total)}</p></>}
      <p className="mt-2 text-muted-foreground">Precios antes de IVA e impresión. Disponibilidad y personalización final requieren revisión humana.</p>
    </div>}
    <p className="text-xs text-muted-foreground">Handoff: {handoffReasons(session.state).join("; ") || "revisión humana antes de confirmar condiciones finales"}</p>
    {audience === "advisor" && <p className="text-xs text-muted-foreground">La cotización QA incluirá solo líneas seleccionadas y activas; las eliminadas quedan fuera.</p>}
  </section>;
}
