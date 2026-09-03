import test from "node:test";
import assert from "node:assert/strict";
import {
  esAdminEmail,
  generarTokenAcceso,
  hashToken,
  parseAdminEmails,
  tokensIguales,
  vencido,
  venceEn,
} from "./sesiones.ts";

test("el token de acceso es largo, hex y no se repite", () => {
  const a = generarTokenAcceso();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, generarTokenAcceso());
});

test("hashToken es estable y no devuelve el token en claro", () => {
  const token = generarTokenAcceso();
  const hash = hashToken(token);
  assert.equal(hash, hashToken(token));
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
});

test("tokens distintos dan hashes distintos", () => {
  assert.notEqual(hashToken("a"), hashToken("b"));
});

test("tokensIguales compara sin romperse con largos distintos", () => {
  assert.equal(tokensIguales("abc", "abc"), true);
  assert.equal(tokensIguales("abc", "abd"), false);
  assert.equal(tokensIguales("abc", "abcd"), false);
  assert.equal(tokensIguales("", ""), true);
});

test("vencido compara contra el momento que se le pase", () => {
  const base = new Date("2026-01-01T12:00:00Z");
  assert.equal(vencido(new Date("2026-01-01T11:59:59Z"), base), true);
  assert.equal(vencido(new Date("2026-01-01T12:00:01Z"), base), false);
  // Justo en el límite se considera vencido: no dejamos pasar el borde.
  assert.equal(vencido(base, base), true);
});

test("venceEn suma minutos sobre la fecha dada", () => {
  const base = new Date("2026-01-01T12:00:00Z");
  assert.equal(venceEn(15, base).toISOString(), "2026-01-01T12:15:00.000Z");
});

test("parseAdminEmails normaliza y tolera basura", () => {
  const emails = parseAdminEmails(" Yo@Molpo.ar , otro@x.com ,, ");
  assert.equal(emails.size, 2);
  assert.equal(emails.has("yo@molpo.ar"), true);
  assert.equal(parseAdminEmails(undefined).size, 0);
  assert.equal(parseAdminEmails("").size, 0);
});

test("esAdminEmail ignora mayúsculas y espacios", () => {
  const raw = "yo@molpo.ar";
  assert.equal(esAdminEmail(" YO@molpo.ar ", raw), true);
  assert.equal(esAdminEmail("otro@molpo.ar", raw), false);
  // Sin variable, nadie es admin: no queremos que un deploy sin configurar
  // deje el panel abierto.
  assert.equal(esAdminEmail("yo@molpo.ar", undefined), false);
  assert.equal(esAdminEmail("", ""), false);
});
