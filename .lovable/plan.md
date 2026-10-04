# CHK-BRAND-WEB-B3-VALIDATION-V1 — Plan de validación (solo inspección)

Sin cambios de código, commits, push, publicación ni backend. Solo lectura y pruebas.

## Hallazgos previos (ya verificados en solo lectura)

- HEAD = origin/main = 62b63d50f1a03a6755baca0bb92c7dd029f1d985; divergencia 0/0; working tree limpio.
- La rama actual se llama `edit/edt-d3168771-…`, no `main`: hay que reportarlo.
- Commits B3 desde 8455ebe: 39e2578, 9382cc2, fff9fa9, f630062 ("Changes", automáticos de Lovable) y 62b63d5 ("Added Solutions handler").
- Diff B3: solo los 4 archivos esperados (HomeSolutions +51, LandingView +2/−51, HomeHeader +8/−1, Index +29/−9). No hay archivos inesperados.
- **Riesgo en Index.tsx (decisión requerida):** el cambio crea una función compartida `goToSection`. Así, "Cómo funciona" desde vistas que no son Home ahora usa el mismo mecanismo (espera 400/1200 ms en vez de 120 ms). Es una mejora del salto, pero toca algo más que `#soluciones`. Según el punto 3, eso puede dar BLOCKED. Lo propongo como **SCOPE NOTE – behavior-preserving**, siempre que el runtime confirme que "Cómo funciona" sigue llegando a `#proceso`. El propietario decide.
- No se tocan Route A, el carrito, la ficha de producto, el catálogo ni el estado guardado, y no hay escrituras. Se sale del bucle porque `pendingSection` se limpia antes de desplazar la página.

## Pasos de ejecución

1. Git: `git log --oneline -8`, con la clasificación EXPECTED/UNEXPECTED de cada commit.
2. Index.tsx: revisar el diff línea por línea según los 8 criterios del punto 3.
3. Copy: comparar carácter por carácter el texto de HomeSolutions.tsx con la orden y contar los botones (debe haber 1).
4. Botón "Contar mi proyecto": confirmar con Playwright que está visible y desactivado. Hay que medir que el clic produce 0 peticiones, 0 popups y que la URL no cambia. También leer el texto de `aria-describedby`.
5. Orden de la portada: leer los h2 en el DOM; debe quedar Hero → Categorías → Soluciones → Cómo funciona, sin repeticiones.
6. Kits: buscar con `rg` en `src/` y en el DOM las 5 frases, más equivalentes ("kit", "un solo proveedor", "armamos").
7. Header: probar "Soluciones" en Home (computadora y celular), catálogo, ficha de producto y carrito. Repetir con "Cómo funciona" para descartar regresiones. Confirmar que no existe /soluciones y que no hay bucles. Registrar la diferencia de 1440 px como COSMETIC / NON-BLOCKING si se confirma.
8. Responsive y accesibilidad a 390, 768, 1024 y 1440 px: número de columnas, desborde, foco con Tab, botón de al menos 44 px y que nada quede tapado por la cabecera.
9. Visual: confirmar que no hay `<img>`, SKU, URLs de proveedor ni insignias.
10. Vitest completo (se esperan 205/205).
11. Build (`vite build`) y typecheck por separado. En el typecheck se esperan 47 errores en los mismos 6 archivos, con 0 en los 4 archivos de B3.
12. Lint de los 4 archivos de B3, clasificado como PASS, PREEXISTING o B3-RELATED.
13. Superficies protegidas: correr `git diff --stat 8455ebe..HEAD` sobre CatalogView, ProductDetailView, QuoteCartView, pricing, agent, supabase/ y HomeCategories (se espera vacío).

## Resultado

El informe final se entrega en el formato de la orden, con el veredicto PASS o BLOCKED [razón]. Siguen OPEN: HERO FINAL ASSET, PUBLICATION RIGHTS, ROUTE B FUNCTIONAL CONTRACT, REGALOS EJECUTIVOS PUBLIC INVENTORY y D-013 / CHK-BRAND-WEB-1.
