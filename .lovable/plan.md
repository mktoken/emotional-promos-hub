# PLAN QA VISUAL — Preview Frontend-Only de Solicitud de Cotización

## 0. Hallazgo previo bloqueante (verificado en este workspace)

- La rama esperada `feat/quote-preview-frontend-only` y el HEAD `8fb08fd` **no existen** en este workspace. Ramas presentes: `edit/edt-98623271…` (actual, HEAD `6a35cc4`), `feat/v2-cutover-preparation`, `origin/main`.
- No existe ninguna pantalla de previsualización en el código actual: `QuoteCartView.tsx` solo tiene pasos `selection → form → success`. No hay cadenas "Previsualizar solicitud", "Previsualización de solicitud" ni "Volver a editar" en `src/`.
- Consecuencia: el QA visual del flujo `Productos → Datos de contacto → Preview → Enviar → Éxito` **no puede ejecutarse todavía** en este workspace. El plan queda listo y se ejecuta cuando el código de la preview esté presente (rama sincronizada o implementación aplicada).

## 1. Alcance del QA

Validación 100% visual/manual en navegador (Playwright, viewport 1280x1800, `http://localhost:8080`) del nuevo paso de preview entre el formulario de contacto y el envío. Sin cambios de código, sin cambios en base de datos, sin leads reales, sin deploy/publish/commit/push/merge.

## 2. Datos ficticios de prueba

- Producto P1 (precio confirmado): "Mochila Takayama Taktik Trolley" (`5f863e85-3d32-487b-94e5-0ac4da0c3b94`), ~$1,069.75 c/u, mínimo 1, color disponible, cantidad 25.
- Producto P2 (precio por confirmar): "Mug Tommy Doble Pared" (`e366a6df-6696-474d-af6c-78e673442201`), estado público `unavailable`, para validar "Precio por confirmar" en preview. Solo si el flujo permite incluirlo; si bloquea el avance, se valida P1 solo y se reporta.
- Contacto ficticio: Nombre "QA Preview Prueba", Empresa "Empresa Ficticia QA SA de CV", Correo `qa.preview@example.com`, Teléfono `5500000000`. (Dominio example.com: no llega a ningún buzón real aunque hubiera envío accidental.)
- Formato de cotización: el que la UI ofrezca por defecto (individual/kit); se registra cuál se muestra.

## 3. Pasos exactos

1. Snapshot de solo lectura previo: conteos en base de datos de leads/prospectos y cotizaciones públicas (tabla que use el RPC `submit_public_quote_request`), más estado de release V2 actual. Guardar valores base.
2. Abrir `http://localhost:8080`, ir al catálogo, buscar P1, abrir ficha, seleccionar color y cantidad 25, agregar a "Mi solicitud".
3. En "Mi solicitud", verificar producto con precio confirmado y avanzar a "Datos de contacto".
4. Llenar los datos ficticios y pulsar "Previsualizar solicitud".
5. Validar la pantalla "Previsualización de solicitud" (lista de verificación del punto 4 siguiente).
6. Pulsar "Volver a editar"; confirmar que el formulario conserva nombre, empresa, correo y teléfono.
7. Pulsar de nuevo "Previsualizar solicitud"; confirmar que los datos y productos permanecen.
8. Confirmar que el botón final dice exactamente "Enviar solicitud de cotización". **No pulsarlo.**
9. Capturar consola y red del navegador durante todo el recorrido.
10. Snapshot de solo lectura posterior: mismas consultas del paso 1. Comparar.

## 4. Lista de verificación de la pantalla de preview (caso 6 del encargo)

La pantalla "Previsualización de solicitud" debe mostrar:

- Productos agregados (nombre/imagen).
- Cantidades.
- Color seleccionado.
- Personalización (tipo/etiqueta si existe).
- Entrega estimada, si el producto la tiene.
- Precio confirmado o etiqueta "Precio por confirmar".
- Datos de contacto capturados.
- Formato de cotización.
- Aviso "Estimación antes de IVA e impresión".

## 5. Criterios PASS/FAIL

- PASS: los 12 casos del encargo se confirman; la preview muestra todos los elementos de la lista; "Volver a editar" conserva datos; no hay errores nuevos de consola/red; conteos de leads/cotizaciones idénticos antes y después.
- FAIL: cualquier elemento ausente o incorrecto en preview; pérdida de datos al volver; texto del botón final distinto; errores de consola nuevos atribuibles a la preview; cualquier lead o cotización creada; envío accidental de la solicitud.
- FAIL con nota: warnings de React preexistentes ya conocidos (refs) no bloquean, pero se documentan.

## 6. Evidencia a capturar

- Capturas de pantalla por paso: catálogo, ficha con precio, "Mi solicitud", formulario lleno, preview completa, retorno a edición con datos, preview reabierta, botón final visible sin pulsar.
- Registro de errores de consola y peticiones de red fallidas.
- Tabla comparativa antes/después de conteos en base de datos.
- Reporte final con resultado por caso (12 casos) y veredicto.

## 7. Cómo confirmar que no se creó lead

- Consulta de solo lectura antes y después: conteo total y `max(created_at)` de la tabla de leads/prospectos y de cotizaciones públicas.
- Monitoreo de red: confirmar que no se emitió ninguna llamada a `submit_public_quote_request` ni a `capture-assistant-lead` durante el recorrido.
- Comparación estricta: PASS solo si conteos idénticos y ninguna llamada de envío observada.

## 8. Qué NO se tocará

Ningún archivo; ninguna tabla, RLS, grant, secret o Edge Function; no se pulsa "Enviar solicitud de cotización"; no deploy, publish, commit, push, merge ni rollback.

## 9. Riesgos

- Riesgo principal actual: el código de la preview no está en este workspace; si se sincroniza la rama, el plan se ejecuta sin cambios.
- Envío accidental: mitigado con datos ficticios de dominio example.com y verificación de red; el botón final nunca se pulsa.
- El preview puede no existir como paso separado sino como sección dentro del formulario; si la implementación difiere de los textos esperados, se documenta la variante real en lugar de forzar FAIL por literalidad, salvo que falte funcionalidad.
- P2 `unavailable` puede bloquear el avance; se usa solo si el flujo lo permite.

## 10. Autorización exacta necesaria para ejecutar

"Autorizo ejecutar el QA visual de la preview frontend-only en modo Build: recorrido en navegador hasta el botón 'Enviar solicitud de cotización' sin pulsarlo, con datos ficticios, consultas de solo lectura antes y después, y captura de evidencia. Sin modificar código ni base de datos, sin crear leads, sin deploy/publish/commit/push/merge."

Condición previa indispensable: que el código de la preview exista en el workspace (rama `feat/quote-preview-frontend-only` sincronizada o implementación aplicada).

## VEREDICTO PLAN QA

- ¿Puede ejecutarse sin modificar código? Sí, el QA es 100% navegación y lectura.
- ¿Puede ejecutarse sin tocar Supabase estructuralmente? Sí, solo consultas de conteo de solo lectura.
- ¿Puede ejecutarse sin crear datos reales innecesarios? Sí: no se pulsa el botón final y se verifica con conteos antes/después y monitoreo de red.
- ¿Qué evidencia se entregará? Capturas por paso, reporte de consola/red, tabla comparativa de conteos, resultado PASS/FAIL por cada uno de los 12 casos.
- ¿Qué autorización exacta se necesita? La citada en el punto 10, y antes de eso, que el código de la preview esté presente en el workspace.
- Veredicto: **NO APTO PARA QA VISUAL en este momento** (la pantalla de preview y la rama/HEAD esperados no existen en este workspace). **APTO en cuanto el código de la preview esté presente.**
