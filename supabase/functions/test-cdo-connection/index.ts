// Edge Function temporal: test-cdo-connection
// Diagnóstico seguro de estructura. No expone valores ni tokens.

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

const PRICE_PATTERNS = [
  "precio", "price", "cost", "costo", "tarifa", "importe", "amount", "valor", "net",
];
const STOCK_PATTERNS = [
  "stock", "inventario", "inventory", "existencia", "available",
  "disponib", "quantity", "cantidad",
];
const IMAGE_PATTERNS = [
  "image", "imagen", "img", "foto", "picture", "photo", "thumbnail", "thumb", "icon",
];
const VARIANT_PATTERNS = [
  "variant", "variacion", "variación", "color", "modelo", "model",
  "option", "talla", "size", "material", "sku",
];

function matchFields(keys: string[], patterns: string[]): string[] {
  const found = new Set<string>();
  for (const raw of keys) {
    const low = raw.toLowerCase();
    for (const p of patterns) {
      if (low.includes(p)) {
        found.add(raw);
        break;
      }
    }
  }
  return Array.from(found);
}

function collectKeys(obj: Record<string, unknown>): string[] {
  const out = new Set<string>(Object.keys(obj));
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        out.add(k);
      }
    } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null) {
      for (const k of Object.keys(v[0] as Record<string, unknown>)) {
        out.add(k);
      }
    }
  }
  return Array.from(out);
}

function shapeSummary(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    let t: string = typeof v;
    if (v === null) t = "null";
    else if (Array.isArray(v)) t = `array[${v.length}]`;
    else if (typeof v === "object") t = "object";
    parts.push(`${k}:${t}`);
  }
  return parts.join(", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const TOKEN_MX = Deno.env.get("CDO_MEXICO_API_TOKEN") ?? "";
    const TOKEN_TEST = Deno.env.get("CDO_TEST_API_TOKEN") ?? "";
    const TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";

    if (!TEST_KEY) {
      return jsonResponse(500, {
        ok: false,
        error_message: "Falta secret PROVIDERS_TEST_KEY",
      });
    }

    const url = new URL(req.url);
    const testKey = url.searchParams.get("test_key");
    if (testKey !== TEST_KEY) {
      return jsonResponse(401, { ok: false, error_message: "test_key inválido" });
    }

    const env = (url.searchParams.get("env") ?? "mx").toLowerCase();
    let endpoint = "";
    let token = "";

    if (env === "test" || env === "ar" || env === "sandbox") {
      endpoint = "http://api.argentina.cdo.dev.yellowspot.com.ar/v2/products";
      token = TOKEN_TEST;
      if (!token) {
        return jsonResponse(500, {
          ok: false,
          error_message: "Falta secret CDO_TEST_API_TOKEN",
        });
      }
    } else {
      endpoint = "http://api.mexico.cdopromocionales.com/v2/products";
      token = TOKEN_MX;
      if (!token) {
        return jsonResponse(500, {
          ok: false,
          error_message: "Falta secret CDO_MEXICO_API_TOKEN",
        });
      }
    }

    const fullUrl = `${endpoint}?auth_token=${encodeURIComponent(token)}&page_size=1&page_number=1`;

    const res = await fetch(fullUrl, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      // no-JSON
    }

    let topLevelKeys: string[] = [];
    let productList: unknown[] = [];
    let firstProduct: Record<string, unknown> | null = null;

    if (Array.isArray(data)) {
      productList = data;
      topLevelKeys = ["<root_array>"];
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      topLevelKeys = Object.keys(obj);
      const candidateKeys = ["products", "productos", "data", "items", "results"];
      for (const k of candidateKeys) {
        const arr = obj[k];
        if (Array.isArray(arr)) {
          productList = arr;
          break;
        }
      }
      if (productList.length === 0) {
        for (const v of Object.values(obj)) {
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
            productList = v;
            break;
          }
        }
      }
    }

    if (productList.length > 0 && typeof productList[0] === "object" && productList[0] !== null) {
      firstProduct = productList[0] as Record<string, unknown>;
    }

    const firstProductKeys = firstProduct ? collectKeys(firstProduct) : [];
    const safeShapeSummary = firstProduct ? shapeSummary(firstProduct) : "";

    const detectedPriceFields = matchFields(firstProductKeys, PRICE_PATTERNS);
    const detectedStockFields = matchFields(firstProductKeys, STOCK_PATTERNS);
    const detectedImageFields = matchFields(firstProductKeys, IMAGE_PATTERNS);
    const detectedVariantFields = matchFields(firstProductKeys, VARIANT_PATTERNS);

    return jsonResponse(res.ok ? 200 : res.status, {
      ok: res.ok,
      provider: "cdo",
      env,
      status: res.status,
      hasProducts: firstProduct !== null,
      productCountDetected: productList.length,
      topLevelKeys,
      firstProductKeys,
      detectedPriceFields,
      detectedStockFields,
      detectedImageFields,
      detectedVariantFields,
      safeShapeSummary,
      ...(res.ok ? {} : { error_message: `HTTP ${res.status}` }),
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      provider: "cdo",
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
