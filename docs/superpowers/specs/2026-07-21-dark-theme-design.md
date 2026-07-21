# Dark theme — design

Date: 2026-07-21
Status: approved (design), pending implementation plan

## Goal

Add a dark theme to the molpo landing site. Toggle in the nav bar, defaulting
to the visitor's OS setting until they override it. Full-site coverage. No
flash of the wrong theme on load.

## Decisions

- **Activation:** toggle button + system default. `prefers-color-scheme`
  drives the initial theme; a nav toggle lets the user override; the override
  persists in `localStorage`.
- **Coverage:** every section — Nav, Hero, Servicios, Proceso, SobreMi, Casos,
  CtaFinal, Footer, FloatingWa.
- **Toggle placement:** nav bar, next to the WhatsApp CTA (desktop + mobile).
- **Palette:** reuse existing brand blues. No new hues.

## Approach: semantic token layer

The current tokens in `app/globals.css` name colors by hue
(`--azul-profundo`, `--celeste-palido`). Those can't flip per theme without
lying about their name. Introduce a **role-based** token layer on top of the
brand palette, then theme by swapping role tokens.

### New semantic tokens

Roles (values differ per theme):

| Token            | Role                          | Light            | Dark                         |
|------------------|-------------------------------|------------------|------------------------------|
| `--bg`           | page background               | `#ffffff`        | `#09172b`                    |
| `--surface`      | cards / nav / raised panels   | `#ffffff`        | `#0e2038`                    |
| `--surface-alt`  | alternate section background  | `#f3f8fd`        | `#12294a`                    |
| `--text`         | primary body text             | `#20303f`        | `#d7e8f8`                    |
| `--text-strong`  | headings                      | `#09172b`        | `#ffffff`                    |
| `--text-muted`   | secondary text                | `#4a5d70`        | `#8cb3de`                    |
| `--text-faint`   | tertiary / footer text        | `#6b7c90`        | `#5e7a96`                    |
| `--border`       | hairlines / card borders      | `#e1eaf4`        | `rgba(140,179,222,0.18)`     |
| `--link`         | link color                    | `#18365d`        | `#8cb3de`                    |
| `--link-hover`   | link hover                    | `#4e78a9`        | `#d7e8f8`                    |
| `--chip-bg`      | chip / tag background         | `#eaf1f8`        | `rgba(140,179,222,0.12)`     |

The brand hue tokens (`--azul-*`) stay as the source palette. Existing
gradient tokens (`--grad-hero`, `--grad-cta`, etc.) stay dark in both themes —
they are already dark surfaces with white text on top.

### Theme resolution (CSS)

```css
:root {                     /* light defaults */
  --bg: #ffffff; /* ...light role values... */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {  /* system dark, no explicit choice */
    --bg: #09172b; /* ...dark role values... */
  }
}
:root[data-theme="dark"]  { /* explicit dark override */ }
:root[data-theme="light"] { /* explicit light override */ }
```

`data-theme` on `<html>` always wins; absent it, the media query decides.

### No-flash script

Inline `<script>` in `<head>` (in `app/layout.tsx`), runs before first paint:

```js
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
```

When no stored choice exists, no attribute is set and the media query governs.
Because the script runs synchronously in `<head>`, the correct theme is applied
before the body renders — no flash.

### Toggle component

- New client component `components/ThemeToggle.tsx` (`"use client"`).
- Renders a button with sun/moon icon and an accessible label
  (`aria-label` in Spanish, e.g. "Cambiar tema").
- On click: compute next theme, set `data-theme` on `<html>`, write to
  `localStorage`, update local state for the icon.
- On mount: read the current resolved theme (from `data-theme` or
  `matchMedia`) to render the correct initial icon. Guard against hydration
  mismatch (render a stable placeholder until mounted).
- Mounted into `components/Nav.tsx`, in the desktop actions group and the
  mobile menu.

## Migration work

Replace hardcoded surface/text colors with role tokens:

- `app/globals.css`: `body` bg/text, `a` link/hover, `h1..h3` color → tokens.
  Add `color-scheme: light dark` on `:root` for native form/scrollbar theming.
- Per-section module CSS (`Nav`, `Servicios`, `Proceso`, `SobreMi`, `Casos`,
  `CtaFinal`, `Footer`, `FloatingWa`): swap section backgrounds, text, and
  border colors for role tokens.
- **Hero:** leave the light-effect layers (beam/sweep/blob) and the dark base
  as-is — dark in both themes. Only verify contrast holds.
- Add a short `transition` on `background-color`/`color` at the `body`/section
  level so toggling is smooth (respect `prefers-reduced-motion`).

## Out of scope

- No third "auto" toggle state in the UI (system is the *default*, not a
  selectable third button). Two states: light / dark.
- No per-component color redesign beyond mapping to tokens.
- No theme preference syncing across devices.

## Testing / verification

- Load with OS light → site light; OS dark → site dark (no stored choice).
- Toggle flips theme and persists across reload.
- Hard reload in dark mode shows no white flash.
- All sections legible in both themes (contrast check on text over surfaces).
- Reduced-motion: no theme-transition animation.

## Files touched

- `app/globals.css` — semantic tokens + theme blocks + migrate hardcoded colors
- `app/layout.tsx` — inline no-flash script
- `components/ThemeToggle.tsx` — new
- `components/ThemeToggle.module.css` — new
- `components/Nav.tsx`, `Nav.module.css` — mount toggle, tokenize colors
- `components/{Servicios,Proceso,SobreMi,Casos,CtaFinal,Footer,FloatingWa}.module.css`
  — tokenize surface/text/border colors
