import test from "node:test";
import assert from "node:assert/strict";
import {
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

test("filtrosDesdeQuery ignora ?cliente= vacío", () => {
  assert.deepEqual(filtrosDesdeQuery({ cliente: "" }).clientes, []);
  assert.deepEqual(filtrosDesdeQuery({ cliente: ["", "A"] }).clientes, ["A"]);
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
