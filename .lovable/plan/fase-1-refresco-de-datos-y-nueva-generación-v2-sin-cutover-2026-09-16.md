# Fase 1 — Refresco de datos y nueva generación V2 (sin cutover)

Nota: las Etapas A–F ya fueron ejecutadas y cerradas en la operación previa (16 sep 2026, 01:00–03:26 UTC) bajo esta misma autorización. Este documento es el informe final; no queda trabajo de ejecución pendiente en Fase 1.

## 1. Ambiente verificado
Lovable Cloud, ref `unzfwdykdqotiwzihsvc`, instancia única (preview = producción). Ambiente distinguible y confirmado.

## 2. Estado inicial
| Dato | Valor |
|---|---|
| Stock CDO | 556 filas, últ. 18 jul 2026 |
| Stock ForPromotional | 1,085 filas, últ. 10 jul 2026 |
| Stock G4 | 4,156 filas, últ. 10 jul 2026 |
| `catalog_price_cache` (Legacy) | 1,524 filas, 1,506 con precio, últ. 18 jul 2026 |
| Generación certificada previa | `45c79265…` — 1524/1524/1505/19/0/0/0 |
| Releases V2 | 0 · Rule set `2026-01-v2-draft` inactivo |

## 3. Etapa A — Dry run de stock
Los tres proveedores respondieron en vivo. Sin escrituras, sin errores, sin advertencias bloqueantes. Resultado: PASA.

## 4. Etapa B — Refresco real de stock
Ejecutado por proveedor, por lotes y encadenando cursores (lotes grandes provocaban timeout de gateway 504 y bloqueos 409; se usaron lotes de 25–100).

| Proveedor | Actualizados en el ciclo | Filas totales | Último dato |
|---|---|---|---|
| ForPromotional | 4,144 | 4,243 | 16 sep 02:56 |
| G4 | 550 | 556 | 16 sep 01:43 |
| CDO | 234 | 1,094 | 16 sep 01:51 |

Observación: CDO cerró su ciclo con solo 234 piezas actualizadas; el resto conserva datos previos. `promote-provider-products-to-catalog` NO se ejecutó.

## 5. Etapa C — Verificación Legacy
- `catalog_price_cache`: 1,524 filas, 1,506 con precio, `updated_at` = 18 jul 2026. Sin modificación.
- `catalog_search_products`: responde correctamente vía ruta pública (`total_count = 992`).
- Legacy sigue siendo la ruta pública del catálogo.
- Visibilidad pública: 992 productos visibles después del refresco. No existe baseline previo capturado, por lo que el delta de visibilidad no es medible.

## 6. Etapa D — Recompute V2 dry run
Primer intento con clave `dryrun-2026-09-16-01` quedó con contadores inflados por encadenamiento incorrecto de cursor y fue cerrado con estado `failed` (evidencia conservada; no escribió precios). Se repitió con clave autorizada por el usuario `dryrun-2026-09-16-02`:

1524 candidatos / 1524 procesados / 1506 con precio / 18 solicitar cotización / 0 no disponibles / 0 errores / 0 sin resolver. Estado `completed`.

Contra referencia histórica (1505/19): +1 con precio, −1 en solicitar cotización.

## 7. Etapa E — Shadow write V2
Clave `shadowwrite-2026-09-16-01`. Generación `818d824a-ff5d-4b66-a9c1-6cac56d4c4d5`, estado **certified**: 1524/1524/1506/18/0/0/0. Escribió únicamente en `catalog_price_cache_v2_generations` y `catalog_price_cache_v2_shadow`. Puerta de certificación cumplida.

## 8. Etapa F — Validación final
- Shadow: 1,524 filas nuevas; 1,506 `priced`, 18 `request_quote`; 0 precios nulos o ≤ 0; rango $1.37 – $2,451.40.
- Generación histórica `45c79265…` intacta con sus 1,524 filas.
- `catalog_price_v2_releases` = 0 filas. Rule set V2 inactivo.
- Legacy activo y sin modificación estructural.

## 9. Bloqueos y riesgos
- CDO actualizó solo 234 de 1,094 filas; el resto del catálogo CDO sigue con datos de julio.
- El delta de visibilidad pública no es verificable por falta de baseline.
- La función pública de búsqueda no es ejecutable desde el rol interno de lectura (esperado).
- Persisten timeouts de gateway (150 s) en lotes grandes de refresco.

## 10. Recomendación para Fase 2
Antes de cualquier cutover: (a) completar el ciclo de CDO hasta cubrir sus 1,094 filas; (b) capturar baseline de visibilidad pública y repetir dry run para comparar; (c) migrar `CatalogView` a V2 y soportar `request_quote` / `below_minimum`; (d) recién entonces publicar release V2. Nada de esto está autorizado todavía.

## VEREDICTO FASE 1
- ¿El refresco terminó correctamente? Sí en ForPromotional y G4; parcial en CDO.
- ¿La generación V2 quedó certificada? Sí — `818d824a…`.
- ¿Legacy quedó estructuralmente intacto? Sí.
- ¿Cambió la visibilidad pública por stock? Probablemente sí por movimiento natural de stock, pero no cuantificable sin baseline.
- ¿Existe release V2 activa? No.
- ¿Hay bloqueo para Fase 2? Sí: CDO incompleto y `CatalogView` aún en Legacy.
- Siguiente acción segura: completar el ciclo de stock de CDO y repetir dry run V2 con baseline de visibilidad, bajo autorización explícita.
