# CHK-BRAND-WEB-B2-PLAN-V1 — Categorías + validación de taxonomía real

Modo: plan / solo inspección. No se modificó nada (solo lecturas de base de datos y una consulta pública de conteos como visitante).

## 1. Git preflight — PASS

- Rama de trabajo de Lovable (equivale a main), HEAD `a5865d7bc91e546d24266101e2e00bd81d3b6bc5`.
- GitHub `refs/heads/main` = `a5865d7…` (verificado con ls-remote). Divergencia real 0/0. Working tree limpio.
- Nota: la referencia local `origin/main` está desactualizada (`4294d00`); no se hizo fetch para no cambiar estado.

## 2. Fuente de la taxonomía

- Categorías: tabla `product_categories` (`name`, `slug`, `sort_order`, `is_active`). CatalogView las lee filtrando `is_active = true`, ordenadas por `sort_order` y nombre.
- Subcategorías: RPC `get_catalog_subcategories_with_counts(p_category_slug)` → `subcategory_slug`, `subcategory_name`, `product_count` (conteo público real).
- Productos: RPC `catalog_search_products_v2` con `p_category_slug`, `p_subcategory_slug`, búsqueda, colección eco y página.
- URL: `/?view=catalog&category=<slug>&subcategory=<slug>&q=…&page=…`. `choose=categories` abre el selector.

## 3. Categorías públicas relevantes (conteo público vía RPC)


| Nombre visible               | Slug                       | Activa | Productos públicos | Subcategorías con productos                                             |
| ---------------------------- | -------------------------- | ------ | ------------------ | ----------------------------------------------------------------------- |
| Bebidas, termos y vasos      | bebidas-termos-vasos       | sí     | 194                | termos 118, botellas 44, vasos 19, tazas 7, …                           |
| Libretas y cuadernos         | libretas-cuadernos         | sí     | 132                | libretas 81, blocks 26, papelería eco 16, agendas 8                     |
| Ropa promocional             | textiles-ropa              | sí     | 10                 | camisas 6, chamarras 2, playeras 1, mandiles 1                          |
| Gorras y headwear            | gorras-accesorios          | sí     | 9                  | gorras 6, bucket hats 3                                                 |
| Bolsas, mochilas y viaje     | bolsas-mochilas-viaje      | sí     | 148                | mochilas 55, hieleras 31, cangureras 18, …                              |
| Tecnología                   | tecnologia                 | sí     | 72                 | audífonos 28, power banks 26, soportes 10, … (bocinas inactiva)         |
| Premios y regalos ejecutivos | premios-regalos-ejecutivos | sí     | **0**              | premios-reconocimientos, regalos-premium, sets-ejecutivos: todas vacías |


Otras activas no usadas por Home: Bolígrafos, Escritura, Oficina y escritorio, Hogar, Herramientas, Salud, Outdoor, Llaveros. Inactivas: Eventos, Alimentos, Niños.

## 4. Mapeo de las 6 cards


| Card Home          | Destino real                 | Query                               | Tipo                 | Confianza | Problema                                               | Acción B2                          |
| ------------------ | ---------------------------- | ----------------------------------- | -------------------- | --------- | ------------------------------------------------------ | ---------------------------------- |
| Termos y vasos     | Bebidas, termos y vasos      | category=bebidas-termos-vasos       | DIRECT               | Alta      | Nombre visible distinto                                | Enlazar a la categoría             |
| Libretas           | Libretas y cuadernos         | category=libretas-cuadernos         | DIRECT               | Alta      | —                                                      | Enlazar a la categoría             |
| Ropa promocional   | Ropa promocional             | category=textiles-ropa              | DIRECT               | Media     | Solo 10 productos; gorras viven aparte                 | Enlazar; reportar oferta delgada   |
| Bolsas y mochilas  | Bolsas, mochilas y viaje     | category=bolsas-mochilas-viaje      | DIRECT               | Alta      | —                                                      | Enlazar a la categoría             |
| Tecnología         | Tecnología                   | category=tecnologia                 | DIRECT               | Alta      | —                                                      | Enlazar a la categoría             |
| Regalos ejecutivos | Premios y regalos ejecutivos | category=premios-regalos-ejecutivos | NO VALID MATCH (hoy) | Alta      | Existe pero con 0 productos públicos → resultado vacío | Decisión del propietario (punto 5) |


Slugs: confirmados en runtime, no inventados. B2 los resolverá contra `product_categories` en tiempo de carga; si un slug no existe o no está activo, la card no se vuelve enlace muerto (cae a "Ver todo el catálogo").

## 5. Regalos ejecutivos — decisión requerida

Evidencia: categoría y 3 subcategorías existen y están activas, pero tienen 0 productos visibles. No se crea ni se modifica nada.

- A. Mapear a otra categoría existente: no hay una equivalente; forzaría un mapeo falso.
- B. Mapear a una subcategoría existente: `maletines-portafolios` (3 productos) es la más cercana a BL304, pero es pobre y cambia el sentido de la card.
- C. Card conceptual con búsqueda válida (ej. `q=ejecutivo`): no garantiza resultados relevantes; depende del buscador.
- D. Diferir la card (recomendada): evita una página vacía; se activa cuando la categoría tenga productos promovidos. B2 construiría 5 cards + "Ver todo el catálogo", o mostraría la sexta sin enlace hasta habilitarla.

## 6. SKU visuales

Los 6 existen en el catálogo crudo de ForPromotional pero **no están promovidos al catálogo público** (sin producto público, sin categoría asignada).


| SKU    | Nombre real | Categoría proveedor           | Fotos proveedor | Estado                                      |
| ------ | ----------- | ----------------------------- | --------------- | ------------------------------------------- |
| T 150  | MOSCATO     | BEBIDAS / TERMOS              | 1               | FOUND / NOT PUBLIC                          |
| O 090  | PRADA       | OFICINA / LIBRETAS            | 2               | FOUND / NOT PUBLIC                          |
| CH 002 | ARONA       | TEXTIL / CHAMARRAS Y CHALECOS | 12              | FOUND / NOT PUBLIC                          |
| BL 163 | NOMAD       | TEXTIL / MOCHILAS             | 3               | FOUND / NOT PUBLIC                          |
| SO 019 | FEST        | TECNOLOGÍA / BOCINAS          | 1               | FOUND / NOT PUBLIC (bocinas inactiva en PE) |
| BL 304 | JOBS        | TEXTIL / PORTAFOLIOS          | 1               | FOUND / NOT PUBLIC                          |


Las imágenes sirven solo como representación visual de la card; la card enlaza a la categoría, nunca al SKU.

## 7. Visuales

Opciones: URL remota del proveedor (existe, pero derechos de publicación OPEN), asset local (requiere staging aprobado), placeholder. Recomendado para B2: slot de imagen reemplazable por card con placeholder neutro (mismo patrón del Hero); sin descargar ni mover assets.

## 8. Claims legacy

- `src/components/LandingView.tsx:118-119`: sección "Productos destacados" con "Algunos de los favoritos de nuestros clientes corporativos." (líneas 114-187). Esta es la sección que B2 reemplaza.

## 9. Archivos previstos para B2

- Nuevo: `src/components/home/HomeCategories.tsx`.
- Modificar: `src/components/LandingView.tsx` (sustituir la sección 114-187).
- Posible: `src/pages/Index.tsx` solo si la navegación por categoría requiere un callback nuevo.
- CatalogView: no se toca (ya acepta `category=`).

## 10. Alcance B2

H2 "Encuentra lo que necesitas", 6 cards con el copy exacto, targets por slug runtime con respaldo, CTA "Ver todo el catálogo" → `/?view=catalog&choose=categories`, slots de imagen con placeholder, retiro del claim legacy solo dentro de la sección reemplazada.

## 11. Fuera de alcance

Soluciones, Cómo funciona final, Trust, FAQ, CTA final, Ruta B, CRM, backend, base de datos, SEO, analítica, ProductDetailView, QuoteCartView, Pricing V2, asistente, WhatsApp, promoción de SKU.

## 12. Móvil

390: 2 columnas; 768: 3; 1024 y 1440: 3 (o 6 en una fila a 1440 si cabe). Sin carrusel. Card completa clicable ≥44px, etiqueta siempre visible, imagen en proporción fija con object-contain sobre fondo blanco.

## 13. Riesgos

- Regalos ejecutivos vacía (bloquea esa card hasta decisión).
- Ropa promocional con solo 10 productos.
- SKU de referencia no públicos y derechos OPEN: no usarlos en producción.
- Nombres de card distintos a los nombres del catálogo (aceptado por copy lock; reportado).

## 14. Plan de validación

Diff limitado a los archivos previstos; copy carácter por carácter; cada card abre la categoría correcta con resultados; respaldo sin enlaces muertos; responsive en 390/768/1024/1440; teclado/focus; vitest y typecheck sin errores nuevos (los 47 preexistentes iguales); claim legacy ausente.

## Veredicto

CHK-BRAND-WEB-B2-PLAN-V1 — READY FOR BUILD REVIEW, condicionado a una decisión del propietario sobre "Regalos ejecutivos" (recomendada D: diferir). Cinco cards tienen destino directo confirmado.  
  
PE — CHK-BRAND-WEB-B2-BUILD-V1

HOME CATEGORIES

MODO:

BUILD CONTROLADO

AUTORIZADO A MODIFICAR ÚNICAMENTE EL ALCANCE B2.

NO PUBLICAR.

NO SUPABASE WRITES.

NO MIGRATIONS.

NO EDGE FUNCTIONS.

NO MODIFICAR TAXONOMÍA.

NO PROMOVER PRODUCTOS.

NO MODIFICAR CATALOGVIEW.

NO CRM.

NO PRICING.

NO ROUTE B.

==========================================================

SPECIALIST PRE-FLIGHT

==========================================================

Aplicar gobernanza vigente.

Invocar / considerar:

$pe-specialist-orchestrator

LEAD:

$pe-ux-cro-architect

SUPPORT:

$pe-visual-image-director

$pe-brand-strategist

$pe-evidence-claims

No depender de recordatorios del propietario.

==========================================================

OWNER DECISION — REGALOS EJECUTIVOS

==========================================================

Decisión aprobada:

OPTION D — DEFER

Evidencia runtime:

category:

Premios y regalos ejecutivos

slug:

premios-regalos-ejecutivos

status:

active

public product count:

0

Por lo tanto:

NO mostrar actualmente la card

"Regalos ejecutivos" en Home.

NO mapearla a otra categoría.

NO mapearla a maletines-portafolios.

NO usar búsqueda q=ejecutivo.

NO mostrar card desactivada.

NO crear productos.

NO modificar taxonomía.

Registrar como:

HOME CATEGORY DEFERRED UNTIL PUBLIC INVENTORY EXISTS

La etiqueta "Regalos ejecutivos" permanece aprobada

conceptualmente para futura activación.

==========================================================

GIT PREFLIGHT

==========================================================

Confirmar baseline actual antes de modificar:

branch

HEAD

origin/main

divergence

working tree

Baseline canónico esperado:

a5865d7bc91e546d24266101e2e00bd81d3b6bc5

IMPORTANTE:

Lovable puede haber generado metadata/plan commits posteriores.

Si HEAD difiere únicamente por .lovable/:

auditar y reportar antes de continuar.

Si existen cambios funcionales inesperados:

DETENERSE.

==========================================================

B2 BUILD

==========================================================

Construir sección:

Encuentra lo que necesitas

Mostrar 5 cards:

1. Termos y vasos

2. Libretas

3. Ropa promocional

4. Bolsas y mochilas

5. Tecnología

CTA:

Ver todo el catálogo

==========================================================

DESTINOS CONFIRMADOS

==========================================================

Termos y vasos:

/?view=catalog&category=bebidas-termos-vasos

Libretas:

/?view=catalog&category=libretas-cuadernos

Ropa promocional:

/?view=catalog&category=textiles-ropa

Bolsas y mochilas:

/?view=catalog&category=bolsas-mochilas-viaje

Tecnología:

/?view=catalog&category=tecnologia

CTA Ver todo el catálogo:

/?view=catalog&choose=categories

No inventar otros slugs.

==========================================================

RUNTIME SAFETY

==========================================================

Preferir resolver/validar las categorías contra

product_categories disponibles en runtime.

Si una categoría esperada no existe o deja de estar activa:

NO generar enlace muerto.

Fallback:

Ver todo el catálogo.

No modificar product_categories.

==========================================================

COPY

==========================================================

Usar exactamente:

H2:

Encuentra lo que necesitas

Cards:

Termos y vasos

Libretas

Ropa promocional

Bolsas y mochilas

Tecnología

CTA:

Ver todo el catálogo

No añadir subtítulos de marketing no aprobados.

==========================================================

VISUALES

==========================================================

Los SKU visuales:

T150

O090

CH002

BL163

SO019

NO son productos públicos actualmente.

PUBLICATION RIGHTS = OPEN.

Por tanto:

NO descargar imágenes del proveedor.

NO usar URLs remotas de ForPromotional.

NO incorporar assets no aprobados.

Cada card debe tener:

- slot de imagen reemplazable;

- placeholder neutro consistente;

- proporción fija;

- layout preparado para sustituir imagen después.

No hacer que el placeholder parezca un producto real.

==========================================================

REEMPLAZAR SECCIÓN LEGACY

==========================================================

Reemplazar únicamente la sección actual:

Productos destacados

que contiene el claim:

"Algunos de los favoritos de nuestros clientes corporativos."

Ese claim debe desaparecer porque la sección completa

será sustituida por HomeCategories.

No modificar otros bloques legacy todavía.

==========================================================

ARCHIVOS AUTORIZADOS

==========================================================

Crear:

src/components/home/HomeCategories.tsx

Modificar:

src/components/LandingView.tsx

Index.tsx:

NO modificar salvo que sea estrictamente necesario para

routing existente.

CatalogView:

NO modificar.

Si Index.tsx requiere cambio:

explicar antes de hacerlo y limitarlo al callback/routing B2.

==========================================================

DISEÑO

==========================================================

Dirección visual:

- B2B comercial

- limpia

- premium accesible

- fondo claro

- charcoal

- rojo PE como acento

- baja densidad

- sin estilo marketplace

- sin badges innecesarios

Cards:

- label visible siempre;

- card completa clicable;

- focus visible;

- mínimo 44 px;

- imagen/placeholder consistente;

- no carrusel.

==========================================================

RESPONSIVE

==========================================================

Validar:

390 px:

2 columnas

768 px:

3 columnas

1024 px:

3 columnas

1440 px:

3 columnas o distribución equilibrada de 5 cards

IMPORTANTE:

No forzar 6 columnas ni una composición artificial solo

porque originalmente existían 6 categorías previstas.

La grilla debe verse intencional con 5 cards.

Sin overflow horizontal.

==========================================================

ROPA PROMOCIONAL

==========================================================

La categoría tiene solo 10 productos públicos.

Esto NO bloquea B2.

No añadir claims de amplitud de surtido.

No mezclar automáticamente Gorras y headwear.

==========================================================

PROTECTED SURFACES

==========================================================

NO tocar:

ProductDetailView

QuoteCartView

Pricing V2

CRM

Super Agent

AssistantPanel

Supabase

Edge Functions

Auth

RLS

Storage

WhatsApp

REV

taxonomía

datos persistidos

promoción de productos

==========================================================

VALIDACIÓN

==========================================================

Al terminar:

git diff --check

vitest completo

build

typecheck

Esperado:

205/205 tests o explicar cualquier cambio de suite.

TypeScript:

47 errores preexistentes

0 errores nuevos B2

Validar en runtime:

- cada una de las 5 cards abre categoría con resultados;

- CTA abre selector completo;

- ninguna card abre resultados vacíos;

- Regalos ejecutivos no aparece;

- claim "favoritos de nuestros clientes corporativos"

  desapareció de la sección reemplazada;

- CatalogView sin cambios;

- sin enlaces muertos.

Responsive:

390

768

1024

1440

==========================================================

NO PUBLICAR

==========================================================

Mantener OPEN:

HERO FINAL ASSET

PUBLICATION RIGHTS

ROUTE B FUNCTIONAL CONTRACT

REGALOS EJECUTIVOS PUBLIC INVENTORY

D-013 / CHK-BRAND-WEB-1

SKU/TAXONOMY RUNTIME VALIDATION:

puede cerrarse SOLO para las 5 categorías validadas en B2.

No declarar Brand/Web completo.

==========================================================

ENTREGAR

==========================================================

BASELINE:

FILES MODIFIED:

FILES CREATED:

CATEGORY CARDS:

ROUTES:

REGALOS EJECUTIVOS:

LEGACY CLAIM REMOVED:

VISUAL SLOT:

RESPONSIVE:

VITEST:

BUILD:

TYPECHECK:

B2 NEW TYPE ERRORS:

PROTECTED SURFACES:

GIT DIFF:

NO hacer push manual si Lovable sincroniza automáticamente.

NO publicar producción.

FINAL:

CHK-BRAND-WEB-B2-BUILD-V1 — READY FOR VALIDATION

o

CHK-BRAND-WEB-B2-BUILD-V1 — BLOCKED

[razón exacta]

&nbsp;