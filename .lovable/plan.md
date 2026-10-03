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

| Nombre visible | Slug | Activa | Productos públicos | Subcategorías con productos |
|---|---|---|---|---|
| Bebidas, termos y vasos | bebidas-termos-vasos | sí | 194 | termos 118, botellas 44, vasos 19, tazas 7, … |
| Libretas y cuadernos | libretas-cuadernos | sí | 132 | libretas 81, blocks 26, papelería eco 16, agendas 8 |
| Ropa promocional | textiles-ropa | sí | 10 | camisas 6, chamarras 2, playeras 1, mandiles 1 |
| Gorras y headwear | gorras-accesorios | sí | 9 | gorras 6, bucket hats 3 |
| Bolsas, mochilas y viaje | bolsas-mochilas-viaje | sí | 148 | mochilas 55, hieleras 31, cangureras 18, … |
| Tecnología | tecnologia | sí | 72 | audífonos 28, power banks 26, soportes 10, … (bocinas inactiva) |
| Premios y regalos ejecutivos | premios-regalos-ejecutivos | sí | **0** | premios-reconocimientos, regalos-premium, sets-ejecutivos: todas vacías |

Otras activas no usadas por Home: Bolígrafos, Escritura, Oficina y escritorio, Hogar, Herramientas, Salud, Outdoor, Llaveros. Inactivas: Eventos, Alimentos, Niños.

## 4. Mapeo de las 6 cards

| Card Home | Destino real | Query | Tipo | Confianza | Problema | Acción B2 |
|---|---|---|---|---|---|---|
| Termos y vasos | Bebidas, termos y vasos | category=bebidas-termos-vasos | DIRECT | Alta | Nombre visible distinto | Enlazar a la categoría |
| Libretas | Libretas y cuadernos | category=libretas-cuadernos | DIRECT | Alta | — | Enlazar a la categoría |
| Ropa promocional | Ropa promocional | category=textiles-ropa | DIRECT | Media | Solo 10 productos; gorras viven aparte | Enlazar; reportar oferta delgada |
| Bolsas y mochilas | Bolsas, mochilas y viaje | category=bolsas-mochilas-viaje | DIRECT | Alta | — | Enlazar a la categoría |
| Tecnología | Tecnología | category=tecnologia | DIRECT | Alta | — | Enlazar a la categoría |
| Regalos ejecutivos | Premios y regalos ejecutivos | category=premios-regalos-ejecutivos | NO VALID MATCH (hoy) | Alta | Existe pero con 0 productos públicos → resultado vacío | Decisión del propietario (punto 5) |

Slugs: confirmados en runtime, no inventados. B2 los resolverá contra `product_categories` en tiempo de carga; si un slug no existe o no está activo, la card no se vuelve enlace muerto (cae a "Ver todo el catálogo").

## 5. Regalos ejecutivos — decisión requerida
Evidencia: categoría y 3 subcategorías existen y están activas, pero tienen 0 productos visibles. No se crea ni se modifica nada.

- A. Mapear a otra categoría existente: no hay una equivalente; forzaría un mapeo falso.
- B. Mapear a una subcategoría existente: `maletines-portafolios` (3 productos) es la más cercana a BL304, pero es pobre y cambia el sentido de la card.
- C. Card conceptual con búsqueda válida (ej. `q=ejecutivo`): no garantiza resultados relevantes; depende del buscador.
- D. Diferir la card (recomendada): evita una página vacía; se activa cuando la categoría tenga productos promovidos. B2 construiría 5 cards + "Ver todo el catálogo", o mostraría la sexta sin enlace hasta habilitarla.

## 6. SKU visuales
Los 6 existen en el catálogo crudo de ForPromotional pero **no están promovidos al catálogo público** (sin producto público, sin categoría asignada).

| SKU | Nombre real | Categoría proveedor | Fotos proveedor | Estado |
|---|---|---|---|---|
| T 150 | MOSCATO | BEBIDAS / TERMOS | 1 | FOUND / NOT PUBLIC |
| O 090 | PRADA | OFICINA / LIBRETAS | 2 | FOUND / NOT PUBLIC |
| CH 002 | ARONA | TEXTIL / CHAMARRAS Y CHALECOS | 12 | FOUND / NOT PUBLIC |
| BL 163 | NOMAD | TEXTIL / MOCHILAS | 3 | FOUND / NOT PUBLIC |
| SO 019 | FEST | TECNOLOGÍA / BOCINAS | 1 | FOUND / NOT PUBLIC (bocinas inactiva en PE) |
| BL 304 | JOBS | TEXTIL / PORTAFOLIOS | 1 | FOUND / NOT PUBLIC |

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
