import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  EMPTY_FILTERS, fetchDashboard, fetchQueue, type QueueFilters,
} from "../lib/governance-api";
import {
  EmptyState, ErrorState, LoadingState, StatusBadge, TextBadge, UnauthorizedState,
} from "../components/GovernanceStates";

const STAFF = ["admin", "sales_manager", "sales_agent"];
const PAGE = 25;

const SELECTS: { key: keyof QueueFilters; label: string; options: string[] }[] = [
  { key: "governance_status", label: "Governance status", options: ["NOT_REVIEWED", "PASS", "NEEDS_REVIEW", "BLOCKED"] },
  { key: "readiness", label: "Readiness", options: ["NEEDS_REVIEW", "EDITORIAL_READY", "BLOCKED"] },
  { key: "pricing_status", label: "Pricing status", options: ["priced", "request_quote", "unresolved"] },
  { key: "stock_eligibility", label: "Stock eligibility", options: ["true", "false"] },
  { key: "source_type", label: "Source type", options: ["PDF", "CSV", "XLS", "XLSX", "JSON", "API_SNAPSHOT", "ZIP", "WEB_SNAPSHOT", "IMAGE_BANK", "OTHER"] },
  { key: "rights_status", label: "Rights status", options: ["UNKNOWN", "PENDING", "CLEARED", "RESTRICTED", "REJECTED"] },
  { key: "visual_status", label: "Visual status", options: ["UNREVIEWED", "PASS", "REVIEW_REQUIRED", "FAIL"] },
  { key: "asset_role", label: "Asset role", options: ["MASTER", "VARIANT", "ALT", "DETAIL", "LIFESTYLE"] },
];

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const fmt = (o: Record<string, number> | undefined) =>
  o && Object.keys(o).length ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—";

export default function GovernanceConsole() {
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF.includes(r));
  const [draft, setDraft] = useState<QueueFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const dash = useQuery({ queryKey: ["gov-dash"], queryFn: fetchDashboard, enabled: isStaff, retry: false });
  const queue = useQuery({
    queryKey: ["gov-queue", filters, sort, dir, page],
    queryFn: () => fetchQueue(filters, sort, dir, PAGE, page * PAGE),
    enabled: isStaff,
    retry: false,
    placeholderData: keepPreviousData,
  });

  if (auth.loading) return <LoadingState />;
  if (!isStaff) return <UnauthorizedState />;

  const d = dash.data;
  const census = d?.census;
  const d4Pass = census && census.readiness_row_count === census.distinct_product_count && census.duplicate_product_count === 0;

  const toggleSort = (key: string) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(key); setDir("asc"); }
    setPage(0);
  };
  const apply = (e: React.FormEvent) => { e.preventDefault(); setFilters(draft); setPage(0); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(0); };
  const total = queue.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const SortHead = ({ k, label }: { k: string; label: string }) => (
    <th scope="col" aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"} className="px-2 py-2 text-left font-medium">
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        {label}
        {sort === k ? (dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />) : <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold">Catalog Governance</h1>
        <p className="text-sm text-muted-foreground">Consola de solo lectura. No publica ni modifica el catálogo.</p>
      </header>

      <section aria-labelledby="dash-title">
        <h2 id="dash-title" className="sr-only">Resumen</h2>
        {dash.isLoading ? <LoadingState /> : dash.error ? <ErrorState error={dash.error} onRetry={() => dash.refetch()} /> : d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric label="Productos runtime" value={d.total_products} />
              <Metric label="Governance status" value={d.governance_status.NOT_REVIEWED ?? 0} hint={fmt(d.governance_status)} />
              <Metric label="Public eligibility (visible + disponible)" value={d.public_eligibility.eligible} hint={`No elegibles: ${d.public_eligibility.not_eligible}`} />
              <Metric label="Publication status (catálogo público)" value={d.publication.published} hint={`No publicados: ${d.publication.not_published}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Editorial readiness</CardTitle></CardHeader>
                <CardContent className="text-sm">{fmt(d.readiness)}<p className="text-[11px] text-muted-foreground mt-1">EDITORIAL_READY no implica publicación.</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Pricing V2 (solo lectura)</CardTitle></CardHeader>
                <CardContent className="text-sm">{fmt(d.pricing)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">D4 — censo completo</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <StatusBadge ok={!!d4Pass} yes="PASS" no="FAIL" />
                  <div className="tabular-nums">Filas readiness: {census?.readiness_row_count} · Distintos: {census?.distinct_product_count} · Duplicados: {census?.duplicate_product_count}</div>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">Gates: {fmt(d.gates)} · Issues abiertos: {fmt(d.open_issues)} · Filas Governance: {fmt(d.governance_rows)}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="queue-title" className="space-y-3">
        <h2 id="queue-title" className="text-lg font-semibold">Cola de revisión</h2>
        <form onSubmit={apply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Filtros">
          <div className="space-y-1">
            <Label htmlFor="gq-search">Buscar</Label>
            <Input id="gq-search" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Nombre, SKU o ID" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gq-sku">Provider SKU</Label>
            <Input id="gq-sku" value={draft.provider_sku} onChange={(e) => setDraft({ ...draft, provider_sku: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gq-issue">Issue code</Label>
            <Input id="gq-issue" value={draft.issue_code} onChange={(e) => setDraft({ ...draft, issue_code: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gq-provider">Provider</Label>
            <select id="gq-provider" className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })}>
              <option value="">Todos</option>
              {(queue.data?.providers ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {SELECTS.map((s) => (
            <div key={s.key} className="space-y-1">
              <Label htmlFor={`gq-${s.key}`}>{s.label}</Label>
              <select id={`gq-${s.key}`} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={draft[s.key]} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}>
                <option value="">Todos</option>
                {s.options.map((o) => <option key={o} value={o}>{s.key === "stock_eligibility" ? (o === "true" ? "Elegible" : "No elegible") : o}</option>)}
              </select>
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Button type="submit">Aplicar</Button>
            <Button type="button" variant="outline" onClick={reset}>Limpiar</Button>
          </div>
        </form>

        {queue.isLoading ? <LoadingState /> : queue.error ? <ErrorState error={queue.error} onRetry={() => queue.refetch()} /> : (
          <>
            <div className="overflow-x-auto border border-border rounded-md">
              <table className="w-full text-sm">
                <caption className="sr-only">Productos del catálogo runtime con su estado de Governance</caption>
                <thead className="bg-muted/50">
                  <tr>
                    <SortHead k="name" label="Producto" />
                    <SortHead k="provider" label="Proveedor" />
                    <SortHead k="governance_status" label="Governance status" />
                    <SortHead k="readiness" label="Readiness" />
                    <SortHead k="stock" label="Public eligibility" />
                    <SortHead k="published" label="Publication status" />
                    <SortHead k="pricing_status" label="Pricing V2" />
                    <SortHead k="issues" label="Blockers" />
                  </tr>
                </thead>
                <tbody>
                  {queue.data?.rows.length ? queue.data.rows.map((r) => (
                    <tr key={r.producto_b2b_id} className="border-t border-border">
                      <td className="px-2 py-2">
                        <Link to={`/admin/catalog-governance/products/${r.producto_b2b_id}`} className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                          {r.name ?? r.producto_b2b_id}
                        </Link>
                        <div className="text-[11px] text-muted-foreground font-mono">{r.sku_base ?? r.id_interno}</div>
                      </td>
                      <td className="px-2 py-2">{r.provider ?? "—"}</td>
                      <td className="px-2 py-2"><TextBadge value={r.governance_status} /></td>
                      <td className="px-2 py-2"><TextBadge value={r.readiness} /></td>
                      <td className="px-2 py-2"><StatusBadge ok={r.stock_eligible} yes="Elegible" no="No elegible" /></td>
                      <td className="px-2 py-2"><StatusBadge ok={r.published} yes="Publicado" no="No publicado" /></td>
                      <td className="px-2 py-2"><TextBadge value={r.pricing_status} /></td>
                      <td className="px-2 py-2 tabular-nums">{r.blocking_issue_count}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="px-2"><EmptyState label="Ningún producto coincide con los filtros." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
              <span className="tabular-nums" aria-live="polite">{total} productos · Página {page + 1} de {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
