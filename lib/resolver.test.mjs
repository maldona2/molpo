import test from "node:test";
import assert from "node:assert/strict";
import { armarPrompt } from "./resolver.ts";

const base = {
  id: 123,
  tipo: "bug",
  prioridad: "alta",
  cliente: "Komuk",
  titulo: "El checkout no muestra el total",
  detalle: "En mobile el total queda en $0.\nSegunda línea.",
  url: "https://komuk.example/checkout",
  reporta: "Ana",
  respuesta: null,
};

test("el prompt lleva el ticket y pide no commitear", () => {
  const prompt = armarPrompt(base, [], "https://app.molpo.ar");

  assert.match(prompt, /Hay un bug reportado por un cliente/);
  assert.match(prompt, /Ticket #123 · Bug · Alta/);
  assert.match(prompt, /Cliente: Komuk/);
  assert.match(prompt, /Título: El checkout no muestra el total/);
  assert.match(prompt, /Pantalla o URL: https:\/\/komuk\.example\/checkout/);
  assert.match(prompt, /Reporta: Ana/);
  assert.match(prompt, /En mobile el total queda en \$0\.\nSegunda línea\./);
  assert.match(prompt, /Ticket en el tablero: https:\/\/app\.molpo\.ar\/tablero\/123\//);
  assert.match(prompt, /No hagas commit ni push salvo que te lo pida/);
  assert.doesNotMatch(prompt, /## Capturas/);
  assert.doesNotMatch(prompt, /## Respuesta/);
  assert.doesNotMatch(prompt, /email/i);
});

test("sin URL ni quién reporta no deja títulos huérfanos", () => {
  const prompt = armarPrompt(
    { ...base, url: null, reporta: null },
    [],
    "https://app.molpo.ar",
  );
  assert.doesNotMatch(prompt, /Pantalla o URL/);
  assert.doesNotMatch(prompt, /Reporta:/);
});

test("las capturas van como URL absoluta y la respuesta previa también entra", () => {
  const prompt = armarPrompt(
    { ...base, respuesta: "Ya vimos que es el cálculo de IVA." },
    [
      { id: 45, nombre: "mobile.png" },
      { id: 46, nombre: "desktop.png" },
    ],
    "https://app.molpo.ar/",
  );
  assert.match(prompt, /## Capturas/);
  assert.match(prompt, /- https:\/\/app\.molpo\.ar\/adjuntos\/45 \(mobile\.png; puede pedir login\)/);
  assert.match(prompt, /- https:\/\/app\.molpo\.ar\/adjuntos\/46 \(desktop\.png; puede pedir login\)/);
  assert.match(prompt, /## Respuesta\nYa vimos que es el cálculo de IVA\./);
});

test("una mejora no se presenta como bug", () => {
  const prompt = armarPrompt({ ...base, tipo: "mejora", prioridad: "baja" }, [], "https://app.molpo.ar");
  assert.match(prompt, /Hay un pedido de mejora de un cliente/);
  assert.match(prompt, /Ticket #123 · Mejora · Baja/);
  assert.doesNotMatch(prompt, /Hay un bug reportado/);
});
