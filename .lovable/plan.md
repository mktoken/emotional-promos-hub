# Inspección de la última llamada visual (solo lectura)

1. Llamada exacta identificada: SÍ (única llamada al gateway desde 01:40 UTC)
2. Timestamp UTC: 2026-09-29T02:38:22Z (log_id 01a0eb06-f946-7d14-9fa1-d020b1c58796)
3. Modelo: google/gemini-3.7-flash
4. Duración Gemini: 4,904 ms en el gateway (HTTP 200, upstream 200, finish_reason stop). Los ~7.1 s del navegador incluyen también la función y la red.
5. Costo/créditos: 0.010824 créditos (1,198 tokens de entrada / 482 de salida)
6. image_part_present: TRUE (mensaje user con parte text + parte image_url)
7. MIME: image/webp (data URL base64, no se muestra)
8. Gemini recibió imagen real: SÍ
9. Claves principales de la respuesta de Gemini: `media_type`, `product`, `text_detected`
10. Shape: OTRO (D). No trae `extracted_data`, `detected_elements`, `document_type`, `extracted_text`, `matched_line_ids`, `notes`, `analysisStatus` ni `confidence`.
11. JSON devuelto, exacto:

```json
{
  "media_type": "product_photo",
  "product": {
    "title": null,
    "description": "Taza de cerámica blanca con interior, asa y cuchara a juego en color rojo.",
    "category": { "value": "Tazas / Artículos para el hogar", "certainty": "high", "confidence": "high" },
    "colors": [
      { "name": "Blanco", "role": "exterior" },
      { "name": "Rojo", "role": "interior / asa / cuchara" }
    ],
    "materials": [
      { "value": "Cerámica", "certainty": "high", "confidence": "high" }
    ],
    "components": ["Taza con asa perforada para soporte", "Cuchara de cerámica"],
    "branding": { "has_logo": false, "text": null }
  },
  "text_detected": []
}
```

12. Versión efectiva de la función: NO COMPROBABLE. Lovable no muestra un identificador de despliegue por llamada. El código actual del proyecto está en aa8aea1 ("fix: normalize alternate vision response shape"), sin cambios pendientes.
13. aa8aea15 asociado a esta ejecución: NO COMPROBABLE (solo se sabe por el código actual y el redespliegue anterior)
14. normalize-analysis (copia actual) soporta extracted_data: SÍ
15. normalize-analysis (copia actual) soporta detected_elements: SÍ (description, colors[].name, materials, components, confidence). No soporta `product`, `media_type` ni `text_detected`.
16. Respuesta HTTP final de la función observable: NO (los registros solo muestran la llamada al modelo)
17. Respuesta final: NO COMPROBABLE. Observación, sin inferir: con este shape, el código actual no encuentra ninguna fuente reconocida, y sin `document_type` el tipo de archivo queda `unknown`. Eso coincide exactamente con lo que mostró el navegador.
18. Localización preliminar: CASO 3. Gemini sí devolvió datos útiles, pero con un tercer shape distinto; el formato de respuesta del proveedor sigue variando.
19. Archivos modificados: NINGUNO (salvo este reporte)
20. Redeploy: NO
21. Nueva llamada Gemini: NO
22. Publish: NO

VISION RUNTIME ROOT CAUSE ISOLATED — READY FOR FOCAL BUILD
