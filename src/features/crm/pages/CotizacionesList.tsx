import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Inbox,
  Download,
  Search,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";
import {
  useCotizaciones,
  useStaffProfiles,
  type CotizacionRow,
} from "@/features/crm/hooks/useCotizaciones";
import {
  parseCliente,
  parseArticulos,
  formatShortDate,
  formatMoney,
  digits,
} from "@/features/crm/lib/cotizacion-format";
import {
  COTIZACION_ESTADOS,
  ESTADO_BADGE,
  ESTADO_LABEL,
  normalizeEstado,
} from "@/features/crm/lib/cotizacion-status";
import { buildCotizacionesCsv, downloadCsv } from "@/features/crm/lib/cotizacion-csv";

const STAFF_ROLES = new Set(["admin", "sales_manager", "sales_agent"]);

export default function CotizacionesList() {
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF_ROLES.has(r));

  const { data, isLoading, error } = useCotizaciones();
  const staff = useStaffProfiles();

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [asesor, setAsesor] = useState<string>("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const asesorNameById = useMemo(() => {
    const map = new Map<string, string>();
    (staff.data ?? []).forEach((s) => {
      map.set(s.id, s.full_name || s.id.slice(0, 8));
    });
    return map;
  }, [staff.data]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const qn = q.trim().toLowerCase();
    const desdeTs = desde ? new Date(desde).getTime() : null;
    const hastaTs = hasta ? new Date(hasta + "T23:59:59").getTime() : null;

    return list.filter((r) => {
      const est = normalizeEstado(r.estado_cotizacion);
      if (estado !== "all" && est !== estado) return false;
      if (asesor !== "all") {
        if (asesor === "__none__" ? r.assigned_to != null : r.assigned_to !== asesor)
          return false;
      }
      if (desdeTs && r.created_at && new Date(r.created_at).getTime() < desdeTs)
        return false;
      if (hastaTs && r.created_at && new Date(r.created_at).getTime() > hastaTs)
        return false;
      if (qn) {
        const c = parseCliente(r.datos_cliente);
        const hay = [c.nombre, c.empresa, c.email, c.telefono, c.whatsapp]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
  }, [data, q, estado, asesor, desde, hasta]);

  const handleExport = () => {
    const csv = buildCotizacionesCsv(filtered, asesorNameById);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`cotizaciones-${ts}.csv`, csv);
  };

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Necesitas un rol de asesor (admin, sales_manager o sales_agent) para
              ver las cotizaciones.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">
            Solicitudes recibidas desde el sitio público.
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={filtered.length === 0}
          aria-label="Exportar resultados a CSV"
        >
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="q">Buscar</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cliente, empresa, email, teléfono…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {COTIZACION_ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asesor">Asesor</Label>
            <Select value={asesor} onValueChange={setAsesor}>
              <SelectTrigger id="asesor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {(staff.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || s.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <div className="space-y-1.5">
              <Label htmlFor="desde">Desde</Label>
              <Input
                id="desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hasta">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No pudimos cargar las cotizaciones</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Intenta nuevamente."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Sin resultados</p>
          <p className="text-sm text-muted-foreground">
            Ajusta los filtros para ver más cotizaciones.
          </p>
        </Card>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </p>

          {/* Desktop table */}
          <div className="hidden md:block border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Contacto</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Asesor</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium text-center">Prod.</th>
                  <th className="px-3 py-2 font-medium text-center">WA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <RowDesktop key={r.id} row={r} asesorNameById={asesorNameById} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r) => (
              <RowMobile key={r.id} row={r} asesorNameById={asesorNameById} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowDesktop({
  row,
  asesorNameById,
}: {
  row: CotizacionRow;
  asesorNameById: Map<string, string>;
}) {
  const c = parseCliente(row.datos_cliente);
  const items = parseArticulos(row.articulos_cotizados);
  const est = normalizeEstado(row.estado_cotizacion);
  const wa = digits(c.whatsapp || c.telefono);
  const asesor = row.assigned_to
    ? asesorNameById.get(row.assigned_to) ?? row.assigned_to.slice(0, 8)
    : "—";

  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="px-3 py-2 whitespace-nowrap">{formatShortDate(row.created_at)}</td>
      <td className="px-3 py-2">
        <Link
          to={`/crm/cotizaciones/${row.id}`}
          className="text-primary hover:underline font-medium"
        >
          {c.nombre ?? "—"}
        </Link>
      </td>
      <td className="px-3 py-2">{c.empresa ?? "—"}</td>
      <td className="px-3 py-2 text-xs">
        <div className="truncate max-w-[200px]">{c.email ?? "—"}</div>
        <div className="text-muted-foreground">{c.telefono ?? c.whatsapp ?? "—"}</div>
      </td>
      <td className="px-3 py-2">
        <Badge variant={ESTADO_BADGE[est]}>{ESTADO_LABEL[est]}</Badge>
      </td>
      <td className="px-3 py-2 text-xs">{asesor}</td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {formatMoney(row.total_estimado)}
      </td>
      <td className="px-3 py-2 text-center">{items.length}</td>
      <td className="px-3 py-2 text-center">
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir WhatsApp de ${c.nombre ?? "cliente"}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function RowMobile({
  row,
  asesorNameById,
}: {
  row: CotizacionRow;
  asesorNameById: Map<string, string>;
}) {
  const c = parseCliente(row.datos_cliente);
  const items = parseArticulos(row.articulos_cotizados);
  const est = normalizeEstado(row.estado_cotizacion);
  const wa = digits(c.whatsapp || c.telefono);
  const asesor = row.assigned_to
    ? asesorNameById.get(row.assigned_to) ?? row.assigned_to.slice(0, 8)
    : "Sin asignar";

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/crm/cotizaciones/${row.id}`} className="min-w-0 flex-1">
          <p className="font-medium truncate">{c.nombre ?? "Sin nombre"}</p>
          <p className="text-sm text-muted-foreground truncate">
            {c.empresa ?? "Sin empresa"}
          </p>
        </Link>
        <Badge variant={ESTADO_BADGE[est]}>{ESTADO_LABEL[est]}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="text-muted-foreground">
          <div>{formatShortDate(row.created_at)}</div>
          <div className="truncate">{c.telefono ?? c.whatsapp ?? "—"}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">{formatMoney(row.total_estimado)}</div>
          <div className="text-muted-foreground">
            {items.length} producto{items.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate">{asesor}</span>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#25D366] hover:underline"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        )}
      </div>
    </Card>
  );
}
