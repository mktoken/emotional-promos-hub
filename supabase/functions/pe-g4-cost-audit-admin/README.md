# PE-G4-AUDIT-01 — Auditoría de costos G4 sin escrituras (PREPARADA, NO INSTALADA)

## Motivo y alcance

La auditoría de ForPromotional se completó mediante un proxy de administrador temporal que leyó la clave interna y llamó en `dry_run` a una función existente. G4 no es idéntico: el `dry_run` de `sync-g4-products` solo expone tres muestras con precio mínimo; no expone escalas completas por SKU y no demuestra la semántica de `<escala precio>` frente a «Precio sin decorado».

Esta función propuesta consulta **solamente** las tablas G4 importadas, con usuario autenticado y rol administrador activo. No se conecta al proveedor, no ejecuta ninguna sincronización y no requiere revelar claves. Devuelve escalas existentes, `source_field`, `last_seen_at`, origen raw_payload normalizado, y compara la escala de mayor `min_qty` con cinco referencias de capturas. Busca candidatos a Link Terra por nombre pero **no da por confirmado su SKU**. No informa costos a usuarios públicos.

## Evidencia estática del ZIP del 25-oct-2026

- `supabase/functions/sync-g4-products/index.ts` extrae XML `<precios><escala rango=... precio=...>`, convierte `rango` a `min_qty` y almacena `unit_cost` con `source_field=g4_precios_escala`.
- `public.calculate_product_price_v2` en `20260927110000_fix_v2_tier_selection_by_purchase_base.sql` selecciona costo fijo `min_qty=250` para G4. **No se debe sustituir ni migrar sin verificación runtime.**
- `sync-g4-products?mode=dry_run` consulta SOAP pero solo devuelve `precio_min` de tres muestras y estadísticas. No es apta para la auditoría completa de origen de costos.
- No existe en el ZIP un fixture o documentación contractual que pruebe que el atributo SOAP `precio` representa exclusivamente «Precio sin decorado».
- ForPromotional `dry_run` 4,127/4,127 PASS reportado por operador el 25-oct-2026, pero no acredita publicación o corte de precios.

## Instalación segura (requiere autorización técnica específica)

1. Confirmar proyecto Cloud `unzfwdykdqotiwzihsvc`, función inexistente con nombre `pe-g4-cost-audit-admin` o, si no es posible confirmar, NO sobrescribir ni editar una función homónima. Se sugiere el nombre exacto `pe-g4-cost-audit-admin-01` para evitar colisiones; en ese caso renombrar **carpeta y sección de config** conservando el código.
2. Instalar solamente `supabase/functions/pe-g4-cost-audit-admin/index.ts`, con `verify_jwt=true`. No editar ninguna función original, migración, dato, secreto, cron o configuración comercial; `supabase/config.toml` solo debe añadir el bloque `[functions.pe-g4-cost-audit-admin] verify_jwt = true` si es imprescindible.
3. Verificar estado **Active** visualmente en Cloud y revisar el código instalado sin exponer secretos.
4. Solo en una segunda autorización, ejecutar exactamente **una invocación POST autenticada con JWT de administrador activo**. No usar `service_role` como credencial del usuario final.
5. Contrastar `raw_payload_prices` y escalas DB por cantidad y costos de las capturas; registrar coincidencias y discrepancias. No certificar que `precio` equivale a «Precio sin decorado» a partir de coincidencia numérica, incluso si hay seis coincidencias. Solicitar contrato técnico/documentación oficial o confirmación verificable del proveedor antes de generalizar; registrar cobertura de los casos como evidencia parcial. Si la evidencia es insuficiente, clasificar como BLOQUEADO y no alterar el cálculo.
6. Decidir retirada de la función temporal una vez terminado el checkpoint, sin modificar la función ForPromotional existente.

## Restricciones

- No ejecutar `sync-g4-products` en modo `full`, ni `test-g4-connection`, ni migraciones, ni recomputaciones, ni `shadow_write`, ni Publish.
- No tocar ForPromotional ni CDO; no configurar reglas de precios ni usar Build para autocorregir fallas fuera de esta instalación delimitada.
- No declarar PASS remoto solo porque la función está Active; la revisión estática solo verifica propiedades del código incluido.
- No pedir claves de Lovable; los valores permanecen ocultos y esta función no necesita `G4_KEY`, `G4_USER` ni `PROVIDERS_TEST_KEY`.
- Limitarla a las identidades incluidas; si un SKU falta, reportarlo, no inventarlo.

## Validaciones locales realizadas

- Inspección estática de que este archivo no contiene métodos de escritura SQL (`insert`, `upsert`, `update`, `delete`), invocaciones RPC mutadoras, llamadas a `sync-g4-products` ni solicitudes SOAP.
- La autenticación exige JWT de usuario, rol administrador en `user_roles` y `profiles.is_active=true`, igual que el diagnóstico anterior.
- Este archivo **no** ha sido instalado, invocado ni probado contra la base de datos real. La ejecución runtime está pendiente de aprobación explícita.
