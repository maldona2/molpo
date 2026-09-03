import test from "node:test";
import assert from "node:assert/strict";
import { detectarTipoImagen, limpiarNombre, validarAdjunto, MAX_BYTES } from "./adjuntos.ts";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const bytes = (...valores) => new Uint8Array(valores);

test("reconoce las firmas de los formatos que aceptamos", () => {
  assert.equal(detectarTipoImagen(bytes(...PNG)), "image/png");
  assert.equal(detectarTipoImagen(bytes(...JPEG)), "image/jpeg");
  assert.equal(detectarTipoImagen(bytes(...GIF)), "image/gif");
  assert.equal(detectarTipoImagen(bytes(...WEBP)), "image/webp");
});

test("rechaza lo que no es imagen, aunque el navegador diga que sí", () => {
  // El caso que importa: HTML renombrado a .png. Servirlo como HTML sería XSS.
  const html = bytes(...Buffer.from("<script>alert(1)</script>"));
  assert.equal(detectarTipoImagen(html), null);
  assert.equal(detectarTipoImagen(bytes(0, 1, 2, 3)), null);
  assert.equal(detectarTipoImagen(bytes()), null);
});

test("un RIFF que no es WebP no pasa", () => {
  // RIFF correcto pero contenedor de audio (WAVE), no imagen.
  const wave = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45);
  assert.equal(detectarTipoImagen(wave), null);
});

test("limpiarNombre saca rutas y caracteres raros", () => {
  assert.equal(limpiarNombre("../../etc/passwd"), "passwd");
  assert.equal(limpiarNombre("C:\\Users\\ana\\captura.png"), "captura.png");
  assert.equal(limpiarNombre('foto"; drop table.png'), "foto drop table.png");
  assert.equal(limpiarNombre(""), "captura");
  assert.equal(limpiarNombre("!!!"), "captura");
  assert.equal(limpiarNombre("a".repeat(200)).length, 100);
});

test("validarAdjunto acepta una imagen real y devuelve el tipo detectado", () => {
  const result = validarAdjunto("pantalla.png", bytes(...PNG));
  assert.equal(result.ok, true);
  assert.equal(result.value.tipo, "image/png");
  assert.equal(result.value.nombre, "pantalla.png");
});

test("validarAdjunto rechaza vacío, pesado y no-imagen", () => {
  assert.equal(validarAdjunto("x.png", bytes()).ok, false);
  const pesado = new Uint8Array(MAX_BYTES + 1);
  pesado.set(PNG);
  assert.equal(validarAdjunto("x.png", pesado).ok, false);
  assert.equal(validarAdjunto("x.png", bytes(1, 2, 3)).ok, false);
});

test("una imagen justo en el límite entra", () => {
  const limite = new Uint8Array(MAX_BYTES);
  limite.set(PNG);
  assert.equal(validarAdjunto("x.png", limite).ok, true);
});
