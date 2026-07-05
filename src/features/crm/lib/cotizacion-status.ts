export const COTIZACION_ESTADOS = [
  "NUEVA",
  "CONTACTADO",
  "EN_PROCESO",
  "ENVIADA",
  "GANADA",
  "PERDIDA",
] as const;

export type CotizacionEstado = (typeof COTIZACION_ESTADOS)[number];

export const ESTADO_LABEL: Record<CotizacionEstado, string> = {
  NUEVA: "Nueva",
  CONTACTADO: "Contactado",
  EN_PROCESO: "En proceso",
  ENVIADA: "Enviada",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
};

export const ESTADO_BADGE: Record<
  CotizacionEstado,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NUEVA: "outline",
  CONTACTADO: "secondary",
  EN_PROCESO: "default",
  ENVIADA: "default",
  GANADA: "default",
  PERDIDA: "destructive",
};

const ESTADO_VARIANT_MAP: Record<string, CotizacionEstado> = {
  nueva: "NUEVA",
  contactado: "CONTACTADO",
  "en_proceso": "EN_PROCESO",
  "en proceso": "EN_PROCESO",
  enviada: "ENVIADA",
  ganada: "GANADA",
  perdida: "PERDIDA",
};

export function normalizeEstado(v: string | null | undefined): CotizacionEstado {
  const s = (v ?? "").toLowerCase().trim();
  return ESTADO_VARIANT_MAP[s] ?? "NUEVA";
}
