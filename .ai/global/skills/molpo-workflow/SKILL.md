---
name: molpo-workflow
description: Execute common molpo development workflows and commands. Use when tasks involve building, testing, linting, type checking, or other runtime operations.
---

# molpo Workflow Runbook

Gestor de paquetes: **pnpm**. Los scripts viven en `package.json`.

## Build

- Desarrollo: `pnpm dev` (Next 15, App Router).
- Producción: `pnpm build` y `pnpm start`. No es static export: hay middleware,
  server actions y Postgres (ver `docs/deployment/railway.md`).

## Quality

- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Tests unitarios: `pnpm test` (node:test sobre `lib/*.test.mjs`, sin base ni red)
- Tests E2E: `pnpm test:e2e` (Playwright, ver abajo)
- SEO del sitio público: `pnpm check:seo`

## Tests E2E

`pnpm test:e2e` levanta su propio `pnpm dev`, siembra la base de pruebas y corre
tres proyectos: `cliente`, `admin` y `anonimo` (los specs se reparten por el
sufijo del archivo: `*.cliente.spec.ts`, etc.). El login se hace una sola vez en
`e2e/global-setup.ts` y queda en `e2e/.estado/`, así que cada test arranca ya
logueado.

Antes de la primera corrida:

1. Crear la base local: `createdb molpo_soporte_test`.
2. Poner ese `DATABASE_URL` en `.env.local` (Playwright lo lee con
   `loadEnvFile`; el entorno gana si ya viene seteado, para CI).
3. Cerrar cualquier `pnpm dev` abierto. Playwright levanta el suyo con
   `reuseExistingServer: false` y `RESEND_API_KEY` vacía, porque los tests
   guardan respuestas y eso manda mail de verdad.

Cosas que conviene saber:

- La siembra **trunca** las tablas, y por eso exige que `DATABASE_URL` contenga
  `molpo_soporte_test`. Con cualquier otra base falla en vez de vaciarla.
- El esquema no se duplica en los tests: `e2e/sembrar.ts` le pega al app para
  que lo cree (`lib/db.ts` → `ensureSchema`) y recién después inserta filas.
- El área privada sólo se sirve en `app.molpo.ar`; en local ese host es
  `app.localhost:3000` y no hace falta tocar `/etc/hosts`.
- Si el setup dice "el servidor bajo prueba no ve la siembra", el dev server está
  apuntando a otra `DATABASE_URL`.

## Usage Notes

- Prefer project scripts from manifests (`package.json`, `Makefile`, etc.) over ad-hoc commands.
- If local environment overrides exist, apply `.ai/local/rules/*.md` after global rules.
