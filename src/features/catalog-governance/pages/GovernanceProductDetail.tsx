import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import { fetchDetail, type DetailCollectionMeta, type DetailRow } from "../lib/governance-api";
import {
  EmptyState, ErrorState, LoadingState, StatusBadge, TextBadge, UnauthorizedState,
} from "../components/GovernanceStates";

const STAFF = ["admin", "sales_manager", "sales_agent"];

type Row = DetailRow;

function DataTable({ rows, cols, caption, empty }: { rows: Row[]; cols: [string, string][]; caption: string; empty: string }) {
  if (!rows?.length) return <EmptyState label={empty} />;
  return (
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted/50"><tr>{cols.map(([, l]) => <th key={l} scope="col" className="px-2 py-2 text-left font-medium">{l}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={typeof (r.id ?? r.link_id ?? r.membership_id ?? r.oferta_id) === "string" || typeof (r.id ?? r.link_id ?? r.membership_id ?? r.oferta_id) === "number" ? (r.id ?? r.link_id ?? r.membership_id ?? r.oferta_id) as string | number : i} className="border-t border-border">
              {cols.map(([k]) => {
                const v = r[k];
                return <td key={k} className="px-2 py-2 align-top">{v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollectionNote({ meta, label }: { meta?: DetailCollectionMeta; label: string }) {
  if (!meta?.truncated) return null;
  return <p className="text-xs text-muted-foreground">Mostrando los primeros {meta.returned} registros de {label}.</p>;
}

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-border py-1">
          <dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function GovernanceProductDetail() {
  const { producto_b2b_id = "" } = useParams();
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF.includes(r));
  const q = useQuery({ queryKey: ["gov-detail", producto_b2b_id], queryFn: () => fetchDetail(producto_b2b_id), enabled: isStaff && !!producto_b2b_id, retry: false });

  if (auth.loading) return <LoadingState />;
  if (!isStaff) return <UnauthorizedState />;
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const back = (
    <Link to="/admin/catalog-governance" className="inline-flex items-center gap-1 text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a la cola
    </Link>
  );
  if (!d) return <div className="space-y-4">{back}<EmptyState label="Producto no encontrado." /></div>;

  const p = d.overview;
  const r = d.readiness ?? {
    editorial_readiness: null,
    identity_pass: false,
    data_completeness_pass: false,
    content_pass: false,
    image_pass: false,
    pricing_pass: false,
    stock_public_eligibility_pass: false,
    blocking_issue_count: 0,
    completeness_score: null,
    evaluated_at: null,
  };
  const s = d.runtime;
  const gs = d.governance_state;
  const pr = d.pricing;

  return (
    <div className="space-y-5">
      {back}
      <header className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-semibold">{p.name ?? p.producto_b2b_id}</h1>
        <p className="text-xs text-muted-foreground font-mono">{p.provider} · {p.sku_base ?? p.id_interno} · {p.producto_b2b_id}</p>
        <div className="flex flex-wrap gap-2" aria-label="Estados separados">
          <span className="text-xs text-muted-foreground self-center">Governance status:</span><TextBadge value={String(gs?.review_status ?? "NOT_REVIEWED")} />
          <span className="text-xs text-muted-foreground self-center">Public eligibility:</span><StatusBadge ok={r.stock_public_eligibility_pass} yes="Elegible" no="No elegible" />
          <span className="text-xs text-muted-foreground self-center">Publication status:</span><StatusBadge ok={d.published} yes="Publicado" no="No publicado" />
        </div>
      </header>

      <Tabs defaultValue="readiness">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="runtime">Runtime Status</TabsTrigger>
          <TabsTrigger value="pricing">Pricing V2 / MOQ</TabsTrigger>
          <TabsTrigger value="evidence">Source / Evidence</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="issues">Quality Issues</TabsTrigger>
          <TabsTrigger value="approvals">Approval History</TabsTrigger>
        </TabsList>

        <TabsContent value="readiness" className="pt-3 space-y-3">
          <KV items={[
            ["Editorial readiness", <TextBadge key="er" value={r.editorial_readiness} />],
            ["Identity", <StatusBadge key="i" ok={r.identity_pass} yes="PASS" no="NO" />],
            ["Data completeness", <StatusBadge key="d" ok={r.data_completeness_pass} yes="PASS" no="NO" />],
            ["Content", <StatusBadge key="c" ok={r.content_pass} yes="PASS" no="NO" />],
            ["Image", <StatusBadge key="im" ok={r.image_pass} yes="PASS" no="NO" />],
            ["Pricing (separado)", <StatusBadge key="p" ok={r.pricing_pass} yes="PASS" no="NO" />],
            ["Stock / public eligibility", <StatusBadge key="s" ok={r.stock_public_eligibility_pass} yes="PASS" no="NO" />],
            ["Blocking issues", r.blocking_issue_count],
            ["Completeness score", r.completeness_score ?? "—"],
            ["Modelos", d.overview.models_count],
            ["Memberships", d.overview.memberships_count],
            ["Ofertas", d.overview.offers_count],
          ]} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="space-y-2" aria-labelledby="models-title">
              <h2 id="models-title" className="font-medium">Modelos</h2>
              <CollectionNote meta={d.collection_meta.models} label="modelos" />
              <DataTable rows={d.models} caption="Modelos del producto" empty="Sin modelos explícitos."
                cols={[["model_key", "Clave"], ["label", "Modelo"], ["family_key", "Familia"], ["status", "Estado"]]} />
            </section>
            <section className="space-y-2" aria-labelledby="memberships-title">
              <h2 id="memberships-title" className="font-medium">Memberships</h2>
              <CollectionNote meta={d.collection_meta.memberships} label="memberships" />
              <DataTable rows={d.memberships} caption="Memberships del producto" empty="Sin memberships explícitos."
                cols={[["model_id", "Modelo"], ["oferta_id", "Oferta"], ["variant_label", "Variante"], ["membership_status", "Estado"]]} />
            </section>
            <section className="space-y-2" aria-labelledby="offers-title">
              <h2 id="offers-title" className="font-medium">Ofertas</h2>
              <CollectionNote meta={d.collection_meta.offers} label="ofertas" />
              <DataTable rows={d.offers} caption="Ofertas del producto" empty="Sin ofertas mapeadas."
                cols={[["provider", "Proveedor"], ["provider_sku", "SKU proveedor"], ["variant_sku", "SKU variante"], ["offer_status", "Estado"]]} />
            </section>
          </div>
          {!gs && <p className="text-sm text-muted-foreground">Sin fila de Governance: NOT_REVIEWED.</p>}
          <p className="text-[11px] text-muted-foreground">EDITORIAL_READY no equivale a elegibilidad pública ni a publicación.</p>
        </TabsContent>

        <TabsContent value="runtime" className="pt-3">
          {s ? <KV items={[
            ["public_visible", String(s.public_visible)], ["stock_status", s.stock_status], ["stock_qty", s.stock_qty],
            ["quote_mode", s.quote_mode], ["price_valid", String(s.price_valid)], ["image_available", String(s.image_available)],
            ["Última sincronización de stock", s.last_stock_sync_at], ["Actualizado", s.updated_at],
            ["Imágenes runtime", p.image_count], ["Categoría", p.categoria_principal],
          ]} /> : <EmptyState label="Sin estado runtime." />}
        </TabsContent>

        <TabsContent value="pricing" className="pt-3">
          {pr ? <KV items={[
            ["Estado", pr.public_price_status], ["Precio antes de IVA", pr.price_before_tax_mxn != null ? `${pr.price_before_tax_mxn} ${pr.currency}` : "—"],
            ["MOQ", pr.minimum_quantity], ["Calculado", pr.computed_at],
          ]} /> : <EmptyState label="Sin precio V2 vigente (unresolved)." />}
        </TabsContent>

        <TabsContent value="evidence" className="pt-3">
          <CollectionNote meta={d.collection_meta.sources} label="fuentes" />
          <DataTable rows={d.sources} caption="Fuentes relacionadas" empty="Sin fuentes relacionadas."
            cols={[["source_type", "Tipo"], ["original_filename", "Documento"], ["source_version", "Versión"], ["observed_at", "Observado"], ["rights_status", "Derechos"]]} />
          <CollectionNote meta={d.collection_meta.evidence} label="evidencia" />
          <DataTable rows={d.evidence} caption="Evidencia de fuente" empty="Sin evidencia registrada."
            cols={[["source_type", "Tipo"], ["original_filename", "Documento"], ["field_path", "Campo"], ["page_number", "Pág."], ["evidence_excerpt", "Extracto"], ["confidence", "Confianza"], ["status", "Estado"], ["rights_status", "Derechos"]]} />
        </TabsContent>
        <TabsContent value="attributes" className="pt-3">
          <CollectionNote meta={d.collection_meta.attributes} label="atributos" />
          <DataTable rows={d.attributes} caption="Atributos" empty="Sin atributos registrados."
            cols={[["key", "Clave"], ["label", "Etiqueta"], ["is_required", "Obligatorio"], ["raw_value", "Valor"], ["unit", "Unidad"], ["normalization_status", "Estado"], ["is_current", "Vigente"]]} />
        </TabsContent>
        <TabsContent value="content" className="pt-3">
          <CollectionNote meta={d.collection_meta.content} label="versiones de contenido" />
          <DataTable rows={d.content} caption="Contenido" empty="Sin contenido registrado."
            cols={[["version", "Versión"], ["is_current", "Vigente"], ["status", "Estado"], ["canonical_name", "Nombre"], ["short_description", "Descripción"], ["approved_at", "Aprobado"]]} />
        </TabsContent>
        <TabsContent value="assets" className="pt-3">
          <CollectionNote meta={d.collection_meta.assets} label="assets" />
          <DataTable rows={d.assets} caption="Assets" empty="Sin assets registrados en Governance."
            cols={[["role", "Rol"], ["target_type", "Destino"], ["link_status", "Vínculo"], ["original_filename", "Archivo"], ["rights_status", "Derechos"], ["identity_status", "Identidad"], ["technical_status", "Técnico"], ["visual_status", "Visual"], ["approval_status", "Aprobación"]]} />
        </TabsContent>
        <TabsContent value="issues" className="pt-3">
          <CollectionNote meta={d.collection_meta.issues} label="issues" />
          <DataTable rows={d.issues} caption="Quality issues" empty="Sin issues."
            cols={[["issue_code", "Código"], ["severity", "Severidad"], ["status", "Estado"], ["opened_at", "Abierto"], ["resolved_at", "Resuelto"], ["resolution", "Resolución"]]} />
        </TabsContent>
        <TabsContent value="approvals" className="pt-3">
          <CollectionNote meta={d.collection_meta.approvals} label="aprobaciones" />
          <DataTable rows={d.approvals} caption="Historial de aprobaciones" empty="Sin aprobaciones."
            cols={[["scope", "Alcance"], ["decision", "Decisión"], ["version_ref", "Versión"], ["is_current", "Vigente"], ["decided_at", "Fecha"], ["notes", "Notas"]]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
