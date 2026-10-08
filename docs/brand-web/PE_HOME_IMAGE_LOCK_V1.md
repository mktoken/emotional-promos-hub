# PE HOME IMAGE LOCK V1

**Proyecto:** Promocionales Emocionales  
**Fase:** PE Strategy OS — Phase 7A  
**Modo:** Auditoría / plan only  
**Estado:** PHASE 7C.2 PARTIAL — BANK SHORTLIST READY FOR OWNER REVIEW — RIGHTS / FINAL ASSETS BLOCKED — NO BUILD  
**Fecha de auditoría:** 2026-10-01  

## 1. Propósito

Resolver el sistema de imágenes de Home V1 usando únicamente activos ya observados en el catálogo público, el repositorio y la implementación pública. Este documento no autoriza Build, cambios en producción, rediseño del logo, generación de imágenes ni publicación de claims.

La auditoría se hizo contra:

- `PE_VISUAL_DIRECTION_LOCK_V1.md`.
- `DESIGN.md`.
- `HOME_COPY_LOCK_V1.md`.
- `CLAIMS_GATE_V1.md`.
- `PE_HOME_BUILD_PLAN_V1.md`.
- Repositorio local `emotional-promos-hub`, en estado limpio `main`, `HEAD = origin/main = 57a7cf64fd5744d4787df275b9a7ceb430a09892`.
- Producción pública `https://articulospromocionales.vip/` y catálogo público observado el 2026-10-01.

### Verificación fresca de esta auditoría

- Git continúa limpio en `main`, con `HEAD = origin/main = 57a7cf64fd5744d4787df275b9a7ceb430a09892` y divergencia `0/0`.
- La Home pública sigue mostrando el Hero legado: “Plataforma B2B para Compradores Corporativos”, “Eleva la presencia de tu marca…” y referencias a `+10,000`, inventario en tiempo real, renders y solicitud por WhatsApp. No se reutiliza como dirección ni como fuente de claims.
- El catálogo público cargó `992` productos en `42` páginas. La navegación expone, entre otras, `Bebidas, termos y vasos`, `Libretas y cuadernos`, `Ropa promocional`, `Bolsas, mochilas y viaje`, `Tecnología` y `Premios y regalos ejecutivos`.
- La carpeta `public/` local no contiene un inventario editorial de Home: solo se localizaron el logo actual, el favicon y un placeholder técnico. Los candidatos de producto siguen siendo remotos y con derechos `TO VERIFY`.

## 2. Decisión ejecutiva propuesta

### Actualización Phase 7C — 2026-10-01

- ForPromotional queda en `MEDIA BANK DELIVERED — VISUAL REVIEW COMPLETED`. Sus imágenes API siguen disponibles y previamente verificadas; la auditoría del portal continúa diferida por decisión del propietario y no constituye un bloqueo general de Phase 7C.
- Los portales restantes no tenían sesión autenticada activa en el navegador auditado. Se completó un inventario público dirigido, sin login, descargas, formularios ni contacto con proveedores.
- Innovation aporta candidatos visuales públicos de categoría para Bebidas, Libretas, Mochilas y Maletas, Tecnología y Sets; su reutilización externa sigue `UNCLEAR`.
- Impressline ofrece públicamente “Herramientas de Venta” en PDF/JPG para Regalos Empresariales, Kit de Bienvenida y Eventos Deportivos. Son referencias comerciales útiles, pero no masters fotográficos limpios; el permiso para recorte, edición y uso en la Home sigue `UNCLEAR`.
- Doble Vela muestra una prohibición expresa de reproducción total o parcial. Sus activos se clasifican `RESTRICTED` y quedan fuera de la Home salvo autorización específica posterior.
- No se encontró un Hero limpio, contextual, sin copy de proveedor y con derechos verificables. H2 sigue sin activo final.
- No se descargó ningún archivo: ningún recurso observado cumplió simultáneamente utilidad editorial, procedencia y derechos suficientes.

### Hero

**Resultado de Phase 7B: H2 — NOT VIABLE CON LOS ACTIVOS OBSERVADOS.**

La dirección conceptual sigue siendo correcta, pero no apareció una escena propia, estable y con derechos comprobados que muestre producto físico en contexto humano/empresarial. No se puede tratar como activo disponible para Build.

**H1 — fallback definitivo de dirección visual:** producto real en composición contenida, sin presentarlo como fotografía editorial. Sigue bloqueado para implementación hasta resolver derechos, master estable y recortes responsive.

### Categorías

Usar una sola imagen primaria por tarjeta, tomada de un producto real del catálogo, sobre un contenedor claro y estable. No crear collages nuevos ni mezclar imágenes de proveedores en una misma tarjeta.

Cinco categorías tienen candidatos observables. `Regalos ejecutivos` queda **MISSING**: la categoría visible del catálogo devolvió “No encontramos productos con esos filtros” y no se seleccionará un sustituto de otra categoría.

### Soluciones

No hay imágenes existentes que comuniquen de forma suficiente las tres ocasiones aprobadas sin introducir una promesa o un contexto no demostrado. Las tres soluciones quedan **MISSING — material dedicado requerido**. Los productos del inventario pueden servir como fallback visual temporal únicamente después de aprobación del propietario y sin afirmar que representan un caso real.

## 3. Evaluación de opciones de Hero

| Opción | Disponibilidad actual | Ajuste de marca | Desktop / mobile | Dificultad | Autenticidad | Material externo | Juicio |
|---|---|---|---|---|---|---|---|
| **H1 — composición de productos reales** | Parcial. Hay productos reales y URLs públicas; no hay composición hero curada ni rights clearance. Las imágenes del Hero actual se observaron rotas en producción. | Media: producto claro, pero puede parecer catálogo mayorista si se acumulan objetos. | Buena si se diseña una sola composición; requiere recorte dedicado mobile. | Media-alta. | Media: productos reales, procedencia contractual no comprobada. | No necesariamente, pero sí master estable y autorización de uso. | **Dirección fallback definitiva; bloqueada hasta clearance.** |
| **H2 — producto real + contexto humano/empresarial** | **NOT VIABLE CON ACTIVOS OBSERVADOS.** No se localizó una escena propia o rights-cleared que muestre uso empresarial real. | **Alta conceptualmente.** | Muy buena si se produce en dos recortes controlados. | Media-alta. | Alta solo con material propio/licenciado. | **Sí, requerido.** | **No disponible para Build en Phase 7B.** |
| **H3 — una fotografía real única** | Parcial. `TUUM` y `TRICOLOR` incluyen modelos en imágenes de proveedor, pero no son una escena PE propia ni prueban derechos. | Media-alta como producto físico; baja como representación de toda la propuesta. | Simple, pero puede quedar estrecha para las dos rutas A/B. | Media. | Media mientras no se compren/verifiquen derechos. | Preferible sí; una foto propia resolvería la ambigüedad. | Alternativa de menor densidad, no primera opción. |

### Regla de selección

No usar una imagen de proveedor como Hero final solo porque se ve pública en el catálogo. La selección final requiere:

1. URL o archivo estable y no dependiente de una ruta efímera.
2. Autorización de uso web y de recortes responsive.
3. Master de resolución suficiente.
4. Prueba visual desktop/mobile.
5. Ausencia de logos de terceros no autorizados.

## 4. Lock de categorías Home

| Etiqueta aprobada | Slug real | Primaria propuesta | Alternativa | Estado |
|---|---|---|---|---|
| Termos y vasos | `bebidas-termos-vasos` | `BALI PASTEL` — serie de vasos en colores pastel; visual más expresivo. | `FRESCA` — vaso tipo lata y variantes de color. | CANDIDATES FOUND — rights TO VERIFY |
| Libretas | `libretas-cuadernos` | `BUK` — libreta/organizador abierto con notas y regla; comunica uso. | `KATÚN` — set de notas y banderas, menos representativo de “libreta”. | CANDIDATES FOUND — rights TO VERIFY |
| Ropa promocional | `textiles-ropa` | `TUUM` — modelo con chamarra y variantes; mejor presencia de uso. | `TRICOLOR` — playera con modelo; revisar asociación visual de terceros. | CANDIDATES FOUND — rights TO VERIFY |
| Bolsas y mochilas | `bolsas-mochilas-viaje` | `KICKO` — bolsa reusable con escena de carga; útil para ocasión. | `ECOX` — familia de bolsas en varios colores, más neutra. | CANDIDATES FOUND — rights TO VERIFY |
| Tecnología | `tecnologia` | `VENTO` — soporte/tarjetero en uso con celular; lectura inmediata. | `Audífono in box` — producto tecnológico simple y reconocible. | CANDIDATES FOUND — rights TO VERIFY |
| Regalos ejecutivos | `premios-regalos-ejecutivos` | `Sets` de Innovation — imagen pública de categoría, 768×512, como candidato externo. | Flyer “Regalos Empresariales” de Impressline solo como referencia, no como master. | CANDIDATE FOUND — RIGHTS / TAXONOMY FIT UNCLEAR |

Las imágenes candidatas, identificadores y URLs completas están en `PE_IMAGE_ASSET_INVENTORY_V1.md`.

## 5. Soluciones por ocasión

| Solución aprobada | Material existente | Candidato posible | Riesgo de usarlo como solución | Recomendación |
|---|---|---|---|---|
| Eventos y campañas | Productos de color y variantes; `BALI PASTEL`, `KICKO`, `TRICOLOR`; flyer público “Eventos Deportivos” de Impressline. | Producto + composición editorial futura. | El flyer incluye diseño/copy de proveedor y no demuestra permiso de adaptación. | **MISSING COMO ACTIVO FINAL.** Referencia comercial localizada, rights/crop `UNCLEAR`. |
| Colaboradores y reconocimiento | `BUK`, `VENTO`, `TUUM`; flyer público “Kit de Bienvenida” de Impressline. | Kit físico fotografiado en contexto empresarial. | El flyer no autoriza afirmar onboarding ni separar su fotografía del diseño. | **MISSING COMO ACTIVO FINAL.** Referencia comercial localizada, rights/crop `UNCLEAR`. |
| Regalos corporativos | `BALI PASTEL`, `TUUM`, `Audífono in box`; flyer público “Regalos Empresariales” de Impressline. | Objeto real en contexto de entrega corporativa. | Es material terminado con copy, no un master limpio; permiso de reutilización no comprobado. | **MISSING COMO ACTIVO FINAL.** Referencia comercial localizada, rights/crop `UNCLEAR`. |

## 6. Sistema fotográfico de producto

La muestra auditada del catálogo presenta principalmente:

- **Fondo:** blanco o casi blanco.
- **Tratamiento:** producto recortado, familias de color o composición de producto; no es un sistema editorial PE.
- **Formato observado:** JPG en URLs de proveedor; algunos registros tienen PNG adicional en `material_venta`.
- **Variantes disponibles:** en muchos registros hay imagen base, imagen de color y esquema; algunos registros CloudFront solo exponen una imagen.
- **Calidad visual:** media para tarjeta de catálogo; no se certifica resolución master para Hero.
- **Orientación:** predominantemente horizontal/cuadrada dentro de la tarjeta; el objeto puede ocupar la mayor parte del cuadro. Debe evitarse recortar la imagen de proveedor de forma agresiva.
- **Foto de proveedor:** sí, por host y nomenclatura de los activos; no se conoce el contrato de uso.
- **Múltiples ángulos:** no comprobados como ángulos fotográficos; las imágenes adicionales son principalmente color, esquema o material de venta.

### Sistema recomendado

**Sistema B controlado:** imagen original del producto dentro de un contenedor uniforme blanco/marfil, sin recortar el archivo fuente y con `object-fit: contain`. Mantener la composición del proveedor dentro de un área segura. Usar C — fondo editorial — solo para activos propios o licenciados y no para “maquillar” una imagen cuya resolución sea insuficiente.

No recomendar un sistema D nuevo: ampliaría el alcance antes de resolver derechos y disponibilidad.

## 7. Reglas de consistencia

### Hero

- Ratio de trabajo recomendado: 4:3 desktop; 4:5 o 1:1 mobile según el master final.
- `object-fit: cover` solo en fotografía editorial rights-cleared; `contain` para composición de producto.
- Preservar la silueta completa del producto y dejar safe area para copy/CTA.
- No superponer texto sobre zonas de alto detalle.

### Categorías

- Ratio base 4:3, un producto o una familia coherente.
- `object-fit: contain`, fondo blanco/marfil uniforme.
- Sin zoom de hover que corte el producto.
- Bordes discretos, radio moderado y sombra mínima; la tarjeta no debe parecer marketplace.

### Soluciones

- Ratio base 3:2 si se consigue foto contextual; 4:3 como fallback.
- `object-fit: cover` para escena real, con punto focal definido por activo.
- No usar tarjeta vacía, placeholder o collage genérico como si fuera solución aprobada.

### Desktop y mobile

- Desktop: imagen dominante, copy separado, dos rutas A/B visibles en el primer viewport.
- Mobile: no reducir simplemente Desktop; usar el mismo master con posición focal distinta solo si conserva producto y contexto.
- Si el master no permite ambos recortes, usar una alternativa aprobada o **hide image** antes que un recorte engañoso.
- No usar carrusel obligatorio ni bottom navigation.

## 8. Performance visual

| Zona | Formato preferido | Objetivo inicial | Carga |
|---|---|---|---|
| Hero above the fold | AVIF/WebP; JPG fallback | Desktop ≤ 250 KB; mobile ≤ 180 KB por variante | `preload`/`fetchpriority` solo para el activo final |
| Categorías | WebP/AVIF; JPG fallback | ≤ 120 KB por imagen | `loading=lazy`, `decoding=async` |
| Soluciones | WebP/AVIF; JPG fallback | ≤ 180 KB por imagen | Lazy; no cargar si la solución sigue MISSING |
| Logo | Conservar GIF actual mientras no haya reemplazo aprobado | 29,831 bytes actuales | Carga inmediata, tamaño intrínseco respetado |

Targets de trabajo: Hero desktop 1600×1200; Hero mobile 900×1125; categorías 800×600; soluciones 1200×800. Son objetivos para preparación de assets, no una orden de transformación en esta fase.

Usar `srcset`/`sizes` cuando exista más de una variante autorizada. No convertir automáticamente URLs de proveedor ni generar derivados antes de confirmar derechos.

## 9. Logo

Activo local: `/Users/macbookpro/Projects/emotional-promos-hub/public/images/logo-pe.gif`.

- GIF89a, 805×157, 29,831 bytes.
- Tiene transparencia según inspección local.
- Es horizontal, adecuado para header desktop; requiere una variante CSS/recorte de escala para mobile, no rediseño.
- No se localizó otro logo local de mejor formato en `public/`.
- Favicon: `public/favicon.ico`, 256×256 RGBA; sirve como icono, no sustituye el logo de header.
- Mantener el logo actual. La mejora futura razonable sería exportar el mismo logo a un formato moderno/retina con aprobación de marca, sin reinterpretarlo.

## 10. Derechos y procedencia

| Grupo | Procedencia observada | Uso autorizado | Estado |
|---|---|---|---|
| Activos `assets.4promotional.net` | Host público de imágenes de producto; nomenclatura `img_articulos`, `img_product_color`, `img_articulos_esquema`, `material_venta`. | No comprobado para Home externa, recortes ni campañas. | **TO VERIFY** |
| Activos `d2jygl58194cng.cloudfront.net` | Host CloudFront; registros de producto con imagen promocional. | Proveedor/contrato no identificable desde la evidencia pública. | **TO VERIFY** |
| Innovation categorías | Assets públicos 768×512 para Bebidas, Libretas, Mochilas y Maletas, Tecnología y Sets. | No se localizó licencia de reutilización, recorte o alojamiento propio. | **UNCLEAR** |
| Impressline herramientas de venta | Descargas públicas PDF/JPG para campañas, regalos empresariales y kit de bienvenida. | Su propósito comercial sugiere uso por distribuidores, pero no prueba permiso para editar o reutilizar en Home. | **LIKELY PERMITTED / SCOPE UNCLEAR** |
| Doble Vela | Catálogo, material temporal y productos visibles públicamente. | El portal prohíbe expresamente la reproducción total o parcial. | **RESTRICTED** |
| Logo local | `public/images/logo-pe.gif`, mantenido por el proyecto. | Uso de marca del propio proyecto; conservar. | **APPROVED AS CURRENT LOGO** |
| Favicon local | `public/favicon.ico`. | Uso de icono del proyecto. | **APPROVED AS CURRENT FAVICON** |

La presencia del activo en una ficha pública no prueba licencia, exclusividad, permiso para campañas pagadas ni autorización de edición.

## 11. Fuera de alcance y bloqueos antes de Build

- No crear imágenes, composiciones o mockups.
- No sustituir `Regalos ejecutivos` por otra categoría.
- No publicar solución visual mientras no exista material contextual o una decisión explícita de fallback.
- No usar el Hero actual: la auditoría visual mostró imágenes de producto rotas en producción y claims incompatibles con el Copy Lock.
- No aprobar claims de proveedor, stock, calidad, entrega, garantías o trayectoria a partir de una fotografía.
- No tocar el repositorio funcional ni production.

## 12. Gate de owner review

El owner review debe resolver:

1. Confirmar H1 como fallback definitivo, entendiendo que no se implementa sin clearance.
2. Aprobar un activo Hero final únicamente después de autorización escrita o licencia verificable.
3. Aprobar o rechazar el candidato `Sets` de Innovation para `Regalos ejecutivos`, solo después de comprobar taxonomía y derechos.
4. Aportar o autorizar material contextual para Eventos, Colaboradores y Regalos corporativos.
5. Confirmar rights clearance de cada activo que sobreviva la revisión.

**PE HOME IMAGE LOCK V1 — PHASE 7C PARTIAL / RIGHTS BLOCKED**

## 9. Phase 7C.1 — nueva evidencia de catálogos

Se revisaron los dos PDFs entregados por el propietario:

- `Catalogo-Productos-Promocionales-2026-Mexico.pdf`: fuente StockSur, alta confianza; 254 páginas.
- `Catálogo 2026.pdf`: fuente G4, alta confianza; 150 páginas; contiene la marca `by G4`.

La shortlist visual documentada en `deliverables/phase-7c/PE_CATALOG_VISUAL_SHORTLIST_V1.md` propone referencias concretas para Hero, categorías y soluciones, pero no modifica el lock visual ni autoriza Build. Las imágenes siguen siendo referencias de catálogo de proveedor y no masters autorizados para PE.

Resultado adicional:

- Hero: tres referencias visuales fuertes, ninguna aprobada por derechos.
- Categorías: candidatos para Termos/Vasos, Libretas, Bolsas/Mochilas, Tecnología y Regalos Ejecutivos.
- Ropa promocional: sin candidato en los dos PDFs; el media bank ForPromotional aporta candidatos condicionados.
- Soluciones: solo referencias de producto; siguen faltando masters contextuales.
- G4 p. 63 / internas 124–125 con logotipo Victoria's Secret: excluido.

## 13. Phase 7C.2 — media bank ForPromotional recibido

El propietario entregó directamente tres ZIP del banco de imágenes de
ForPromotional / 4Promotional. Se revisó su estructura y una muestra visual
dirigida de las familias prioritarias. Los ZIP contienen 14,328 archivos,
principalmente JPG/JPEG, sin rutas duplicadas entre las tres entregas.

La entrega mejora sustancialmente la procedencia frente a los assets públicos,
pero no incluye en el material recibido una licencia o instrucciones escritas
de uso. Por eso ningún candidato pasa todavía a `READY TO USE`: el estado de
master se mantiene `RIGHTS TO VERIFY` y el estado de derechos es
`LIKELY PERMITTED / SCOPE UNCLEAR`.

### Resultado del lock visual

- **Ropa promocional:** deja de ser `MISSING` como categoría visual
  condicionada. `CH_002` es la primaria; `BL_011` es alternativa con
  presencia humana, pero pertenece a `GORRAS_Y_CANGURERAS` y no debe
  presentarse como chamarra.
- **Categorías:** hay candidatos de banco para las seis categorías de Home.
- **Hero:** hay tres candidatos de producto en contexto de escritorio/uso,
  pero ninguno demuestra por sí solo una escena empresarial humana o de
  campaña. Se consideran alternativas visuales, no Hero aprobado.
- **Soluciones:** hay referencias útiles para eventos, reconocimiento y
  regalos corporativos, pero no masters dedicados de activación, onboarding,
  entrega o empaque corporativo.

La shortlist única consolidada está en
`deliverables/phase-7c/PE_INTEGRATED_HOME_IMAGE_SHORTLIST_V1.md`. No autoriza
Build, publicación, rehosting, crop, Ads ni transformación de archivos.

## 14. Phase 7D — paquete pre-lock para owner review

Se revisó únicamente la shortlist cerrada de Phase 7C.2. No se buscaron
nuevos candidatos.

### Reconciliación operativa

La evidencia local disponible contiene rutas del media bank, SKUs de carpeta y
familias del proveedor, pero no contiene un catálogo público PE actual que
permita confirmar nombre oficial, slug, estado activo/visible o existencia
operativa para estos SKU. El XLSX disponible es material de prompts/marketing,
no un catálogo de productos.

Por tanto, los candidatos quedan `MAPPING REQUIRED`. No se marca `MATCH`,
`NOT IN PUBLIC CATALOG` ni `CONFLICT` sin una fuente operativa que lo
demuestre. Los mapeos conceptuales que requieren especial cuidado son:

- `BL_011`: proveedor `GORRAS_Y_CANGURERAS`; no describirlo como chamarra.
- `LE_OO1`: proveedor `LIBRETAS_ECOL_GICAS`; requiere mapeo a la categoría PE
  `Libretas` y no autoriza por sí solo un claim ambiental.
- `BL_304`: proveedor `PORTAFOLIOS`; no afirmar “ejecutivo” sin taxonomía PE.
- `O_165` y `O_190`: proveedor `RECONOCIMIENTOS`; pueden apoyar regalos o
  reconocimiento, pero no prueban la solución `Regalos corporativos`.

El paquete reducido de decisión está en
`deliverables/phase-7c/PE_OWNER_IMAGE_REVIEW_PACK_V1.md`. No marca OWNER
APPROVED.

### Estado de decisión

- **Hero:** el estado histórico de comparación queda sustituido por la
  decisión canónica vigente: **CLOSED / PASS — FINAL HERO: `T150`**.
- **Categorías:** todas tienen primary y alternative visual condicionadas.
- **Soluciones:** solo hay referencias de producto; no se elevan a masters
  finales de ocasión.
- **Derechos:** `PUBLICATION RIGHTS: CLOSED / PASS` para assets del banco
  ForPromotional / 4Promotional autorizado por el propietario. La validación
  de SKU, taxonomía, stock y disponibilidad permanece separada.
- **Owner status:** `OWNER DIRECTION APPROVED FOR INTERNAL BUILD`.

**PHASE 7D — READY FOR OWNER IMAGE LOCK**

## 15. Phase 7E — SKU / taxonomy reconciliation for internal build

La dirección del propietario queda incorporada únicamente para **internal
build / preview**:

- Hero temporal: `T_150`.
- Primarias: `T_150`, `O_090`, `CH_002`, `BL_163`, `SO_019`, `BL_304`.
- Alternativas: `T_327`, `LE_OO1`, `BL_011`, `BL_064`, `SO_155`, `O_165`.
- `BL_011` se trata únicamente como cangurera.
- Soluciones V1: sin imagen final.

La evidencia local disponible no contiene un catálogo público PE actual con
nombre oficial, slug, `active`, `public_visible`, stock o estado operativo
para estos SKU. El resultado es `NOT FOUND` **en la evidencia suministrada**,
no una afirmación de que los productos no existan. Todos requieren
`MAPPING REQUIRED` antes de publicación o enlace público.

### Gates mantenidos

- **OWNER DIRECTION:** `APPROVED FOR INTERNAL BUILD`.
- **PUBLICATION RIGHTS GATE:** `CLOSED / PASS` para el banco autorizado de
  ForPromotional / 4Promotional.
- **HERO FINAL ASSET:** `CLOSED / PASS`; **FINAL HERO: `T150`**.
- **PUBLIC CATALOG / SKU MAPPING:** pendiente de fuente operativa actual.
- **SOLUTIONS IMAGE:** no se añade en V1.

El mapa completo está en
`deliverables/phase-7c/PE_HOME_IMAGE_SKU_TAXONOMY_MAP_V1.md`.

**PHASE 7E — READY FOR BRAND-WEB DOC CHECKPOINT**

## 16. Canonical reconciliation — 2026-10-08

Las secciones históricas de Phase 7C/7D conservan el estado de decisión que
existía en esas fechas. El estado canónico vigente para Brand/Web es:

- Brand/Web B1–B4: **CLOSED / PASS**.
- Publication Rights: **CLOSED / PASS** por confirmación amplia del
  propietario para el banco ForPromotional / 4Promotional.
- Hero final: **CLOSED / PASS — `T150`**; implementación validada en
  `src/components/home/HomeHero.tsx` con
  `public/images/home-hero-t150.jpg`.
- Derechos de imagen de categoría para `T150`, `O090`, `CH002`, `BL163` y
  `SO019`: **CLEARED**.
- Solutions V1: sin fotografía final.
- El catálogo público, la taxonomía, el stock y la disponibilidad de los SKU
  permanecen pendientes de revalidación operativa; esta reconciliación no los
  infiere desde la imagen.
