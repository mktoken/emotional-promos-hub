import { QA_CONTACT } from "./agent-qa-contact";

/** Local-only build gate, not an authorization boundary for CRM writes. */
export function pilotEnabled(hostname: string, flag = import.meta.env.VITE_ENABLE_AGENT_WEB_PILOT): boolean {
  return flag === "true" && (hostname === "localhost" || hostname === "127.0.0.1");
}

export interface PilotContact { name: string; company: string; email: string; phone: string }

export function isControlledQaContact(contact: PilotContact): boolean {
  return contact.name.trim() === QA_CONTACT.name && contact.company.trim() === QA_CONTACT.company
    && contact.email.trim().toLowerCase() === QA_CONTACT.email && contact.phone.replace(/\D/g, "") === QA_CONTACT.phone;
}

export function customerPrice(status: string, price: number | null): string {
  return status === "priced" && price !== null
    ? `$${price.toFixed(2)} MXN por pieza antes de IVA y personalización`
    : "Precio por confirmar con un asesor";
}

export function customerStock(status: string, stock: number | null): string {
  return status === "observed" && stock !== null
    ? `${stock} piezas observadas; disponibilidad final por confirmar`
    : "Disponibilidad por confirmar";
}
