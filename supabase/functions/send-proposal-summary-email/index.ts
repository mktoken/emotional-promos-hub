// Edge Function: send-proposal-summary-email
// Envía correo "Resumen preliminar de solicitud de cotización" al cliente
// y una copia interna a ventas. Registra cada intento en proposal_email_events.
// No bloquea el flujo de WhatsApp: si falta configuración, marca skipped.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
const FROM_NAME = Deno.env.get("FROM_NAME") ?? "Promocionales Emocionales";
const INTERNAL_SALES_EMAIL = Deno.env.get("INTERNAL_SALES_EMAIL") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function escapeHtml(s: unknown): string {
  const str = s == null ? "" : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMXN(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n) || 0;
  return num.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortFolio(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

interface Articulo {
  clave_producto?: string;
  sku?: string;
  modelo_comercial?: string;
  nombre?: string;
  color?: string;
  cantidad?: number;
  personalizacion?: string;
  personalizacion_sugerida_economica?: {
    label?: string;
    incluida?: boolean;
  } | null;
  subtotal?: number;
  imagen_url?: string | null;
}

function renderProductRow(item: Articulo): string {
  const img = item.imagen_url
    ? `<img src="${escapeHtml(item.imagen_url)}" alt="" width="72" height="72" style="width:72px;height:72px;object-fit:contain;background:#ffffff;border:1px solid #eeeeee;border-radius:8px;display:block;" />`
    : `<div style="width:72px;height:72px;background:#f5f5f5;border-radius:8px;text-align:center;line-height:72px;color:#999;font-size:11px;">Sin imagen</div>`;

  const clave = escapeHtml(item.clave_producto || item.sku || "—");
  const modelo = escapeHtml(item.modelo_comercial || item.nombre || "—");
  const color = escapeHtml(item.color || "—");
  const cantidad = escapeHtml(item.cantidad ?? "—");
  const personalizacion = escapeHtml(
    item.personalizacion || "Por definir con asesor",
  );
  const eco = item.personalizacion_sugerida_economica;
  const ecoLabel = eco?.incluida && eco?.label ? escapeHtml(eco.label) : "";
  const subtotal = fmtMXN(item.subtotal);

  return `
  <tr>
    <td style="padding:14px;border-bottom:1px solid #eeeeee;vertical-align:top;width:88px;">${img}</td>
    <td style="padding:14px;border-bottom:1px solid #eeeeee;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;">
      <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${modelo}</div>
      <div style="color:#666;margin-bottom:6px;">Clave: <strong>${clave}</strong></div>
      <div style="margin-bottom:4px;">Color: ${color} &middot; Cantidad: <strong>${cantidad}</strong></div>
      <div style="margin-bottom:4px;">Personalización solicitada: ${personalizacion}</div>
      ${ecoLabel ? `<div style="margin-bottom:4px;color:#7a5a00;">Alternativa económica sugerida: ${ecoLabel}</div>` : ""}
      <div style="margin-top:8px;font-weight:bold;color:#111;">Subtotal preliminar (antes de IVA): $${subtotal} MXN</div>
      <div style="margin-top:4px;color:#7a5a00;font-size:12px;">Impresión/personalización: sujeta a validación técnica de arte, material, área, colores y cantidad. No incluida en este subtotal.</div>
    </td>
  </tr>`;
}

function renderEmail(opts: {
  recipientType: "customer_summary" | "internal_notification";
  folio: string;
  fecha: string;
  cliente: { nombre?: string; empresa?: string; email?: string; telefono?: string };
  articulos: Articulo[];
  total: number;
}): string {
  const { recipientType, folio, fecha, cliente, articulos, total } = opts;
  const nombre = escapeHtml(cliente.nombre || "");
  const empresa = escapeHtml(cliente.empresa || "");
  const email = escapeHtml(cliente.email || "");
  const telefono = escapeHtml(cliente.telefono || "");

  const internalBlock =
    recipientType === "internal_notification"
      ? `
    <div style="background:#eef4ff;border:1px solid #cddcff;padding:14px 16px;border-radius:10px;margin-bottom:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#123;">
      <div style="font-weight:bold;margin-bottom:6px;">Nueva solicitud recibida</div>
      <div>Cliente: <strong>${nombre}</strong> &lt;${email}&gt;</div>
      <div>Empresa: <strong>${empresa}</strong></div>
      <div>Teléfono / WhatsApp: <strong>${telefono}</strong></div>
    </div>`
      : "";

  const filas = articulos.map(renderProductRow).join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Resumen preliminar de solicitud de cotización</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="padding-bottom:16px;text-align:left;">
                <div style="font-size:14px;color:#666;letter-spacing:1px;text-transform:uppercase;">Promocionales Emocionales</div>
                <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Resumen preliminar de solicitud de cotización</h1>
              </td>
            </tr>

            <tr><td>${internalBlock}</td></tr>

            <tr>
              <td style="padding:12px 0;font-size:14px;color:#222;">
                <div>Hola <strong>${nombre || "cliente"}</strong>, gracias por tu interés.</div>
                <div style="margin-top:6px;">Empresa: <strong>${empresa || "—"}</strong></div>
                <div style="margin-top:2px;">Folio: <strong>${escapeHtml(folio)}</strong> &middot; Fecha: ${escapeHtml(fecha)}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;">
                <div style="background:#fff8e1;border:1px solid #f4d67a;color:#5a4200;padding:14px 16px;border-radius:10px;font-size:13px;line-height:1.5;">
                  <strong>Este documento NO es una cotización final.</strong><br />
                  Es un resumen preliminar. Los precios mostrados son <strong>antes de IVA (16%)</strong> y <strong>no incluyen impresión/personalización validada</strong>. Tu asesor validará técnica, área, colores, cantidades, stock y tiempos antes de emitir la propuesta formal.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:10px;overflow:hidden;">
                  ${filas || `<tr><td style="padding:16px;color:#888;font-family:Arial,Helvetica,sans-serif;font-size:13px;">Sin productos.</td></tr>`}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:13px;color:#666;">Estimación preliminar antes de IVA e impresión:</div>
                <div style="font-size:22px;font-weight:bold;color:#111;margin-top:4px;">$${fmtMXN(total)} MXN</div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;font-size:13px;color:#333;line-height:1.6;">
                <strong>Próximos pasos</strong>
                <ol style="padding-left:20px;margin:8px 0 0;">
                  <li>Tu asesor te contactará por WhatsApp o correo.</li>
                  <li>Definiremos la técnica de personalización óptima según tu logo, material y cantidad.</li>
                  <li>Recibirás la propuesta formal con precios finales.</li>
                </ol>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 0 4px;border-top:1px solid #eeeeee;font-size:12px;color:#777;line-height:1.5;">
                Sujeto a validación comercial, stock y tiempos de entrega.<br />
                WhatsApp: +52 55 3031 1686 &middot; ${escapeHtml(FROM_EMAIL || "contacto@promocionalesemocionales")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function logEvent(row: {
  cotizacion_lead_id: string;
  email_type: "customer_summary" | "internal_notification";
  recipient_email: string;
  status: "sent" | "failed" | "skipped";
  provider_message_id?: string | null;
  error_message?: string | null;
}) {
  try {
    await admin.from("proposal_email_events").insert({
      cotizacion_lead_id: row.cotizacion_lead_id,
      email_type: row.email_type,
      recipient_email: row.recipient_email || "unknown@unknown",
      status: row.status,
      provider_message_id: row.provider_message_id ?? null,
      error_message: row.error_message ? String(row.error_message).slice(0, 500) : null,
      sent_at: row.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.warn("[proposal-email] log insert failed:", (e as Error).message);
  }
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ id?: string; error?: string; status: number }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });
  const status = res.status;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: body?.message || body?.error || `HTTP ${status}`, status };
  }
  return { id: body?.id, status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { cotizacion_lead_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const id = body?.cotizacion_lead_id;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || typeof id !== "string" || !uuidRe.test(id)) {
    return new Response(JSON.stringify({ error: "invalid_cotizacion_lead_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1) Leer la cotización
  const { data: lead, error: readErr } = await admin
    .from("cotizaciones_leads")
    .select("id, datos_cliente, articulos_cotizados, total_estimado, created_at")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !lead) {
    console.warn("[proposal-email] lead read failed:", readErr?.message, "id=", id);
    return new Response(
      JSON.stringify({ ok: false, error: "lead_not_found" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const cliente = (lead.datos_cliente ?? {}) as {
    nombre?: string;
    empresa?: string;
    email?: string;
    telefono?: string;
  };
  const articulos = Array.isArray(lead.articulos_cotizados)
    ? (lead.articulos_cotizados as Articulo[])
    : [];
  const total = Number(lead.total_estimado ?? 0) || 0;
  const folio = shortFolio(lead.id);
  const fecha = new Date(lead.created_at ?? Date.now()).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // 2) Validar configuración
  const missingConfig: string[] = [];
  if (!RESEND_API_KEY) missingConfig.push("RESEND_API_KEY");
  if (!FROM_EMAIL) missingConfig.push("FROM_EMAIL");
  if (!INTERNAL_SALES_EMAIL) missingConfig.push("INTERNAL_SALES_EMAIL");

  console.log("[proposal-email] lead:", id, "articulos:", articulos.length, "total:", total, "missing:", missingConfig.join(",") || "none");

  const results: Record<string, unknown> = {};

  // 3) Envío al cliente
  const customerEmail = (cliente.email || "").trim();
  if (missingConfig.length > 0 || !customerEmail) {
    await logEvent({
      cotizacion_lead_id: id,
      email_type: "customer_summary",
      recipient_email: customerEmail || "unknown@unknown",
      status: "skipped",
      error_message: missingConfig.length > 0
        ? `missing_config:${missingConfig.join(",")}`
        : "missing_customer_email",
    });
    results.customer = { status: "skipped" };
  } else {
    const html = renderEmail({
      recipientType: "customer_summary",
      folio,
      fecha,
      cliente,
      articulos,
      total,
    });
    const subject = `Resumen preliminar de solicitud de cotización — Folio ${folio}`;
    try {
      const r = await sendViaResend({ to: customerEmail, subject, html });
      if (r.error) {
        await logEvent({
          cotizacion_lead_id: id,
          email_type: "customer_summary",
          recipient_email: customerEmail,
          status: "failed",
          error_message: r.error,
        });
        results.customer = { status: "failed", error: r.error };
      } else {
        await logEvent({
          cotizacion_lead_id: id,
          email_type: "customer_summary",
          recipient_email: customerEmail,
          status: "sent",
          provider_message_id: r.id ?? null,
        });
        results.customer = { status: "sent", id: r.id };
      }
    } catch (e) {
      const msg = (e as Error).message || "send_error";
      await logEvent({
        cotizacion_lead_id: id,
        email_type: "customer_summary",
        recipient_email: customerEmail,
        status: "failed",
        error_message: msg,
      });
      results.customer = { status: "failed", error: msg };
    }
  }

  // 4) Envío interno
  if (missingConfig.length > 0) {
    await logEvent({
      cotizacion_lead_id: id,
      email_type: "internal_notification",
      recipient_email: INTERNAL_SALES_EMAIL || "unknown@unknown",
      status: "skipped",
      error_message: `missing_config:${missingConfig.join(",")}`,
    });
    results.internal = { status: "skipped" };
  } else {
    const html = renderEmail({
      recipientType: "internal_notification",
      folio,
      fecha,
      cliente,
      articulos,
      total,
    });
    const subject = `[Nueva solicitud] ${cliente.empresa || "—"} — ${cliente.nombre || "—"} — Folio ${folio}`;
    try {
      const r = await sendViaResend({ to: INTERNAL_SALES_EMAIL, subject, html });
      if (r.error) {
        await logEvent({
          cotizacion_lead_id: id,
          email_type: "internal_notification",
          recipient_email: INTERNAL_SALES_EMAIL,
          status: "failed",
          error_message: r.error,
        });
        results.internal = { status: "failed", error: r.error };
      } else {
        await logEvent({
          cotizacion_lead_id: id,
          email_type: "internal_notification",
          recipient_email: INTERNAL_SALES_EMAIL,
          status: "sent",
          provider_message_id: r.id ?? null,
        });
        results.internal = { status: "sent", id: r.id };
      }
    } catch (e) {
      const msg = (e as Error).message || "send_error";
      await logEvent({
        cotizacion_lead_id: id,
        email_type: "internal_notification",
        recipient_email: INTERNAL_SALES_EMAIL,
        status: "failed",
        error_message: msg,
      });
      results.internal = { status: "failed", error: msg };
    }
  }

  return new Response(JSON.stringify({ ok: true, folio, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
