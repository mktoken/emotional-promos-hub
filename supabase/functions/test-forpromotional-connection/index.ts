// Edge Function temporal: test-forpromotional-connection
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
  "precio", "price", "cost", "costo", "tarifa", "importe", "amount", "valor",
];
const STOCK_PATTERNS = [
  "stock", "inventario", "inventory", "existencia", "available",
  "disponib", "quantity", "cantidad",
];
const IMAGE_PATTERNS = [
  "image", "imagen", "img", "foto", "picture", "photo", "thumbnail", "thumb",
];
const VARIANT_PATTERNS = [
  "variant", "variacion", "variación", "color", "modelo", "model",
  "option", "talla", "size", "material",
];

function matchFields(keys: string[], patterns: string[]): string[] {
  const lower = keys.map((k) => ({ raw: k, low: k.toLowerCase() }));
  const found = new Set<string>();
  for (const { raw, low } of lower) {
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
  // un nivel de anidación, sin valores
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
      const candidateKeys = ["products", "productos", "data", "items", "results", "articulos"];
      for (const k of candidateKeys) {
        const arr = obj[k];
        if (Array.isArray(arr)) {
          productList = arr;
          break;
        }
      }
      if (productList.length === 0) {
        // buscar primer array de objetos
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
      provider: "forpromotional",
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
      provider: "forpromotional",
      error_message: e instanceof Error ? e.message : "error desconocido",
    });
  }
});
