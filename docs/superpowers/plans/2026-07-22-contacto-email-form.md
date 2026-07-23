# Contacto por email y formulario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar WhatsApp como canal primario por email + formulario de contacto (página `/contacto` + versión compacta en el home), con API propia que envía por SMTP Zoho; eliminar el botón flotante; teléfono queda terciario.

**Architecture:** El sitio deja `output: "export"` y pasa a `next start` en Railway (páginas siguen SSG). Se agrega `POST /api/contact` (validación + honeypot + rate limit in-memory + Nodemailer→Zoho). Un componente client `ContactForm` (prop `compact`) se usa en `/contacto` y en el CTA final del home. Todos los CTAs de WhatsApp pasan a `/contacto`.

**Tech Stack:** Next.js 15 (App Router, TS), CSS Modules, Nodemailer, `node:test` para la validación.

**Spec:** `docs/superpowers/specs/2026-07-22-contacto-email-design.md`

## Global Constraints

- Dominio canónico: `https://molpo.ar`, `trailingSlash: true` (rutas `/contacto/`).
- Email: `info@molpo.ar`. Teléfono display: `+54 9 381 300 0120`, link `https://wa.me/5493813000120`.
- Env vars: `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `CONTACT_TO` (default `info@molpo.ar`).
- Límites de validación: nombre/empresa ≤200, email ≤320, mensaje ≤5000. Rate limit 5/hora/IP.
- No agregar dependencias fuera de `nodemailer` + `@types/nodemailer`.
- Los textos del sitio están en español rioplatense (voseo). Código/comentarios siguen el estilo existente.
- Comandos de verificación repetidos en casi todas las tareas: `npm run typecheck && npm run build && npm run check:seo`.

---

### Task 1: Tipos de analytics y config del sitio

**Files:**
- Modify: `lib/analytics.ts:7-19`
- Modify: `lib/site.ts` (bloque `contact`, `nav` queda igual)

**Interfaces:**
- Produces: `ContactMethod` incluye `"form"`; `ContactPlacement` incluye `"contact_page"` y `"home_form"`; `site.contact.contactPath === "/contacto/"`.

- [ ] **Step 1: Ampliar tipos en `lib/analytics.ts`**

```ts
export type ContactMethod = "whatsapp" | "email" | "form";

export type ContactPlacement =
  | "nav_desktop"
  | "nav_mobile"
  | "hero"
  | "hero_nav"
  | "floating"
  | "methodology_inline"
  | "methodology_end"
  | "case_end"
  | "service_end"
  | "final_cta"
  | "contact_page"
  | "home_form"
  | "footer";
```

- [ ] **Step 2: Agregar `contactPath` en `lib/site.ts`**

En el objeto `contact`, después de `email`:

```ts
    email: "info@molpo.ar",
    contactPath: "/contacto/",
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/analytics.ts lib/site.ts
git commit -m "feat(contact): add form analytics types and contact path"
```

---

### Task 2: Salir de static export y adaptar check-seo

**Files:**
- Modify: `next.config.ts` (quitar `output: "export"`)
- Modify: `scripts/check-seo.mjs` (leer de `.next/server/app`)
- Modify: `package.json` (quitar script `serve`, ya no hay `out/`)

**Interfaces:**
- Produces: `npm run build` genera HTML prerenderizado en `.next/server/app/`; `npm run check:seo` lee de ahí. `npm start` sirve el sitio.

- [ ] **Step 1: Quitar `output: "export"` de `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
```

- [ ] **Step 2: Quitar el script `serve` de `package.json`** (la línea `"serve": "npx serve out",`).

- [ ] **Step 3: Adaptar `scripts/check-seo.mjs`**

En `.next/server/app` las rutas prerenderizadas son archivos `<ruta>.html`
(`index.html` para `/`, `como-trabajamos.html`, `casos/komuk.html`, …) y los
metadata routes emiten `robots.txt.body` / `sitemap.xml.body`. Reemplazar
`getRoutes` y `readOutput`:

```js
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "https://molpo.ar";
const appDir = resolve(".next", "server", "app");
const failures = [];

async function getRoutes() {
  const fixedRoutes = ["/", "/como-trabajamos/", "/privacidad/"];
  try {
    const caseEntries = await readdir(resolve(appDir, "casos"), { withFileTypes: true });
    const serviceEntries = await readdir(resolve(appDir, "servicios"), { withFileTypes: true });
    const caseRoutes = caseEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => `/casos/${entry.name.replace(/\.html$/, "")}/`)
      .sort();
    const serviceRoutes = serviceEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => `/servicios/${entry.name.replace(/\.html$/, "")}/`)
      .sort();
    expect(caseRoutes.length > 0, "No se prerenderizó ningún caso");
    expect(serviceRoutes.length === 3, `Deben prerenderizarse 3 servicios y hay ${serviceRoutes.length}`);
    return [...fixedRoutes, ...caseRoutes, ...serviceRoutes];
  } catch {
    failures.push("Falta el directorio prerenderizado de casos o servicios en .next/server/app");
    return fixedRoutes;
  }
}

async function readOutput(...candidates) {
  for (const candidate of candidates) {
    try {
      return await readFile(resolve(appDir, candidate), "utf8");
    } catch {
      // probar el siguiente candidato
    }
  }
  failures.push(`Falta el archivo prerenderizado: ${candidates.join(" o ")}`);
  return "";
}
```

Y en el loop de rutas, el path del HTML pasa a ser:

```js
  const outputPath = route === "/" ? "index.html" : `${route.slice(1, -1)}.html`;
  const html = await readOutput(outputPath);
```

Robots y sitemap:

```js
const robots = await readOutput("robots.txt.body", "robots.txt");
// ...
const sitemap = await readOutput("sitemap.xml.body", "sitemap.xml");
```

(El resto del script queda igual.)

- [ ] **Step 4: Verificar**

Run: `npm run build && npm run check:seo`
Expected: `SEO correcto: 10 rutas canónicas bajo https://molpo.ar`

Run: `npm start &` y `curl -s http://localhost:3000/ | head -c 200`, después matar el proceso.
Expected: HTML del home.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts scripts/check-seo.mjs package.json
git commit -m "feat(infra): drop static export, serve with next start"
```

---

### Task 3: Validación de contacto + API `/api/contact`

**Files:**
- Create: `lib/contact.ts`
- Create: `lib/contact.test.mjs` (node:test, sin framework nuevo)
- Create: `app/api/contact/route.ts`
- Modify: `package.json` (dep `nodemailer`, devDep `@types/nodemailer`, script `test`)

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: `validateContact(input: unknown): { ok: true; value: ContactInput } | { ok: false; error: string }` con `ContactInput = { nombre: string; email: string; empresa?: string; mensaje: string }`. Endpoint `POST /api/contact` que responde `{ ok: true }` (200), `{ error }` (400/429/502/503).

- [ ] **Step 1: Instalar dependencias**

```bash
npm install nodemailer && npm install -D @types/nodemailer
```

- [ ] **Step 2: Escribir el test que falla — `lib/contact.test.mjs`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateContact } from "./contact.js";

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
```

Nota: `node:test` no resuelve paths TS; el test importa `./contact.js` vía el
loader de Node con `--experimental-strip-types` (Node ≥22.6). Script de test:

En `package.json`, agregar:

```json
    "test": "node --experimental-strip-types --test lib/*.test.mjs",
```

y en el test importar el TS directamente:

```js
import { validateContact } from "./contact.ts";
```

(usar esta import, no la `.js` — corregir el snippet de arriba al escribirlo).

- [ ] **Step 3: Correr el test para verlo fallar**

Run: `npm test`
Expected: FAIL — `Cannot find module './contact.ts'`.

- [ ] **Step 4: Implementar `lib/contact.ts`**

```ts
export type ContactInput = {
  nombre: string;
  email: string;
  empresa?: string;
  mensaje: string;
};

type ValidationResult = { ok: true; value: ContactInput } | { ok: false; error: string };

const LIMITS = { nombre: 200, email: 320, empresa: 200, mensaje: 5000 } as const;
// Suficiente para un form de contacto: algo@algo.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

export function validateContact(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Cuerpo inválido" };
  }
  const data = input as Record<string, unknown>;
  const nombre = cleanField(data.nombre, LIMITS.nombre);
  const email = cleanField(data.email, LIMITS.email);
  const empresa = cleanField(data.empresa ?? "", LIMITS.empresa);
  const mensaje = cleanField(data.mensaje, LIMITS.mensaje);

  if (!nombre) return { ok: false, error: "Falta el nombre o es demasiado largo" };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };
  if (empresa === null) return { ok: false, error: "Empresa demasiado larga" };
  if (!mensaje) return { ok: false, error: "Falta el mensaje o es demasiado largo" };

  return {
    ok: true,
    value: { nombre, email, empresa: empresa || undefined, mensaje },
  };
}
```

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `npm test`
Expected: `# pass 4`.

- [ ] **Step 6: Implementar `app/api/contact/route.ts`**

```ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { validateContact } from "@/lib/contact";

// ponytail: rate limit in-memory, alcanza para single-instance en Railway;
// pasar a store compartido si algún día hay más de una instancia.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;
  if (!user || !pass) {
    return NextResponse.json(
      { error: "El envío de mail no está configurado" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados envíos, probá más tarde" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  // Honeypot: si el campo oculto viene con contenido, fingir éxito.
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).web) {
    return NextResponse.json({ ok: true });
  }

  const result = validateContact(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { nombre, email, empresa, mensaje } = result.value;
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"molpo web" <${user}>`,
      to: process.env.CONTACT_TO ?? "info@molpo.ar",
      replyTo: `"${nombre}" <${email}>`,
      subject: `Contacto web: ${nombre}`,
      text: [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        empresa ? `Empresa: ${empresa}` : null,
        "",
        mensaje,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Probar el endpoint sin credenciales**

Run: `npm run dev &` y

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/contact -H 'content-type: application/json' -d '{"nombre":"Test","email":"t@t.co","mensaje":"hola"}'
```

Expected: `503` (sin env vars). Con `ZOHO_SMTP_USER=x ZOHO_SMTP_PASS=x npm run dev`: body inválido → `400`, honeypot `{"web":"spam", ...}` → `200`, válido → `502` (credenciales falsas). Matar el dev server al terminar.

- [ ] **Step 8: Verificar tipos y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add lib/contact.ts lib/contact.test.mjs app/api/contact/route.ts package.json package-lock.json
git commit -m "feat(contact): add contact validation and mail API via Zoho SMTP"
```

---

### Task 4: Componente `ContactForm`

**Files:**
- Create: `components/ContactForm.tsx`
- Create: `components/ContactForm.module.css`

**Interfaces:**
- Consumes: `POST /api/contact` (Task 3), `trackEvent` y placements (Task 1), `site.contact.email`.
- Produces: `<ContactForm placement="contact_page" | "home_form" compact?: boolean />`.

- [ ] **Step 1: Implementar `components/ContactForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { site } from "@/lib/site";
import { trackEvent, type ContactPlacement } from "@/lib/analytics";
import styles from "./ContactForm.module.css";

type Props = {
  placement: ContactPlacement;
  compact?: boolean;
};

type Status = "idle" | "sending" | "ok" | "error";

export default function ContactForm({ placement, compact }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo enviar");
      }
      setStatus("ok");
      form.reset();
      trackEvent({ name: "contact_click", method: "form", placement });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar");
    }
  }

  if (status === "ok") {
    return (
      <p className={styles.success} role="status">
        Mensaje enviado. Te respondo personalmente a la brevedad.
      </p>
    );
  }

  return (
    <form className={`${styles.form} ${compact ? styles.compact : ""}`} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Nombre</span>
          <input name="nombre" type="text" required maxLength={200} autoComplete="name" />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" required maxLength={320} autoComplete="email" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Empresa (opcional)</span>
        <input name="empresa" type="text" maxLength={200} autoComplete="organization" />
      </label>
      <label className={styles.field}>
        <span>Mensaje</span>
        <textarea
          name="mensaje"
          required
          maxLength={5000}
          rows={compact ? 4 : 6}
          placeholder="Contame qué sistema tenés y qué está fallando."
        />
      </label>
      {/* Honeypot: oculto para humanos, los bots lo completan */}
      <label className={styles.web} aria-hidden="true">
        Web
        <input name="web" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      {status === "error" ? (
        <p className={styles.error} role="alert">
          {errorMessage}. También podés escribirme directo a{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Implementar `components/ContactForm.module.css`**

```css
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  text-align: left;
}
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-weight: 500;
  font-size: 14px;
  color: var(--texto-cuerpo);
}
.field input,
.field textarea {
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 12px 14px;
  resize: vertical;
}
.field input:focus-visible,
.field textarea:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 1px;
}
/* Honeypot fuera de la vista, sin display:none para no delatar el truco */
.web {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.submit {
  align-self: flex-start;
  font: inherit;
  font-weight: 600;
  color: var(--blanco);
  background: var(--accent);
  border: 0;
  border-radius: var(--r-boton);
  padding: 14px 28px;
  cursor: pointer;
}
.submit:disabled {
  opacity: 0.6;
  cursor: default;
}
.success {
  font-weight: 500;
  color: var(--texto-cuerpo);
  margin: 0;
}
.error {
  font-size: 14px;
  color: #b4231f;
  margin: 0;
}
:root[data-theme="dark"] .error {
  color: #ff9d99;
}
.compact {
  gap: 14px;
}
.compact .submit {
  padding: 12px 24px;
}
```

Nota: dentro del CTA final (fondo oscuro fijo) los tokens de tema ya
resuelven bien porque esa sección define sus propios colores; si algún
input quedara ilegible sobre el gradiente, la sección lo ajusta en su
propio module (ver Task 6, Step 3).

- [ ] **Step 3: Verificar**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/ContactForm.tsx components/ContactForm.module.css
git commit -m "feat(contact): add ContactForm component with compact variant"
```

---

### Task 5: Página `/contacto`

**Files:**
- Create: `app/contacto/page.tsx`
- Create: `app/contacto/Contacto.module.css`
- Modify: `app/sitemap.ts` (agregar `/contacto/`)
- Modify: `lib/jsonld.ts` (helper `contactPageJsonLd`)
- Modify: `scripts/check-seo.mjs` (sumar `/contacto/` a `fixedRoutes`)

**Interfaces:**
- Consumes: `ContactForm` (Task 4), `site` config, patrón de metadata de `app/privacidad/page.tsx`.
- Produces: ruta `/contacto/` prerenderizada con canonical, en sitemap; `contactPageJsonLd(): object`.

- [ ] **Step 1: Implementar `app/contacto/page.tsx`**

```tsx
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { contactPageJsonLd } from "@/lib/jsonld";
import styles from "./Contacto.module.css";

const title = "Contacto";
const description =
  "Contame qué sistema tenés y qué necesitás. Te respondo personalmente por email.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/contacto/",
    languages: { "es-AR": "/contacto/" },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: `${site.url}/contacto/`,
    siteName: site.name,
    title: `${title} | molpo`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | molpo`,
    description,
  },
};

export default function ContactoPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrow}`}>Contacto</p>
            <h1 className={styles.h1}>Hablemos de tu sistema.</h1>
            <p className={styles.lead}>
              Contame qué tenés hoy, qué está fallando y qué impacto genera. Te respondo
              personalmente para entender el contexto y decirte cuál sería el próximo paso.
            </p>
          </div>
        </header>
        <section className={styles.body} aria-label="Formulario de contacto">
          <div className={`container ${styles.grid}`}>
            <ContactForm placement="contact_page" />
            <aside className={styles.alternativas}>
              <h2 className={styles.altTitle}>Otras vías</h2>
              <p className={styles.altItem}>
                Email directo:{" "}
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              </p>
              <p className={styles.altItemSecundario}>
                Teléfono: <a href={site.contact.whatsappUrl} rel="noopener">{site.contact.phoneDisplay}</a>
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Implementar `app/contacto/Contacto.module.css`**

```css
.hero {
  background: var(--grad-hero);
  color: #fff;
}
.heroInner {
  padding-top: clamp(72px, 10vw, 130px);
  padding-bottom: clamp(40px, 6vw, 72px);
}
.eyebrow {
  color: var(--azul-claro);
}
.h1 {
  color: #fff;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.05;
  margin: 14px 0 0;
}
.lead {
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.55;
  color: var(--celeste-palido);
  margin: 18px 0 0;
  max-width: 56ch;
}
.body {
  padding: clamp(48px, 7vw, 90px) 0;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: start;
}
@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.alternativas {
  border: 1px solid var(--borde);
  border-radius: var(--r-card);
  padding: 26px 24px;
}
.altTitle {
  font-size: 18px;
  margin: 0 0 12px;
}
.altItem {
  margin: 0 0 8px;
  color: var(--texto-cuerpo);
}
.altItemSecundario {
  margin: 0;
  font-size: 14px;
  color: var(--texto-tenue);
}
```

- [ ] **Step 3: Agregar `contactPageJsonLd` en `lib/jsonld.ts`**

Al final del archivo, siguiendo el patrón de los helpers existentes:

```ts
export function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${site.url}/contacto/#page`,
    url: `${site.url}/contacto/`,
    name: "Contacto | molpo",
    description:
      "Formulario de contacto y email directo para hablar de tu sistema con molpo.",
    mainEntity: { "@id": `${site.url}/#org` },
  };
}
```

(Verificar el `@id` de la organización en el helper existente y usar el mismo.)

- [ ] **Step 4: Sumar `/contacto/` al sitemap**

En `app/sitemap.ts`, después de la entrada del home:

```ts
    {
      url: `${site.url}/contacto/`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
```

- [ ] **Step 5: Sumar la ruta a `scripts/check-seo.mjs`**

```js
  const fixedRoutes = ["/", "/como-trabajamos/", "/contacto/", "/privacidad/"];
```

- [ ] **Step 6: Verificar**

Run: `npm run typecheck && npm run build && npm run check:seo`
Expected: `SEO correcto: 11 rutas canónicas bajo https://molpo.ar`

- [ ] **Step 7: Commit**

```bash
git add app/contacto app/sitemap.ts lib/jsonld.ts scripts/check-seo.mjs
git commit -m "feat(contact): add /contacto page with form and alternatives"
```

---

### Task 6: Reemplazar CTAs de WhatsApp y eliminar el botón flotante

**Files:**
- Modify: `components/Hero.tsx` (CTA orbital y topbar → `/contacto`)
- Modify: `components/HeroMenu.tsx` (Contacto → `/contacto`)
- Modify: `components/Nav.tsx` (botón "WhatsApp" → "Contacto" → `/contacto`)
- Modify: `components/CtaFinal.tsx` (form compacto + mail directo)
- Modify: `components/CtaFinal.module.css` (estilos para el form sobre fondo oscuro)
- Modify: `components/Footer.tsx` (orden mail → teléfono → web)
- Modify: `app/casos/[slug]/page.tsx`, `app/como-trabajamos/page.tsx`, `app/servicios/[slug]/page.tsx` (CTAs → `/contacto`)
- Delete: `components/FloatingWa.tsx`, `components/FloatingWa.module.css`
- Modify: `app/page.tsx`, `app/casos/[slug]/page.tsx`, `app/servicios/[slug]/page.tsx`, `app/como-trabajamos/page.tsx`, `app/privacidad/page.tsx` (quitar `FloatingWa`)
- Modify: `lib/site.ts` (quitar `showFloatingWa`)
- Modify: `lib/jsonld.ts` (email como contacto primario — mantener `telephone`)
- Modify: `public/llms.txt` (contacto: email y form primero)

**Interfaces:**
- Consumes: `ContactForm` con `placement="home_form"` (Task 4), `site.contact.contactPath` (Task 1).
- Produces: cero links `wa.me` como CTA primario; el único uso restante de `whatsappUrl` es el teléfono terciario (footer y `/contacto`).

- [ ] **Step 1: Hero → `/contacto`**

En `components/Hero.tsx`: el CTA orbital y el botón Contacto del topbar dejan
`TrackedLink`/`site.contact.whatsappUrl` y pasan a `<a href={site.contact.contactPath}>` (navegación interna, sin tracking de contact_click). El CTA
orbital conserva clases y flecha:

```tsx
          <a href={site.contact.contactPath} className={styles.orbitCta}>
            Empecemos hoy
            <span className={styles.arrowCircle} aria-hidden="true">
              {/* svg igual que ahora */}
            </span>
          </a>
```

y en el topbar:

```tsx
            <a href={site.contact.contactPath} className={styles.contactBtn}>
              Contacto
            </a>
```

Quitar el import de `TrackedLink` si queda sin uso.

- [ ] **Step 2: HeroMenu y Nav → `/contacto`**

`components/HeroMenu.tsx`: el `TrackedLink` de Contacto pasa a:

```tsx
          <a href={site.contact.contactPath} className={styles.mobileContact} onClick={close}>
            Contacto
          </a>
```

(quitar import `TrackedLink`).

`components/Nav.tsx`: el CTA desktop y el mobile pasan a links internos:

```tsx
            <a href={site.contact.contactPath} className={styles.cta}>
              Contacto
            </a>
```

```tsx
            <a href={site.contact.contactPath} className={styles.mobileCta} onClick={closeMenu}>
              Contacto
            </a>
```

(el `statusDot` del mobile CTA se elimina; quitar import `TrackedLink` si queda sin uso).

- [ ] **Step 3: CtaFinal con form compacto**

`components/CtaFinal.tsx` completo:

```tsx
import { site } from "@/lib/site";
import ContactForm from "./ContactForm";
import TrackedLink from "./TrackedLink";
import styles from "./CtaFinal.module.css";

export default function CtaFinal() {
  return (
    <section className={styles.wrap} aria-labelledby="cta-h">
      <div className={styles.watermark} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <h2 id="cta-h" className={styles.h2}>
          Hablemos de tu sistema.
        </h2>
        <p className={styles.sub}>
          Contame qué sistema tenés, qué está fallando y qué impacto genera. Te respondo
          personalmente para entender el contexto y decirte cuál sería el próximo paso. Si no te
          puedo ayudar, te lo digo.
        </p>
        <div className={styles.formWrap}>
          <ContactForm placement="home_form" compact />
        </div>
        <p className={styles.altMail}>
          O escribime directo:{" "}
          <TrackedLink
            href={`mailto:${site.contact.email}`}
            tracking={{ name: "contact_click", method: "email", placement: "final_cta" }}
          >
            {site.contact.email}
          </TrackedLink>
        </p>
      </div>
    </section>
  );
}
```

En `components/CtaFinal.module.css`, quitar `.ctas`, `.ctaPrimary`,
`.ctaSecondary`, `.dot` y agregar:

```css
.formWrap {
  max-width: 640px;
  margin: 34px auto 0;
  text-align: left;
}
/* Inputs sobre el gradiente oscuro del CTA */
.formWrap input,
.formWrap textarea {
  background: rgba(9, 23, 43, 0.55);
  border-color: rgba(140, 179, 222, 0.4);
  color: #fff;
}
.formWrap label {
  color: var(--celeste-palido);
}
.formWrap button {
  background: var(--azul-claro);
  color: var(--azul-profundo);
}
.altMail {
  margin: 22px 0 0;
  color: var(--celeste-palido);
  font-size: 15px;
}
.altMail a {
  color: #fff;
  text-decoration: underline;
}
```

- [ ] **Step 4: Footer — mail primero, teléfono después**

En `components/Footer.tsx`, dentro de `.links`, invertir el orden: primero el
`TrackedLink` de `mailto:`, después el del teléfono (mismo `wa.me`, tracking
`method: "whatsapp"` queda), después la web. Solo cambia el orden de los dos
primeros bloques.

- [ ] **Step 5: Páginas internas → `/contacto`**

- `app/casos/[slug]/page.tsx`: borrar `const wa = site.contact.whatsappUrl;`
  y el CTA pasa a:

```tsx
              <a href={site.contact.contactPath} className={styles.cta}>
                <span className={styles.dot} aria-hidden="true" />
                Quiero un sistema así para mi negocio
              </a>
```

- `app/como-trabajamos/page.tsx`: ídem en los dos CTAs
  (`methodology_inline` y `methodology_end`) — mismo patrón, textos actuales
  se conservan.
- `app/servicios/[slug]/page.tsx`: el CTA pasa a:

```tsx
              <a href={site.contact.contactPath} className={styles.ctaLink}>
                Escribime
              </a>
```

En los tres archivos quitar imports sin uso (`TrackedLink` si corresponde).

- [ ] **Step 6: Eliminar FloatingWa**

```bash
git rm components/FloatingWa.tsx components/FloatingWa.module.css
```

Quitar `import FloatingWa` y `<FloatingWa />` de: `app/page.tsx`,
`app/casos/[slug]/page.tsx`, `app/servicios/[slug]/page.tsx`,
`app/como-trabajamos/page.tsx`, `app/privacidad/page.tsx`.
En `lib/site.ts` borrar la línea `showFloatingWa: true,` y su comentario.

- [ ] **Step 7: JSON-LD y llms.txt**

`lib/jsonld.ts`: en `contactPoint`, poner `email` antes que `telephone` y
`contactType: "customer support"` queda como esté; `telephone` se mantiene.

`public/llms.txt`, bloque contacto pasa a:

```
Contacto:
- Email: info@molpo.ar
- Formulario: https://molpo.ar/contacto/
- Teléfono: +54 9 381 300 0120
- Zona: Tucumán, Argentina (trabaja para toda Argentina)
```

- [ ] **Step 8: Verificar que no queda WhatsApp como CTA**

Run: `grep -rn "whatsappUrl" app components | grep -v Footer | grep -v contacto`
Expected: sin resultados.

Run: `npm run typecheck && npm run build && npm run check:seo`
Expected: todo verde, 11 rutas.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(contact): route all CTAs to /contacto, drop floating WhatsApp"
```

---

### Task 7: Docs de deploy y env vars

**Files:**
- Modify: `docs/deployment/railway.md`
- Create: `.env.example`

**Interfaces:**
- Consumes: nombres de env vars de Task 3.

- [ ] **Step 1: `.env.example`**

```
# SMTP Zoho para el formulario de contacto
ZOHO_SMTP_USER=info@molpo.ar
ZOHO_SMTP_PASS=app-password-de-zoho
CONTACT_TO=info@molpo.ar
```

- [ ] **Step 2: Actualizar `docs/deployment/railway.md`**

En la sección de build/start: start command pasa a `npm start` (ya no se
sirven estáticos de `out/`). Agregar sección "Variables de entorno" con la
tabla de las tres vars y nota: el app password se genera en Zoho Mail →
Security → App Passwords; sin las vars el form responde 503 y muestra el
fallback mailto.

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/deployment/railway.md
git commit -m "docs(deploy): document next start and SMTP env vars"
```

---

### Task 8: Verificación final

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa**

Run: `npm test && npm run typecheck && npm run build && npm run check:seo`
Expected: tests 4 pass, build ok, `SEO correcto: 11 rutas`.

- [ ] **Step 2: Recorrida visual en dev**

Con el preview: home (hero CTA → `/contacto`, CTA final con form compacto),
`/contacto` (form + alternativas), un caso y un servicio (CTA → `/contacto`),
sin botón flotante en ninguna. Mobile 375px: form usable, menú hero con
Contacto → `/contacto`.

- [ ] **Step 3: Prueba de envío real (manual, requiere app password)**

Con `.env.local` con credenciales reales: enviar el form desde `/contacto` y
confirmar mail en la bandeja de `info@molpo.ar`. Si no hay credenciales a
mano, verificar el flujo 503 + fallback mailto y dejarlo anotado para probar
en Railway.

- [ ] **Step 4: Commit final si hubo ajustes**

```bash
git add -A
git commit -m "chore(contact): final verification fixes"
```
