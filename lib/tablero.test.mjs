import test from "node:test";
import assert from "node:assert/strict";
import { agruparPorEstado } from "./tablero.ts";

const ticket = (id, estado) => ({ id, estado });

test("agrupa por estado y deja vacías las columnas sin tickets", () => {
  const columnas = agruparPorEstado([
    ticket(1, "abierto"),
    ticket(2, "resuelto"),
    ticket(3, "abierto"),
  ]);
  assert.deepEqual(
    columnas.abierto.map((t) => t.id),
    [1, 3],
  );
  assert.deepEqual(columnas.resuelto.map((t) => t.id), [2]);
  assert.deepEqual(columnas.en_curso, []);
  assert.deepEqual(columnas.cerrado, []);
});

test("agrupar conserva el orden en que vienen los tickets", () => {
  const columnas = agruparPorEstado([ticket(9, "abierto"), ticket(4, "abierto")]);
  assert.deepEqual(columnas.abierto.map((t) => t.id), [9, 4]);
});
