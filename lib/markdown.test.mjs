import test from "node:test";
import assert from "node:assert/strict";
import { splitInline } from "./markdown.ts";

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
