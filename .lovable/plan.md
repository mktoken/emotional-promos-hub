# Shape exacto de detected_elements — llamada B (01:27:33 UTC, solo lectura)

## A. Claves principales de la respuesta

`document_type`, `detected_elements`, `extracted_text`, `matched_line_ids`, `notes`

## B. Tipo de `detected_elements`

Arreglo con 1 objeto. Ese objeto contiene textos, un booleano y arreglos: `colors` es un arreglo de objetos; `materials` y `components` son arreglos de textos. No hay objetos anidados con `value` o `certainty`.

## C. `detected_elements`, JSON exacto sin transformar

```json
[
  {
    "element_type": "product",
    "description": "Taza de cerámica blanca con interior y asa de color rojo, incluye cuchara de cerámica roja insertada en el asa",
    "colors": [
      { "name": "blanco", "coverage": "exterior" },
      { "name": "rojo", "coverage": "interior, asa y cuchara" }
    ],
    "materials": ["cerámica"],
    "components": ["taza", "cuchara"],
    "text_present": false,
    "confidence": "high"
  }
]
```

Cómo viene cada dato:
- Categoría o tipo: `element_type` = "product" (texto genérico). No hay campo de categoría; "taza" solo aparece en `components` y en `description`.
- Descripción: `description`, texto simple.
- Colores: `colors`, arreglo de objetos `{name, coverage}`.
- Material: `materials`, arreglo de textos.
- Accesorios: no hay campo propio; "cuchara" aparece en `components`, arreglo de textos.
- Marca o impresión: `text_present`, booleano false.
- Confianza o certeza: `confidence` = "high" por elemento; no hay `certainty`.
- No hay otros atributos.

## D. Otros campos principales

- `document_type`: "product_photo" (presente)
- `extracted_data`: ausente
- `analysisStatus`: ausente
- `confidence` general: ausente
- `extracted_text`: [] (arreglo vacío)
- `matched_line_ids`: arreglo con 3 identificadores (los mismos del contexto enviado)
- `notes`: "Fotografía de producto en fondo blanco sin texto ni marca visible."

## E. Confirmación

- ARCHIVOS MODIFICADOS: NINGUNO (salvo este reporte)
- DEPLOY: NO
- NUEVA LLAMADA GEMINI: NO

DETECTED_ELEMENTS SHAPE CAPTURED — READY FOR FOCAL BUILD
