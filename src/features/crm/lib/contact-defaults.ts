import type { CompanySettings } from "@/features/crm/hooks/useCompanySettings";

export interface AsesorContact {
  full_name?: string | null;
  cargo?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email_comercial?: string | null;
  firma?: string | null;
}

export interface ClienteBasic {
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
}

export interface ResolvedContact {
  nombreRemitente: string;
  cargo: string;
  emailFromDisplay: string;
  whatsappNumber: string;
  firma: string;
}

const digits = (v?: string | null) => (v ?? "").replace(/\D+/g, "");

export function resolveContact(
  asesor: AsesorContact | null | undefined,
  company: CompanySettings | null | undefined,
): ResolvedContact {
  const a = asesor ?? {};
  const c = company ?? ({} as Partial<CompanySettings>);
  return {
    nombreRemitente: (a.full_name?.trim() || c.nombre_empresa?.trim() || "").toString(),
    cargo: (a.cargo?.trim() || "").toString(),
    emailFromDisplay: (a.email_comercial?.trim() || c.email_general?.trim() || "").toString(),
    whatsappNumber: digits(a.whatsapp) || digits(c.whatsapp_general),
    firma:
      (a.firma && a.firma.trim().length > 0
        ? a.firma
        : c.firma_default && c.firma_default.trim().length > 0
          ? c.firma_default
          : "") ?? "",
  };
}

export function buildEmailBody(cliente: ClienteBasic, resolved: ResolvedContact): string {
  const saludo = `Hola ${cliente.nombre?.trim() || ""},`.trim();
  const cuerpo =
    "Gracias por tu solicitud. Te contactamos para dar seguimiento a tu propuesta de promocionales.";
  const cargoLinea = resolved.cargo ? `\n${resolved.cargo}` : "";
  const remitenteLinea = resolved.nombreRemitente
    ? `\n${resolved.nombreRemitente}${cargoLinea}`
    : "";
  const firma = resolved.firma
    ? `\n\n${resolved.firma}${remitenteLinea}`
    : remitenteLinea
      ? `\n\nSaludos,${remitenteLinea}`
      : "\n\nSaludos";
  return `${saludo}\n\n${cuerpo}${firma}`;
}

export function buildGmailUrl(toEmail: string, subject: string, body: string): string {
  return (
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(toEmail)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}

export function buildWaMessage(cliente: ClienteBasic, resolved: ResolvedContact): string {
  const nombreCliente = cliente.nombre?.trim() || "";
  const remitente = resolved.nombreRemitente || "";
  const dePart = remitente ? ` de ${remitente}` : "";
  return `Hola ${nombreCliente}, te contacto${dePart} sobre tu cotización.`.replace(/\s+/g, " ").trim();
}

export function buildWaUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
