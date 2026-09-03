import test from "node:test";
import assert from "node:assert/strict";
import { crearMemo } from "./once.ts";

test("corre la función una sola vez por clave", async () => {
  const once = crearMemo();
  let corridas = 0;
  const fn = async () => {
    corridas += 1;
  };

  await once("a", fn);
  await once("a", fn);
  await once("a", fn);
  assert.equal(corridas, 1);
});

test("llamadas concurrentes comparten la misma promesa", async () => {
  const once = crearMemo();
  let corridas = 0;
  const fn = async () => {
    corridas += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
  };

  await Promise.all([once("a", fn), once("a", fn), once("a", fn)]);
  assert.equal(corridas, 1);
});

test("si falla no queda cacheada: el próximo intento reintenta", async () => {
  const once = crearMemo();
  let corridas = 0;
  const fn = async () => {
    corridas += 1;
    if (corridas === 1) throw new Error("base caída");
  };

  await assert.rejects(() => once("a", fn), /base caída/);
  await once("a", fn); // el segundo intento sí funciona
  assert.equal(corridas, 2);
});

test("cada clave se memoiza por separado", async () => {
  const once = crearMemo();
  const corridas = [];

  await once("a", async () => void corridas.push("a"));
  await once("b", async () => void corridas.push("b"));
  await once("a", async () => void corridas.push("a otra vez"));
  assert.deepEqual(corridas, ["a", "b"]);
});
