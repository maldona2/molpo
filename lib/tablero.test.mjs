import test from "node:test";
import assert from "node:assert/strict";
import { agruparPorEstado, moverEnLista, sanearOrden } from "./tablero.ts";

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

test("mueve un elemento a otra posición", () => {
  assert.deepEqual(moverEnLista([1, 2, 3, 4], 4, 0), [4, 1, 2, 3]);
  assert.deepEqual(moverEnLista([1, 2, 3, 4], 1, 2), [2, 3, 1, 4]);
  assert.deepEqual(moverEnLista([1, 2, 3], 2, 2), [1, 3, 2]);
});

test("mover a la misma posición no cambia nada", () => {
  assert.deepEqual(moverEnLista([1, 2, 3], 2, 1), [1, 2, 3]);
});

test("un destino fuera de rango se recorta a los extremos", () => {
  assert.deepEqual(moverEnLista([1, 2, 3], 1, 99), [2, 3, 1]);
  assert.deepEqual(moverEnLista([1, 2, 3], 3, -5), [3, 1, 2]);
});

test("mover un id que no está deja la lista igual", () => {
  assert.deepEqual(moverEnLista([1, 2, 3], 77, 0), [1, 2, 3]);
});

test("sanearOrden descarta ids ajenos y repetidos", () => {
  // El 99 no es de esta columna y el 1 viene dos veces: los dos se ignoran.
  assert.deepEqual(sanearOrden([3, 99, 1, 1], [1, 2, 3]), [3, 1, 2]);
});

test("sanearOrden pone al final lo que no vino en el pedido", () => {
  // Si mientras arrastraban entró un ticket nuevo, no se pierde.
  assert.deepEqual(sanearOrden([2], [1, 2, 3]), [2, 1, 3]);
});

test("sanearOrden ignora basura y cae al orden real", () => {
  assert.deepEqual(sanearOrden(null, [1, 2]), [1, 2]);
  assert.deepEqual(sanearOrden("1,2", [1, 2]), [1, 2]);
  assert.deepEqual(sanearOrden([{}, "x"], [1, 2]), [1, 2]);
});
