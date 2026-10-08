# PE HOME IMAGE SKU / TAXONOMY MAP V1

**Proyecto:** Promocionales Emocionales  
**Fase:** PE Strategy OS — Phase 7E  
**Modo:** auditoría / solo lectura  
**Fecha:** 2026-10-02  
**Estado:** `OWNER DIRECTION APPROVED FOR INTERNAL BUILD — PUBLICATION RIGHTS CLOSED / PASS — HERO T150 CLOSED / PASS — PUBLIC CATALOG MAPPING PENDING`

## 1. Alcance y evidencia

Este mapa reconcilia exclusivamente los SKU visuales seleccionados por el
propietario y las dos referencias históricas autorizadas. No modifica catálogo,
slugs, productos, stock, imágenes, base de datos ni publicación.

Fuentes consultadas:

- `PE_INTEGRATED_HOME_IMAGE_SHORTLIST_V1.md`.
- `PE_OWNER_IMAGE_REVIEW_PACK_V1.md`.
- `PE_HOME_IMAGE_LOCK_V1.md`.
- `PE_VISUAL_DIRECTION_LOCK_V1.md`, `DESIGN.md`, `HOME_COPY_LOCK_V1.md` y
  `CLAIMS_GATE_V1.md`.
- Fuentes locales del proyecto disponibles al 2026-10-02.

La evidencia entregada no incluye una exportación vigente del catálogo público
PE ni rutas públicas verificables para estos SKU. El XLSX local disponible es
material de prompts/marketing y no funciona como catálogo de productos.

Por eso:

- `NOT FOUND` significa “no encontrado en la evidencia pública/local
  suministrada”, no “producto inexistente”.
- `MAPPING REQUIRED` significa que el SKU/familia del proveedor necesita
  conciliación contra el catálogo PE actual antes de enlazar o publicar.
- No se marca `MATCH`, `NOT PUBLIC` o `CONFLICT` sin evidencia operativa
  directa.
- En todos los casos: `active = NO COMPROBADO`, `public_visible = NO
  COMPROBADO`, `stock/status = NO OBSERVABLE`, `slug/ruta = NO COMPROBADO`,
  `imagen vinculada actual = NO COMPROBADA`.

## 2. Mapa de SKU para internal build

| HOME USE | IMAGE SKU | PRODUCT NAME | PROVIDER | PE CATEGORY | PE SUBCATEGORY | PUBLIC STATUS | PUBLIC ROUTE | MATCH STATUS | ACTION NEEDED |
|---|---|---|---|---|---|---|---|---|---|
| Hero final; Termos y vasos primary | `T_150` | No comprobado; etiqueta visual “T150” | ForPromotional / 4Promotional | Termos y vasos | No comprobada; conceptual `Termos` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Hero final implementado; mapear nombre, slug, activo y disponibilidad antes de enlazar el producto públicamente. |
| Termos y vasos alternative | `T_327` | No comprobado; etiqueta visual “T327” | ForPromotional / 4Promotional | Termos y vasos | No comprobada; conceptual `Vasos y tarros` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Conciliar contra categoría pública real; no usar la matriz como prueba de disponibilidad. |
| Libretas primary | `O_090` | No comprobado; etiqueta visual “O090” | ForPromotional / 4Promotional | Libretas | No comprobada | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar ficha PE y ruta de categoría; internal preview only. |
| Libretas alternative | `LE_OO1` | No comprobado; etiqueta visual “LEOO1” | ForPromotional / 4Promotional | Libretas | No comprobada; proveedor `LIBRETAS_ECOL_GICAS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar mapeo y evitar claim “ecológica” sin evidencia de producto. |
| Ropa promocional primary | `CH_002` | No comprobado; etiqueta visual “CH002” | ForPromotional / 4Promotional | Ropa promocional | No comprobada; proveedor `CHAMARRAS_Y_CHALECOS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar ficha PE; no afirmar personalización, tallas o disponibilidad. |
| Ropa promocional alternative; solo cangurera | `BL_011` | No comprobado; etiqueta visual “BL011” | ForPromotional / 4Promotional | Ropa promocional | No comprobada; proveedor `GORRAS_Y_CANGURERAS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Describir únicamente como cangurera; no mapearla como chamarra. |
| Bolsas y mochilas primary | `BL_163` | No comprobado; etiqueta visual “BL163” | ForPromotional / 4Promotional | Bolsas y mochilas | No comprobada; conceptual `Mochilas` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar ficha y categoría pública; no usar imagen para claims de stock. |
| Bolsas y mochilas alternative | `BL_064` | No comprobado; etiqueta visual “BL064” | ForPromotional / 4Promotional | Bolsas y mochilas | No comprobada; proveedor `BOLSAS_ECOL_GICAS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Conciliar categoría; no afirmar sostenibilidad por el nombre de carpeta. |
| Tecnología primary | `SO_019` | No comprobado; etiqueta visual “SO019” | ForPromotional / 4Promotional | Tecnología | No comprobada; proveedor `BOCINAS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar nombre, ficha y ruta; no inferir especificaciones de la imagen. |
| Tecnología alternative | `SO_155` | No comprobado; etiqueta visual “SO155” | ForPromotional / 4Promotional | Tecnología | No comprobada; proveedor `AUD_FONOS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar ficha PE y atributos técnicos antes de cualquier copy. |
| Regalos ejecutivos primary | `BL_304` | No comprobado; etiqueta visual “BL304” | ForPromotional / 4Promotional | Regalos ejecutivos | No comprobada; proveedor `PORTAFOLIOS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar que PE lo mapea a Regalos ejecutivos; no afirmar “ejecutivo” automáticamente. |
| Regalos ejecutivos alternative | `O_165` | No comprobado; etiqueta visual “O165” | ForPromotional / 4Promotional | Regalos ejecutivos | No comprobada; proveedor `RECONOCIMIENTOS` | `NOT FOUND` en evidencia suministrada | No comprobada | `MAPPING REQUIRED` | Confirmar equivalencia de categoría; no presentarlo como set o regalo entregado. |

## 3. Referencias históricas no seleccionadas

| HOME USE | IMAGE SKU | PROVIDER CATEGORY | STATUS | ACTION |
|---|---|---|---|---|
| Eventos/campañas — referencia histórica | `BL_002` | `BOLSAS_ECOL_GICAS` | `NOT FOUND` en evidencia suministrada; `MAPPING REQUIRED` | No usar en V1 como imagen de solución; conservar solo como referencia visual. |
| Regalos corporativos — referencia histórica | `O_190` | `RECONOCIMIENTOS` | `NOT FOUND` en evidencia suministrada; `MAPPING REQUIRED` | No usar en V1 como imagen de solución; no llamarlo set de regalo sin ficha. |

## 4. Rutas públicas de categorías Home

| Categoría Home | Ruta/slug real comprobado | Estado | Mapeo conceptual permitido |
|---|---|---|---|
| Termos y vasos | No comprobado en evidencia suministrada | `NOT FOUND` | Agrupar familias `TERMOS`, `VASOS_Y_TARROS` cuando la taxonomía PE lo confirme. |
| Libretas | No comprobado en evidencia suministrada | `NOT FOUND` | Agrupar `LIBRETAS` y `LIBRETAS_ECOL_GICAS` si existe esa relación pública. |
| Ropa promocional | No comprobado en evidencia suministrada | `NOT FOUND` | Mapear `CHAMARRAS_Y_CHALECOS` y `GORRAS_Y_CANGURERAS` solo tras confirmar taxonomía. |
| Bolsas y mochilas | No comprobado en evidencia suministrada | `NOT FOUND` | Agrupar `MOCHILAS` y `BOLSAS_*` solo tras confirmar ruta real. |
| Tecnología | No comprobado en evidencia suministrada | `NOT FOUND` | Agrupar `BOCINAS` y `AUD_FONOS` solo tras confirmar ruta real. |
| Regalos ejecutivos | No comprobado en evidencia suministrada | `NOT FOUND` | Mapeo conceptual a `PORTAFOLIOS`/`RECONOCIMIENTOS`; **no se confirma que exista como taxonomía pública real**. |

No se crean slugs ni se recomienda enlazar las cards a un SKU. La imagen es
representativa; la card debe enlazar a la categoría pública confirmada cuando
exista.

## 5. Estado de stock y vínculo de imagen

Para los 14 SKU revisados —12 seleccionados y 2 históricos— no se observó
stock, disponibilidad, `active`, `public_visible`, slug ni vínculo actual de
imagen en la evidencia visual/documental disponible. Ningún estado se infiere
desde la existencia del archivo ZIP.

## 6. Gates de uso

- **Internal design / Preview:** `OK`, conforme a la decisión del propietario.
- **Publicación de assets del banco autorizado:** `CLEARED / PASS` por
  confirmación amplia del propietario.
- **Rights:** `CLEARED / PASS` para ForPromotional / 4Promotional; esto no
  valida SKU, taxonomía, disponibilidad ni stock.
- **Hero final:** `CLOSED / PASS — T150`.
- **Solutions V1:** sin imagen final.
- **Catalog mapping:** `MAPPING REQUIRED` antes de cualquier enlace público.

## 7. Decisiones pendientes del owner / Work

1. Confirmar o proporcionar una fuente operativa actual para completar nombre,
   categoría pública, slug, activo, visibilidad y vínculo de imagen.
2. Resolver si `Regalos ejecutivos` existe como categoría pública real o si
   debe ser solo una agrupación conceptual de Home.
3. Mantener T150 como Hero temporal interno o dejar el Hero sin imagen hasta
   resolver el asset final.
4. Mantener soluciones sin fotografía en V1.

**PHASE 7E — READY FOR BRAND-WEB DOC CHECKPOINT**

## 8. Canonical reconciliation — 2026-10-08

El clearance de derechos del propietario aplica a los assets que pertenecen
efectivamente al banco autorizado de ForPromotional / 4Promotional, incluidos
web, catálogo, PDP, redes sociales, Ads, email, propuestas, rehosting, crop,
redimensionado y adaptación gráfica PE. No modifica la validación de producto,
taxonomía, stock, disponibilidad o ruta pública.

`T150` es el Hero final canónico. La tabla continúa marcando el producto como
`MAPPING REQUIRED` cuando no existe evidencia operativa del SKU, porque una
imagen representativa no convierte automáticamente la card en un enlace al
producto ni prueba su disponibilidad pública.
