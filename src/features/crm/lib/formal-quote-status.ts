export const FORMAL_QUOTE_STATUSES = [
  "BORRADOR",
  "EMITIDA",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
  "VENCIDA",
  "CANCELADA",
] as const;

export type FormalQuoteStatus = (typeof FORMAL_QUOTE_STATUSES)[number];

export const FORMAL_QUOTE_STATUS_LABEL: Record<FormalQuoteStatus, string> = {
  BORRADOR: "Borrador",
  EMITIDA: "Emitida",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

export const FORMAL_QUOTE_STATUS_BADGE: Record<
  FormalQuoteStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BORRADOR: "outline",
  EMITIDA: "default",
  ENVIADA: "default",
  ACEPTADA: "default",
  RECHAZADA: "destructive",
  VENCIDA: "secondary",
  CANCELADA: "destructive",
};

export function normalizeFormalStatus(v: string | null | undefined): FormalQuoteStatus {
  const up = (v ?? "").toUpperCase().trim();
  return (FORMAL_QUOTE_STATUSES as readonly string[]).includes(up)
    ? (up as FormalQuoteStatus)
    : "BORRADOR";
}
