# CHK-LOVABLE-SYNC-01 — Verificación de sincronización

## Estado verificado (solo lectura)

- HEAD: 57a7cf64fd5744d4787df275b9a7ceb430a09892
- origin/main: 57a7cf64fd5744d4787df275b9a7ceb430a09892
- Divergencia: 0 / 0
- Working tree: clean
- Rama temporal: edit/edt-06b11c99-82f8-4b0e-a057-2fc26a95e350 (contenido idéntico a main)
- Último commit: 57a7cf6 docs: add PE specialist preflight governance

## Acción

Ninguna. La copia de Lovable ya recibió 57a7cf6 por la sincronización oficial GitHub → Lovable. No hace falta fast-forward.
No se usó reset, rebase, cherry-pick, stash ni force. Sin build, deploy, API, secretos ni publish.

## Siguiente paso (no se ejecuta aquí)

CHK-4P-API2-MIGRATION-01 puede repetir su revisión previa cuando lo autorices.

CHK-LOVABLE-SYNC-01 — CLOSED / PASS  
MODO: BUILD CONTROLADO

CHECKPOINT:

CHK-4P-API2-MIGRATION-01 — REANUDACIÓN

BASELINE CONFIRMADO:

HEAD:

57a7cf64fd5744d4787df275b9a7ceb430a09892

origin/main:

57a7cf64fd5744d4787df275b9a7ceb430a09892

divergencia:

0 / 0

working tree:

clean

==========================================================

OBJETIVO

==========================================================

Dejar operativa y validada en runtime la integración actual

de ForPromotional contra API Clients External 2.0.

NO REDISEÑAR.

NO REFACTORIZAR.

NO TOCAR OTRAS ÁREAS.

==========================================================

CONTRATO OFICIAL

==========================================================

BASE URL:

[https://api-external-clients.4promotional.net](https://api-external-clients.4promotional.net)

ENDPOINT:

GET /api/products

AUTH:

Authorization: Bearer <secret existente>

Usar:

FORPROMOTIONAL_API_TOKEN

NO mostrar su valor.

NO regenerarlo.

NO reemplazarlo.

==========================================================

FUNCIONES AUTORIZADAS

==========================================================

ÚNICAMENTE:

1. sync-forpromotional-products

2. test-forpromotional-connection

No modificar otras funciones salvo dependencia técnica

estrictamente necesaria y demostrada.

==========================================================

PASO 1 — INSPECCIÓN PRE-BUILD

==========================================================

Confirmar nuevamente en ambas funciones:

- endpoint efectivo;

- Bearer auth;

- nombre del secret;

- parser de products[];

- mapping de:

  id_articulo

  nombre_artd

  descripcion

  precio

  precio_desc

  inventario

  categoria

  sub_categoria

  metodos_impresion

  area_impresion

  images

  piezas

  peso_unitario

Si ya coincide con API 2.0:

NO cambiar código innecesariamente.

==========================================================

PASO 2 — DEPLOY

==========================================================

Desplegar únicamente las funciones autorizadas que lo requieran.

Registrar:

- función;

- versión desplegada;

- fecha/hora;

- resultado.

NO PUBLISH de frontend.

==========================================================

PASO 3 — TEST MÍNIMO

==========================================================

Ejecutar primero:

test-forpromotional-connection

Validar:

- HTTP exitoso;

- JSON válido;

- products[] presente;

- al menos un producto;

- id_articulo presente;

- precio presente;

- inventario presente;

- images presente cuando corresponda.

NO imprimir:

- token;

- Authorization header;

- secretos.

==========================================================

PASO 4 — PRUEBA CONTROLADA

==========================================================

Realizar una consulta mínima con filtro documentado.

Preferencia:

id_articulo de un producto conocido.

Objetivo:

confirmar contrato real de API 2.0.

NO ejecutar todavía sincronización masiva completa.

==========================================================

PASO 5 — DECISIÓN

==========================================================

Si test-forpromotional-connection PASS

y el contrato coincide:

declarar API 2.0 operativa.

Si hay incompatibilidad:

DETENERSE.

==========================================================

STOP CONDITIONS

==========================================================

DETENERSE si:

- 401 / 403;

- respuesta no contiene products[];

- parser falla;

- requiere regenerar token;

- requiere cambio de schema;

- requiere SQL;

- requiere alterar Pricing V2;

- aparecen endpoints legacy inesperados.

==========================================================

REPORTE FINAL

==========================================================

Entregar:

FUNCTIONS DEPLOYED:

[...]

ENDPOINT VERIFIED:

[...]

AUTH:

Bearer / secret name only

RUNTIME TEST:

PASS / FAIL

PRODUCTS ARRAY:

YES / NO

CORE FIELDS:

PASS / FAIL

LEGACY CALLS:

YES / NO

SCHEMA CHANGES:

YES / NO

TOKEN CHANGE:

NO

FULL SYNC EXECUTED:

NO

FINAL STATUS:

CHK-4P-API2-MIGRATION-01 — MIGRATED / PASS

o

CHK-4P-API2-MIGRATION-01 — BLOCKED

[razón exacta]