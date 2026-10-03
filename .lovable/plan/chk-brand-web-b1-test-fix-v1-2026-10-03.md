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
  
PE — CHK-BRAND-WEB-B1-TEST-FIX-V1

CONTINUE FROM ACCEPTED BASELINE

MODO:

BUILD CONTROLADO

BASELINE ACEPTADO:

54a9aeb03f202e824510d94210e8a6716ce02b1b

Razón:

los commits posteriores a bbc0e3b modifican únicamente

.lovable/[plan.md](http://plan.md) y no alteran código funcional ni tests.

==========================================================

SPECIALIST PRE-FLIGHT

==========================================================

Invocar:

$pe-specialist-orchestrator

Aplicar únicamente los Skills relevantes para este checkpoint.

No depender de recordatorios del propietario.

==========================================================

CAMBIO AUTORIZADO

==========================================================

Modificar únicamente:

src/test/frontend-sprint1-contract.test.ts

Aplicar exactamente el cambio ya propuesto:

- leer src/components/home/HomeHeader.tsx;

- conservar asserts de ausencia de "ShoppingCart";

- verificar que HomeHeader contiene "Mi solicitud";

- verificar que Index importa/usa HomeHeader;

- sustituir el assert obsoleto que buscaba "Mi solicitud"

  directamente en Index.tsx.

No debilitar el test.

==========================================================

NO TOCAR

==========================================================

No modificar:

src/pages/Index.tsx

src/components/LandingView.tsx

src/components/home/HomeHeader.tsx

src/components/home/HomeHero.tsx

ni ningún otro archivo funcional.

No corregir los 47 errores TypeScript preexistentes.

==========================================================

VALIDACIÓN

==========================================================

Ejecutar:

git diff --check

vitest completo

typecheck

Resultado esperado:

vitest:

205 / 205 PASS

typecheck:

47 errores preexistentes

0 errores nuevos

0 errores en archivos B1

Confirmar:

B1 NEW TYPE ERRORS = 0

==========================================================

DIFF ESPERADO

==========================================================

Cambio funcional autorizado:

src/test/frontend-sprint1-contract.test.ts

.lovable/[plan.md](http://plan.md) puede aparecer únicamente por gestión interna

de Lovable.

Cualquier otro archivo:

DETENERSE.

==========================================================

NO PUBLICAR

==========================================================

No publicar.

Mantener OPEN:

HERO FINAL ASSET

PUBLICATION RIGHTS

SKU/TAXONOMY RUNTIME VALIDATION

ROUTE B FUNCTIONAL CONTRACT

D-013 / CHK-BRAND-WEB-1

KNOWN LEGACY CLAIMS BELOW B1

==========================================================

RESULTADO

==========================================================

Reportar:

BASELINE:

FILES MODIFIED:

TEST CONTRACT CHANGE:

VITEST:

TYPECHECK:

B1 NEW TYPE ERRORS:

GIT DIFF CHECK:

UNEXPECTED FILES:

FUNCTIONAL CODE MODIFIED:

CURRENT HEAD:

ORIGIN MAIN:

DIVERGENCE:

WORKING TREE:

FINAL:

CHK-BRAND-WEB-B1-TEST-FIX-V1 — PASS

o

CHK-BRAND-WEB-B1-TEST-FIX-V1 — BLOCKED

[razón exacta]