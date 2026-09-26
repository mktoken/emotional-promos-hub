# Auditoría read-only de continuidad — Emotional Promos Hub

Objetivo: entregar el informe "AUDITORÍA LOVABLE — ESTADO REAL PROMOHUB" (secciones A–L) sin realizar ningún cambio.

## Pasos (todos de solo lectura)

1. **Identidad y Git**: leer `git remote -v`, `git branch`, `git log -1`, `git status` (sin fetch/checkout). Comparar con `mktoken/emotional-promos-hub` / `main` / `c4d2195`. Aclarar que el remoto visible es el mirror interno de Lovable.
2. **Publicación**: consultar URLs del proyecto y configuración de publicación (herramientas de lectura). Sin publicar. Fecha/revisión publicada: reportar NO COMPROBADO si no es visible.
3. **Backend interno**: consultas `SELECT` a `information_schema` / `pg_proc` para confirmar tablas y RPC listadas (`submit_public_quote_request`, `catalog_search_products_v2`, `set_cotizacion_lead_follow_up`); listar carpetas en `supabase/functions` para los 6 sincronizadores. No se ejecuta ninguna función.
4. **Auth**: leer la configuración de Auth solo si existe herramienta de lectura; Site URL/Redirect URLs sin herramienta de lectura quedan NO COMPROBADO. Verificar en código la ruta `/auth/update-password`.
5. **Proveedores**: `SELECT` a `proveedores` (códigos `cdo_mx`, `forpromotional`, `g4_mx`, `last_sync_at`) y últimos `provider_import_batches` (estado, errores, fechas).
6. **c4d2195**: buscar en el código las acciones "Abrir Gmail" / "Abrir WhatsApp" (`rg`); PRESENTE/NO PRESENTE. Publicado: evidencia de la publicación solicitada en el turno anterior.
7. **Informe final** A–L con discrepancias, NO COMPROBADOS, riesgos y siguiente paso recomendado; cierre exacto con "NO SE REALIZARON CAMBIOS — AUDITORÍA READ-ONLY".

## Garantías

Sin escritura de código, datos, migraciones, Auth, Storage, secretos, dominios, commits, push ni publicación.  
  
Adelante. Ejecuta la auditoría exactamente conforme al plan, exclusivamente read-only. No realices ninguna modificación ni corrección. Entrégame al finalizar el informe completo A–L y detente.