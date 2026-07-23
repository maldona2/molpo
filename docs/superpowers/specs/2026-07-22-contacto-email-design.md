# Contacto por email y formulario — diseño

Fecha: 2026-07-22
Estado: aprobado

## Objetivo

Reemplazar WhatsApp como canal primario de contacto por email y formulario de
contacto. El teléfono queda visible como opción secundaria (link a WhatsApp
para quien prefiera chatear). Se elimina el botón flotante de WhatsApp.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Backend del formulario | API propia en el mismo Next.js, deploy Railway |
| Envío de mail | SMTP Zoho (`smtp.zoho.com`), cuenta `info@molpo.ar` |
| Ubicación del form | Página `/contacto` + versión compacta embebida en el home |
| Teléfono | Footer y `/contacto`, terciario, sigue linkeando a `wa.me` |
| Botón flotante WhatsApp | Se elimina |

## Arquitectura

### Infra y configuración

- `next.config.ts`: se quita `output: "export"`. Las páginas siguen siendo
  SSG (prerender en build); el servidor `next start` sirve además la API.
- Railway: start command `npm start`. Se elimina el paso de servir `out/`.
- Dependencia nueva: `nodemailer` (+ `@types/nodemailer`).
- Env vars (Railway y `.env.local` para dev):
  - `ZOHO_SMTP_USER` — `info@molpo.ar`
  - `ZOHO_SMTP_PASS` — app password de Zoho
  - `CONTACT_TO` — destinatario, default `info@molpo.ar`

### API `POST /api/contact` (`app/api/contact/route.ts`)

- Body JSON: `{ nombre, email, empresa?, mensaje, web }` — `web` es honeypot
  oculto en el form.
- Validación server-side: `nombre`, `email`, `mensaje` requeridos; email con
  formato válido; longitudes máximas (nombre/empresa 200, email 320,
  mensaje 5000).
- Honeypot con contenido → responde 200 (falso éxito), no envía nada.
- Rate limit in-memory por IP: 5 envíos/hora (`Map`, suficiente para un
  formulario de contacto en single-instance; si Railway escala horizontal,
  pasar a store compartido).
- Envío con Nodemailer: `smtp.zoho.com:465` (SSL), `from` y `to`
  `info@molpo.ar`, `replyTo` el email del visitante. Asunto:
  `Contacto web: <nombre>`.
- Sin env vars configuradas → 503 con mensaje claro (el form muestra
  fallback mailto).
- Errores SMTP → 502; el form muestra fallback mailto.

### Componente `ContactForm` (client)

- Campos: nombre, email, empresa (opcional), mensaje + honeypot invisible.
- Estados: idle → enviando → ok | error. En ok: mensaje de confirmación.
  En error (red, 4xx, 5xx): mensaje + link `mailto:info@molpo.ar` como
  alternativa directa.
- Prop `compact` para la variante del home (mismos campos, layout más chico).
- Accesibilidad: labels reales, `aria-invalid`, mensajes de error asociados,
  focus management al confirmar.

### Página `/contacto`

- Jerarquía: 1º formulario, 2º mail directo (`mailto:info@molpo.ar`
  visible como texto), 3º teléfono `+54 9 381 300 0120` con link `wa.me`
  (discreto).
- Metadata propia, canonical `https://molpo.ar/contacto/`, entrada en
  sitemap, JSON-LD `ContactPage`.

## Reemplazo de CTAs por superficie

| Superficie | Antes | Después |
|---|---|---|
| Hero CTA "Empecemos hoy" | wa.me | `/contacto` |
| Hero topbar "Contacto" + menú mobile | wa.me | `/contacto` |
| Nav páginas internas (botón) | "WhatsApp" → wa.me | "Contacto" → `/contacto` |
| Botón flotante (`FloatingWa`) | wa.me | eliminado en todas las páginas |
| CtaFinal (home) | botones WhatsApp + mail | form compacto + mail directo |
| Páginas casos/servicios/metodología | CTAs wa.me | `/contacto` |
| Footer | teléfono, mail, web | mail, teléfono (wa.me), web |
| `public/llms.txt` | WhatsApp primero | email + form primero, teléfono después |
| JSON-LD (`lib/jsonld.ts`) | contactPoint actual | email primario, teléfono se mantiene |

## Analytics (`lib/analytics.ts`)

- `ContactMethod` suma `"form"`.
- `ContactPlacement` suma `"contact_page"` y `"home_form"`.
- `trackEvent({ name: "contact_click", method: "form", placement })` al
  enviar el form con éxito. Los CTAs que ahora navegan a `/contacto` dejan
  de trackear `contact_click` (navegación interna, se mide con pageview).

## Tooling y SEO

- `scripts/check-seo.mjs`: hoy lee `out/`; pasa a leer los HTML
  prerenderizados en `.next/server/app/`. Suma `/contacto` a las rutas
  esperadas.
- `app/sitemap.ts`: agrega `/contacto`.
- `docs/deployment/railway.md`: start command `npm start`, env vars SMTP,
  se quita la referencia a servir estáticos.

## Verificación

1. `npm run typecheck` y `npm run build` limpios.
2. `npm run check:seo` verde con la nueva fuente de HTML y la ruta nueva.
3. Dev sin env vars: POST a `/api/contact` → 503, el form muestra fallback
   mailto.
4. Dev con env vars reales: envío de prueba llega a `info@molpo.ar`.
5. Honeypot lleno → 200 sin mail. Sexto envío en una hora → 429.
6. Recorrida visual: home (hero, CTA final con form compacto), `/contacto`,
   una página de caso y una de servicio — sin rastro del botón flotante.
