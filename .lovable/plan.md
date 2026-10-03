# CHK-BRAND-WEB-B1-TEST-FIX-V1

## Revisión previa: discrepancia (no se modificó nada)

- HEAD = origin/main = 54a9aeb03f202e824510d94210e8a6716ce02b1b (esperado: bbc0e3b96a4a9be84654a7cedfea2dd15c236278)
- Divergencia 0 / 0; working tree limpio
- Commits posteriores a bbc0e3b: 03e9b12 "Changes" y 54a9aeb "Update plan". Lovable los generó solos al guardar el informe de validación.
- Diferencia bbc0e3b..HEAD: solo `.lovable/plan.md` (+45 líneas). Es un archivo de notas del plan; no hay código funcional ni tests modificados.

Si se aprueba este plan, 54a9aeb queda aceptado como baseline. Si no, el checkpoint queda BLOCKED.

## Cambio (solo src/test/frontend-sprint1-contract.test.ts)

En el test "no usa ShoppingCart y muestra Mi solicitud":
- Se agrega la lectura de `src/components/home/HomeHeader.tsx`.
- Se mantienen `productDetail` sin "ShoppingCart" e `index` sin "ShoppingCart".
- Nuevos asserts:
  - `homeHeader` no contiene "ShoppingCart";
  - `homeHeader` contiene "Mi solicitud";
  - `index` importa y usa HomeHeader (`<HomeHeader`), para que el acceso a "Mi solicitud" siga montado en la página.
- Se reemplaza `expect(index).toContain("Mi solicitud")` por esos asserts. El test no queda más débil.

## No se toca

Index.tsx, LandingView.tsx, HomeHeader.tsx, HomeHero.tsx, ni ningún archivo funcional. Tampoco los 47 errores preexistentes ni sus archivos.

## Validación

- git diff --check
- vitest completo (esperado 205/205)
- typecheck (esperado 47 errores idénticos, 0 en archivos B1)
- diff: solo el archivo de test (más el `.lovable/plan.md` que Lovable gestiona)

Se entrega el reporte en el formato pedido. Las puertas abiertas siguen OPEN. Sin publicar.
