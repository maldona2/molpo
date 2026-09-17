import test from "node:test";
import assert from "node:assert/strict";
import { sincronizar, mapear, desde, hrefSeguro, FUENTE, SOLAPAMIENTO_MS } from "./komuk-hub-sync.ts";
import { HubError } from "./komuk-hub.ts";

const cfg = { baseUrl: "https://hub.test", token: "t" };
const req = (id, o = {}) => ({ id, title: `Req ${id}`, description: "desc", status: "open", priority: "high", created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-10T00:00:00Z", url: `https://hub.test/r/${id}`, ...o });

function repoMemoria({ cliente = "KOMUK", ultimo = null } = {}) {
  const tickets = new Map();
  const estado = { ultimo, error: null, oks: 0 };
  return {
    tickets, estado,
    async ultimoSync() { return estado.ultimo; },
    async clienteExiste() { return cliente; },
    async upsert(fuente, cli, t) {
      const clave = `${fuente}:${t.externalId}`;
      const previo = tickets.get(clave);
      if (!previo) { tickets.set(clave, { ...t, cliente: cli, estadoTrabajo: t.estado, respuesta: null }); return "creado"; }
      if (previo.externalUpdatedAt.getTime() === t.externalUpdatedAt.getTime()) return "sin_cambios";
      // Igual que el SQL: sólo campos de origen; el estado de trabajo y la respuesta no se tocan.
      tickets.set(clave, { ...previo, titulo: t.titulo, detalle: t.detalle, externalStatus: t.externalStatus, externalUrl: t.externalUrl, externalUpdatedAt: t.externalUpdatedAt, prioridad: t.prioridad });
      return "actualizado";
    },
    async marcarOk(_f, at) { estado.ultimo = at; estado.error = null; estado.oks++; },
    async marcarError(_f, msg) { estado.error = msg; },
  };
}
const api = (paginas) => { const vistos = []; const fn = async (_cfg, p) => { vistos.push(p); const pag = paginas[p.cursor ?? "_"]; if (pag instanceof Error) throw pag; return pag; }; fn.vistos = vistos; return fn; };
const ahora = () => new Date("2026-09-17T12:00:00Z");
const calla = () => {};

test("crea tickets nuevos asignados a KOMUK con estado mapeado", async () => {
  const repo = repoMemoria();
  const r = await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [req("1")], next_cursor: null } }), ahora, avisar: calla });
  assert.deepEqual(r, { ok: true, creados: 1, actualizados: 0, sinCambios: 0, paginas: 1 });
  const t = repo.tickets.get(`${FUENTE}:1`);
  assert.equal(t.cliente, "KOMUK");
  assert.equal(t.estado, "abierto");
  assert.equal(t.prioridad, "alta");
  assert.equal(t.externalUrl, "https://hub.test/r/1");
  assert.equal(repo.estado.ultimo.toISOString(), "2026-09-17T12:00:00.000Z");
});

test("actualiza sólo campos de origen y respeta el estado de trabajo", async () => {
  const repo = repoMemoria();
  await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [req("1")], next_cursor: null } }), ahora, avisar: calla });
  const t = repo.tickets.get(`${FUENTE}:1`);
  t.estadoTrabajo = "en_curso"; t.respuesta = "nota mía";
  const r = await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [req("1", { title: "Nuevo", status: "done", updated_at: "2026-09-11T00:00:00Z" })], next_cursor: null } }), ahora, avisar: calla });
  assert.equal(r.actualizados, 1);
  const u = repo.tickets.get(`${FUENTE}:1`);
  assert.equal(u.titulo, "Nuevo");
  assert.equal(u.externalStatus, "done");
  assert.equal(u.estadoTrabajo, "en_curso");
  assert.equal(u.respuesta, "nota mía");
});

test("idempotente: correr dos veces no duplica ni actualiza", async () => {
  const repo = repoMemoria();
  const paginas = { _: { data: [req("1"), req("2")], next_cursor: null } };
  await sincronizar({ repo, cfg, fetchPagina: api(paginas), ahora, avisar: calla });
  const r = await sincronizar({ repo, cfg, fetchPagina: api(paginas), ahora, avisar: calla });
  assert.deepEqual(r, { ok: true, creados: 0, actualizados: 0, sinCambios: 2, paginas: 1 });
  assert.equal(repo.tickets.size, 2);
});

test("recorre todos los cursores con el mismo updated_since", async () => {
  const repo = repoMemoria({ ultimo: new Date("2026-09-17T10:00:00Z") });
  const f = api({ _: { data: [req("1")], next_cursor: "c2" }, c2: { data: [req("2")], next_cursor: "c3" }, c3: { data: [req("3")], next_cursor: null } });
  const r = await sincronizar({ repo, cfg, fetchPagina: f, ahora, avisar: calla });
  assert.equal(r.paginas, 3);
  assert.equal(repo.tickets.size, 3);
  assert.deepEqual(f.vistos.map((p) => p.cursor ?? null), [null, "c2", "c3"]);
  assert.ok(f.vistos.every((p) => p.updatedSince === "2026-09-17T09:55:00.000Z"), "5 min de solapamiento");
});

for (const status of [401, 500]) {
  test(`error ${status} guarda last_error y no avanza last_synced_at`, async () => {
    const previo = new Date("2026-09-17T10:00:00Z");
    const repo = repoMemoria({ ultimo: previo });
    const f = api({ _: { data: [req("1")], next_cursor: "c2" }, c2: new HubError(`El Hub respondió ${status} en /api`, status) });
    const r = await sincronizar({ repo, cfg, fetchPagina: f, ahora, avisar: calla });
    assert.equal(r.ok, false);
    assert.match(repo.estado.error, new RegExp(String(status)));
    assert.equal(repo.estado.ultimo, previo);
    assert.equal(repo.estado.oks, 0);
  });
}

test("error no-Hub no filtra su mensaje crudo", async () => {
  const repo = repoMemoria();
  const r = await sincronizar({ repo, cfg, fetchPagina: api({ _: new Error("Bearer t filtrado") }), ahora, avisar: calla });
  assert.equal(r.ok, false);
  assert.ok(!repo.estado.error.includes("Bearer"));
});

test("sin cliente KOMUK: error claro y no crea nada ni llama al Hub", async () => {
  const repo = repoMemoria({ cliente: null });
  const f = api({ _: { data: [req("1")], next_cursor: null } });
  const r = await sincronizar({ repo, cfg, fetchPagina: f, ahora, avisar: calla });
  assert.equal(r.ok, false);
  assert.match(r.error, /KOMUK/);
  assert.equal(f.vistos.length, 0);
  assert.equal(repo.tickets.size, 0);
  assert.equal(repo.estado.ultimo, null);
});

test("status y priority desconocidos van al default con advertencia", () => {
  const avisos = [];
  const m = mapear(req("9", { status: "Frozen", priority: "p0" }), (a) => avisos.push(a));
  assert.deepEqual(m, { estado: "abierto", prioridad: "media" });
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /Frozen/);
});

test("mapeo ignora mayúsculas y espacios", () => {
  assert.deepEqual(mapear(req("9", { status: " In_Progress ", priority: "LOW" }), calla), { estado: "en_curso", prioridad: "baja" });
});

test("cursor repetido corta con error", async () => {
  const repo = repoMemoria();
  const r = await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [], next_cursor: "a" }, a: { data: [], next_cursor: "a" } }), ahora, avisar: calla });
  assert.equal(r.ok, false);
  assert.match(repo.estado.error, /cursor/);
});

test("desde resta 5 minutos y sin historial arranca de 1970", () => {
  assert.equal(SOLAPAMIENTO_MS, 300000);
  assert.equal(desde(null), "1970-01-01T00:00:00.000Z");
  assert.equal(desde(new Date("2026-09-17T10:00:00Z")), "2026-09-17T09:55:00.000Z");
});

test("hrefSeguro sólo deja pasar http y https", () => {
  assert.equal(hrefSeguro("https://hub.test/r/1"), "https://hub.test/r/1");
  assert.equal(hrefSeguro("javascript:alert(1)"), "#");
  assert.equal(hrefSeguro("no es url"), "#");
});

test("título vacío y textos largos se acotan", async () => {
  const repo = repoMemoria();
  await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [req("1", { title: "  ", description: "x".repeat(6000) })], next_cursor: null } }), ahora, avisar: calla });
  const t = repo.tickets.get(`${FUENTE}:1`);
  assert.equal(t.titulo, "(sin título)");
  assert.equal(t.detalle.length, 5000);
});
