import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "assistant" | "user" | "system";
  message: string;
  metadata?: Record<string, unknown>;
}

interface Payload {
  captured: {
    intent?: string;
    product_interest?: string;
    sku_or_key?: string;
    quantity?: number | string;
    wants_proposals?: boolean;
    customization_required?: boolean;
    customization_method?: string;
    has_logo_or_artwork?: boolean;
    event_date?: string;
    delivery_city?: string;
    delivery_state?: string;
    use_case?: string;
    budget_total?: string;
    contact_name?: string;
    company_name?: string;
    whatsapp?: string;
    email?: string;
    comments?: string;
  };
  summary: string;
  messages: ChatMessage[];
  visitor_id?: string | null;
}

function digits(s: string | null | undefined) {
  return (s ?? "").replace(/\D+/g, "");
}

function nextBusinessDayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function inferBudgetRange(
  total: string | undefined,
):
  | "menos_5k"
  | "5k_15k"
  | "15k_50k"
  | "50k_150k"
  | "mas_150k"
  | "por_definir"
  | null {
  if (!total) return null;
  const n = parseFloat(String(total).replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || n <= 0) return "por_definir";
  if (n < 5000) return "menos_5k";
  if (n < 15000) return "5k_15k";
  if (n < 50000) return "15k_50k";
  if (n < 150000) return "50k_150k";
  return "mas_150k";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;
    const c = body.captured ?? {};

    if (!c.contact_name || (!c.whatsapp && !c.email && !c.comments)) {
      return new Response(
        JSON.stringify({ error: "Faltan datos mínimos de contacto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const waDigits = digits(c.whatsapp);
    const emailLower = c.email?.trim().toLowerCase() ?? null;

    // 1) Buscar duplicado
    let leadId: string | null = null;
    {
      const orFilters: string[] = [];
      if (waDigits) {
        orFilters.push(`whatsapp.eq.${waDigits}`);
        orFilters.push(`phone.eq.${waDigits}`);
      }
      if (emailLower) orFilters.push(`email.eq.${emailLower}`);

      if (orFilters.length > 0) {
        const { data: existing } = await admin
          .from("crm_leads")
          .select("id")
          .or(orFilters.join(","))
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (existing?.id) leadId = existing.id;
      }
    }

    const summary = body.summary?.trim() || "Solicitud capturada desde asistente virtual";
    const budget = inferBudgetRange(c.budget_total);

    // 2) Crear o actualizar lead
    if (!leadId) {
      const { data: inserted, error: insErr } = await admin
        .from("crm_leads")
        .insert({
          source: "asistente_virtual",
          status: "interesado",
          company_name: c.company_name?.trim() || c.contact_name?.trim() || "Sin empresa",
          contact_name: c.contact_name?.trim() || null,
          phone: waDigits || null,
          whatsapp: waDigits || null,
          email: emailLower,
          city: c.delivery_city || null,
          state: c.delivery_state || null,
          product_interest: c.product_interest || null,
          budget_range: budget,
          event_date: c.event_date || null,
          notes: summary,
          next_follow_up_at: nextBusinessDayISO(),
        })
        .select("id")
        .single();

      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      leadId = inserted.id;
    } else {
      await admin
        .from("crm_leads")
        .update({
          status: "interesado",
          last_contacted_at: new Date().toISOString(),
          next_follow_up_at: nextBusinessDayISO(),
          notes: summary,
        })
        .eq("id", leadId);
    }

    // 3) Activity
    const priority: "media" | "alta" =
      c.event_date && new Date(c.event_date).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 14
        ? "alta"
        : "media";

    await admin.from("crm_activities").insert({
      lead_id: leadId,
      type: "seguimiento_cotizacion",
      title: "Solicitud recibida desde asistente virtual",
      description: summary,
      priority,
      due_date: nextBusinessDayISO(),
    });

    // 4) Note
    await admin.from("crm_notes").insert({
      lead_id: leadId,
      note: summary,
    });

    // 5) Chat session
    const { data: session, error: sessErr } = await admin
      .from("crm_chat_sessions")
      .insert({
        lead_id: leadId,
        source: "asistente_virtual",
        visitor_id: body.visitor_id ?? null,
        status: "completed",
        intent: c.intent ?? null,
        summary,
        captured_data: c,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessErr) {
      return new Response(JSON.stringify({ error: sessErr.message, lead_id: leadId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Messages
    const msgs = (body.messages ?? [])
      .filter((m) => m && m.message && m.role)
      .slice(0, 200)
      .map((m) => ({
        session_id: session.id,
        role: m.role,
        message: m.message,
        metadata: m.metadata ?? {},
      }));
    if (msgs.length > 0) {
      await admin.from("crm_chat_messages").insert(msgs);
    }

    return new Response(
      JSON.stringify({ ok: true, lead_id: leadId, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
