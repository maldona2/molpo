import test from "node:test";
import assert from "node:assert/strict";
import { esNombreDuplicado, generarToken, validateNombreCliente } from "./clientes.ts";

test("generarToken da hex de 32 caracteres y no se repite", () => {
  const a = generarToken();
  const b = generarToken();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});

test("valida nombre y recorta espacios", () => {
  const ok = validateNombreCliente("  Acme SA  ");
  assert.equal(ok.ok, true);
  assert.equal(ok.value, "Acme SA");
});

test("rechaza nombre vacío, no-string o demasiado largo", () => {
  assert.equal(validateNombreCliente("   ").ok, false);
  assert.equal(validateNombreCliente(undefined).ok, false);
  assert.equal(validateNombreCliente("a".repeat(201)).ok, false);
});

test("esNombreDuplicado reconoce sólo la violación de índice único", () => {
  assert.equal(esNombreDuplicado(Object.assign(new Error("dup"), { code: "23505" })), true);
  // Base caída, tabla inexistente, error suelto: no son nombre repetido.
  assert.equal(esNombreDuplicado(Object.assign(new Error("caída"), { code: "ECONNREFUSED" })), false);
  assert.equal(esNombreDuplicado(Object.assign(new Error("sin tabla"), { code: "42P01" })), false);
  assert.equal(esNombreDuplicado(new Error("pelado")), false);
  assert.equal(esNombreDuplicado(null), false);
  assert.equal(esNombreDuplicado(undefined), false);
  assert.equal(esNombreDuplicado("23505"), false);
});

test("el token generado sirve como segmento de URL tal cual", () => {
  const token = generarToken();
  assert.equal(encodeURIComponent(token), token);
});
