import type { CotizacionRow } from "@/features/crm/hooks/useCotizaciones";
import { parseCliente, formatDate } from "./cotizacion-format";
import { ESTADO_LABEL, normalizeEstado } from "./cotizacion-status";

function safeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Prevent CSV formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  // Escape double quotes
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

export function buildCotizacionesCsv(
  rows: CotizacionRow[],
  asesorNameById: Map<string, string>,
): string {
  const headers = [
    "fecha",
    "cliente",
    "empresa",
    "email",
    "telefono",
    "whatsapp",
    "estado",
    "asesor",
    "total",
    "id",
  ];
  const lines: string[] = [headers.join(",")];

  for (const r of rows) {
    const c = parseCliente(r.datos_cliente);
    const estado = ESTADO_LABEL[normalizeEstado(r.estado_cotizacion)];
    const asesor = r.assigned_to
      ? asesorNameById.get(r.assigned_to) ?? r.assigned_to.slice(0, 8)
      : "";
    lines.push(
      [
        safeCell(formatDate(r.created_at)),
        safeCell(c.nombre),
        safeCell(c.empresa),
        safeCell(c.email),
        safeCell(c.telefono),
        safeCell(c.whatsapp),
        safeCell(estado),
        safeCell(asesor),
        safeCell(r.total_estimado ?? ""),
        safeCell(r.id),
      ].join(","),
    );
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
