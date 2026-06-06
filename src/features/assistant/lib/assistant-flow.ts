export type FieldKey =
  | "intent"
  | "product_interest"
  | "sku_or_key"
  | "wants_proposals"
  | "quantity"
  | "customization_required"
  | "customization_method"
  | "has_logo_or_artwork"
  | "event_date"
  | "delivery_city"
  | "delivery_state"
  | "use_case"
  | "budget_total"
  | "contact_name"
  | "company_name"
  | "whatsapp"
  | "email"
  | "comments";

export type StepKind = "choice" | "text" | "number" | "date" | "yesno";

export interface Step {
  id: FieldKey;
  section: string;
  question: string;
  kind: StepKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
  optional?: boolean;
  skipLabel?: string;
}

export const STEPS: Step[] = [
  {
    id: "intent",
    section: "Intención",
    question: "¿Cómo podemos ayudarte hoy?",
    kind: "choice",
    options: [
      { value: "producto_especifico", label: "Quiero un producto específico" },
      { value: "propuestas", label: "Quiero propuestas / ideas" },
      { value: "evento", label: "Evento o campaña" },
      { value: "regalo_corporativo", label: "Regalo corporativo" },
      { value: "onboarding", label: "Onboarding de colaboradores" },
      { value: "otro", label: "Otro" },
    ],
  },
  {
    id: "product_interest",
    section: "Producto",
    question: "¿Qué producto o categoría te interesa?",
    kind: "text",
    placeholder: "Ej. termos, playeras, mochilas, kits...",
  },
  {
    id: "sku_or_key",
    section: "Producto",
    question: "¿Tienes la clave o SKU del producto? (opcional)",
    kind: "text",
    optional: true,
    placeholder: "Ej. PE-1234",
    skipLabel: "No la tengo",
  },
  {
    id: "wants_proposals",
    section: "Producto",
    question: "¿Buscas una sola opción o varias propuestas alternativas?",
    kind: "choice",
    options: [
      { value: "false", label: "Una sola opción" },
      { value: "true", label: "Quiero ver propuestas alternativas" },
    ],
  },
  {
    id: "quantity",
    section: "Cantidad",
    question: "¿Cuántas piezas aproximadamente?",
    kind: "number",
    placeholder: "Ej. 250",
  },
  {
    id: "customization_required",
    section: "Personalización",
    question: "¿Lo necesitas impreso o sin personalizar?",
    kind: "choice",
    options: [
      { value: "true", label: "Personalizado" },
      { value: "false", label: "Sin personalizar" },
    ],
  },
  {
    id: "customization_method",
    section: "Personalización",
    question: "Si conoces la técnica, ¿cuál te interesa?",
    kind: "choice",
    optional: true,
    skipLabel: "Por definir",
    options: [
      { value: "serigrafia", label: "Serigrafía" },
      { value: "tampografia", label: "Tampografía" },
      { value: "sublimacion", label: "Sublimación" },
      { value: "grabado_laser", label: "Grabado láser" },
      { value: "bordado", label: "Bordado" },
      { value: "full_color", label: "Full color / DTF" },
      { value: "por_definir", label: "Por definir" },
    ],
  },
  {
    id: "has_logo_or_artwork",
    section: "Personalización",
    question: "¿Ya cuentas con logo o arte para imprimir?",
    kind: "yesno",
    optional: true,
  },
  {
    id: "event_date",
    section: "Proyecto",
    question: "¿Fecha del evento o fecha límite de entrega?",
    kind: "date",
    optional: true,
    skipLabel: "Aún no la sé",
  },
  {
    id: "delivery_city",
    section: "Proyecto",
    question: "¿Ciudad de entrega?",
    kind: "text",
    optional: true,
    placeholder: "Ej. CDMX",
  },
  {
    id: "delivery_state",
    section: "Proyecto",
    question: "¿Estado de entrega?",
    kind: "text",
    optional: true,
    placeholder: "Ej. Edomex",
  },
  {
    id: "use_case",
    section: "Proyecto",
    question: "¿Para qué se va a usar?",
    kind: "choice",
    optional: true,
    options: [
      { value: "evento", label: "Evento" },
      { value: "campana", label: "Campaña" },
      { value: "clientes", label: "Clientes" },
      { value: "empleados", label: "Empleados" },
      { value: "regalo_corporativo", label: "Regalo corporativo" },
      { value: "lanzamiento", label: "Lanzamiento" },
      { value: "comunicacion_interna", label: "Comunicación interna" },
    ],
  },
  {
    id: "budget_total",
    section: "Presupuesto",
    question: "¿Presupuesto total aproximado? (MXN)",
    kind: "text",
    optional: true,
    skipLabel: "Por definir",
    placeholder: "Ej. 25000",
  },
  {
    id: "contact_name",
    section: "Contacto",
    question: "¿Cuál es tu nombre?",
    kind: "text",
    placeholder: "Tu nombre completo",
  },
  {
    id: "company_name",
    section: "Contacto",
    question: "¿Nombre de tu empresa?",
    kind: "text",
    optional: true,
    placeholder: "Empresa o marca",
  },
  {
    id: "whatsapp",
    section: "Contacto",
    question: "¿WhatsApp para contactarte?",
    kind: "text",
    placeholder: "10 dígitos",
  },
  {
    id: "email",
    section: "Contacto",
    question: "¿Correo electrónico? (opcional)",
    kind: "text",
    optional: true,
    placeholder: "tu@empresa.com",
    skipLabel: "Omitir",
  },
  {
    id: "comments",
    section: "Contacto",
    question: "¿Algún comentario adicional?",
    kind: "text",
    optional: true,
    skipLabel: "No, gracias",
    placeholder: "Detalles que nos ayuden a cotizar mejor",
  },
];

export type CapturedData = Partial<Record<FieldKey, string | number | boolean>>;
