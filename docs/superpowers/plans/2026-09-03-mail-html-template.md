# Template HTML de marca para mails — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **auto-build host:** Claude plans+reviews; Grok implements via headless CLI.
> <!-- auto-build plan · 2026-09-03 · source: claude+writing-plans -->

**Goal:** Que `lib/mail.ts` envuelva todos los mails en un único template HTML de marca, parametrizable, sin tocar el comportamiento de envío ni agregar dependencias.

**Architecture:** `sendMail` deja de recibir `text: string` y pasa a recibir `body: (string | null)[]` (las mismas líneas que hoy arma cada caller) más un `button?: { label, href }` opcional. `lib/mail.ts` deriva de ahí las dos versiones: el `text` plano (`filter(Boolean).join("\n")`, idéntico al de hoy) y el `html` (tablas + estilos inline, escapando todo lo dinámico). Los 4 callers borran su `.filter().join()` y quedan más cortos.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Resend HTTP API, tests con `node:test` + `assert` (`node --experimental-strip-types --test lib/*.test.mjs`).

**Spec:** el pedido del usuario en este `/auto-build` (transcrito en Global Constraints).

## Global Constraints

- **Sin dependencias nuevas.** Nada de react-email, mjml ni handlebars. `package.json` no se toca.
- **Tablas y estilos inline únicamente.** Prohibido: flexbox, grid, `<style>` en `<head>`, clases CSS, media queries, `prefers-color-scheme`, gradientes.
- Color plano de la paleta: `--azul-profundo #09172b`, `--azul-primario #18365d`, `--azul-medio #4e78a9`, `--azul-claro #8cb3de`, `--celeste-palido #d7e8f8`, blanco `#ffffff`.
- Ancho máximo 600px, centrado, legible en mobile (`width:100%` + `max-width:600px`).
- Logo por URL absoluta: `https://molpo.ar/assets/molpo-blanco.png` (73×26), sobre fondo azul.
- Tipografía: system stack, ninguna fuente web.
- **Siempre mandar `text` además de `html`** en el POST a Resend. El texto plano existente es el fallback y no cambia.
- Escapar todo el contenido dinámico interpolado en el HTML (títulos de ticket y comentarios los escribe el cliente).
- Comportamiento actual de `sendMail` intacto: `from`, `to` con fallback `CONTACT_TO ?? "info@molpo.ar"`, `reply_to`, timeout 10s, `{ ok: false, reason: "unconfigured" }` si falta `RESEND_API_KEY`, mismos `console.error`.
- Comentarios en español y sólo donde expliquen un porqué que no se lee en el código.
- Diff mínimo. Nada de refactors de paso. No crear archivos nuevos fuera de los que este plan nombra.
- **No hagas `git commit`, `git push`, ni abras PRs.** El usuario no lo pidió en esta corrida.

---

### Task 1: Template en `lib/mail.ts` + tests

**Files:**
- Modify: `lib/mail.ts` (archivo completo, ver Step 3)
- Create: `lib/mail.test.mjs`

**Interfaces:**
- Produces (usados por Task 2 y por el test):
  - `export type MailLine = string | null`
  - `export type MailButton = { label: string; href: string }`
  - `export function escapeHtml(value: string): string`
  - `export function renderMailText(body: MailLine[], button?: MailButton): string`
  - `export function renderMailHtml(body: MailLine[], button?: MailButton): string`
  - `export async function sendMail(mail: { subject: string; body: MailLine[]; button?: MailButton; replyTo?: string; to?: string }): Promise<MailResult>`
- Consumes: `site` de `lib/site.ts` (`site.url`, `site.tagline`, `site.contact.webDisplay`). `lib/site.ts` no tiene `server-only`, se puede importar desde el test.

- [ ] **Step 1: Escribir el test que falla**

Crear `lib/mail.test.mjs` con exactamente esto:

```js
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test`
Expected: FAIL — `mail.ts` no exporta `escapeHtml` / `renderMailHtml` / `renderMailText`.

- [ ] **Step 3: Escribir `lib/mail.ts`**

Reemplazar el contenido completo de `lib/mail.ts` por:

```ts
// Envío de mail vía Resend. Único punto de salida: lo usan el formulario de
// contacto, soporte y feedback. Cada caller pasa las líneas del cuerpo y acá
// se derivan las dos versiones que espera Resend: texto plano y HTML de marca.

import { site } from "./site";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "molpo web <info@molpo.ar>";
const LOGO_URL = `${site.url}/assets/molpo-blanco.png`;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type MailResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" }
  | { ok: false; reason: "failed" };

// null = línea que el caller decidió omitir; "" = separación de párrafo.
export type MailLine = string | null;
export type MailButton = { label: string; href: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

// Las líneas ya vienen escapadas: los links sueltos del texto plano tienen que
// seguir siendo clickeables en el HTML.
function linkify(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}" style="color:#18365d">${url}</a>`,
  );
}

function lines(body: MailLine[]): string[] {
  return body
    .filter((line): line is string => line !== null)
    .flatMap((line) => line.split("\n"));
}

export function renderMailText(body: MailLine[], button?: MailButton): string {
  const all = lines(body);
  if (button) all.push("", `${button.label}: ${button.href}`);
  return all.join("\n");
}

export function renderMailHtml(body: MailLine[], button?: MailButton): string {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines(body)) {
    if (line.trim() === "") {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) groups.push(current);

  const paragraphs = groups
    .map(
      (group) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#09172b">` +
        `${group.map((line) => linkify(escapeHtml(line))).join("<br>")}</p>`,
    )
    .join("");

  // Sólo http(s): un href raro no debería salir clickeable de acá.
  const cta =
    button && /^https?:\/\//.test(button.href)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px">` +
        `<tr><td style="background-color:#18365d;border-radius:6px">` +
        `<a href="${escapeHtml(button.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">` +
        `${escapeHtml(button.label)}</a></td></tr></table>`
      : "";

  return (
    `<!doctype html><html lang="${site.lang}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width"><title>${escapeHtml(site.name)}</title></head>` +
    `<body style="margin:0;padding:0;background-color:#d7e8f8">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#d7e8f8">` +
    `<tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px">` +
    `<tr><td style="background-color:#18365d;padding:20px 24px;border-radius:8px 8px 0 0">` +
    `<img src="${LOGO_URL}" width="73" height="26" alt="${escapeHtml(site.name)}" style="display:block;border:0"></td></tr>` +
    `<tr><td style="padding:24px">${paragraphs}${cta}</td></tr>` +
    `<tr><td style="background-color:#09172b;padding:16px 24px;border-radius:0 0 8px 8px">` +
    `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8cb3de">` +
    `${escapeHtml(site.tagline)}<br>` +
    `<a href="${site.url}" style="color:#8cb3de">${escapeHtml(site.contact.webDisplay)}</a></p>` +
    `</td></tr></table></td></tr></table></body></html>`
  );
}

export async function sendMail(mail: {
  subject: string;
  body: MailLine[];
  button?: MailButton;
  replyTo?: string;
  to?: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "unconfigured" };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to ?? process.env.CONTACT_TO ?? "info@molpo.ar"],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: renderMailText(mail.body, mail.button),
        html: renderMailHtml(mail.body, mail.button),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Resend rechazó el envío", {
        status: response.status,
        response: await response.text(),
      });
      return { ok: false, reason: "failed" };
    }
  } catch (error) {
    console.error("No se pudo conectar con Resend", error);
    return { ok: false, reason: "failed" };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm test`
Expected: PASS — los 10 tests de `lib/mail.test.mjs` en verde y los tests existentes (`contact`, `feedback`, `markdown`, `tickets`) sin romperse.

---

### Task 2: Migrar los 4 callers a `body`

**Files:**
- Modify: `app/api/contact/route.ts` (la llamada a `sendMail`, ~línea 48)
- Modify: `app/soporte/actions.ts` (dos llamadas a `sendMail`)
- Modify: `app/feedback/actions.ts` (la llamada a `sendMail`)

**Interfaces:**
- Consumes de Task 1: `sendMail({ subject, body, button?, replyTo?, to? })`. `body` es `(string | null)[]`: `sendMail` ya filtra los `null` y ya hace el `join("\n")`, así que **hay que borrar** el `.filter((line) => line !== null).join("\n")` de cada caller.

- [ ] **Step 1: `app/api/contact/route.ts`**

Reemplazar el bloque `text: [...]...join("\n"),` de la llamada a `sendMail` por:

```ts
    body: [
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      empresa ? `Empresa: ${empresa}` : null,
      "",
      mensaje,
    ],
```

(La llamada queda `sendMail({ subject, replyTo, body })`; `subject` y `replyTo` no cambian.)

- [ ] **Step 2: `app/soporte/actions.ts` — ticket nuevo (`crearTicket`)**

Reemplazar el bloque `text: [...]...join("\n"),` por:

```ts
    body: [
      `Cliente: ${cliente}`,
      `Tipo: ${ETIQUETAS[ticket.tipo]} · Prioridad: ${ETIQUETAS[ticket.prioridad]}`,
      ticket.reporta ? `Reporta: ${ticket.reporta}` : null,
      ticket.url ? `Pantalla o URL: ${ticket.url}` : null,
      "",
      ticket.detalle,
    ],
```

- [ ] **Step 3: `app/soporte/actions.ts` — cambio de estado (`actualizarTicket`)**

Este es el único mail que ve un cliente. El link a "ver tus pedidos" pasa a ser el botón; el de feedback queda como línea de texto (se autolinkea sola en el HTML). Reemplazar el bloque `text: [...]...join("\n"),` por:

```ts
      body: [
        `Hola${ticket.reporta ? ` ${ticket.reporta}` : ""},`,
        "",
        `El pedido #${ticket.id} "${ticket.titulo}" pasó a ${ETIQUETAS[estado]}.`,
        ticket.respuesta ? "" : null,
        ticket.respuesta,
        // Sólo cuando el trabajo terminó: pedir feedback en un ticket abierto molesta.
        tokenCliente && (estado === "resuelto" || estado === "cerrado")
          ? `\n¿Cómo salió? Contame acá: ${site.url}/feedback/${tokenCliente}/?trabajo=soporte`
          : null,
      ],
      button: tokenCliente
        ? { label: "Ver todos tus pedidos", href: `${site.url}/soporte/${tokenCliente}/` }
        : undefined,
```

Notas para no romper nada:
- `ticket.respuesta` es `string | null`, así que entra directo en el array (`MailLine`).
- La línea `"molpo"` del final se borra: ahora la firma la pone el pie del template y en el texto plano queda el botón como última línea.

- [ ] **Step 4: `app/feedback/actions.ts`**

Reemplazar el bloque `text: [...]...join("\n"),` por:

```ts
    body: [
      `Cliente: ${cliente}`,
      `Trabajo: ${TRABAJO_ETIQUETAS[fb.trabajo]}`,
      `Puntaje: ${fb.puntaje}/5 (${PUNTAJE_ETIQUETAS[fb.puntaje]}) · Recomendaría: ${fb.recomienda}/5`,
      fb.nombre ? `Firma: ${fb.nombre}` : null,
      fb.email ? `Email: ${fb.email}` : null,
      `Publicable como testimonio: ${fb.publicar ? "sí" : "no"}`,
      "",
      fb.comentario,
      fb.destacado ? `\nLo que más sirvió: ${fb.destacado}` : null,
      fb.mejorar ? `\nA mejorar: ${fb.mejorar}` : null,
    ],
```

(`replyTo: fb.email ?? undefined` se queda como está.)

- [ ] **Step 5: Verificar que no quedó ningún caller viejo**

Run: `grep -rn "text: \[" app/ ; grep -rn "line !== null" app/`
Expected: sin resultados (los 4 callers migrados y ningún `.filter().join()` residual).

- [ ] **Step 6: Typecheck y tests**

Run: `pnpm typecheck`
Expected: sin errores.

Run: `pnpm test`
Expected: todos los tests en verde.

- [ ] **Step 7: Dejar una muestra del HTML para revisar a ojo**

Run:

```bash
node --experimental-strip-types -e 'import("./lib/mail.ts").then(m=>{require("fs").writeFileSync("/tmp/mail-preview.html", m.renderMailHtml(["Hola Ana,","",`El pedido #12 "El listado no exporta a Excel" pasó a Resuelto.`,"","Ya quedó corregido: el export ahora sale con el filtro aplicado.","","¿Cómo salió? Contame acá: https://molpo.ar/feedback/abc/?trabajo=soporte"],{label:"Ver todos tus pedidos",href:"https://molpo.ar/soporte/abc/"}))})'
```

Expected: `/tmp/mail-preview.html` escrito. No mandes ningún mail real: `RESEND_API_KEY` está en `.env.local` y los envíos son reales.
