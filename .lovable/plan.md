# CHK-BRAND-WEB-B1-VALIDATION-V1 — Resultado de la validación (solo inspección)

No se modificó código, no se crearon commits, no hubo push ni publicación. Las pruebas se corrieron en una copia temporal fuera del proyecto y contra la vista previa local.

## Resultado

| Punto | Resultado |
|---|---|
| CURRENT HEAD | bbc0e3b96a4a9be84654a7cedfea2dd15c236278 ("Añadió cabecera y hero a portada") |
| ORIGIN MAIN | bbc0e3b96a4a9be84654a7cedfea2dd15c236278 |
| DIVERGENCE | 0 / 0 |
| WORKING TREE | limpio (rama temporal edit/edt-b11b8fe3…) |
| Orden de commits | 9f56653 → 04ea659a6844b674a34276fe458eb2623973d389 (crea HomeHeader y HomeHero) → 4bcbd476e3e6fdf021a0687ee3591f2c41f5ee0c (Index y LandingView) → bbc0e3b (squash con el mismo contenido) |
| B1 FILES | Index.tsx +27/−33; LandingView.tsx +3/−125; home/HomeHeader.tsx +82; home/HomeHero.tsx +77 |
| UNEXPECTED FILES | NO |
| HEADER | PASS: logo conservado; logo vuelve a la portada; Catálogo abre categorías; Cómo funciona va a #proceso; Soluciones y Nosotros no aparecen (sin enlaces muertos); Mi solicitud abre /?view=cart; menú móvil abre y funciona; Tab enfoca primero el logo, con anillo de enfoque del navegador; sin barra inferior. Contador: lógica sin cambios (quoteCart.length), no probado con artículos agregados |
| HERO COPY | PASS: los 8 textos coinciden carácter por carácter con HOME_COPY_LOCK_V1; desktop y móvil cada uno en su tamaño |
| ROUTE A | PASS: abre /?view=catalog&choose=categories, carga el catálogo y muestra las categorías (en móvil, en el panel de filtros); sin errores; CatalogView sin cambios; solo lecturas |
| ROUTE B | PASS: visible y del mismo tamaño que la Ruta A; desactivada; al tocarla: 0 peticiones POST, 0 ventanas abiertas, la URL no cambia; el lector de pantalla anuncia "Esta opción aún no está disponible." |
| HERO SLOT | PASS: no hay ruta T150; sin asset nuevo; recuadro gris neutro sin texto; se reemplaza pasando la URL de la imagen; sin dependencias nuevas |
| RESPONSIVE | PASS en 390, 768, 1024 y 1440 px: sin desborde lateral; botones de 44–76 px; ambas rutas visibles; sin superposiciones. Observación: en 390 px "Cómo funciona" deja el título de #proceso unos 105 px debajo de la cabecera fija (detalle cosmético, no bloqueante) |
| CLAIMS B1 | PASS: 0 coincidencias en las áreas de B1 |
| LEGACY CLAIM OUTSIDE B1 | "favoritos de nuestros clientes" en Productos destacados: KNOWN LEGACY CLAIM — OUTSIDE B1 — REMOVE BEFORE PUBLICATION |
| TYPECHECK CURRENT | 47 errores: agent-attachments.ts 23, pricing-conversion-shadow.test.ts 8, agent-state.test.ts 6, agent-attachments.test.ts 5, agent-quote.test.ts 3, agent-crm.test.ts 2 |
| B1 NEW TYPE ERRORS | 0. Se comprobó con el código de 9f56653: también 47 errores, lista idéntica línea por línea. 0 errores en los cuatro archivos de B1 |
| BUILD | PASS (vite build en carpeta temporal) |
| LINT | 1 error PREEXISTING: `any` en LandingView.tsx (antes en la línea 80, ahora en la 81; ya existía en 9f56653) |
| TESTS | 204/205. **B1-RELATED FAILURE:** src/test/frontend-sprint1-contract.test.ts, "no usa ShoppingCart y muestra Mi solicitud". Busca el texto "Mi solicitud" dentro de Index.tsx; B1 lo movió a HomeHeader.tsx. En 9f56653 ese test pasa (8/8). El botón sí funciona en la vista previa; falla el contrato estático, no el comportamiento |
| git diff --check | PASS |
| PROTECTED SURFACES | PASS: el diff no toca catálogo, ficha de producto, Mi solicitud, precios, CRM, agente, asistente, base de datos, funciones del servidor, WhatsApp ni datos |

**OPEN GATES:** HERO FINAL ASSET, PUBLICATION RIGHTS, SKU/TAXONOMY RUNTIME VALIDATION, ROUTE B FUNCTIONAL CONTRACT, D-013 / CHK-BRAND-WEB-1, KNOWN LEGACY CLAIMS BELOW B1 (= OPEN FOR LATER HOME PHASE).

**FINAL: CHK-BRAND-WEB-B1-VALIDATION-V1 — BLOCKED** [1 test B1-related falla: frontend-sprint1-contract.test.ts espera "Mi solicitud" en Index.tsx, que B1 movió a HomeHeader.tsx]

## Corrección propuesta (requiere un checkpoint BUILD aparte)

Elegir una opción:

- **A (recomendada):** actualizar el test para que busque "Mi solicitud" en src/components/home/HomeHeader.tsx y conserve la verificación de que Index.tsx no usa ShoppingCart. Es un solo archivo de test y no cambia ningún comportamiento.
- **B:** dejar el código como está y aceptar la falla como deuda documentada (no recomendado).

Opcional, también fuera de esta validación: dar a #proceso un margen de desplazamiento igual a la altura de la cabecera, para que "Cómo funciona" no deje el título tapado en móvil.

Después de la corrección: repetir vitest (esperado 205/205) y la revisión de errores de código (esperado 47, sin cambios).
