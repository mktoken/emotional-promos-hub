# CHK-CDO-01H2 — Final Master Exception Review

**Fecha:** 2026-10-13
**Estado:** **PACK PREPARED — HUMAN DECISION PENDING**
**Baseline:** `2d8116e2c859e820f5f11a205fdae1dd676171f2`

## Alcance

Este checkpoint trabaja exclusivamente sobre las seis variantes con
`publication_eligibility=BLOCKED` en el readiness registry de 01H. No reabre ni
recalcula los 348 masters aprobados. No ejecuta decisiones humanas, publicación,
runtime, Supabase, Lovable, DB ni contacto con StockSur.

La nomenclatura del readiness registry conserva `publication_eligibility`; el
índice de decisiones de este pack expone además el alias explícito
`publication_eligible=NO` para que la revisión humana sea inequívoca.

## Reconciliación canónica

- Variantes canónicas actuales: **354**.
- `MASTER_APPROVED` antes del pack: **348**.
- Variantes bloqueadas: **6**.
- Conflicting masters: **0**.
- Rights gate: **PASS** — `RIGHTS_ACCEPTABLE_FOR_PUBLICATION`.
- Live publication: **NO**.
- Decision rows in pack: **6**.
- Human fields prefilled: **0**.
- Approved masters modified: **0**.

## Exact six

| Modelo | Variante | Clase de bloqueo | Motivo operativo |
|---|---|---|---|
| BP254 | `grafito` | `NEW_VARIANT_AFTER_HUMAN_NORMALIZATION` | Variante separada en la normalización sin revisión visual humana final del asset actual. |
| EC742 | `celeste` | `NEW_VARIANT_AFTER_HUMAN_NORMALIZATION` | Relación resuelta analíticamente desde evidencia del proveedor; falta revisión visual humana final. |
| EC742 | `gris y negro` | `NEW_VARIANT_AFTER_HUMAN_NORMALIZATION` | Literal actual preservado sin asset exacto y revisión visual humana final vinculados. |
| T575 | `negro` | `ASSET_ROLE_RECONCILIATION_REQUIRED` | Existe asset negro actual, pero no tiene revisión humana final; cobre histórico queda excluido. |
| T622 | `rojo` | `NEW_VARIANT_AFTER_HUMAN_NORMALIZATION` | Variante creada por el split de T622 sin revisión visual humana final del asset actual. |
| T625 | `negro` | `ASSET_ROLE_RECONCILIATION_REQUIRED` | Falta resolver finish/identidad entre silver-base y cobre/oro histórico. |

## Evidencia preparada

El PDF muestra los bytes originales disponibles por SHA cuando están presentes
en los paquetes locales de transferencia v2. Cada caso conserva el nombre de
fuente, ZIP, dimensiones, SHA, rol y estado current/historical. Las imágenes
históricas, marketing o de otros colores se etiquetan como contexto y no como
masters elegibles automáticos.

- BP254: plata+negro, negro+plata y grafito.
- EC742: generic, celeste y las alternativas de color azul, gris y rosa.
- T575: cobre histórico, negro actual y contexto blanco/azul/rojo.
- T622: negro, rojo y contexto azul/verde; verde permanece como variante aparte.
- T625: cobre/oro histórico, silver-base, marketing cobre/oro y contexto blanco.

## Campos humanos

El CSV y el PDF dejan en blanco:

- decisión: `SELECT_A`, `SELECT_B`, `SELECT_C`, `NO_VALID_MASTER` o `REVIEW`;
- Geometry: `PASS`, `FAIL` o `REVIEW`;
- Identity: `PASS`, `FAIL` o `REVIEW`;
- Commercial visual: `PASS`, `FAIL` o `REVIEW`;
- Current commercial variant: `PASS`, `FAIL` o `REVIEW`;
- Notes.

La presencia de una imagen, su SHA o una clasificación previa no equivale a
`MASTER_APPROVED`.

## Artefactos

- `docs/catalog-governance/review-packs/CHK-CDO-01H2_FINAL_6_MASTER_EXCEPTIONS.pdf`
- `docs/catalog-governance/review-packs/CHK-CDO-01H2_FINAL_6_MASTER_EXCEPTIONS_decisions.csv`
- `docs/catalog-governance/CHK-CDO-01H2_FINAL_6_MASTER_EXCEPTIONS_PREPARATION.md`

## Próximo paso

Revisión humana de los seis casos en el PDF. Solo una decisión humana explícita
podrá cerrar cada variante; este checkpoint no las aplica automáticamente.
