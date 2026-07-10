// Edge Function: promote-provider-products-to-catalog
// Sprint 2 pilot: promote a small set (20 cdo_mx + 20 forpromotional + 10 g4_mx)
// from provider tables into the internal catalog tables.
// - productos_b2b (activo=false always)
// - producto_b2b_status
// - producto_b2b_oferta_map
// - catalog_price_cache
//
// Does NOT touch productos_publicos, RLS, or any other Edge Function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-pilot",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PILOT_QUOTAS: Record<string, number> = {
  cdo_mx: 20,
  forpromotional: 20,
  g4_mx: 10,
};

const VALID_PROVIDERS = ["cdo_mx", "forpromotional", "g4_mx"] as const;
type ProviderCode = typeof VALID_PROVIDERS[number];

type PricingRule = {
  provider_code: string;
  base_cost_strategy: string;
  provider_tier_number: number | null;
  cost_factor: number;
  fallback_strategy: string;
  requires_manual_review_on_fallback: boolean;
};

type MarginTier = {
  provider_code: string | null;
  level_number: number;
  multiplier: number;
  applies_to: string;
};

type ProductoResumen = {
  id_interno: string;
  price_status: string;
  stock_status: string;
  image_available: boolean;
  price_valid: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function buildOpaqueIdInterno(
  providerCode: string,
  providerSku: string,
): Promise<string> {
  const h = await sha256Hex(`${providerCode}:${providerSku}`);
  return `pp_${h.slice(0, 24)}`;
}

function whitelistAtributos(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const allowed = [
    "medidas",
    "peso",
    "dimensiones",
    "material",
    "area_impresion",
    "impresion",
    "caja",
    "ventajas",
    "marca",
    "origen",
  ];
  const out: Record<string, unknown> = {};
  const src = raw as Record<string, unknown>;
  for (const k of allowed) {
    if (k in src) out[k] = src[k];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") ?? "dry_run").toLowerCase();
    const providerParam = (url.searchParams.get("provider") ?? "all")
      .toLowerCase();
    const limit = Math.max(0, Number(url.searchParams.get("limit") ?? "50"));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));
    const pilot = (url.searchParams.get("pilot") ?? "true") === "true";
    const requireImage =
      (url.searchParams.get("require_image") ?? "false") === "true";
    const minStock = Math.max(
      0,
      Number(url.searchParams.get("min_stock") ?? "0"),
    );
    const testKey = url.searchParams.get("test_key") ?? "";

    // ---- auth ----
    const expectedKey = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    if (!expectedKey || testKey !== expectedKey) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    if (mode === "full") {
      const header = req.headers.get("x-lovable-pilot") ?? "";
      if (header !== "sprint2") {
        return jsonResponse(
          { ok: false, error: "missing_or_invalid_pilot_header" },
          403,
        );
      }
    }
    if (!["dry_run", "full"].includes(mode)) {
      return jsonResponse({ ok: false, error: "invalid_mode" }, 400);
    }

    const providers: ProviderCode[] = providerParam === "all"
      ? [...VALID_PROVIDERS]
      : VALID_PROVIDERS.includes(providerParam as ProviderCode)
      ? [providerParam as ProviderCode]
      : [];
    if (providers.length === 0) {
      return jsonResponse({ ok: false, error: "invalid_provider" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ---- load pricing rule set (active) ----
    const { data: ruleSetRow, error: ruleSetErr } = await sb
      .from("pricing_rule_sets")
      .select("id")
      .eq("is_active", true)
      .order("active_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ruleSetErr || !ruleSetRow) {
      return jsonResponse(
        { ok: false, error: "no_active_pricing_rule_set" },
        500,
      );
    }
    const ruleSetId = ruleSetRow.id as string;

    // ---- load pricing rules ----
    const { data: pricingRulesRows, error: prErr } = await sb
      .from("provider_pricing_rules")
      .select(
        "provider_code, base_cost_strategy, provider_tier_number, cost_factor, fallback_strategy, requires_manual_review_on_fallback",
      )
      .eq("rule_set_id", ruleSetId);
    if (prErr) {
      return jsonResponse(
        { ok: false, error: "pricing_rules_query_failed" },
        500,
      );
    }
    const pricingRules = new Map<string, PricingRule>();
    for (const r of (pricingRulesRows ?? []) as PricingRule[]) {
      pricingRules.set(r.provider_code, r);
    }

    // ---- load margin tiers (level 1, product) ----
    const { data: marginRows, error: mtErr } = await sb
      .from("margin_tiers")
      .select("provider_code, level_number, multiplier, applies_to")
      .eq("rule_set_id", ruleSetId)
      .eq("applies_to", "product")
      .eq("level_number", 1);
    if (mtErr) {
      return jsonResponse(
        { ok: false, error: "margin_tiers_query_failed" },
        500,
      );
    }
    const marginRowsList = (marginRows ?? []) as MarginTier[];
    function multiplierFor(code: string): number | null {
      const byCode = marginRowsList.find((m) => m.provider_code === code);
      if (byCode) return Number(byCode.multiplier);
      const general = marginRowsList.find((m) => m.provider_code === null);
      return general ? Number(general.multiplier) : null;
    }

    // ---- provider ids ----
    const { data: provRows, error: provErr } = await sb
      .from("proveedores")
      .select("id, code, nombre")
      .in("code", providers);
    if (provErr || !provRows) {
      return jsonResponse(
        { ok: false, error: "providers_lookup_failed" },
        500,
      );
    }
    const providerMeta = new Map<
      string,
      { id: string; nombre: string }
    >();
    for (const p of provRows) {
      providerMeta.set(p.code as string, {
        id: p.id as string,
        nombre: p.nombre as string,
      });
    }

    // ---- snapshot productos_publicos count (before) ----
    let publicCountBefore: number | null = null;
    try {
      const { count } = await sb
        .from("productos_publicos")
        .select("*", { count: "exact", head: true });
      publicCountBefore = count ?? null;
    } catch (_) {
      publicCountBefore = null;
    }

    // ---- selection per provider ----
    const selected: Record<string, number> = {};
    const perProviderRawIds: Record<string, string[]> = {};

    for (const code of providers) {
      const meta = providerMeta.get(code);
      if (!meta) {
        selected[code] = 0;
        perProviderRawIds[code] = [];
        continue;
      }
      const quota = pilot
        ? (PILOT_QUOTAS[code] ?? 0)
        : Math.max(0, limit);

      // Pull a superset of candidates then filter in JS (avoids complex joins).
      const { data: rawCandidates, error: rawErr } = await sb
        .from("provider_raw_products")
        .select("id, provider_sku, nombre, activo, productos_b2b_id")
        .eq("proveedor_id", meta.id)
        .eq("activo", true)
        .is("productos_b2b_id", null)
        .order("provider_sku", { ascending: true })
        .range(offset, offset + Math.max(quota * 8, 100) - 1);
      if (rawErr) {
        return jsonResponse(
          { ok: false, error: "raw_query_failed", detail: rawErr.message },
          500,
        );
      }

      const picks: string[] = [];
      for (const cand of rawCandidates ?? []) {
        if (picks.length >= quota) break;
        const nombre = (cand.nombre ?? "").toString().trim();
        if (nombre.length < 3) continue;

        // offers
        const { data: offers } = await sb
          .from("producto_proveedor_ofertas")
          .select("id, imagen_url, activo")
          .eq("provider_raw_product_id", cand.id)
          .eq("activo", true);
        if (!offers || offers.length === 0) continue;

        const offerIds = offers.map((o) => o.id as string);

        // any already mapped?
        const { data: existingMap } = await sb
          .from("producto_b2b_oferta_map")
          .select("oferta_id")
          .in("oferta_id", offerIds)
          .limit(1);
        if (existingMap && existingMap.length > 0) continue;

        // at least one scale with unit_cost > 0
        const { data: scaleRows } = await sb
          .from("producto_precio_escalas")
          .select("unit_cost")
          .in("oferta_id", offerIds)
          .gt("unit_cost", 0)
          .limit(1);
        if (!scaleRows || scaleRows.length === 0) continue;

        // stock row exists (cantidad can be 0)
        const { data: stockRows } = await sb
          .from("producto_proveedor_stock")
          .select("cantidad")
          .in("oferta_id", offerIds);
        if (!stockRows || stockRows.length === 0) continue;
        const totalQty = stockRows.reduce(
          (a, r) => a + Number(r.cantidad ?? 0),
          0,
        );
        if (totalQty < minStock) continue;

        const hasImage = offers.some((o) => o.imagen_url);
        if (requireImage && !hasImage) continue;

        picks.push(cand.id as string);
      }

      // prioritize with-image (re-sort using cached lookup would need re-query;
      // acceptable to keep provider_sku order for determinism as picks already followed that).
      selected[code] = picks.length;
      perProviderRawIds[code] = picks;
    }

    const totals = {
      inserted_productos_b2b: 0,
      inserted_status: 0,
      inserted_maps: 0,
      inserted_price_cache: 0,
      manual_review_count: 0,
      skipped_count: 0,
    };
    const skipped_reasons: Record<string, number> = {
      no_price: 0,
      no_stock_row: 0,
      already_promoted: 0,
      g4_missing_tier_5: 0,
      no_active_offer: 0,
      internal_error: 0,
    };
    const sample: ProductoResumen[] = [];

    // ---- process each selected raw product ----
    for (const code of providers) {
      const meta = providerMeta.get(code);
      if (!meta) continue;
      const rule = pricingRules.get(code);
      const mult = multiplierFor(code);

      for (const rawId of perProviderRawIds[code] ?? []) {
        try {
          const { data: raw } = await sb
            .from("provider_raw_products")
            .select(
              "id, provider_sku, nombre, descripcion, categoria, raw_payload, productos_b2b_id, activo",
            )
            .eq("id", rawId)
            .maybeSingle();
          if (!raw) {
            totals.skipped_count++;
            skipped_reasons.internal_error++;
            continue;
          }
          if (raw.productos_b2b_id) {
            totals.skipped_count++;
            skipped_reasons.already_promoted++;
            continue;
          }

          const { data: offers } = await sb
            .from("producto_proveedor_ofertas")
            .select(
              "id, variant_sku, color_code, color_nombre, talla, material, modelo, imagen_url, atributos, activo",
            )
            .eq("provider_raw_product_id", rawId)
            .eq("activo", true);
          if (!offers || offers.length === 0) {
            totals.skipped_count++;
            skipped_reasons.no_active_offer++;
            continue;
          }
          const offerIds = offers.map((o) => o.id as string);

          const { data: stockRows } = await sb
            .from("producto_proveedor_stock")
            .select("oferta_id, cantidad, updated_at")
            .in("oferta_id", offerIds);
          if (!stockRows || stockRows.length === 0) {
            totals.skipped_count++;
            skipped_reasons.no_stock_row++;
            continue;
          }
          const stockQty = stockRows.reduce(
            (a, r) => a + Number(r.cantidad ?? 0),
            0,
          );
          const lastStockSync = stockRows
            .map((r) => r.updated_at as string | null)
            .filter(Boolean)
            .sort()
            .pop() ?? null;

          const { data: scales } = await sb
            .from("producto_precio_escalas")
            .select("oferta_id, min_qty, unit_cost")
            .in("oferta_id", offerIds)
            .order("min_qty", { ascending: true });
          if (!scales || scales.length === 0) {
            totals.skipped_count++;
            skipped_reasons.no_price++;
            continue;
          }

          // Choose primary offer: prefer one with image, then smallest UUID
          const sortedOffers = [...offers].sort((a, b) => {
            const ai = a.imagen_url ? 1 : 0;
            const bi = b.imagen_url ? 1 : 0;
            if (ai !== bi) return bi - ai;
            return String(a.id).localeCompare(String(b.id));
          });
          const primaryOffer = sortedOffers[0];
          const primaryScales = scales
            .filter((s) => s.oferta_id === primaryOffer.id)
            .sort((a, b) => Number(a.min_qty) - Number(b.min_qty));

          // ----- pricing -----
          let price_status: "valid" | "manual_review" | "unavailable" =
            "manual_review";
          let pricing_warning: string | null = null;
          let min_price_before_tax: number | null = null;
          let source_oferta_id: string = primaryOffer.id as string;

          if (!rule) {
            price_status = "manual_review";
            pricing_warning = "provider_rule_missing";
          } else if (mult == null) {
            price_status = "manual_review";
            pricing_warning = "provider_rule_missing";
          } else if (!raw.activo) {
            price_status = "unavailable";
            pricing_warning = "no_active_offer";
          } else {
            const strategy = rule.base_cost_strategy;
            const factor = Number(rule.cost_factor ?? 1);
            let baseCost: number | null = null;

            if (strategy === "list_price") {
              const positives = primaryScales
                .map((s) => Number(s.unit_cost))
                .filter((n) => n > 0);
              baseCost = positives.length ? Math.min(...positives) : null;
            } else if (strategy === "list_price_factor") {
              const positives = primaryScales
                .map((s) => Number(s.unit_cost))
                .filter((n) => n > 0);
              const b = positives.length ? Math.min(...positives) : null;
              baseCost = b != null ? b * factor : null;
            } else if (strategy === "provider_tier_n") {
              const tierN = rule.provider_tier_number ?? 0;
              if (primaryScales.length >= tierN && tierN > 0) {
                const chosen = primaryScales[tierN - 1];
                baseCost = Number(chosen.unit_cost) * factor;
              } else {
                if (rule.requires_manual_review_on_fallback) {
                  price_status = "manual_review";
                  pricing_warning = code === "g4_mx"
                    ? "g4_missing_tier_5"
                    : "provider_rule_missing";
                }
              }
            } else {
              price_status = "manual_review";
              pricing_warning = "provider_rule_missing";
            }

            if (
              baseCost != null && pricing_warning == null
            ) {
              if (baseCost <= 0) {
                price_status = "manual_review";
                pricing_warning = "cost_base_zero_or_negative";
              } else {
                const raw_price = baseCost * Number(mult);
                const rounded = Math.round(raw_price * 100) / 100;
                if (rounded < 1) {
                  price_status = "manual_review";
                  pricing_warning = "cost_base_zero_or_negative";
                } else {
                  min_price_before_tax = rounded;
                  price_status = "valid";
                }
              }
            }
          }

          if (price_status === "manual_review") {
            totals.manual_review_count++;
            if (pricing_warning === "g4_missing_tier_5") {
              skipped_reasons.g4_missing_tier_5++;
            }
          }

          // ----- image / status derivations -----
          const image_available = offers.some((o) => o.imagen_url);
          const price_valid = price_status === "valid";
          let stock_status: "disponible" | "bajo" | "agotado" | "consultar";
          let public_visible = false;
          let quote_mode:
            | "cotizable"
            | "consultar_disponibilidad"
            | "no_cotizable";
          let kit_eligible = false;

          if (!raw.activo) {
            public_visible = false;
            stock_status = "agotado";
            quote_mode = "no_cotizable";
            kit_eligible = false;
          } else if (price_status === "unavailable") {
            public_visible = false;
            stock_status = "consultar";
            quote_mode = "no_cotizable";
            kit_eligible = false;
          } else if (price_status === "manual_review") {
            public_visible = false;
            stock_status = "consultar";
            quote_mode = "consultar_disponibilidad";
            kit_eligible = false;
          } else if (stockQty === 0) {
            public_visible = false;
            stock_status = "agotado";
            quote_mode = "consultar_disponibilidad";
            kit_eligible = false;
          } else if (stockQty < 50) {
            public_visible = image_available;
            stock_status = "bajo";
            quote_mode = "cotizable";
            kit_eligible = image_available;
          } else {
            public_visible = image_available;
            stock_status = "disponible";
            quote_mode = "cotizable";
            kit_eligible = image_available;
          }

          const id_interno = await buildOpaqueIdInterno(
            code,
            String(raw.provider_sku),
          );

          const summaryRow: ProductoResumen = {
            id_interno,
            price_status,
            stock_status,
            image_available,
            price_valid,
          };
          if (sample.length < 5) sample.push(summaryRow);

          if (mode === "dry_run") continue;

          // -------------- FULL WRITE PATH --------------

          // 1) productos_b2b (insert if not exists)
          const datosGenerales: Record<string, unknown> = {
            nombre: raw.nombre ?? "",
            descripcion: raw.descripcion ?? "",
            promoted_at: new Date().toISOString(),
            pilot: true,
          };
          const variantesJson = offers.map((o) => ({
            oferta_id: o.id,
            color_code: o.color_code ?? "",
            color_nombre: o.color_nombre ?? "",
            talla: o.talla ?? "",
            material: o.material ?? null,
            modelo: o.modelo ?? null,
            imagen_url: o.imagen_url ?? null,
          }));
          const imagenesJson = Array.from(
            new Set(
              offers.map((o) => o.imagen_url).filter(
                (u): u is string => !!u,
              ),
            ),
          ).map((u) => ({ url: u }));

          // whitelist atributos from first offer only (as sample)
          const especTec = whitelistAtributos(
            (primaryOffer.atributos as unknown) ??
              ((raw.raw_payload as Record<string, unknown>)?.atributos ??
                null),
          );

          const insertProduct = {
            id_interno,
            proveedor_nombre: meta.nombre,
            sku_base: null,
            datos_generales: datosGenerales,
            variantes: variantesJson,
            imagenes: imagenesJson,
            especificaciones_tecnicas: especTec,
            datos_logistica_b2b: {},
            motor_de_personalizacion: {},
            costeo: {},
            activo: false,
            categoria_principal: raw.categoria ?? null,
          };

          // Fetch existing first (for accurate insert vs update accounting)
          const { data: existingProd } = await sb
            .from("productos_b2b")
            .select("id, activo")
            .eq("id_interno", id_interno)
            .maybeSingle();

          let productoB2bId: string;
          if (existingProd) {
            productoB2bId = existingProd.id as string;
            // never re-activate; leave staff-managed rows alone besides pilot fields
            // (do not touch activo — plan says do not modify structure/data outside scope)
          } else {
            const { data: ins, error: insErr } = await sb
              .from("productos_b2b")
              .insert(insertProduct)
              .select("id")
              .single();
            if (insErr || !ins) {
              totals.skipped_count++;
              skipped_reasons.internal_error++;
              continue;
            }
            productoB2bId = ins.id as string;
            totals.inserted_productos_b2b++;
          }

          // 2) producto_b2b_oferta_map — one row per offer, upsert on oferta_id
          const mapRows = offers.map((o) => ({
            producto_b2b_id: productoB2bId,
            id_interno,
            oferta_id: o.id,
            proveedor_id: meta.id,
            provider_code: code,
            is_primary: o.id === primaryOffer.id,
            match_score: 1.0,
            match_reason: o.id === primaryOffer.id
              ? "direct_promotion_from_provider_raw"
              : "secondary_variant",
          }));
          const { error: mapErr, count: mapCount } = await sb
            .from("producto_b2b_oferta_map")
            .upsert(mapRows, { onConflict: "oferta_id", count: "exact" });
          if (mapErr) {
            totals.skipped_count++;
            skipped_reasons.internal_error++;
            continue;
          }
          totals.inserted_maps += mapCount ?? mapRows.length;

          // 3) catalog_price_cache — SELECT then INSERT/UPDATE
          const cacheRow = {
            producto_b2b_id: productoB2bId,
            id_interno,
            min_price_before_tax_mxn: min_price_before_tax,
            tax_included: false,
            currency: "MXN",
            pricing_rule_set_id: ruleSetId,
            provider_code: code,
            source_oferta_id,
            price_status,
            pricing_warning,
            calculated_at: new Date().toISOString(),
          };
          const { data: existingCache } = await sb
            .from("catalog_price_cache")
            .select("id")
            .eq("producto_b2b_id", productoB2bId)
            .maybeSingle();
          if (existingCache) {
            const { error: upErr } = await sb
              .from("catalog_price_cache")
              .update(cacheRow)
              .eq("id", existingCache.id);
            if (!upErr) totals.inserted_price_cache++;
          } else {
            const { error: cacheErr } = await sb
              .from("catalog_price_cache")
              .insert(cacheRow);
            if (!cacheErr) totals.inserted_price_cache++;
          }

          // 4) producto_b2b_status — SELECT then INSERT/UPDATE
          const statusRow = {
            producto_b2b_id: productoB2bId,
            id_interno,
            public_visible,
            stock_status,
            stock_qty: stockQty,
            quote_mode,
            kit_eligible,
            price_valid,
            image_available,
            last_stock_sync_at: lastStockSync,
          };
          const { data: existingStatus } = await sb
            .from("producto_b2b_status")
            .select("id")
            .eq("producto_b2b_id", productoB2bId)
            .maybeSingle();
          if (existingStatus) {
            const { error: upSErr } = await sb
              .from("producto_b2b_status")
              .update(statusRow)
              .eq("id", existingStatus.id);
            if (!upSErr) totals.inserted_status++;
          } else {
            const { error: stErr } = await sb
              .from("producto_b2b_status")
              .insert(statusRow);
            if (!stErr) totals.inserted_status++;
          }

          // 5) inverse link
          await sb
            .from("provider_raw_products")
            .update({ productos_b2b_id: productoB2bId })
            .eq("id", rawId)
            .is("productos_b2b_id", null);
        } catch (_e) {
          totals.skipped_count++;
          skipped_reasons.internal_error++;
        }
      }
    }

    // ---- snapshot after ----
    let publicCountAfter: number | null = null;
    try {
      const { count } = await sb
        .from("productos_publicos")
        .select("*", { count: "exact", head: true });
      publicCountAfter = count ?? null;
    } catch (_) {
      publicCountAfter = null;
    }
    const publicCountDelta =
      publicCountBefore != null && publicCountAfter != null
        ? publicCountAfter - publicCountBefore
        : null;

    const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
    return jsonResponse({
      ok: true,
      mode,
      provider: providerParam,
      selected,
      inserted_productos_b2b: totals.inserted_productos_b2b,
      inserted_status: totals.inserted_status,
      inserted_maps: totals.inserted_maps,
      inserted_price_cache: totals.inserted_price_cache,
      manual_review_count: totals.manual_review_count,
      skipped_count: totals.skipped_count,
      skipped_reasons,
      sample,
      next_offset: totalSelected > 0 ? offset + totalSelected : null,
      has_more: false,
      public_view_count_before: publicCountBefore,
      public_view_count_after: publicCountAfter,
      public_view_count_delta: publicCountDelta,
    });

  } catch (e) {
    return jsonResponse(
      { ok: false, error: "unhandled", detail: String(e) },
      500,
    );
  }
});
