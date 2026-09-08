import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  origenPermitido,
  parsearPedido,
  leerMapa,
  guardarMapa,
  resolverCarpeta,
  comilla,
  armarScriptTerminal,
  crearServidor,
} from "../scripts/grok-resolver.mjs";

test("acepta sólo los orígenes del tablero", () => {
  assert.equal(origenPermitido("https://app.molpo.ar"), true);
  assert.equal(origenPermitido("http://app.localhost:3000"), true);
  assert.equal(origenPermitido("https://molpo.ar"), false);
  assert.equal(origenPermitido("http://evil.example"), false);
  assert.equal(origenPermitido(undefined), false);
});

test("parsearPedido pide cliente y prompt, y rechaza una ruta colada", () => {
  assert.deepEqual(parsearPedido({ cliente: " Komuk ", prompt: " arreglá esto " }), {
    ok: true,
    value: { cliente: "Komuk", prompt: "arreglá esto" },
  });
  assert.equal(parsearPedido({ cliente: "Komuk", prompt: "x", cwd: "/etc" }).ok, false);
  assert.equal(parsearPedido({ cliente: "Komuk", prompt: "x", path: "/tmp" }).ok, false);
  assert.equal(parsearPedido({ cliente: "Komuk", prompt: "x", repo: "/tmp" }).ok, false);
  assert.equal(parsearPedido({ cliente: "", prompt: "x" }).ok, false);
  assert.equal(parsearPedido({ cliente: "Komuk", prompt: "" }).ok, false);
  assert.equal(parsearPedido(null).ok, false);
});

test("el mapa se lee y se guarda sin perder otras claves", async () => {
  const dir = await mkdtemp(join(tmpdir(), "molpo-mapa-"));
  const archivo = join(dir, "proyectos.json");
  assert.deepEqual(await leerMapa(archivo), {});
  await guardarMapa(archivo, { Komuk: "/tmp/komuk" });
  await guardarMapa(archivo, { Komuk: "/tmp/komuk", "tr-fit": "/tmp/tr-fit" });
  assert.deepEqual(await leerMapa(archivo), { Komuk: "/tmp/komuk", "tr-fit": "/tmp/tr-fit" });
  await rm(dir, { recursive: true, force: true });
});

test("si el cliente ya tiene carpeta existente, no pregunta de nuevo", async () => {
  const dir = await mkdtemp(join(tmpdir(), "molpo-res-"));
  const archivo = join(dir, "proyectos.json");
  const repo = join(dir, "repo");
  await mkdir(repo);
  await guardarMapa(archivo, { Komuk: repo });
  let pregunto = false;
  const resultado = await resolverCarpeta("Komuk", {
    archivo,
    existe: (ruta) => ruta === repo,
    elegir: async () => {
      pregunto = true;
      return "/otro";
    },
  });
  assert.equal(pregunto, false);
  assert.deepEqual(resultado, { ok: true, cwd: repo });
  await rm(dir, { recursive: true, force: true });
});

test("si no hay mapa o la carpeta se movió, pregunta y guarda", async () => {
  const dir = await mkdtemp(join(tmpdir(), "molpo-pick-"));
  const archivo = join(dir, "proyectos.json");
  const repo = join(dir, "nuevo");
  await mkdir(repo);
  await guardarMapa(archivo, { Komuk: join(dir, "viejo") });
  const resultado = await resolverCarpeta("Komuk", {
    archivo,
    existe: () => false,
    elegir: async () => repo + "/",
  });
  assert.deepEqual(resultado, { ok: true, cwd: repo });
  assert.equal((await leerMapa(archivo)).Komuk, repo);
  await rm(dir, { recursive: true, force: true });
});

test("si cancela el folder picker, no guarda nada", async () => {
  const dir = await mkdtemp(join(tmpdir(), "molpo-cancel-"));
  const archivo = join(dir, "proyectos.json");
  const resultado = await resolverCarpeta("Komuk", {
    archivo,
    existe: () => false,
    elegir: async () => null,
  });
  assert.deepEqual(resultado, { ok: false, error: "cancelado" });
  assert.deepEqual(await leerMapa(archivo), {});
  await rm(dir, { recursive: true, force: true });
});

test("comilla escapa para que el path no se meta en el shell", () => {
  assert.equal(comilla("/tmp/repo"), "'/tmp/repo'");
  assert.equal(comilla("/tmp/it's"), `'/tmp/it'\\''s'`);
});

test("el script de Terminal usa --cwd y lee el prompt de un archivo", () => {
  const script = armarScriptTerminal({
    cwd: "/tmp/it's",
    promptFile: "/tmp/p.md",
  });
  assert.match(script, /export PATH="\$HOME\/\.grok\/bin:/);
  assert.match(script, /exec grok --cwd '\/tmp\/it'\\''s' "\$\(cat '\/tmp\/p\.md'\)"/);
});

function escuchar(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

function cerrar(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("GET /salud y POST /abrir respetan CORS y no aceptan cwd", async () => {
  const abiertos = [];
  const server = crearServidor({
    resolverCarpeta: async (cliente) => ({ ok: true, cwd: `/tmp/${cliente}` }),
    abrirEnTerminal: async (pedido) => {
      abiertos.push(pedido);
      return { ok: true };
    },
  });
  const puerto = await escuchar(server);
  const base = `http://127.0.0.1:${puerto}`;
  try {
    const ajeno = await fetch(`${base}/salud`, { headers: { origin: "https://evil.example" } });
    assert.equal(ajeno.status, 403);

    const salud = await fetch(`${base}/salud`, { headers: { origin: "https://app.molpo.ar" } });
    assert.equal(salud.status, 200);
    assert.equal((await salud.json()).ok, true);
    assert.equal(salud.headers.get("access-control-allow-origin"), "https://app.molpo.ar");

    const colado = await fetch(`${base}/abrir`, {
      method: "POST",
      headers: {
        origin: "https://app.molpo.ar",
        "content-type": "application/json",
      },
      body: JSON.stringify({ cliente: "Komuk", prompt: "fix", cwd: "/etc" }),
    });
    assert.equal(colado.status, 400);
    assert.equal(abiertos.length, 0);

    const ok = await fetch(`${base}/abrir`, {
      method: "POST",
      headers: {
        origin: "http://app.localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ cliente: "Komuk", prompt: "fix the bug" }),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true, cwd: "/tmp/Komuk" });
    assert.deepEqual(abiertos, [{ cwd: "/tmp/Komuk", prompt: "fix the bug" }]);
  } finally {
    await cerrar(server);
  }
});

test("el preflight permite la red local, si no Chrome bloquea app.molpo.ar → 127.0.0.1", async () => {
  const server = crearServidor({
    resolverCarpeta: async () => ({ ok: true, cwd: "/tmp" }),
    abrirEnTerminal: async () => ({ ok: true }),
  });
  const puerto = await escuchar(server);
  try {
    const preflight = await fetch(`http://127.0.0.1:${puerto}/abrir`, {
      method: "OPTIONS",
      headers: {
        origin: "https://app.molpo.ar",
        "access-control-request-method": "POST",
        "access-control-request-private-network": "true",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://app.molpo.ar");
    assert.equal(preflight.headers.get("access-control-allow-private-network"), "true");
  } finally {
    await cerrar(server);
  }
});
