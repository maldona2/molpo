# Portfolio de casos (KOMUK, Decortinas, TR Fit) — Diseño

Fecha: 2026-07-21

## Objetivo

Agregar el portfolio de proyectos al sitio: páginas de caso completas para KOMUK,
Decortinas y TR Fit, conectadas desde la sección "Casos" del home.

## Decisiones

- **Rutas:** `/casos/komuk/`, `/casos/decortinas/`, `/casos/tr-fit/` mediante
  `app/casos/[slug]/page.tsx` con `generateStaticParams` (compatible con `output: "export"`).
- **Contenido:** estructurado en `content/portfolio.ts` (fuente única, mismo patrón que
  `content/data.ts`). Modelo simple de bloques: párrafos, listas, subsecciones, cita y
  grupos de stack. Se omiten las secciones meta de los borradores ("versión corta",
  "datos para completar", etc.); la versión corta se usa como copy de la card del home.
- **Layout:** estilo artículo reutilizando el patrón visual de `como-trabajamos`
  (hero con gradiente, prose 68ch, listas con bullet celeste, cita, CTA WhatsApp).
  Se agrega una "ficha" del proyecto (rol, tipo, industria, sitio) bajo el hero y
  chips de stack.
- **Home:** `Casos.tsx` pasa de 2 a 3 cards (KOMUK, Decortinas, TR Fit), cada una
  linkea a su página de caso. Variantes dark/light/dark. Copy desde `content/portfolio.ts`
  (se elimina el array `casos` viejo de `content/data.ts`).
- **SEO:** metadata + canonical + OpenGraph por página; sitemap suma las 3 URLs;
  JSON-LD `CreativeWork` + breadcrumb por caso.
- **Nav:** sin cambios ("Casos" sigue anclando a `/#casos`).

## Alternativas consideradas

1. Una sola página `/portfolio` con los 3 casos: más simple pero peor SEO y páginas
   larguísimas.
2. Una página JSX por caso (como `como-trabajamos`): control total pero triplica
   markup; el modelo de bloques mantiene consistencia con menos código.
3. **Elegida:** ruta dinámica + contenido estructurado.

## Alcance

Sin imágenes/screenshots por ahora (no hay assets). Sin cambios de nav ni footer.
