# Diagnóstico QA visual final CHK-AI-SALES-5 (solo lectura)

1. Timestamp: 2026-09-29T21:01:47Z
2. log_id: 01a0eef9-282d-7910-80ea-7f74fcc12c5c (run_id 01a0eef9-282d-7916-b618-7a800055da55)
3. Modelo: google/gemini-3.7-flash
4. Duración: 6,570 ms en el gateway (sin streaming)
5. HTTP/upstream: 200 / 200; finish_reason stop
6. Costo: 0.014529 créditos
7. Tokens: 1,198 de entrada / 729 de salida (294 de razonamiento)
8. Imagen presente: TRUE (mensaje user con parte text + parte image_url)
9. MIME: image/webp, data URL base64 real (no se muestra)
10. JSON exacto (contenido del mensaje; payload_state: redacted, pero el contenido llegó completo):

```json
{
  "document_type": "product_photo",
  "products": [
    {
      "name": { "value": "Taza con cuchara", "certainty": "medium", "confidence": 0.85 },
      "sku": { "value": null, "certainty": "unknown", "confidence": 0.0 },
      "description": { "value": "Taza de cerámica con exterior blanco, interior de color rojo, asa roja con orificio para sostener una cuchara y cuchara de cerámica roja incluida.", "certainty": "high", "confidence": 0.95 },
      "colors": [
        { "name": "Blanco", "certainty": "high", "confidence": 0.95 },
        { "name": "Rojo", "certainty": "high", "confidence": 0.95 }
      ],
      "materials": [
        { "value": "Cerámica", "certainty": "medium", "confidence": 0.8 }
      ],
      "components": [
        { "type": "Taza", "color": "Blanco / Interior Rojo" },
        { "type": "Cuchara", "color": "Rojo" }
      ]
    }
  ],
  "extracted_text": [],
  "pricing": { "value": null, "currency": null, "certainty": "unknown", "confidence": 0.0 },
  "stock_availability": { "value": null, "certainty": "unknown", "confidence": 0.0 }
}
```

11. Top-level keys: `document_type` (string), `products` (array de objetos), `extracted_text` (array vacío), `pricing` (objeto), `stock_availability` (objeto)
12. Shape: E — NUEVO SHAPE NO SOPORTADO. Usa `products` (plural, arreglo), no `product`, `extracted_data` ni `detected_elements`. Además, confidence es numérico (0.85, 0.95) en lugar de "high/medium/low", y components son objetos con `type`/`color`.
13. Producto: "Taza con cuchara" (certainty medium, confidence 0.85)
14. Descripción: la citada arriba (high, 0.95)
15. Categoría: no hay campo de categoría
16. Colores: Blanco, Rojo (high, 0.95)
17. Materiales: Cerámica (medium, 0.8)
18. Componentes: Taza (Blanco / Interior Rojo), Cuchara (Rojo)
19. Branding: no hay campo de branding
20. Texto visible: [] (vacío)
21. Confidence: solo por campo, numérica; sin confidence global ni analysisStatus
22. Respuesta normalizada Edge: NO COMPROBABLE (los registros de la función solo muestran arranques, sin salida). Observación sobre el código actual (f3f3719), sin inferir el runtime: ninguno de los tres adaptadores lee `products`; `document_type` sí se reconoce, así que attachmentType quedaría product_photo. Eso coincide con lo que mostró la pantalla (product_photo · partial · low).
23. queryReady: NO COMPROBABLE en los registros; con el código actual sería false (sin categoría y sin señales)
24. Query: NO COMPROBABLE
25. Catálogo consultado: NO COMPROBABLE (lo más probable es que no, por queryReady false)
26. Candidatos: 0 según la pantalla
27. Llamadas Gemini en la ventana 20:55–21:05 UTC: 1
28. Errores: ninguno (gateway 200, sin errores en los registros de la función)
29. Clasificación: CASO 2. Gemini devolvió señales útiles, pero en un shape nuevo que el código no soporta.
30. Próxima corrección mínima (NO se ejecuta): en normalize-analysis.ts, aceptar `products[]` cuando haya exactamente un producto, con el mismo trato que `product` (name.value → productName, description.value, colors[].name, materials[].value, components[].type). También convertir confidence numérica a high/medium/low e ignorar `pricing` y `stock_availability`. Como el formato ya cambió 4 veces, conviene fijar un JSON schema estricto en la llamada al modelo en vez de `json_object` libre. Requiere tu autorización, un commit y un redeploy.

Archivos modificados: NINGUNO (salvo este reporte). Redeploy: NO. Nueva llamada a Gemini: NO. Publish: NO.

VISION FINAL QA DIAGNOSED — CASO 2
