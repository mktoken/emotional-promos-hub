# CHK-BRAND-WEB-B3-VALIDATION-V1 — BLOCKED

**Motivo:** en el celular (390 px), al tocar "Soluciones" en el menú estando ya en Home, el título "Promocionales para cada ocasión" queda tapado bajo la barra superior. El título queda 5 px por encima del borde de la pantalla, y la barra mide 80 px. Esto falla el requisito "sin superposición con header". La causa: el menú móvil se cierra en el mismo clic y la página se acomoda después de calcular el salto.

## Resultados

- GIT: HEAD = origin/main = 4a0b6e5a793d7f1dafdeb4f3fbe750ef2a442ff0; divergencia 0/0; working tree limpio; 0 commits exclusivos de la rama. Commits posteriores a 62b63d5: f601f0e "Changes" y 4a0b6e5 "Update plan" (Lovable; solo `.lovable/plan.md`). Commits B3 automáticos: 39e2578, 9382cc2, fff9fa9, f630062, 62b63d5. LOVABLE TEMP BRANCH — ACCEPTED FOR VALIDATION.
- DIFF AUDIT: solo HomeSolutions.tsx, LandingView.tsx, HomeHeader.tsx e Index.tsx, todos EXPECTED. UNEXPECTED: ninguno.
- INDEX.TSX: solo cambia la navegación a secciones. Route A, carrito, ficha de producto, catálogo y estado guardado quedan igual. No hay escrituras: los POST observados son lecturas de catálogo, iguales que antes. La URL se mantiene estable y no hay bucles. "Cómo funciona" llega a #proceso desde catálogo, ficha de producto y carrito, en computadora y celular. INDEX SHARED NAV HELPER: ACCEPTED — BEHAVIOR-PRESERVING.
- COPY: PASS (carácter por carácter). NUMBER OF CTAS = 1.
- CTA ROUTE B: PASS. Visible, desactivado, 0 peticiones, 0 popups, la URL no cambia; el lector anuncia "Esta opción aún no está disponible."
- HOME ORDER: PASS. Hero → Categorías → Soluciones → Cómo funciona, sin duplicados.
- KITS: PASS. Las 5 frases y sus equivalentes desaparecieron.
- HEADER SOLUCIONES: PASS desde catálogo, ficha de producto y carrito (computadora y celular) y desde Home en computadora. No existe /soluciones. **FAIL en Home con el menú del celular** (el título queda tapado). A 1280–1440 px la sección queda unos 56 px más abajo por el límite natural del scroll: COSMETIC / NON-BLOCKING.
- Observación previa a B3: "Cómo funciona" desde Home con el menú del celular también queda bajo la barra (−127 px). Ese salto no cambió en B3.
- RESPONSIVE: PASS. 1 columna a 390 px, 3 desde 768 px, sin desborde, botón de 52 px. El foco con teclado sigue el orden Catálogo → Soluciones → Cómo funciona → Mi solicitud.
- VISUALS: PASS. Sin imágenes, SKU, URLs de proveedor ni insignias. PUBLICATION RIGHTS sigue OPEN.
- VITEST: 205/205 (22 archivos). BUILD: PASS. TYPECHECK: 47 errores en los mismos 6 archivos; B3 NEW TYPE ERRORS = 0. LINT: PASS en los 4 archivos. git diff --check: PASS.
- PROTECTED SURFACES: PASS, sin cambios.

## Corrección propuesta (requiere un checkpoint BUILD aparte)

En el salto dentro de Home, desplazar la página después de que el menú móvil termine de cerrarse (en el siguiente cuadro de pantalla) en lugar de hacerlo en el mismo clic. Así se corrige también la observación previa de "Cómo funciona". El cambio quedaría solo en Index.tsx o HomeHeader.tsx. Gates OPEN: HERO FINAL ASSET, PUBLICATION RIGHTS, ROUTE B FUNCTIONAL CONTRACT, REGALOS EJECUTIVOS PUBLIC INVENTORY, D-013 / CHK-BRAND-WEB-1.
