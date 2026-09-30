# CHK-AI-SALES-5-OPENAI-VISION-1 — Selección del motor OpenAI (solo inspección)

Fuentes: catálogo autenticado `GET /v1/models` (lectura, sin inferencia ni créditos) y documentación interna del gateway (structured-output, schemas de Responses, parámetros OpenAI).

1. Modelos OpenAI multimodales disponibles (entrada text+image, salida texto, retención `zero`): chat-latest, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5.2, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-5.4-pro (solo Responses), gpt-5.5, gpt-5.5-pro (solo Responses), gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-6-astra, gpt-6-luna, gpt-6-sol. Los gpt-image-* se excluyen (salida imagen).
2. ID exacto seleccionado: `openai/gpt-6-astra`. Es el modelo asignado por la política del workspace para toda llamada de chat/texto nueva o editada; no se permite sustituirlo por otro salvo que tú nombres explícitamente un ID distinto.
3. Structured Output: SÍ (todos los OpenAI de chat; el catálogo no expone flags por modelo).
4. json_schema: SÍ.
5. strict: SÍ. Con `strict: true` un schema no conforme se rechaza con 400 que nombra la violación.
6. Sintaxis Lovable: los modelos `openai/*` van por defecto a `/v1/responses`, no a `/v1/chat/completions`. En HTTP directo: `text: { format: { type: "json_schema", name: "commercial_vision_v1", strict: true, schema: {...} } }`, con `stream: true`, `store: false` y `reasoning: { effort: "low", summary: "auto" }`, más `include: ["reasoning.encrypted_content"]`. La forma `response_format.json_schema` es la de Chat Completions y solo aplica si se queda en ese endpoint.
7. `structuredOutputs: true`: es una opción del helper `createLovableAiGatewayProvider` (proveedor OpenAI-compatible del AI SDK, solo Chat Completions). Activa `supportsStructuredOutputs`, que hace que el SDK emita `response_format: json_schema` con strict. Sin esa opción se emite `json_object`. Aplica solo a OpenAI; con Gemini debe quedar apagada. No se usa con `/v1/responses`, donde el schema va en `text.format`.
8. image_url: SÍ. En Responses el bloque es `{ type: "input_image", image_url: "data:image/webp;base64,..." }` junto a `{ type: "input_text", text }`, en lugar del `image_url` anidado de Chat Completions.
9. WEBP: SÍ. El formato admite data URL de PNG, JPEG, WEBP y GIF no animado, así que no hace falta convertir. El PDF que hoy permite `allowedMime` NO entra como imagen: necesita un bloque `input_file`, o se excluye en esta fase.
10. Límites del JSON Schema: se permiten object, properties, required, string, boolean, null (`["string","null"]`), array/items, enum pequeño y `additionalProperties:false`. Hay que evitar: propiedades opcionales (todas deben ir en `required`, nullable si hace falta), raíz array, `const`, `default`, format/pattern, y los límites numéricos o de longitud (incluido `maxItems`). Los conteos se piden en el prompt y se recortan en código. El contrato propuesto es compatible tal cual; `schemaVersion` se expresa como enum `["1"]`.
11. Costo relativo (orientativo; el catálogo no publica precios): nano < mini < luna/terra < sol/astra < pro. El costo se controla con un prompt corto, esfuerzo de razonamiento `low`, schema pequeño y un límite de salida pedido en el prompt. Astra rechaza `max_tokens` y `temperature`.
12. Modelo recomendado: `openai/gpt-6-astra`.
13. Razón: es obligatorio por política del workspace. Además tiene visión, json_schema strict y retención cero, y se sirve por el endpoint documentado. Nota: el pedido de elegir "el más económico" no puede resolverse cambiando de modelo; solo con el diseño de la llamada.
14. Rollback: Gemini actual (`google/gemini-3.7-flash`, commit f3f3719), ya desplegado. No se agrega un segundo modelo OpenAI.
15. Cambios para migrar Gemini → OpenAI (solo en `analyze-commercial-image`):
    - endpoint `/v1/chat/completions` → `/v1/responses` (mismo host);
    - body: `input` con input_text/input_image, `text.format` json_schema strict, reasoning low, `store:false`, stream SSE, header `X-Lovable-AIG-SDK: fetch` y propagación del run-id;
    - parsing: consumir el SSE y hacer JSON.parse del texto final; mapear el contrato v1 al `CommercialVisualAnalysis` existente (un adaptador nuevo y pequeño en normalize-analysis.ts, sin quitar los adaptadores de Gemini);
    - manejo de errores según la semántica del gateway (402/403/429/5xx; refusal terminal);
    - PDF: excluirlo o enviarlo como `input_file`;
    - excepción: esto es más que "cambiar model + schema", porque el protocolo cambia a Responses con streaming.
16. Frontend cambia: NO (el contrato hacia el navegador se mantiene).
17. DB cambia: NO.
18. LOVABLE_API_KEY suficiente: SÍ.
19. Se ejecutó IA: NO (solo se leyó el catálogo de modelos).
20. Créditos consumidos: NO.
21. Próxima acción exacta, con tu autorización: implementar en una rama la variante OpenAI detrás de un selector de motor server-side (por defecto Gemini) y agregar tests unitarios del adaptador v1. Después, commit y redeploy de ese commit exacto, y una sola sonda controlada con el fixture neutral para verificar la request y el shape de respuesta en los logs del gateway.

OPENAI VISION STRUCTURED OUTPUT — READY FOR CONTROLLED PROBE
