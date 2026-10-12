# CDO/StockSur — CDO-00B Normalización estructural v1

Análisis read-only del banco recibido. No se modificó ninguna imagen, no hubo extracción persistente masiva, no hubo Lovable, Supabase, Governance, Storage ni publicación.

## Canonicalización del lote

- ZIP recibidos: **27**
- ZIP byte-únicos: **26**
- ZIP excluido lógicamente por duplicidad exacta: `U-20261009T225750Z-1-001(2).zip`
- Instancias de imagen válidas en los 26 ZIP únicos: **16,266**
- Assets únicos por SHA-256: **15,577**
- Grupos de hash duplicado: **494**
- Instancias redundantes extra por hash: **689**

## Asignación estructural de SKU

Se corrigió el falso positivo de los nombres de lote/carpeta raíz (`T21`, `T24`, `EC1`, `C1`, etc.). El SKU se deriva únicamente de la ruta relativa interna / filename, no del nombre del lote raíz.

- SKUs/códigos base observados: **967**
- Imágenes con un solo SKU candidato: **14,870**
- Imágenes con varios SKUs candidatos (gamas/comparativas/compartidas): **1,356**
- Imágenes sin SKU recuperable por naming: **40**
- SKUs con al menos un candidato de master por metadatos/naming: **857**
- SKUs sin candidato de master detectable por naming (requieren inspección): **110**

### SKUs por familia/prefijo

- `BP`: **130**
- `C`: **103**
- `EC`: **104**
- `EN`: **13**
- `G`: **114**
- `K`: **39**
- `R`: **4**
- `S`: **3**
- `T`: **435**
- `U`: **22**

## Preclasificación de rol (NO es aprobación visual)

- `MASTER_CANDIDATE_METADATA`: **1,998**
- `MASTER_CANDIDATE_UNCLASSIFIED_VIEW`: **8,233**
- `ALT_OR_DETAIL_ROLE`: **4,376**
- `TECHNICAL_REVIEW`: **263**
- `REVIEW_ASSIGNMENT`: **1,396**

La etiqueta `MASTER_CANDIDATE_*` significa únicamente que el archivo no fue descartado por reglas de naming/rol y cumple tamaño mínimo observado. **No equivale a TECHNICAL_PASS, IDENTITY_PASS ni VISUAL_COMMERCIAL_PASS.**

## Duplicidad y riesgo de identidad

- Grupos de hash exacto usados por más de un SKU candidato: **1,333**
- Estos casos deben conservarse como assets compartidos/multi-SKU o revisarse; no deben asignarse automáticamente como master a un producto individual.

## Roles detectados por naming

- `logo`: **3,315**
- `gama`: **1,590**
- `frente`: **1,368**
- `contexto`: **1,247**
- `perfil`: **884**
- `mano_uso`: **713**
- `detalle`: **570**
- `abierto`: **454**
- `atras`: **154**

## Próximo control recomendado

1. Separar `SINGLE_SKU` de `MULTI_SKU_ASSET` y `UNASSIGNED`.
2. Construir shortlist por SKU de candidatos master; no seleccionar master automáticamente.
3. Generar contact sheets únicamente de una muestra/calibración y de casos ambiguos, sin extraer todo el banco.
4. Cruzar después contra el catálogo/runtime CDO/StockSur antes de Governance.
5. Aplicar la regla canónica: `MASTER = TECHNICAL_PASS + IDENTITY_PASS + VISUAL_COMMERCIAL_PASS`, además de provenance/rights aceptable.
