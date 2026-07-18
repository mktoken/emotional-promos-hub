// Edge Function: test-g4-connection
// Diagnóstico de conexión SOAP con WebService G4.
// No persiste datos. No expone secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const DEFAULT_SAMPLE_SKU = "lib-bio-neg";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSoapEnvelope(
  method: "getProduct" | "getProductStock",
  user: string,
  key: string,
  sku: string,
  namespace: string,
): string {
  const skuNode = sku ? `<tns:sku>${escapeXml(sku)}</tns:sku>` : "";
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">
  <soap:Body>
    <tns:${method}>
      <tns:user>${escapeXml(user)}</tns:user>
      <tns:key>${escapeXml(key)}</tns:key>
      ${skuNode}
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
}

function tryDecodeBase64(text: string): { decoded: string | null; wasDecoded: boolean } {
  try {
    const inner = text.match(/<[^>]*(?:Result|Return)[^>]*>([\s\S]*?)<\/[^>]*(?:Result|Return)[^>]*>/i);
    const candidate = (inner?.[1] ?? text).trim();
    if (/^[A-Za-z0-9+/=\s]+$/.test(candidate) && candidate.length > 16) {
      const cleaned = candidate.replace(/\s+/g, "");
      const bin = atob(cleaned);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const decoded = new TextDecoder("utf-8").decode(bytes);
      return { decoded, wasDecoded: true };
    }
    return { decoded: null, wasDecoded: false };
  } catch {
    return { decoded: null, wasDecoded: false };
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanUrl(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  let s = decodeHtmlEntities(String(v)).trim();
  if (!s) return null;
  const cdata = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) s = cdata[1].trim();
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function extractElementsWithAttrUrl(xml: string, tag: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const selfRe = new RegExp(`<${tag}\\b([^>]*)\\/>`, "gi");
  const openRe = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi");
  const readAttrUrl = (openTag: string): string | null => {
    const m = openTag.match(/\burl\s*=\s*"([^"]*)"/i);
    return m ? cleanUrl(m[1]) : null;
  };
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(xml)) !== null) {
    const url = readAttrUrl(m[1]) ?? cleanUrl(m[2].trim());
    if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
  }
  while ((m = selfRe.exec(xml)) !== null) {
    const url = readAttrUrl(m[1]);
    if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

function detectImages(xml: string): {
  principal: string | null;
  ambientada: string | null;
  additionalCount: number;
  firstImage: string | null;
} {
  const imgBlock = xml.match(/<imagenes\b[^>]*>([\s\S]*?)<\/imagenes\s*>/i);
  const imagesXml = imgBlock?.[1] ?? "";
  const principal = extractElementsWithAttrUrl(imagesXml, "principal")[0] ?? null;
  const ambientada = extractElementsWithAttrUrl(imagesXml, "ambientada")[0] ?? null;
  const adBlock = imagesXml.match(/<adicionales\b[^>]*>([\s\S]*?)<\/adicionales\s*>/i);
  const adXml = adBlock?.[1] ?? "";
  const additional: string[] = [];
  for (const tag of ["adicional", "imagen", "url", "item"]) {
    for (const u of extractElementsWithAttrUrl(adXml, tag)) {
      if (!additional.includes(u)) additional.push(u);
    }
  }
  const firstImage = principal ?? ambientada ?? additional[0] ?? null;
  return { principal, ambientada, additionalCount: additional.length, firstImage };
}

function extractProducts(xml: string): {
  count: number;
  sample: Record<string, string> | null;
} {
  const productRegex = /<([a-zA-Z_][\w.]*:)?product\b[^>]*>([\s\S]*?)<\/([a-zA-Z_][\w.]*:)?product>/gi;
  const matches = [...xml.matchAll(productRegex)];
  let count = matches.length;
  let sampleInner: string | null = matches[0]?.[2] ?? null;

  if (count === 0) {
    const hasFields = /<[^>]*\b(codigo_producto|nombre_producto|sku|precio|existencias)\b[^>]*>[^<]+<\//i.test(xml);
    if (hasFields) {
      count = 1;
      sampleInner = xml;
    }
  }

  if (!sampleInner) return { count, sample: null };

  const fields = ["codigo_producto", "codigo_color", "nombre_producto", "precio", "existencias", "sku", "code"];
  const sample: Record<string, string> = {};
  for (const f of fields) {
    const re = new RegExp(`<[^>]*\\b${f}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*\\b${f}\\b[^>]*>`, "i");
    const m = sampleInner.match(re);
    if (m && m[1]) sample[f] = m[1].trim().slice(0, 200);
  }
  return { count, sample: Object.keys(sample).length > 0 ? sample : null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const attempts: Array<Record<string, unknown>> = [];

  try {
    const G4_USER = Deno.env.get("G4_USER") ?? "";
    const G4_KEY = Deno.env.get("G4_KEY") ?? "";
    const G4_WSDL_URL = Deno.env.get("G4_WSDL_URL") ?? "https://distr.ws.g4mexico.com/index.php?wsdl";
    const PROVIDERS_TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const G4_TEST_KEY = Deno.env.get("G4_TEST_KEY") ?? "";

    if (!G4_USER || !G4_KEY) {
      return jsonResponse(500, {
        ok: false,
        provider: "g4",
        error: "Faltan secrets G4_USER o G4_KEY",
      });
    }
    if (!PROVIDERS_TEST_KEY && !G4_TEST_KEY) {
      return jsonResponse(500, {
        ok: false,
        provider: "g4",
        error: "Falta secret PROVIDERS_TEST_KEY o G4_TEST_KEY",
      });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "sample";
    const skuParam = url.searchParams.get("sku");
    const testKey = url.searchParams.get("test_key");

    const validTestKey = PROVIDERS_TEST_KEY || G4_TEST_KEY;
    if (testKey !== validTestKey) {
      return jsonResponse(401, {
        ok: false,
        provider: "g4",
        error: "test_key inválido",
      });
    }

    const validModes = ["product", "stock", "sample"];
    if (!validModes.includes(mode)) {
      return jsonResponse(400, {
        ok: false,
        provider: "g4",
        error: `Parámetro mode debe ser uno de: ${validModes.join(", ")}`,
      });
    }

    // sample usa lib-bio-neg por defecto; product/stock requieren sku
    let effectiveSku = "";
    if (mode === "sample") {
      effectiveSku = skuParam && skuParam.trim() ? skuParam.trim() : DEFAULT_SAMPLE_SKU;
    } else {
      if (!skuParam) {
        return jsonResponse(400, {
          ok: false,
          provider: "g4",
          error: "Parámetro sku requerido para mode=product o mode=stock",
        });
      }
      effectiveSku = skuParam;
    }

    const method: "getProduct" | "getProductStock" =
      mode === "stock" ? "getProductStock" : "getProduct";

    const endpoint = G4_WSDL_URL.replace(/\?wsdl.*$/i, "");
    const namespaces = [
      "http://tempuri.org/",
      "http://www.4promotional.net/",
      "urn:G4",
    ];

    let lastResponseText = "";
    let lastStatus = 0;

    for (const ns of namespaces) {
      const envelope = buildSoapEnvelope(method, G4_USER, G4_KEY, effectiveSku, ns);
      const soapAction = `${ns}${ns.endsWith("/") ? "" : "/"}${method}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": `"${soapAction}"`,
          },
          body: envelope,
        });
        const text = await res.text();
        lastResponseText = text;
        lastStatus = res.status;

        const isFault = /<(?:\w+:)?Fault[\s>]/i.test(text);
        attempts.push({
          namespace: ns,
          soapAction,
          status: res.status,
          ok: res.ok && !isFault,
          length: text.length,
        });

        if (!res.ok || isFault) continue;

        const { decoded, wasDecoded } = tryDecodeBase64(text);
        const xmlToParse = decoded ?? text;
        const { count, sample } = extractProducts(xmlToParse);
        const hasProducts = count > 0;

        if (hasProducts) {
          return jsonResponse(200, {
            ok: true,
            provider: "g4",
            mode,
            sku: effectiveSku,
            method,
            status: res.status,
            base64Decoded: wasDecoded,
            hasProducts: true,
            productCountDetected: count,
            sampleProduct: sample,
            namespace: ns,
            decodedXmlPreview: xmlToParse.slice(0, 500),
            attempts,
          });
        }

        // Respuesta válida pero sin productos: seguir probando namespaces
        attempts[attempts.length - 1].note = "sin productos detectados";
      } catch (err) {
        attempts.push({
          namespace: ns,
          soapAction,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Ningún namespace devolvió productos
    const { decoded, wasDecoded } = tryDecodeBase64(lastResponseText);
    return jsonResponse(200, {
      ok: false,
      provider: "g4",
      mode,
      sku: effectiveSku,
      method,
      status: lastStatus,
      base64Decoded: wasDecoded,
      hasProducts: false,
      productCountDetected: 0,
      sampleProduct: null,
      error: "No se detectaron productos en la respuesta del WebService G4",
      decodedXmlPreview: (decoded ?? lastResponseText).slice(0, 1000),
      attempts,
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      provider: "g4",
      error: e instanceof Error ? e.message : String(e),
      attempts,
    });
  }
});
