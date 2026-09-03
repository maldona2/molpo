import test from "node:test";
import assert from "node:assert/strict";
import { generarToken, validateNombreCliente } from "./clientes.ts";

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
