# Auditoría de solo lectura — Estado Lovable/Supabase vs repositorio (16 sep 2026)

Cero escrituras: 0 archivos de proyecto modificados, 0 migraciones, 0 RPC de escritura, 0 deploys, 0 publish/rollback/cutover, 0 recompute, 0 shadow write.

## 1. Identidad Lovable verificada
- Backend: Lovable Cloud gestionado (ref `unzfwdykdqotiwzihsvc`), instancia Tiny, no pausada. Una sola instancia sirve preview y producción.
- URLs: preview `id-preview--406ed62b…lovable.app`; publicado `promocionalesemocionales.lovable.app`; dominios `articulospromocionales.vip` y `www.articulospromocionales.vip`.
- Conexión a `mktoken/emotional-promos-hub`: **no visible** desde las herramientas disponibles; Lovable no expone remoto ni commit desplegado.
- Rama del workspace: `edit/edt-ff33d4eb-…` (rama interna de Lovable), HEAD `da34fda "Work in progress"`, no `feat/v2-cutover-preparation` ni `4084872`.

## 2. Estado real del deploy vs commit 4084872
- `4084872` **sí existe** como ancestro del HEAD actual del workspace.
- Diff `4084872..HEAD` = 3 archivos, todos autogenerados por Lovable: `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, `types.ts` (+101/−12).
- Clasificación: **Coincide funcionalmente** (sin divergencia de lógica de negocio); **No determinable** para "qué commit exacto está publicado".

## 3. Migraciones aplicadas — DIVERGENCIA
Última fila del registro de migraciones: `20260728223513`. Las cuatro migraciones V2 del repo **no figuran en el registro**:
`20260802233000`, `20260802235500`, `20260803002000`, `20260803133000`.
Sin embargo, **todos los objetos que declaran existen en Live** (tablas, vista, RPCs). Conclusión: se aplicaron por vía directa (SQL ejecutado), no como migración versionada. Riesgo: un entorno nuevo reproducido desde el registro quedaría incompleto → **P1**.

## 4. Pricing Legacy real
| Objeto | Estado |
|---|---|
| `catalog_price_cache` | Existe, 1,524 filas, 1,506 `valid`, último `updated_at` **18 jul 2026** (2 meses de antigüedad) |
| `productos_publicos` | Existe (vista, **sin** `security_invoker`, sin `security_barrier`) |
| `catalog_search_products` | Existe, SECURITY DEFINER, ejecutable por anon |
| `get_public_product_price_tiers` | Existe, ejecutable por anon |
| `productos_b2b` | 1,815 filas |
| `producto_proveedor_stock` | último refresh **18 jul 2026** |

**Legacy sigue siendo la ruta real del catálogo público.**

## 5. Pricing V2 real
| Objeto | Existe | Datos | vs repo | Riesgo |
|---|---|---|---|---|
| `pricing_rule_sets` | Sí | `2026-01` activo; `2026-01-v2-draft` **inactivo** | Coincide | — |
| `purchase_levels` / `margin_tiers` / `provider_pricing_rules` | Sí | 12 / 24 / 6 | Coincide | — |
| `catalog_price_cache_v2_generations` | Sí | 3 generaciones | Coincide | — |
| `catalog_price_cache_v2_shadow` | Sí | **1,524 filas**, 1 generación | Coincide | — |
| `catalog_price_v2_releases` | Sí | **0 filas** | Coincide | — |
| `catalog_price_v2_current_prices` | Sí (vista, `security_barrier=true`) | **0 filas** | Coincide | — |
| `get_public_product_price_quote` | Sí | anon+auth EXECUTE | Coincide | — |
| `catalog_search_products_v2` | Sí | anon+auth EXECUTE, **sin consumidor en frontend** | Coincide | P1 |
| `submit_public_quote_request` | Sí | anon+auth EXECUTE | Coincide | — |
| `publish_catalog_price_v2_generation` | Sí | solo `authenticated` | Coincide | — |
| `rollback_catalog_price_v2_to_legacy` | Sí | solo `authenticated` | Coincide | — |
| `calculate_product_price_v2` | Sí | anon y auth **sin** EXECUTE | Coincide | — |

## 6. Dry run / shadow / releases
| Generación | Modo | Estado | Cand. | Proc. | Priced | Quote | Unavail. | Err |
|---|---|---|---|---|---|---|---|---|
| `f54d9d1a…` (`dryrun-2026-08-17-01`) | dry_run | completed | 1524 | 1524 | 1505 | 19 | 0 | 0 |
| `45c79265…` (`shadowwrite-2026-08-02-v2-01`) | shadow_write | **certified** | 1524 | 1524 | 1505 | 19 | 0 | 0 |
| `d8cfbb76…` (`dryrun-2026-08-02-subbuild-b-01`) | dry_run | completed | 1524 | 1524 | 1505 | 19 | 0 | 0 |

- Filas shadow: 1,524 (todas de `45c79265…`).
- Releases: **0**. `is_current` inexistente. Precios V2 actuales: **0 filas**.
- **No hay cutover. No hay release publicada. V2 sigue apagado.**

## 7. Edge Functions desplegadas
Las 11 del repo responden preflight 200: `recompute-catalog-price-cache-v2`, `capture-assistant-lead`, `promote-provider-products-to-catalog`, `refresh-provider-stock`, `send-proposal-summary-email`, `sync-cdo-products`, `sync-forpromotional-products`, `sync-g4-products`, `test-cdo-connection`, `test-g4-connection`, `test-forpromotional-connection`. Sin faltantes ni extras detectados.

## 8. RLS / seguridad (estado efectivo)
| Tabla | RLS | Políticas | anon SELECT | auth SELECT |
|---|---|---|---|---|
| `catalog_price_cache_v2_generations` | on | 0 | no | no |
| `catalog_price_cache_v2_shadow` | on | 0 | no | no |
| `catalog_price_v2_releases` | on | 0 | no | no |
| `catalog_price_v2_current_prices` (vista) | n/a | — | sí | sí |
| `catalog_price_cache` | on | 2 | sí | sí |
| `productos_b2b` | on | **0** | sí | sí |
| `pricing_rule_sets` | on | 2 | sí | sí |
| `cotizaciones_leads` | on | 4 | sí | sí |
| `crm_leads` / `profiles` / `user_roles` | on | 3 / 6 / 4 | no | sí |

Linter: 64 hallazgos — 2 ERROR (vistas SECURITY DEFINER), 3 funciones con `search_path` mutable, 11 tablas con RLS y 0 políticas, 21 funciones SECURITY DEFINER ejecutables por anon, 24 por authenticated, protección de contraseñas filtradas desactivada.

Riesgos:
- **P0** — ninguno confirmado con explotación directa.
- **P1** — `productos_publicos` sin `security_invoker` y 2 vistas marcadas SECURITY DEFINER por el linter: la vista aplica permisos del creador.
- **P1** — 21 funciones SECURITY DEFINER ejecutables por anon: requiere revisión caso por caso.
- **P2** — `is_staff(uuid)` con `search_path=public` sin `pg_temp`.
- **P2** — `productos_b2b` con RLS activo y 0 políticas + GRANT SELECT a anon (acceso efectivo bloqueado por RLS, pero configuración contradictoria).
- **P3** — protección de contraseñas filtradas desactivada.

## 9. Estado funcional visible
- `CatalogView.tsx` llama `catalog_search_products` (**Legacy**) — verificado en línea 207.
- `ProductDetailView` / adaptador de precio usan `get_public_product_price_quote` (**V2**).
- Carrito usa `submit_public_quote_request` (**V2**). 20 leads en `cotizaciones_leads`, el último del 9 jul 2026.
- No se ejecutaron pruebas de envío ni navegación con datos reales en esta auditoría.

## 10. Divergencias contra el repositorio
| Elemento | Repositorio | Lovable/Supabase real | Coincide | Riesgo |
|---|---|---|---|---|
| Commit | `4084872` | HEAD `da34fda`, solo archivos autogenerados de diferencia | Sí (funcional) | P3 |
| Registro de migraciones | 4 migraciones V2 | No registradas, objetos sí presentes | **No** | P1 |
| Tablas V2 | 4 | 4 | Sí | — |
| RPC V2 | 5 | 5 | Sí | — |
| Edge Functions | 11 | 11 desplegadas | Sí | — |
| Releases | preparado, vacío | 0 filas | Sí | — |
| Shadow | 1,524 certificadas | 1,524 | Sí | — |
| Legacy | activo | activo, datos de 18 jul | Sí | P1 (datos viejos) |
| CatalogView | Legacy | Legacy | Sí | P0 si se publica release |
| RLS | tablas V2 cerradas | cerradas | Sí | — |
| Secrets | proveedores + Resend + AI | `CDO_MEXICO_API_TOKEN`, `FORPROMOTIONAL_API_TOKEN`, `G4_KEY`, `G4_WSDL_URL`, `RESEND_API_KEY`, `LOVABLE_API_KEY`, `STOCK_REFRESH_CRON_KEY` presentes | Sí | — |

## 11. Bloqueadores reales antes del cutover
1. **BLOCKER-1 (P0 si se publica release)** — `CatalogView` sigue en Legacy con factor 1.35 mientras el detalle usa V2: publicar una release provoca precios distintos entre rejilla y ficha.
2. **BLOCKER-2 (P1)** — datos de origen obsoletos: caché y stock del 18 jul 2026 (60 días). La generación certificada refleja ese estado.
3. **BLOCKER-3 (P1)** — migraciones V2 aplicadas fuera del registro: no hay reproducibilidad del entorno.

## 12. Cerrado vs abierto
Cerrado: infraestructura V2 en base, RPC públicos, funciones publish/rollback, cierre de RLS en tablas internas V2, despliegue de Edge Functions, certificación shadow (1524/1505/19/0/0), migración de ficha de producto y carrito a V2.

Abierto: migración de `CatalogView` a `catalog_search_products_v2`; refresco de stock y caché; registro formal de las migraciones V2; endurecimiento de vistas y funciones SECURITY DEFINER; publicación de release y retiro de Legacy.

## VEREDICTO LOVABLE
| Decisión | Sí/No/No determinable | Evidencia | Riesgo | Acción |
|---|---|---|---|---|
| ¿El entorno coincide con `feat/v2-cutover-preparation @ 4084872`? | Sí funcionalmente / No determinable en despliegue | Diff limitado a 3 archivos autogenerados; Lovable no expone commit publicado | P3 | Confirmar commit publicado desde la pantalla de publicación |
| ¿Pricing V2 preparado en Supabase interno? | Sí | Tablas, vista, 5 RPC y shadow 1,524 certificadas presentes | — | Ninguna |
| ¿Existe release V2 activa? | No | `catalog_price_v2_releases` = 0 filas; vista de precios actuales = 0 | — | Ninguna |
| ¿Se puede hacer cutover de CatalogView ahora? | No | `CatalogView.tsx:207` usa `catalog_search_products`; datos de origen del 18 jul | P0 | Migrar rejilla a V2 y refrescar datos primero — REQUIERE AUTORIZACIÓN EXPLÍCITA DEL USUARIO |
| ¿Debe mantenerse Legacy? | Sí | Es la única ruta que alimenta la rejilla pública | P1 | Mantener hasta cutover completo |
| Siguiente acción técnica segura | Refrescar stock y caché, luego nuevo `dry_run` de control | Última actualización 18 jul 2026 | P2 | REQUIERE AUTORIZACIÓN EXPLÍCITA DEL USUARIO |

**Veredicto global: NO-GO para cutover. GO para preparación (refresco de datos + migración de CatalogView) bajo autorización explícita.**

Confirmación: archivos de proyecto modificados 0 · base de datos modificada no · migraciones aplicadas 0 · Edge Functions desplegadas 0 · dry_run 0 · shadow_write 0 · release publicada no · rollback no · publish no.
