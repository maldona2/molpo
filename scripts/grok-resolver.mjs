// Helper local: el tablero corre en Railway y Grok en esta Mac. Escucha en
// loopback, resuelve cliente → carpeta y abre Terminal. El cwd nunca viene
// del browser.

import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

export const PUERTO = 47821;
export const ORIGENES = Object.freeze(["https://app.molpo.ar", "http://app.localhost:3000"]);

const LIMITE_CUERPO = 64_000;
const LIMITE_CLIENTE = 200;
const LIMITE_PROMPT = 20_000;

export function origenPermitido(origin) {
  return typeof origin === "string" && ORIGENES.includes(origin);
}

export function parsearPedido(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false };
  }
  // Si la web manda una ruta, alguien está intentando elegir el cwd. No.
  if ("cwd" in body || "path" in body || "repo" in body) return { ok: false };
  const cliente = typeof body.cliente === "string" ? body.cliente.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!cliente || cliente.length > LIMITE_CLIENTE) return { ok: false };
  if (!prompt || prompt.length > LIMITE_PROMPT) return { ok: false };
  return { ok: true, value: { cliente, prompt } };
}

export async function leerMapa(archivo) {
  try {
    const parsed = JSON.parse(await readFile(archivo, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export async function guardarMapa(archivo, mapa) {
  await mkdir(dirname(archivo), { recursive: true });
  const tmp = `${archivo}.tmp`;
  await writeFile(tmp, `${JSON.stringify(mapa, null, 2)}\n`);
  await rename(tmp, archivo);
}

export async function resolverCarpeta(cliente, { archivo, existe, elegir }) {
  const mapa = await leerMapa(archivo);
  const actual = mapa[cliente];
  if (typeof actual === "string" && existe(actual)) {
    return { ok: true, cwd: actual };
  }
  const elegida = await elegir(cliente);
  if (!elegida) return { ok: false, error: "cancelado" };
  const cwd = elegida.replace(/\/+$/, "");
  mapa[cliente] = cwd;
  await guardarMapa(archivo, mapa);
  return { ok: true, cwd };
}

export function comilla(valor) {
  return `'${String(valor).replace(/'/g, `'\\''`)}'`;
}

export function armarScriptTerminal({ cwd, promptFile }) {
  return [
    `export PATH="$HOME/.grok/bin:/usr/local/bin:$PATH"`,
    `exec grok --cwd ${comilla(cwd)} "$(cat ${comilla(promptFile)})"`,
    "",
  ].join("\n");
}

function comillaApple(valor) {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

export async function elegirCarpeta(cliente) {
  const texto = `¿Dónde está el repo de ${cliente}?`;
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      `POSIX path of (choose folder with prompt ${comillaApple(texto)})`,
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function abrirEnTerminal({ cwd, prompt }) {
  const dir = join(homedir(), ".molpo", "prompts");
  await mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${process.pid}`;
  const promptFile = join(dir, `${id}.md`);
  const wrapper = join(dir, `${id}.sh`);
  await writeFile(promptFile, prompt);
  await writeFile(wrapper, armarScriptTerminal({ cwd, promptFile }), { mode: 0o755 });
  await execFileAsync("osascript", [
    "-e",
    "on run argv",
    "-e",
    'tell application "Terminal"',
    "-e",
    "activate",
    "-e",
    'do script "bash " & quoted form of (item 1 of argv)',
    "-e",
    "end tell",
    "-e",
    "end run",
    wrapper,
  ]);
  return { ok: true };
}

function cors(res, origin) {
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  // Sin esto Chrome corta el fetch de https://app.molpo.ar a 127.0.0.1.
  res.setHeader("access-control-allow-private-network", "true");
}

function json(res, status, origin, body) {
  if (origin) cors(res, origin);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > LIMITE_CUERPO) {
        reject(new Error("demasiado"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function rutaDe(req) {
  try {
    return new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

export function crearServidor(deps = {}) {
  const archivoMapa = deps.archivo ?? join(homedir(), ".molpo", "proyectos.json");
  const resolver =
    deps.resolverCarpeta ??
    ((cliente) =>
      resolverCarpeta(cliente, {
        archivo: archivoMapa,
        existe: existsSync,
        elegir: elegirCarpeta,
      }));
  const abrir = deps.abrirEnTerminal ?? abrirEnTerminal;

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (!origenPermitido(origin)) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (req.method === "OPTIONS") {
      cors(res, origin);
      res.writeHead(204);
      res.end();
      return;
    }

    const ruta = rutaDe(req);

    if (req.method === "GET" && ruta === "/salud") {
      json(res, 200, origin, { ok: true });
      return;
    }

    if (req.method === "POST" && ruta === "/abrir") {
      let crudo;
      try {
        crudo = await leerCuerpo(req);
      } catch {
        json(res, 400, origin, { ok: false, error: "pedido_invalido" });
        return;
      }
      let body;
      try {
        body = JSON.parse(crudo);
      } catch {
        json(res, 400, origin, { ok: false, error: "pedido_invalido" });
        return;
      }
      const pedido = parsearPedido(body);
      if (!pedido.ok) {
        json(res, 400, origin, { ok: false, error: "pedido_invalido" });
        return;
      }
      try {
        const carpeta = await resolver(pedido.value.cliente);
        if (!carpeta.ok) {
          json(res, 200, origin, carpeta);
          return;
        }
        await abrir({ cwd: carpeta.cwd, prompt: pedido.value.prompt });
        json(res, 200, origin, { ok: true, cwd: carpeta.cwd });
      } catch {
        json(res, 200, origin, { ok: false, error: "no_se_pudo_abrir" });
      }
      return;
    }

    json(res, 404, origin, { ok: false, error: "no_encontrado" });
  });
}

export function escuchar(server = crearServidor(), puerto = PUERTO) {
  server.listen(puerto, "127.0.0.1", () => {
    console.error(`molpo resolver en http://127.0.0.1:${puerto}`);
  });
  return server;
}

const argv = process.argv[1];
if (argv && import.meta.url === pathToFileURL(resolve(argv)).href) {
  escuchar();
}
