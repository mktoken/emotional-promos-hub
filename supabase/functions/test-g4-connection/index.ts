// Edge Function temporal: test-g4-connection
// Diagnóstico de conexión SOAP con WebService G4.
// No persiste datos. No expone secrets.

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
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">
  <soap:Body>
    <tns:${method}>
      <tns:user>${escapeXml(user)}</tns:user>
      <tns:key>${escapeXml(key)}</tns:key>
      <tns:sku>${escapeXml(sku)}</tns:sku>
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
}

function tryDecodeBase64(text: string): string | null {
  try {
    // Extraer contenido entre tags del Result/Return si existe
    const inner = text.match(/<[^>]*(?:Result|Return)[^>]*>([\s\S]*?)<\/[^>]*(?:Result|Return)[^>]*>/i);
    const candidate = (inner?.[1] ?? text).trim();
    // Heurística base64
    if (/^[A-Za-z0-9+/=\s]+$/.test(candidate) && candidate.length > 16) {
      const cleaned = candidate.replace(/\s+/g, "");
      const bin = atob(cleaned);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const attempts: Array<Record<string, unknown>> = [];

  try {
    const G4_USER = Deno.env.get("G4_USER") ?? "";
    const G4_KEY = Deno.env.get("G4_KEY") ?? "";
    const G4_WSDL_URL = Deno.env.get("G4_WSDL_URL") ?? "";
    const PROVIDERS_TEST_KEY = Deno.env.get("PROVIDERS_TEST_KEY") ?? "";
    const G4_TEST_KEY = Deno.env.get("G4_TEST_KEY") ?? "";

    if (!G4_USER || !G4_KEY || !G4_WSDL_URL || (!PROVIDERS_TEST_KEY && !G4_TEST_KEY)) {
      return jsonResponse(500, {
        ok: false,
        error: "Faltan secrets G4_USER, G4_KEY, G4_WSDL_URL o algún test_key",
        attempts,
      });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");
    const sku = url.searchParams.get("sku");
    const testKey = url.searchParams.get("test_key");

    const validTestKey = PROVIDERS_TEST_KEY || G4_TEST_KEY;
    if (testKey !== validTestKey) {
      return jsonResponse(401, {
        ok: false,
        error: "test_key inválido",
        attempts,
      });
    }

    if (mode !== "product" && mode !== "stock" && mode !== "sample") {
      return jsonResponse(400, {
        ok: false,
        error: "Parámetro mode debe ser 'product', 'stock' o 'sample'",
        attempts,
      });
    }
    if (mode !== "sample" && !sku) {
      return jsonResponse(400, {
        ok: false,
        error: "Parámetro sku requerido",
        attempts,
      });
    }

    const method: "getProduct" | "getProductStock" =
      mode === "stock" ? "getProductStock" : "getProduct";
    const effectiveSku = mode === "sample" ? "" : (sku ?? "");

    // Probar varios namespaces comunes para SOAP G4
    const namespaces = [
      "http://tempuri.org/",
      "http://www.4promotional.net/",
      "urn:G4",
    ];

    const endpoint = G4_WSDL_URL.replace(/\?wsdl.*$/i, "");

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

        if (res.ok && !isFault) {
          const decoded = tryDecodeBase64(text) ?? text;
          if (mode === "sample") {
            const productMatches = decoded.match(/<([a-zA-Z_][\w.]*:)?product\b[^>]*>/gi) || [];
            const productCountDetected = productMatches.length;
            const firstProductMatch = decoded.match(/<([a-zA-Z_][\w.]*:)?product\b[^>]*>([\s\S]*?)<\/([a-zA-Z_][\w.]*:)?product>/i);
            let firstProductKeys: string[] = [];
            let sampleSku: string | null = null;
            if (firstProductMatch) {
              const inner = firstProductMatch[2];
              const keyMatches = inner.match(/<([a-zA-Z_][\w.]*)[^>]*>/g) || [];
              firstProductKeys = [...new Set(keyMatches.map(k => {
                const m = k.match(/<([a-zA-Z_][\w.]*)[^>]*>/);
                return m ? m[1].split(":").pop()! : "";
              }).filter(Boolean))];
              const skuMatch = inner.match(/<[^>]*\bsku\b[^>]*>([^<]*)<\/[^>]*>/i) || inner.match(/<[^>]*\bcode\b[^>]*>([^<]*)<\/[^>]*>/i);
              sampleSku = skuMatch ? skuMatch[1].trim() : null;
            }
            return jsonResponse(200, {
              ok: true,
              mode,
              method,
              status: res.status,
              productCountDetected,
              firstProductKeys,
              sampleSku,
              decodedXmlPreview: decoded.slice(0, 1000),
              attempts,
            });
          }
          return jsonResponse(200, {
            ok: true,
            mode,
            method,
            sku,
            decodedXml: decoded,
            attempts,
          });
        }
      } catch (err) {
        attempts.push({
          namespace: ns,
          soapAction,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return jsonResponse(502, {
      ok: false,
      error: `No se obtuvo respuesta válida del WebService (último status ${lastStatus})`,
      attempts,
      responsePreview: lastResponseText.slice(0, 2000),
    });
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      attempts,
    });
  }
});
