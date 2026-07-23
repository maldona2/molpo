import test from "node:test";
import assert from "node:assert/strict";
import { validateContact } from "./contact.ts";

test("acepta un contacto válido y recorta espacios", () => {
  const result = validateContact({
    nombre: "  Ana Pérez ",
    email: "ana@example.com",
    empresa: "",
    mensaje: "Necesito un sistema de stock.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.nombre, "Ana Pérez");
  assert.equal(result.value.empresa, undefined);
});

test("rechaza email inválido", () => {
  const result = validateContact({ nombre: "Ana", email: "no-es-mail", mensaje: "hola" });
  assert.equal(result.ok, false);
});

test("rechaza campos requeridos vacíos", () => {
  assert.equal(validateContact({ nombre: "", email: "a@b.co", mensaje: "x" }).ok, false);
  assert.equal(validateContact({ nombre: "Ana", email: "a@b.co", mensaje: "  " }).ok, false);
  assert.equal(validateContact(null).ok, false);
});

test("rechaza longitudes excesivas", () => {
  const result = validateContact({
    nombre: "Ana",
    email: "a@b.co",
    mensaje: "x".repeat(5001),
  });
  assert.equal(result.ok, false);
});
