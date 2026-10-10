# RUNBOOK OPERATIVO Y DE CONTINUIDAD

## Objetivo

Permitir que una nueva sesión continúe el proyecto sin depender de chats, memoria conversacional o supuestos sobre Lovable y Supabase.

## A. Reentrada segura

1. Abrir `/Users/macbookpro/Projects/emotional-promos-hub`.
2. Leer `docs/00_PROJECT_INDEX.md`.
3. Leer `docs/MASTER-STATE.md` y localizar el checkpoint vigente.
4. Verificar la rama:

   ```sh
   git branch --show-current
   ```

5. Actualizar únicamente las referencias remotas:

   ```sh
   git fetch origin
   ```

6. Comparar estado local y remoto:

   ```sh
   git rev-parse HEAD
   git rev-parse origin/main
   git rev-list --left-right --count main...origin/main
   git status --short --branch
   ```

7. Si hay divergencia, archivos modificados, commits inesperados o una rama distinta, detenerse y auditar antes de integrar.
8. Leer el documento especializado correspondiente al trabajo.
9. No desarrollar hasta conocer el criterio de cierre del checkpoint.

## B. Gobernanza obligatoria

```text
Construir
→ Validar
→ Actualizar MASTER-STATE
→ Cerrar checkpoint
→ Commit/push
→ Verificar main = origin/main y 0 0
→ Avanzar
```

Un cambio de código no se considera cerrado solo porque exista en Git, Lovable o una preview.

## C. Uso seguro de Lovable

Antes de usar Lovable:

1. Verificar rama y HEAD en Git.
2. Verificar visualmente la rama seleccionada en Lovable.
3. Confirmar que coinciden exactamente.
4. Usar Re-check cuando corresponda.
5. Revisar Git después de cada sesión.

Lovable puede crear commits, planes o cambios aunque el prompt solicite solo lectura. Ante una divergencia:

- no hacer pull automático;
- listar commits y archivos;
- identificar cambios funcionales, documentales y de plan;
- decidir integración explícitamente;
- no usar force-push sin autorización específica.

## D. Supabase

Supabase es interno/integrado en Lovable para este proyecto.

No asumir ni ejecutar como ruta operativa:

- Dashboard externo de Supabase;
- `supabase login`;
- `supabase link`;
- `supabase db push`;
- CLI externa;
- `service_role`;
- credenciales externas;
- SQL de escritura fuera de un checkpoint aprobado.

Si Lovable no expone una configuración o acción integrada, documentar el bloqueo antes de proponer otra ruta.

## E. Producción

URL: <https://articulospromocionales.vip>

Para QA read-only:

1. Abrir producción como cliente nuevo cuando el alcance sea público.
2. No crear solicitudes reales salvo que el checkpoint autorice un caso QA controlado.
3. No enviar correos ni WhatsApp sin autorización explícita.
4. Para CRM, usar solo una sesión ya autenticada; no pedir ni cambiar contraseñas fuera del alcance.
5. No modificar cotizaciones o prospectos reales.
6. Registrar PASS, PARCIAL, FAIL, NO COMPROBADO o REQUIERE INTERVENCIÓN.
7. No confundir una pantalla visible con una operación comercial completa.

## F. Divergencias Git

Ante una divergencia:

1. Detener modificaciones.
2. Registrar HEAD local, remoto, ahead/behind y working tree.
3. Listar commits exclusivos de cada lado.
4. Inspeccionar archivos y diffs.
5. Revisar cambios de código antes de integrar.
6. No hacer pull, merge, rebase, cherry-pick o push hasta definir estrategia.
7. Si hay conflicto, detenerse; no improvisar.

## G. Estados de checkpoint

- **OPEN / ABIERTO:** trabajo o validación pendiente.
- **PASS / CERRADO:** criterio completo comprobado.
- **PARTIAL / PARCIAL:** parte comprobada, pero falta un requisito del alcance.
- **BLOCKED / BLOQUEADO:** no puede avanzar sin cambio externo o decisión.
- **NO COMPROBADO:** no existe evidencia suficiente para afirmarlo.

## H. Cierre de checkpoint

Antes de cerrar:

- validar el comportamiento definido;
- registrar límites y no comprobados;
- actualizar `MASTER-STATE.md`;
- revisar únicamente los archivos autorizados;
- ejecutar `git diff --check`;
- crear commit con mensaje claro;
- hacer push normal;
- verificar `main = origin/main`, divergencia `0 0` y working tree limpio.

## I. Prohibiciones

- No force-push sin autorización específica.
- No tocar stashes históricos.
- No fusionar ramas históricas automáticamente.
- No ejecutar migraciones o sincronizadores para “ver qué pasa”.
- No usar chats como autoridad permanente.
- No copiar secretos desde `.env`.
- No modificar datos reales durante QA read-only.
- No publicar sin un checkpoint que lo autorice.

## J. Separación de proyectos

Emotional Promos Hub no debe mezclarse con:

- Portal Maestro / Terrenos en Mérida;
- otros repositorios o proyectos Lovable;
- `promocionales.org`.

`promocionales.org` no es fuente de verdad de Emotional Promos Hub.

## K. Referencias de continuidad

- Estado vigente: `docs/MASTER-STATE.md`.
- Índice: `docs/00_PROJECT_INDEX.md`.
- Decisiones: `docs/02_DECISION_LOG.md`.
- Producto: `docs/04_PRODUCT_SCOPE.md`.
- Super Agente Comercial: `docs/06_SUPER_AGENTE_COMERCIAL.md`.
- Roadmap Operación Primero: `docs/07_OPERATIONS_ROADMAP.md`.
- Arquitectura: `docs/05_ARCHITECTURE.md`.
- Pricing y catálogo: `docs/09_PRICING_CATALOG_V2.md`.
- QA: `docs/10_QA_EVIDENCE.md`.

## L. Operación Primero

La producción estable se protege antes de abrir desarrollo nuevo. Usar Pricing V2 como autoridad, conservar estados `request_quote`/`unresolved`/`unavailable`, confirmar manualmente impresión y destinatarios, y no activar motores shadow sin checkpoint posterior.

Antes de declarar un bloqueo P0, distinguir un fallo reproducible que impida vender de una limitación P1/P2 que pueda gestionarse manualmente. Las correcciones focales deben tener rollback y cerrar su propio subcheckpoint.

## CP-2 — Auto-Sync certificado en runtime (2026-10-09)

`CHK-CLOSURE-AUTO-SYNC-FINAL-CERTIFICATION-V1` queda **CLOSED / PASS**.
ForPromotional, CDO y G4 tienen ciclos automáticos completos certificados con
materialización PASS. Los jobs activos relevantes son, respectivamente,
`catalog-stock-refresh-forpromotional`, `catalog-stock-refresh-cdo` y
`catalog-stock-refresh-g4`; cada proveedor tiene un solo job activo.

La comprobación operativa debe conservar estas reglas:

- usar solo `mode=full` para certificaciones de ciclo;
- tratar `items_failed` y, para G4, `stock_failed` como métricas obligatorias:
  ausencia no equivale a cero;
- excluir los runs históricos `provider=all` de la salud actual;
- no usar una alineación temporal como FK causal: la lineage queda
  `TEMPORAL_ALIGNMENT_CANDIDATE`;
- no mostrar comandos de cron, URLs con credenciales, secretos ni
  `return_message`;
- no ejecutar proveedores manualmente para cerrar CP-2.

El siguiente checkpoint autorizado es `CP-3 — PUBLIC CATALOG TRUTH GATE`,
orientado a la revalidación vigente de trazabilidad, mappings, pricing, stock,
taxonomía, imágenes, hotlinks y elegibilidad pública.

## CP-3 — P0 Legacy Public Truth Remediation (2026-10-09)

El P0 de bypass Legacy queda **CLOSED / PASS para este alcance**. La vista pública ya no puede devolver productos únicamente porque `productos_b2b.activo=true`: la elegibilidad exige el estado canónico vigente (`public_visible`, stock, precio, imagen y modo de cotización).

La vista anterior se conserva como `public.productos_publicos_legacy_v1` solo para rollback técnico y no tiene SELECT para `anon` ni `authenticated`. La superficie operativa pública continúa siendo `public.productos_publicos`; las RPC y el frontend no requieren un cambio de contrato.

Resultado runtime posterior: `1143` productos públicos canónicos, `0` false-but-public, `0` sin estado, `0` Legacy-only, `0` anomalías de cardinalidad, `0` mismatches de stock y `0` fallos de seguridad/pricing en el control ejecutado. No hubo sync manual, llamada a provider, backfill ni modificación de cron.

Guardrail operativo: cualquier nuevo producto público debe entrar por estado canónico vigente y no por una rama Legacy. CP-3 completo permanece **OPEN** hasta resolver los gates P1 de pricing/stock/frescura, imágenes/hotlinks y demás verdad pública; no declarar cierre global por este P0 aislado.

### CP-3 P1-C Phase 3A.1 — almacenamiento canónico de imágenes

La infraestructura versionada usa el bucket `catalog-product-images` con lectura
pública y sin políticas de escritura para `anon` o `authenticated`. Las cargas
internas pasan por `catalog-image-admin`, que exige `service_role` o un usuario
validado por `public.is_staff`. La ruta neutral es
`products/<producto_b2b_id>/master-<sha256_prefix>.<extension>`.

La función soporta `preflight` y `upload`, pero no modifica automáticamente
`productos_b2b.imagenes`. La actualización de referencias se mantiene separada
para Phase 3B, con revalidación de elegibilidad, verificación HTTP y rollback.

## CHK-CP-3-P1C-G4-PHASE3A-CATALOG-IMAGE-INFRASTRUCTURE — CLOSED / PASS (2026-10-10)

- Bucket `catalog-product-images` público (solo lectura anónima); escrituras anónimas DENIED.
- `catalog-image-admin` (staff/service_role): `preflight`, `upload`, `delete`, `validate_image_update` (dry run, sin UPDATE).
- Elegibilidad canónica: último `producto_b2b_status.public_visible` (mismo orden que `productos_publicos`); `productos_b2b.activo` NO se usa.
- `delete`: solo bucket `catalog-product-images`, solo `products/<producto_b2b_id>/master-<16 hex>.(webp|jpg|png)`; traversal, otro bucket y otro namespace → 400.
- Contrato Phase 3B para `productos_b2b.imagenes` (no ejecutado): anteponer `{url: <master público>, type: "principal", source: "catalog_master"}` y conservar todas las imágenes existentes del proveedor (principal/ambientada/adicional, hotlinks históricos) en su orden. `normalizeProductImages` da prioridad al master (rango 0 + primer orden).
- BUCKET MIME NATIVE RESTRICTION: NOT AVAILABLE IN CURRENT LOVABLE TOOLING. APPLICATION MIME ENFORCEMENT: PASS — catalog-image-admin (webp/jpeg/png; gif → 400).
- Fixtures del canario `011f5dc8` borrados; bucket con 0 objetos; producto canario sin cambios (hash de `imagenes` + `activo` idénticos).
- La URL pública de un objeto borrado puede seguir saliendo de la CDN hasta que expire la caché; el origen responde "no encontrado".
- G4 masters subidos: 0. Referencias G4 cambiadas: 0. G4 P1-C y CP-3 siguen ABIERTOS.
