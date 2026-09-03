import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, renderMailHtml, renderMailText } from "./mail.ts";

test("escapa los caracteres que rompen el markup", () => {
  assert.equal(
    escapeHtml(`<script>alert("x" & 'y')</script>`),
    "&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;",
  );
});

test("el texto plano es el join de siempre y descarta los null", () => {
  assert.equal(
    renderMailText(["Cliente: Ana", null, "", "Detalle"]),
    "Cliente: Ana\n\nDetalle",
  );
});

test("el texto plano suma el botón al final", () => {
  const text = renderMailText(["Hola"], { label: "Ver pedidos", href: "https://molpo.ar/soporte/abc/" });
  assert.equal(text, "Hola\n\nVer pedidos: https://molpo.ar/soporte/abc/");
});

test("el html no deja pasar markup del cliente", () => {
  const html = renderMailHtml(['Titulo: <img src=x onerror="alert(1)">']);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

test("el html arma un párrafo por bloque y <br> dentro del bloque", () => {
  const html = renderMailHtml(["Uno", "Dos", "", "Tres"]);
  const parrafos = html.match(/<p style="margin:0 0 16px/g) ?? [];
  assert.equal(parrafos.length, 2);
  assert.ok(html.includes("Uno<br>Dos"));
});

test("el html separa en párrafos también los \\n embebidos en una línea", () => {
  const html = renderMailHtml(["Hola", "\nRespuesta"]);
  assert.ok(html.includes(">Hola</p>"));
  assert.ok(html.includes(">Respuesta</p>"));
});

test("el html convierte las urls sueltas en links", () => {
  const html = renderMailHtml(["Ver: https://molpo.ar/soporte/abc/"]);
  assert.ok(html.includes('<a href="https://molpo.ar/soporte/abc/"'));
});

test("el html incluye el botón, el logo y el pie de marca", () => {
  const html = renderMailHtml(["Hola"], { label: "Ver pedidos", href: "https://molpo.ar/soporte/abc/" });
  assert.ok(html.includes("https://molpo.ar/assets/molpo-blanco.png"));
  assert.ok(html.includes("Software construido sobre bases sólidas"));
  assert.ok(html.includes(">Ver pedidos</a>"));
  assert.ok(html.includes("max-width:600px"));
});

test("el html no usa nada que Gmail tire", () => {
  const html = renderMailHtml(["Hola"], { label: "Ir", href: "https://molpo.ar/" });
  assert.ok(!html.includes("<style"));
  assert.ok(!html.includes("class="));
  assert.ok(!html.includes("display:flex"));
  assert.ok(!html.includes("gradient"));
  assert.ok(!html.includes("prefers-color-scheme"));
});

test("un href que no es http queda inerte", () => {
  const html = renderMailHtml(["Hola"], { label: "Click", href: "javascript:alert(1)" });
  assert.ok(!html.includes("javascript:"));
});
