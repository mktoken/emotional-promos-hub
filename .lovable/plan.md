# Abrir drawer de categorías al entrar al catálogo desde Home (móvil)

## Causa raíz

`LandingView` navega a `?view=catalog` sin ninguna señal de intención. `CatalogView` renderiza el listado general y el drawer móvil solo se abre al pulsar "Filtros". Falta un parámetro efímero que indique "entra mostrando categorías" y lógica de auto-apertura acotada a móvil.

## Archivos a modificar

- `src/pages/Index.tsx`
- `src/components/CatalogView.tsx`
- `LandingView.tsx`: no se toca (el contrato `onViewChange("catalog")` se mantiene; la intención se agrega dentro de `Index.tsx`).

## Cambios

### 1. `src/pages/Index.tsx`

- Añadir un handler específico para la Home:
  ```ts
  const openCatalogFromLanding = (v: string) => {
    if (v === "catalog") {
      setSearchParams(new URLSearchParams({ view: "catalog", choose: "categories" }));
    } else {
      setView(v as ViewType);
    }
  };
  ```
- Pasar `openCatalogFromLanding` a `<LandingView onViewChange={...} />`.
- No modificar `setView` ni las entradas desde PDP, carrito o el botón "Catálogo +10k" del nav (esas conservan comportamiento actual sin `choose`).

### 2. `src/components/CatalogView.tsx`

- Importar `useIsMobile` desde `@/hooks/use-mobile`.
- Leer `const choose = searchParams.get("choose")`.
- Añadir `useRef<boolean>(false)` (p. ej. `autoOpenedRef`) para asegurar una sola auto-apertura por montaje.
- `useEffect` que dependa de `[choose, isMobile]`:
  - Si `choose === "categories"` y `autoOpenedRef.current === false`:
    - Si `isMobile === true`: `setMobileFiltersOpen(true)`.
    - En cualquier caso (móvil o desktop, siempre que `isMobile !== undefined`): construir `new URLSearchParams(searchParams)`, hacer `next.delete("choose")` y `setSearchParams(next, { replace: true })`.
    - Marcar `autoOpenedRef.current = true`.
  - Nota: esperar a que `isMobile` deje de ser `undefined` (evita decidir con estado sin resolver y evita loops); mientras tanto no se limpia el parámetro. El drawer es overlay, por lo que abrirlo tapa el listado y no hay "flash" perceptible.
- No tocar el resto de la lógica (paginación, filtros desktop, chips, carga de categorías, etc.).

### 3. Persistencia del cierre

- Al cerrar el drawer (`onOpenChange(false)`), no se toca `choose` porque ya fue eliminado en el efecto. `autoOpenedRef` impide reapertura durante la sesión de montaje.
- Al recargar: la URL ya no contiene `choose`, por lo que el efecto no dispara. No hay reapertura.

## Comportamiento resultante

- Home → "Explorar Catálogo" (móvil) → URL `?view=catalog&choose=categories` → drawer abierto en el primer render → URL se limpia a `?view=catalog`.
- Cerrar sin aplicar → catálogo general visible, no reabre.
- Aplicar categoría/subcategoría/"Todos los productos" → flujo actual del drawer intacto.
- Desktop → `choose` se ignora (drawer no se abre) y se limpia de la URL.
- Nav interno "Catálogo +10k", PDP back, carrito back → sin cambios.
- Browser Back desde catálogo → Home (la limpieza usa `replace`, así que no crea entrada extra en el historial).

## Pruebas

- Manual móvil 375/390px: Home → CTA → drawer abierto de inmediato; cerrar no reabre; recargar no reabre.
- Manual desktop: catálogo carga normal, sin drawer, sin `choose` en la URL.
- `bunx tsgo --noEmit` limpio.

## Restricciones respetadas

- Solo `Index.tsx` y `CatalogView.tsx` modificados.
- `MobileFiltersDrawer.tsx`, backend, taxonomía, filtros desktop, Home, WhatsApp y publish no se tocan.
- Sin dependencias nuevas ni refactors.  
  
IMPLEMENTA ÚNICAMENTE EL SIGUIENTE CAMBIO LOCALIZADO.
  OBJETIVO
  Cuando un usuario entre al catálogo desde la Home mediante el CTA “Explorar Catálogo” o cualquier CTA principal de la Home que use onViewChange("catalog"), en móvil debe abrirse automáticamente el drawer existente de categorías.
  El usuario no debe tener que:
  1. Entrar al catálogo general.
  2. Ver primero los 1,059 productos.
  3. Pulsar manualmente el botón “Filtros”.
  El flujo esperado es:
  Home
  → Explorar Catálogo
  → vista del catálogo
  → drawer de categorías abierto automáticamente
  → usuario elige categoría, subcategoría o “Todos los productos”
  → aplica la selección
  → se muestra el catálogo correspondiente
  MODO
  Build localizado.
  ALCANCE PERMITIDO
  Modificar únicamente:
  - src/pages/Index.tsx
  - src/components/CatalogView.tsx
  No modificar LandingView.tsx, salvo que sea técnicamente imprescindible y antes de hacerlo debes justificarlo en el resultado final.
  ESTADO ACTUAL
  - LandingView llama onViewChange("catalog").
  - Index.tsx recibe ese callback y navega al catálogo.
  - Actualmente la URL queda como:
    ?view=catalog
  - CatalogView renderiza inmediatamente el catálogo general.
  - MobileFiltersDrawer ya existe y funciona correctamente.
  - MobileFiltersDrawer ya muestra:
    - Categorías primero.
    - “Todos los productos”.
    - Categorías expandibles.
    - Subcategorías inline.
    - Botón Limpiar.
    - CTA para aplicar.
  - El drawer móvil actualmente solo se abre cuando el usuario pulsa “Filtros”.
  CAUSA RAÍZ
  No existe una señal que permita distinguir:
  A. Entrada al catálogo desde la Home, donde queremos abrir categorías automáticamente.
  B. Entrada al catálogo desde navegación interna, PDP, carrito, botón del header o regreso, donde el comportamiento actual debe mantenerse.
  SOLUCIÓN REQUERIDA
  Usar un parámetro temporal en la URL:
  choose=categories
  La navegación inicial desde la Home debe producir temporalmente:
  ?view=catalog&choose=categories
  CatalogView debe detectar ese parámetro, abrir el drawer móvil una sola vez y después eliminar choose=categories de la URL usando replace.
  No debe quedar choose=categories visible permanentemente en la URL.
  ==================================================
  CAMBIO 1 — src/pages/Index.tsx
  ==================================================
  1. Identifica el tipo real usado para las vistas, por ejemplo ViewType.
  2. Crea un handler específico para LandingView.
  Usa una implementación equivalente a esta, adaptada a los nombres reales del archivo:
  const openCatalogFromLanding = (nextView: ViewType) => {
    if (nextView === "catalog") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("view", "catalog");
      nextParams.set("choose", "categories");
      setSearchParams(nextParams);
      return;
    }
    setView(nextView);
  };
  3. Pasa este handler únicamente a LandingView:
  <LandingView onViewChange={openCatalogFromLanding} />
  4. No reemplaces el handler general setView.
  5. No agregues choose=categories en estos flujos:
  - regreso desde PDP;
  - regreso desde carrito;
  - navegación interna;
  - botón del header;
  - botón “Catálogo +10k”;
  - enlaces internos;
  - recarga directa del catálogo.
  6. Conserva cualquier parámetro existente que sea necesario.
  No construyas una URL nueva eliminando accidentalmente otros parámetros.
  7. No uses string + cast innecesario como:
  v as ViewType
  Usa el tipo real del callback siempre que sea compatible con LandingView.
  ==================================================
  CAMBIO 2 — src/components/CatalogView.tsx
  ==================================================
  1. Reutiliza el estado existente que controla MobileFiltersDrawer.
  Ejemplo esperado:
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  No crees un segundo drawer ni un segundo estado duplicado.
  2. Lee el parámetro temporal:
  const choose = searchParams.get("choose");
  3. Usa el hook móvil existente del proyecto:
  import { useIsMobile } from "@/hooks/use-mobile";
  const isMobile = useIsMobile();
  Antes de implementar, revisa el tipo real devuelto por useIsMobile.
  No asumas que devuelve undefined si su implementación devuelve solamente boolean.
  4. Crea una referencia para impedir aperturas repetidas:
  const autoOpenedCategoriesRef = useRef(false);
  5. Implementa una apertura automática de una sola vez.
  Preferencia técnica:
  - Usa useLayoutEffect para evitar que el catálogo general se pinte visiblemente antes de abrir el drawer.
  - Si useLayoutEffect produce un problema con el entorno actual, usa useEffect y bloquea temporalmente el contenido del catálogo mientras se resuelve la intención inicial.
  - No debe existir un flash visible del listado general antes de abrir el drawer.
  Implementación orientativa:
  useLayoutEffect(() => {
    if (choose !== "categories") return;
    if (autoOpenedCategoriesRef.current) return;
    // Si useIsMobile puede ser undefined, esperar hasta que se resuelva.
    // Si devuelve solo boolean, no agregar esta condición.
    if (isMobile === undefined) return;
    autoOpenedCategoriesRef.current = true;
    if (isMobile) {
      setMobileFiltersOpen(true);
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("choose");
    setSearchParams(nextParams, {
      replace: true,
    });
  }, [
    choose,
    isMobile,
    searchParams,
    setSearchParams,
  ]);
  Adapta el código a la API y tipos reales del proyecto.
  6. Comportamiento móvil:
  Cuando:
  choose === "categories"
  y el viewport es móvil
  Entonces:
  - abrir MobileFiltersDrawer automáticamente;
  - abrirlo una sola vez;
  - eliminar choose de la URL con replace;
  - conservar view=catalog;
  - conservar otros parámetros existentes;
  - no crear una entrada adicional en el historial.
  7. Comportamiento desktop:
  Cuando:
  choose === "categories"
  y no es móvil
  Entonces:
  - no abrir el drawer;
  - eliminar choose=categories de la URL usando replace;
  - mantener el catálogo desktop exactamente como está.
  8. Al cerrar el drawer con X:
  - debe quedar cerrado;
  - no debe volver a abrirse;
  - debe mostrarse el catálogo general;
  - no debe reaparecer choose=categories en la URL.
  9. Al aplicar una categoría o subcategoría:
  - debe usarse la lógica actual;
  - debe cerrar el drawer;
  - debe actualizar el catálogo;
  - no debe modificar la lógica del RPC;
  - no debe duplicar llamadas innecesarias.
  10. Al elegir “Todos los productos”:
  - debe mostrarse el catálogo general;
  - debe conservarse el comportamiento actual del drawer;
  - no debe reabrirse automáticamente.
  11. Al recargar después de cerrar o aplicar:
  - el drawer no debe abrirse automáticamente;
  - choose ya no debe estar en la URL.
  12. Browser Back:
  La secuencia debe ser:
  Home
  → catálogo con drawer abierto
  → Browser Back
  → Home
  La limpieza del parámetro choose debe usar replace para no crear una pantalla intermedia en el historial.
  ==================================================
  EVITAR FLASH VISUAL
  ==================================================
  No aceptes una implementación donde se vea durante un instante:
  “Mostrando 1–24 de 1,059 productos”
  y después aparezca el drawer.
  La apertura debe ocurrir antes de que el usuario perciba el catálogo general.
  Opción preferida:
  - useLayoutEffect.
  Opción alternativa:
  - mientras choose === "categories" y todavía no se haya resuelto isMobile, renderizar un contenedor neutro o skeleton mínimo;
  - después abrir el drawer;
  - no crear un loading permanente.
  ==================================================
  NO MODIFICAR
  ==================================================
  No modificar:
  - MobileFiltersDrawer.tsx.
  - Supabase.
  - tablas.
  - vistas.
  - funciones SQL.
  - RPC.
  - RLS.
  - permisos.
  - stock.
  - precios.
  - taxonomía.
  - búsqueda.
  - paginación.
  - tarjetas de producto.
  - filtros desktop.
  - chips existentes.
  - diseño de la Home.
  - CTA de WhatsApp.
  - botón flotante de Asesoría.
  - PDP.
  - carrito.
  - header.
  - navegación interna.
  - estilos no relacionados.
  - dependencias.
  - configuración de producción.
  No instalar nuevas librerías.
  No crear un segundo drawer.
  No duplicar CatalogView.
  No hacer refactors no relacionados.
  No hacer Publish.
  ==================================================
  PRUEBAS OBLIGATORIAS
  ==================================================
  Realiza y reporta estas pruebas:
  1. Móvil 375px:
  Home
  → pulsar “Explorar Catálogo”
  → el drawer aparece abierto automáticamente.
  Resultado esperado:
  PASS.
  2. Móvil 390px:
  Mismo flujo.
  Resultado esperado:
  PASS.
  3. Flash visual:
  No debe verse el listado general antes de aparecer el drawer.
  Resultado esperado:
  PASS.
  4. Cerrar con X:
  - drawer se cierra;
  - aparece catálogo general;
  - no vuelve a abrirse.
  Resultado esperado:
  PASS.
  5. Elegir categoría:
  - seleccionar una categoría;
  - aplicar;
  - drawer se cierra;
  - catálogo queda filtrado.
  Resultado esperado:
  PASS.
  6. Elegir subcategoría:
  - expandir una categoría;
  - seleccionar una subcategoría;
  - aplicar;
  - catálogo queda filtrado por la subcategoría.
  Resultado esperado:
  PASS.
  7. Elegir “Todos los productos”:
  - debe mostrar el catálogo general;
  - no debe volver a abrir el drawer.
  Resultado esperado:
  PASS.
  8. URL:
  Después de abrir automáticamente el drawer, la URL debe quedar sin:
  choose=categories
  Debe conservar:
  view=catalog
  Resultado esperado:
  PASS.
  9. Recarga:
  Después de cerrar el drawer, recargar la página.
  El drawer no debe reabrirse automáticamente.
  Resultado esperado:
  PASS.
  10. Browser Back:
  Desde el catálogo, pulsar Back.
  Debe regresar directamente a Home.
  No debe existir una entrada intermedia provocada por la limpieza de choose.
  Resultado esperado:
  PASS.
  11. Desktop:
  Home
  → Explorar Catálogo.
  El catálogo debe abrir normalmente sin drawer.
  choose debe eliminarse de la URL.
  Resultado esperado:
  PASS.
  12. Navegación interna:
  PDP, carrito, header y navegación interna deben conservar su comportamiento actual.
  Resultado esperado:
  PASS.
  13. Typecheck:
  Ejecutar:
  bunx tsgo --noEmit
  Resultado esperado:
  sin errores.
  ==================================================
  CRITERIOS DE ACEPTACIÓN
  ==================================================
  El trabajo está terminado únicamente cuando:
  - entrar desde Home en móvil abre automáticamente categorías;
  - no se necesita pulsar “Filtros”;
  - no existe flash visible del catálogo general;
  - el drawer no se reabre después de cerrarlo;
  - recargar no reabre el drawer;
  - desktop no cambia;
  - navegación interna no cambia;
  - la URL queda limpia;
  - Browser Back vuelve directamente a Home;
  - TypeScript no presenta errores;
  - solo se modifican los archivos permitidos;
  - no se realiza Publish.
  ==================================================
  RESULTADO FINAL
  ==================================================
  Al terminar, responde únicamente con:
  1. Archivos modificados.
  2. Causa raíz confirmada.
  3. Cambios realizados por archivo.
  4. Cómo se evitó el flash visual.
  5. Pruebas ejecutadas con PASS o FAIL.
  6. Resultado de bunx tsgo --noEmit.
  7. Confirmación explícita:
     - Supabase no modificado.
     - RPC no modificado.
     - Desktop no modificado.
     - No Publish.