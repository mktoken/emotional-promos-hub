# CHK-BRAND-WEB-B1 — Home shell + Header + Hero (solo inspección)

## 1. BASELINE VERIFIED
- Repo: proyecto Lovable 406ed62b-fa9a-4346-82b6-4b111a419b3b.
- Rama local: `edit/edt-6b8dcd98…`, la copia temporal de Lovable para `main`.
- HEAD = origin/main = `6f75ac27b9c9c831ea919f8bbb483a42a164875a`; divergencia 0/0; working tree limpio.
- Coincide con el baseline.

## Bloqueo: faltan las fuentes de verdad
En el repositorio no existe ninguno de estos archivos: `PE_HOME_BUILD_PLAN_V1.md`, `HOME_COPY_LOCK_V1.md`, `PE_VISUAL_DIRECTION_LOCK_V1.md`, `DESIGN.md` ni el PE WIREFRAME LOCK V1. `docs/` solo tiene 00–10 y MASTER-STATE.md, que no describe la Home nueva. Sin esos documentos no puedo seguir DESIGN.md sin reinterpretarlo. El copy del Hero sí está fijado en la orden y el plan lo usa tal cual.

## 2–3. Archivos y componentes implicados
- `src/pages/Index.tsx`: el `<nav>` en línea (logo, "Catálogo +10k" y "Mi solicitud" con contador) y el puente `onViewChange` de la landing.
- `src/components/LandingView.tsx`: solo la primera `<section>`, que es el HERO (líneas 110–235 aprox.).
- No existe un componente Header aparte ni un CTA "Cotizar". El equivalente es "Mi solicitud" (`setView("cart")`), que no se modifica.

## 4. Qué se reutiliza
- El logo `/images/logo-pe.gif`, con su clic a la landing.
- El botón "Mi solicitud" y su contador, sin cambios.
- El routing por `?view=` de Index.
- Los tokens de color de `index.css` (primary rojo, foreground, surface y card).

## 5. Qué se modifica (en BUILD)
- **Header:** la navegación pasa a Catálogo · Soluciones · Cómo funciona · Nosotros. "Catálogo" reutiliza el destino de la Ruta A. Soluciones, Cómo funciona y Nosotros apuntan a anclas de la Home (`#soluciones`, `#proceso` ya existe, `#nosotros`). Las anclas que aún no existen no hacen nada hasta checkpoints posteriores; queda pendiente decidir si se ocultan en B1. En móvil se usa un menú compacto, sin barra inferior tipo app.
- **Hero:** se cambia el copy por el aprobado:
  - eyebrow "Promocionales para empresas";
  - H1 "Artículos promocionales que dejan marca.";
  - subhead distinto en desktop y en móvil;
  - Ruta A ("Sé qué producto necesito" → botón "Explorar catálogo") y Ruta B ("Tengo un proyecto" → botón "Contar mi proyecto").
  - Se eliminan el badge "Plataforma B2B…", los checks "Sin registro / Stock en vivo", el botón verde de WhatsApp del Hero y la vitrina "Top Ventas Corporativas" con el badge "Catálogo Activo".
  - La consulta de productos destacados se conserva, porque también alimenta la sección siguiente.

## 6. Qué NO se modifica
Las demás secciones de la landing (Destacados, sección oscura, `#proceso`, `#garantia`), CatalogView, la ficha de producto, el carrito, los precios V2, el MOQ, la búsqueda, el CRM, el backend, la Auth, las funciones, la base de datos, las migraciones y los 47 errores TypeScript.

## 7. Destino de la Ruta A
Actual y propuesto: `/?view=catalog&choose=categories`, con el mismo puente que ya usa la landing en Index (`onViewChange("catalog")`). No se crean rutas nuevas. "Catálogo" en el header debería usar este mismo destino; hoy usa `/?view=catalog` sin `choose`, así que hay que decidir si se unifica.

## 8. Ruta B provisional
El botón "Contar mi proyecto" queda solo visual. Destino propuesto y documentado: el futuro formulario de proyecto, bloqueado por consentimiento, idempotencia y mapping. Opciones para B1, a decidir:
- (a) botón deshabilitado con texto "Próximamente";
- (b) enlace al WhatsApp existente (`WHATSAPP_HREF`), que no requiere backend.

No se crea endpoint, tabla, RPC, función ni formulario.

## 9. Assets
- Logo `logo-pe.gif`: REUSE.
- Fotografía principal del Hero: MISSING. Hoy el Hero no tiene foto; la vitrina se arma con productos de la base de datos. No se permite generar imágenes, así que hace falta una foto aprobada.
- Íconos lucide: REUSE.

## 10. Responsive
- Desktop: rejilla de 2 columnas (texto y rutas a la izquierda, foto a la derecha).
- Móvil: subhead corto, rutas apiladas a lo ancho y foto debajo o reducida.
- Header: la navegación se colapsa en menú por debajo de `md`; el logo y "Mi solicitud" siempre visibles.
- Sin desplazamiento horizontal en 360 px.

## 11. Riesgos
- Diseño sin DESIGN.md: riesgo de reinterpretación.
- Hero sin foto real.
- Enlaces del header a secciones que todavía no existen.
- Se pierde el botón de WhatsApp en el Hero (impacto en conversión).
- La regla de memoria "no alterar diseño ni textos" exige autorización explícita para este checkpoint (la orden la da).

## 12. Criterios de aceptación
- El copy coincide al pie de la letra con la orden.
- Ruta A navega a `/?view=catalog&choose=categories`.
- Ruta B no envía datos.
- El header muestra exactamente cuatro enlaces más "Mi solicitud", sin login, cuenta, dashboard ni IA.
- Sin colores fijos en el código (solo tokens).
- La build no agrega errores TypeScript nuevos (se mantienen los 47).

## 13. QA mínimo
- Capturas en 1280 px y 375 px.
- Clic en "Explorar catálogo" y en "Catálogo" del header para verificar la URL.
- Clic en "Contar mi proyecto" para verificar que no hay escritura en red.
- El contador de "Mi solicitud" sigue funcionando.
- Volver al inicio con el logo.
- Consola sin errores nuevos.

## 14. Rollback
Revertir el commit de B1. Solo toca dos archivos de frontend; no hay datos ni migraciones.

## 15. Archivos que cambiarían en BUILD
- `src/pages/Index.tsx` (nav)
- `src/components/LandingView.tsx` (solo la sección Hero)
- Opcional: extraer el header a `src/components/SiteHeader.tsx` (nuevo).
- Ninguno más.

CHK-BRAND-WEB-B1 — PLAN BLOCKED
[Faltan en el repositorio PE_HOME_BUILD_PLAN_V1.md, HOME_COPY_LOCK_V1.md, PE_VISUAL_DIRECTION_LOCK_V1.md, DESIGN.md y el wireframe; también falta la fotografía principal del Hero (MISSING, no se permite generarla). Se requiere subir esos documentos y la foto, y decidir el tratamiento de la Ruta B y de los enlaces sin sección.]
