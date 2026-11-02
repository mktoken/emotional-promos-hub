# PE-G4-CLOUD-03 — Postcheck 10 G4 V2 (solo lectura)

## Dictamen: PASS — 0 diferencias verificables

| Control | Resultado | Estado |
|---|---|:---:|
| Tablas | 6/6, RLS + FORCE, propietario pe_g4_v2_owner, marca PE_G4_V2_MANIFEST:20261101 | PASS |
| Funciones | 3/3, SECURITY DEFINER, search_path=public, pg_temp, propietario owner, marca | PASS |
| Políticas RLS | 18 (3 x 6): default_deny->PUBLIC, private_read->executor (SELECT), owner_execute->owner (ALL) | PASS |
| Exposición PUBLIC/anon/authenticated/service_role | 0 privilegios en tablas (los 7 tipos) y funciones | PASS |
| ACL tablas | solo owner (arwdDxtm) y executor (r) | PASS |
| ACL funciones | solo owner (X) y executor (X) | PASS |
| Executor | SELECT exclusivo en 6 tablas, EXECUTE en 3 funciones, sin CREATE | PASS |
| Retirada de permisos temporales | owner: 0 privilegios en las 10 fuentes, sin REFERENCES, sin CREATE en public; 0 grants fuera de las 6 tablas | PASS |
| Llaves foráneas | 7 | PASS |
| Roles | owner/executor sin login, super, bypass RLS ni herencia | PASS |
| Filas en tablas G4 V2 | 0 | PASS |

## Huellas de componentes protegidos

- Huella protegida (método 11, excluye los 9 objetos nuevos): `aad929fde0aa50ea8201d0c0035662ba` — idéntica al preflight. PASS.
- Cotizador `get_public_product_price_quote_v2`: MD5 de definición `21662733a076a045c9ca289218a2a3c8`, igual a PE-G4-CLOUD-01. PASS.
- Cotizador público: permisos sin cambio (anon, authenticated, service_role con EXECUTE). Las funciones G4 V2 no están conectadas.
- Banderas: `forpromotional_continuous_v1` y `g4_progressive_unitary_v1` siguen en enabled=false.
- G4 V1: funciones intactas (incluidas en la huella protegida).

## Observación (no es diferencia)

El MD5 directo de la definición del envoltorio `get_public_product_price_quote` dio `0417ee9e…`, distinto del `42913f3c…` de PE-G4-CLOUD-01 porque aquel se calculó con otro método. La huella protegida, que sí incluye esa función con el mismo método del preflight, coincide exactamente, por lo que no cambió.

## Estado

Instalación privada INSTALL_ONLY completa y verificada. Motor no activado ni conectado. Rollback 09 no ejecutado. Siguiente paso, solo con nueva autorización: integración operativa (permisos de lectura de las 10 fuentes).
