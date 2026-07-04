export const COTIZACION_ESTADOS = [
  "nueva",
  "contactado",
  "en_proceso",
  "enviada",
  "ganada",
  "perdida",
] as const;

export type CotizacionEstado = (typeof COTIZACION_ESTADOS)[number];

export const ESTADO_LABEL: Record<CotizacionEstado, string> = {
  nueva: "Nueva",
  contactado: "Contactado",
  en_proceso: "En proceso",
  enviada: "Enviada",
  ganada: "Ganada",
  perdida: "Perdida",
};

export const ESTADO_BADGE: Record<
  CotizacionEstado,
  "default" | "secondary" | "outline" | "destructive"
> = {
  nueva: "outline",
  contactado: "secondary",
  en_proceso: "default",
  enviada: "default",
  ganada: "default",
  perdida: "destructive",
};

export function normalizeEstado(v: string | null | undefined): CotizacionEstado {
  const s = (v ?? "").toLowerCase().trim();
  return (COTIZACION_ESTADOS as readonly string[]).includes(s)
    ? (s as CotizacionEstado)
    : "nueva";
}
