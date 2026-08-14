# design-sync notes — molpo-landing

This repo is **not** a design-system package: it's the Next.js landing app. There
is no `dist/`, no Storybook, and no library build. The sync works anyway, via a
hand-written entry barrel. Read this before re-running.

## How the build is wired

- **Entry**: `.design-sync/entry.tsx` — a barrel that re-exports the 11 section
  components by name (they're all `export default`). Passed with `--entry`.
  Without `--entry` the converter looks for `node_modules/molpo-landing/` and
  crashes (npm never self-installs the app).
- **`.design-sync/tsconfig.json`** (pointed at by `cfg.tsconfig`) carries the
  esbuild path aliases: `@/*`, plus `next/link` → `.design-sync/shims/next-link.tsx`
  (a plain `<a>`; next/link needs a Next router that doesn't exist here), plus
  `/assets/*` `/fonts/*` `/icons/*` → `public/*` so `url()` refs in the CSS
  Modules resolve and inline as data URIs.
- **`process` shim**: `entry.tsx` stubs `globalThis.process` before any render.
  `Footer` reads `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID`; without the stub it
  threw `ReferenceError: process is not defined` and dropped to the floor card.
- **`.design-sync/assets.css`** (imported from `entry.tsx`, so it lands in
  `_ds_bundle.css`): the Google-Fonts `@import` for Inter, the `--font-founders` /
  `--font-inter` bindings, the `body` font rule, and `img[src="/assets/…"] { content: url(…) }`
  rules. All four exist because **next/font and Next's `public/` dir have no
  equivalent outside the app** — the vars are injected at runtime by
  `app/layout.tsx`, and `/assets/*` is served by Next. Without these the cards
  render in a serif fallback with broken logos.
- **`.design-sync/fonts.css`** (`cfg.extraFonts`): `@font-face` for Founders
  Grotesk Regular/Medium from `public/fonts/`. Ships to `fonts/`.
- **`cfg.dtsPropsFor`**: written by hand for all 11. The extractor could only see
  `[key: string]: unknown` (the components are default exports with inline prop
  types), which told the design agent nothing. Nine sections take no props; only
  `ContactForm` (`placement`, `compact`) and `ThemeToggle` (`className`) do.
  **If a component's props change in `components/*.tsx`, update `dtsPropsFor` —
  nothing detects the drift automatically.**

## Build commands

```sh
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./.design-sync/entry.tsx --out ./ds-bundle [--remote .design-sync/.cache/remote-sync.json]
```

Playwright: the machine's browser cache is `chromium-1208`, which pins
**playwright 1.58.0** — that exact version is what `.ds-sync/` installs. A newer
playwright fails with `browserType.launch: Executable doesn't exist`.

## Preview scope

Nine sections are zero-prop and render their real content on the default render,
so that render IS the canonical story — no authored preview needed. Authored
previews exist only for the two components with props:
`.design-sync/previews/ContactForm.tsx` and `ThemeToggle.tsx`.

Two stories were deliberately **not** written, because they'd be lies: a
ContactForm-on-dark-CTA cell and a bare ThemeToggle-on-dark cell. Neither
component ships dark styling — `CtaFinal.module.css .formWrap` and
`Hero.module.css .themeToggle` do the recoloring from the outside. The
ThemeToggle dark story instead demonstrates the `className` prop doing that job.

## Known render warns

- `[FONT_REMOTE] "Inter"` — expected. Inter comes from the Google Fonts `@import`
  in `assets.css`; it's not shipped as a local file. Founders Grotesk IS shipped.
- `tokens: 39 defined, 36 referenced` — no missing-token warning; clean.

## Re-sync risks

- **`.design-sync/assets.css` hardcodes four asset filenames.** If a component
  starts referencing a different `/assets/*` file, its `img` renders broken and
  nothing in the pipeline flags it (the render check only sees a non-empty root).
  Re-grep `grep -rn '"/assets/' components/` on each re-sync and reconcile.
- **`cfg.dtsPropsFor` is a hand-maintained copy of the prop types.** It silently
  goes stale when `components/*.tsx` changes signature.
- **The `img { content: url() }` trick is Chromium/Safari only** — Firefox
  ignores `content` on `img` and shows the broken-image icon. Accepted for now;
  the alternative is editing app source to import the assets.
- **`next/link` is shimmed to a plain anchor.** If a component starts relying on
  Link-specific behavior (prefetch, client nav), the preview diverges from the app.
- **Inter loads from fonts.googleapis.com at render time.** No network → serif
  fallback body text.
- Components read copy from `lib/site.ts` and `content/` at module scope. Copy
  edits there change every card without touching any component file — expect
  render-hash churn on re-sync after a content edit.
