# Plan — Reparar RPC pública de escalas de precio (`get_public_product_price_tiers`)

## 1. Estado actual verificado

- La RPC `public.get_public_product_price_tiers` existe y expone únicamente el whitelist correcto (`min_qty`, `max_qty`, `precio_unitario_mxn`, `currency`, `tax_included`, `price_status`). No hay filtración de campos internos.
- `catalog_price_cache` tiene 1524 filas con dos estados reales: `valid` (1506) y `manual_review` (18). **No existe ninguna fila con `price_valid**`.
- La única fuente que escribe la caché es la Edge Function `supabase/functions/promote-provider-products-to-catalog/index.ts`, que emite exactamente `'valid' | 'manual_review' | 'unavailable'` (líneas 431–557).
- No hay trigger SQL ni función auxiliar que llene la caché.
- La RPC compara contra `price_status = 'price_valid'` y además hace `coalesce(cache_price_status, 'price_valid')` para el pass-through.
- Frontend: `src/components/ProductDetailView.tsx` aún **no consume** esta RPC (no aparece en el archivo). Todo el consumo debe diseñarse.

## 2. Evidencia encontrada

- Query directo: `SELECT count(*) FROM catalog_price_cache WHERE price_status='price_valid'` → **0**.
- Query directo: `SELECT price_status, count(*) FROM catalog_price_cache GROUP BY 1` → `valid=1506`, `manual_review=18`.
- Join real: `productos_publicos` × `catalog_price_cache` con `price_status='valid'` → 1057 productos con precio válido (coincide con el conteo QA previo).
- Fuente de escritura confirmada en `promote-provider-products-to-catalog/index.ts` (usa vocabulario `valid|manual_review|unavailable`).

## 3. Causa raíz

**Escenario A + C simultáneos:**

- **A (vocabulario roto):** La RPC filtra por `'price_valid'` pero el vocabulario real emitido por el proceso de caché es `'valid'`. La CTE `cache` nunca encuentra filas, por lo que la RPC **siempre** opera en modo fallback.
- **C (fallback inseguro):** Sin caché coincidente, la RPC ejecuta `raw_tiers` desde `producto_precio_escalas` (costos crudos por proveedor) y aplica multiplicador. Cuando `precio_desde_mxn` del producto público existe, el multiplicador queda razonable; cuando no, cae al literal **1.35**, publicando esencialmente el costo del proveedor + 35% plano. Esto contradice las reglas específicas por proveedor (G4, ForPromotional, CDO) y expone márgenes internos.
- **Adicional (D parcial):** El `coalesce(cache_price_status, 'price_valid')` etiqueta como “válido” cualquier precio derivado por fallback, ocultando su origen no certificado.

Las 467 filas de caché sin producto público corresponden a productos B2B despublicados o inactivos; no son un bug de la RPC y **no se tocan** en este plan.

## 4. Riesgos

- Publicar precios cercanos al costo del proveedor si la RPC se conecta al frontend antes de corregirla.
- Romper productos que hoy no tienen caché válida si el fallback se elimina sin UX de “sujeto a cotización”.
- Divergencia futura si el writer cambia el vocabulario nuevamente y la RPC vuelve a quedar desincronizada.
- Cambiar el contrato de `price_status` que ya devuelve la RPC (aunque no lo consuma el frontend público) podría afectar cualquier consumidor no documentado.

## 5. Solución mínima recomendada

Migración única, quirúrgica, sobre la RPC. No se toca la Edge Function, ni el writer, ni las reglas por proveedor, ni la estructura de la caché.

Cambios dentro de `get_public_product_price_tiers`:

1. Filtrar `cache` por `price_status = 'valid'` (vocabulario real). Opcional aceptar también `'manual_review'` **solo si** se decide explícitamente; por defecto **NO**.
2. Reemplazar `coalesce(cache_price_status, 'price_valid')` por `cache_price_status` estricto; si es NULL, no se emite escala.
3. **Eliminar el fallback 1.35.** Si no hay `cache` con `price_status='valid'` para el producto, la RPC devuelve **cero filas**.
4. Requerir además que exista `min_price_before_tax_mxn > 0` en la caché válida para que la escala sea emitida.
5. Mantener el resto de la lógica (selección de oferta, escalas desde `producto_precio_escalas`, orden, whitelist de columnas, `SECURITY DEFINER`, `search_path`).

Con esto: **producto sin caché válida → sin escalas → frontend muestra “Precio sujeto a cotización”**, sin exponer costos ni márgenes.

Se agrega además un `COMMENT ON FUNCTION` documentando el vocabulario esperado (`valid`) y su alineación con `promote-provider-products-to-catalog`.

## 6. Alternativa descartada y motivo

- **Renombrar `valid` → `price_valid` en la caché y writer.** Descartada: requiere migración de 1524 filas, cambios en Edge Function activa, y no aporta valor semántico. El nombre real `valid` es correcto.
- **Aplicar reglas por proveedor dentro de la RPC pública.** Descartada: violaría el aislamiento (motor de precios vive en promoción a caché) y expondría lógica de márgenes en el path público.
- **Borrar las 467 filas huérfanas.** Descartada: fuera de alcance y sin evidencia de daño.

## 7. Migraciones necesarias

Una sola migración SQL (`CREATE OR REPLACE FUNCTION public.get_public_product_price_tiers ...`) con la misma firma y grants existentes. No se crean tablas, no se agregan índices, no se modifica RLS. Rollback = re-aplicar la versión anterior (guardada en el propio archivo de migración como comentario).

Se verifica que los grants actuales (`anon`, `authenticated`) sobre la función se preserven; `CREATE OR REPLACE` los mantiene.

## 8. Archivos que cambiaría el futuro Build

Backend:

- Migración nueva bajo `supabase/migrations/` con el `CREATE OR REPLACE FUNCTION`.

Frontend (Fase 2, tras validar RPC):

- `src/components/ProductDetailView.tsx` — agregar consumo de la RPC y estados UI.
- Opcional: nuevo hook `src/features/catalog/hooks/usePublicPriceTiers.ts` para React Query.

No se tocan: `CatalogView.tsx`, `catalog_search_products`, CRM, cotizador, impresión, email, sincronizaciones.

## 9. Contrato TypeScript/RPC

```ts
type PublicPriceTier = {
  min_qty: number;
  max_qty: number | null;
  precio_unitario_mxn: number; // > 0
  currency: "MXN";
  tax_included: boolean;
  price_status: "valid";
};

// supabase.rpc("get_public_product_price_tiers", {
//   p_producto_b2b_id?: string; p_id_interno?: string;
// }): Promise<{ data: PublicPriceTier[] | null; error: ... }>
```

Regla: si `data` es `[]` → “Precio sujeto a cotización”. Nunca se exponen otros campos.

## 10. Estados de UI (`ProductDetailView`)

- **loading**: skeleton en el bloque de precio (no bloquear resto de página).
- **success con escalas**: tabla o lista compacta de tramos con leyenda “Precio preliminar; no incluye impresión, IVA ni logística.” Si `tax_included=false` mostrar “Precio sin IVA”.
- **success sin escalas**: “Precio sujeto a cotización” + CTA existente de propuesta.
- **error**: mensaje breve + botón Reintentar (React Query `refetch`).
- **cantidad fuera de escala**: destacar el tramo aplicable y advertir “Cantidad fuera de escalas publicadas; se cotizará bajo pedido.”
- **producto no público / no autorizado**: mismo tratamiento que sin escalas.
- Cancelación de queries obsoletas vía `queryKey` con `productId`; `staleTime` razonable (~5 min).
- Mobile-first: bloque colapsable, contraste AA, roles ARIA para la tabla.

Reglas duras: no mostrar costos, ni proveedor, ni margen; nunca afirmar precio definitivo; nunca bloquear el CTA por ausencia de escalas.

## 11. Pruebas

SQL/RPC (ejecutables como `psql -c`):

- Producto con caché `valid` → devuelve N filas, todas con `precio_unitario_mxn > 0`.
- Producto sólo con caché `manual_review` → devuelve 0 filas.
- Producto sin caché → 0 filas (verificación de que ya no hay fallback 1.35).
- Producto no público → 0 filas (por CTE `visible_product`).
- UUID inexistente / `id_interno` inexistente → 0 filas.
- Producto con múltiples cachés → toma la más reciente por `calculated_at`.
- Verificación de whitelist: `\df+ get_public_product_price_tiers` confirma columnas.
- `SET ROLE anon; SELECT ... FROM catalog_price_cache;` sigue prohibido; RPC sigue accesible.

Frontend (Vitest / RTL o manual guiado):

- Loading skeleton visible ≤ 300 ms.
- Escalas renderizan con formato MXN y leyenda.
- Estado “sin escalas” muestra CTA.
- Error muestra Reintentar y recupera.
- Cambiar de producto cancela query anterior.
- Mobile 375 px sin overflow.

Regresión:

- `CatalogView`: orden ascendente y exclusión de stock cero intactos.
- `ProductDetailView` sigue montando para productos sin escalas.
- Carrito / propuesta sin cambios.

## 12. Criterios de aceptación

- `SELECT count(*) FROM get_public_product_price_tiers(p_producto_b2b_id => <uuid válido>)` devuelve > 0 para al menos 1000 de los 1057 productos con caché `valid`.
- Para productos sin caché `valid`, la RPC devuelve exactamente 0 filas.
- No aparece el literal `1.35` ni ningún multiplicador en el cuerpo de la nueva RPC.
- Ningún cambio en `catalog_price_cache`, ni en `promote-provider-products-to-catalog`, ni en RLS.
- Frontend público muestra “Precio sujeto a cotización” cuando corresponde y nunca expone campos internos.

## 13. Rollback

- Guardar el `CREATE OR REPLACE FUNCTION` anterior íntegro como comentario al inicio de la nueva migración.
- Rollback = ejecutar ese bloque anterior en una migración inversa. No hay datos que revertir.
- Frontend: si Fase 2 se despliega, revertir el commit del hook y de `ProductDetailView.tsx`; la RPC corregida puede quedarse sin consumidor sin efectos secundarios.

## 14. Verificación posterior

- Correr las queries SQL de la sección 11 en producción.
- Revisar 10 productos aleatorios en la UI pública: 8 con precio, 2 sin precio esperados según muestreo.
- Revisar Network en preview: la RPC responde `200` y sólo con el whitelist.
- Confirmar en `pg_proc` que `search_path` y `SECURITY DEFINER` no cambiaron.

## 15. Estimación relativa

- Fase 1 (RPC): muy pequeña. 1 migración, ~40 líneas SQL efectivas, bajo consumo de créditos.
- Fase 2 (frontend): pequeña. 1 hook + edición de un componente, sin nuevas dependencias.
- Riesgo operativo: bajo, siempre que Fase 2 espere validación de Fase 1.

## 16. Recomendación final

**Combinación en dos Builds separados:**

1. **Build A — SQL (migración RPC).** Ejecutar primero, validar con las pruebas SQL de la sección 11 antes de tocar UI.
2. **Build B — Frontend (`ProductDetailView` + hook).** Sólo después de que Build A esté certificado en producción.

No hacer trabajo manual fuera de migración: todo el cambio debe quedar versionado.  
  
PROYECTO: Emotional Promos Hub / Promocionales Emocionales

MODO OBLIGATORIO: BUILD CONTROLADO — FASE A / BACKEND

OBJETIVO ÚNICO

Corregir mediante una migración incremental la función:

public.get_public_product_price_tiers

para que solamente genere escalas públicas cuando exista una fila válida en:

public.catalog_price_cache

No conectar todavía esta RPC al frontend.

No modificar ProductDetailView.

No publicar.

============================================================

REGLA DE ALCANCE OBLIGATORIA

============================================================

No cambies, edites, refactorices, elimines, renombres ni reorganices ningún archivo, componente, tabla, función, política, ruta, estilo, dependencia o comportamiento que no haya sido solicitado explícitamente.

No hagas mejoras “aprovechando el cambio”.

No corrijas problemas fuera del alcance.

No apliques refactors preventivos.

No cambies diseño, copy, navegación, arquitectura o lógica existente sin autorización.

Si detectas otro problema:

1. No lo modifiques.

2. Repórtalo por separado.

3. Explica su riesgo.

4. Espera autorización explícita.

Mantén intactos todos los módulos no mencionados.

============================================================

ESTADO ACTUAL VERIFICADO

============================================================

La RPC pública:

public.get_public_product_price_tiers

tiene un problema de vocabulario y fallback.

Estado real de catalog_price_cache:

- 1524 filas totales.

- 1506 filas con price_status = 'valid'.

- 18 filas con price_status = 'manual_review'.

- 0 filas con price_status = 'price_valid'.

La Edge Function:

supabase/functions/promote-provider-products-to-catalog/index.ts

escribe los estados:

- valid

- manual_review

- unavailable

La RPC actualmente compara contra:

price_status = 'price_valid'

y además utiliza un fallback inseguro que puede:

- continuar sin caché válida;

- usar coalesce(cache_price_status, 'price_valid');

- aplicar el multiplicador histórico 1.35.

El factor universal 1.35 está superado y no debe utilizarse en ninguna ruta pública.

Las reglas reales de precio son específicas por proveedor y ya se procesan antes de guardar catalog_price_cache.

============================================================

ARCHIVO AUTORIZADO

============================================================

Crear exactamente una migración nueva en:

supabase/migrations/

Usar un nombre descriptivo similar a:

YYYYMMDDHHMMSS_fix_public_price_tiers_valid_cache.sql

No reescribir una migración existente.

No editar migraciones ya aplicadas.

Salvo que sea estrictamente imprescindible para crear esta migración, no modificar ningún otro archivo.

============================================================

IMPLEMENTACIÓN REQUERIDA

============================================================

Antes de escribir la migración:

1. Inspecciona la definición actual completa de

   public.get_public_product_price_tiers.

2. Conserva exactamente:

   - nombre;

   - firma;

   - parámetros;

   - defaults;

   - tipos de retorno;

   - nombres de columnas;

   - orden de columnas;

   - grants existentes;

   - SECURITY DEFINER;

   - SET search_path = public, pg_temp;

   - orden actual de las escalas;

   - selección actual del producto público;

   - compatibilidad por producto_b2b_id e id_interno.

3. No inventes columnas ni estados.

La nueva versión debe aplicar únicamente estos cambios:

A. Caché válida

La RPC solo puede usar filas de catalog_price_cache cuando:

price_status = 'valid'

No aceptar manual_review.

No aceptar unavailable.

No aceptar NULL.

No aceptar strings vacíos.

No aceptar price_valid.

B. Precio público válido

La fila de caché utilizada debe tener:

min_price_before_tax_mxn > 0

Si no cumple, la RPC debe devolver cero filas.

C. Sin fallback

Eliminar completamente:

- el literal 1.35;

- cualquier multiplicador por defecto;

- cualquier cálculo ejecutado sin caché válida;

- cualquier coalesce que convierta un estado ausente en válido.

Si no existe una caché válida para el producto, devolver cero filas.

D. Estado devuelto

price_status debe provenir de la fila real de caché.

No usar:

coalesce(cache_price_status, 'price_valid')

No declarar un precio como válido cuando no existe una fuente válida.

E. Múltiples filas de caché

Si existen varias filas válidas para un producto, conservar o implementar una selección determinista de la más reciente según el timestamp real disponible en la tabla, preferentemente calculated_at y con un desempate estable.

No inventar el nombre de la columna: inspeccionar primero el esquema real.

F. Contrato público

La RPC debe continuar devolviendo exclusivamente:

- min_qty

- max_qty

- precio_unitario_mxn

- currency

- tax_included

- price_status

Nunca devolver:

- costos;

- costo unitario;

- margen;

- markup;

- proveedor;

- proveedor_id;

- oferta_id;

- source_oferta_id;

- raw_payload;

- reglas internas;

- multiplicadores;

- logística.

G. Documentación SQL

Añadir COMMENT ON FUNCTION documentando:

- que el estado público aceptado es 'valid';

- que sin caché válida la función devuelve cero filas;

- que las reglas comerciales por proveedor se calculan fuera de esta RPC.

============================================================

ROLLBACK OBLIGATORIO

============================================================

Antes de reemplazar la función:

- conserva la definición anterior completa;

- incluye una estrategia de rollback explícita;

- no borres datos;

- no actualices filas de catalog_price_cache;

- no cambies la Edge Function.

El rollback debe consistir en restaurar la definición anterior de la función mediante una migración inversa o un bloque SQL completo claramente documentado.

No dejes el rollback como una descripción vaga.

============================================================

NO TOCAR

============================================================

No modificar:

- catalog_price_cache;

- datos existentes;

- constraints;

- índices;

- RLS;

- grants salvo que accidentalmente cambien y deban preservarse;

- promote-provider-products-to-catalog;

- otras Edge Functions;

- reglas por proveedor;

- provider_pricing_rules;

- pricing_rule_sets;

- purchase_levels;

- margin_tiers;

- producto_precio_escalas;

- catalog_search_products;

- product_has_available_stock;

- productos_publicos;

- ProductDetailView.tsx;

- CatalogView.tsx;

- hooks frontend;

- tipos TypeScript;

- categorías;

- subcategorías;

- stock;

- CRM;

- cotizaciones;

- impresión;

- email;

- pagos;

- rutas;

- estilos;

- dependencias.

No crear tablas.

No crear columnas.

No añadir librerías.

No hacer backfills.

No borrar las 467 filas de caché sin producto público coincidente.

============================================================

PRUEBAS SQL OBLIGATORIAS

============================================================

Después de crear la migración, ejecutar o preparar consultas completas para verificar:

1. Producto público con caché valid:

   - devuelve una o más escalas;

   - todos los precios son mayores que cero;

   - price_status = 'valid'.

2. Producto con solamente manual_review:

   - devuelve cero filas.

3. Producto sin caché:

   - devuelve cero filas.

4. Producto no público:

   - devuelve cero filas.

5. UUID inexistente:

   - devuelve cero filas.

6. id_interno inexistente:

   - devuelve cero filas.

7. Producto con varias cachés valid:

   - selecciona determinísticamente la más reciente.

8. Seguridad:

   - anon puede ejecutar la RPC;

   - anon no obtiene acceso directo a catalog_price_cache;

   - la RPC mantiene SECURITY DEFINER;

   - search_path permanece public, pg_temp.

9. Contrato:

   - solo se devuelven las seis columnas públicas autorizadas.

10. Regresión:

   - catalog_search_products no cambia;

   - el filtro de stock no cambia;

   - no cambia ninguna tabla ni fila.

Incluye una consulta global que muestre:

- productos públicos;

- productos con caché valid;

- productos para los que la RPC devuelve escalas;

- productos con caché valid pero sin escalas;

- productos sin caché valid que incorrectamente devuelvan escalas.

El último conteo debe ser cero.

============================================================

CRITERIOS DE ACEPTACIÓN

============================================================

El Build se acepta únicamente si:

- existe una sola migración nueva;

- la firma de la RPC no cambió;

- el whitelist de retorno no cambió;

- no aparece el literal 1.35 en la nueva función;

- no existe fallback cuando falta caché válida;

- manual_review no genera escalas;

- sin caché valid se devuelven cero filas;

- price_status proviene de la caché real;

- no se modificaron datos;

- no se modificó RLS;

- no se modificaron Edge Functions;

- no se modificó frontend;

- typecheck y build del proyecto continúan pasando;

- no hubo cambios fuera del alcance;

- no se publicó.

============================================================

CIERRE OBLIGATORIO

============================================================

Al terminar, detente.

No continúes con la integración frontend.

Entrega:

1. nombre exacto de la migración creada;

2. lista completa de archivos modificados;

3. diff resumido de la función;

4. confirmación de que eliminaste el fallback 1.35;

5. confirmación de que manual_review no se publica;

6. resultados de las pruebas SQL;

7. resultado de typecheck;

8. resultado de build;

9. rollback completo;

10. riesgos o pendientes encontrados sin modificarlos.

PROHIBICIONES FINALES

- No Publish.

- No “Try to fix”.

- No frontend.

- No cambios fuera del alcance.

- No refactors.

- No cambios visuales.

- No nuevas dependencias.

- No alterar datos existentes.

- No debilitar RLS.

- No usar service_role en el navegador.

- No exponer costos ni lógica interna.