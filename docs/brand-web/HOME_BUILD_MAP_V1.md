# HOME BUILD MAP V1

**Proyecto:** Promocionales Emocionales  
**Fase:** PE Strategy OS — Phase 6  
**Modo:** Auditoría / Plan only  
**Resultado:** mapa de cambio mínimo para implementar la Home aprobada sin alterar contratos funcionales protegidos.

## 1. Baseline auditada

### Implementación actual

- SPA React/Vite con navegación pública controlada desde `src/pages/Index.tsx` mediante `view` en query string.
- Home actual en `src/components/LandingView.tsx`.
- Catálogo en `CatalogView.tsx`, con búsqueda, categorías reales, filtros, paginación y estados de carga/error.
- Ficha en `ProductDetailView.tsx`, con variantes, cantidad, MOQ, precio autoritativo, personalización y solicitud.
- Selección/solicitud en `QuoteCartView.tsx`.
- Ruta B pública adicional mediante `AssistantWidget`/`AssistantPanel` y `capture-assistant-lead`.
- Pricing público por `get_public_product_price_quote`; el cliente no calcula precios.
- UI base y primitives de shadcn/Tailwind ya disponibles.

### Producción observada

- Home, catálogo y solicitud públicos responden.
- Catálogo mostró 992 productos y 15 categorías principales en el corte observado.
- La Home pública aún contiene claims que no superan el gate.
- SEO actual: title `promocionalesemocionales`, description `Proyecto Web Articulos Promocionales`, `lang="en"`, sin canonical detectado.

## 2. Component map

| Existing component | Current purpose | Keep | Refine | Replace | Remove | New required |
|---|---|---:|---:|---:|---:|---:|
| Header dentro de `Index.tsx` | Logo, acceso a catálogo y Mi solicitud | Logo, sticky behavior, Mi solicitud, routing | Navegación, jerarquía, copy, responsive | — | “Catálogo +10k” | `HomeHeader` o extracción equivalente; `MobileMenu` |
| Hero de `LandingView.tsx` | Claim, WhatsApp, catálogo y vitrina de productos | Routing a catálogo | — | Copy, layout, imagen y dos rutas | WhatsApp como CTA principal, badges y claims actuales | `HomeHero` |
| Search de `CatalogView.tsx` | Búsqueda V2 con URL y debounce | Sí, íntegro | Copy/SEO solo si el gate lo exige | — | Claim de inventario en tiempo real | No se requiere search nuevo en Home V1 |
| Categories de catálogo | Fuente real de categorías y filtros | Query/contrato, slugs, estados | Extraer/reutilizar acceso de datos sin duplicar lógica | — | — | `HomeCategories` con seis mappings reales |
| Vitrina/Featured products de Home | Últimos cuatro productos presentados como top/favoritos | Carga segura de imagen solo si se reutiliza fuera de Home | — | Por categorías visuales | Ranking/favoritos, stock numérico y preview denso en Home | — |
| Kits block de `LandingView.tsx` | Promesa de armado integral y formato kit | Nada del copy actual | — | Tres soluciones por ocasión | “Todo en uno”, armado, integración y ahorro logístico | `HomeSolutions` |
| Process block | Explica propuesta, anticipo, producción y envío | Estructura de tres pasos | Visual y responsive | Todo el copy | Claims de render, producción y entrega | `HomeProcess` o refactor focal |
| Guarantee block | Garantía cero riesgos | Nada | — | Señales verificables de confianza | Sección completa y promesa de reposición | `HomeTrust` |
| FAQ | No existe en Home | Primitive `Accordion` existente | — | — | — | `HomeFaq` |
| Final CTA | No existe como bloque | — | — | — | — | `HomeFinalCta` |
| Footer dentro de `Index.tsx` | Dirección, teléfono, correo y copyright | Estructura básica y enlaces tras verificar | Jerarquía, links legales, responsive | Copy/datos no verificados | Datos que no superen validación | `SiteFooter` extraído o refactor equivalente |
| Mobile navigation | No existe como menú estructurado | — | — | — | — | `MobileMenu` con `Sheet` existente |
| `AssistantWidget` | Brief conversacional y captura de lead | Backend/contrato de captura si se valida para Ruta B | Presentación, densidad y copy de éxito | Chat largo por brief mínimo o apertura contextual | “muy pronto” y competencia permanente de CTA | `ProjectBrief` o adaptador sobre contrato existente |
| WhatsApp directo | Contacto externo desde Hero/ficha | Puede sobrevivir como canal contextual si el propietario lo aprueba | Sacar de jerarquía primaria Home | — | CTA verde principal en Hero | Ninguno |
| Catalog cards | Descubrimiento de productos y acceso a ficha | Sí | Solo copy inseguro si aparece | — | — | — |
| Product detail | Producto, cantidad, variantes, Pricing V2 y selección | Contratos, estado y flujo | Auditar entrega fija y lenguaje de stock | — | “10 a 15 días” hasta verificar | — |
| Quote cart/request | Selección, pricing, contacto, preview y envío idempotente | Sí, protegido | Copy únicamente si se alinea a claims | — | — | — |

## 3. Reutilización obligatoria

### Conservar sin rediseño funcional

- query-param routing actual mientras no exista decisión de rutas nuevas;
- `CatalogView` y su búsqueda V2;
- carga de categorías y subcategorías reales;
- `MobileFiltersDrawer`;
- tarjetas de catálogo, paginación y estados vacíos/error;
- `ProductDetailView` como flujo funcional, salvo corrección de copy no verificado en checkpoint propio;
- selección y `QuoteCartView`;
- Pricing V2 y `get_public_product_price_quote`;
- estados `priced`, `request_quote`, `below_minimum` y `unavailable`;
- MOQ autoritativo;
- `SafeProductImage` y lightbox;
- validación de contacto, idempotencia y RPC de solicitud;
- CRM y cotización formal;
- primitives existentes: Button, Accordion, Sheet/Drawer, Input, Card, Skeleton y Toast;
- tokens Tailwind actuales como punto de migración, ajustados después a Design System V1.

### Reutilizar con adaptación

- `capture-assistant-lead` y su estructura de `CapturedData`, si el brief Ruta B puede mapearse sin cambiar Edge Function ni CRM.
- `AssistantPanel` únicamente como fuente de contrato y estados, no necesariamente como UI final.
- categorías reales del catálogo para construir la selección Home.
- manejo existente de estados de carga y error.
- Header/Footer del shell para evitar duplicar navegación entre vistas.

## 4. Contrato mínimo de integraciones Home

### Route A — Explorar catálogo

**Entrada:** CTA Hero, categoría o CTA final.  
**Destino:** `/?view=catalog`, preservando el mecanismo actual.  
**Categoría:** añadir `category=<slug-real>` cuando se entra desde una tarjeta.  
**No cambiar:** búsqueda, Pricing V2, MOQ, filtros, ficha o solicitud.

### Route B — Contar mi proyecto

**Entrada:** Header, Hero, Solution card o CTA final.  
**Destino recomendado:** brief estructurado V1, no WhatsApp como sistema principal de registro.

**Campos mínimos aprobados:**

- necesidad/objetivo;
- cantidad o “por definir”;
- fecha o “por definir”;
- nombre;
- empresa;
- un medio de contacto válido;
- consentimiento/privacidad.

**Contrato existente candidato:** `capture-assistant-lead`, que recibe `captured`, `summary`, `messages` y `visitor_id`.

**Gate técnico:** antes de Build, confirmar que un formulario breve puede usar ese contrato sin campos falsos, sin mensajes fabricados y sin cambios en Edge Function/CRM. Si no, documentar un subcheckpoint; no improvisar una segunda escritura.

### Trust/content data

El copy aprobado puede vivir inicialmente como configuración local tipada. No necesita nueva tabla ni CMS para V1. Categorías sí deben provenir de datos reales o de un mapping explícito a slugs reales.

## 5. Componentes nuevos mínimos

1. `HomeHero`
2. `HomeCategories`
3. `HomeSolutions`
4. `HomeProcess`
5. `HomeTrust`
6. `HomeFaq`
7. `HomeFinalCta`
8. `MobileMenu`
9. `ProjectBrief` solo si el panel existente no puede presentar Ruta B con la densidad aprobada

No se requiere crear un nuevo catálogo, buscador, PDP, carrito/solicitud, motor de precios, CRM ni backend.

## 6. Dependencias de Build

### Bloqueantes previos

- export desktop/mobile de la propuesta visual aprobada;
- logo actual en SVG;
- rojo oficial y fuente tipográfica/licencia;
- imágenes finales y derechos de uso;
- aprobación del `HOME_COPY_LOCK_V1`;
- cierre de claims utilizados;
- slugs exactos de las seis categorías Home;
- destino técnico de Ruta B;
- datos legales y de contacto del Footer;
- aviso de privacidad y consentimiento aplicable.

### No bloqueantes para maquetación, sí para publicación

- casos/testimonios futuros;
- claims de trayectoria;
- cobertura;
- facturación;
- muestras;
- política de entrega;
- campaña de fin de año.

## 7. Protecciones técnicas

Fuera de alcance y sin cambios incidentales:

- Pricing V2 y Pricing shadow;
- RLS;
- Supabase schema, migrations y configuración externa;
- Edge Functions;
- Auth;
- CRM contracts;
- sincronizadores y catálogo import;
- stock authority;
- provider integrations;
- emisión y comunicaciones;
- Super Agente QA/piloto;
- impresión/G4;
- deuda TypeScript baseline de 47 diagnósticos preexistentes.

El Build de Home debe ser frontal, reversible y compatible con el flujo público actual.

## 8. Riesgos

| Riesgo | Impacto | Protección |
|---|---|---|
| Ruta B carece de pantalla breve aprobada | Puede quedar como chat largo o WhatsApp | Auditar contrato `capture-assistant-lead` antes de construir UI |
| Categories Home duplican lógica | Slugs o nombres pueden divergir | Extraer fuente compartida o mapping tipado y probado |
| Copy inseguro permanece en catálogo/PDP/assistant | Contradicción tras renovar Home | Crear inventario de claims cross-surface y corregirlos en alcance explícito |
| Featured query se presenta como ranking | Claim falso | Eliminar preview o renombrar con autoridad real |
| Imágenes externas fallan o cambian | Home vacía/inconsistente | Assets aprobados propios y fallback accesible |
| SEO sigue genérico | Pérdida de descubrimiento y confianza | Actualizar meta, `lang`, canonical y compartir preview |
| Cambiar shell rompe catálogo/solicitud | Riesgo comercial P0 | Tests de navegación y regresión sobre query-param routing |
| Rediseño intenta corregir backend | Expansión de alcance | Protecciones técnicas y checkpoint separado |
| 47 diagnósticos TS baseline | Ruido de validación | Comparar contra baseline; no corregirlos aquí |
| Home visual aumenta peso | Rendimiento móvil deficiente | Responsive images, lazy loading y presupuesto de performance |

## 9. Orden recomendado de Build

1. **Preflight documental:** aprobar copy, claims, activos y slugs.
2. **Baseline funcional:** registrar rutas y tests actuales sin cambiar backend.
3. **Shell:** extraer/refinar Header, Footer y Mobile Menu.
4. **Hero:** implementar dirección visual, dos rutas y SEO principal.
5. **Categorías:** conectar seis cards a slugs reales.
6. **Soluciones:** implementar tres ocasiones y enlazar Ruta B.
7. **Proceso + confianza:** reemplazar claims inseguros por copy aprobado.
8. **FAQ + CTA final:** completar las siete zonas.
9. **Ruta B:** adaptar el brief al contrato existente, con consentimiento y estados.
10. **SEO técnico:** title, meta, `lang`, canonical y previews.
11. **Claims cross-surface:** retirar o aislar contradicciones en catálogo/PDP/assistant solo dentro de un alcance aprobado.
12. **QA + rollback:** validar y preparar retorno al componente Home previo.

No publicar por partes una Home que combine nuevo diseño con garantía, +10k, stock en vivo o entrega puntual.

## 10. QA requerido

### Funcional

- Header/Home/Catálogo/PDP/Mi solicitud funcionan con el routing actual.
- CTA A abre catálogo.
- Cada categoría abre el slug correcto.
- CTA B abre el brief correcto y no WhatsApp por defecto.
- Route B registra una sola solicitud con estado de éxito/error claro.
- Volver atrás y recargar preservan un estado razonable.
- Búsqueda, filtros, paginación, ficha y solicitud no regresan.
- Pricing mantiene autoridad server-side y sus cuatro estados.
- MOQ y bloqueos permanecen intactos.

### Content/claims

- No aparecen `+10k`, stock en vivo, inventario en tiempo real, render, minutos, garantía, reposición, entrega puntual o producción garantizada.
- Un solo H1.
- Copy coincide exactamente con `HOME_COPY_LOCK_V1`.
- Todo dato de contacto/legal está verificado.
- Ninguna categoría visible carece de destino real.

### Responsive

- QA mínima en 390, 768, 1024 y 1440 px.
- Dos rutas visibles en Hero mobile.
- Sin overflow horizontal.
- Menú mobile accesible y sin bottom navigation.
- Cards no dependen de hover.
- Imágenes mantienen producto/contexto con recortes aprobados.

### Accesibilidad

- WCAG AA de contraste.
- Navegación completa por teclado.
- Focus visible y retorno de foco del menú/FAQ.
- Targets táctiles de al menos 44 × 44 px.
- Headings en orden.
- Alt text útil.
- Estados de carga/error anunciados.
- `prefers-reduced-motion` respetado.

### Performance

- Hero optimizado y con dimensiones reservadas.
- Imágenes responsivas AVIF/WebP cuando proceda.
- Lazy loading debajo del fold.
- Sin carruseles ni librerías nuevas innecesarias.
- Medir Core Web Vitals en mobile antes de Publish.

### SEO

- Title y description aprobados.
- `html lang="es-MX"`.
- canonical correcto.
- Open Graph sin claims no aprobados.
- sitemap/robots revisados sin exponer rutas QA.

## 11. Rollback y control de alcance

- Mantener el componente Home anterior recuperable durante el checkpoint de Build.
- No mezclar migraciones, Edge Functions o cambios de contratos en el mismo cierre.
- El rollback debe restaurar solo la presentación Home/shell, sin tocar catálogo, Pricing o CRM.
- Si Ruta B requiere backend nuevo, detener el Build y abrir una decisión técnica explícita.
- No publicar hasta que Home, catálogo y solicitud pasen QA conjunto desktop/mobile.

## 12. Definition of ready

El Build puede iniciar cuando:

1. el propietario apruebe el copy;
2. los claims publicados estén en `APPROVED`;
3. los seis slugs Home estén confirmados;
4. Ruta B tenga destino y contrato definidos;
5. activos visuales y legales estén disponibles;
6. el alcance excluya explícitamente backend protegido;
7. QA y rollback formen parte del checkpoint.

**HOME BUILD MAP V1 — READY FOR OWNER REVIEW**
