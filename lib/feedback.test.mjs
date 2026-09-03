import test from "node:test";
import assert from "node:assert/strict";
import { promedio, validateFeedback } from "./feedback.ts";

const base = {
  trabajo: "auditoria",
  puntaje: "5",
  recomienda: "4",
  comentario: "  Salió bien y a tiempo.  ",
};

test("acepta un feedback válido, recorta y convierte puntajes", () => {
  const result = validateFeedback({ ...base, nombre: " Ana ", publicar: "1" });
  assert.equal(result.ok, true);
  assert.equal(result.value.comentario, "Salió bien y a tiempo.");
  assert.equal(result.value.puntaje, 5);
  assert.equal(result.value.recomienda, 4);
  assert.equal(result.value.nombre, "Ana");
  assert.equal(result.value.publicar, true);
});

test("publicar queda en false si no viene el checkbox", () => {
  assert.equal(validateFeedback(base).value.publicar, false);
});

test("rechaza trabajo desconocido y puntajes fuera de escala", () => {
  assert.equal(validateFeedback({ ...base, trabajo: "otro" }).ok, false);
  assert.equal(validateFeedback({ ...base, puntaje: "0" }).ok, false);
  assert.equal(validateFeedback({ ...base, puntaje: "6" }).ok, false);
  assert.equal(validateFeedback({ ...base, recomienda: "x" }).ok, false);
});

test("exige comentario y limita su largo", () => {
  assert.equal(validateFeedback({ ...base, comentario: "   " }).ok, false);
  assert.equal(validateFeedback({ ...base, comentario: "a".repeat(3001) }).ok, false);
});

test("valida el email opcional", () => {
  assert.equal(validateFeedback({ ...base, email: "no-es-mail" }).ok, false);
  assert.equal(validateFeedback({ ...base, email: " ana@example.com " }).value.email, "ana@example.com");
  assert.equal(validateFeedback({ ...base, email: "" }).value.email, undefined);
});

test("promedio redondea a un decimal y tolera lista vacía", () => {
  assert.equal(promedio([5, 4, 4]), 4.3);
  assert.equal(promedio([]), null);
});
