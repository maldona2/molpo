import test from "node:test";
import assert from "node:assert/strict";
import { collectList, splitInline } from "./markdown.ts";

test("reconoce negrita al inicio de una viñeta", () => {
  assert.deepEqual(
    splitInline(
      "**No se ejecutaron pruebas de carga.** Todas las mediciones son de solo lectura.",
    ),
    [
      "**No se ejecutaron pruebas de carga.**",
      " Todas las mediciones son de solo lectura.",
    ],
  );
});

test("la negrita admite un asterisco suelto adentro", () => {
  assert.deepEqual(splitInline("**costo * 2 por mes**"), ["**costo * 2 por mes**"]);
});

test("la cursiva no se come el cierre de una negrita", () => {
  assert.deepEqual(splitInline("* **texto**"), ["* ", "**texto**"]);
});

test("pliega las líneas de continuación dentro de la viñeta", () => {
  const lines = [
    "- **No se ejecutaron pruebas de carga.** Todas las mediciones son",
    "  consultas de solo lectura sobre datos ya existentes.",
    "- **El tráfico mensual (22 GB) es una estimación**, no un dato medido.",
    "",
    "Párrafo aparte.",
  ];
  const { list, index } = collectList(lines, 0);
  assert.equal(list.ordered, false);
  assert.deepEqual(
    list.items.map((item) => item.text),
    [
      "**No se ejecutaron pruebas de carga.** Todas las mediciones son consultas de solo lectura sobre datos ya existentes.",
      "**El tráfico mensual (22 GB) es una estimación**, no un dato medido.",
    ],
  );
  assert.equal(index, 3);
});

test("la lista termina en el siguiente bloque, no lo absorbe", () => {
  const lines = ["- uno", "## Título", "texto"];
  const { list, index } = collectList(lines, 0);
  assert.deepEqual(
    list.items.map((item) => item.text),
    ["uno"],
  );
  assert.equal(index, 1);
});

test("anida las viñetas más indentadas dentro de su ítem", () => {
  const lines = [
    "- padre uno",
    "  - hija A con texto que",
    "    sigue en la línea de abajo",
    "  - hija B",
    "    1. nieta ordenada",
    "- padre dos",
    "",
    "Párrafo aparte.",
  ];
  const { list, index } = collectList(lines, 0);
  assert.deepEqual(
    list.items.map((item) => item.text),
    ["padre uno", "padre dos"],
  );
  const hijas = list.items[0].children[0];
  assert.equal(hijas.ordered, false);
  assert.deepEqual(
    hijas.items.map((item) => item.text),
    ["hija A con texto que sigue en la línea de abajo", "hija B"],
  );
  const nietas = hijas.items[1].children[0];
  assert.equal(nietas.ordered, true);
  assert.deepEqual(
    nietas.items.map((item) => item.text),
    ["nieta ordenada"],
  );
  assert.equal(list.items[1].children.length, 0);
  assert.equal(index, 6);
});

test("una línea en blanco entre ítems no corta la lista", () => {
  const lines = ["1. uno", "", "2. dos", "", "Párrafo aparte."];
  const { list, index } = collectList(lines, 0);
  assert.equal(list.ordered, true);
  assert.deepEqual(
    list.items.map((item) => item.text),
    ["uno", "dos"],
  );
  assert.equal(index, 3);
});

test("mantiene código, links y cursiva", () => {
  assert.deepEqual(splitInline("ver `x`, [doc](https://a.b) y *nota*"), [
    "ver ",
    "`x`",
    ", ",
    "[doc](https://a.b)",
    " y ",
    "*nota*",
  ]);
});
