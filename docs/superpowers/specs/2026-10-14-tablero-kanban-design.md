# Handoff: Tablero (kanban) de app.molpo.ar/tablero

## Overview
Rediseño del tablero de pedidos (tickets) de `app.molpo.ar/tablero/`. Problemas del actual: sin búsqueda ni filtros, mover un pedido exige un `<select>` por tarjeta, no hay vista de lista, no hay detalle sin salir de la página, no hay señales de qué atender primero. El rediseño agrega búsqueda, filtros con contadores, orden, vista lista, drag & drop con deshacer, panel de detalle con respuesta inline, atajos de teclado y alertas de pedidos sin movimiento.

## About the Design Files
Los archivos de `reference/` son **referencias de diseño en HTML** (prototipo con datos de ejemplo), no código de producción. La tarea es **recrearlos en el codebase existente** (Next.js App Router, CSS Modules, server actions), usando sus patrones. No copiar el HTML ni `support.js`.

Archivo principal: `reference/Tablero.dc.html` (template + clase lógica al final: constantes, `visibles()`, `renderVals()`).

## Fidelity
**Alta fidelidad** en estructura, comportamiento y uso de tokens del design system molpo (variables CSS, no hexes sueltos). Reproducir con las variables existentes.

## Codebase actual (mapeo)
- `components/Tablero.tsx` (server component: columnas → `<ul>` de `Tarjeta`) → pasa a client component con estado de filtros/vista/detalle.
- `components/MoverEstado.tsx` (select por tarjeta + server action `moverTicket`) → se reemplaza por drag & drop y botones de estado en el detalle; reutilizar `moverTicket` (`app/(privado)/tablero/acciones`).
- `lib/tablero.ts` (`agruparPorEstado`, `COLUMNAS = ESTADOS`) → mantener; agregar helpers de filtro/orden testeables (misma convención: sin acceso a base, `.ts` con extensión explícita).
- `TarjetaData` actual: `id, titulo, tipo, prioridad, prioridadEtiqueta, cliente, respuesta, capturas, primerAdjunto, externa`. **Campos nuevos necesarios**: `estado`, `creado` (fecha), `actividad` (última actividad), `reporta` (nombre), `email`, `url`, `detalle` (descripción). Rutas existentes: detalle completo `/tablero/{id}/`, adjuntos `/adjuntos/{id}`, `hrefSeguro()` para el link KOMUK Hub.
- Roles: `esAdmin` ya existe. Admin ve todos los clientes y puede mover/responder; cliente ve solo los suyos, lectura de la respuesta.

## Screens / Views

### Layout general
Grid de página: `grid-template-columns: 220px minmax(0,1fr)`, alto `100vh`, `overflow:hidden`. Fuente `--font-inter`, 14px, fondo `--bg`, texto `--text`.

**Sidebar (220px)**: fondo `--azul-profundo`, padding `20px 14px`. Logo "molpo" en `--font-founders` 24px, blanco, letter-spacing -.02em. Links 14px/500, padding `10px 12px`, radio 10px; activo `#fff` sobre `rgba(255,255,255,.12)`; inactivo `--celeste-palido`, hover `rgba(255,255,255,.08)`.
- Admin: Tablero, Clientes, Feedback. Cliente: Mis pedidos, Cargar pedido, Dejar feedback.
- Pie: rol (Admin/Cliente) y nombre.

**Área principal**, de arriba a abajo:
1. **Encabezado**: título ("Tablero" admin / "Tus pedidos" cliente), resumen `"{n} pedidos · {m} sin cerrar"`, estado de sincronización `"KOMUK Hub · sincronizado hace {x} min"` + botón **Sincronizar** (estado "Sincronizando…", al terminar "sincronizado recién" y toast). Solo admin ve KOMUK Hub.
2. **Alertas** (chips clicables, solo si hay): `"{n} de prioridad alta"` (aplica filtro prioridad=alta) y `"{n} sin movimiento hace más de 7 días"` (activa atajo Estancados). Color de alerta: texto `--tb-alerta`, fondo `--tb-alerta-bg`.
3. **Barra de herramientas**:
   - Buscador (foco con `/`). Placeholder admin: "Buscar por título, #id, cliente o quién reporta"; cliente: "Buscar por título o #id". Coincide por prefijo de id (acepta `#`), o substring en título, cliente, reporta.
   - Dropdowns multiselección con checkbox y contador por opción: **Cliente** (solo admin, lista dinámica), **Tipo** (Bug/Mejora/Consulta), **Prioridad** (Alta/Media/Baja, con punto de color). El botón muestra badge con cantidad seleccionada y fondo `--chip` + borde `--azul-medio` cuando hay selección; cada menú tiene "Limpiar".
   - Dropdown **Orden**: Prioridad (default; alta primero, luego más nuevo), Última actividad, Más nuevos, Más viejos.
   - **Atajos** (chips toggle con contador): Sin respuesta (admin; sin respuesta y abierto/en curso), Sin movimiento +7 d, Con capturas, KOMUK Hub (admin).
   - Cuando hay filtros: `"{visibles} de {total}"` + botón **Limpiar filtros**.
   - Toggle de vista **Tablero / Lista** (segmentado; activo `--chip`, texto `--text-strong`).
   - Click fuera de un menú abierto lo cierra.
4. **Contenido** (una de dos vistas).

### Vista Tablero
4 columnas por estado, **cada una con scroll vertical propio** (la página no scrollea): Abierto `#4e78a9`, En curso `#bf8b23`, Resuelto `#2e9e6b`, Cerrado `#8a97a6`. Cerrado arranca **colapsada**.
- Cabecera de columna: punto de color, nombre, contador (`"{filtrados} de {total}"` si hay filtros), badge "{n} altas" si hay altas vivas, botón colapsar/expandir (`Expandir {estado}`). Colapsada = tira angosta vertical.
- Columna: fondo `--seccion-alt`, borde `--borde-2`; en drag-over fondo `--chip-2` y borde `--azul-medio`. Vacía: "Nada acá" / "Nada con estos filtros" / "Soltá acá" durante un drag.
- **Tarjeta**: fondo `--bg`, borde `--borde` (seleccionada `--azul-medio`), radio `--r-card`-escala chica, padding `11px 12px` (compacta `8px 10px`). Contiene: punto/borde de prioridad con `title="Prioridad alta"`, `#id · Tipo`, cliente (solo admin), título (máx. líneas con ellipsis), edad de última actividad ("hoy", "ayer", "hace N d"), ícono de capturas con cantidad, indicador de respuesta, badge KOMUK Hub (link externo). Si está estancada: "Sin movimiento hace N d" en color de alerta. En densidad compacta se oculta el pie. Click abre el detalle. Admin: `draggable`, cursor `grab`, opacidad .4 mientras se arrastra.

### Vista Lista
Tabla con grid: admin `56px minmax(240px,1fr) 150px 84px 90px 100px 90px`; cliente sin la columna cliente. Columnas: #, título (+ badge KOMUK), cliente, tipo, prioridad, estado (con punto de color), actividad (color `--tb-alerta` si estancado, si no `--texto-tenue`). Fila seleccionada fondo `--chip`. Estado vacío: mensaje con filtros activos.

### Panel de detalle (drawer derecho)
Se abre al click en tarjeta/fila, sin salir de la página. Contenido:
- Encabezado: `#id`, tipo, prioridad (color), estado; link "Abrir página completa" → `/tablero/{id}/`; badge KOMUK Hub; botón cerrar; navegación **anterior / siguiente** con "{i} de {n}" (o "fuera del filtro"), respetando el orden y filtros actuales (en tablero: orden por columnas visibles, sin las colapsadas).
- Título, descripción, aviso de estancado.
- Campos: Cliente (admin), Reporta, Email, URL, Creado, Última actividad (`fecha (edad)`).
- Capturas: grilla con `Capturas ({n})`, cada una enlaza `/adjuntos/{id}`.
- **Estado**: botones segmentados (Abierto / En curso / Resuelto / Cerrado); el activo usa `--accent` de fondo y `--bg` de texto. Cambiar estado = mismo flujo que mover.
- **Respuesta**: admin ve textarea con borrador y botón **Guardar** (deshabilitado si no hay cambios), nota "Le llega por mail a {email}". Cliente ve la respuesta en solo lectura.

## Interactions & Behavior
- **Mover pedido** (drag & drop a otra columna, o botón de estado en el detalle): actualización optimista, `actividad = hoy`, toast `"#{id} pasó a {Estado}. Le avisamos a {reporta}."` con **Deshacer** (5 s). Persistir con la server action `moverTicket`; deshacer revierte con una segunda llamada. Solo admin.
- **Guardar respuesta**: toast "Respuesta guardada. Le llega por mail a {reporta}." (o "Respuesta borrada."); no hace nada si no hay cambios.
- **Atajos de teclado**: `/` enfoca búsqueda; `Esc` cierra menú, luego detalle, y desenfoca el input; `j`/`↓` y `k`/`↑` navegan pedidos con el detalle abierto. Ignorar teclas si el foco está en input/textarea/select (salvo Esc).
- Estancado = pedido abierto o en curso con ≥ 7 días sin actividad.
- Filtros: AND entre grupos; OR dentro de cada grupo multiselección. Los contadores de cada opción se calculan sobre el total base (no el filtrado).
- Transiciones sugeridas: 120–160 ms ease en hover, drag-over y apertura del drawer.
- Responsive: bajo ~900px, sidebar colapsa y el detalle ocupa pantalla completa; el tablero pasa a scroll horizontal con columnas de ~280px (no definido en el prototipo, resolver con los mismos tokens).

## State Management
`tickets`, `q`, `clientes[]`, `tipos[]`, `prios[]`, `atajos[]`, `orden`, `vista` ('tablero'|'lista'), `menu` (dropdown abierto), `colapsadas {estado:bool}`, `abierto` (id), `borrador`, `dragId`, `overCol`, `toast {txt, undo?}`, `syncMin`, `syncing`. Sugerido: persistir en query string (`?q=&cliente=&tipo=&prio=&orden=&vista=`) y `densidad`/`colapsadas` en localStorage. Datos: el server component carga los tickets (ya filtrados por rol) y los pasa al client component; mover/guardar vía server actions con `revalidatePath`.

## Design Tokens
Usar las variables del design system molpo (`styles.css`):
- Marca: `--azul-profundo --azul-primario --azul-medio --azul-claro --celeste-palido`
- Superficies/texto: `--bg --seccion-alt --text --text-strong --texto-cuerpo --texto-tenue`
- Bordes/acento: `--borde --borde-2 --chip --chip-2 --accent`
- Radios: `--r-boton` 12px, `--r-card` 16px, `--r-pill` 999px
- Fuentes: `--font-founders` (títulos/logo), `--font-inter` (UI)
- Nuevos (definir en el CSS del tablero): `--tb-alta` `#b4231f` (dark `#ff9d99`), `--tb-alerta` `#8a5200` (dark `#e7bd62`), `--tb-alerta-bg` `rgba(191,139,35,.16)` (dark `rgba(223,176,74,.14)`)
- Estados: abierto `#4e78a9`, en curso `#bf8b23`, resuelto `#2e9e6b`, cerrado `#8a97a6`. Prioridad: alta `--tb-alta`, media `#4e78a9`, baja `#a3b0be`.
- Escala tipográfica: UI 14px; metadatos 12–13px; títulos de tarjeta 14px/500.
- Tema claro/oscuro vía `data-theme` (ya soportado).

## Assets
Sin imágenes ni íconos externos en el prototipo; las capturas son placeholders. Usar `/adjuntos/{id}` reales y el set de íconos del codebase.

## Copy
Español rioplatense (voseo). Textos exactos en `reference/Tablero.dc.html`.

## Files
- `reference/Tablero.dc.html` — prototipo completo (props de preview: `rol` admin/cliente, `densidad` cómoda/compacta, `tema` claro/oscuro).
- `reference/support.js`, `reference/ds-base.js` — soporte del prototipo; no se portan.
- Origen: `components/Tablero.tsx`, `components/MoverEstado.tsx`, `components/Tablero.module.css`, `lib/tablero.ts`, `lib/tickets.ts`.
