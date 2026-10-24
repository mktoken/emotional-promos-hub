# Despliegue paralelo y reversión

Las funciones productivas existentes no se sobrescriben:

- `sync-forpromotional-products` permanece desplegada e intacta.
- `refresh-provider-stock` permanece desplegada e intacta y continúa atendiendo
  G4 y CDO.
- `sync-forpromotional-products-v2` contiene la corrección basada en
  `precio_desc` y nace con `mode=dry_run`.
- `refresh-provider-stock-forpromotional-v2` acepta exclusivamente
  `provider=forpromotional`, rechaza `all`, `g4_mx` y `cdo_mx`, y llama solo a
  `sync-forpromotional-products-v2`.

La sync v2 permite `dry_run` con la clave de prueba, pero exige además el
secreto administrado `STOCK_REFRESH_CRON_KEY` en `x-stock-refresh-key` para
`shadow_write`. El orquestador v2 acepta `mode=full` solo como nombre del
recorrido operativo, rechaza `dry_run`, adquiere el lock y envía internamente
`mode=shadow_write` con el `candidate_id`. Esa ruta escribe únicamente las
tablas privadas `forpromotional_atomic_*`; no modifica costos, stock,
cotizaciones, funciones públicas ni el release actual.

Desplegar las funciones v2 no cambia rutas, cron, reglas ni precios. El cron
original continúa usando la función anterior hasta ejecutar el switch controlado.
La continuidad se realiza mediante la función independiente
`run-forpromotional-atomic-cycle-v1`, no mediante la función refresh histórica.

`16_install_forpromotional_automatic_cycle.sql` instala estado privado, RLS y
RPCs restringidas a `service_role`. `17_switch_cron_to_automatic_cycle.sql`
exige que el cron original esté pausado y programa la ruta nueva con el flag
desactivado. `18_enable_automatic_cycle.sql` solo habilita la escritura cuando
el comando exacto apunta a la ruta atómica. Cada tick usa una clave idempotente,
crea candidate, hace shadow-write por páginas, certifica y publica mediante el
RPC transaccional. Si falla, la candidate queda fallida y la generación anterior
permanece publicada.

Para revertir una activación atómica manual, ejecutar `14_rollback_atomic_candidate.sql`
con el cron pausado, y después `15_verify_atomic_state.sql`. Para la ruta
continua, ejecutar `19_pause_automatic_cycle_for_rollback.sql` y llamar al RPC
`pe_forpromotional_cycle_rollback_v1(candidate_id)`. La ruta histórica completa
sigue disponible como contingencia separada: `09_pause_v2_for_rollback.sql` y
luego `05_rollback.sql`. Las funciones v2 pueden permanecer desplegadas pero
dormidas; su eliminación posterior es limpieza opcional, no una precondición de
recuperación.
