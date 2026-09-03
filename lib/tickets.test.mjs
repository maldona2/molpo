import test from "node:test";
import assert from "node:assert/strict";
import { parseClientes, parseEstado, validateTicket } from "./tickets.ts";

test("parsea clientes y tolera entradas rotas", () => {
  const clientes = parseClientes("tok1:Acme SA, tok2:Otro Cliente ,basura,:sinToken,tok3:");
  assert.equal(clientes.get("tok1"), "Acme SA");
  assert.equal(clientes.get("tok2"), "Otro Cliente");
  assert.equal(clientes.size, 2);
});

test("parseClientes sin variable devuelve vacío", () => {
  assert.equal(parseClientes(undefined).size, 0);
});

test("acepta un ticket válido y recorta espacios", () => {
  const result = validateTicket({
    tipo: "bug",
    prioridad: "alta",
    titulo: "  No guarda la factura ",
    detalle: "Tira error 500 al guardar.",
    url: "",
    reporta: " Ana ",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.titulo, "No guarda la factura");
  assert.equal(result.value.url, undefined);
  assert.equal(result.value.reporta, "Ana");
});

test("rechaza tipo y prioridad fuera de la lista", () => {
  const base = { titulo: "x", detalle: "y", prioridad: "media", tipo: "bug" };
  assert.equal(validateTicket({ ...base, tipo: "otro" }).ok, false);
  assert.equal(validateTicket({ ...base, prioridad: "urgente" }).ok, false);
});

test("rechaza título vacío o detalle demasiado largo", () => {
  const base = { tipo: "mejora", prioridad: "baja", titulo: "Algo", detalle: "ok" };
  assert.equal(validateTicket({ ...base, titulo: "   " }).ok, false);
  assert.equal(validateTicket({ ...base, detalle: "a".repeat(5001) }).ok, false);
});

test("acepta email válido y rechaza el inválido", () => {
  const base = { tipo: "bug", prioridad: "media", titulo: "Algo", detalle: "pasa" };
  const ok = validateTicket({ ...base, email: " ana@example.com " });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, "ana@example.com");
  assert.equal(validateTicket({ ...base, email: "no-es-mail" }).ok, false);
  assert.equal(validateTicket({ ...base, email: "" }).value.email, undefined);
});

test("parseEstado sólo acepta estados conocidos", () => {
  assert.equal(parseEstado("en_curso"), "en_curso");
  assert.equal(parseEstado("inventado"), null);
});
