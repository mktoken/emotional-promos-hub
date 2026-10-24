# Paquete PE — activación controlada de ForPromotional

Este paquete prepara, pero no ejecuta aquí, la transición de ForPromotional en
Lovable Cloud. La información runtime ya confirmada por el propietario se usa
como precondición: release activo 1, regla ForPromotional 1, factor 1.0300,
cron de cinco minutos activo, `precio_desc` como costo efectivo y WAATI en
$122.13 a 54 piezas / $96.92 a 500 piezas.

**Decisión de ejecución:** para esta entrega solo está aprobada la ruta atómica
`10 → 11 → dry_run → shadow_write → 12 → 02 → 13 → 15 → 07`. Los scripts
`04`, `05`, `06` y `08` se conservan como compatibilidad histórica del paquete
anterior, pero no deben ejecutarse como parte de esta activación: 04/05
actualizan tablas vivas por separado y 08 cambia la ruta del cron. Si una
precondición de la ruta atómica no puede verificarse, el resultado es NO GO.

## Instalación desactivada para Lovable Build

La preparación inicial no usa la carpeta automática `supabase/migrations`:
`03` reemplaza un RPC público aun con la curva apagada y debe ejecutarse solo
después de capturar y comparar el contrato runtime. Lovable debe ejecutar, en
una ventana controlada, `00`, `00c`, `01`, `03`, `10` y `16`, en ese orden.
Todos los resultados de `00c` deben ser `PASS`; `03` debe dejar
`enabled = false` y `16` debe dejar `automatic_enabled = false`.

Después de `03`, y otra vez después de `16`, se comparan firmas, ACL y
cotizaciones baseline de ForPromotional, G4 y CDO. El cron, el release, el
factor 1.0300, los costos y el stock deben ser idénticos al baseline. En esta
fase no se ejecutan `11`–`20`, no se hace `shadow_write`, no se cambia el cron
y no se habilita la política.

Si la instalación desactivada falla, ejecutar `21_rollback_disabled_install.sql`.
Ese rollback restaura únicamente las funciones/ACL capturadas y elimina los
objetos privados recién instalados; no restaura costos, stock, ofertas,
releases ni cron que puedan haber cambiado legítimamente por el ciclo anterior.
Las Edge Functions V2 tienen nombres paralelos y pueden quedar desplegadas pero
dormidas.

## Pre-flight de especialistas

- Lead: S22 Pricing Governance.
- Apoyos: S23 PostgreSQL y S26 QA Regression.
- Fuentes: estado runtime confirmado por el propietario, migración local
  `20261023120000_forpromotional_continuous_pricing_v1.sql`, sincronizador
  corregido y contratos de las tablas en `supabase/migrations/`.
- Superficies protegidas: G4, CDO, producción, SQL remoto, Lovable Cloud y el
  checkout original.
- Listos para preparar el paquete: sí. La ejecución runtime queda fuera de
  esta intervención.

## Archivos y orden exacto de la ruta histórica (NO usar para el corte atómico)

1. `00_preflight_readonly.sql` — solo lectura. Detenerse ante cualquier FAIL.
2. `01_snapshot_backup.sql` — crea un respaldo persistente y único.
3. Desplegar en paralelo `sync-forpromotional-products-v2` desde
   `functions/sync-forpromotional-products-v2/` y
   `refresh-provider-stock-forpromotional-v2` desde
   `functions/refresh-provider-stock-forpromotional-v2/`, incluyendo
   `functions/_shared/`. No sobrescribir las funciones actuales. Este despliegue
   no cambia el cron ni activa la política. Ambas funciones deben recibir el
   mismo secreto administrado `STOCK_REFRESH_CRON_KEY`; solo el orquestador v2
   puede invocar modos de escritura de la sync v2.
4. Desplegar y ejecutar `functions/test-forpromotional-connection/index.ts`
   solo con el secreto administrado por Lovable Cloud. Esta función consulta la
   API y no escribe Supabase.
5. Ejecutar `00b_parallel_dry_run_guard.sql`; las tres filas deben ser PASS.
   Después ejecutar directamente `sync-forpromotional-products-v2` solo en
   `mode=dry_run`, por páginas,
   hasta `has_more = false`. Revisar los siete productos control, todos los
   `precio_desc` inválidos o ausentes, flags contradictorios, stock y cambios
   de precio. No usar el orquestador `refresh-*` para esta prueba porque ese
   orquestador registra auditoría operativa aun cuando la sync interna sea dry-run.
   El cron original continúa apuntando a la versión anterior durante estos pasos.
6. Comparar las cotizaciones baseline guardadas en el respaldo con la salida
   del dry-run. No activar si una excepción no está explicada.
7. En la ventana de mantenimiento autorizada, ejecutar
   `02_pause_forpromotional_cron.sql`. Desde este punto y hasta el corte o la
   reversión no debe existir un job ForPromotional activo.
8. Ejecutar `03_install_policy_disabled.sql`. Instala el wrapper y deja
   `enabled = false`. Antes de continuar, comparar cotizaciones representativas
   de ForPromotional, G4 y CDO contra el baseline; cualquier diferencia bloquea
   la transición y obliga a `05_rollback.sql`.
9. Solo cuando exista un control autorizado que impida cotizaciones públicas
   intermedias durante toda la ventana, ejecutar
   `refresh-provider-stock-forpromotional-v2` con
   `provider=forpromotional&mode=full` y la credencial de cron administrada.
   El orquestador adquiere el lock y es la única ruta habilitada para escritura.
   Guardar el `batch_id`, revisar que cada escala
   válida tenga `source_field = 'forpromotional.api.precio_desc'` y verificar
   que no se haya tocado G4/CDO.
10. Ejecutar `04_activate_forpromotional_guarded.sql`. Solo cambia la regla
    ForPromotional a `1.0000` y activa la bandera; no cambia G4 ni CDO.
11. Ejecutar `06_post_activation_verify.sql` y las cotizaciones reales de
    control. Comprobar costo, stock vigente, MOQ, curva, total, G4 y CDO.
12. Ejecutar `08_switch_forpromotional_cron_to_v2.sql` únicamente después de
    que todas las verificaciones sean PASS. Conserva nombre y horario, pero
    sustituye solo la ruta ForPromotional por el orquestador v2. G4 y CDO no se
    seleccionan. `07_resume_forpromotional_cron.sql` queda reservado para
    abandonar la activación antes del corte y restaurar la ruta anterior.

## Respaldo incluido

`01_snapshot_backup.sql` conserva en una fila protegida por `service_role`:

- proveedor ForPromotional y `last_sync_at`;
- release actual, generation shadow, rule set, purchase levels, margin tiers y
  todas las reglas del release (incluido G4/CDO para comparación);
- ofertas, escalas, costos, `source_field`, stock, raw products y batches del
  proveedor;
- materialización pública `producto_b2b_status` para productos con oferta
  ForPromotional;
- caché pública legacy y baseline shadow del release;
- cursores, runs, run items y locks de refresh cuando esas tablas existen;
- definición y ACL de las funciones afectadas;
- estado de `pricing_policy_flags`;
- schedule, command y estado del cron;
- cotizaciones baseline para cantidades 54, 500, 1,000 y 5,000 cuando existe
  una función pública `STABLE`; si no, queda `quote_status = NOT_VERIFIED` y la
  ejecución no debe continuar sin un baseline runtime independiente.

No se sobrescribe `backup_key = 'current'`. Si ya existe, el script se detiene.

## Rollback

1. Ejecutar `09_pause_v2_for_rollback.sql`; valida y retira solo la ruta v2
   exacta, sin inferir comandos divergentes.
2. Confirmar que no existe un lock ForPromotional activo. La función anterior
   sigue desplegada e intacta, por lo que no se restaura ningún bundle.
3. Ejecutar `05_rollback.sql`. Restaura costos, escalas, ofertas, stock, raw
   products, batches, proveedor, cursores, runs, locks, reglas, flag, funciones
   y ACLs. Si la tabla de política no existía antes, también la elimina sin
   `CASCADE`. Reinstala el cron original si estaba activo.
4. Si detecta un mapeo comercial inesperado, un lock activo, un rule set
   diferente o una definición de cron divergente, aborta antes de borrar ese
   estado; no usar `CASCADE` ni resolverlo por inferencia.
5. Ejecutar `06_post_activation_verify.sql` y confirmar las cotizaciones
   baseline. No usar el script de reanudación si el estado capturado era
   inactivo.

El rollback es completo para la ventana controlada sin escrituras concurrentes;
el guard de concurrencia es intencional. La reversión ya no depende de recuperar
el bundle anterior porque las funciones originales no se sobrescriben. Las
funciones v2 quedan dormidas al restaurar el comando original del cron.

## Condiciones de detención

- Más de un release activo o falta de relación release → generation → rule set.
- Regla ForPromotional ausente/duplicada o factor distinto de 1.0300 antes de
  activar.
- Cron activo durante la sincronización de escritura, activación o corte. El
  despliegue paralelo y el dry-run directo conservan deliberadamente la ruta
  cron anterior.
- `precio_desc` faltante, inválido o contradictorio en cualquier SKU que se
  pretenda sincronizar.
- Oferta ambigua, batch concurrente, stock inconsistente o cambio no explicado.
- Diferencia en cualquier regla, costo, imagen, precio o relación de G4/CDO.
- Cualquier intento de desplegar v2 sobre el nombre de la función original.
- Una ruta cron que no coincida exactamente con la capturada o con la v2
  derivada de ella.

No se ejecutaron SQL remotos, sincronizaciones, despliegues ni Publish al
preparar este paquete.

## Ruta atómica recomendada (13/14)

La ruta anterior basada en actualizar tablas vivas antes del corte queda
conservada como referencia histórica, pero no es la ruta aprobada para esta
activación. La secuencia atómica es:

1. Ejecutar `00_preflight_readonly.sql` y detenerse ante cualquier FAIL.
2. Ejecutar `01_snapshot_backup.sql` una sola vez y verificar que la fila
   `backup_key = 'current'` quedó persistida.
3. Instalar `10_install_atomic_staging.sql`. Esta etapa crea únicamente tablas
   privadas con RLS y acceso `service_role`; no cambia datos comerciales.
4. Ejecutar `11_prepare_atomic_candidate.sql`. Clona la generación V2 actual y
   devuelve el `candidate_id`. Si el release actual avanza después, no
   continuar: hay que abandonar esa candidate y preparar otra con el estado
   vigente.
5. Ejecutar directamente la función v2 en `mode=dry_run` hasta completar todas
   las páginas. Revisar `precio_desc`, excepciones, stock, MOQ y el impacto
   calculado sin escribir tablas.
6. Ejecutar la función v2 en `mode=shadow_write` con el mismo `candidate_id`,
   por páginas, usando exclusivamente la credencial de escritura administrada.
   Esta ruta escribe solo `forpromotional_atomic_*`; no toca costos, stock,
   cotizaciones, releases ni flags públicos.
7. Ejecutar `12_certify_atomic_candidate.sql`. Debe aprobar cobertura completa,
   mapeo exacto, ausencia de excepciones, factor 1.0000, curva monotónica en
   los puntos de control y conservación de G4/CDO. El script deja explícito que
   la validación consecutiva exhaustiva se ejecuta en la suite local, no se
   presenta como verificada por PostgreSQL sin runtime.
8. Pausar el cron con `02_pause_forpromotional_cron.sql` y comprobar que no hay
   `stock_refresh_locks` ni `provider_import_batches` en curso. El cron queda
   pausado durante todo el corte.
9. Ejecutar `13_activate_atomic_candidate.sql`. En una sola transacción cambia
   costos API, stock observado, factor 1.0000, bandera y puntero de release.
   Cualquier excepción revierte toda la transacción; no existe una ventana
   confirmada con una mezcla de versiones.
10. Ejecutar `15_verify_atomic_state.sql` y las cotizaciones reales de control.
    Solo después de PASS puede considerarse el corte completado; el cron debe
    permanecer pausado mientras no exista un ciclo v2 que cree, certifique y
    active candidates de forma atómica.
11. Si se necesita volver atrás, mantener el cron pausado y ejecutar
    `14_rollback_atomic_candidate.sql`; después ejecutar `15_verify_atomic_state.sql`
    y confirmar que el release base, los costos, el factor y la bandera fueron
    restaurados. No iniciar una sincronización durante la reversión.
12. No ejecutar `07_resume_forpromotional_cron.sql` después de una activación
    exitosa: ese cron antiguo puede volver a escribir costos/stock fuera del
    corte atómico. `07` queda reservado para una reversión histórica completa.

## Ciclo automático V2 continuo

La continuidad queda preparada sin reactivar el cron antiguo ni crear un segundo
escritor. La ruta nueva es:

1. Desplegar `sync-forpromotional-products-v2` y
   `run-forpromotional-atomic-cycle-v1`. Ambas funciones conservan el secreto
   administrado y no exponen costos ni credenciales.
2. Ejecutar `16_install_forpromotional_automatic_cycle.sql`. Instala tablas
   privadas, RLS y RPCs `service_role` para comenzar, certificar, activar,
   cerrar y revertir ciclos. Deja `automatic_enabled = false`.
3. Mantener el cron pausado mientras se prepara el corte. Ejecutar
   `17_switch_cron_to_automatic_cycle.sql`; la nueva ruta queda programada pero
   no escribe porque el flag permanece desactivado.
4. Ejecutar una invocación controlada de la función con el flag desactivado y
   comprobar respuesta `automatic_cycle_disabled`.
5. Solo después de revisar backup, despliegue, dry-run previo y ruta exacta,
   ejecutar `18_enable_automatic_cycle.sql`. Cada ventana de cinco minutos
   usa una clave idempotente, crea una candidate, hace shadow-write por todas
   las páginas, exige un total estable, certifica y publica mediante un único
   RPC transaccional. Una excepción deja la última generación válida publicada.
6. En una falla o mantenimiento, ejecutar
   `19_pause_automatic_cycle_for_rollback.sql` y después
   `pe_forpromotional_cycle_rollback_v1(candidate_id)` desde una sesión
   `service_role`. La reversión restaura costos, stock, factor, flag y puntero
   de release capturados para esa candidate; no usa `CASCADE`.
7. Ejecutar `20_verify_automatic_cycle.sql` después de cada activación,
   incidente o mantenimiento. Es solo lectura y expone `stale = true` cuando
   el flag está activo y no existe un éxito dentro de `stale_after`.

El ciclo no modifica G4/CDO: la certificación bloquea productos con mappings de
ambos proveedores y la activación solo actualiza IDs exactos de la candidate.
El cron antiguo no se ejecuta en paralelo: el switch exige que no exista el job
antes de programar la ruta nueva y rechaza rutas divergentes.

El estado persistido registra intentos, idempotency key, candidate, páginas,
errores, último éxito y estado de posible obsolescencia (`stale_after`). La
alerta operativa se obtiene cuando `automatic_enabled = true` y
`last_success_at + stale_after < now()`; no se presenta como verificada hasta
ejecutar la consulta posterior en Lovable Cloud.

### Alcance y límites de la atomicidad

La atomicidad cubre las escrituras SQL de costos, stock, factor, bandera y
release dentro de una misma transacción y está protegida por locks advisory y
controles de candidate. No cubre un proceso externo que ignore el cron o una
función desplegada que escriba fuera de `shadow_write`; por eso el switch
exacto del cron, la idempotencia, el secreto y la certificación son
precondiciones obligatorias. La ejecución runtime, la concurrencia real y la
reversión todavía requieren validación controlada en Lovable Cloud; el paquete
local no las presenta como PASS.
