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
  identifier: string,
  namespace: string,
  parameterName: string = "sku",
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">
  <soap:Body>
    <tns:${method}>
      <tns:user>${escapeXml(user)}</tns:user>
      <tns:key>${escapeXml(key)}</tns:key>
      <tns:${parameterName}>${escapeXml(identifier)}</tns:${parameterName}>
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
}

function tryDecodeBase64(text: string): string | null {
  try {
    const inner = text.match(/<[^>]*(?:Result|Return)[^>]*>([\s\S]*?)<\/[^>]*(?:Result|Return)[^>]*>/i);
    const candidate = (inner?.[1] ?? text).trim();
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

// Detecta si el XML decodificado contiene un producto reconocible
// Campos esperados: codigo_producto, codigo_color, nombre_producto, precio,
// existencias, sku, code.
function detectProductInXml(xml: string): {
  found: boolean;
  detectedFields: string[];
  messageCode: string | null;
  messageDescription: string | null;
} {
  const fieldsToProbe = [
    "codigo_producto",
    "codigo_color",
    "nombre_producto",
    "precio",
    "existencias",
    "sku",
    "code",
  ];
  const detected: string[] = [];
  for (const f of fieldsToProbe) {
    const re = new RegExp(`<[^>]*\\b${f}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*\\b${f}\\b[^>]*>`, "i");
    const m = xml.match(re);
    if (m && m[1] && m[1].trim().length > 0) {
      detected.push(f);
    }
  }

  // Códigos/mensajes de respuesta típicos de WS PHP
  const codeMatch = xml.match(/<[^>]*\b(?:codigo|code|status|resultado)\b[^>]*>([^<]+)<\/[^>]*>/i);
  const descMatch = xml.match(/<[^>]*\b(?:mensaje|message|descripcion|description)\b[^>]*>([^<]+)<\/[^>]*>/i);

  // Considera encontrado si detectó al menos un campo de producto (no solo mensaje)
  const productFields = detected.filter(
    (f) => f !== "code" || /<[^>]*\bcode\b[^>]*>[^<]{3,}<\//i.test(xml),
  );
  const hasProductIndicators = detected.some((f) =>
    ["codigo_producto", "nombre_producto", "precio", "existencias", "sku"].includes(f),
  );

  return {
    found: hasProductIndicators && productFields.length > 0,
    detectedFields: detected,
    messageCode: codeMatch ? codeMatch[1].trim().slice(0, 120) : null,
    messageDescription: descMatch ? descMatch[1].trim().slice(0, 240) : null,
  };
}

function buildValueVariants(raw: string): Array<{ label: string; value: string }> {
  const original = raw;
  const variants = [
    { label: "original", value: original },
    { label: "uppercase", value: original.toUpperCase() },
    { label: "lowercase", value: original.toLowerCase() },
    { label: "sin_guiones", value: original.replace(/-/g, "") },
    { label: "uppercase_sin_guiones", value: original.toUpperCase().replace(/-/g, "") },
    { label: "guion_bajo", value: original.replace(/-/g, "_") },
  ];
  // Deduplicar por value, conservando primer label
  const seen = new Set<string>();
  return variants.filter((v) => {
    if (seen.has(v.value)) return false;
    seen.add(v.value);
    return true;
  });
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

    const validModes = ["product", "stock", "sample", "diagnose-g4-sku"];
    if (!mode || !validModes.includes(mode)) {
      return jsonResponse(400, {
        ok: false,
        error: `Parámetro mode debe ser uno de: ${validModes.join(", ")}`,
        attempts,
      });
    }
    if ((mode === "product" || mode === "stock" || mode === "diagnose-g4-sku") && !sku) {
      return jsonResponse(400, {
        ok: false,
        error: "Parámetro sku requerido",
        attempts,
      });
    }

    const endpoint = G4_WSDL_URL.replace(/\?wsdl.*$/i, "");
    const namespaces = [
      "http://tempuri.org/",
      "http://www.4promotional.net/",
      "urn:G4",
    ];

    // ===== MODE: diagnose-g4-sku =====
    if (mode === "diagnose-g4-sku") {
      const parameterNames = ["sku", "codigo_producto", "codigo", "code", "clave"];
      const valueVariants = buildValueVariants(sku!);
      const methods: Array<"getProduct" | "getProductStock"> = ["getProduct", "getProductStock"];

      const diagnoseAttempts: Array<Record<string, unknown>> = [];
      let successful = 0;

      // Para limitar carga, usamos solo el primer namespace que dé HTTP 200 (no fault) o el primero por defecto
      // pero para diagnóstico probamos con el primer namespace de la lista únicamente.
      const ns = namespaces[0];

      for (const method of methods) {
        for (const paramName of parameterNames) {
          for (const variant of valueVariants) {
            const envelope = buildSoapEnvelope(method, G4_USER, G4_KEY, variant.value, ns, paramName);
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
              const decoded = tryDecodeBase64(text) ?? text;
              const detection = detectProductInXml(decoded);
              if (detection.found) successful++;
              diagnoseAttempts.push({
                method,
                parameter_name: paramName,
                value_variant: variant.label,
                status: res.status,
                found_product: detection.found,
                detected_fields: detection.detectedFields,
                message_code: detection.messageCode,
                message_description: detection.messageDescription,
                decodedXmlPreview: decoded.slice(0, 500),
              });
            } catch (err) {
              diagnoseAttempts.push({
                method,
                parameter_name: paramName,
                value_variant: variant.label,
                status: 0,
                found_product: false,
                error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
              });
            }
          }
        }
      }

      const summary: Record<string, number> = {};
      for (const a of diagnoseAttempts) {
        if (a.found_product) {
          const key = `${a.method}|${a.parameter_name}|${a.value_variant}`;
          summary[key] = (summary[key] ?? 0) + 1;
        }
      }

      return jsonResponse(200, {
        ok: true,
        mode,
        sku_original: sku,
        namespace_used: ns,
        successful_attempts: successful,
        attempts_summary: summary,
        attempts: diagnoseAttempts,
      });
    }

    // ===== MODES: product / stock / sample =====
    const method: "getProduct" | "getProductStock" =
      mode === "stock" ? "getProductStock" : "getProduct";
    const effectiveSku = mode === "sample" ? "" : (sku ?? "");

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
              const skuMatch = inner.match(/<[^>]*\b(?:codigo_producto|sku|code|clave)\b[^>]*>([^<]*)<\/[^>]*>/i);
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
