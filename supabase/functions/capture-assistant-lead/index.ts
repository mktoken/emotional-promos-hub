import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
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

// Valores válidos del enum public.budget_range
const VALID_BUDGET_RANGES = [
  "menos_10000",
  "10000_30000",
  "30000_75000",
  "75000_150000",
  "mas_150000",
  "por_definir",
] as const;
type BudgetRange = (typeof VALID_BUDGET_RANGES)[number];

function classifyBudgetAmount(n: number): BudgetRange {
  if (!isFinite(n) || n <= 0) return "por_definir";
  if (n < 10000) return "menos_10000";
  if (n <= 30000) return "10000_30000";
  if (n <= 75000) return "30000_75000";
  if (n <= 150000) return "75000_150000";
  return "mas_150000";
}

// Parsea textos: "$12,000", "10 mil", "15k", "entre 15 y 50 mil", "por definir"...
function inferBudgetRange(total: string | undefined | null): BudgetRange {
  if (total === null || total === undefined) return "por_definir";
  const raw = String(total).trim().toLowerCase();
  if (!raw) return "por_definir";
  if (/(por\s*definir|no\s*s[eé]|sin\s*presupuesto|no\s*tengo|n\/?a)/.test(raw)) {
    return "por_definir";
  }

  // Extraer tokens numéricos con sufijo opcional k / mil
  const regex = /(\d+(?:[.,]\d+)?)\s*(k|mil(?:es)?)?/gi;
  const amounts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(num)) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    const mult = suffix === "k" || suffix.startsWith("mil") ? 1000 : 1;
    amounts.push(num * mult);
  }
  if (amounts.length === 0) return "por_definir";

  // Para rangos, usar el mayor
  const value = Math.max(...amounts);
  return classifyBudgetAmount(value);
}

function safeBudgetRange(total: string | undefined | null): BudgetRange {
  const r = inferBudgetRange(total);
  const safe = (VALID_BUDGET_RANGES as readonly string[]).includes(r)
    ? r
    : "por_definir";
  try {
    console.log(
      "budget_range_mapped",
      JSON.stringify({ rawBudget_len: total ? String(total).length : 0, budgetRange: safe }),
    );
  } catch {
    // noop
  }
  return safe;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function safeLog(stage: string, extra?: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ stage, ...(extra ?? {}) }));
  } catch {
    console.log(stage);
  }
}

const VALID_CHAT_MESSAGE_ROLES = ["visitor", "assistant", "system", "agent"] as const;

function normalizeMessageRole(role: unknown): "visitor" | "assistant" | "system" | "agent" {
  const normalized = String(role ?? "").toLowerCase().trim();
  if (normalized === "user") return "visitor";
  if (VALID_CHAT_MESSAGE_ROLES.includes(normalized as any)) {
    return normalized as "visitor" | "assistant" | "system" | "agent";
  }
  return "visitor";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    safeLog("request_received", { method: req.method });

    // 1) Env validation
    safeLog("env_validation_started");
    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SERVICE_ROLE) {
      return jsonResponse(500, {
        success: false,
        stage: "env_validation",
        error: "Missing SUPABASE_SERVICE_ROLE_KEY",
        message:
          "Agrega SUPABASE_SERVICE_ROLE_KEY en Cloud > Secrets para permitir que la Edge Function escriba en CRM.",
      });
    }
    if (!SUPABASE_URL) {
      return jsonResponse(500, {
        success: false,
        stage: "env_validation",
        error: "Missing SUPABASE_URL",
        message: "Agrega SUPABASE_URL en Cloud > Secrets.",
      });
    }
    safeLog("env_validation_passed", {
      has_supabase_url: true,
      has_service_role: true,
    });

    // 2) Parse payload
    safeLog("payload_parse_started");
    let body: Payload;
    try {
      body = (await req.json()) as Payload;
    } catch (e) {
      return jsonResponse(400, {
        success: false,
        stage: "payload_parse",
        error: "Invalid JSON",
        details: e instanceof Error ? e.message : String(e),
      });
    }

    const c = body?.captured ?? ({} as Payload["captured"]);
    if (!c.contact_name || (!c.whatsapp && !c.email && !c.comments)) {
      return jsonResponse(400, {
        success: false,
        stage: "payload_parse",
        error: "Faltan datos mínimos de contacto.",
      });
    }
    safeLog("payload_parse_passed", {
      has_whatsapp: !!c.whatsapp,
      has_email: !!c.email,
      has_company: !!c.company_name,
      messages_count: Array.isArray(body.messages) ? body.messages.length : 0,
    });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const waDigits = digits(c.whatsapp);
    const emailLower = c.email?.trim().toLowerCase() ?? null;
    const summary =
      body.summary?.trim() || "Solicitud capturada desde asistente virtual";
    const budget = safeBudgetRange(c.budget_total);

    // 3) Duplicate search
    safeLog("duplicate_search_started");
    let leadId: string | null = null;
    let reused = false;
    {
      const orFilters: string[] = [];
      if (waDigits) {
        orFilters.push(`whatsapp.eq.${waDigits}`);
        orFilters.push(`phone.eq.${waDigits}`);
      }
      if (emailLower) orFilters.push(`email.eq.${emailLower}`);

      if (orFilters.length > 0) {
        const { data: existing, error: dupErr } = await admin
          .from("crm_leads")
          .select("id")
          .or(orFilters.join(","))
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (dupErr) {
          return jsonResponse(500, {
            success: false,
            stage: "duplicate_search",
            error: dupErr.message,
            details: dupErr.details ?? null,
          });
        }
        if (existing?.id) {
          leadId = existing.id;
          reused = true;
        }
      }
    }

    // 4) Lead insert or update
    safeLog("lead_insert_started", { reused });
    if (!leadId) {
      const { data: inserted, error: insErr } = await admin
        .from("crm_leads")
        .insert({
          source: "asistente_virtual",
          status: "interesado",
          company_name:
            c.company_name?.trim() || c.contact_name?.trim() || "Sin empresa",
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
        return jsonResponse(500, {
          success: false,
          stage: "lead_insert",
          error: insErr.message,
          details: insErr.details ?? null,
        });
      }
      leadId = inserted.id;
    } else {
      const { error: updErr } = await admin
        .from("crm_leads")
        .update({
          status: "interesado",
          last_contacted_at: new Date().toISOString(),
          next_follow_up_at: nextBusinessDayISO(),
          notes: summary,
        })
        .eq("id", leadId);
      if (updErr) {
        return jsonResponse(500, {
          success: false,
          stage: "lead_update",
          error: updErr.message,
          details: updErr.details ?? null,
        });
      }
    }

    // 5) Activity
    safeLog("activity_insert_started");
    const priority: "media" | "alta" =
      c.event_date &&
      new Date(c.event_date).getTime() - Date.now() <
        1000 * 60 * 60 * 24 * 14
        ? "alta"
        : "media";

    {
      const { error: actErr } = await admin.from("crm_activities").insert({
        lead_id: leadId,
        type: "seguimiento_cotizacion",
        title: "Solicitud recibida desde asistente virtual",
        description: summary,
        priority,
        due_date: nextBusinessDayISO(),
      });
      if (actErr) {
        return jsonResponse(500, {
          success: false,
          stage: "activity_insert",
          error: actErr.message,
          details: actErr.details ?? null,
        });
      }
    }

    // 6) Note
    safeLog("note_insert_started");
    {
      const { error: noteErr } = await admin.from("crm_notes").insert({
        lead_id: leadId,
        note: summary,
      });
      if (noteErr) {
        return jsonResponse(500, {
          success: false,
          stage: "note_insert",
          error: noteErr.message,
          details: noteErr.details ?? null,
        });
      }
    }

    // 7) Chat session
    safeLog("chat_session_insert_started");
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
      return jsonResponse(500, {
        success: false,
        stage: "chat_session_insert",
        error: sessErr.message,
        details: sessErr.details ?? null,
        lead_id: leadId,
      });
    }

    // 8) Messages
    safeLog("chat_messages_insert_started");
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
      const { error: msgErr } = await admin
        .from("crm_chat_messages")
        .insert(msgs);
      if (msgErr) {
        return jsonResponse(500, {
          success: false,
          stage: "chat_messages_insert",
          error: msgErr.message,
          details: msgErr.details ?? null,
          lead_id: leadId,
          session_id: session.id,
        });
      }
    }

    safeLog("completed", { lead_id: leadId, session_id: session.id, reused });
    return jsonResponse(200, {
      success: true,
      ok: true,
      lead_id: leadId,
      session_id: session.id,
      reused,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    const stack = e instanceof Error ? e.stack : undefined;
    safeLog("unhandled_exception", { message });
    return jsonResponse(500, {
      success: false,
      stage: "unhandled_exception",
      error: message,
      details: stack ?? null,
    });
  }
});
