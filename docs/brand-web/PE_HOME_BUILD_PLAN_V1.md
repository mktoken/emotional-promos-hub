# PE HOME BUILD PLAN V1

**Proyecto:** Promocionales Emocionales  
**Fase:** PE Strategy OS — Phase 7  
**Fecha de auditoría:** 2026-10-01  
**Estado:** READY FOR OWNER REVIEW  
**Modo:** Auditoría / Plan only  
**Implementación ejecutada:** ninguna  

## Certificación ejecutiva

La nueva Home puede integrarse a la SPA actual sin crear un catálogo, buscador, motor de precios, CRM o backend paralelos. El cambio mínimo consiste en reemplazar la presentación monolítica de `LandingView`, extraer el shell público y conectar las dos rutas aprobadas a contratos existentes.

La planificación queda certificada. El Build final y, especialmente, cualquier publicación quedan condicionados a cuatro gates:

1. resolver el contrato público de Ruta B para consentimiento, idempotencia y mapeo de campos;
2. entregar los activos visuales aprobados y sus derechos de uso;
3. validar identidad legal, contacto, privacidad y términos del Footer;
4. resolver la contradicción de navegación entre `Nosotros`, pedido en Phase 7, y `Mi solicitud`, aprobado en `HOME_COPY_LOCK_V1`.

Estos gates no requieren reabrir estrategia, diseño ni copy. Sí impiden publicar una Home con un CTA roto, activos improvisados o datos no verificados.

## 1. Repo baseline

| Campo | Valor auditado |
|---|---|
| Repositorio | `/Users/macbookpro/Projects/emotional-promos-hub` |
| Git root | `/Users/macbookpro/Projects/emotional-promos-hub` |
| Remote | `https://github.com/mktoken/emotional-promos-hub.git` |
| Rama | `main` |
| HEAD | `6f75ac27b9c9c831ea919f8bbb483a42a164875a` |
| `origin/main` disponible localmente | `6f75ac27b9c9c831ea919f8bbb483a42a164875a` |
| Divergencia | `0 0` |
| Working tree | limpio |
| Fetch | no ejecutado |

El gate Git pasó. No se modificó el repositorio, no se hizo fetch, commit, push, Build, Lovable, Supabase ni producción.

## 2. Architecture impact

### Estado actual

- React 18 + Vite + TypeScript + Tailwind + shadcn/Radix.
- `/` carga `src/pages/Index.tsx`.
- Las vistas públicas se resuelven con query string: `landing`, `catalog`, `pdp` y `cart`.
- `Index.tsx` conserva en memoria la selección de cotización y monta Header, Footer, WhatsApp y asistente.
- `LandingView.tsx` concentra Hero, productos recientes presentados como destacados, kits, proceso y garantía.
- `CatalogView.tsx` ya resuelve búsqueda, categorías, subcategorías, paginación, filtros y navegación por URL.
- `ProductDetailView.tsx`, `QuoteCartView.tsx`, Pricing V2, MOQ y la solicitud pública forman un flujo protegido.
- No existe `/solutions`, una página Nosotros ni una vista breve de brief de proyecto.
- El asistente público existente captura leads mediante `capture-assistant-lead`, pero no equivale todavía al brief mínimo aprobado.

### Arquitectura objetivo mínima

```text
Index shell
├── SiteHeader / MobileMenu
├── Home V1
│   ├── Hero
│   ├── Categories ───────────────→ ?view=catalog&category=<slug-real>
│   ├── Solutions ────────────────→ ProjectBrief (cuando cierre el gate Ruta B)
│   ├── Process
│   ├── Trust
│   ├── FAQ
│   └── Final CTA
├── CatalogView ─→ ProductDetailView ─→ QuoteCartView
└── SiteFooter
```

No se propone React Router adicional, SSR, CMS, tabla, RPC, migración ni Edge Function nueva. Se preserva el routing por query string para minimizar riesgo.

### Estrategia de integración

- Mantener la Home anterior recuperable durante el Build mediante una bandera frontal OFF por defecto o un corte equivalente de preview; no publicar una Home incompleta.
- Extraer componentes únicamente para reducir el monolito y permitir QA focal.
- Mantener `CatalogView`, PDP y solicitud como consumidores de sus contratos actuales.
- Ocultar en la nueva Home los widgets flotantes que compiten con las dos rutas principales; conservar la ayuda contextual solo en catálogo/PDP si el propietario la mantiene.
- No habilitar el Super Agente QA/piloto en producción.

## 3. Exact file map

### Archivos existentes a modificar en el Build futuro

| Archivo | Cambio mínimo planificado | No debe cambiar |
|---|---|---|
| `src/pages/Index.tsx` | Extraer Header/Footer, montar Home V1, conservar handlers de catálogo/PDP/cart, condicionar ayuda contextual y añadir navegación a secciones Home | cart state, `addToQuote`, `openProduct`, `backFromProduct`, query routing |
| `src/components/LandingView.tsx` | Convertir en orquestador limpio o sustituirlo por `HomeV1` detrás del gate de rollback | ningún contrato de catálogo o CRM |
| `src/index.css` | Ajustar tokens visuales existentes una vez aprobados rojo/fuente; añadir utilidades mínimas de foco/motion si hacen falta | semántica de estados y tokens consumidos por CRM |
| `index.html` | `lang`, title, description, canonical, OG/Twitter aprobados | scripts y root de Vite |
| `public/robots.txt` | Solo en checkpoint SEO: bloquear superficies no públicas si se aprueba | acceso a Home y catálogo públicos |

### Archivos nuevos mínimos propuestos

| Archivo | Responsabilidad |
|---|---|
| `src/components/site/SiteHeader.tsx` | Navegación pública desktop y acción contextual |
| `src/components/site/MobileMenu.tsx` | Menú accesible con `Sheet` existente |
| `src/components/site/SiteFooter.tsx` | Navegación y datos legales verificados |
| `src/components/home/HomeV1.tsx` | Orden exacto de las siete zonas |
| `src/components/home/HomeHero.tsx` | Copy bloqueado y dos rutas |
| `src/components/home/HomeCategories.tsx` | Seis categorías con mapping tipado |
| `src/components/home/HomeSolutions.tsx` | Tres soluciones y contexto Ruta B |
| `src/components/home/HomeProcess.tsx` | Tres pasos aprobados |
| `src/components/home/HomeTrust.tsx` | Tres señales aprobadas |
| `src/components/home/HomeFaq.tsx` | Cinco FAQ cerradas con Radix Accordion |
| `src/components/home/HomeFinalCta.tsx` | Repetición A/B |
| `src/components/home/home-content.ts` | Copy bloqueado y mappings estáticos tipados; sin claims alternativos |
| `src/components/home/home-navigation.test.tsx` | Destinos, slugs, anchors y rutas A/B |
| `src/components/home/home-content.test.ts` | Copy exacto y ausencia de claims prohibidos |

### Ruta B, solo tras cerrar su gate

| Archivo | Cambio propuesto |
|---|---|
| `src/features/project-brief/components/ProjectBrief.tsx` | Formulario corto, accesible y sin chat simulado |
| `src/features/project-brief/lib/project-brief.ts` | Validación y mapping al contrato existente |
| `src/features/project-brief/lib/project-brief.test.ts` | Campos mínimos, consentimiento y no PII en tracking |
| `src/features/assistant/hooks/useAssistantLeadCapture.ts` | Reutilizar como transporte solo si el contrato queda aprobado; no cambiar Edge Function |

No crear estos archivos de Ruta B mientras no exista decisión sobre consentimiento persistido e idempotencia.

## 4. Component map — reuse / refine / replace / remove / new

| Superficie | Clasificación | Decisión |
|---|---|---|
| `Index.tsx` shell | REFINE | Extraer presentación; conservar estado y routing |
| Logo `/images/logo-pe.gif` | REUSE TEMPORAL | Es el logo actual; sustituir por SVG autorizado antes de publicación si se entrega |
| Header actual | REPLACE PRESENTATION | Quitar `Catálogo +10k`; mantener catálogo y Mi solicitud hasta resolver navegación final |
| `LandingView` actual | REPLACE PRESENTATION | Sustituir sus secciones por las siete zonas aprobadas |
| Query de cuatro productos recientes | REMOVE FROM HOME | No existe autoridad para “Top ventas” ni “favoritos” |
| `CatalogView` | REUSE | Sin rediseño funcional |
| Search y filtros | REUSE | Sin duplicar buscador en Home V1 |
| Category RPC/data source | REUSE | Usar los slugs reales auditados |
| Product cards | REUSE | No llevar su densidad a Home |
| `ProductDetailView` | PROTECTED / REUSE | Fuera del Build Home salvo checkpoint separado de claims |
| `QuoteCartView` | PROTECTED / REUSE | Flujo de solicitud intacto |
| `Accordion` Radix | REUSE | Configurar cerrado; añadir foco visible en uso si es necesario |
| `Sheet` Radix | REUSE | Mobile menu; mantiene trap y retorno de foco |
| `Button`, `SafeProductImage`, `Skeleton`, `Toast` | REUSE | Sin crear primitives paralelos |
| Kits block | REPLACE | Tres soluciones aprobadas, sin promesas de kitting |
| Process block | REFINE STRUCTURE | Mantener secuencia de tres; reemplazar todo el copy |
| Guarantee block | REMOVE / REPLACE | Sustituir por confianza verificable |
| WhatsApp Hero/floating Home | REMOVE FROM PRIMARY HOME | Puede mantenerse contextual fuera de Home con decisión explícita |
| `AssistantWidget` en Home | REMOVE FROM PRIMARY HOME | Ayuda contextual solo en catálogo/brief; no tercera ruta |
| FAQ | NEW USING EXISTING PRIMITIVE | Sin librería nueva |
| Final CTA | NEW | Dos rutas, sin conversiones adicionales |

## 5. Route A integration

### Contrato vigente

- Catálogo general: `/?view=catalog`.
- Categoría: `/?view=catalog&category=<slug-real>`.
- Búsqueda: `/?view=catalog&q=<query>` con debounce de 300 ms.
- PDP: `/?view=pdp&product=<product-id>&returnTo=<url>`.
- Solicitud: `/?view=cart` con selección en memoria.

### Decisión

**REUSE EXISTING CONTRACT.**

La Home solo debe construir los parámetros ya consumidos por `CatalogView`. No se introducen rutas nuevas, IDs hardcodeados, query RPC distinta ni buscador paralelo.

### Reglas

- CTA Hero A y CTA final A: `/?view=catalog`.
- CTA “Ver todo el catálogo”: `/?view=catalog`.
- Cards de categoría: URL con slug exacto de la sección 7.
- En mobile no usar `choose=categories` desde una card específica; el slug debe aplicarse directamente.
- Conservar back/forward, `returnTo`, restauración de scroll, paginación y filtros.
- La Home no consulta precios, MOQ ni stock.

## 6. Route B contract audit

### Evidencia existente

`useAssistantLeadCapture` invoca `capture-assistant-lead` con:

- `captured`;
- `summary`;
- `messages`;
- `visitor_id`.

La Edge Function existente:

- acepta nombre y un medio de contacto;
- busca/reutiliza lead por WhatsApp/teléfono/email;
- crea o actualiza `crm_leads`;
- crea actividad, nota, sesión y mensajes;
- guarda `captured_data` y devuelve `lead_id`, `session_id` y `reused`.

### Diferencias frente al brief aprobado

| Requisito aprobado | Estado actual |
|---|---|
| Necesidad/objetivo | Puede conservarse en `summary`/`comments`; no existe campo canónico explícito de objetivo |
| Cantidad o “por definir” | El payload permite número/string; la UI actual obliga cantidad positiva |
| Fecha o “por definir” | El payload permite omitir fecha; la UI actual lo maneja como opcional |
| Nombre | soportado y requerido |
| Empresa | soportado, pero actualmente opcional |
| Un medio de contacto | soportado; la UI actual obliga WhatsApp y deja email opcional |
| Consentimiento/privacidad | no existe en tipos, UI ni contrato documentado |
| Idempotencia | no existe clave de idempotencia para este flujo; repetir puede crear actividad/nota/sesión adicionales |
| Formulario breve | no existe; el panel actual tiene 17 pasos y conversación sintética |
| Confirmación sin SLA | el éxito actual promete “muy pronto”; debe retirarse |

### Clasificación

**ADAPT EXISTING CONTRACT — FUNCTIONAL RELEASE BLOCKED.**

La escritura CRM es reutilizable, pero no se certifica el brief público hasta decidir:

1. texto y URL del aviso de privacidad;
2. consentimiento obligatorio y si debe persistirse con timestamp/version;
3. protección idempotente o política explícita de reenvío;
4. mapping canónico de objetivo, cantidad/fecha por definir y empresa;
5. si `messages` puede enviarse vacío sin crear historial artificial;
6. corrección del mínimo server-side que hoy acepta `comments` como sustituto de contacto.

No se propone tabla, endpoint, RPC o Edge Function nueva. Si cerrar estos puntos exige modificar `capture-assistant-lead`, debe abrirse un checkpoint técnico separado porque Edge Functions están protegidas en este Build.

### Presentación permitida antes del cierre funcional

Puede maquetarse la tarjeta y el CTA de Ruta B detrás del gate de preview, pero no publicar un CTA que escriba CRM sin consentimiento verificable e idempotencia suficiente.

## 7. Category mapping exacto

Mapping comprobado contra la taxonomía pública y el routing vigente:

| Etiqueta Home | Categoría real | Slug real | URL exacta | Category ID |
|---|---|---|---|---|
| Termos y vasos | Bebidas, termos y vasos | `bebidas-termos-vasos` | `/?view=catalog&category=bebidas-termos-vasos` | existe runtime; no versionado/no requerido por la ruta |
| Libretas | Libretas y cuadernos | `libretas-cuadernos` | `/?view=catalog&category=libretas-cuadernos` | existe runtime; no versionado/no requerido por la ruta |
| Ropa promocional | Ropa promocional | `textiles-ropa` | `/?view=catalog&category=textiles-ropa` | existe runtime; no versionado/no requerido por la ruta |
| Bolsas y mochilas | Bolsas, mochilas y viaje | `bolsas-mochilas-viaje` | `/?view=catalog&category=bolsas-mochilas-viaje` | existe runtime; no versionado/no requerido por la ruta |
| Tecnología | Tecnología | `tecnologia` | `/?view=catalog&category=tecnologia` | existe runtime; no versionado/no requerido por la ruta |
| Regalos ejecutivos | Premios y regalos ejecutivos | `premios-regalos-ejecutivos` | `/?view=catalog&category=premios-regalos-ejecutivos` | existe runtime; no versionado/no requerido por la ruta |

Regla: hardcodear únicamente este mapping tipado de etiqueta aprobada a slug auditado. No hardcodear UUIDs de categorías.

## 8. Solutions map

No existe `/solutions` ni página equivalente. Existe un bloque “Kits” en `LandingView.tsx`, pero su promesa operativa está rechazada.

| Solución V1 | Estado | Decisión | Destino futuro |
|---|---|---|---|
| Eventos y campañas | Sin página | REFINE HOME / NO PAGE V1 | Ruta B con contexto `eventos-campanas` |
| Colaboradores y reconocimiento | Sin página | REPLACE KITS BLOCK / NO PAGE V1 | Ruta B con contexto `colaboradores-reconocimiento` |
| Regalos corporativos | Sin página | REFINE HOME / NO PAGE V1 | Ruta B con contexto `regalos-corporativos` |

No crear tres páginas independientes: no hay contenido aprobado suficiente ni necesidad técnica. Las cards deben usar exactamente el copy aprobado y, si el contrato lo permite, preseleccionar contexto sin fabricar datos CRM.

## 9. Claims removal map

### Home y shell

| Claim inseguro | Archivo y ubicación auditada | Acción futura |
|---|---|---|
| `Catálogo +10k` | `src/pages/Index.tsx:140` | sustituir por `Catálogo` |
| Plataforma B2B para Compradores Corporativos | `src/components/LandingView.tsx:119` | sustituir por eyebrow aprobado |
| mejores artículos corporativos | `LandingView.tsx:121-124` | sustituir por H1 aprobado |
| `+10,000 productos` | `LandingView.tsx:126` | retirar |
| inventario en tiempo real | `LandingView.tsx:126` | retirar |
| renders virtuales | `LandingView.tsx:127` | retirar |
| propuesta en minutos | `LandingView.tsx:127` | retirar |
| Stock en vivo | `LandingView.tsx:152` | retirar |
| Catálogo Activo | `LandingView.tsx:164` | retirar |
| Top Ventas Corporativas | `LandingView.tsx:168` | retirar; la query carga recientes, no ventas |
| favoritos de clientes corporativos | `LandingView.tsx:241` | retirar |
| Solución Todo en Uno | `LandingView.tsx:320` | retirar |
| Nosotros los armamos | `LandingView.tsx:324` | retirar |
| Ahorro logístico: un solo proveedor | `LandingView.tsx:335` | retirar |
| trabajo pesado | `LandingView.tsx:364` | sustituir por proceso aprobado |
| Asesoría y Anticipo | `LandingView.tsx:377-378` | retirar |
| Producción y Envío | `LandingView.tsx:382` | retirar |
| calidad premium / entregamos puntualmente | `LandingView.tsx:383` | retirar |
| Garantía Cero Riesgos | `LandingView.tsx:402` | eliminar bloque |
| reposición completa sin costo | `LandingView.tsx:404-405` | eliminar |

### Contradicciones adyacentes, fuera del commit Home salvo autorización explícita

| Claim | Ubicación | Tratamiento |
|---|---|---|
| Inventario enlazado en tiempo real | `src/components/CatalogView.tsx:420` | checkpoint de claims cross-surface antes de Publish |
| Entrega estimada 10 a 15 días | `src/components/ProductDetailView.tsx:223,627` | auditar origen; no tocar dentro de Home Build |
| “muy pronto” | `src/features/assistant/components/AssistantPanel.tsx:200` | retirar al adaptar Ruta B o en checkpoint focal |
| Footer address/phone/email | `src/pages/Index.tsx:194-215` | conservar solo tras verificación legal/comercial |

## 10. SEO map

| Elemento | Actual | Requerido | Archivo |
|---|---|---|---|
| `html lang` | `en` | `es-MX` | `index.html:2` |
| Title | `promocionalesemocionales` | `Artículos promocionales para empresas \| Promocionales Emocionales` | `index.html:7` |
| Meta description | `Proyecto Web Articulos Promocionales` | copy exacto aprobado | `index.html:8` |
| Author | `Lovable` | marca o eliminar si no aporta | `index.html:9` |
| H1 Home | claim actual | H1 aprobado, uno solo | `HomeHero` futuro |
| Canonical | ausente | `https://articulospromocionales.vip/` para Home | `index.html` o helper SEO único |
| OG title/description | genéricos | copy aprobado | `index.html:24-27` |
| OG image | preview R2 de Lovable | asset social aprobado 1200×630 | `index.html:15,19`; asset faltante |
| Twitter site | `@Lovable` | retirar salvo cuenta oficial verificada | `index.html:18` |
| Structured data | ausente | no añadir hasta validar identidad/legal/contacto | checkpoint SEO |
| robots | permite todo | revisar exclusión de `/crm`, `/login`, `/auth`, `/agente-piloto` | `public/robots.txt` |
| sitemap | ausente | diferir hasta definir URLs canónicas públicas | futuro |

La SPA comparte documento base entre vistas. El checkpoint SEO debe evitar que un helper y el HTML estático compitan. Para V1, usar una única fuente y probar Home, catálogo, PDP y rutas privadas. No publicar Organization/LocalBusiness schema con dirección, teléfono, cobertura o trayectoria no verificados.

## 11. Analytics map

No se encontró SDK, `gtag`, `dataLayer`, helper de eventos ni eventos equivalentes en `src`, `public`, `index.html` o `package.json`. Por tanto no hay eventos válidos que duplicar.

| Evento reservado | Disparador único | Propiedades permitidas | Nunca incluir |
|---|---|---|---|
| `view_home` | primera vista Home por navegación | `viewport_group`, `source` | visitor ID persistente, contacto |
| `choose_product_route` | CTA A | `placement` | texto libre |
| `choose_project_route` | CTA B | `placement`, `solution_context` enumerado | brief, empresa, contacto |
| `view_category` | card Home o filtro explícito | `category_slug`, `source` | query libre si puede contener PII |
| `view_product` | apertura PDP una vez por product ID/view | `product_id`, `category_slug` | contacto, precio interno |
| `start_product_quote` | primera adición válida a solicitud | `product_id`, `price_status` | observaciones del usuario |
| `start_project_brief` | apertura del brief | `placement`, `solution_context` | campos del brief |
| `submit_request` | respuesta exitosa única | `request_type`, `result`, ID técnico solo si política lo permite | nombre, email, teléfono, empresa, comentarios |

Implementación bloqueada hasta definir proveedor, consentimiento/cookies, política de IDs y entorno. Si se aprueba, centralizar en un helper único y deduplicar por transición/resultado, no por render.

## 12. Asset map

| Activo | Inventario | Clasificación | Gate |
|---|---|---|---|
| Logo actual | `public/images/logo-pe.gif`, 805×157, 29,831 bytes | REUSE TEMPORAL | SVG autorizado no disponible |
| Favicon | `public/favicon.ico`, 256×256 | REUSE | verificar coherencia visual |
| Placeholder | `public/placeholder.svg` | REUSE FUNCTIONAL | no usar como fotografía final |
| Iconos | `lucide-react` instalado | REUSE | una familia, uso mínimo |
| Hero photo | no existe en repo | MISSING | imagen aprobada + derechos + crops |
| Seis imágenes de categoría | no existen como assets propios | MISSING | selección real y estable por categoría |
| Tres imágenes de solución | no existen | MISSING | imágenes aprobadas + derechos |
| OG/social image | no existe asset propio adecuado | MISSING | 1200×630 aprobada |
| Tipografía de propuesta | no existe archivo/licencia | MISSING | confirmar familia y licencia |
| Rojo oficial | token actual `--primary: 0 72% 51%` | REUSE AS BASELINE ONLY | confirmar contra logo/propuesta |
| Export desktop/mobile aprobado | no localizado en repo/entregables | MISSING | adjuntar referencia del Visual Lock |
| Imágenes remotas de producto | runtime del catálogo | CANDIDATE, NOT FINAL ASSET | verificar producto, estabilidad y derechos |

No generar assets durante Build. No usar stock genérico, logos de terceros o imágenes remotas arbitrarias para cerrar el gate.

## 13. Responsive plan

### Sistema existente

- Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- Container actual llega a 1400 px en `2xl`.
- Hook mobile existente usa `<768`.
- `CatalogView` y `MobileFiltersDrawer` ya separan comportamiento en 768 px.

### Regla

No crear otro sistema de breakpoints. Diseñar con las utilities actuales y certificar:

| Viewport | QA obligatoria |
|---|---|
| 390 px | Hero, dos rutas, menú, grilla 2 columnas, FAQ, forms y ausencia de overflow |
| 768 px | transición menú/grid y ausencia de estados intermedios rotos |
| 1024/1280 px | navegación completa, Hero split y jerarquía de secciones |
| 1440 px | max-width, aire, Hero y dos rutas dentro del viewport objetivo |

Reglas: mobile no comprime desktop; no carruseles obligatorios; targets 44×44; copy secundario reducido; imágenes con crops explícitos; foco visible; `prefers-reduced-motion`; no bottom navigation.

## 14. Build checkpoints

### B0 — Readiness gate, sin código

- **Scope:** cerrar Route B, activos, Footer/legal y navegación `Nosotros`/`Mi solicitud`.
- **Files:** ninguno.
- **Dependencies:** propietario, privacidad/legal, activos aprobados.
- **Prohibitions:** no placeholders públicos, no backend improvisado.
- **Acceptance:** cuatro decisiones cerradas y assets entregados.
- **QA:** checklist documental.
- **Rollback:** no aplica.
- **Commit boundary:** ninguno.

### B1 — Shell, Header y Hero bajo gate de preview

- **Scope:** `SiteHeader`, `MobileMenu`, `HomeV1`, `HomeHero`; bandera Home V1 OFF por defecto; ocultar widgets competidores solo dentro de Home V1.
- **Files:** `Index.tsx`, nuevos componentes site/home, `home-content.ts`, tests focales.
- **Dependencies:** B0, logo y Hero assets.
- **Prohibitions:** no catálogo, Pricing, CRM, Edge, SEO global ni Publish.
- **Acceptance:** copy exacto, dos rutas visibles, shell conserva catálogo/PDP/cart, menú accesible.
- **QA:** unit/component, teclado, 390/768/1280/1440, rutas A/B sin escrituras.
- **Rollback:** apagar bandera o revertir solo commit B1.
- **Commit boundary:** `feat: add gated home shell and hero`.

### B2 — Categorías y Ruta A

- **Scope:** seis cards, mapping tipado, CTA catálogo, regresión búsqueda/navegación.
- **Files:** `HomeCategories.tsx`, `home-content.ts`, tests.
- **Dependencies:** B1; slugs ya auditados; imágenes aprobadas.
- **Prohibitions:** no cambiar RPC, filtros, catálogo o PDP.
- **Acceptance:** seis URLs exactas, sin slug inferido, back/forward y mobile correctos.
- **QA:** click de cada card, A1 parcial, A2 completo, búsqueda/filtros/paginación sin regresión.
- **Rollback:** revertir B2; catálogo queda intacto.
- **Commit boundary:** `feat: connect home categories to catalog`.

### B3 — Soluciones y Ruta B

- **Scope:** tres cards, `ProjectBrief` breve y adaptación al contrato existente.
- **Files:** `HomeSolutions.tsx`, feature `project-brief`, hook existente solo si el contrato aprobado no exige backend.
- **Dependencies:** gate Ruta B cerrado, privacidad/consentimiento, idempotencia y mapping aprobados.
- **Prohibitions:** no tabla/RPC/Edge nueva; no chat sintético; no WhatsApp como registro principal.
- **Acceptance:** nombre, empresa, contacto, objetivo, cantidad/fecha definidas o “por definir”, consentimiento, una escritura, confirmación sin SLA.
- **QA:** validación, doble click/reintento, error recuperable, B1 E2E con identidad QA.
- **Rollback:** desactivar Ruta B/Home V1; revertir B3 sin tocar CRM.
- **Commit boundary:** `feat: connect project brief to existing crm capture`.

Si B3 requiere Edge Function, detener este checkpoint y abrir autorización técnica separada.

### B4 — Proceso, Confianza, FAQ y CTA final

- **Scope:** completar las siete zonas y eliminar todo claim Home rechazado.
- **Files:** `HomeProcess`, `HomeTrust`, `HomeFaq`, `HomeFinalCta`, `LandingView/HomeV1`, tests de contenido.
- **Dependencies:** B1-B3, copy lock.
- **Prohibitions:** no inventar señales, SLA, garantía, stock o entrega.
- **Acceptance:** copy exacto; cinco FAQ cerradas; foco/ARIA/teclado; dos CTA finales.
- **QA:** búsqueda automatizada de claims prohibidos y revisión visual.
- **Rollback:** revertir B4; gate mantiene Home anterior.
- **Commit boundary:** `feat: complete approved home sections`.

### B5 — Responsive, accesibilidad y assets

- **Scope:** crops, responsive image delivery, spacing, foco, motion y revisión mobile/desktop.
- **Files:** componentes Home/site, `index.css`, assets aprobados.
- **Dependencies:** assets finales y licencias.
- **Prohibitions:** no librerías nuevas salvo necesidad demostrada; no rediseño de catálogo.
- **Acceptance:** matrices responsive/accessibility PASS, sin overflow, sin layout shift evitable.
- **QA:** 390/768/1024/1280/1440, teclado, contraste AA, reduced motion.
- **Rollback:** revertir B5 sin afectar lógica.
- **Commit boundary:** `style: finalize responsive home system`.

### B6 — SEO y analytics permitidos

- **Scope:** metadata Home, lang, canonical, OG/Twitter, robots; analytics solo si proveedor/consentimiento aprobados.
- **Files:** `index.html`, `public/robots.txt`, asset OG y helper analytics opcional.
- **Dependencies:** asset OG, canonical, legal/analytics decision.
- **Prohibitions:** no PII, schemas no verificados, sitemap prematuro, eventos duplicados.
- **Acceptance:** title/meta/H1 exactos, canonical único, preview sin Lovable, rutas privadas no promovidas.
- **QA:** DOM metadata, share preview, robots, evento único por acción en entorno QA.
- **Rollback:** revertir B6; presentación permanece.
- **Commit boundary:** `feat: add approved home seo and measurement`.

### B7 — Claims cross-surface y QA integral

- **Scope:** retirar contradicciones autorizadas de catálogo/PDP/asistente y ejecutar E2E completo; no ampliar funcionalidad.
- **Files:** solo ubicaciones del mapa de claims con autorización explícita, tests/evidencia.
- **Dependencies:** B1-B6; permiso para superficies adyacentes.
- **Prohibitions:** no cambiar Pricing/MOQ/stock authority ni emisión.
- **Acceptance:** matriz completa PASS, cero claims contradictorios, cero errores TS nuevos atribuibles.
- **QA:** A1, A2, B1, C1, C2 y regresión CRM/cotización.
- **Rollback:** revertir B7 por separado; no reset/force push.
- **Commit boundary:** `test: certify home launch gate` o split documental autorizado.

### Activación

Home V1 se activa únicamente después de B7. No publicar una mezcla de Home nueva con garantía, `+10k`, stock en vivo o Ruta B incompleta.

## 15. Acceptance criteria

1. Home contiene exactamente Hero, Categorías, Soluciones, Cómo funciona, Confianza, FAQ y CTA final.
2. Copy coincide con `HOME_COPY_LOCK_V1`; un solo H1.
3. Hero y CTA final presentan Ruta A y B con jerarquía clara.
4. Las seis categorías usan los slugs auditados.
5. Ruta A no modifica catálogo, búsqueda, PDP, Pricing V2, MOQ o solicitud.
6. Ruta B solo se habilita con contrato, consentimiento e idempotencia aprobados.
7. No aparecen claims rechazados en Home ni contradicciones autorizadas para retirar.
8. Radix Accordion inicia cerrado y pasa teclado, ARIA y foco.
9. Mobile 390 y desktop 1280/1440 mantienen jerarquía y no desbordan.
10. Assets tienen derechos, alt text, dimensiones y formatos responsivos.
11. SEO usa title, meta, H1 y canonical aprobados.
12. Analytics, si se habilita, no envía PII ni duplica eventos.
13. Suite vigente no regresa; baseline TS conserva 47 diagnósticos históricos y agrega 0 nuevos atribuibles.
14. Working tree final limpio; commits reversibles por checkpoint; push normal.
15. Producción solo se publica tras QA y autorización explícita.

## 16. QA matrix

| Área | Caso | Gate |
|---|---|---|
| Visual desktop | 1280 y 1440, jerarquía, densidad, assets | PASS visual |
| Visual mobile | 390, primer bloque, dos rutas, crops | PASS visual |
| Tablet | 768, menú y grids | sin estado roto |
| Navigation | Header, anchors, back/forward, reload | PASS |
| Category links | seis slugs exactos | 6/6 PASS |
| Search | query, debounce, empty/error | sin regresión |
| Product cards | imagen, PDP, back | sin regresión |
| Pricing | `priced/request_quote/below_minimum/unavailable` | intactos |
| MOQ | mínimo autoritativo | intacto |
| Quote flow | add/remove/contact/submit/idempotencia existente | PASS |
| CRM | una solicitud QA, lead/activity/note/session esperados | PASS controlado |
| Route B | campos, consentimiento, doble submit, error | PASS antes de publicar |
| FAQ | cerrado, teclado, ARIA, foco | PASS |
| SEO | lang/title/meta/H1/canonical/OG | PASS |
| Analytics | eventos únicos, sin PII | PASS o explícitamente OFF |
| Console | errores y warnings atribuibles | 0 nuevos bloqueantes |
| TypeScript delta | comparar contra 47 baseline | 0 nuevos |
| Responsive | 390/768/1024/1280/1440 | PASS |
| Claims | inventario completo | 0 prohibidos |
| Performance | dimensiones, lazy load, bundle delta | sin regresión material |

## 17. E2E plan

### A1 — Categoría a cotización

Home → `Termos y vasos` → catálogo filtrado por `bebidas-termos-vasos` → producto real → cantidad válida → precio/MOQ según autoridad → Mi solicitud → detener antes de envío o usar identidad QA autorizada en entorno controlado.

### A2 — Búsqueda a cotización

Home → Explorar catálogo → búsqueda → producto → PDP → selección → Mi solicitud. Verificar back/forward, URL y no regresión.

### B1 — Proyecto a revisión comercial

Home → Contar mi proyecto → objetivo → cantidad/fecha o por definir → nombre/empresa/contacto → consentimiento → resumen → una sola solicitud QA → confirmación sin SLA → CRM muestra registro y revisión comercial.

No ejecutar B1 hasta cerrar el gate contractual.

### C1 — Mobile Ruta A

390 px → Hero con ambas rutas → Explorar catálogo → categoría → producto. Confirmar targets, drawer, scroll y sin overflow.

### C2 — Mobile Ruta B

390 px → Hero → Contar mi proyecto → formulario breve → validación/consentimiento → confirmación. Confirmar teclado, focus, mensajes y retorno.

## 18. Rollback plan

1. Desarrollar Home V1 detrás de gate frontal OFF hasta B7.
2. Un commit por checkpoint; nunca mezclar backend o migraciones.
3. Si falla preview, apagar el gate y conservar `LandingView` actual.
4. Si falla una fase ya integrada, usar `git revert <commit>` normal del checkpoint afectado.
5. No usar `reset --hard`, force push, rebase ni merge automático.
6. No revertir catálogo, Pricing, CRM o Supabase para retirar la Home.
7. Si Ruta B falla, deshabilitar su escritura y volver a preview; no redirigir a WhatsApp como parche silencioso.

## 19. Risks

| Riesgo | Nivel | Protección |
|---|---|---|
| CTA B publicado sin consentimiento/idempotencia | Alto | gate B0/B3 |
| Assets improvisados o sin derechos | Alto | asset gate y no Publish |
| Cambio de shell rompe cart/routing | Alto | tests de `Index`, feature flag y E2E |
| Claims sobreviven en superficies adyacentes | Alto | B7 autorizado y búsqueda textual |
| `Nosotros` sin destino | Medio | decisión owner antes de Header final |
| Footer no verificado | Alto | omitir datos hasta evidencia |
| Categorías divergen | Medio | mapping tipado + 6/6 tests |
| Metadata estática contamina catálogo/PDP | Medio | fuente SEO única y QA por vista |
| Analytics duplica o envía PII | Alto | proveedor/consentimiento y helper único |
| 47 errores TS ocultan regresión | Medio | comparación de delta, no conteo aislado |
| Hero pesado degrada mobile | Alto | formatos/crops/dimensiones/budget |
| Widgets flotantes crean tercera ruta | Medio | ocultar en Home V1, mantener solo contextual |
| Quote cart es in-memory | Existente | no corregir en este checkpoint; incluir en QA |

## 20. Blockers

### Críticos antes de Build funcional/publicación

1. **Ruta B:** consentimiento persistido/registrable, idempotencia y mapping final.
2. **Activos:** Hero, categorías, soluciones, OG, SVG del logo, tipografía/licencia y exports aprobados.
3. **Footer/legal:** aviso de privacidad, términos, razón social y contacto vigentes.
4. **Header:** decidir `Nosotros` vs `Mi solicitud`; no existe página ni sección Nosotros.

### Bloqueo solo para Analytics

- proveedor, consentimiento/cookies, política de IDs y entornos.

### No bloqueantes para preparar código detrás de preview

- testimonios, cobertura, trayectoria, muestras, facturación, entrega y campañas de fin de año; se omiten.

## 21. Explicitly protected surfaces

No modificar dentro de este Build salvo checkpoint independiente y autorización expresa:

- `supabase/**`;
- `src/integrations/supabase/**`;
- `src/features/catalog/lib/public-product-price.ts` y tests;
- `src/features/quotes/lib/**`;
- contratos/RPC `catalog_search_products_v2`, `get_public_product_price_quote`, `submit_public_quote_request`;
- `src/components/ProductDetailView.tsx` y `QuoteCartView.tsx`, excepto un checkpoint autorizado de copy sin lógica;
- `src/features/crm/**`;
- `src/features/agent/**` y flags QA/piloto;
- Auth, RLS, schema, migrations, Edge Functions;
- provider sync, imports, stock authority y Pricing shadow;
- emisión, PDF, Gmail y WhatsApp;
- impresión/G4;
- deuda TypeScript histórica.

## 22. Recommended first build checkpoint

### Recomendación

Ejecutar primero **B0 — Readiness gate**. No iniciar Lovable Build antes de cerrar los cuatro blockers críticos.

Después, el primer checkpoint de código debe ser **B1 — Shell, Header y Hero bajo gate de preview**, porque:

- prueba la integración con `Index.tsx` sin tocar catálogo/CRM;
- fija navegación, jerarquía y comportamiento mobile temprano;
- mantiene la Home productiva anterior disponible;
- permite revertir una sola capa de presentación;
- evita construir siete secciones sobre un shell o una Ruta B no resueltos.

No se recomienda empezar por SEO, analytics, páginas de soluciones ni refactor del catálogo.

## Decisiones owner restantes

1. ¿El Header final conserva `Mi solicitud` y omite `Nosotros`, o se aprueba una sección/destino real para `Nosotros`?
2. ¿Qué evidencia/registro debe conservar el consentimiento de Ruta B y qué política de reenvío/idempotencia se exige?
3. ¿Cuáles son los archivos finales y derechos de Hero, seis categorías, tres soluciones, OG, SVG y tipografía?
4. ¿Qué razón social, datos de contacto, privacidad y términos están autorizados para Footer?
5. ¿Analytics queda OFF en V1 o qué proveedor/consentimiento se aprueba?

**PE PHASE 7 — BUILD PLAN READY FOR OWNER REVIEW**
