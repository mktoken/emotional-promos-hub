// Route B — Project Brief (RB2: solo UI, sin escritura real).
// Validación cliente equivalente al contrato aprobado.

export const OBJECTIVE_MAX = 1000;

export interface ProjectBriefDraft {
  project_objective: string;
  contact_name: string;
  email: string;
  phone: string;
  quantity: string;
  quantity_unknown: boolean;
  target_date: string;
  target_date_unknown: boolean;
  company: string;
  company_not_applicable: boolean;
  occasion: string;
  audience: string;
  budget: string;
  city: string;
  product_interest: string;
  personalization: string;
  comments: string;
  privacy_consent: boolean;
}

export const emptyBrief = (): ProjectBriefDraft => ({
  project_objective: "",
  contact_name: "",
  email: "",
  phone: "",
  quantity: "",
  quantity_unknown: false,
  target_date: "",
  target_date_unknown: false,
  company: "",
  company_not_applicable: false,
  occasion: "",
  audience: "",
  budget: "",
  city: "",
  product_interest: "",
  personalization: "",
  comments: "",
  privacy_consent: false,
});

export type BriefErrorKey =
  | "project_objective"
  | "contact_name"
  | "contact"
  | "email"
  | "phone"
  | "quantity"
  | "target_date"
  | "privacy_consent";

export type BriefErrors = Partial<Record<BriefErrorKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizePhone = (v: string) => v.replace(/\D/g, "");
export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isValidPhone = (v: string) => {
  const d = normalizePhone(v);
  return d.length >= 10 && d.length <= 15;
};

export const isValidDate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export function validateBrief(b: ProjectBriefDraft): BriefErrors {
  const e: BriefErrors = {};
  const objective = b.project_objective.trim();
  if (!objective) e.project_objective = "Cuéntanos qué necesitas resolver.";
  else if (objective.length > OBJECTIVE_MAX) e.project_objective = `Máximo ${OBJECTIVE_MAX} caracteres.`;

  if (!b.contact_name.trim()) e.contact_name = "Escribe tu nombre.";

  const email = b.email.trim();
  const phone = b.phone.trim();
  if (!email && !phone) e.contact = "Indica un correo o un teléfono para contactarte.";
  if (email && !isValidEmail(email)) e.email = "Revisa el correo; parece incompleto.";
  if (phone && !isValidPhone(phone)) e.phone = "El teléfono debe tener entre 10 y 15 dígitos.";

  const qty = b.quantity.trim();
  if (b.quantity_unknown && qty) e.quantity = "Elige una cantidad o marca “Aún no la sé”, no ambas.";
  else if (!b.quantity_unknown) {
    const n = Number(qty);
    if (!qty) e.quantity = "Indica una cantidad estimada o marca “Aún no la sé”.";
    else if (!Number.isInteger(n) || n <= 0) e.quantity = "La cantidad debe ser un número mayor que 0.";
  }

  const date = b.target_date.trim();
  if (b.target_date_unknown && date) e.target_date = "Elige una fecha o marca “Aún no la sé”, no ambas.";
  else if (!b.target_date_unknown) {
    if (!date) e.target_date = "Indica una fecha objetivo o marca “Aún no la sé”.";
    else if (!isValidDate(date)) e.target_date = "Revisa la fecha.";
  }

  if (!b.privacy_consent) e.privacy_consent = "Necesitamos tu autorización para revisar la solicitud.";
  return e;
}

/** RB2: envío simulado. No hace fetch, inserts, RPC, Edge Functions ni persistencia. */
export const RB2_NO_WRITE = true as const;
export async function mockSubmitBrief(_b: ProjectBriefDraft): Promise<{ ok: true; demo: true }> {
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true, demo: true };
}
