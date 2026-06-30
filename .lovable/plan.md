# Diagnóstico G4 — Identificación de productos

Solo lectura. No se modificó código, BD, RLS ni frontend. No se ejecutó sync.

## 1. Qué se revisó

- `supabase/functions/test-g4-connection/index.ts` (envelope SOAP construido por nosotros).
- Intento de fetch del WSDL real: **no accesible desde el sandbox** (sin egress hacia el host de `G4_WSDL_URL`, que vive como secret). No se pudo confirmar el contrato real contra el WSDL — todo lo siguiente es lo que el **código actual asume**, no lo que G4 necesariamente exige.

## 2. Lo que el código asume hoy

El envelope que arma `buildSoapEnvelope` es:

```xml
<tns:getProduct>
  <tns:user>...</tns:user>
  <tns:key>...</tns:key>
  <tns:sku>...</tns:sku>
</tns:getProduct>
```

- Parámetro de identificación: `**sku**` (literal). No usa `codigo_producto`, `code`, `id`, ni `clave`.
- Namespaces probados, en orden: `http://tempuri.org/`, `http://www.4promotional.net/`, `urn:G4`. Ninguno es claramente "el oficial" de G4 — es prueba y error.
- `mode=sample` manda `<tns:sku></tns:sku>` vacío → asume que G4 devuelve catálogo completo si el SKU va vacío. **No confirmado contra WSDL.**
- `getProductStock` usa exactamente el mismo envelope, solo cambia el nombre del método → asume el mismo identificador (`sku`).
- Decoder: `tryDecodeBase64` busca el contenido entre `*Result` / `*Return` y lo decodifica de Base64. Esto sugiere que la integración fue diseñada esperando que G4 devuelva un XML interno empaquetado en Base64 (patrón típico de WS PHP/SOAP mexicanos como CDO, 4Promotional, G4).
- En el parser de `sample` busca etiquetas: `product`, y dentro intenta extraer `sku` o `code`. No busca `codigo_producto` ni `clave`.

## 3. Respuestas directas a tus 6 preguntas

1. **Parámetro de getProduct según código**: `sku` (envuelto como `<tns:sku>` en el namespace activo). No hay alternativa implementada.
2. **Formato del SKU**: el código no normaliza nada — pasa el valor crudo por `escapeXml`. No lo pone en mayúsculas, no quita ni agrega guiones. Lo que mandes en `?sku=` es lo que viaja. **No hay evidencia en el código de qué formato espera G4 realmente.**
3. **¿getProduct permite consultar sin SKU?**: el código lo permite vía `mode=sample` (manda SKU vacío) y espera recibir un listado de `<product>`. **No está validado contra el WSDL** — puede que G4 devuelva fault si el SKU es obligatorio.
4. **¿getProductStock usa el mismo identificador?**: sí, en el código actual es idéntico (`<tns:sku>`). No hay variante para `codigo_color` ni para identificar variantes de stock por color/talla.
5. **Campos como `codigo_producto`, `codigo_color`, `clave` en el XML**: **no aparecen** en el código. El parser solo reconoce `<product>`, `sku` y `code` como fallback. Si G4 devuelve esos nombres, hoy se ignoran silenciosamente.
6. **Qué formato de SKU probar**: con la información disponible **no se puede afirmar** un formato canónico. Recomendación de pruebas (en este orden, una a la vez con `mode=product&sku=...`):
  - SKU exacto tal cual aparece en el catálogo público de G4 (web).
  - Mismo SKU en MAYÚSCULAS.
  - Mismo SKU **sin guiones** ni espacios.
  - Mismo SKU **con guion bajo** en lugar de guion medio.
  - Solo la "raíz" del SKU (sin sufijo de color/talla), por si G4 lo trata como `codigo_producto` padre.

## 4. Recomendación antes de seguir gastando intentos

Antes de iterar a ciegas con SKUs:

- **Ejecutar `mode=sample` primero** (ya implementado). Si responde `productCountDetected > 0`, leer `firstProductKeys` y `sampleSku`: eso revela el nombre real del identificador (`sku` vs `codigo_producto` vs `clave`) y un valor válido para usar en `mode=product`.
- Si `sample` devuelve fault o vacío, el problema **no es el formato del SKU**, es el **namespace SOAP** o el nombre del parámetro. Habría que:
  - Obtener el WSDL real (pedírselo a G4 o pegarlo manualmente para revisión).
  - O capturar el `responsePreview` del último intento para leer el `faultstring` (suele decir "parameter X expected").
- Solo después de confirmar el nombre del parámetro y un SKU real de muestra, tiene sentido planear un Build para:
  - Renombrar `<tns:sku>` al campo correcto (si no es `sku`).
  - Normalizar formato (mayúsculas / sin guiones) si el WSDL lo exige.
  - Agregar parámetro distinto para `getProductStock` si maneja variantes por color.

## 5. Próximo paso sugerido (sin Build)

1. Llamar `test-g4-connection?mode=sample&test_key=...` y compartir el JSON resultante (`productCountDetected`, `firstProductKeys`, `sampleSku`, `responsePreview` si falla).
2. Con eso confirmamos el identificador real y el formato esperado, y recién entonces decidimos si hace falta Build.  
  
BUILD MÍNIMO.
  Corrige únicamente:
  supabase/functions/test-g4-connection/index.ts
  No cambies nada que no se te pida explícitamente.
  No rediseñes.
  No refactorices.
  No toques frontend.
  No toques productos_b2b.
  No toques productos_publicos.
  No modifiques tablas.
  No modifiques RLS.
  No toques sync-forpromotional-products.
  No toques sync-cdo-products.
  No escribas en base de datos.
  No ejecutes sincronización.
  Problema:
  G4 conecta por SOAP, pero no estamos encontrando productos porque no sabemos el identificador exacto.
  mode=sample devuelve productCountDetected: 0.
  Los XML de G4 pueden usar campos como codigo_producto, codigo_color, nombre_producto, precio, existencias.
  Objetivo:
  Agregar mode=diagnose-g4-sku para probar un valor contra distintas variantes de parámetro y formato.
  Parámetros:
  - mode=diagnose-g4-sku
  - sku=valor
  Debe probar getProduct usando estos nombres de parámetro:
  1. sku
  2. codigo_producto
  3. codigo
  4. code
  5. clave
  Y con estas variantes del valor:
  1. original
  2. uppercase
  3. lowercase
  4. sin guiones
  5. uppercase sin guiones
  6. con guion bajo en lugar de guion medio
  También probar getProductStock con las mismas combinaciones si la función ya lo soporta.
  Respuesta segura:
  - ok
  - mode
  - sku_original
  - successful_attempts
  - attempts_summary
  - por cada intento:
    - method
    - parameter_name
    - value_variant
    - status
    - found_product boolean
    - message_code si existe
    - message_description si existe
    - decodedXmlPreview máximo 500 caracteres
  - no exponer G4_USER, G4_KEY ni ningún secret
  - no devolver XML completo
  - no guardar nada
  - no crear tablas
  Además:
  - actualizar parser seguro para detectar campos:
    - codigo_producto
    - codigo_color
    - nombre_producto
    - precio
    - existencias
    - sku
    - code
  Al terminar dime:
  - archivos tocados
  - si quedó desplegada
  - URL exacta para probar con sku=anf-sta