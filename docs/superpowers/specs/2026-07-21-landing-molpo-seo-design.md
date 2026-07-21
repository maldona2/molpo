# Landing molpo — recreación en Next.js con SEO + GEO

**Fecha:** 2026-07-21
**Autor:** Matías Maldonado (molpo)
**Estado:** Aprobado para planificación

## Objetivo

Recrear la landing de promoción personal de **molpo** (Matías Maldonado — desarrollo de software) en Next.js, con fidelidad visual alta (hifi) respecto al handoff de diseño, y priorizando SEO tradicional y **SEO por IA / GEO (Generative Engine Optimization)**.

Público: pymes que ya dependen de su software. Tono: directo, "sin humo". CTA principal: WhatsApp.

Fuente de diseño: `~/Downloads/design_handoff_landing_molpo/` (prototipo HTML `Landing Molpo.dc.html`, `README.md`, `assets-molpo/`). El copy se usa **verbatim** desde el prototipo.

## Decisiones tomadas

| Área | Decisión |
|---|---|
| Framework | Next.js App Router + TypeScript, `output: 'export'` (HTML estático) |
| Estilos | CSS Modules por componente + tokens en `:root` (globals.css). Diseño fluido con `clamp()` / `grid auto-fit minmax` / `flex-wrap`, sin media queries |
| Tipografía | Founders Grotesk (títulos) self-hosted vía `next/font/local` (OTF→WOFF2); Inter (cuerpo) vía `next/font/google`. `display:swap`, preload |
| SEO/GEO | Completo: Metadata API, JSON-LD, sitemap, robots, `llms.txt`, semántica/a11y, OG generada en build |
| Base URL canónica | `https://www.molpo.com` |
| Estado | Constante `showFloatingWa` (default `true`) en `lib/site.ts` — sin JS de cliente |

> **Nota de licencia:** Founders Grotesk es una fuente comercial. Los OTF vienen en el handoff pero la licencia de uso en producción es responsabilidad del cliente/desarrollador. Si no se licencia, sustituto libre acordado en el handoff: **Space Grotesk** (cambio de una línea en la config de fuentes).

## Arquitectura de archivos

```
app/
  layout.tsx          # <html lang="es-AR">, fonts, metadata global, JSON-LD, floating WA
  page.tsx            # ensambla secciones dentro de <main>
  globals.css         # reset + :root tokens (colores, degradados, radios, sombras, keyframes)
  opengraph-image.tsx # OG 1200x630 generada en build con next/og (degradado marca + logo)
  sitemap.ts          # sitemap.xml
  robots.ts           # robots.txt (allow all + ref sitemap)
components/
  Nav.tsx        + Nav.module.css
  Hero.tsx       + Hero.module.css
  Servicios.tsx  + Servicios.module.css
  Proceso.tsx    + Proceso.module.css
  Casos.tsx      + Casos.module.css
  SobreMi.tsx    + SobreMi.module.css
  CtaFinal.tsx   + CtaFinal.module.css
  Footer.tsx     + Footer.module.css
  FloatingWa.tsx + FloatingWa.module.css
lib/
  site.ts             # config: url, contacto, wa link, nav items, showFloatingWa
  jsonld.ts           # builders de structured data (ProfessionalService, Person, WebSite/WebPage)
content/
  data.ts             # copy verbatim: servicios[], pasos[], casos[] — fuente única de verdad
public/
  assets/  *.svg      # molpo-azul, molpo-celeste, simbolo-blanco, simbolo-azul
  fonts/   *.woff2    # FoundersGrotesk-Regular, FoundersGrotesk-Medium
  llms.txt            # resumen markdown para LLMs (GEO)
next.config.ts        # output: 'export', trailingSlash
```

## Design tokens (`:root` en globals.css)

Colores:
- `--azul-profundo: #09172B`
- `--azul-primario: #18365D`
- `--azul-medio: #4E78A9`
- `--azul-claro: #8CB3DE`
- `--celeste-palido: #D7E8F8`
- `--blanco: #FFFFFF`
- Neutros: `--seccion-alt: #F3F8FD`, `--borde: #E1EAF4`, `--borde-2: #E7EFF7`, `--texto-cuerpo: #33475A`, `--texto-cuerpo-2: #4A5D70`, `--texto-tenue: #6B7C90`, `--texto-footer: #5E7A96`, `--chip: #EAF1F8`, `--chip-2: #DCEAF7`
- `--wa-verde: #25D366`

Degradados:
- Hero: `radial-gradient(120% 130% at 8% 0%, #4E78A9 0%, #18365D 44%, #09172B 100%)`
- CTA final: `radial-gradient(120% 150% at 85% 0%, #4E78A9, #18365D 45%, #09172B)`
- Avatar: `radial-gradient(130% 130% at 30% 20%, #4E78A9, #09172B)`
- Card oscura (Decortinas): `radial-gradient(130% 130% at 18% 10%, #4E78A9, #0E2038)`

Radios/sombras:
- Botones `12px`; pills/chips `999px`; cards `16–18px`
- Sombra card hover: `0 24px 50px -30px rgba(9,23,43,.4)`
- Sombra CTA flotante: `0 16px 34px -12px rgba(9,23,43,.6)`

## Secciones (orden vertical, ancho máx `1180px`, padding lateral `clamp(20px,5vw,48px)`)

1. **Nav** — sticky, `rgba(255,255,255,.86)` + `backdrop-filter:blur(10px)`, borde inferior `#E7EFF7`. Logo `molpo-azul.svg` (h24) + links (Servicios, Cómo trabajo, Casos) + pill WhatsApp `#18365D`.
2. **Hero** (`<header>`) — degradado radial, símbolo blanco watermark ~9% arriba-derecha (decorativo, `aria-hidden`). Eyebrow "Desarrollo de software · Tucumán". `<h1>` clamp(38–74px). Subhead celeste. CTA primario "Escribime por WhatsApp" (`#8CB3DE`, punto verde) + secundario outline "Cómo trabajo". Línea de cierre con tagline.
3. **Servicios** (`#servicios`) — eyebrow + h2 "En qué te puedo ayudar". Grid auto-fit 3 cards (min 280px). Cada card: número en cuadro `#EAF1F8`, título, párrafo. Hover `translateY(-4px)` + sombra. Datos desde `data.ts`.
4. **Proceso** (`#proceso`) — fondo `#F3F8FD`. h2 "Sin humo. Con evidencia." + intro. Grid auto-fit 4 pasos (min 230px): Diagnóstico honesto / Bases sólidas / Construcción por etapas / Acompañamiento.
5. **Casos** (`#casos`) — h2 "Proyectos reales, en uso". Grid auto-fit 2 cards. Card 1 Decortinas (degradado oscuro, símbolo blanco ~10%, tags Auditoría / Sistema de distribuidores). Card 2 KOMUK (`#F3F8FD` + borde, símbolo azul ~9%, tags Web mayorista / Hub central).
6. **Sobre mí** — fondo `#F3F8FD`. Grid 2 col: texto (Matías Maldonado, Desarrollador de Software · molpo, bio) + avatar cuadrado degradado con símbolo blanco 46%.
7. **CTA final** — degradado (origen 85%/0%), centrado. h2 "Hablemos de tu sistema." + CTA WhatsApp + email.
8. **Footer** — fondo `#09172B`. Logo `molpo-celeste.svg`, teléfono, email, web. Línea legal inferior.
9. **Floating WhatsApp** — `position:fixed` abajo-derecha, pill `#18365D`, `@keyframes floatIn`. Render condicional a `showFloatingWa`. Respeta `prefers-reduced-motion`.

## Interacciones

- Nav links → scroll a anclas `#servicios`, `#proceso`, `#casos` (`scroll-behavior:smooth`, respeta reduced-motion).
- CTAs WhatsApp → `https://wa.me/5493813000120`. Email → `mailto:molpo@gmail.com`. Web → `https://www.molpo.com`.
- Cards servicio: hover eleva + sombrea (transición 0.2s).
- Floating: `floatIn` (fade + slide-up, 0.4s).

## SEO + GEO (completo)

**Metadata (Metadata API en layout.tsx):**
- `metadataBase = https://www.molpo.com`, `alternates.canonical = '/'`
- title: "molpo — Desarrollo de software para pymes | Tucumán"
- description: enfocada en propuesta de valor (sistemas a medida, rescate de sistemas con IA, integración de datos, Tucumán)
- keywords relevantes, `robots: index,follow`
- `openGraph`: type website, locale `es_AR`, siteName molpo, imagen (opengraph-image)
- `twitter`: summary_large_image

**JSON-LD (script en layout):**
- `ProfessionalService` "molpo": name, description, url, telephone `+5493813000120`, email `molpo@gmail.com`, `areaServed` (Tucumán, Argentina), `sameAs` (web), `founder` → `Person` Matías Maldonado, `hasOfferCatalog` con los 3 servicios (Offer → Service).
- `Person` Matías Maldonado: jobTitle "Desarrollador de Software", worksFor molpo.
- `WebSite` / `WebPage` del sitio.

**Otros:**
- `sitemap.ts` → sitemap.xml. `robots.ts` → allow all + ref sitemap.
- `public/llms.txt`: resumen markdown estructurado (quién es molpo, servicios, proceso, casos, contacto, zona) — insumo directo para LLMs. GEO.
- **Sin sección FAQ visible → sin FAQPage schema** (marcar Q&A inexistente viola guías de Google). El contenido tipo Q&A vive en `llms.txt`.
- Semántica: `header/nav/main/section` con `aria-label`; un solo `<h1>`; `<h2>` por sección; `alt` real en logos; watermarks decorativas `aria-hidden`/`role=presentation`.
- Performance: fuentes self-hosted con preload + swap; sitio estático (LCP mínimo); sin JS de cliente salvo lo imprescindible.
- a11y: `:focus-visible` en todos los interactivos; contraste ya validado en tokens; `prefers-reduced-motion`.

## Verificación

1. `next build` estático sin errores; se genera `out/`.
2. Servir `out/` y validar con `/browse`:
   - Render pixel-perfect vs prototipo (desktop + colapso mobile a 1 columna).
   - Links WhatsApp/email/anclas funcionan.
   - JSON-LD parseable (validar shape); meta/OG/canonical presentes en `<head>`.
   - `sitemap.xml`, `robots.txt`, `llms.txt` servidos correctamente.
3. Lighthouse SEO ~100 (objetivo).

## Fuera de alcance (YAGNI)

- Sin CMS, sin i18n (single lang es-AR), sin analytics (se puede sumar después), sin formularios (CTA es WhatsApp/email directo), sin FAQ visible, sin blog.
