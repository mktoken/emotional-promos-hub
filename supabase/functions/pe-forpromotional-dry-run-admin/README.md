# PE-FP-DIAG-01 — Instalación temporal de diagnóstico

ESTADO: **PREPARADA / NO INSTALADA / NO EJECUTADA**. Autorización: usuario aprobó **solamente instalación de una función temporal de diagnóstico** en esta conversación.

## Función

- Nombre propuesto: `pe-forpromotional-dry-run-admin` (nuevo; no reemplaza otra función).
- Proyecto **fijo**: `unzfwdykdqotiwzihsvc`.
- Método externo `POST`, usuario Supabase autenticado, `user_roles.role = admin` y `profiles.is_active = true`.
- Invoca exclusivamente la función preexistente `sync-forpromotional-products-v2` con `mode=dry_run`, `limit=5000`, `offset=0`.
- Lee `PROVIDERS_TEST_KEY` en el servidor, no requiere recuperarla de Lovable; no lee `STOCK_REFRESH_CRON_KEY`, no admite `shadow_write` ni escribe datos.
- No publica valores de secretos ni respuestas crudas; no incluye frontend ni CORS público.
- Las credenciales existentes se dejan intactas; no se generan otras.

## Instalación segura (requiere herramienta autenticada con permisos de despliegue)

1. Verificar acceso al proyecto identificado, vigencia de los secretos por su existencia (sin obtener valores) y disponibilidad de Supabase Auth.
2. Crear **solo** nueva Edge Function `pe-forpromotional-dry-run-admin` con el archivo `index.ts`, manteniendo la verificación JWT **activada** a nivel gateway; no usar `--no-verify-jwt`.
3. No modificar ni desplegar otras funciones, tablas, políticas, migraciones, cron, datos ni el sitio público.
4. Probar que GET y POST sin usuario respondan 405 y 401, que un usuario no administrador reciba 403, y que solo un administrador activo pueda invocar. Para estas pruebas no difundir JWT ni secretos por chats o capturas.
5. Confirmar despliegue, hora, estado y logs **sin** payloads secretos. No declarar PASS runtime antes de estos controles.

## Ejecución (fase posterior, no incluida en la autorización para instalar)

Se requiere instrucción operacional explícita. La invocación realiza una consulta completa a la API del proveedor; no crea ni modifica registros comerciales. Revisar métricas sin confundir prueba con publicación.

## Retiro

Una vez obtenida y archivada la evidencia del único diagnóstico, retirar la función temporal **con autorización específica**, sin tocar `sync-forpromotional-products-v2` ni el resto del proyecto.

## Advertencia

Esta carpeta es un paquete local listo para instalar, **no acredita instalación en Lovable Cloud/Supabase**. El entorno de ChatGPT no tenía un conector autenticado disponible para ejecutar el despliegue; el asistente no debe afirmar lo contrario.
