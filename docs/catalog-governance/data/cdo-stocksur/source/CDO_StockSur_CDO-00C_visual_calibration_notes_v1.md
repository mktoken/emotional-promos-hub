# CDO/StockSur — CDO-00C Calibración visual preliminar v1

Read-only. Muestra de 10 SKUs, sin edición de imágenes, sin Governance, runtime, Supabase ni Lovable.

## Muestra

BP300, C485, EC742, EN19, G219, K103, R89, S03, T295, U314.

## Hallazgos visuales preliminares

- **BP300:** las tomas frontales aisladas son claramente superiores como candidatos de master; contexto debe permanecer como ALT.
- **C485:** existen frontales y perfiles comerciales limpios por color. La selección debe respetar variante/color; no usar una sola imagen para todas las variantes.
- **EC742:** las tomas cerradas/frontales son candidatas claras. La imagen de accesorios contiene texto/disclaimer y no es adecuada como master.
- **EN19:** hay vista frontal limpia, frontal con logo aplicado, perfil y vista superior. La versión con logo debe tratarse aparte; no asumir que sea master canónico.
- **G219:** frontales y perfil limpios; la imagen de gama de varios colores es útil como ALT/family evidence, no como master individual.
- **K103:** frontales y perfil aislados son candidatos; la composición con dos botellas + marca `nomawalk` es material de gama/marca y no master individual.
- **R89:** dos vistas limpias (frente/perfil); banco pequeño pero estructuralmente claro.
- **S03:** las imágenes muestran estados/composiciones muy diferentes del producto; requiere revisión de identidad/qué vista representa mejor el producto antes de seleccionar master.
- **T295:** el producto individual frontal es claramente mejor candidato que las composiciones de dos unidades o gama completa.
- **U314:** demuestra que `frente` en filename no equivale automáticamente a mejor master: las tomas cenitales del paraguas son técnicamente limpias, pero la vista abierta lateral puede comunicar mejor el producto comercialmente. Requiere criterio visual humano.

## Conclusión de calibración

La estructura/naming del banco es suficientemente buena para producir shortlists automáticos, pero **no para aprobar masters automáticamente**.

La regla se confirma:

`MASTER = TECHNICAL_PASS + IDENTITY_PASS + VISUAL_COMMERCIAL_PASS + acceptable provenance/rights`

El ranking por metadatos debe utilizarse únicamente para reducir el universo que revisará una persona.
