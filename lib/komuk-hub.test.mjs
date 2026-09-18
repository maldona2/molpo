import test from "node:test";
import assert from "node:assert/strict";
import { configDesdeEnv, fetchPagina, HubError } from "./komuk-hub.ts";

const cfg = { baseUrl: "https://hub.test/", token: "secreto-123" };
const sinEspera = async () => {};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("configDesdeEnv exige las dos variables", () => {
  assert.throws(() => configDesdeEnv({ KOMUK_HUB_BASE_URL: "https://x" }), /KOMUK_HUB_TOKEN/);
  assert.throws(() => configDesdeEnv({ KOMUK_HUB_TOKEN: "t" }), /KOMUK_HUB_BASE_URL/);
  assert.deepEqual(configDesdeEnv({ KOMUK_HUB_BASE_URL: "https://x/", KOMUK_HUB_TOKEN: "t" }), { baseUrl: "https://x", token: "t" });
});

test("arma la URL, manda el bearer y sólo hace GET", async () => {
  let visto;
  const fetch = async (url, init) => { visto = { url: String(url), init }; return json({ data: [], next_cursor: null }); };
  await fetchPagina(cfg, { updatedSince: "2026-01-01T00:00:00.000Z", cursor: "abc" }, { fetch, esperar: sinEspera });
  const u = new URL(visto.url);
  assert.equal(u.origin + u.pathname, "https://hub.test/api/external/v1/requerimientos");
  assert.equal(u.searchParams.get("updated_since"), "2026-01-01T00:00:00.000Z");
  assert.equal(u.searchParams.get("cursor"), "abc");
  assert.equal(u.searchParams.get("limit"), "50");
  assert.equal(visto.init.method, "GET");
  assert.equal(new Headers(visto.init.headers).get("authorization"), "Bearer secreto-123");
  assert.ok(visto.init.signal, "tiene timeout");
});

test("sin cursor no manda el parámetro", async () => {
  let url;
  await fetchPagina(cfg, { updatedSince: "2026-01-01T00:00:00.000Z" }, { fetch: async (u) => { url = new URL(String(u)); return json({ data: [], next_cursor: null }); }, esperar: sinEspera });
  assert.equal(url.searchParams.has("cursor"), false);
});

test("reintenta 5xx y 429 con backoff y después anda", async () => {
  const respuestas = [json({}, 503), json({}, 429), json({ data: [], next_cursor: null })];
  const esperas = [];
  const pagina = await fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => respuestas.shift(), esperar: async (ms) => { esperas.push(ms); } });
  assert.deepEqual(pagina, { data: [], next_cursor: null });
  assert.equal(esperas.length, 2);
  assert.ok(esperas[1] > esperas[0], "backoff creciente");
});

test("respeta Retry-After en 429", async () => {
  const respuestas = [new Response("", { status: 429, headers: { "retry-after": "7" } }), json({ data: [], next_cursor: null })];
  const esperas = [];
  await fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => respuestas.shift(), esperar: async (ms) => { esperas.push(ms); } });
  assert.deepEqual(esperas, [7000]);
});

test("se rinde tras agotar reintentos con HubError 500", async () => {
  let llamadas = 0;
  await assert.rejects(
    fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => { llamadas++; return json({}, 500); }, esperar: sinEspera, reintentos: 2 }),
    (e) => e instanceof HubError && e.status === 500,
  );
  assert.equal(llamadas, 3);
});

test("401 no se reintenta y el error no contiene el token", async () => {
  let llamadas = 0;
  await assert.rejects(
    fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => { llamadas++; return json({ error: "bad token secreto-123" }, 401); }, esperar: sinEspera }),
    (e) => e instanceof HubError && e.status === 401 && !e.message.includes("secreto-123"),
  );
  assert.equal(llamadas, 1);
});

test("error de red o timeout se reintenta y el mensaje no filtra el token", async () => {
  await assert.rejects(
    fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => { throw new Error("boom Bearer secreto-123"); }, esperar: sinEspera, reintentos: 1 }),
    (e) => e instanceof HubError && e.status === null && !e.message.includes("secreto-123"),
  );
});

test("rechaza una respuesta con forma inválida", async () => {
  await assert.rejects(
    fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => json({ items: [] }), esperar: sinEspera }),
    HubError,
  );
  await assert.rejects(
    fetchPagina(cfg, { updatedSince: "x" }, { fetch: async () => json({ data: [{ id: 1 }], next_cursor: null }), esperar: sinEspera }),
    HubError,
  );
});
