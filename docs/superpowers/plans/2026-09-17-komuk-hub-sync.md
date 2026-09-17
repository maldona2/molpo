# KOMUK Hub → tickets molpo (sync de solo lectura) Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **auto-build host:** Claude plans+reviews; Grok implements via headless CLI.
> <!-- auto-build plan · 2026-09-17 · source: claude+writing-plans -->

**Goal:** Traer los requerimientos del Hub de KOMUK como tickets espejo del cliente KOMUK en app.molpo.ar, sin escribir nunca en el Hub.

**Architecture:** Tres módulos al estilo del repo (`x.ts` puro/testeable + `x-db.ts` con SQL): cliente HTTP (`lib/komuk-hub.ts`), núcleo del sync con dependencias inyectadas (`lib/komuk-hub-sync.ts`) y persistencia (`lib/komuk-hub-db.ts`). El esquema sigue el patrón existente `ensureSchema` + `alter table … add column if not exists` (el repo no tiene herramienta de migraciones). Scheduler: `instrumentation.ts` de Next con `setInterval` de 15 min + `pg_try_advisory_lock` para que dos procesos no corran a la vez. Botón admin en `/tablero/` llama a un server action.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `postgres` (porsager), tests con `node --test` + type stripping (`lib/*.test.mjs`), Playwright en `e2e/`.

## Global Constraints

- No push, no deploy, no tocar la base de producción, no commitear secretos. No commits salvo pedido explícito.
- molpo nunca escribe en el Hub: el cliente HTTP sólo hace `GET`.
- El token (`KOMUK_HUB_TOKEN`) nunca se loguea ni aparece en mensajes de error ni en `last_error`.
- Sin dependencias nuevas. `fetch` nativo + `AbortSignal.timeout`.
- Imports entre módulos puros de `lib/` con extensión `.ts` explícita (lo exige `node --experimental-strip-types`). Módulos con SQL empiezan con `import "server-only";` y usan `@/lib/...`.
- Comentarios y textos de UI en español rioplatense, mismo tono que el repo.
- Nunca `dangerouslySetInnerHTML` para datos del Hub. Renderizar como texto JSX.
- El sync jamás actualiza `estado`, `respuesta`, `orden`, `tipo`, `cliente`, `email`, `reporta` de un ticket existente.
- No tocar los archivos ya modificados en el working tree que no son de esta tarea (`content/*`, `app/(sitio)/*`, `lib/site.ts`, `public/llms.txt`, `.ai/*`, `docs/deployment/agente.md`).

## File Structure

| Archivo | Responsabilidad |
|---|---|
| Create `lib/komuk-hub.ts` | Cliente HTTP puro: config desde env, `fetchPagina`, reintentos/backoff, errores sin token. |
| Create `lib/komuk-hub.test.mjs` | Tests del cliente con `fetch` mockeado. |
| Create `lib/komuk-hub-sync.ts` | Mapeo editable status/priority, `desde()` con solapamiento, `sincronizar(deps)` que recorre cursores. |
| Create `lib/komuk-hub-sync.test.mjs` | Tests del sync con API y repo en memoria. |
| Create `lib/komuk-hub-db.ts` | Esquema (columnas externas + `sync_estado`), repo real (upsert SQL), `correrSyncKomuk()` con advisory lock. |
| Modify `lib/tickets-db.ts` | Columnas `external_*` + índice único en `asegurarTickets`. |
| Modify `lib/tickets.ts` | Campos nuevos en el tipo `Ticket`. |
| Create `instrumentation.ts` | Programa el sync cada 15 min en el runtime nodejs. |
| Modify `app/(privado)/tablero/acciones.ts` | Server action `sincronizarKomuk` (sólo admin). |
| Modify `app/(privado)/tablero/page.tsx` | Botón "Sincronizar ahora" + último estado del sync (sólo admin); pasa `externa` a las tarjetas. |
| Modify `components/Tablero.tsx` | Badge "KOMUK Hub" con link en la tarjeta. |
| Modify `app/(privado)/tablero/[id]/page.tsx` | Badge + link + "Estado en el Hub" de sólo lectura. |
| Modify CSS modules (`Tablero.module.css`, `Detalle.module.css`) | Estilo del badge. |
| Modify `e2e/sembrar.ts`, create `e2e/komuk.admin.spec.ts`, `e2e/komuk.cliente.spec.ts` | Ticket espejo con HTML en el título; escape + aislamiento entre clientes. |
| Modify `.env.example`, create `docs/integrations/komuk-hub.md`, modify `docs/deployment/app.md` | Entrega. |

---

### Task 1: Cliente HTTP del Hub

**Files:**
- Create: `lib/komuk-hub.ts`
- Test: `lib/komuk-hub.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export type Requerimiento = { id: string; title: string; description: string; status: string; priority: string; created_at: string; updated_at: string; url: string };
  export type Pagina = { data: Requerimiento[]; next_cursor: string | null };
  export type HubConfig = { baseUrl: string; token: string };
  export class HubError extends Error { status: number | null }
  export function configDesdeEnv(env?: Record<string, string | undefined>): HubConfig; // tira Error si falta alguna variable
  export function fetchPagina(cfg: HubConfig, params: { updatedSince: string; cursor?: string | null; limit?: number }, opts?: { fetch?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number; reintentos?: number }): Promise<Pagina>;
  ```

- [ ] **Step 1: Write the failing tests** en `lib/komuk-hub.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `node --experimental-strip-types --test lib/komuk-hub.test.mjs`
Expected: FAIL, `Cannot find module .../lib/komuk-hub.ts`.

- [ ] **Step 3: Implement `lib/komuk-hub.ts`**

```ts
// Cliente HTTP del Hub de KOMUK. Sólo lectura: el único verbo es GET.
// Sin acceso a base: lo testeable vive acá. El token nunca va a un mensaje de
// error ni a un log: los mensajes se arman con status y ruta, jamás con lo que
// devolvió el servidor ni con el error original de fetch (puede traer headers).

export type Requerimiento = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  url: string;
};

export type Pagina = { data: Requerimiento[]; next_cursor: string | null };
export type HubConfig = { baseUrl: string; token: string };

export class HubError extends Error {
  status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "HubError";
    this.status = status;
  }
}

const RUTA = "/api/external/v1/requerimientos";

export function configDesdeEnv(env: Record<string, string | undefined> = process.env): HubConfig {
  const baseUrl = env.KOMUK_HUB_BASE_URL?.trim();
  const token = env.KOMUK_HUB_TOKEN?.trim();
  if (!baseUrl) throw new Error("Falta KOMUK_HUB_BASE_URL");
  if (!token) throw new Error("Falta KOMUK_HUB_TOKEN");
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

function esTexto(v: unknown): v is string {
  return typeof v === "string";
}

function validarPagina(body: unknown): Pagina {
  const b = body as { data?: unknown; next_cursor?: unknown } | null;
  if (!b || !Array.isArray(b.data) || !(b.next_cursor === null || esTexto(b.next_cursor))) {
    throw new HubError("El Hub devolvió una respuesta con forma inesperada", null);
  }
  const campos = ["id", "title", "status", "priority", "updated_at", "url"] as const;
  for (const item of b.data) {
    const r = item as Record<string, unknown>;
    if (!r || campos.some((c) => !esTexto(r[c])) || Number.isNaN(Date.parse(r.updated_at as string))) {
      throw new HubError("El Hub devolvió un requerimiento con forma inesperada", null);
    }
  }
  return {
    data: b.data.map((item) => {
      const r = item as Record<string, unknown>;
      return {
        id: r.id as string,
        title: r.title as string,
        description: esTexto(r.description) ? r.description : "",
        status: r.status as string,
        priority: r.priority as string,
        created_at: esTexto(r.created_at) ? r.created_at : (r.updated_at as string),
        updated_at: r.updated_at as string,
        url: r.url as string,
      };
    }),
    next_cursor: b.next_cursor as string | null,
  };
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchPagina(
  cfg: HubConfig,
  params: { updatedSince: string; cursor?: string | null; limit?: number },
  opts: { fetch?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number; reintentos?: number } = {},
): Promise<Pagina> {
  const f = opts.fetch ?? fetch;
  const esperar = opts.esperar ?? dormir;
  const reintentos = opts.reintentos ?? 3;
  const url = new URL(cfg.baseUrl + RUTA);
  url.searchParams.set("updated_since", params.updatedSince);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  url.searchParams.set("limit", String(params.limit ?? 50));

  for (let intento = 0; ; intento++) {
    let res: Response;
    try {
      res = await f(url, {
        method: "GET",
        headers: { authorization: `Bearer ${cfg.token}`, accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
        cache: "no-store",
      });
    } catch {
      if (intento < reintentos) { await esperar(500 * 2 ** intento); continue; }
      throw new HubError("No se pudo conectar con el Hub (red o timeout)", null);
    }
    if (res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { throw new HubError("El Hub devolvió JSON inválido", res.status); }
      return validarPagina(body);
    }
    const reintentable = res.status === 429 || res.status >= 500;
    if (reintentable && intento < reintentos) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const ms = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 500 * 2 ** intento;
      await esperar(ms);
      continue;
    }
    throw new HubError(`El Hub respondió ${res.status} en ${RUTA}`, res.status);
  }
}
```

- [ ] **Step 4: Run tests** — `node --experimental-strip-types --test lib/komuk-hub.test.mjs` → all PASS.
- [ ] **Step 5 (skip unless user asked to commit):** `git commit -m "feat(komuk): cliente http de solo lectura del hub"`

---

### Task 2: Núcleo del sync (mapeo, cursores, errores)

**Files:**
- Create: `lib/komuk-hub-sync.ts`
- Test: `lib/komuk-hub-sync.test.mjs`

**Interfaces:**
- Consumes: `fetchPagina`, `HubConfig`, `Requerimiento` de Task 1; `Estado`, `Prioridad`, `ESTADOS`, `PRIORIDADES` de `./tickets.ts`.
- Produces:
  ```ts
  export const FUENTE = "komuk_hub";
  export const CLIENTE_KOMUK = "KOMUK";
  export const SOLAPAMIENTO_MS = 5 * 60 * 1000;
  export const MAPEO: { estado: Record<string, Estado>; prioridad: Record<string, Prioridad>; estadoPorDefecto: Estado; prioridadPorDefecto: Prioridad };
  export function mapear(req: Requerimiento, avisar: (msg: string) => void, mapeo?: typeof MAPEO): { estado: Estado; prioridad: Prioridad };
  export function desde(ultimo: Date | null): string; // ISO; null → "1970-01-01T00:00:00.000Z"
  export type TicketEspejo = { externalId: string; externalUrl: string; externalUpdatedAt: Date; externalStatus: string; titulo: string; detalle: string; estado: Estado; prioridad: Prioridad };
  export type RepoSync = {
    ultimoSync(fuente: string): Promise<Date | null>;
    clienteExiste(nombre: string): Promise<string | null>; // devuelve el nombre tal como está guardado
    upsert(fuente: string, cliente: string, t: TicketEspejo): Promise<"creado" | "actualizado" | "sin_cambios">;
    marcarOk(fuente: string, at: Date): Promise<void>;
    marcarError(fuente: string, mensaje: string): Promise<void>;
  };
  export type ResultadoSync = { ok: true; creados: number; actualizados: number; sinCambios: number; paginas: number } | { ok: false; error: string };
  export function sincronizar(deps: { repo: RepoSync; cfg: HubConfig; fetchPagina?: typeof fetchPagina; ahora?: () => Date; avisar?: (msg: string) => void }): Promise<ResultadoSync>;
  ```

Reglas de `sincronizar`:
1. `inicio = ahora()` se toma **antes** de pedir nada; es el valor que se guarda en `marcarOk` (así no se pierde nada que cambie durante el sync).
2. `cliente = await repo.clienteExiste(CLIENTE_KOMUK)`; si es `null` → `marcarError(FUENTE, 'No existe el cliente "KOMUK": crealo en /clientes/ antes de sincronizar')` y devolver `{ok:false}` **sin llamar al Hub ni a `upsert`**.
3. `updatedSince = desde(await repo.ultimoSync(FUENTE))` (resta `SOLAPAMIENTO_MS`).
4. Loop: `fetchPagina(cfg, {updatedSince, cursor})`; por cada item `mapear` + `upsert`; seguir mientras `next_cursor`. Tope de seguridad: 1000 páginas → error "demasiadas páginas". Si un `next_cursor` se repite → error "el Hub devolvió un cursor repetido".
5. Título: `title.trim().slice(0, 200) || "(sin título)"`; detalle: `description.slice(0, 5000)` (mismos límites que `lib/tickets.ts`).
6. Cualquier excepción → `marcarError(FUENTE, mensaje)` (mensaje de `HubError` o `"Error inesperado del sync"` para otros; nunca `String(e)` de errores no-Hub) y devolver `{ok:false, error}`. **No** llamar `marcarOk`. Los upserts ya hechos quedan (son idempotentes; el próximo sync los ve como `sin_cambios`).
7. Éxito → `marcarOk(FUENTE, inicio)`.
8. `avisar` default = `console.warn`.

`MAPEO` (editable, con comentario diciendo que es el lugar para ajustar):
```ts
estado: { open: "abierto", new: "abierto", pending: "abierto", in_progress: "en_curso", review: "en_curso", blocked: "en_curso", done: "resuelto", resolved: "resuelto", closed: "cerrado", cancelled: "cerrado", canceled: "cerrado" },
prioridad: { low: "baja", medium: "media", normal: "media", high: "alta", urgent: "alta", critical: "alta" },
estadoPorDefecto: "abierto", prioridadPorDefecto: "media",
```
`mapear` normaliza con `.trim().toLowerCase()`; valor desconocido → default y `avisar(\`[komuk-hub] status desconocido "${status}" en ${id}; uso "abierto"\`)` (ídem prioridad).

- [ ] **Step 1: Write the failing tests** `lib/komuk-hub-sync.test.mjs`. Repo en memoria que imita la semántica del SQL de Task 3:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { sincronizar, mapear, desde, FUENTE, SOLAPAMIENTO_MS } from "./komuk-hub-sync.ts";
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

test("título vacío y textos largos se acotan", async () => {
  const repo = repoMemoria();
  await sincronizar({ repo, cfg, fetchPagina: api({ _: { data: [req("1", { title: "  ", description: "x".repeat(6000) })], next_cursor: null } }), ahora, avisar: calla });
  const t = repo.tickets.get(`${FUENTE}:1`);
  assert.equal(t.titulo, "(sin título)");
  assert.equal(t.detalle.length, 5000);
});
```

- [ ] **Step 2:** `node --experimental-strip-types --test lib/komuk-hub-sync.test.mjs` → FAIL (module not found).
- [ ] **Step 3:** Implementar `lib/komuk-hub-sync.ts` según las reglas de arriba. Import: `import { fetchPagina as fetchPaginaReal, HubError, type HubConfig, type Requerimiento } from "./komuk-hub.ts";` y `import type { Estado, Prioridad } from "./tickets.ts";`.
- [ ] **Step 4:** Correr el test → PASS. Luego `pnpm test` → todo PASS.
- [ ] **Step 5 (skip unless user asked to commit).**

---

### Task 3: Esquema + repo SQL + ejecución con lock

**Files:**
- Modify: `lib/tickets-db.ts` (dentro del callback de `ensureSchema("tickets", …)`, después del índice existente)
- Modify: `lib/tickets.ts` (tipo `Ticket`)
- Create: `lib/komuk-hub-db.ts`

**Interfaces:**
- Consumes: `RepoSync`, `sincronizar`, `FUENTE`, `ResultadoSync` (Task 2); `configDesdeEnv` (Task 1); `asegurarTickets`, `asegurarClientes`, `ensureSchema`.
- Produces:
  ```ts
  export type EstadoSync = { fuente: string; last_synced_at: Date | null; last_status: "ok" | "error" | null; last_error: string | null; actualizado: Date };
  export async function leerEstadoSync(fuente?: string): Promise<EstadoSync | undefined>;
  export async function correrSyncKomuk(): Promise<ResultadoSync | { ok: false; error: string; ocupado: true }>;
  ```

- [ ] **Step 1: `lib/tickets-db.ts`** agregar dentro del `ensureSchema` existente:

```ts
    // Tickets espejo de sistemas de terceros (hoy el Hub de KOMUK). Los
    // tickets propios tienen las cuatro en null.
    await client`alter table tickets add column if not exists external_source text`;
    await client`alter table tickets add column if not exists external_id text`;
    await client`alter table tickets add column if not exists external_url text`;
    await client`alter table tickets add column if not exists external_updated_at timestamptz`;
    // Estado tal como lo informa el origen. De sólo lectura: el estado de
    // trabajo sigue siendo `estado`.
    await client`alter table tickets add column if not exists external_status text`;
    // La garantía de no duplicar: dos nulls no chocan, así que los tickets propios no se ven afectados.
    await client`create unique index if not exists tickets_external_idx on tickets (external_source, external_id)`;
```

- [ ] **Step 2: `lib/tickets.ts`** agregar al tipo `Ticket`:
```ts
  external_source: string | null;
  external_id: string | null;
  external_url: string | null;
  external_updated_at: Date | null;
  external_status: string | null;
```

- [ ] **Step 3: `lib/komuk-hub-db.ts`**

```ts
import "server-only";
import { ensureSchema } from "@/lib/db";
import { asegurarTickets } from "@/lib/tickets-db";
import { asegurarClientes } from "@/lib/clientes-db";
import { configDesdeEnv } from "@/lib/komuk-hub";
import { FUENTE, sincronizar, type RepoSync, type ResultadoSync } from "@/lib/komuk-hub-sync";

export type EstadoSync = { fuente: string; last_synced_at: Date | null; last_status: "ok" | "error" | null; last_error: string | null; actualizado: Date };

// Clave arbitraria y fija para pg_try_advisory_lock: un solo sync a la vez
// entre procesos (réplicas, el intervalo y el botón al mismo tiempo).
const LOCK_KOMUK = 704_512_001;

async function db() {
  await asegurarClientes();
  const client = await asegurarTickets();
  await ensureSchema("sync_estado", async () => {
    await client`
      create table if not exists sync_estado (
        fuente text primary key,
        last_synced_at timestamptz,
        last_status text,
        last_error text,
        actualizado timestamptz not null default now()
      )
    `;
  });
  return client;
}
```

Repo:
- `ultimoSync`: `select last_synced_at from sync_estado where fuente = ${fuente}` → `Date | null`.
- `clienteExiste`: `select nombre from clientes where lower(nombre) = lower(${nombre}) limit 1` → nombre o null (usa el nombre guardado, porque `tickets.cliente` se compara por igualdad exacta con la sesión).
- `upsert` (un solo statement; `xmax = 0` distingue insert de update en postgres):
```sql
insert into tickets (cliente, tipo, prioridad, estado, titulo, detalle, url,
  external_source, external_id, external_url, external_updated_at, external_status)
values (${cliente}, 'mejora', ${t.prioridad}, ${t.estado}, ${t.titulo}, ${t.detalle}, ${t.externalUrl},
  ${fuente}, ${t.externalId}, ${t.externalUrl}, ${t.externalUpdatedAt}, ${t.externalStatus})
on conflict (external_source, external_id) do update set
  titulo = excluded.titulo,
  detalle = excluded.detalle,
  prioridad = excluded.prioridad,
  url = excluded.url,
  external_url = excluded.external_url,
  external_updated_at = excluded.external_updated_at,
  external_status = excluded.external_status,
  actualizado = now()
where tickets.external_updated_at is distinct from excluded.external_updated_at
returning (xmax = 0) as creado
```
  Sin filas devueltas → `"sin_cambios"`; `creado` true → `"creado"`; si no → `"actualizado"`. **No** incluir `estado`, `respuesta`, `orden`, `tipo`, `cliente` en el `do update`.
- `marcarOk`: `insert into sync_estado (fuente, last_synced_at, last_status, last_error, actualizado) values (${f}, ${at}, 'ok', null, now()) on conflict (fuente) do update set last_synced_at = excluded.last_synced_at, last_status = 'ok', last_error = null, actualizado = now()`.
- `marcarError`: `insert … values (${f}, null, 'error', ${msg.slice(0, 1000)}, now()) on conflict (fuente) do update set last_status = 'error', last_error = excluded.last_error, actualizado = now()` — **sin** tocar `last_synced_at`.

`correrSyncKomuk`:
```ts
export async function correrSyncKomuk() {
  const client = await db();
  let cfg;
  try { cfg = configDesdeEnv(); } catch (e) {
    const error = (e as Error).message; // sólo nombra la variable faltante
    await repo.marcarError(FUENTE, error);
    return { ok: false as const, error };
  }
  // reserve(): el advisory lock es por conexión y el pool de postgres.js puede
  // usar otra para el unlock.
  const conn = await client.reserve();
  try {
    const [{ ok }] = await conn`select pg_try_advisory_lock(${LOCK_KOMUK}) as ok`;
    if (!ok) return { ok: false as const, error: "Ya hay un sync en curso", ocupado: true as const };
    try {
      const r = await sincronizar({ repo, cfg });
      if (r.ok) console.info(`[komuk-hub] sync ok: ${r.creados} nuevos, ${r.actualizados} actualizados, ${r.sinCambios} sin cambios`);
      else console.error(`[komuk-hub] sync falló: ${r.error}`);
      return r;
    } finally {
      await conn`select pg_advisory_unlock(${LOCK_KOMUK})`;
    }
  } finally {
    conn.release();
  }
}
```
`leerEstadoSync(fuente = FUENTE)`: select de `sync_estado`.

- [ ] **Step 4:** `pnpm typecheck` → sin errores. `pnpm test` → PASS.
- [ ] **Step 5 (skip unless user asked to commit).**

---

### Task 4: Job programado cada 15 minutos

**Files:**
- Create: `instrumentation.ts` (raíz del repo, junto a `middleware.ts`)

El proyecto no tiene scheduler: Railway corre un solo `next start` de larga vida. `instrumentation.ts` es el hook oficial de Next 15 que corre una vez al arrancar el server.

```ts
// Tareas de fondo del server. Next llama a register() una vez por proceso.
// ponytail: setInterval en el proceso web. Alcanza con un servicio en Railway;
// el advisory lock evita dos syncs a la vez si hay réplicas. Si un día hace
// falta scheduling fuera del proceso, pasar a un Railway Cron que llame a una ruta.
const QUINCE_MIN = 15 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Sin configuración el sync no arranca solo (dev, e2e, previews).
  if (!process.env.KOMUK_HUB_BASE_URL || !process.env.KOMUK_HUB_TOKEN || !process.env.DATABASE_URL) return;
  const g = globalThis as unknown as { komukTimer?: NodeJS.Timeout };
  if (g.komukTimer) return; // hot reload
  const { correrSyncKomuk } = await import("./lib/komuk-hub-db");
  const correr = () => correrSyncKomuk().catch((e) => console.error("[komuk-hub] sync programado falló:", (e as Error).message));
  g.komukTimer = setInterval(correr, QUINCE_MIN);
  g.komukTimer.unref?.();
  setTimeout(correr, 30_000).unref?.();
}
```

Nota: `lib/komuk-hub-db.ts` importa `"server-only"`; si el build de instrumentation se queja, reemplazar ese import dinámico por uno que funcione (verificar con `pnpm build`). Si `server-only` rompe en instrumentation, quitar `import "server-only"` **sólo** de `lib/komuk-hub-db.ts` y dejar un comentario explicando por qué.

- [ ] **Step 1:** Crear el archivo.
- [ ] **Step 2:** `pnpm typecheck` y `pnpm build` → OK (build necesita no tener las variables KOMUK; no debe fallar sin ellas).
- [ ] **Step 3 (skip unless user asked to commit).**

---

### Task 5: UI — botón "Sincronizar ahora" y badge "KOMUK Hub"

**Files:**
- Modify: `app/(privado)/tablero/acciones.ts`
- Modify: `app/(privado)/tablero/page.tsx`
- Modify: `components/Tablero.tsx`, `app/(privado)/tablero/Tablero.module.css`
- Modify: `app/(privado)/tablero/[id]/page.tsx`, `app/(privado)/tablero/[id]/Detalle.module.css`

- [ ] **Step 1: Server action** en `acciones.ts`:
```ts
import { correrSyncKomuk } from "@/lib/komuk-hub-db";

/** Botón "Sincronizar ahora" del tablero. Sólo admin: trae del Hub, nunca escribe en él. */
export async function sincronizarKomuk() {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");
  const r = await correrSyncKomuk();
  revalidatePath("/tablero");
  redirect(r.ok ? "/tablero/?sync=ok" : "/tablero/?sync=error");
}
```

- [ ] **Step 2: `tablero/page.tsx`** (sólo admin):
  - Agregar `sync?: string` a `searchParams`.
  - `const estadoSync = esAdmin ? await leerEstadoSync() : undefined;`
  - Debajo de `panel.bajada`, si `esAdmin`: `<form action={sincronizarKomuk}>` con `<button type="submit">Sincronizar ahora</button>` y un texto chico: "KOMUK Hub: última sincronización {fecha es-AR o 'nunca'}" y, si `estadoSync?.last_status === "error"`, `<p role="alert">Último error: {estadoSync.last_error}</p>` (texto JSX, escapado).
  - Toast: `sync === "ok"` → "Sincronización con KOMUK Hub terminada."; `sync === "error"` → "La sincronización con KOMUK Hub falló. Mirá el último error." Usar el `Toast` existente.
  - En el map de tarjetas agregar `externa: t.external_source === "komuk_hub" && t.external_url ? t.external_url : null`.
  - Estilos con clases nuevas en `Tablero.module.css`, usando las variables CSS existentes del archivo.
  - Un cliente **nunca** ve el botón ni el estado del sync.

- [ ] **Step 3: `components/Tablero.tsx`**: `TarjetaData` suma `externa: string | null`. En `tarjetaMeta`, si `tarjeta.externa`:
```tsx
<a className={styles.badgeExterno} href={hrefSeguro(tarjeta.externa)} target="_blank" rel="noopener noreferrer">KOMUK Hub</a>
```
`hrefSeguro` (en `lib/komuk-hub-sync.ts`, exportada y testeada en su test): devuelve la URL sólo si `new URL(u).protocol` es `http:` o `https:`; si no, `"#"`. Esto evita `javascript:` en un link que viene de un tercero. Test:
```js
test("hrefSeguro sólo deja pasar http y https", () => {
  assert.equal(hrefSeguro("https://hub.test/r/1"), "https://hub.test/r/1");
  assert.equal(hrefSeguro("javascript:alert(1)"), "#");
  assert.equal(hrefSeguro("no es url"), "#");
});
```

- [ ] **Step 4: `tablero/[id]/page.tsx`**: si `ticket.external_source === "komuk_hub"`:
  - En `styles.meta`, el mismo badge "KOMUK Hub" con `hrefSeguro(ticket.external_url ?? "")`.
  - En el `<dl>` lateral: `<div><dt>Estado en el Hub</dt><dd>{ticket.external_status}</dd></div>` y `<div><dt>Origen</dt><dd>Sólo lectura: título, detalle y estado vienen del Hub.</dd></div>`.
  - Título (`h1`) y detalle siguen como texto JSX (ya lo son). No agregar edición de título/detalle. El form de admin (estado de trabajo + respuesta) queda como está.

- [ ] **Step 5:** `pnpm typecheck` → OK. `pnpm test` → PASS.
- [ ] **Step 6 (skip unless user asked to commit).**

---

### Task 6: E2E — escape de HTML y aislamiento entre clientes

**Files:**
- Modify: `e2e/sembrar.ts` (insertar un ticket espejo de KOMUK con el mismo patrón de inserts que ya usa; crear el cliente `KOMUK` si no existe; título `<img src=x onerror="window.__xss=1">Req <b>peligroso</b>`, detalle `<script>window.__xss=1</script>`, `external_source='komuk_hub'`, `external_id='e2e-1'`, `external_url='https://hub.example/r/e2e-1'`, `external_status='in_progress'`). Exportar el título en `TITULOS.komuk` y el id en `e2e/tickets.ts` igual que los demás.
- Create: `e2e/komuk.admin.spec.ts`, `e2e/komuk.cliente.spec.ts` (mismo proyecto/storageState que `detalle.admin.spec.ts` / `detalle.cliente.spec.ts`; leer `playwright.config.ts` para ver cómo se asignan).

Leer primero `e2e/sembrar.ts`, `e2e/tickets.ts`, `e2e/global-setup.ts` y `playwright.config.ts` completos y seguir su patrón exacto.

Admin spec:
```ts
test("el título y detalle del Hub se muestran como texto, no como HTML", async ({ page }) => {
  await page.goto(`/tablero/${tickets.komuk}/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITULOS.komuk);
  await expect(page.getByText('<script>window.__xss=1</script>')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  await expect(page.locator("h1 img, h1 b")).toHaveCount(0);
});
test("badge KOMUK Hub con link y estado de origen", async ({ page }) => {
  await page.goto(`/tablero/${tickets.komuk}/`);
  await expect(page.getByRole("link", { name: "KOMUK Hub" })).toHaveAttribute("href", "https://hub.example/r/e2e-1");
  await expect(page.getByText("in_progress")).toBeVisible();
});
test("el tablero muestra el botón Sincronizar ahora al admin", async ({ page }) => {
  await page.goto("/tablero/");
  await expect(page.getByRole("button", { name: "Sincronizar ahora" })).toBeVisible();
});
```
Cliente spec (el cliente sembrado es "Panadería Sol", no KOMUK):
```ts
test("un cliente no ve tickets de KOMUK ni el botón de sync", async ({ page }) => {
  await page.goto("/tablero/");
  await expect(page.getByText("peligroso")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sincronizar ahora" })).toHaveCount(0);
  const res = await page.goto(`/tablero/${tickets.komuk}/`);
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 1:** Implementar siembra + specs.
- [ ] **Step 2:** Si hay `DATABASE_URL` de **test/local** en `.env.local` (nunca producción; si el host no es localhost/127.0.0.1, NO correr), `pnpm test:e2e`. Si no hay base local, dejarlo anotado en el reporte final como no ejecutado.
- [ ] **Step 3 (skip unless user asked to commit).**

---

### Task 7: Entrega — env, docs

**Files:**
- Modify: `.env.example` — agregar al final:
```
# Sync de solo lectura con el Hub de KOMUK (docs/integrations/komuk-hub.md).
# Sin estas dos el sync programado no arranca.
KOMUK_HUB_BASE_URL=https://hub.komuk.example
KOMUK_HUB_TOKEN=
```
- Create: `docs/integrations/komuk-hub.md` (corto, español): qué hace; que molpo nunca escribe en el Hub; variables; requisito del cliente `KOMUK` en `/clientes/`; cada 15 min vía `instrumentation.ts` + botón admin; `updated_since = last_synced_at − 5 min`; upsert por `(external_source, external_id)` y "sin cambios" si `external_updated_at` es igual; campos que pisa el sync (título, detalle, prioridad, url, external_*) y los que nunca toca (estado, respuesta, orden); tabla de mapeo y dónde editarla (`MAPEO` en `lib/komuk-hub-sync.ts`); qué pasa ante error (`sync_estado.last_error`, no avanza `last_synced_at`); cómo ver el estado (`select * from sync_estado`); el token nunca se loguea.
- Modify: `docs/deployment/app.md` — sumar las dos variables a la tabla "Variables de entorno" con link al doc nuevo.

- [ ] **Step 1:** Escribir los tres cambios.
- [ ] **Step 2:** `pnpm test && pnpm typecheck` → PASS.
- [ ] **Step 3 (skip unless user asked to commit).**

---

## Self-review

- Spec 2 (modelo): Task 3. Spec 3 (cliente): Task 1. Spec 4 (sync): Task 2+3. Spec 5 (ejecución): Task 4+5. Spec 6 (seguridad): Task 5 (texto JSX, `hrefSeguro`) + Task 6 + `listTickets`/`puedeVerTicket` existentes. Spec 7 (tests): Task 1, 2, 6. Spec 8: Task 7.
- Notas internas: el repo no tiene un campo de notas internas; `respuesta` es visible para el cliente. El sync no toca `estado`, `respuesta` ni `orden`. Agregar notas internas queda fuera de alcance salvo pedido.
