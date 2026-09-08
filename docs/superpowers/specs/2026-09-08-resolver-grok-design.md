# Resolver un ticket con Grok — diseño

Fecha: 2026-09-08
Estado: aprobado (chat)

## Objetivo

Desde el detalle de un ticket, el admin toca **Resolver con Grok** y se abre
una sesión interactiva de Grok en el repo del cliente, con el ticket como
primer mensaje. El admin supervisa. El cliente no ve el botón. El ticket no
cambia de estado ni manda mail.

## Decisiones

| Decisión | Elección |
|---|---|
| Agente | Grok nomas (`grok --cwd <repo> "<prompt>"`) |
| Dónde corre | Mac del admin, no Railway |
| Mapa cliente → repo | `~/.molpo/proyectos.json`, local |
| Primera vez | `choose folder` de macOS |
| Estado del ticket | no se mueve |
| Capturas | URLs en el prompt (pueden pedir login) |
| Plataforma | macOS v1 |

## Arquitectura

El tablero vive en Railway; Grok, en la Mac. Un helper local (LaunchAgent)
escucha en `127.0.0.1:47821`. El browser le manda `{ cliente, prompt }`. La
ruta del repo **no viaja**: sale del mapa local o del folder picker.

### Piezas

1. `lib/resolver.ts` — `armarPrompt` (server) y `RESOLVER_URL`.
2. `components/ResolverConGrok.tsx` — botón admin, POST al helper.
3. `scripts/grok-resolver.mjs` — HTTP + mapa + Terminal.app.
4. `pnpm resolver:install` — copia el script a `~/.molpo/` y carga el LaunchAgent `ar.molpo.resolver`.

### Seguridad

- Bind `127.0.0.1` nomas.
- CORS y rechazo si el Origin no es `https://app.molpo.ar` o `http://app.localhost:3000`.
- El body no acepta `cwd` / `path` / `repo`.
- El prompt se escribe a un archivo; no se interpola en osascript.

### Prompt

Incluye tipo, prioridad, cliente, título, URL, quién reporta, detalle,
respuesta previa si hay, links de capturas y el link al ticket. No incluye
el email. Cierra pidiendo no hacer commit ni push.

### Si el helper no está

El botón avisa y deja copiar el prompt.
