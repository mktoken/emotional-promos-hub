// Edge Function temporal: test-forpromotional-connection
// Diagnóstico de conexión con API ForPromotional / 4Promotional.
// No persiste datos. No expone tokens. No expone proveedor al frontend público.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function safeBool(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v as object).length > 0;
  return Boolean(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const TOKEN = Deno.env.get("FORPROMOTIONAL_API_TOKEN") ?? "";
    const TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";

    if (!TOKEN || !TEST_KEY) {
      return jsonResponse(500, {
        ok: false,
        error_message:
          "Faltan secrets FORPROMOTIONAL_API_TOKEN o PROVIDERS_TEST_KEY",
      });
    }

    const url = new URL(req.url);
    const testKey = url.searchParams.get("test_key");
    if (testKey !== TEST_KEY) {
      return jsonResponse(401, { ok: false, error_message: "test_key inválido" });
    }

    const endpoint = "https://api-external-clients.4promotional.net/api/products";

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${TOKEN}`,
        "accept": "application/json",
      },
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      // respuesta no-JSON
    }

    // Localizar primer producto en la estructura
    let firstProduct: Record<string, unknown> | null = null;
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
      firstProduct = data[0] as Record<string, unknown>;
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidateKeys = ["products", "data", "items", "results"];
      for (const k of candidateKeys) {
        const arr = obj[k];
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "object") {
          firstProduct = arr[0] as Record<string, unknown>;
          break;
        }
      }
    }

    const hasProducts = firstProduct !== null;
    const hasPrice = hasProducts
      ? safeBool(
          firstProduct!["price"] ??
            firstProduct!["prices"] ??
            firstProduct!["unit_price"] ??
            firstProduct!["cost"],
        )
      : false;
    const hasStock = hasProducts
      ? safeBool(
          firstProduct!["stock"] ??
            firstProduct!["inventory"] ??
            firstProduct!["available"] ??
            firstProduct!["quantity"],
        )
      : false;
    const hasImages = hasProducts
      ? safeBool(
          firstProduct!["images"] ??
            firstProduct!["image"] ??
            firstProduct!["picture"] ??
            firstProduct!["photos"],
        )
      : false;
    const hasVariants = hasProducts
      ? safeBool(
          firstProduct!["variants"] ??
            firstProduct!["variations"] ??
            firstProduct!["colors"] ??
            firstProduct!["options"],
        )
      : false;

    if (!res.ok) {
      return jsonResponse(res.status, {
        ok: false,
        provider: "forpromotional",
        status: res.status,
        hasProducts,
        hasPrice,
        hasStock,
        hasImages,
        hasVariants,
        error_message: `HTTP ${res.status}`,
      });
    }

    return jsonResponse(200, {
      ok: true,
      provider: "forpromotional",
      status: res.status,
      hasProducts,
      hasPrice,
      hasStock,
      hasImages,
      hasVariants,
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      provider: "forpromotional",
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
