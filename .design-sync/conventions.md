# molpo — how to build with this system

The components here are the **real sections of the molpo landing site** (a Next.js
app), compiled as-is. Each one is a full-bleed page section that renders its own
copy from the repo's content files — not a generic UI kit. Compose a page by
stacking sections; use the tokens below for anything you write yourself.

## Setup

No provider, no theme wrapper, no context. Import and render:

```jsx
import { Nav, Hero, Servicios, Proceso, Casos, SobreMi, TrustStrip, CtaFinal, Footer } from '<ds>';

<>
  <Nav />
  <Hero />
  <TrustStrip />
  <Servicios />
  <Proceso />
  <Casos />
  <SobreMi />
  <CtaFinal />
  <Footer />
</>
```

That stack IS the molpo home page, in order. `Hero` already contains its own top
bar (logo, nav links, `ThemeToggle`, contact button); `Nav` is the separate
sticky bar used on interior pages. Use one or the other, not both.

Only two components take props:

- `ContactForm` — `placement: "contact_page" | "home_form" | "final_cta" | "footer"` (required, analytics tag) and `compact?: boolean`.
- `ThemeToggle` — `className?: string`, merged onto the button. This is the only way to restyle it (Hero uses it to recolor the icon for its dark bar).

Every other component takes nothing. Their text lives in `lib/site.ts` and
`content/` in the source repo, so they are not parameterizable from here — if a
section needs different copy, build that section yourself with the tokens below.

## Styling idiom: CSS custom properties, never class names

Component styles are CSS Modules compiled into `_ds_bundle.css` with **hashed**
class names. Do not guess, copy, or reuse those class names — they change on
every build. There is no utility-class vocabulary in this system.

For your own markup, style with the CSS variables the system defines on `:root`
(read `_ds/<folder>/styles.css` and its imports for the full set):

| Group | Variables |
|---|---|
| Brand palette (fixed, never theme-dependent) | `--azul-profundo` `--azul-primario` `--azul-medio` `--azul-claro` `--celeste-palido` `--blanco` `--wa-verde` |
| Surfaces / text (theme-dependent) | `--bg` `--surface` `--seccion-alt` `--nav-bg` `--text` `--text-strong` `--texto-cuerpo` `--texto-cuerpo-2` `--texto-tenue` `--texto-footer` |
| Accent / links / borders | `--accent` `--link` `--link-hover` `--borde` `--borde-2` `--chip` `--chip-2` `--focus-ring` |
| Gradients (dark surfaces in both themes) | `--grad-hero` `--grad-cta` `--grad-avatar` `--grad-card-dark` |
| Layout | `--contenido` (1180px max width) `--pad-lateral` (responsive side padding) |
| Radii | `--r-boton` (12px) `--r-pill` (999px) `--r-card` (16px) |
| Shadows | `--sombra-card` `--sombra-cta-flotante` |
| Fonts | `--font-founders` (Founders Grotesk — headings) `--font-inter` (Inter — body) |

Two global helper classes ship in the stylesheet and are safe to use:
`.container` (max-width + side padding) and `.eyebrow` (the small uppercase
label above section headings).

## Theming

Light is the default. Dark comes from either the OS preference or
`document.documentElement.setAttribute('data-theme', 'dark')` — that is exactly
what `ThemeToggle` does. Because every theme-dependent token is redefined under
`:root[data-theme="dark"]`, markup that uses the variables above themes itself;
markup with hardcoded hexes does not. Prefer the variables.

## Language

The system is Spanish (Argentina), voseo — "Contame qué sistema tenés". Match it
in any copy you add.

## Idiomatic snippet

```jsx
<section style={{ background: 'var(--seccion-alt)', padding: '96px 0' }}>
  <div className="container">
    <p className="eyebrow">Servicios</p>
    <h2 style={{ fontFamily: 'var(--font-founders), sans-serif', color: 'var(--text-strong)' }}>
      En qué te puedo ayudar
    </h2>
    <p style={{ color: 'var(--texto-cuerpo)', maxWidth: '58ch' }}>
      Sistemas hechos para tu operación real, sin plantillas.
    </p>
    <div style={{ marginTop: 32, maxWidth: 560 }}>
      <ContactForm placement="home_form" compact />
    </div>
  </div>
</section>
```

## One caveat

The logos are inlined into the stylesheet as `img[src="/assets/…"] { content: url(…) }`
rules, because the source app serves them from Next's `public/` dir. They render
in Chromium and Safari. Don't reference `/assets/*` paths in new markup — that
path does not exist here.
