# CHK-AI-SALES-5-OPENAI-VISION-4 — Diagnóstico de la sonda OpenAI (solo inspección)

Fuentes: registro del gateway `01a0efd6…` (cuerpo `redacted`), código desplegado `7eb0d18` (`index.ts`, `vision-contract.ts`, `normalize-analysis.ts`), `agent-attachments.ts` y `agent-tools.ts`. No se ejecutó IA, SQL ni se tocaron archivos.

1. Timestamp: 2026-09-30T01:03:37Z (19:03:37 México).
2. log_id `01a0efd6-9b53-7a2f-b5b9-a62b02b12ad2`; run_id `01a0efd6-9b53-7a35-a11b-68e045e202eb`; response `resp_0c10db11…`.
3. Modelo: `openai/gpt-6-luna` (upstream `gpt-6-luna`).
4. Endpoint: `responses` (/v1/responses), streaming, sdk `fetch`.
5. HTTP: 200 (upstream 200).
6. Duración: 2,917 ms.
7. Costo: 0.0012996 créditos; 2,404 tokens entrada / 169 salida.
8. Imagen presente: SÍ (`input_image` con data URL real) + `input_text` presente.
9. MIME: `image/webp`.
10. json_schema: SÍ (`text.format.type = json_schema`, confirmado en el eco del proveedor).
11. commercial_vision_v1: SÍ.
12. strict=true: SÍ.
13. JSON final:
    `schemaVersion "1"`, `documentType "product_photo"`, 1 producto: `name "Taza"`, `description "Taza de cuerpo claro con asa y borde rojos; interior rojo visible."`, `category "Taza para beber"`, `colors ["blanco o gris claro","rojo"]`, `materials []`, `components ["cuerpo","asa"]`, `brandingPresent false`, `visibleText []`, `confidence "high"`.
14. Zod: PASS (inferido con certeza alta: el JSON cumple exactamente el schema estricto, y la UI mostró `completed · high`, que solo produce `normalizeVisionV1`; el fallback daría `failed`).
15. Normalización (derivada del código con ese JSON): attachmentType `product_photo`, productName "Taza", commercialCategory "taza", colors ["blanco o gris claro","rojo"], materials [], keyFeatures ["cuerpo","asa"], brandingDetected false, visibleText [], usableSignals 4.
16. commercialCategory: `taza`.
17. confidence: `high`.
18. queryReady: `true`.
19. searchTerms: `["taza", "taza con cuerpo asa", "taza blanco o gris claro rojo"]`.
20. Query: `buildSearchCriteriaFromVisualAnalysis` une los términos en una sola cadena: `"taza taza con cuerpo asa taza blanco o gris claro rojo"`.
21. Catálogo: `searchProducts` → `catalog_search_products_v2` con esa cadena completa como `p_query` único (no hay expansión para "taza", solo para libreta/termo/bolsa). `find_similar_products` es alias del mismo. Llamada: SÍ (la UI llegó a `no_results`).
22. Resultados brutos: NO COMPROBABLE sin SQL (prohibido); con esa cadena de 11 palabras (incluye "cuerpo", "asa", "o", "gris", "claro") es esperable 0.
23. Candidatos verificados: 0.
24. Motivo: la búsqueda recibe una frase larga que mezcla categoría, partes físicas y colores descriptivos; el término simple "taza" nunca se consulta solo. Los componentes "cuerpo/asa" se tratan como accesorios, lo que contamina la query.
25. Llamadas IA para este fixture: 1.
26. Errores: ninguno en gateway ni en contrato.
27. Clasificación: CASO C.
28. Próxima corrección mínima (sin ejecutarla):
    - En `agent-tools.ts`: consultar cada `searchTerm` por separado (empezando por la categoría sola) en lugar de unirlos en una frase, o agregar la expansión `taza|tazas|mug`.
    - En `normalize-analysis.ts`: no convertir partes estructurales genéricas (cuerpo, asa, tapa, borde) en términos de búsqueda.
    - Verificar con el fixture neutral solo tras autorización y redeploy/publicación explícitos.

OPENAI STRUCTURED VISION RUNTIME DIAGNOSED — CASO C
