# Tablero kanban con filtros y panel de detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer `app.molpo.ar/tablero/` como tablero dinámico (búsqueda, filtros con contadores, orden, atajos, vista lista, panel de detalle, drag & drop con deshacer, atajos de teclado) y arreglar el cambio de estado desde la página del pedido (`/tablero/{id}/`).

**Architecture:** El server component (`app/(privado)/tablero/page.tsx`) carga los tickets ya filtrados por rol, los aplana a `TarjetaTablero` (fechas en ms, URL de KOMUK ya saneada) y se los pasa a un client component (`components/Tablero.tsx`) que tiene todo el estado de UI. Filtrar, ordenar y navegar es lógica pura en `lib/tablero.ts` con tests en `node:test`. Mover y responder desde el tablero usan una server action nueva que devuelve resultado (`guardarTicket`) con `useOptimistic`; el form de la página del pedido sigue usando `moverTicket` (redirect), y ambas comparten el mismo núcleo `guardar()`. Los filtros viven en la query string (`history.replaceState`), las columnas colapsadas en `localStorage`.

**Tech Stack:** Next.js 15.5 App Router, React 19 (`useOptimistic`, `useFormStatus`), TypeScript 5.9, CSS Modules, postgres (porsager), `node --test` con type stripping, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-tablero-kanban-design.md` (handoff de diseño). Prototipo con textos y lógica exactos: `docs/superpowers/specs/2026-10-14-tablero-kanban-referencia/Tablero.dc.html` (la clase `Component` al final: `visibles()`, `renderVals()`). Pedido del usuario: "aplicar el refactor para el tablero kanban para que funcione mejor, con filtros y más dinámico. Además revisar el cambio de estado desde el id del tkt."

## Global Constraints

- Nada de dependencias nuevas: `package.json` no se toca. Drag & drop con la API HTML5 nativa.
- Colores y medidas con variables del design system (`app/globals.css`): `--bg --seccion-alt --text --text-strong --texto-cuerpo --texto-tenue --borde --borde-2 --chip --chip-2 --accent --azul-medio --link --focus-ring --r-boton --r-card --r-pill --sombra-card`. Variables nuevas sólo las del handoff: `--tb-alta #b4231f` (oscuro `#ff9d99`), `--tb-alerta #8a5200` (oscuro `#e7bd62`), `--tb-alerta-bg rgba(191,139,35,.16)` (oscuro `rgba(223,176,74,.14)`); estados abierto `#4e78a9`, en curso `#bf8b23`, resuelto `#2e9e6b`, cerrado `#8a97a6`; prioridad media `#4e78a9`, baja `#a3b0be`.
- Tema oscuro: mismo patrón que `app/globals.css` → `@media (prefers-color-scheme: dark) { :root:not([data-theme]) … }` y `:root[data-theme="dark"] …`.
- Copy en español rioplatense (voseo), textos exactos del prototipo. Comentarios de código en español, escasos, explican el porqué.
- Imports dentro de `lib/*.ts` que consumen los tests usan extensión `.ts` explícita (`"./tickets.ts"`). Fuera de `lib/`, alias `@/`.
- Tests unitarios: `lib/<modulo>.test.mjs` con `node:test` + `node:assert/strict`, corren con `pnpm test`.
- E2E: Playwright (`pnpm test:e2e`), necesita `.env.local` con `DATABASE_URL` apuntando a `molpo_soporte_test` (la siembra lo exige). Proyectos por sufijo: `*.admin.spec.ts`, `*.cliente.spec.ts`, `*.anonimo.spec.ts`. Los tests que escriben se siembran su propio ticket con `altaTicket()`.
- Commits: Conventional Commits (`feat(tablero): …`), header ≤72, sin trailers ni menciones de IA (regla del repo `.ai/global/rules/60-vcs.md`).
- Breakpoint mobile: `860px` (el mismo que usa `app/(privado)/App.module.css`).
- Verificación al cerrar cada task: `pnpm test` y `pnpm typecheck` en verde; los e2e que toca la task, en verde.

## Review Focus

1. **Búsqueda con tildes:** buscar "caneria" tiene que encontrar "cañería" (el propio prototipo trae ese bug de ejemplo, #117). → test unitario en Task 1 y e2e en Task 2.
2. **Deshacer un movimiento:** el cliente ya recibió el mail; deshacer no le manda un segundo mail y la tarjeta vuelve de verdad (no sólo en pantalla), aunque la función de deshacer corra varios renders después. → e2e con recarga en Task 5.
3. **Dos personas sobre la misma respuesta:** guardar desde el panel no pisa una respuesta que otra pestaña cambió mientras tanto. → e2e en Task 4.
4. **URLs viejas o rotas:** `?tipo=nada&orden=x`, links viejos con `?cliente=X`, o un cliente que pega `?cliente=OtraEmpresa`, no rompen la página ni muestran pedidos ajenos. → unitario en Task 1, e2e en Task 2.
5. **Soltar donde no corresponde:** soltar en la misma columna, o arrastrar algo de afuera (un link, un archivo) no mueve nada ni muestra toast. → e2e en Task 5.

## Fuera de alcance (decidido, no olvidado)

- Sidebar: ya existe en `app/(privado)/layout.tsx` con el mismo diseño; no se toca.
- Densidad "compacta": es una prop de preview del prototipo, no una feature pedida.
- "Sincronizar" sigue siendo un form con redirect (`/tablero/?sync=ok`): pierde los filtros de la URL. Si molesta, pasar `sincronizarKomuk` a devolver resultado como `guardarTicket`.
- Devolver el foco a la tarjeta al cerrar el panel.

---

### Task 1: Lógica pura del tablero

**Files:**
- Modify: `lib/tablero.ts`
- Test: `lib/tablero.test.mjs`

**Interfaces:**
- Consumes: `ESTADOS, TIPOS, PRIORIDADES, Estado, Tipo, Prioridad` de `lib/tickets.ts`.
- Produces (todo exportado desde `lib/tablero.ts`):
  - `type TarjetaTablero = { id: number; titulo: string; tipo: Tipo; prioridad: Prioridad; estado: Estado; cliente: string; reporta: string | null; email: string | null; url: string | null; detalle: string; respuesta: string | null; creado: number; actividad: number; adjuntos: { id: number; nombre: string }[]; externa: string | null }` (`creado`/`actividad` en ms epoch; `externa` = href ya saneado con `hrefSeguro`, o `null` si no es de KOMUK Hub)
  - `DIA_MS = 86_400_000`, `DIAS_ESTANCADO = 7`
  - `ATAJOS = ["sin_respuesta","estancados","capturas","komuk"] as const`, `type Atajo`, `ATAJOS_ADMIN: readonly Atajo[]`, `ETIQUETAS_ATAJO: Record<Atajo,string>`
  - `ORDENES = ["prioridad","actividad","nuevos","viejos"] as const`, `type Orden`, `ETIQUETAS_ORDEN: Record<Orden,string>`
  - `VISTAS = ["tablero","lista"] as const`, `type Vista`
  - `type Filtros = { q: string; clientes: string[]; tipos: Tipo[]; prioridades: Prioridad[]; atajos: Atajo[]; orden: Orden; vista: Vista }`, `FILTROS_INICIALES: Filtros`
  - `diasDesde(ms: number, ahora: number): number`, `edad(dias: number): string`, `vivo(t: { estado: Estado }): boolean`, `estancado(t: { estado: Estado; actividad: number }, ahora: number): boolean`, `cumpleAtajo(atajo: Atajo, t: TarjetaTablero, ahora: number): boolean`
  - `filtrar(tickets: TarjetaTablero[], f: Filtros, esAdmin: boolean, ahora: number): TarjetaTablero[]` (filtra y ordena, no muta)
  - `hayFiltros(f: Filtros, esAdmin: boolean): boolean`
  - `ordenNavegacion(visibles: TarjetaTablero[], vista: Vista, colapsadas: Partial<Record<Estado, boolean>>): number[]`
  - `filtrosDesdeQuery(query: Record<string, string | string[] | undefined>): Filtros`, `filtrosAQuery(f: Filtros): string`
  - `textoSync(ultima: number | null, ahora: number): string`
  - Se mantienen `COLUMNAS` y `agruparPorEstado` (se borra en Task 2).

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `lib/tablero.test.mjs` (los dos tests de `agruparPorEstado` quedan como están) y ampliar el import de la línea 3:

```js
import {
  agruparPorEstado,
  diasDesde,
  edad,
  estancado,
  filtrar,
  filtrosAQuery,
  filtrosDesdeQuery,
  hayFiltros,
  ordenNavegacion,
  textoSync,
  DIA_MS,
  FILTROS_INICIALES,
} from "./tablero.ts";
```

```js
const AHORA = Date.UTC(2026, 9, 14, 15);
const hace = (dias) => AHORA - dias * DIA_MS;
const tarjeta = (datos) => ({
  id: 1,
  titulo: "Algo",
  tipo: "bug",
  prioridad: "media",
  estado: "abierto",
  cliente: "Panadería Sol",
  reporta: "Ana",
  email: null,
  url: null,
  detalle: "",
  respuesta: null,
  creado: hace(1),
  actividad: hace(1),
  adjuntos: [],
  externa: null,
  ...datos,
});
const filtros = (datos) => ({ ...FILTROS_INICIALES, ...datos });
const ids = (lista) => lista.map((t) => t.id);

test("diasDesde redondea para abajo y nunca da negativo", () => {
  assert.equal(diasDesde(hace(0), AHORA), 0);
  assert.equal(diasDesde(AHORA - DIA_MS + 1, AHORA), 0);
  assert.equal(diasDesde(hace(3), AHORA), 3);
  // Un cambio optimista recién hecho puede quedar "en el futuro" del server.
  assert.equal(diasDesde(AHORA + 5000, AHORA), 0);
});

test("edad dice hoy, ayer o hace N d", () => {
  assert.equal(edad(0), "hoy");
  assert.equal(edad(1), "ayer");
  assert.equal(edad(12), "hace 12 d");
});

test("estancado: vivo y 7 días o más sin actividad", () => {
  assert.equal(estancado(tarjeta({ actividad: hace(7) }), AHORA), true);
  assert.equal(estancado(tarjeta({ actividad: hace(6) }), AHORA), false);
  assert.equal(estancado(tarjeta({ estado: "en_curso", actividad: hace(30) }), AHORA), true);
  assert.equal(estancado(tarjeta({ estado: "resuelto", actividad: hace(30) }), AHORA), false);
});

test("buscar por #id compara por prefijo, con o sin numeral", () => {
  const lista = [tarjeta({ id: 12 }), tarjeta({ id: 120 }), tarjeta({ id: 21 })];
  assert.deepEqual(ids(filtrar(lista, filtros({ q: "#12" }), true, AHORA)).sort(), [12, 120]);
  assert.deepEqual(ids(filtrar(lista, filtros({ q: "21" }), true, AHORA)), [21]);
});

test("buscar ignora mayúsculas, espacios y tildes en título, cliente y quien reporta", () => {
  const lista = [
    tarjeta({ id: 1, titulo: "La cañería pierde" }),
    tarjeta({ id: 2, cliente: "Ferretería Galván" }),
    tarjeta({ id: 3, reporta: "Martín Ojeda" }),
    tarjeta({ id: 4 }),
  ];
  assert.deepEqual(ids(filtrar(lista, filtros({ q: "CANERIA" }), true, AHORA)), [1]);
  assert.deepEqual(ids(filtrar(lista, filtros({ q: "galvan" }), true, AHORA)), [2]);
  assert.deepEqual(ids(filtrar(lista, filtros({ q: "  martin " }), true, AHORA)), [3]);
});

test("los filtros se combinan con Y entre grupos y O dentro de cada grupo", () => {
  const lista = [
    tarjeta({ id: 1, tipo: "bug", prioridad: "alta" }),
    tarjeta({ id: 2, tipo: "mejora", prioridad: "alta" }),
    tarjeta({ id: 3, tipo: "consulta", prioridad: "alta" }),
    tarjeta({ id: 4, tipo: "bug", prioridad: "baja" }),
  ];
  const f = filtros({ tipos: ["bug", "mejora"], prioridades: ["alta"] });
  assert.deepEqual(ids(filtrar(lista, f, true, AHORA)).sort(), [1, 2]);
});

test("el filtro de cliente sólo aplica al admin", () => {
  const lista = [tarjeta({ id: 1, cliente: "A" }), tarjeta({ id: 2, cliente: "B" })];
  assert.deepEqual(ids(filtrar(lista, filtros({ clientes: ["A"] }), true, AHORA)), [1]);
  assert.deepEqual(ids(filtrar(lista, filtros({ clientes: ["A"] }), false, AHORA)).sort(), [1, 2]);
});

test("atajos", () => {
  const lista = [
    tarjeta({ id: 1 }), // sin respuesta y viva
    tarjeta({ id: 2, respuesta: "Ya está" }),
    tarjeta({ id: 3, estado: "cerrado" }), // sin respuesta, pero cerrada
    tarjeta({ id: 4, respuesta: "x", adjuntos: [{ id: 9, nombre: "a.png" }] }),
    tarjeta({ id: 5, respuesta: "x", externa: "https://hub.example/r/1" }),
    tarjeta({ id: 6, respuesta: "x", actividad: hace(10) }),
  ];
  const con = (atajos, esAdmin = true) =>
    ids(filtrar(lista, filtros({ atajos }), esAdmin, AHORA)).sort();
  assert.deepEqual(con(["sin_respuesta"]), [1]);
  assert.deepEqual(con(["capturas"]), [4]);
  assert.deepEqual(con(["komuk"]), [5]);
  assert.deepEqual(con(["estancados"]), [6]);
  // Los atajos de admin no le recortan nada al cliente aunque vengan en la URL.
  assert.deepEqual(con(["komuk"], false), [1, 2, 3, 4, 5, 6]);
});

test("los cuatro órdenes", () => {
  const lista = [
    tarjeta({ id: 1, prioridad: "baja", creado: hace(1), actividad: hace(1) }),
    tarjeta({ id: 2, prioridad: "alta", creado: hace(5), actividad: hace(4) }),
    tarjeta({ id: 3, prioridad: "alta", creado: hace(2), actividad: hace(9) }),
    tarjeta({ id: 4, prioridad: "media", creado: hace(9), actividad: hace(0) }),
  ];
  const por = (orden) => ids(filtrar(lista, filtros({ orden }), true, AHORA));
  assert.deepEqual(por("prioridad"), [3, 2, 4, 1]); // alta primero, después el más nuevo
  assert.deepEqual(por("actividad"), [4, 1, 2, 3]);
  assert.deepEqual(por("nuevos"), [1, 3, 2, 4]);
  assert.deepEqual(por("viejos"), [4, 2, 3, 1]);
});

test("filtrar no muta la lista que recibe", () => {
  const lista = [tarjeta({ id: 1, prioridad: "baja" }), tarjeta({ id: 2, prioridad: "alta" })];
  filtrar(lista, FILTROS_INICIALES, true, AHORA);
  assert.deepEqual(ids(lista), [1, 2]);
});

test("hayFiltros ignora orden, vista, espacios y lo que el rol no puede usar", () => {
  assert.equal(hayFiltros(filtros({ q: "   ", orden: "viejos", vista: "lista" }), true), false);
  assert.equal(hayFiltros(filtros({ clientes: ["A"] }), false), false);
  assert.equal(hayFiltros(filtros({ clientes: ["A"] }), true), true);
  assert.equal(hayFiltros(filtros({ atajos: ["komuk"] }), false), false);
  assert.equal(hayFiltros(filtros({ atajos: ["capturas"] }), false), true);
});

test("ordenNavegacion sigue las columnas visibles y saltea las colapsadas", () => {
  const lista = [
    tarjeta({ id: 1, estado: "cerrado" }),
    tarjeta({ id: 2, estado: "en_curso" }),
    tarjeta({ id: 3, estado: "abierto" }),
  ];
  assert.deepEqual(ordenNavegacion(lista, "tablero", { cerrado: true }), [3, 2]);
  assert.deepEqual(ordenNavegacion(lista, "tablero", {}), [3, 2, 1]);
  assert.deepEqual(ordenNavegacion(lista, "lista", { cerrado: true }), [1, 2, 3]);
});

test("filtrosDesdeQuery descarta lo desconocido y acepta el ?cliente= viejo", () => {
  assert.deepEqual(
    filtrosDesdeQuery({
      cliente: "Panadería Sol",
      tipo: ["bug", "otro", "bug"],
      prio: "urgente",
      orden: "x",
      vista: "lista",
      atajo: "komuk",
    }),
    { ...FILTROS_INICIALES, clientes: ["Panadería Sol"], tipos: ["bug"], vista: "lista", atajos: ["komuk"] },
  );
  assert.deepEqual(filtrosDesdeQuery({}), FILTROS_INICIALES);
});

test("filtrosAQuery ida y vuelta, sin escribir lo que está por defecto", () => {
  assert.equal(filtrosAQuery(FILTROS_INICIALES), "");
  const f = filtros({
    q: "caño",
    clientes: ["A, B SRL", "C"],
    tipos: ["bug"],
    prioridades: ["alta"],
    atajos: ["capturas"],
    orden: "viejos",
  });
  // Como lo arma Next en searchParams: clave repetida → array.
  const params = new URLSearchParams(filtrosAQuery(f));
  const crudo = {};
  for (const clave of new Set(params.keys())) {
    const valores = params.getAll(clave);
    crudo[clave] = valores.length > 1 ? valores : valores[0];
  }
  assert.deepEqual(filtrosDesdeQuery(crudo), f);
});

test("textoSync", () => {
  assert.equal(textoSync(null, AHORA), "nunca sincronizado");
  assert.equal(textoSync(AHORA - 30_000, AHORA), "sincronizado recién");
  assert.equal(textoSync(AHORA - 12 * 60_000, AHORA), "sincronizado hace 12 min");
  assert.equal(textoSync(AHORA - 3 * 3_600_000, AHORA), "sincronizado hace 3 h");
  assert.equal(textoSync(AHORA - 2 * DIA_MS, AHORA), "sincronizado hace 2 d");
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `pnpm test`
Expected: FAIL — `SyntaxError: The requested module './tablero.ts' does not provide an export named 'diasDesde'`.

- [ ] **Step 3: Implementar**

Reemplazar `lib/tablero.ts` entero por:

```ts
// Lógica del tablero. Sin acceso a base: lo testeable vive acá.
// La extensión explícita la exige node al correr los tests con type stripping.
import {
  ESTADOS,
  PRIORIDADES,
  TIPOS,
  type Estado,
  type Prioridad,
  type Ticket,
  type Tipo,
} from "./tickets.ts";

/** Columnas del tablero, en el orden en que se leen. */
export const COLUMNAS: readonly Estado[] = ESTADOS;

export function agruparPorEstado(tickets: Ticket[]): Record<Estado, Ticket[]> {
  const columnas = Object.fromEntries(ESTADOS.map((e) => [e, [] as Ticket[]])) as Record<
    Estado,
    Ticket[]
  >;
  for (const ticket of tickets) columnas[ticket.estado].push(ticket);
  return columnas;
}

/** Lo que el client component necesita de cada pedido. Fechas en ms: viajan del server sin ambigüedad. */
export type TarjetaTablero = {
  id: number;
  titulo: string;
  tipo: Tipo;
  prioridad: Prioridad;
  estado: Estado;
  cliente: string;
  reporta: string | null;
  email: string | null;
  url: string | null;
  detalle: string;
  respuesta: string | null;
  creado: number;
  actividad: number;
  adjuntos: { id: number; nombre: string }[];
  /** Link al Hub ya saneado (hrefSeguro), o null si el pedido es propio. */
  externa: string | null;
};

export const DIA_MS = 86_400_000;
export const DIAS_ESTANCADO = 7;

export const ATAJOS = ["sin_respuesta", "estancados", "capturas", "komuk"] as const;
export type Atajo = (typeof ATAJOS)[number];
/** El cliente no responde ni ve tickets del Hub: estos atajos no son para él. */
export const ATAJOS_ADMIN: readonly Atajo[] = ["sin_respuesta", "komuk"];
export const ETIQUETAS_ATAJO: Record<Atajo, string> = {
  sin_respuesta: "Sin respuesta",
  estancados: "Sin movimiento +7 d",
  capturas: "Con capturas",
  komuk: "KOMUK Hub",
};

export const ORDENES = ["prioridad", "actividad", "nuevos", "viejos"] as const;
export type Orden = (typeof ORDENES)[number];
export const ETIQUETAS_ORDEN: Record<Orden, string> = {
  prioridad: "Prioridad",
  actividad: "Última actividad",
  nuevos: "Más nuevos",
  viejos: "Más viejos",
};

export const VISTAS = ["tablero", "lista"] as const;
export type Vista = (typeof VISTAS)[number];

export type Filtros = {
  q: string;
  clientes: string[];
  tipos: Tipo[];
  prioridades: Prioridad[];
  atajos: Atajo[];
  orden: Orden;
  vista: Vista;
};

export const FILTROS_INICIALES: Filtros = {
  q: "",
  clientes: [],
  tipos: [],
  prioridades: [],
  atajos: [],
  orden: "prioridad",
  vista: "tablero",
};

export function diasDesde(ms: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - ms) / DIA_MS));
}

export function edad(dias: number): string {
  return dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} d`;
}

export function vivo(t: { estado: Estado }): boolean {
  return t.estado === "abierto" || t.estado === "en_curso";
}

export function estancado(t: { estado: Estado; actividad: number }, ahora: number): boolean {
  return vivo(t) && diasDesde(t.actividad, ahora) >= DIAS_ESTANCADO;
}

export function cumpleAtajo(atajo: Atajo, t: TarjetaTablero, ahora: number): boolean {
  switch (atajo) {
    case "sin_respuesta":
      return !t.respuesta && vivo(t);
    case "estancados":
      return estancado(t, ahora);
    case "capturas":
      return t.adjuntos.length > 0;
    case "komuk":
      return t.externa !== null;
  }
}

/** Sin tildes ni mayúsculas: "caneria" tiene que encontrar "Cañería". */
const plano = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function coincide(t: TarjetaTablero, q: string): boolean {
  if (!q) return true;
  const id = q.replace(/^#/, "");
  if (/^\d+$/.test(id) && String(t.id).startsWith(id)) return true;
  return [t.titulo, t.cliente, t.reporta ?? ""].some((campo) => plano(campo).includes(q));
}

const RANGO_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

const COMPARAR: Record<Orden, (a: TarjetaTablero, b: TarjetaTablero) => number> = {
  prioridad: (a, b) => RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad] || b.creado - a.creado,
  actividad: (a, b) => b.actividad - a.actividad,
  nuevos: (a, b) => b.creado - a.creado,
  viejos: (a, b) => a.creado - b.creado,
};

const atajosDelRol = (f: Filtros, esAdmin: boolean) =>
  f.atajos.filter((a) => esAdmin || !ATAJOS_ADMIN.includes(a));

/** Y entre grupos, O dentro de cada grupo. Devuelve una lista nueva, ya ordenada. */
export function filtrar(
  tickets: TarjetaTablero[],
  f: Filtros,
  esAdmin: boolean,
  ahora: number,
): TarjetaTablero[] {
  const q = plano(f.q.trim());
  const atajos = atajosDelRol(f, esAdmin);
  return tickets
    .filter(
      (t) =>
        coincide(t, q) &&
        (!esAdmin || f.clientes.length === 0 || f.clientes.includes(t.cliente)) &&
        (f.tipos.length === 0 || f.tipos.includes(t.tipo)) &&
        (f.prioridades.length === 0 || f.prioridades.includes(t.prioridad)) &&
        atajos.every((a) => cumpleAtajo(a, t, ahora)),
    )
    .sort(COMPARAR[f.orden]);
}

export function hayFiltros(f: Filtros, esAdmin: boolean): boolean {
  return (
    f.q.trim() !== "" ||
    (esAdmin && f.clientes.length > 0) ||
    f.tipos.length > 0 ||
    f.prioridades.length > 0 ||
    atajosDelRol(f, esAdmin).length > 0
  );
}

/** El orden en que j/k y anterior/siguiente recorren los pedidos: el que se ve en pantalla. */
export function ordenNavegacion(
  visibles: TarjetaTablero[],
  vista: Vista,
  colapsadas: Partial<Record<Estado, boolean>>,
): number[] {
  if (vista === "lista") return visibles.map((t) => t.id);
  return COLUMNAS.flatMap((e) => (colapsadas[e] ? [] : visibles.filter((t) => t.estado === e))).map(
    (t) => t.id,
  );
}

type Query = Record<string, string | string[] | undefined>;

const valores = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

function validos<T extends string>(permitidos: readonly T[], v: string | string[] | undefined): T[] {
  return [...new Set(valores(v))].filter((x): x is T => (permitidos as readonly string[]).includes(x));
}

/** Lo que venga en la URL se valida: un link viejo o editado a mano no rompe el tablero. */
export function filtrosDesdeQuery(query: Query): Filtros {
  const [orden] = validos(ORDENES, query.orden);
  const [vista] = validos(VISTAS, query.vista);
  return {
    q: (valores(query.q)[0] ?? "").slice(0, 200),
    clientes: [...new Set(valores(query.cliente))],
    tipos: validos(TIPOS, query.tipo),
    prioridades: validos(PRIORIDADES, query.prio),
    atajos: validos(ATAJOS, query.atajo),
    orden: orden ?? FILTROS_INICIALES.orden,
    vista: vista ?? FILTROS_INICIALES.vista,
  };
}

/** Claves repetidas y no separadas por coma: un cliente puede llamarse "Pérez, Juan SRL". */
export function filtrosAQuery(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const c of f.clientes) p.append("cliente", c);
  for (const t of f.tipos) p.append("tipo", t);
  for (const x of f.prioridades) p.append("prio", x);
  for (const a of f.atajos) p.append("atajo", a);
  if (f.orden !== FILTROS_INICIALES.orden) p.set("orden", f.orden);
  if (f.vista !== FILTROS_INICIALES.vista) p.set("vista", f.vista);
  return p.toString();
}

export function textoSync(ultima: number | null, ahora: number): string {
  if (ultima === null) return "nunca sincronizado";
  const min = Math.floor((ahora - ultima) / 60_000);
  if (min < 1) return "sincronizado recién";
  if (min < 60) return `sincronizado hace ${min} min`;
  if (min < 24 * 60) return `sincronizado hace ${Math.floor(min / 60)} h`;
  return `sincronizado hace ${Math.floor(min / (24 * 60))} d`;
}
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `pnpm test && pnpm typecheck`
Expected: PASS, sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add lib/tablero.ts lib/tablero.test.mjs
git commit -m "feat(tablero): filtrar, ordenar y navegar pedidos"
```

---

### Task 2: Tablero dinámico de sólo lectura (búsqueda, filtros, orden, atajos, lista)

El admin pierde el `<select>` de cada tarjeta en esta task; hasta la Task 4 mueve desde la página del pedido.

**Files:**
- Modify: `app/(privado)/tablero/page.tsx` (reescritura)
- Delete: `app/(privado)/tablero/Tablero.module.css`, `components/MoverEstado.tsx`
- Modify: `components/Tablero.tsx` (reescritura, pasa a client component)
- Create: `components/TableroBarra.tsx`, `components/TableroColumnas.tsx`, `components/TableroLista.tsx`
- Modify: `components/Tablero.module.css` (reescritura)
- Modify: `lib/tablero.ts` + `lib/tablero.test.mjs` (borrar `agruparPorEstado`, ya sin uso)
- Test: `e2e/tablero.admin.spec.ts` (nuevo), `e2e/tablero.cliente.spec.ts` (nuevo)
- Modify: `e2e/detalle.admin.spec.ts`, `e2e/komuk.admin.spec.ts`, `e2e/komuk.cliente.spec.ts`

**Interfaces:**
- Consumes: todo lo de Task 1; `hrefSeguro(u: string): string` de `@/lib/komuk-hub-sync` (sólo en el server: ese módulo importa el cliente HTTP del Hub y no tiene que llegar al bundle del navegador); `sincronizarKomuk` de `@/app/(privado)/tablero/acciones`.
- Produces:
  - `components/Tablero.tsx` default export `Tablero(props: { tickets: TarjetaTablero[]; esAdmin: boolean; ahora: number; filtrosIniciales: Filtros; sync: { ultima: number | null; error: string | null } | null })`
  - `components/TableroColumnas.tsx`: default `TableroColumnas(props: { tickets; visibles; filtrando: boolean; colapsadas: Partial<Record<Estado, boolean>>; onColapsar(e: Estado): void; esAdmin; ahora; abierto?: number | null; onAbrir?: (id: number) => void })`; exports `abrirSinSalir(e: MouseEvent, abrir?: () => void)` y `abrirDesdeFondo(e: MouseEvent, abrir?: () => void)`.
  - `components/TableroLista.tsx`: default `TableroLista(props: { visibles; filtrando; esAdmin; ahora; abierto?: number | null; onAbrir?: (id: number) => void })`
  - `components/TableroBarra.tsx`: default `TableroBarra(props)` (ver código).
  - Nombres accesibles que usan los e2e de tasks siguientes: columnas `region` con nombre del estado ("Abierto", "En curso", "Resuelto", "Cerrado"); botón `Colapsar {Estado}` / `Expandir {Estado}`; `searchbox` "Buscar pedidos"; botón "Lista"/"Tablero"; `combobox` "Orden"; botón "Limpiar filtros"; botón "Sincronizar".

- [ ] **Step 1: Escribir los e2e que fallan**

Crear `e2e/tablero.admin.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";
import { OTRO_CLIENTE, TITULOS, altaTicket } from "./sembrar.ts";

const buscador = (page: Page) => page.getByRole("searchbox", { name: "Buscar pedidos" });
const tarjeta = (page: Page, titulo: string) => page.getByRole("link", { name: titulo, exact: true });

test.describe("tablero, como admin", () => {
  test("buscar por título deja sólo lo que coincide y sobrevive a recargar", async ({ page }) => {
    await altaTicket({ titulo: "Búsqueda uno: impresora" });
    await altaTicket({ titulo: "Búsqueda dos: escáner" });
    await page.goto("/tablero/");

    await buscador(page).fill("impresora");
    await expect(tarjeta(page, "Búsqueda uno: impresora")).toBeVisible();
    await expect(tarjeta(page, "Búsqueda dos: escáner")).toHaveCount(0);
    await expect(page).toHaveURL(/\?q=impresora$/);

    await page.reload();
    await expect(buscador(page)).toHaveValue("impresora");
    await expect(tarjeta(page, "Búsqueda dos: escáner")).toHaveCount(0);
  });

  test("buscar ignora tildes", async ({ page }) => {
    await altaTicket({ titulo: "Se rompió la cañería" });
    await page.goto("/tablero/");
    await buscador(page).fill("caneria");
    await expect(tarjeta(page, "Se rompió la cañería")).toBeVisible();
  });

  test("buscar por #id", async ({ page }) => {
    const id = await altaTicket({ titulo: "Buscable por número" });
    await page.goto("/tablero/");
    await buscador(page).fill(`#${id}`);
    await expect(tarjeta(page, "Buscable por número")).toBeVisible();
  });

  test("la tecla / enfoca el buscador", async ({ page }) => {
    await page.goto("/tablero/");
    await page.keyboard.press("/");
    await expect(buscador(page)).toBeFocused();
  });

  test("filtrar por tipo, cerrar el menú con click afuera y limpiar", async ({ page }) => {
    await altaTicket({ titulo: "Tipo filtro bug", tipo: "bug" });
    await altaTicket({ titulo: "Tipo filtro mejora", tipo: "mejora" });
    await page.goto("/tablero/?q=Tipo%20filtro");

    await page.getByRole("button", { name: /^Tipo/ }).click();
    await page.getByRole("checkbox", { name: /^Bug/ }).check();
    await expect(tarjeta(page, "Tipo filtro bug")).toBeVisible();
    await expect(tarjeta(page, "Tipo filtro mejora")).toHaveCount(0);
    await expect(page).toHaveURL(/tipo=bug/);
    await expect(page.getByRole("button", { name: /^Tipo/ })).toHaveAttribute("data-activo", "true");

    await page.getByRole("heading", { level: 1 }).click();
    await expect(page.getByRole("checkbox", { name: /^Bug/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(tarjeta(page, "Tipo filtro mejora")).toBeVisible();
  });

  test("el atajo Sin movimiento muestra los estancados con su aviso", async ({ page }) => {
    const viejo = new Date(Date.now() - 10 * 86_400_000);
    await altaTicket({ titulo: "Estancado hace diez", creado: viejo, actualizado: viejo });
    await altaTicket({ titulo: "Fresco de hoy" });
    await page.goto("/tablero/");

    await page.getByRole("button", { name: /^Sin movimiento \+7 d/ }).click();
    await expect(tarjeta(page, "Estancado hace diez")).toBeVisible();
    await expect(tarjeta(page, "Fresco de hoy")).toHaveCount(0);
    await expect(page.locator("li", { has: tarjeta(page, "Estancado hace diez") })).toContainText(
      "Sin movimiento hace 10 d",
    );
  });

  test("la alerta de prioridad alta filtra por alta", async ({ page }) => {
    await altaTicket({ titulo: "Alerta alta viva", prioridad: "alta" });
    await page.goto("/tablero/");
    await page.getByRole("button", { name: /de prioridad alta$/ }).click();
    await expect(page).toHaveURL(/prio=alta/);
    await expect(page.getByRole("button", { name: /^Prioridad/ })).toHaveAttribute("data-activo", "true");
  });

  test("filtros inválidos en la URL no rompen y el ?cliente= viejo sigue filtrando", async ({ page }) => {
    await page.goto(`/tablero/?tipo=nada&orden=x&vista=y&cliente=${encodeURIComponent(OTRO_CLIENTE)}`);
    await expect(tarjeta(page, TITULOS.ajeno)).toBeVisible();
    await expect(tarjeta(page, TITULOS.completo)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Cliente/ })).toHaveAttribute("data-activo", "true");
  });

  test("vista lista ordenada por más viejos", async ({ page }) => {
    await altaTicket({ titulo: "Orden lista nuevo", creado: new Date() });
    await altaTicket({ titulo: "Orden lista viejo", creado: new Date(Date.now() - 5 * 86_400_000) });
    await page.goto("/tablero/?q=Orden%20lista");

    await page.getByRole("button", { name: "Lista", exact: true }).click();
    await page.getByRole("combobox", { name: "Orden" }).selectOption("viejos");
    const filas = page.getByRole("row");
    await expect(filas.nth(1)).toContainText("Orden lista viejo");
    await expect(filas.nth(2)).toContainText("Orden lista nuevo");
    await expect(page).toHaveURL(/orden=viejos/);
    await expect(page).toHaveURL(/vista=lista/);
  });

  test("Cerrado arranca colapsada y lo que elijo queda para la próxima", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByRole("button", { name: "Expandir Cerrado" })).toBeVisible();
    await page.getByRole("button", { name: "Colapsar Resuelto" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir Resuelto" })).toBeVisible();
  });
});
```

Crear `e2e/tablero.cliente.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { OTRO_CLIENTE, TITULOS } from "./sembrar.ts";

test.describe("tablero, como cliente", () => {
  test("ve sus pedidos con un buscador acotado y sin herramientas de admin", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByRole("heading", { level: 1, name: "Tus pedidos" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar pedidos" })).toHaveAttribute(
      "placeholder",
      "Buscar por título o #id",
    );
    await expect(page.getByRole("button", { name: /^Cliente/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Sin respuesta/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^KOMUK Hub/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sincronizar" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: TITULOS.completo })).toBeVisible();
    await expect(page.getByText(TITULOS.ajeno)).toHaveCount(0);
  });

  test("un ?cliente= ajeno en la URL no le muestra nada de otro", async ({ page }) => {
    await page.goto(`/tablero/?cliente=${encodeURIComponent(OTRO_CLIENTE)}`);
    await expect(page.getByText(TITULOS.ajeno)).toHaveCount(0);
    await expect(page.getByRole("link", { name: TITULOS.completo })).toBeVisible();
  });
});
```

Ajustar los e2e existentes que dependen de lo que se va:
- `e2e/komuk.admin.spec.ts`: el test "el tablero muestra el botón Sincronizar ahora al admin" pasa a buscar `{ name: "Sincronizar" }` (y renombrar el test a "…el botón Sincronizar…").
- `e2e/komuk.cliente.spec.ts`: `{ name: "Sincronizar ahora" }` → `{ name: "Sincronizar" }`.
- `e2e/detalle.admin.spec.ts`: borrar el test "mover la tarjeta desde el tablero no borra la respuesta" (el `<select>` desaparece; la Task 4 agrega su reemplazo con el panel) y el test "si el pedido pasó a resuelto con mail, el tablero muestra el toast" (la Task 3 lo agrega en el detalle).

- [ ] **Step 2: Correr y ver que fallan**

Run: `pnpm test:e2e e2e/tablero.admin.spec.ts e2e/tablero.cliente.spec.ts`
Expected: FAIL — no existe `searchbox` "Buscar pedidos".

- [ ] **Step 3: Página server**

Reemplazar `app/(privado)/tablero/page.tsx` entero:

```tsx
import type { Metadata } from "next";
import { exigirIdentidad } from "@/lib/auth";
import { listTickets } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { hrefSeguro } from "@/lib/komuk-hub-sync";
import { leerEstadoSync } from "@/lib/komuk-hub-db";
import { filtrosDesdeQuery, type TarjetaTablero } from "@/lib/tablero";
import Tablero from "@/components/Tablero";
import Toast from "@/components/Toast";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tablero" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TableroPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  const esAdmin = quien.rol === "admin";

  const query = await searchParams;
  const estadoSync = esAdmin ? await leerEstadoSync() : undefined;
  // El rol filtra acá, en el server: lo que no es del cliente nunca llega al navegador.
  const tickets = await listTickets(esAdmin ? undefined : quien.nombre);
  const adjuntos = await listAdjuntos(tickets.map((t) => t.id));

  // ponytail: viaja el detalle completo de hasta 500 pedidos para abrir el
  // panel sin otra consulta. Si la página pesa, pedir el detalle al abrirlo.
  const tarjetas: TarjetaTablero[] = tickets.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    tipo: t.tipo,
    prioridad: t.prioridad,
    estado: t.estado,
    cliente: t.cliente,
    reporta: t.reporta,
    email: t.email,
    url: t.url,
    detalle: t.detalle,
    respuesta: t.respuesta,
    creado: t.creado.getTime(),
    actividad: t.actualizado.getTime(),
    adjuntos: adjuntos
      .filter((a) => a.ticket_id === t.id)
      .map((a) => ({ id: a.id, nombre: a.nombre })),
    externa: t.external_source === "komuk_hub" ? hrefSeguro(t.external_url ?? "") : null,
  }));

  return (
    <>
      <Tablero
        tickets={tarjetas}
        esAdmin={esAdmin}
        ahora={Date.now()}
        filtrosIniciales={filtrosDesdeQuery(query)}
        sync={
          esAdmin
            ? {
                ultima: estadoSync?.last_synced_at?.getTime() ?? null,
                error: estadoSync?.last_status === "error" ? estadoSync.last_error : null,
              }
            : null
        }
      />
      {query.sync === "ok" ? <Toast>Sincronización con KOMUK Hub terminada.</Toast> : null}
      {query.sync === "error" ? (
        <Toast>La sincronización con KOMUK Hub falló. Mirá el último error.</Toast>
      ) : null}
    </>
  );
}
```

Borrar lo que queda sin uso:

```bash
git rm "app/(privado)/tablero/Tablero.module.css" components/MoverEstado.tsx
```

En `lib/tablero.ts` borrar la función `agruparPorEstado` y sacar `type Ticket` del import; en `lib/tablero.test.mjs` borrar los dos tests de `agruparPorEstado`, la constante `ticket` que usaban y `agruparPorEstado` del import.

- [ ] **Step 4: Client component principal**

Reemplazar `components/Tablero.tsx` entero:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sincronizarKomuk } from "@/app/(privado)/tablero/acciones";
import type { Estado } from "@/lib/tickets";
import {
  DIAS_ESTANCADO,
  FILTROS_INICIALES,
  estancado,
  filtrar,
  filtrosAQuery,
  hayFiltros,
  textoSync,
  vivo,
  type Filtros,
  type TarjetaTablero,
} from "@/lib/tablero";
import TableroBarra from "@/components/TableroBarra";
import TableroColumnas from "@/components/TableroColumnas";
import TableroLista from "@/components/TableroLista";
import panel from "@/app/(privado)/Panel.module.css";
import styles from "./Tablero.module.css";

type Props = {
  tickets: TarjetaTablero[];
  esAdmin: boolean;
  /** La hora del server: con la del navegador, "hoy" y "ayer" podrían no coincidir al hidratar. */
  ahora: number;
  filtrosIniciales: Filtros;
  sync: { ultima: number | null; error: string | null } | null;
};

const CLAVE_COLAPSADAS = "molpo:tablero:colapsadas";

export default function Tablero({ tickets, esAdmin, ahora, filtrosIniciales, sync }: Props) {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [menu, setMenu] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<Partial<Record<Estado, boolean>>>({ cerrado: true });
  const buscador = useRef<HTMLInputElement>(null);

  const cambiar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));

  useEffect(() => {
    try {
      const guardadas = localStorage.getItem(CLAVE_COLAPSADAS);
      if (guardadas) setColapsadas(JSON.parse(guardadas));
    } catch {
      // Sin storage (ventana privada, sitio bloqueado): quedan las de fábrica.
    }
  }, []);

  function alternarColumna(estado: Estado) {
    const nuevas = { ...colapsadas, [estado]: !colapsadas[estado] };
    setColapsadas(nuevas);
    try {
      localStorage.setItem(CLAVE_COLAPSADAS, JSON.stringify(nuevas));
    } catch {
      // Ídem: sin storage la preferencia dura hasta recargar.
    }
  }

  // Los filtros viven en la URL para recargar o compartir la vista. replaceState
  // y no router.replace: el router le volvería a pedir la página al server.
  useEffect(() => {
    const query = filtrosAQuery(filtros);
    window.history.replaceState(null, "", `/tablero/${query ? `?${query}` : ""}`);
  }, [filtros]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const escribiendo =
        e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        if (menu) setMenu(null);
        if (escribiendo) (e.target as HTMLElement).blur();
        return;
      }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        buscador.current?.focus();
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const visibles = useMemo(
    () => filtrar(tickets, filtros, esAdmin, ahora),
    [tickets, filtros, esAdmin, ahora],
  );
  const filtrando = hayFiltros(filtros, esAdmin);
  const sinCerrar = tickets.filter(vivo).length;
  const altas = tickets.filter((t) => t.prioridad === "alta" && vivo(t)).length;
  const estancados = tickets.filter((t) => estancado(t, ahora)).length;

  return (
    <div className={styles.raiz}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={panel.h1}>{esAdmin ? "Tablero" : "Tus pedidos"}</h1>
          <p className={styles.resumen}>
            {tickets.length} pedidos · {sinCerrar} sin cerrar
          </p>
        </div>
        {sync ? (
          <form action={sincronizarKomuk} className={styles.sync}>
            <BotonSync ultima={sync.ultima} ahora={ahora} />
            {sync.error ? (
              <p className={styles.syncError} role="alert">
                Último error: {sync.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </header>

      {altas > 0 || estancados > 0 ? (
        <div className={styles.alertas}>
          {altas > 0 ? (
            <button type="button" className={styles.alerta} onClick={() => cambiar({ prioridades: ["alta"] })}>
              {altas} de prioridad alta
            </button>
          ) : null}
          {estancados > 0 ? (
            <button
              type="button"
              className={styles.alerta}
              onClick={() =>
                setFiltros((f) =>
                  f.atajos.includes("estancados") ? f : { ...f, atajos: [...f.atajos, "estancados"] },
                )
              }
            >
              {estancados} sin movimiento hace más de {DIAS_ESTANCADO} días
            </button>
          ) : null}
        </div>
      ) : null}

      <TableroBarra
        tickets={tickets}
        filtros={filtros}
        cambiar={cambiar}
        limpiar={() => setFiltros((f) => ({ ...FILTROS_INICIALES, orden: f.orden, vista: f.vista }))}
        esAdmin={esAdmin}
        ahora={ahora}
        visibles={visibles.length}
        filtrando={filtrando}
        menu={menu}
        setMenu={setMenu}
        buscador={buscador}
      />

      {filtros.vista === "tablero" ? (
        <TableroColumnas
          tickets={tickets}
          visibles={visibles}
          filtrando={filtrando}
          colapsadas={colapsadas}
          onColapsar={alternarColumna}
          esAdmin={esAdmin}
          ahora={ahora}
        />
      ) : (
        <TableroLista visibles={visibles} filtrando={filtrando} esAdmin={esAdmin} ahora={ahora} />
      )}
    </div>
  );
}

function BotonSync({ ultima, ahora }: { ultima: number | null; ahora: number }) {
  const { pending } = useFormStatus();
  return (
    <>
      <span className={styles.syncEstado}>
        KOMUK Hub · {pending ? "sincronizando…" : textoSync(ultima, ahora)}
      </span>
      <button type="submit" className={styles.syncBoton} disabled={pending}>
        {pending ? "Sincronizando…" : "Sincronizar"}
      </button>
    </>
  );
}
```

- [ ] **Step 5: Barra de herramientas**

Crear `components/TableroBarra.tsx`:

```tsx
"use client";

import { useEffect, type RefObject } from "react";
import { ETIQUETAS, PRIORIDADES, TIPOS } from "@/lib/tickets";
import {
  ATAJOS,
  ATAJOS_ADMIN,
  ETIQUETAS_ATAJO,
  ETIQUETAS_ORDEN,
  ORDENES,
  cumpleAtajo,
  type Filtros,
  type Orden,
  type TarjetaTablero,
} from "@/lib/tablero";
import styles from "./Tablero.module.css";

type Props = {
  tickets: TarjetaTablero[];
  filtros: Filtros;
  cambiar: (parcial: Partial<Filtros>) => void;
  limpiar: () => void;
  esAdmin: boolean;
  ahora: number;
  visibles: number;
  filtrando: boolean;
  menu: string | null;
  setMenu: (menu: string | null) => void;
  buscador: RefObject<HTMLInputElement | null>;
};

const alternar = <T,>(lista: T[], valor: T): T[] =>
  lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

export default function TableroBarra({
  tickets,
  filtros,
  cambiar,
  limpiar,
  esAdmin,
  ahora,
  visibles,
  filtrando,
  menu,
  setMenu,
  buscador,
}: Props) {
  // Click afuera de un menú abierto lo cierra.
  useEffect(() => {
    if (!menu) return;
    function afuera(e: PointerEvent) {
      if (!(e.target instanceof Element && e.target.closest("[data-menu]"))) setMenu(null);
    }
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [menu, setMenu]);

  // Los contadores son sobre el total, no sobre lo filtrado: dicen cuántos hay de cada cosa.
  const cuenta = (test: (t: TarjetaTablero) => boolean) => tickets.filter(test).length;
  // Un cliente elegido que ya no tiene pedidos (link viejo) igual aparece, para poder destildarlo.
  const clientes = [...new Set([...tickets.map((t) => t.cliente), ...filtros.clientes])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const menuProps = { menu, setMenu };

  return (
    <div className={styles.barra}>
      <input
        ref={buscador}
        type="search"
        className={styles.buscador}
        value={filtros.q}
        onChange={(e) => cambiar({ q: e.target.value })}
        placeholder={esAdmin ? "Buscar por título, #id, cliente o quién reporta" : "Buscar por título o #id"}
        aria-label="Buscar pedidos"
        maxLength={200}
      />

      {esAdmin ? (
        <Multi
          id="cliente"
          etiqueta="Cliente"
          elegidos={filtros.clientes}
          onCambio={(clientes) => cambiar({ clientes })}
          opciones={clientes.map((c) => ({ valor: c, etiqueta: c, cuenta: cuenta((t) => t.cliente === c) }))}
          {...menuProps}
        />
      ) : null}
      <Multi
        id="tipo"
        etiqueta="Tipo"
        elegidos={filtros.tipos}
        onCambio={(tipos) => cambiar({ tipos })}
        opciones={TIPOS.map((v) => ({ valor: v, etiqueta: ETIQUETAS[v], cuenta: cuenta((t) => t.tipo === v) }))}
        {...menuProps}
      />
      <Multi
        id="prio"
        etiqueta="Prioridad"
        punto
        elegidos={filtros.prioridades}
        onCambio={(prioridades) => cambiar({ prioridades })}
        opciones={[...PRIORIDADES].reverse().map((v) => ({
          valor: v,
          etiqueta: ETIQUETAS[v],
          cuenta: cuenta((t) => t.prioridad === v),
        }))}
        {...menuProps}
      />

      <select
        className={styles.orden}
        aria-label="Orden"
        value={filtros.orden}
        onChange={(e) => cambiar({ orden: e.target.value as Orden })}
      >
        {ORDENES.map((o) => (
          <option key={o} value={o}>
            {ETIQUETAS_ORDEN[o]}
          </option>
        ))}
      </select>

      <div className={styles.atajos} role="group" aria-label="Atajos">
        {ATAJOS.filter((a) => esAdmin || !ATAJOS_ADMIN.includes(a)).map((a) => (
          <button
            key={a}
            type="button"
            className={styles.chip}
            aria-pressed={filtros.atajos.includes(a)}
            onClick={() => cambiar({ atajos: alternar(filtros.atajos, a) })}
          >
            {ETIQUETAS_ATAJO[a]} <span className={styles.chipCuenta}>{cuenta((t) => cumpleAtajo(a, t, ahora))}</span>
          </button>
        ))}
      </div>

      {filtrando ? (
        <p className={styles.mostrando}>
          {visibles} de {tickets.length}
          <button type="button" className={styles.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        </p>
      ) : null}

      <div className={styles.vistas} role="group" aria-label="Vista">
        <button type="button" aria-pressed={filtros.vista === "tablero"} onClick={() => cambiar({ vista: "tablero" })}>
          Tablero
        </button>
        <button type="button" aria-pressed={filtros.vista === "lista"} onClick={() => cambiar({ vista: "lista" })}>
          Lista
        </button>
      </div>
    </div>
  );
}

type Opcion<T extends string> = { valor: T; etiqueta: string; cuenta: number };

function Multi<T extends string>({
  id,
  etiqueta,
  opciones,
  elegidos,
  onCambio,
  punto,
  menu,
  setMenu,
}: {
  id: string;
  etiqueta: string;
  opciones: Opcion<T>[];
  elegidos: T[];
  onCambio: (elegidos: T[]) => void;
  punto?: boolean;
  menu: string | null;
  setMenu: (menu: string | null) => void;
}) {
  const abierto = menu === id;
  return (
    <div className={styles.menu} data-menu>
      <button
        type="button"
        className={styles.menuBoton}
        data-activo={elegidos.length > 0 || undefined}
        aria-expanded={abierto}
        onClick={() => setMenu(abierto ? null : id)}
      >
        {etiqueta}
        {elegidos.length > 0 ? <span className={styles.badge}>{elegidos.length}</span> : null}
      </button>
      {abierto ? (
        <div className={styles.menuPanel} role="group" aria-label={etiqueta}>
          {opciones.map((o) => (
            <label key={o.valor} className={styles.menuOpcion}>
              <input
                type="checkbox"
                checked={elegidos.includes(o.valor)}
                onChange={() => onCambio(alternar(elegidos, o.valor))}
              />
              {punto ? <span className={styles.punto} data-prioridad={o.valor} aria-hidden /> : null}
              <span className={styles.menuEtiqueta}>{o.etiqueta}</span>
              <span className={styles.menuCuenta}>{o.cuenta}</span>
            </label>
          ))}
          <button type="button" className={styles.menuLimpiar} onClick={() => onCambio([])}>
            Limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Columnas y lista**

Crear `components/TableroColumnas.tsx`:

```tsx
"use client";

import type { MouseEvent } from "react";
import { ETIQUETAS, type Estado } from "@/lib/tickets";
import { COLUMNAS, diasDesde, edad, estancado, vivo, type TarjetaTablero } from "@/lib/tablero";
import styles from "./Tablero.module.css";

/** Click común abre el panel; con modificador o rueda sigue siendo el link a la página completa. */
export function abrirSinSalir(e: MouseEvent, abrir?: () => void) {
  if (!abrir || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  abrir();
}

/** Click en cualquier parte de la tarjeta o la fila, salvo en sus links y botones. */
export function abrirDesdeFondo(e: MouseEvent, abrir?: () => void) {
  if (abrir && !(e.target instanceof Element && e.target.closest("a, button, input"))) abrir();
}

type Props = {
  tickets: TarjetaTablero[];
  visibles: TarjetaTablero[];
  filtrando: boolean;
  colapsadas: Partial<Record<Estado, boolean>>;
  onColapsar: (estado: Estado) => void;
  esAdmin: boolean;
  ahora: number;
  abierto?: number | null;
  onAbrir?: (id: number) => void;
};

export default function TableroColumnas({
  tickets,
  visibles,
  filtrando,
  colapsadas,
  onColapsar,
  esAdmin,
  ahora,
  abierto,
  onAbrir,
}: Props) {
  return (
    <div className={styles.tablero}>
      {COLUMNAS.map((estado) => {
        const tarjetas = visibles.filter((t) => t.estado === estado);
        const total = tickets.filter((t) => t.estado === estado).length;
        const altas = tarjetas.filter((t) => t.prioridad === "alta" && vivo(t)).length;
        const colapsada = Boolean(colapsadas[estado]);
        const etiqueta = ETIQUETAS[estado];
        return (
          <section
            key={estado}
            className={styles.columna}
            data-colapsada={colapsada || undefined}
            aria-label={etiqueta}
          >
            <header className={styles.columnaCabecera}>
              <span className={styles.punto} data-estado={estado} aria-hidden />
              <h2 className={styles.columnaTitulo}>{etiqueta}</h2>
              <span className={styles.cuenta}>{filtrando ? `${tarjetas.length} de ${total}` : total}</span>
              {altas > 0 ? (
                <span className={styles.altas}>
                  {altas} alta{altas > 1 ? "s" : ""}
                </span>
              ) : null}
              <button
                type="button"
                className={styles.colapsar}
                aria-expanded={!colapsada}
                aria-label={`${colapsada ? "Expandir" : "Colapsar"} ${etiqueta}`}
                onClick={() => onColapsar(estado)}
              >
                {colapsada ? "+" : "−"}
              </button>
            </header>
            {colapsada ? null : (
              <ul className={styles.pila}>
                {tarjetas.map((t) => (
                  <Tarjeta
                    key={t.id}
                    t={t}
                    esAdmin={esAdmin}
                    ahora={ahora}
                    seleccionada={abierto === t.id}
                    onAbrir={onAbrir && (() => onAbrir(t.id))}
                  />
                ))}
                {tarjetas.length === 0 ? (
                  <li className={styles.vacia}>{filtrando ? "Nada con estos filtros" : "Nada acá"}</li>
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Tarjeta({
  t,
  esAdmin,
  ahora,
  seleccionada,
  onAbrir,
}: {
  t: TarjetaTablero;
  esAdmin: boolean;
  ahora: number;
  seleccionada: boolean;
  onAbrir?: () => void;
}) {
  const dias = diasDesde(t.actividad, ahora);
  return (
    <li
      className={styles.tarjeta}
      data-seleccionada={seleccionada || undefined}
      onClick={(e) => abrirDesdeFondo(e, onAbrir)}
    >
      <div className={styles.tarjetaMeta}>
        <span
          className={styles.punto}
          data-prioridad={t.prioridad}
          title={`Prioridad ${ETIQUETAS[t.prioridad].toLowerCase()}`}
        />
        <span>
          #{t.id} · {ETIQUETAS[t.tipo]}
        </span>
        {t.externa !== null ? (
          <a className={styles.badgeExterno} href={t.externa} target="_blank" rel="noopener noreferrer">
            KOMUK Hub
          </a>
        ) : null}
      </div>
      {esAdmin ? <p className={styles.tarjetaCliente}>{t.cliente}</p> : null}
      <p className={styles.tarjetaTitulo}>
        <a href={`/tablero/${t.id}/`} onClick={(e) => abrirSinSalir(e, onAbrir)}>
          {t.titulo}
        </a>
      </p>
      <p className={styles.tarjetaPie}>
        <span>{edad(dias)}</span>
        {t.adjuntos.length > 0 ? (
          <span>
            {t.adjuntos.length} captura{t.adjuntos.length > 1 ? "s" : ""}
          </span>
        ) : null}
        {t.respuesta ? <span>Respondido</span> : null}
      </p>
      {estancado(t, ahora) ? <p className={styles.estancado}>Sin movimiento hace {dias} d</p> : null}
    </li>
  );
}
```

Crear `components/TableroLista.tsx`:

```tsx
"use client";

import { ETIQUETAS } from "@/lib/tickets";
import { diasDesde, edad, estancado, type TarjetaTablero } from "@/lib/tablero";
import { abrirDesdeFondo, abrirSinSalir } from "@/components/TableroColumnas";
import styles from "./Tablero.module.css";

type Props = {
  visibles: TarjetaTablero[];
  filtrando: boolean;
  esAdmin: boolean;
  ahora: number;
  abierto?: number | null;
  onAbrir?: (id: number) => void;
};

export default function TableroLista({ visibles, filtrando, esAdmin, ahora, abierto, onAbrir }: Props) {
  if (visibles.length === 0) {
    return (
      <p className={styles.listaVacia}>
        {filtrando ? "Nada con estos filtros." : "Todavía no hay pedidos."}
      </p>
    );
  }
  return (
    <div className={styles.listaMarco}>
      <table className={styles.lista}>
        <thead>
          <tr>
            <th className={styles.colId}>#</th>
            <th>Título</th>
            {esAdmin ? <th className={styles.colCliente}>Cliente</th> : null}
            <th className={styles.colTipo}>Tipo</th>
            <th className={styles.colPrio}>Prioridad</th>
            <th className={styles.colEstado}>Estado</th>
            <th className={styles.colActividad}>Actividad</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((t) => {
            const abrir = onAbrir && (() => onAbrir(t.id));
            return (
              <tr
                key={t.id}
                data-seleccionada={abierto === t.id || undefined}
                onClick={(e) => abrirDesdeFondo(e, abrir)}
              >
                <td>#{t.id}</td>
                <td>
                  <a href={`/tablero/${t.id}/`} onClick={(e) => abrirSinSalir(e, abrir)}>
                    {t.titulo}
                  </a>
                  {t.externa !== null ? <span className={styles.badgeExterno}>KOMUK Hub</span> : null}
                </td>
                {esAdmin ? <td>{t.cliente}</td> : null}
                <td>{ETIQUETAS[t.tipo]}</td>
                <td>
                  <span className={styles.conPunto}>
                    <span className={styles.punto} data-prioridad={t.prioridad} aria-hidden />
                    {ETIQUETAS[t.prioridad]}
                  </span>
                </td>
                <td>
                  <span className={styles.conPunto}>
                    <span className={styles.punto} data-estado={t.estado} aria-hidden />
                    {ETIQUETAS[t.estado]}
                  </span>
                </td>
                <td className={styles.actividad} data-estancado={estancado(t, ahora) || undefined}>
                  {edad(diasDesde(t.actividad, ahora))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Estilos**

Reemplazar `components/Tablero.module.css` entero (incluye ya los estilos del panel y del drag de las tasks siguientes, para tener un solo archivo de estilos del tablero):

```css
/* Colores propios del tablero (handoff 2026-10-14): estados y prioridades no
   existen en el design system general. */
.raiz {
  --tb-alta: #b4231f;
  --tb-alerta: #8a5200;
  --tb-alerta-bg: rgba(191, 139, 35, 0.16);
  --tb-abierto: #4e78a9;
  --tb-en_curso: #bf8b23;
  --tb-resuelto: #2e9e6b;
  --tb-cerrado: #8a97a6;
  --tb-media: #4e78a9;
  --tb-baja: #a3b0be;
  /* Ocupa la ventana menos el padding de .main (App.module.css): la página no
     scrollea, cada columna sí. */
  height: calc(100vh - 2 * clamp(28px, 4vw, 48px));
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  color: var(--text);
}
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme])) .raiz {
    --tb-alta: #ff9d99;
    --tb-alerta: #e7bd62;
    --tb-alerta-bg: rgba(223, 176, 74, 0.14);
  }
}
:global(:root[data-theme="dark"]) .raiz {
  --tb-alta: #ff9d99;
  --tb-alerta: #e7bd62;
  --tb-alerta-bg: rgba(223, 176, 74, 0.14);
}
.raiz :focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Encabezado */
.encabezado {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
}
.resumen {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texto-tenue);
}
.sync {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 12px;
}
.syncEstado {
  font-size: 13px;
  color: var(--texto-tenue);
}
.syncBoton,
.guardar {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--bg);
  background: var(--accent);
  border: 0;
  border-radius: var(--r-boton);
  padding: 8px 14px;
  cursor: pointer;
  transition: opacity 0.14s ease;
}
.syncBoton:disabled {
  opacity: 0.6;
  cursor: progress;
}
.syncError {
  flex-basis: 100%;
  margin: 0;
  font-size: 13px;
  color: var(--tb-alta);
  background: color-mix(in srgb, var(--tb-alta) 10%, transparent);
  border-radius: var(--r-boton);
  padding: 8px 12px;
}
.alertas {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.alerta {
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--tb-alerta);
  background: var(--tb-alerta-bg);
  border: 0;
  border-radius: var(--r-pill);
  padding: 5px 12px;
  cursor: pointer;
}
.alerta:hover {
  text-decoration: underline;
}

/* Barra */
.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.buscador {
  flex: 1 1 260px;
  min-width: 0;
  max-width: 380px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 8px 12px;
}
.menuBoton,
.orden,
.chip,
.limpiar,
.vistas button,
.segmentado button {
  font: inherit;
  font-size: 13px;
  color: var(--texto-cuerpo);
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}
.menu {
  position: relative;
}
.menuBoton {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.menuBoton[data-activo] {
  background: var(--chip);
  border-color: var(--azul-medio);
}
.badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--bg);
  background: var(--azul-medio);
  border-radius: var(--r-pill);
  padding: 0 6px;
}
.menuPanel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  min-width: 220px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  box-shadow: var(--sombra-card);
  padding: 6px;
}
.menuOpcion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.menuOpcion:hover {
  background: var(--chip);
}
.menuEtiqueta {
  flex: 1;
}
.menuCuenta {
  font-size: 12px;
  color: var(--texto-tenue);
}
.menuLimpiar {
  font: inherit;
  font-size: 12px;
  text-align: left;
  color: var(--link);
  background: none;
  border: 0;
  border-top: 1px solid var(--borde-2);
  margin-top: 4px;
  padding: 8px;
  cursor: pointer;
}
.atajos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border-radius: var(--r-pill);
}
.chip[aria-pressed="true"] {
  color: var(--text-strong);
  background: var(--chip);
  border-color: var(--azul-medio);
}
.chipCuenta {
  margin-left: 4px;
  color: var(--texto-tenue);
}
.mostrando {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--texto-tenue);
}
.limpiar {
  color: var(--link);
}
.vistas {
  display: inline-flex;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
}
.vistas button {
  border: 0;
  border-radius: 9px;
  padding: 5px 12px;
  color: var(--texto-tenue);
  background: transparent;
}
.vistas button[aria-pressed="true"] {
  color: var(--text-strong);
  background: var(--chip);
}

/* Puntos de color de estado y prioridad */
.punto {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tb-media);
}
.punto[data-estado="abierto"] {
  background: var(--tb-abierto);
}
.punto[data-estado="en_curso"] {
  background: var(--tb-en_curso);
}
.punto[data-estado="resuelto"] {
  background: var(--tb-resuelto);
}
.punto[data-estado="cerrado"] {
  background: var(--tb-cerrado);
}
.punto[data-prioridad="alta"] {
  background: var(--tb-alta);
}
.punto[data-prioridad="baja"] {
  background: var(--tb-baja);
}
.conPunto {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Tablero */
.tablero {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}
.columna {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--seccion-alt);
  border: 1px solid var(--borde-2);
  border-radius: var(--r-card);
  transition: background 0.14s ease, border-color 0.14s ease;
}
.columna[data-sobre] {
  background: var(--chip-2);
  border-color: var(--azul-medio);
}
.columna[data-colapsada] {
  flex: 0 0 48px;
}
.columnaCabecera {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 8px;
}
.columna[data-colapsada] .columnaCabecera {
  flex-direction: column;
  padding: 10px 0;
}
.columna[data-colapsada] .columnaTitulo {
  writing-mode: vertical-rl;
}
.columnaTitulo {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
}
.cuenta {
  font-size: 12px;
  color: var(--texto-tenue);
}
.altas {
  font-size: 11px;
  font-weight: 600;
  color: var(--tb-alta);
}
.colapsar {
  margin-left: auto;
  width: 24px;
  height: 24px;
  font: inherit;
  color: var(--texto-tenue);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}
.columna[data-colapsada] .colapsar {
  order: -1;
  margin: 0;
}
.colapsar:hover {
  background: var(--chip);
}
.pila {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vacia {
  padding: 20px 8px;
  font-size: 13px;
  text-align: center;
  color: var(--texto-tenue);
  border: 1px dashed var(--borde);
  border-radius: var(--r-boton);
}
.tarjeta {
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 11px 12px;
  cursor: pointer;
  transition: border-color 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease;
}
.tarjeta:hover {
  box-shadow: 0 4px 14px rgba(9, 23, 43, 0.08);
}
.tarjeta[data-seleccionada] {
  border-color: var(--azul-medio);
}
.tarjeta[draggable="true"] {
  cursor: grab;
}
.tarjeta[data-arrastrada] {
  opacity: 0.4;
}
.tarjetaMeta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--texto-tenue);
}
.tarjetaCliente {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--texto-cuerpo);
}
.tarjetaTitulo {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tarjetaTitulo a {
  color: var(--text-strong);
  text-decoration: none;
}
.tarjetaTitulo a:hover {
  text-decoration: underline;
}
.tarjetaPie {
  display: flex;
  gap: 10px;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--texto-tenue);
}
.estancado {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--tb-alerta);
}
.badgeExterno {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--azul-medio);
  border: 1px solid var(--azul-medio);
  border-radius: var(--r-pill);
  padding: 0 7px;
  text-decoration: none;
}

/* Lista */
.listaMarco {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--borde-2);
  border-radius: var(--r-card);
}
.lista {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 13px;
}
.lista th {
  position: sticky;
  top: 0;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--texto-tenue);
  background: var(--seccion-alt);
  padding: 10px 12px;
}
.lista td {
  padding: 10px 12px;
  border-top: 1px solid var(--borde-2);
  vertical-align: middle;
}
.lista tbody tr {
  cursor: pointer;
}
.lista tbody tr:hover {
  background: var(--seccion-alt);
}
.lista tr[data-seleccionada] {
  background: var(--chip);
}
.lista a {
  font-weight: 500;
  color: var(--text-strong);
  text-decoration: none;
}
.lista .badgeExterno {
  margin-left: 8px;
}
.colId {
  width: 56px;
}
.colCliente {
  width: 150px;
}
.colTipo {
  width: 84px;
}
.colPrio {
  width: 90px;
}
.colEstado {
  width: 110px;
}
.colActividad {
  width: 90px;
}
.actividad {
  color: var(--texto-tenue);
}
.actividad[data-estancado] {
  color: var(--tb-alerta);
}
.listaVacia {
  margin: 0;
  padding: 40px 16px;
  text-align: center;
  color: var(--texto-tenue);
}

/* Panel de detalle */
.detalle {
  position: fixed;
  z-index: 30;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(480px, 100vw);
  overflow-y: auto;
  background: var(--bg);
  border-left: 1px solid var(--borde);
  box-shadow: var(--sombra-card);
  padding: 20px 24px 32px;
  animation: entrar 0.16s ease;
}
@keyframes entrar {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .detalle {
    animation: none;
  }
}
.detalleCabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--texto-tenue);
}
.detalleAcciones {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.iconoBoton {
  width: 30px;
  height: 30px;
  font: inherit;
  color: var(--texto-cuerpo);
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: 8px;
  cursor: pointer;
}
.iconoBoton:disabled {
  opacity: 0.35;
  cursor: default;
}
.prioridadTexto[data-prioridad="alta"] {
  font-weight: 600;
  color: var(--tb-alta);
}
.completa {
  font-size: 12px;
  color: var(--link);
}
.detalleTitulo {
  margin: 12px 0 8px;
  font-size: 20px;
  line-height: 1.3;
  color: var(--text-strong);
}
.detalleTexto {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
  color: var(--texto-cuerpo);
}
.campos {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  margin: 18px 0;
  font-size: 13px;
}
.campos dt {
  color: var(--texto-tenue);
}
.campos dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.seccion {
  margin-top: 20px;
}
.h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
}
.capturas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.capturas img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid var(--borde);
  border-radius: 8px;
}
.segmentado {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.segmentado button[aria-pressed="true"] {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
}
.respuesta {
  width: 100%;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 10px 12px;
  resize: vertical;
}
.guardar {
  margin-top: 8px;
}
.guardar:disabled {
  opacity: 0.45;
  cursor: default;
}
.nota {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--texto-tenue);
}

@media (max-width: 860px) {
  .raiz {
    height: auto;
  }
  .buscador {
    max-width: none;
  }
  .vistas {
    margin-left: 0;
  }
  .tablero {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    padding-bottom: 8px;
  }
  .columna {
    flex: 0 0 280px;
    max-height: 70vh;
    scroll-snap-align: start;
  }
  .columna[data-colapsada] {
    flex-basis: 48px;
  }
  .detalle {
    width: 100vw;
    border-left: 0;
  }
}
```

- [ ] **Step 8: Correr todo**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e`
Expected: PASS. Si `filtros inválidos en la URL…` falla porque `TITULOS.ajeno` o `TITULOS.completo` no están en "abierto" en la siembra (`e2e/sembrar.ts`), cambiar la URL del test agregando `&vista=lista` (la lista no tiene columnas colapsadas) en vez de tocar la siembra.

- [ ] **Step 9: Commit**

```bash
git add -A "app/(privado)/tablero" components lib/tablero.ts lib/tablero.test.mjs e2e
git commit -m "feat(tablero): búsqueda, filtros, orden, atajos y vista lista"
```

---

### Task 3: Cambio de estado desde la página del pedido (`/tablero/{id}/`)

Problemas que encontró la revisión del flujo actual (`moverTicket` en `app/(privado)/tablero/acciones.ts`):
1. Guardar desde el detalle siempre redirige a `/tablero/`: el admin pierde el pedido que estaba mirando y no ve confirmación de nada (el toast de "resuelto" sólo sale si el mail salió).
2. Guardar sin cambios también lo saca al tablero, sin decir que no había nada para guardar.
3. Los errores redirigen a `/tablero/?error=1`, que nadie lee: el error se pierde en silencio.
4. `Number(id)` acepta ids fuera de int4 → error 500 de postgres en vez de "no existe" (la página ya lo resuelve con `idDeTicket`; la acción no).
5. En tickets de KOMUK Hub el detalle dice "título, detalle y estado vienen del Hub", pero el sync (`lib/komuk-hub-db.ts`, `on conflict … do update`) **no** pisa `estado`: el estado se maneja acá. El texto miente.

**Files:**
- Modify: `app/(privado)/tablero/acciones.ts`
- Modify: `lib/tickets.ts` (reemplazar `urlTrasMover` por `urlTrasGuardar`)
- Test: `lib/tickets.test.mjs`
- Modify: `app/(privado)/tablero/[id]/page.tsx`
- Modify: `components/Toast.tsx`
- Test: `e2e/detalle.admin.spec.ts`, `e2e/komuk.admin.spec.ts`

**Interfaces:**
- Consumes: `idDeTicket, parseEstado, normalizarRespuesta, hayNovedad, hayQueAvisar, avisoDeTicket, avisoTrasMover, parseAviso, type AvisoTablero` de `@/lib/tickets`.
- Produces:
  - `urlTrasGuardar(id: number, cambio: boolean, aviso: AvisoTablero | null): string` en `lib/tickets.ts`.
  - En `acciones.ts`, función interna (no exportada) `guardar(datos: { id: unknown; estado: unknown; respuesta: unknown; respuestaPrevia: unknown; avisar: boolean }): Promise<Guardado>` con `type Guardado = { ok: true; cambio: boolean; mailEnviado: boolean; aviso: AvisoTablero | null } | { ok: false; motivo: "invalido" | "conflicto" }`. La Task 4 la reutiliza.
  - Query params del detalle: `?guardado=1`, `?sin_cambios=1`, `&aviso=resuelto`, `?conflicto=1` (este último ya existía).

- [ ] **Step 1: Test unitario que falla**

En `lib/tickets.test.mjs`, en el import cambiar `urlTrasMover` por `urlTrasGuardar`, y reemplazar el test que usa `urlTrasMover` (líneas ~207–210) por:

```js
test("urlTrasGuardar vuelve al mismo pedido y dice qué pasó", () => {
  assert.equal(urlTrasGuardar(7, true, null), "/tablero/7/?guardado=1");
  assert.equal(urlTrasGuardar(7, true, "resuelto"), "/tablero/7/?guardado=1&aviso=resuelto");
  assert.equal(urlTrasGuardar(7, false, null), "/tablero/7/?sin_cambios=1");
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `pnpm test`
Expected: FAIL — `does not provide an export named 'urlTrasGuardar'`.

- [ ] **Step 3: Implementar `urlTrasGuardar`**

En `lib/tickets.ts`, reemplazar la función `urlTrasMover` por:

```ts
/**
 * A dónde vuelve el form del detalle: al mismo pedido, diciendo qué pasó. Volver
 * al tablero le hacía perder al admin el pedido que estaba mirando.
 */
export function urlTrasGuardar(id: number, cambio: boolean, aviso: AvisoTablero | null): string {
  if (!cambio) return `/tablero/${id}/?sin_cambios=1`;
  return `/tablero/${id}/?guardado=1${aviso ? `&aviso=${aviso}` : ""}`;
}
```

Run: `pnpm test` → PASS.

- [ ] **Step 4: E2E que fallan**

En `e2e/detalle.admin.spec.ts`:

1. En "guardar sólo una respuesta la persiste sin tocar el estado", reemplazar:
   ```ts
       // La acción siempre vuelve al tablero.
       await expect(page).toHaveURL(/\/tablero\/?$/);
   ```
   por:
   ```ts
       // Vuelve al mismo pedido y lo dice (el toast limpia la query, por eso no se mira la URL entera).
       await expect(page).toHaveURL(new RegExp(`/tablero/${id}/`));
       await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
   ```
2. En "cambiar el estado desde el detalle conserva la respuesta escrita", reemplazar `await expect(page).toHaveURL(/\/tablero\/?$/);` por:
   ```ts
       await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
       await expect(page.locator("select[name=estado]")).toHaveValue("en_curso");
   ```
3. En "no pisa una respuesta que cambió en otra pestaña", reemplazar `await expect(nueva).toHaveURL(/\/tablero\/?$/);` por `await expect(nueva.getByRole("status")).toHaveText("Cambios guardados.");`.
4. En "guardar sin cambiar nada no toca la última novedad ni avisa al cliente", reemplazar `await expect(page).toHaveURL(/\/tablero\/?$/);` por `await expect(page.getByRole("status")).toHaveText("No había cambios para guardar.");`.
5. Agregar al final del `describe`:
   ```ts
     test("si el pedido pasó a resuelto con mail, el detalle lo dice", async ({ page }) => {
       await page.goto(`/tablero/${compartido.completo}/?guardado=1&aviso=resuelto`);
       await expect(page.getByRole("status")).toHaveText(
         "Le avisamos al cliente que el pedido quedó resuelto.",
       );
     });

     test("un id inválido en el form vuelve al tablero sin romper", async ({ page }) => {
       await page.goto(`/tablero/${compartido.completo}/`);
       await page.locator("input[name=id]").evaluate((input: HTMLInputElement) => {
         input.value = "2147483648";
       });
       await page.getByRole("button", { name: "Guardar y avisar" }).click();
       await expect(page).toHaveURL(/\/tablero\/?$/);
     });
   ```

En `e2e/komuk.admin.spec.ts`, dentro de "badge KOMUK Hub con link y estado de origen", agregar:

```ts
    await expect(page.getByText("Título y detalle vienen del Hub; el estado lo manejamos acá.")).toBeVisible();
```

Run: `pnpm test:e2e e2e/detalle.admin.spec.ts e2e/komuk.admin.spec.ts`
Expected: FAIL — no hay `role=status` con "Cambios guardados." y el id fuera de rango da 500.

- [ ] **Step 5: Acción con núcleo compartido**

Reemplazar `app/(privado)/tablero/acciones.ts` entero:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import {
  avisoDeTicket,
  avisoTrasMover,
  hayNovedad,
  hayQueAvisar,
  idDeTicket,
  normalizarRespuesta,
  parseEstado,
  urlTrasGuardar,
  type AvisoTablero,
} from "@/lib/tickets";
import { getTicket, updateTicket } from "@/lib/tickets-db";
import { correrSyncKomuk } from "@/lib/komuk-hub-db";

type Guardado =
  | { ok: true; cambio: boolean; mailEnviado: boolean; aviso: AvisoTablero | null }
  | { ok: false; motivo: "invalido" | "conflicto" };

/**
 * Guarda el estado y/o la respuesta de un ticket y le avisa al cliente. Lo
 * comparten el form del detalle y el tablero: cada uno decide a dónde ir
 * después, y cada uno chequea que quien llama sea admin.
 */
async function guardar(datos: {
  id: unknown;
  estado: unknown;
  respuesta: unknown;
  respuestaPrevia: unknown;
  avisar: boolean;
}): Promise<Guardado> {
  // idDeTicket y no Number: un id fuera de int4 es "no existe", no un 500 de postgres.
  const id = idDeTicket(String(datos.id));
  const estado = parseEstado(datos.estado);
  if (id === null || !estado) return { ok: false, motivo: "invalido" };

  const previo = await getTicket(id);
  if (!previo) return { ok: false, motivo: "invalido" };

  const respuesta = normalizarRespuesta(datos.respuesta, previo.respuesta);

  // Quien guarda una respuesta manda con cuál se pintó. Si mientras tanto
  // cambió (otra pestaña, el panel del tablero), guardar acá borraría eso sin
  // que nadie se entere: mejor avisar y perder un click.
  if (typeof datos.respuestaPrevia === "string" && datos.respuestaPrevia !== (previo.respuesta ?? "")) {
    revalidatePath("/tablero");
    return { ok: false, motivo: "conflicto" };
  }

  if (!hayNovedad(previo, estado, respuesta)) {
    return { ok: true, cambio: false, mailEnviado: false, aviso: null };
  }

  const ticket = await updateTicket(id, estado, respuesta);

  // El detalle puede guardar sólo una respuesta: el mail no puede decir que
  // el pedido "pasó" a un estado si el estado no cambió.
  const cambioEstado = previo.estado !== estado;
  let mailEnviado = false;
  if (datos.avisar && ticket?.email && hayQueAvisar(cambioEstado, respuesta)) {
    const envio = await sendMail({
      to: ticket.email,
      ...avisoDeTicket(ticket, estado, cambioEstado),
      // Al pedido, no al tablero: el mail habla de uno solo.
      button: {
        label: "Ver el pedido",
        href: `${process.env.APP_URL ?? "https://app.molpo.ar"}/tablero/${ticket.id}/`,
      },
    });
    mailEnviado = envio.ok;
  }

  revalidatePath("/tablero");
  revalidatePath(`/tablero/${id}`);
  return { ok: true, cambio: true, mailEnviado, aviso: avisoTrasMover(previo.estado, estado, mailEnviado) };
}

/** El form de la página del pedido. Vuelve siempre al mismo pedido. Sólo admin. */
export async function moverTicket(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");

  const r = await guardar({
    id: formData.get("id"),
    estado: formData.get("estado"),
    respuesta: formData.get("respuesta"),
    respuestaPrevia: formData.get("respuestaPrevia"),
    avisar: true,
  });
  const id = idDeTicket(String(formData.get("id")));
  if (id === null || (!r.ok && r.motivo === "invalido")) redirect("/tablero/");
  if (!r.ok) redirect(`/tablero/${id}/?conflicto=1`);
  redirect(urlTrasGuardar(id, r.cambio, r.aviso));
}

/** Botón "Sincronizar" del tablero. Sólo admin: trae del Hub, nunca escribe en él. */
export async function sincronizarKomuk() {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");
  const r = await correrSyncKomuk();
  revalidatePath("/tablero");
  redirect(r.ok ? "/tablero/?sync=ok" : "/tablero/?sync=error");
}
```

- [ ] **Step 6: Detalle con confirmación y copy de KOMUK corregido**

En `components/Toast.tsx`, cambiar la lista de claves que limpia:

```tsx
    for (const clave of ["aviso", "sync", "guardado", "sin_cambios"]) {
```

En `app/(privado)/tablero/[id]/page.tsx`:

1. Imports: agregar `parseAviso` al import de `@/lib/tickets` y `import Toast from "@/components/Toast";`.
2. Tipo de `searchParams`:
   ```tsx
     searchParams: Promise<{ conflicto?: string; guardado?: string; sin_cambios?: string; aviso?: string }>;
   ```
3. Reemplazar `const { conflicto } = await searchParams;` por:
   ```tsx
     const { conflicto, guardado, sin_cambios: sinCambios, aviso } = await searchParams;
   ```
4. Reemplazar `<dd>Sólo lectura: título, detalle y estado vienen del Hub.</dd>` por:
   ```tsx
                     <dd>Título y detalle vienen del Hub; el estado lo manejamos acá.</dd>
   ```
5. Antes del `</div>` que cierra el `container` (la última línea del JSX), agregar:
   ```tsx
         {parseAviso(aviso) === "resuelto" ? (
           <Toast>Le avisamos al cliente que el pedido quedó resuelto.</Toast>
         ) : guardado ? (
           <Toast>Cambios guardados.</Toast>
         ) : sinCambios ? (
           <Toast>No había cambios para guardar.</Toast>
         ) : null}
   ```

- [ ] **Step 7: Correr todo**

Run: `pnpm test && pnpm typecheck && pnpm test:e2e e2e/detalle.admin.spec.ts e2e/komuk.admin.spec.ts e2e/detalle.cliente.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "app/(privado)/tablero" components/Toast.tsx lib/tickets.ts lib/tickets.test.mjs e2e
git commit -m "fix(tablero): guardar el pedido vuelve al pedido y confirma"
```

---

### Task 4: Panel de detalle, mover y responder sin salir del tablero

**Files:**
- Modify: `app/(privado)/tablero/acciones.ts` (agregar `guardarTicket`)
- Create: `components/TableroDetalle.tsx`
- Modify: `components/Tablero.tsx` (reescritura)
- Modify: `components/Toast.tsx`, `components/Toast.module.css`
- Test: `e2e/tablero.admin.spec.ts`, `e2e/tablero.cliente.spec.ts`, `e2e/detalle.cliente.spec.ts`

**Interfaces:**
- Consumes: `guardar()` interna de Task 3; `TableroColumnas`/`TableroLista` con `abierto`/`onAbrir` (Task 2); `ordenNavegacion`, `estancado`, `diasDesde`, `edad`, `COLUMNAS` (Task 1); `LIMITE_RESPUESTA` de `@/lib/tickets`.
- Produces:
  - `guardarTicket(datos: { id: number; estado: string; respuesta?: string; respuestaPrevia?: string; avisar?: boolean }): Promise<ResultadoGuardar>` y `type ResultadoGuardar = { ok: true; mailEnviado: boolean } | { ok: false; motivo: "invalido" | "conflicto" }`, exportados de `acciones.ts`.
  - En `Tablero.tsx`: `mover(id: number, estado: Estado, avisarCliente = true): void` (la Task 5 se lo pasa a las columnas como `onMover`).
  - `Toast` acepta `accion?: { etiqueta: string; alHacer: () => void }`.
  - Panel: `role="dialog"` con nombre = título del pedido; botones de estado con `aria-pressed`; textbox "Respuesta para el cliente"; botón "Guardar"; link "Abrir página completa"; botones "Anterior"/"Siguiente"/"Cerrar".

- [ ] **Step 1: E2E que fallan**

Agregar dentro del `describe` de `e2e/tablero.admin.spec.ts` (el import de `./sembrar.ts` ya trae `altaTicket`):

```ts
  test("click en la tarjeta abre el panel sin salir del tablero", async ({ page }) => {
    const titulo = "Panel sin salir";
    const id = await altaTicket({ titulo, detalle: "Detalle visible en el panel." });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await expect(panel.getByText("Detalle visible en el panel.")).toBeVisible();
    await expect(page).toHaveURL(/\/tablero\/?$/);
    await expect(panel.getByRole("link", { name: "Abrir página completa" })).toHaveAttribute(
      "href",
      `/tablero/${id}/`,
    );

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("cambiar el estado desde el panel mueve la tarjeta, avisa y persiste", async ({ page }) => {
    const titulo = "Mover desde el panel";
    const id = await altaTicket({ titulo, respuesta: "Escrita antes." });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await panel.getByRole("button", { name: "En curso", exact: true }).click();

    await expect(page.getByRole("status")).toContainText(`#${id} pasó a En curso.`);
    await expect(page.getByRole("region", { name: "En curso" }).getByRole("link", { name: titulo })).toBeVisible();
    await expect(panel.getByRole("button", { name: "En curso", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Mover no toca la respuesta: el panel no manda el campo.
    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("select[name=estado]")).toHaveValue("en_curso");
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Escrita antes.");
  });

  test("guardar la respuesta desde el panel", async ({ page }) => {
    const titulo = "Responder desde el panel";
    const id = await altaTicket({ titulo });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await expect(panel.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await panel.getByRole("textbox", { name: "Respuesta para el cliente" }).fill("Lo vemos mañana.");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Respuesta guardada.");

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Lo vemos mañana.");
  });

  test("el panel no pisa una respuesta que cambió en otra pestaña", async ({ page, context }) => {
    const titulo = "Conflicto en el panel";
    const id = await altaTicket({ titulo });
    await page.goto("/tablero/");
    await tarjeta(page, titulo).click();

    const otra = await context.newPage();
    await otra.goto(`/tablero/${id}/`);
    await otra.locator("textarea[name=respuesta]").fill("La escribió la otra pestaña.");
    await otra.getByRole("button", { name: "Guardar y avisar" }).click();
    await expect(otra.getByRole("status")).toHaveText("Cambios guardados.");
    await otra.close();

    const panel = page.getByRole("dialog", { name: titulo });
    await panel.getByRole("textbox", { name: "Respuesta para el cliente" }).fill("La mía.");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Alguien más cambió la respuesta");

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("La escribió la otra pestaña.");
  });

  test("con el panel abierto, j y k recorren los pedidos visibles", async ({ page }) => {
    await altaTicket({ titulo: "Recorrer uno", prioridad: "alta" });
    await altaTicket({ titulo: "Recorrer dos", prioridad: "baja" });
    await page.goto("/tablero/?q=Recorrer");

    await tarjeta(page, "Recorrer uno").click();
    await expect(page.getByRole("dialog", { name: "Recorrer uno" })).toContainText("1 de 2");
    await page.keyboard.press("j");
    await expect(page.getByRole("dialog", { name: "Recorrer dos" })).toContainText("2 de 2");
    await page.keyboard.press("k");
    await expect(page.getByRole("dialog", { name: "Recorrer uno" })).toBeVisible();
  });
```

Agregar a `e2e/tablero.cliente.spec.ts` (sumar `tickets` al import: `import { tickets } from "./tickets.ts";`):

```ts
  test("el panel le muestra la respuesta, sin botones de gestión", async ({ page }) => {
    await page.goto("/tablero/");
    await page.getByRole("link", { name: TITULOS.completo }).click();
    const panel = page.getByRole("dialog", { name: TITULOS.completo });
    await expect(panel.getByText("Lo estamos mirando.")).toBeVisible();
    await expect(panel.getByRole("button", { name: "En curso", exact: true })).toHaveCount(0);
    await expect(panel.getByRole("textbox")).toHaveCount(0);
    await expect(panel.getByRole("link", { name: "Abrir página completa" })).toHaveAttribute(
      "href",
      `/tablero/${tickets.completo}/`,
    );
  });
```

En `e2e/detalle.cliente.spec.ts`, reemplazar los tests "desde el tablero, un click en el título abre el detalle" y "con el teclado, Enter sobre el título también abre el detalle" por:

```ts
  test("desde el tablero, el título abre el panel y de ahí la página completa", async ({ page }) => {
    await page.goto("/tablero/");
    await page.getByRole("link", { name: TITULOS.completo }).click();

    const panel = page.getByRole("dialog", { name: TITULOS.completo });
    await expect(panel.getByText("Cargo el descuento y al guardar salta un error.")).toBeVisible();
    await panel.getByRole("link", { name: "Abrir página completa" }).click();
    await expect(page).toHaveURL(new RegExp(`/tablero/${tickets.completo}/?$`));
  });

  test("con el teclado, Enter sobre el título también abre el panel", async ({ page }) => {
    await page.goto("/tablero/");
    const titulo = page.getByRole("link", { name: TITULOS.completo });
    await titulo.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: TITULOS.completo })).toBeVisible();
  });
```

Run: `pnpm test:e2e e2e/tablero.admin.spec.ts e2e/tablero.cliente.spec.ts e2e/detalle.cliente.spec.ts`
Expected: FAIL — no hay `dialog`.

- [ ] **Step 2: Acción que devuelve resultado**

Agregar al final de `app/(privado)/tablero/acciones.ts`:

```ts
export type ResultadoGuardar =
  | { ok: true; mailEnviado: boolean }
  | { ok: false; motivo: "invalido" | "conflicto" };

/**
 * El tablero mueve y responde sin salir de la página: devuelve en vez de
 * redirigir. `avisar: false` es para Deshacer: el cliente ya recibió un mail
 * y no le mandamos otro por un cambio que nunca quisimos hacer.
 */
export async function guardarTicket(datos: {
  id: number;
  estado: string;
  respuesta?: string;
  respuestaPrevia?: string;
  avisar?: boolean;
}): Promise<ResultadoGuardar> {
  const quien = await identidad();
  if (quien?.rol !== "admin") return { ok: false, motivo: "invalido" };
  // Una server action la puede llamar cualquiera con cualquier cosa: no confiar en la forma.
  const d = (typeof datos === "object" && datos !== null ? datos : {}) as Record<string, unknown>;
  const r = await guardar({
    id: d.id,
    estado: d.estado,
    respuesta: d.respuesta,
    respuestaPrevia: d.respuestaPrevia,
    avisar: d.avisar !== false,
  });
  return r.ok ? { ok: true, mailEnviado: r.mailEnviado } : r;
}
```

- [ ] **Step 3: Toast con acción**

En `components/Toast.tsx`, cambiar la firma y el `return`:

```tsx
export default function Toast({
  children,
  accion,
}: {
  children: string;
  accion?: { etiqueta: string; alHacer: () => void };
}) {
```

```tsx
  return (
    <p className={styles.toast} role="status">
      {children}
      {accion ? (
        <button
          type="button"
          className={styles.accion}
          onClick={() => {
            setVisible(false);
            accion.alHacer();
          }}
        >
          {accion.etiqueta}
        </button>
      ) : null}
    </p>
  );
```

Agregar a `components/Toast.module.css`:

```css
.accion {
  margin-left: 12px;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: inherit;
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
}
```

- [ ] **Step 4: Panel de detalle**

Crear `components/TableroDetalle.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ETIQUETAS, LIMITE_RESPUESTA, type Estado } from "@/lib/tickets";
import { COLUMNAS, diasDesde, edad, estancado, type TarjetaTablero } from "@/lib/tablero";
import styles from "./Tablero.module.css";

// Zona horaria fija: el texto es el mismo en el server y en cualquier navegador.
const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Props = {
  t: TarjetaTablero;
  esAdmin: boolean;
  ahora: number;
  /** i = -1 cuando el pedido abierto ya no pasa los filtros. */
  posicion: { i: number; n: number };
  onCerrar: () => void;
  onPaso: (delta: number) => void;
  onMover: (estado: Estado) => void;
  onResponder: (texto: string) => void;
};

export default function TableroDetalle({ t, esAdmin, ahora, posicion, onCerrar, onPaso, onMover, onResponder }: Props) {
  const [borrador, setBorrador] = useState(t.respuesta ?? "");
  const hayCambios = borrador.trim() !== (t.respuesta ?? "");
  const dias = diasDesde(t.actividad, ahora);
  const tituloId = `detalle-${t.id}`;

  return (
    <aside className={styles.detalle} role="dialog" aria-labelledby={tituloId}>
      <header className={styles.detalleCabecera}>
        <span>
          #{t.id} · {ETIQUETAS[t.tipo]}
        </span>
        <span className={styles.prioridadTexto} data-prioridad={t.prioridad}>
          {ETIQUETAS[t.prioridad]}
        </span>
        <span className={styles.conPunto}>
          <span className={styles.punto} data-estado={t.estado} aria-hidden />
          {ETIQUETAS[t.estado]}
        </span>
        {t.externa !== null ? (
          <a className={styles.badgeExterno} href={t.externa} target="_blank" rel="noopener noreferrer">
            KOMUK Hub
          </a>
        ) : null}
        <div className={styles.detalleAcciones}>
          <button
            type="button"
            className={styles.iconoBoton}
            aria-label="Anterior"
            disabled={posicion.i <= 0}
            onClick={() => onPaso(-1)}
          >
            ↑
          </button>
          <span>{posicion.i >= 0 ? `${posicion.i + 1} de ${posicion.n}` : "fuera del filtro"}</span>
          <button
            type="button"
            className={styles.iconoBoton}
            aria-label="Siguiente"
            disabled={posicion.i >= posicion.n - 1}
            onClick={() => onPaso(1)}
          >
            ↓
          </button>
          {/* autoFocus: el foco entra al panel, y j/k/Esc funcionan sin tocar el mouse. */}
          <button type="button" className={styles.iconoBoton} aria-label="Cerrar" autoFocus onClick={onCerrar}>
            ×
          </button>
        </div>
      </header>

      <h2 id={tituloId} className={styles.detalleTitulo}>
        {t.titulo}
      </h2>
      <a className={styles.completa} href={`/tablero/${t.id}/`}>
        Abrir página completa
      </a>

      <p className={styles.detalleTexto} style={{ marginTop: 12 }}>
        {t.detalle}
      </p>
      {estancado(t, ahora) ? <p className={styles.estancado}>Sin movimiento hace {dias} días</p> : null}

      <dl className={styles.campos}>
        {esAdmin ? (
          <>
            <dt>Cliente</dt>
            <dd>{t.cliente}</dd>
          </>
        ) : null}
        <dt>Reporta</dt>
        <dd>{t.reporta ?? "—"}</dd>
        <dt>Email</dt>
        <dd>{t.email ?? "—"}</dd>
        <dt>URL</dt>
        <dd>{t.url ?? "—"}</dd>
        <dt>Creado</dt>
        <dd>{fecha.format(t.creado)}</dd>
        <dt>Última actividad</dt>
        <dd>
          {fecha.format(t.actividad)} ({edad(dias)})
        </dd>
      </dl>

      {t.adjuntos.length > 0 ? (
        <section className={styles.seccion}>
          <h3 className={styles.h3}>Capturas ({t.adjuntos.length})</h3>
          <ul className={styles.capturas}>
            {t.adjuntos.map((a) => (
              <li key={a.id}>
                <a href={`/adjuntos/${a.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/adjuntos/${a.id}`} alt={a.nombre} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {esAdmin ? (
        <>
          <section className={styles.seccion}>
            <h3 className={styles.h3}>Estado</h3>
            <div className={styles.segmentado}>
              {COLUMNAS.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  aria-pressed={t.estado === estado}
                  onClick={() => onMover(estado)}
                >
                  {ETIQUETAS[estado]}
                </button>
              ))}
            </div>
          </section>
          <section className={styles.seccion}>
            <h3 className={styles.h3}>Respuesta</h3>
            <textarea
              className={styles.respuesta}
              aria-label="Respuesta para el cliente"
              rows={5}
              maxLength={LIMITE_RESPUESTA}
              value={borrador}
              placeholder="Qué le contás al cliente sobre este pedido."
              onChange={(e) => setBorrador(e.target.value)}
            />
            <button type="button" className={styles.guardar} disabled={!hayCambios} onClick={() => onResponder(borrador)}>
              Guardar
            </button>
            {t.email ? <p className={styles.nota}>Le llega por mail a {t.email}</p> : null}
          </section>
        </>
      ) : t.respuesta ? (
        <section className={styles.seccion}>
          <h3 className={styles.h3}>Respuesta</h3>
          <p className={styles.detalleTexto}>{t.respuesta}</p>
        </section>
      ) : null}
    </aside>
  );
}
```

- [ ] **Step 5: Tablero con panel, mover y responder**

Reemplazar `components/Tablero.tsx` entero:

```tsx
"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { guardarTicket, sincronizarKomuk } from "@/app/(privado)/tablero/acciones";
import { ETIQUETAS, type Estado } from "@/lib/tickets";
import {
  DIAS_ESTANCADO,
  FILTROS_INICIALES,
  estancado,
  filtrar,
  filtrosAQuery,
  hayFiltros,
  ordenNavegacion,
  textoSync,
  vivo,
  type Filtros,
  type TarjetaTablero,
} from "@/lib/tablero";
import TableroBarra from "@/components/TableroBarra";
import TableroColumnas from "@/components/TableroColumnas";
import TableroDetalle from "@/components/TableroDetalle";
import TableroLista from "@/components/TableroLista";
import Toast from "@/components/Toast";
import panel from "@/app/(privado)/Panel.module.css";
import styles from "./Tablero.module.css";

type Props = {
  tickets: TarjetaTablero[];
  esAdmin: boolean;
  /** La hora del server: con la del navegador, "hoy" y "ayer" podrían no coincidir al hidratar. */
  ahora: number;
  filtrosIniciales: Filtros;
  sync: { ultima: number | null; error: string | null } | null;
};

type Cambio = { id: number; estado?: Estado; respuesta?: string | null };
type Aviso = { texto: string; deshacer?: () => void; n: number };

const CLAVE_COLAPSADAS = "molpo:tablero:colapsadas";

export default function Tablero({ tickets: delServer, esAdmin, ahora, filtrosIniciales, sync }: Props) {
  // Mover y responder se ven al instante. Si el server falla, al terminar la
  // transición React vuelve solo a lo que vino del server.
  const [tickets, aplicar] = useOptimistic(delServer, (actuales: TarjetaTablero[], c: Cambio) =>
    actuales.map((t) =>
      t.id !== c.id
        ? t
        : {
            ...t,
            estado: c.estado ?? t.estado,
            respuesta: c.respuesta === undefined ? t.respuesta : c.respuesta,
            actividad: ahora,
          },
    ),
  );
  // Deshacer corre varios renders después de armarse: lee los tickets de acá,
  // no los que quedaron en su closure.
  const ultimos = useRef(tickets);
  ultimos.current = tickets;

  const [, enTransicion] = useTransition();
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [menu, setMenu] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<Partial<Record<Estado, boolean>>>({ cerrado: true });
  const [abierto, setAbierto] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  const cambiar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));

  useEffect(() => {
    try {
      const guardadas = localStorage.getItem(CLAVE_COLAPSADAS);
      if (guardadas) setColapsadas(JSON.parse(guardadas));
    } catch {
      // Sin storage (ventana privada, sitio bloqueado): quedan las de fábrica.
    }
  }, []);

  function alternarColumna(estado: Estado) {
    const nuevas = { ...colapsadas, [estado]: !colapsadas[estado] };
    setColapsadas(nuevas);
    try {
      localStorage.setItem(CLAVE_COLAPSADAS, JSON.stringify(nuevas));
    } catch {
      // Ídem: sin storage la preferencia dura hasta recargar.
    }
  }

  // Los filtros viven en la URL para recargar o compartir la vista. replaceState
  // y no router.replace: el router le volvería a pedir la página al server.
  useEffect(() => {
    const query = filtrosAQuery(filtros);
    window.history.replaceState(null, "", `/tablero/${query ? `?${query}` : ""}`);
  }, [filtros]);

  const visibles = useMemo(
    () => filtrar(tickets, filtros, esAdmin, ahora),
    [tickets, filtros, esAdmin, ahora],
  );
  const ids = ordenNavegacion(visibles, filtros.vista, colapsadas);
  const actual = abierto === null ? null : (tickets.find((t) => t.id === abierto) ?? null);

  function avisar(texto: string, deshacer?: () => void) {
    setAviso({ texto, deshacer, n: Date.now() });
  }

  function paso(delta: number) {
    // Fuera del filtro (indexOf = -1), "siguiente" va al primero.
    const siguiente = ids[ids.indexOf(abierto ?? -1) + delta];
    if (siguiente !== undefined) setAbierto(siguiente);
  }

  function mover(id: number, estado: Estado, avisarCliente = true) {
    const t = ultimos.current.find((x) => x.id === id);
    if (!esAdmin || !t || t.estado === estado) return;
    const previo = t.estado;
    enTransicion(async () => {
      aplicar({ id, estado });
      const r = await guardarTicket({ id, estado, avisar: avisarCliente });
      if (!r.ok) return avisar(`No pudimos mover #${id}. Probá de nuevo.`);
      if (!avisarCliente) return avisar(`#${id} volvió a ${ETIQUETAS[estado]}.`);
      const aQuien = r.mailEnviado ? ` Le avisamos a ${t.reporta ?? t.email}.` : "";
      avisar(`#${id} pasó a ${ETIQUETAS[estado]}.${aQuien}`, () => mover(id, previo, false));
    });
  }

  function responder(id: number, texto: string) {
    const t = ultimos.current.find((x) => x.id === id);
    if (!esAdmin || !t) return;
    const respuesta = texto.trim() || null;
    if ((respuesta ?? "") === (t.respuesta ?? "")) return;
    enTransicion(async () => {
      aplicar({ id, respuesta });
      const r = await guardarTicket({
        id,
        estado: t.estado,
        respuesta: texto,
        respuestaPrevia: t.respuesta ?? "",
      });
      if (!r.ok) {
        return avisar(
          r.motivo === "conflicto"
            ? "Alguien más cambió la respuesta mientras escribías. Revisala antes de guardar de nuevo."
            : "No pudimos guardar la respuesta. Probá de nuevo.",
        );
      }
      if (!respuesta) return avisar("Respuesta borrada.");
      avisar(r.mailEnviado ? `Respuesta guardada. Le llega por mail a ${t.reporta ?? t.email}.` : "Respuesta guardada.");
    });
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const escribiendo =
        e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        if (menu) setMenu(null);
        else if (abierto !== null) setAbierto(null);
        if (escribiendo) (e.target as HTMLElement).blur();
        return;
      }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        buscador.current?.focus();
      } else if (abierto !== null && (e.key === "j" || e.key === "ArrowDown")) {
        e.preventDefault();
        paso(1);
      } else if (abierto !== null && (e.key === "k" || e.key === "ArrowUp")) {
        e.preventDefault();
        paso(-1);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const filtrando = hayFiltros(filtros, esAdmin);
  const sinCerrar = tickets.filter(vivo).length;
  const altas = tickets.filter((t) => t.prioridad === "alta" && vivo(t)).length;
  const estancados = tickets.filter((t) => estancado(t, ahora)).length;

  return (
    <div className={styles.raiz}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={panel.h1}>{esAdmin ? "Tablero" : "Tus pedidos"}</h1>
          <p className={styles.resumen}>
            {tickets.length} pedidos · {sinCerrar} sin cerrar
          </p>
        </div>
        {sync ? (
          <form action={sincronizarKomuk} className={styles.sync}>
            <BotonSync ultima={sync.ultima} ahora={ahora} />
            {sync.error ? (
              <p className={styles.syncError} role="alert">
                Último error: {sync.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </header>

      {altas > 0 || estancados > 0 ? (
        <div className={styles.alertas}>
          {altas > 0 ? (
            <button type="button" className={styles.alerta} onClick={() => cambiar({ prioridades: ["alta"] })}>
              {altas} de prioridad alta
            </button>
          ) : null}
          {estancados > 0 ? (
            <button
              type="button"
              className={styles.alerta}
              onClick={() =>
                setFiltros((f) =>
                  f.atajos.includes("estancados") ? f : { ...f, atajos: [...f.atajos, "estancados"] },
                )
              }
            >
              {estancados} sin movimiento hace más de {DIAS_ESTANCADO} días
            </button>
          ) : null}
        </div>
      ) : null}

      <TableroBarra
        tickets={tickets}
        filtros={filtros}
        cambiar={cambiar}
        limpiar={() => setFiltros((f) => ({ ...FILTROS_INICIALES, orden: f.orden, vista: f.vista }))}
        esAdmin={esAdmin}
        ahora={ahora}
        visibles={visibles.length}
        filtrando={filtrando}
        menu={menu}
        setMenu={setMenu}
        buscador={buscador}
      />

      {filtros.vista === "tablero" ? (
        <TableroColumnas
          tickets={tickets}
          visibles={visibles}
          filtrando={filtrando}
          colapsadas={colapsadas}
          onColapsar={alternarColumna}
          esAdmin={esAdmin}
          ahora={ahora}
          abierto={abierto}
          onAbrir={setAbierto}
        />
      ) : (
        <TableroLista
          visibles={visibles}
          filtrando={filtrando}
          esAdmin={esAdmin}
          ahora={ahora}
          abierto={abierto}
          onAbrir={setAbierto}
        />
      )}

      {actual ? (
        <TableroDetalle
          key={actual.id}
          t={actual}
          esAdmin={esAdmin}
          ahora={ahora}
          posicion={{ i: ids.indexOf(actual.id), n: ids.length }}
          onCerrar={() => setAbierto(null)}
          onPaso={paso}
          onMover={(estado) => mover(actual.id, estado)}
          onResponder={(texto) => responder(actual.id, texto)}
        />
      ) : null}

      {aviso ? (
        <Toast key={aviso.n} accion={aviso.deshacer ? { etiqueta: "Deshacer", alHacer: aviso.deshacer } : undefined}>
          {aviso.texto}
        </Toast>
      ) : null}
    </div>
  );
}

function BotonSync({ ultima, ahora }: { ultima: number | null; ahora: number }) {
  const { pending } = useFormStatus();
  return (
    <>
      <span className={styles.syncEstado}>
        KOMUK Hub · {pending ? "sincronizando…" : textoSync(ultima, ahora)}
      </span>
      <button type="submit" className={styles.syncBoton} disabled={pending}>
        {pending ? "Sincronizando…" : "Sincronizar"}
      </button>
    </>
  );
}
```

- [ ] **Step 6: Correr todo**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(privado)/tablero/acciones.ts" components e2e
git commit -m "feat(tablero): panel de detalle para mover y responder"
```

---

### Task 5: Drag & drop con Deshacer

**Files:**
- Modify: `components/TableroColumnas.tsx` (reescritura)
- Modify: `components/Tablero.tsx` (una prop)
- Test: `e2e/tablero.admin.spec.ts`, `e2e/detalle.cliente.spec.ts`

**Interfaces:**
- Consumes: `mover(id: number, estado: Estado, avisarCliente?: boolean)` de `Tablero.tsx` (Task 4).
- Produces: `TableroColumnas` acepta `onMover?: (id: number, estado: Estado) => void`. Tarjeta con `draggable="true"` sólo para admin.

- [ ] **Step 1: E2E que fallan**

Agregar al `describe` de `e2e/tablero.admin.spec.ts`:

```ts
  test("arrastrar una tarjeta la mueve, y Deshacer la devuelve de verdad", async ({ page }) => {
    const titulo = "Arrastrar y deshacer";
    const id = await altaTicket({ titulo });
    await page.goto(`/tablero/?q=${encodeURIComponent(titulo)}`);

    const resuelto = page.getByRole("region", { name: "Resuelto" });
    await page.locator("li", { has: tarjeta(page, titulo) }).dragTo(resuelto);
    await expect(resuelto.getByRole("link", { name: titulo })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(`#${id} pasó a Resuelto.`);

    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("status")).toContainText(`#${id} volvió a Abierto.`);
    await expect(page.getByRole("region", { name: "Abierto" }).getByRole("link", { name: titulo })).toBeVisible();

    // Persistido, no sólo en pantalla.
    await page.reload();
    await expect(page.getByRole("region", { name: "Abierto" }).getByRole("link", { name: titulo })).toBeVisible();
  });

  test("soltar en la misma columna no hace nada", async ({ page }) => {
    const titulo = "Soltar en el lugar";
    await altaTicket({ titulo });
    await page.goto(`/tablero/?q=${encodeURIComponent(titulo)}`);

    await page.locator("li", { has: tarjeta(page, titulo) }).dragTo(page.getByRole("region", { name: "Abierto" }));
    // mover() sale antes de llamar al server: si hubiera toast, aparecería enseguida.
    await page.waitForTimeout(500);
    await expect(page.getByRole("status")).toHaveCount(0);
  });
```

En `e2e/detalle.cliente.spec.ts`, en "el cliente no mueve tickets desde la tarjeta", agregar al final:

```ts
    await expect(tarjeta).not.toHaveAttribute("draggable", "true");
```

Run: `pnpm test:e2e e2e/tablero.admin.spec.ts`
Expected: FAIL — la tarjeta no se mueve.

- [ ] **Step 2: Columnas con drag & drop**

Reemplazar `components/TableroColumnas.tsx` entero:

```tsx
"use client";

import { useState, type MouseEvent } from "react";
import { ETIQUETAS, type Estado } from "@/lib/tickets";
import { COLUMNAS, diasDesde, edad, estancado, vivo, type TarjetaTablero } from "@/lib/tablero";
import styles from "./Tablero.module.css";

/** Click común abre el panel; con modificador o rueda sigue siendo el link a la página completa. */
export function abrirSinSalir(e: MouseEvent, abrir?: () => void) {
  if (!abrir || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  abrir();
}

/** Click en cualquier parte de la tarjeta o la fila, salvo en sus links y botones. */
export function abrirDesdeFondo(e: MouseEvent, abrir?: () => void) {
  if (abrir && !(e.target instanceof Element && e.target.closest("a, button, input"))) abrir();
}

type Props = {
  tickets: TarjetaTablero[];
  visibles: TarjetaTablero[];
  filtrando: boolean;
  colapsadas: Partial<Record<Estado, boolean>>;
  onColapsar: (estado: Estado) => void;
  esAdmin: boolean;
  ahora: number;
  abierto?: number | null;
  onAbrir?: (id: number) => void;
  onMover?: (id: number, estado: Estado) => void;
};

export default function TableroColumnas({
  tickets,
  visibles,
  filtrando,
  colapsadas,
  onColapsar,
  esAdmin,
  ahora,
  abierto,
  onAbrir,
  onMover,
}: Props) {
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Estado | null>(null);
  const soltar = () => {
    setArrastrando(null);
    setSobre(null);
  };
  const arrastrable = esAdmin && Boolean(onMover);

  return (
    <div className={styles.tablero} onDragEnd={soltar}>
      {COLUMNAS.map((estado) => {
        const tarjetas = visibles.filter((t) => t.estado === estado);
        const total = tickets.filter((t) => t.estado === estado).length;
        const altas = tarjetas.filter((t) => t.prioridad === "alta" && vivo(t)).length;
        const colapsada = Boolean(colapsadas[estado]);
        const etiqueta = ETIQUETAS[estado];
        return (
          <section
            key={estado}
            className={styles.columna}
            data-colapsada={colapsada || undefined}
            data-sobre={sobre === estado || undefined}
            aria-label={etiqueta}
            // Sólo se acepta lo que se arrastró desde este tablero: un link o
            // un archivo soltado desde afuera no mueve nada.
            onDragOver={(e) => {
              if (arrastrando === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setSobre(estado);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setSobre((s) => (s === estado ? null : s));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = arrastrando;
              soltar();
              if (id !== null) onMover?.(id, estado);
            }}
          >
            <header className={styles.columnaCabecera}>
              <span className={styles.punto} data-estado={estado} aria-hidden />
              <h2 className={styles.columnaTitulo}>{etiqueta}</h2>
              <span className={styles.cuenta}>{filtrando ? `${tarjetas.length} de ${total}` : total}</span>
              {altas > 0 ? (
                <span className={styles.altas}>
                  {altas} alta{altas > 1 ? "s" : ""}
                </span>
              ) : null}
              <button
                type="button"
                className={styles.colapsar}
                aria-expanded={!colapsada}
                aria-label={`${colapsada ? "Expandir" : "Colapsar"} ${etiqueta}`}
                onClick={() => onColapsar(estado)}
              >
                {colapsada ? "+" : "−"}
              </button>
            </header>
            {colapsada ? null : (
              <ul className={styles.pila}>
                {tarjetas.map((t) => (
                  <Tarjeta
                    key={t.id}
                    t={t}
                    esAdmin={esAdmin}
                    ahora={ahora}
                    seleccionada={abierto === t.id}
                    arrastrable={arrastrable}
                    arrastrada={arrastrando === t.id}
                    onArrastrar={() => setArrastrando(t.id)}
                    onAbrir={onAbrir && (() => onAbrir(t.id))}
                  />
                ))}
                {tarjetas.length === 0 ? (
                  <li className={styles.vacia}>
                    {arrastrando !== null ? "Soltá acá" : filtrando ? "Nada con estos filtros" : "Nada acá"}
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Tarjeta({
  t,
  esAdmin,
  ahora,
  seleccionada,
  arrastrable,
  arrastrada,
  onArrastrar,
  onAbrir,
}: {
  t: TarjetaTablero;
  esAdmin: boolean;
  ahora: number;
  seleccionada: boolean;
  arrastrable: boolean;
  arrastrada: boolean;
  onArrastrar: () => void;
  onAbrir?: () => void;
}) {
  const dias = diasDesde(t.actividad, ahora);
  return (
    <li
      className={styles.tarjeta}
      data-seleccionada={seleccionada || undefined}
      data-arrastrada={arrastrada || undefined}
      draggable={arrastrable}
      onDragStart={(e) => {
        if (!arrastrable) return;
        e.dataTransfer.effectAllowed = "move";
        // Firefox no arranca el drag sin datos; el id real viaja en el estado.
        e.dataTransfer.setData("text/plain", String(t.id));
        onArrastrar();
      }}
      onClick={(e) => abrirDesdeFondo(e, onAbrir)}
    >
      <div className={styles.tarjetaMeta}>
        <span
          className={styles.punto}
          data-prioridad={t.prioridad}
          title={`Prioridad ${ETIQUETAS[t.prioridad].toLowerCase()}`}
        />
        <span>
          #{t.id} · {ETIQUETAS[t.tipo]}
        </span>
        {t.externa !== null ? (
          <a className={styles.badgeExterno} href={t.externa} target="_blank" rel="noopener noreferrer">
            KOMUK Hub
          </a>
        ) : null}
      </div>
      {esAdmin ? <p className={styles.tarjetaCliente}>{t.cliente}</p> : null}
      <p className={styles.tarjetaTitulo}>
        <a href={`/tablero/${t.id}/`} draggable={false} onClick={(e) => abrirSinSalir(e, onAbrir)}>
          {t.titulo}
        </a>
      </p>
      <p className={styles.tarjetaPie}>
        <span>{edad(dias)}</span>
        {t.adjuntos.length > 0 ? (
          <span>
            {t.adjuntos.length} captura{t.adjuntos.length > 1 ? "s" : ""}
          </span>
        ) : null}
        {t.respuesta ? <span>Respondido</span> : null}
      </p>
      {estancado(t, ahora) ? <p className={styles.estancado}>Sin movimiento hace {dias} d</p> : null}
    </li>
  );
}
```

(`draggable={false}` en el link del título: si no, arrastrar desde el título arrastra la URL y no la tarjeta.)

- [ ] **Step 3: Conectar `mover`**

En `components/Tablero.tsx`, dentro de `<TableroColumnas … />`, reemplazar:

```tsx
          abierto={abierto}
          onAbrir={setAbierto}
        />
      ) : (
```

por:

```tsx
          abierto={abierto}
          onAbrir={setAbierto}
          onMover={mover}
        />
      ) : (
```

- [ ] **Step 4: Correr todo**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components e2e
git commit -m "feat(tablero): mover pedidos arrastrando, con deshacer"
```

---

### Task 6: Mobile y verificación final

**Files:**
- Test: `e2e/tablero.cliente.spec.ts`
- Modify (sólo si el test o la revisión visual lo piden): `components/Tablero.module.css`

**Interfaces:**
- Consumes: todo lo anterior. No produce nada nuevo.

- [ ] **Step 1: E2E de mobile**

Agregar al `describe` de `e2e/tablero.cliente.spec.ts`:

```ts
  test("en el celular la página no scrollea de costado y el panel ocupa la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/tablero/");

    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho).toBeLessThanOrEqual(375);

    await page.getByRole("link", { name: TITULOS.completo }).click();
    const caja = await page.getByRole("dialog", { name: TITULOS.completo }).boundingBox();
    expect(caja?.width).toBe(375);
  });
```

- [ ] **Step 2: Correr**

Run: `pnpm test:e2e e2e/tablero.cliente.spec.ts`
Expected: PASS. Si el ancho da más de 375, buscar con DevTools el elemento que desborda (lo más probable: `.barra` sin `min-width: 0` en algún hijo, o `.tablero` sin `overflow-x: auto`) y corregirlo en `components/Tablero.module.css` dentro del `@media (max-width: 860px)`.

- [ ] **Step 3: Revisión visual**

Run: `pnpm dev` y abrir `http://app.localhost:3000/tablero/` como admin, en claro y oscuro (botón de tema del sidebar), a 1440px y a 375px. Comparar contra `docs/superpowers/specs/2026-10-14-tablero-kanban-referencia/Tablero.dc.html`. Revisar: columnas con scroll propio y la página sin scroll en desktop; Cerrado colapsada como tira angosta; menú de filtros encima de las columnas; panel de detalle por encima de todo; toast con "Deshacer" visible y legible en los dos temas.

- [ ] **Step 4: Verificación completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add e2e components/Tablero.module.css
git commit -m "test(tablero): cubrir el tablero en mobile"
```
