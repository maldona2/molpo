# Project Metadata

- Project: molpo — Sitio landing/portfolio de molpo — estudio de desarrollo de software a medida para pymes de Tucumán y Argentina.
- Stack: Next.js 15 (App Router, server en producción — no static export), React 19, TypeScript 5, CSS Modules, Postgres, pnpm.
- Repository layout:
  - `app/(sitio)/` — sitio público (molpo.ar); `app/(privado)/` — área privada (app.molpo.ar); `middleware.ts` separa los dominios. Fuera de los grupos: `app/api/`, `app/adjuntos/`, `app/admin/` y los metadatos del sitio.
  - `components/` — componentes de React + CSS Modules. `lib/` — lógica, acceso a datos y tests unitarios (`lib/*.test.mjs`).
  - `content/` — contenido del sitio. `public/`, `media/` — estáticos. `scripts/` — chequeos sueltos (SEO).
  - `e2e/` — suite Playwright (`playwright.config.ts`). `docs/` — deployment y planes/specs.
  - `.ai/` — reglas y skills para agentes (ver `AGENTS.md`).
