# PE ForPromotional Image Manifest V1

Estado: INVENTARIO TÉCNICO COMPLETO / MATCHING RUNTIME COMPLETADO / REVISIÓN VISUAL GLOBAL PENDIENTE
Fecha de inventario: 2026-10-08

## Alcance y fuentes

Banco autorizado local encontrado en:

- /Users/macbookpro/Downloads/4p-images-bi-20261002T022930.zip
- /Users/macbookpro/Downloads/4p-images-bi-20261002T035859.zip
- /Users/macbookpro/Downloads/4p-images-bi-20261002T043358.zip

Los ZIP se inspeccionaron sin mover ni modificar sus contenidos. Rights cleared no equivale a producto público listo: no se infieren SKU público, mapping, precio, stock, categoría, disponibilidad ni elegibilidad pública.

## Resumen técnico

| Métrica | Resultado |
|---|---:|
| Entradas totales | 14,328 |
| Imágenes raster | 14,229 |
| Videos MP4 | 99 |
| PNG | 1 |
| SKU estructurales representados | 1,522 |
| Imágenes con hash único | 13,545 |
| Grupos de duplicado exacto | 187 |
| Archivos dentro de grupos duplicados | 783 |
| SKU con una o más imágenes | 1,522 |
| SKU con múltiples imágenes | 1,522 |
| Candidatos preliminares de imagen principal | 1,521 |
| SKU sin candidato preliminar válido | 1 |

El tamaño comprimido combinado es 867,615,360 bytes; el tamaño sin comprimir reportado por los ZIP es 958,195,347 bytes.

## Estructura y matching

La estructura observada es 000X/CATEGORIA/SKU/archivo. El token de la carpeta SKU se registra como provider_sku y se clasifica como EXACT_SKU_MATCH únicamente en sentido estructural. El matching runtime de esta fase usa el proveedor único verificado `e6c2a7d2-2f83-4a28-aeb8-a7d7ee4b5be2` (ForPromotional / 4Promotional) y normalización alfanumérica en mayúsculas para comparar SKU.

Los campos raw_product_found, offer_found y b2b_product_id se actualizaron con la consulta read-only del runtime. `public_candidate` continúa siendo NO para todo el banco hasta completar la cadena y sus gates públicos:

image → provider SKU → provider_raw_products → producto_proveedor_ofertas → producto_b2b_oferta_map → producto_b2b

### Evidencia runtime read-only — Phase 1C

La consulta agregada devolvió 1,912 SKU runtime distintos para el proveedor exacto. Todas las 1,522 structural image SKUs tienen una coincidencia runtime normalizada; no hay SKU visual sin raw product en esta muestra.

| Clasificación runtime por SKU visual | SKU estructurales | Filas de imagen |
|---|---:|---:|
| MATCH_EXACT_ONE_PRODUCT | 669 | 6,796 |
| MATCH_MULTIPLE_PRODUCTS | 0 | 0 |
| RAW_ONLY | 0 | 0 |
| OFFER_WITHOUT_MAP | 853 | 7,532 |
| NO_MATCH | 0 | 0 |
| AMBIGUOUS | 0 | 0 |

El runtime completo contiene 865 raw SKU mapeados (1,984 ofertas) y 1,047 raw SKU con oferta sin mapping B2B (2,266 ofertas); 390 SKU runtime no están representados por una imagen estructural en este banco. La evidencia se incorporó al CSV por fila de imagen con `raw_product_count`, `offer_count`, `b2b_product_count`, `b2b_product_ids` y `mapping_classification`.

Este resultado prueba identidad y relaciones runtime de proveedor/oferta/mapping; no prueba stock, precio, vigencia, disponibilidad ni `PUBLIC READY`. `public_runtime_status` permanece `NOT_CERTIFIED`.

## Preclasificación visual automatizada

La clasificación usa dimensiones y decodificación técnica, no sustituye una revisión visual humana.

| Calidad preliminar | Cantidad |
|---|---:|
| EXCELLENT | 0 |
| GOOD | 6,778 |
| USABLE | 5,201 |
| WEAK | 2,250 |
| REJECT | 0 imágenes; 99 videos son NON_PRODUCT_ASSET para este inventario raster |

No se hizo OCR. Texto promocional, marcas de agua, exactitud del producto, color, crop y calidad percibida requieren revisión visual.

## Duplicados y roles

Se calcularon hashes SHA-256. Los grupos exactos están marcados en el CSV. La detección de near-duplicates no se considera certificada; requiere revisión perceptual/visual posterior.

MASTER_CANDIDATE y SECONDARY_CANDIDATE son roles preliminares derivados de nombre, ruta, dimensiones y variantes (esq, color, foto, etc.). No son selección MASTER aprobada.

## Categorías de origen

Conteo de SKU por carpeta de origen, no taxonomía pública PE:

- Bebidas/termos: 287
- Escritura: 158
- Libretas: 96
- Oficina: 105
- Bolsas/viaje: 264
- Tecnología: 122
- Hogar: 46
- Outdoor: 236
- Llaveros: 0
- Regalos ejecutivos: 20

Estos conteos son candidatos visuales por directorio y no autorizan categorías, slugs ni publicación.

## SKU prioritarios

Se localizaron rutas visuales para T150, O090, CH002, BL163, SO019, BL304 y O165. En todos los casos existe una imagen base de 1024×1024 identificable por SKU y variantes adicionales; el estado de mapping se lee ahora del CSV runtime reconciliado y `PUBLIC ELIGIBLE` permanece NO.

Rutas base observadas:

- 0007/TERMOS/T_150/22092026163406_T150.jpg
- 0004/LIBRETAS/O_090/04022022103231_O090.jpg
- 0008/CHAMARRAS_Y_CHALECOS/CH_002/04022025182157_CH002.jpg
- 0008/MOCHILAS/BL_163/15122025175108_BL163.jpg
- 0006/BOCINAS/SO_019/23092021120703_SO019.jpg
- 0008/PORTAFOLIOS/BL_304/19052025122832_BL304.jpg
- 0004/RECONOCIMIENTOS/O_165/15052026174755_O165.jpg

## Regalos Ejecutivos

Candidatos visuales, no públicos:

- BL304: portafolios; candidato ejecutivo condicionado a mapping/inventario.
- O165: reconocimiento; candidato visual condicionado a mapping/inventario.
- Carpeta PORTAFOLIOS: 13 SKU estructurales.
- Carpeta RECONOCIMIENTOS: 7 SKU estructurales.

No se declara categoría pública, disponibilidad, precio ni stock.

## Archivos generados

- docs/brand-web/PE_FORPROMOTIONAL_IMAGE_MANIFEST_V1.md
- docs/brand-web/data/forpromotional-image-manifest.csv

El CSV contiene los campos técnicos y de reconciliación solicitados, incluidos filename, ruta, extensión, bytes, dimensiones, ratio, hash, SKU estructural, calidad preliminar, duplicado, rol recomendado, conteos runtime, IDs B2B, clasificación de mapping, estado visual, brand fit, best use, estado de candidato ejecutivo, estado público y blocker.

## Límites y siguiente gate

- No se modificó runtime, DB, catálogo, mappings ni assets publicados.
- No se generaron, copiaron a public/, comprimieron ni transformaron imágenes.
- No se ejecutó CP-2 ni ningún proveedor.
- El matching runtime por SKU quedó completado para las 1,522 structural image SKUs. La distinción `MATCH_EXACT_ONE_PRODUCT` frente a `OFFER_WITHOUT_MAP` se conserva en el CSV; no se eleva ninguna fila a elegibilidad pública.
- La revisión visual Priority A de los 669 SKU quedó cerrada salvo una excepción objetiva documentada en Phase 1E. Los grupos near-duplicate siguen siendo candidatos de similitud, no duplicados certificados.

Resultado: inventario físico, matching runtime y curaduría Priority A PASS con una excepción visual objetiva abierta.

### Phase 1C — desbloqueo runtime y estado de revisión visual

El runtime matching fue ejecutado únicamente mediante lectura en el SQL Editor interno. Se verificó un único proveedor relevante: `ForPromotional / 4Promotional` (`code=forpromotional`). No se exportaron valores sensibles y no hubo writes, llamadas de proveedor, cambios de cron ni cambios de CP-2.

En ese checkpoint la revisión visual era `PARTIAL`: 7 SKU habían sido revisados manualmente. Phase 1D/1E amplió la curaduría únicamente a Priority A y dejó separados de cualquier estado público los candidatos BL304 y O165.

Estado de publicación: `NOT_CERTIFIED` para todo el banco. Rights cleared, match runtime, candidato visual, producto mapeado y producto público listo siguen siendo estados distintos.

## Phase 1D — curaduría visual de productos mapeados

Se construyó temporalmente el universo Priority A desde el manifest existente: 669 SKU con `MATCH_EXACT_ONE_PRODUCT`. La revisión se realizó mediante 14 contact sheets fuera del repositorio, con un candidato principal por SKU y etiquetas de SKU/archivo. Los contact sheets fueron temporales y no modificaron las imágenes fuente.

| Métrica Priority A | Resultado |
|---|---:|
| Total revisado | 669 / 669 |
| MASTER_APPROVED | 669 |
| MASTER_REVIEW_REQUIRED | 0 |
| NO_VALID_MASTER | 0 |
| EXCELLENT | 0 |
| GOOD | 667 |
| USABLE | 1 |
| WEAK | 1 |
| REJECT | 0 |
| PREMIUM brand fit | 169 |
| NEUTRAL brand fit | 426 |
| COMMODITY brand fit | 74 |
| OFF_BRAND | 0 |

`MASTER_APPROVED` es una decisión de curaduría visual para catálogo/PDP; no equivale a `PUBLIC READY`. La única excepción restante requiere decisión adicional por conflicto entre artefacto de marca, contraste y plano técnico.

### HOME_CATEGORY_VISUAL_SHORTLIST

Shortlist visual no publicada, limitada a 3 candidatos por categoría y siempre dentro de Priority A:

| Categoría visual | SKU |
|---|---|
| Bebidas / Termos | T_150, T_141, T_117 |
| Escritura | AL-21014, AL_18009, AL_5558R |
| Libretas | O_090, O_009, LE_041 |
| Oficina | O_107, O_133, O_116 |
| Bolsas / Viaje | BL_081, BL_152, BL_253 |
| Tecnología | SO_019, SO_056, SO_156 |
| Hogar | HO_106, HO_203, HO_204 |
| Outdoor | TL_064, TL_070, TL_055 |

Total shortlist: 24 SKU. Esta lista es visual y comercial; no declara stock, precio, disponibilidad, taxonomía pública ni elegibilidad de catálogo.

### Regalos Ejecutivos — Priority A

- `STRONG_EXECUTIVE_CANDIDATE`: O_190, O_193.
- `POSSIBLE`: BL_083, BL_152, BL_241, BL_365, BL_366, O_191, O_194.
- `WEAK`: 0.
- `REJECT`: 0.

BL304 y O165 siguen siendo candidatos visuales previos, pero permanecen en `OFFER_WITHOUT_MAP` y por tanto fuera de cualquier aprobación Priority A. Los 853 SKU `OFFER_WITHOUT_MAP` quedan como `VISUAL_BACKLOG_MAPPING_REQUIRED`, con `best_use=PENDING_MAPPING`.

Los 390 SKU runtime-only sin imagen del banco quedan como `RUNTIME_SKU_WITHOUT_BANK_IMAGE`; no se buscaron imágenes externas ni se descargaron assets.

## Phase 1E — finalización de excepciones visuales

Se revisaron las 22 excepciones de entrada comparando sus alternativas locales. Se resolvieron 21 seleccionando una imagen principal utilizable y roles secundarios (`SECONDARY_1`, `SECONDARY_2`, `SECONDARY_3`, `DETAIL`, `ALT_VIEW`, `COLOR_VARIANT` o `DO_NOT_USE`) cuando aportaban información adicional.

La única excepción objetiva restante es:

| SKU | Estado | Causa | Acción |
|---|---|---|---|
| WIDE_BODY | MASTER_APPROVED | La variante sobre fondo claro conserva la identidad y silueta completas del producto y no incorpora arte de marca visible; se mantiene como calidad `USABLE`, no como imagen de Home. | Usar como master de catálogo/PDP; dejar la variante con arte de marca en `DO_NOT_USE` y el plano técnico como `DETAIL`. |

Resultado final Priority A: 669 `MASTER_APPROVED`, 0 `MASTER_REVIEW_REQUIRED`, 0 `NO_VALID_MASTER`. La shortlist Home de 24 SKU no cambió. La shortlist ejecutiva final queda en 2 candidatos `STRONG` (O_190, O_193) y 7 `POSSIBLE` (BL_083, BL_152, BL_241, BL_365, BL_366, O_191, O_194).

Las imágenes resueltas siguen siendo únicamente candidatos visuales de productos con mapping exacto. El CSV conserva `public_runtime_status=NOT_CERTIFIED` en las 14,328 filas y mantiene los 853 SKU `OFFER_WITHOUT_MAP` sin revisión Priority A.

## Phase 1F — decisión final de WIDE_BODY

Se revisaron las tres imágenes disponibles de `WIDE_BODY`:

- `28082024102411_9127_WIDEBODYcolor.jpg.jpg`: producto completo sobre fondo claro, identidad legible y sin arte de marca visible. Se aprueba como `MASTER`, con calidad `USABLE`, para catálogo/PDP.
- `29062026093020_WIDEBODY.jpg`: variante con arte visible de BIC sobre fondo negro. Se conserva como evidencia del banco, pero queda `DO_NOT_USE` para presentación pública.
- `02102024130842_WIDEBODYesq.jpg.jpg`: plano técnico. Se conserva como `DETAIL`; no sustituye la imagen principal.

La decisión final es `WIDE_BODY = MASTER_APPROVED`. La excepción queda cerrada sin afirmar stock, precio, disponibilidad ni elegibilidad pública. `public_runtime_status` permanece `NOT_CERTIFIED`.

## Phase 1B — recuperación Git y revisión ampliada

### Git

El diagnóstico de .git/FETCH_HEAD mostró:

- propietario: macbookpro;
- permisos del archivo: 0644, con escritura para el propietario;
- ACL adicional: no observada;
- flags de archivo: normales, sin immutable flag;
- extended attribute: com.apple.provenance;
- fetch: bloqueado por EPERM al escribir .git/FETCH_HEAD.

La causa operativa es una restricción del entorno/sandbox sobre la escritura de la metadata Git. No se hizo chmod, chown, sudo, borrado de FETCH_HEAD, reset, merge, rebase ni reparación privilegiada.

Estado visible antes de la revisión:

- branch: main;
- HEAD: a7460daf4ccd63841777a52de4800ce0948dad1f;
- origin/main local: a7460daf4ccd63841777a52de4800ce0948dad1f;
- divergencia visible: 0 / 0;
- working tree previo: limpio.

Los dos manifests de esta fase quedan como archivos no commiteados porque el fetch no pudo verificarse de nuevo.

### Matching runtime — estado anterior superseded by Phase 1C

La primera consulta de Phase 1B fue parcial por la pérdida de conexión de la automatización del navegador. Phase 1C completó la exportación read-only y reconcilió por SKU las 1,522 referencias estructurales. El estado vigente y los conteos finales están documentados en la sección `Evidencia runtime read-only — Phase 1C`.

No se utilizó stock, precio, disponibilidad ni current catalog truth para clasificar identidad. No hubo writes, invocación de proveedores ni cambios de runtime.

### Revisión perceptual

Se calculó una firma dHash local para las 14,229 imágenes raster. Se identificaron 619 grupos candidatos de near-duplicate con 2,469 miembros. Son candidatos de similitud, no duplicados certificados: pueden ser vistas alternativas, variantes de color o imágenes con fondos similares y requieren confirmación visual.

Los duplicados exactos permanecen separados mediante SHA-256: 187 grupos y 783 archivos.

### Revisión visual escalonada

Se revisaron manualmente los candidatos base de T150, O090, CH002, BL163, SO019, BL304 y O165:

| SKU | Calidad | Brand fit | Uso recomendado | Rol |
|---|---|---|---|---|
| T150 | GOOD | PREMIUM | HOME_CATEGORY / CATALOG / PDP | MASTER |
| O090 | GOOD | NEUTRAL | CATALOG / PDP / KIT | MASTER |
| CH002 | GOOD | NEUTRAL | CATALOG / PDP | MASTER |
| BL163 | GOOD | NEUTRAL | CATALOG / PDP | MASTER_REVIEW_REQUIRED; mezcla de variantes |
| SO019 | GOOD | PREMIUM | CATALOG / PDP / HOME_CATEGORY | MASTER |
| BL304 | GOOD | PREMIUM | CATALOG / PDP / EXECUTIVE_GIFT | MASTER |
| O165 | USABLE | NEUTRAL | CATALOG / PDP / EXECUTIVE_GIFT | MASTER_REVIEW_REQUIRED; contraste bajo |

Esta revisión no certifica mapping ni publicación.

### Regalos Ejecutivos

Los 20 candidatos estructurales son:

BL_053, BL_083, BL_152, BL_226, BL_241, BL_268, BL_304, BL_305, BL_306, BL_307, BL_329, BL_365, BL_366, O_164, O_165, O_166, O_190, O_191, O_193 y O_194.

BL304 queda como STRONG_EXECUTIVE_CANDIDATE en sentido visual/comercial. O165 queda como POSSIBLE por contraste y necesidad de revisión. Los otros 18 permanecen PENDING_VISUAL_REVIEW. Ninguno es PUBLIC READY.

### Campos añadidos al CSV

El CSV incorpora:

- raw_product_match;
- offer_match;
- b2b_map_match;
- b2b_product_id;
- raw_product_count;
- offer_count;
- b2b_product_count;
- b2b_product_ids;
- mapping_classification;
- perceptual_group;
- perceptual_signature;
- visual_review_status;
- brand_fit;
- best_use;
- secondary_role;
- home_category_candidate;
- executive_candidate_status;
- public_runtime_status.

Resultado histórico Phase 1B: fuente runtime read-only accesible y esquema verificado, pero matching completo por SKU BLOCKED por la exportación/paginación interrumpida; revisión perceptual PARTIAL; revisión visual focal PASS para siete SKU prioritarios. Este estado fue superseded por el matching completo de Phase 1C; la revisión visual global continúa PARTIAL.
