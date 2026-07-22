# Profesionalización de molpo.com.ar — plan de implementación

Fecha: 2026-07-22  
Estado: listo para ejecutar por entregas  
Dominio canónico decidido: `https://molpo.com.ar`

## Objetivo

Convertir la landing actual en un sistema comercial medible y confiable sin
rehacer la identidad visual ni comprometer el sitio publicado. El trabajo debe:

1. alinear todas las señales técnicas con `https://molpo.com.ar`;
2. permitir que Google rastree y mida correctamente las cinco páginas actuales;
3. medir contactos reales sin duplicar eventos ni cargar analítica sin consentimiento;
4. corregir los problemas verificables de accesibilidad y seguridad;
5. aumentar confianza y conversión con identidad profesional y evidencia aprobada;
6. ampliar el alcance SEO mediante páginas de servicio útiles, no páginas duplicadas.

## Resultado esperado

Al finalizar:

- ninguna URL pública, metadata, sitemap o dato estructurado apunta a `molpo.com`;
- `http://molpo.com.ar` y `https://www.molpo.com.ar` redirigen con 301 a
  `https://molpo.com.ar`;
- Search Console reconoce la propiedad de dominio y el sitemap contiene todas
  las URLs canónicas;
- GA4 registra un único evento por contacto, con método y ubicación;
- privacidad y consentimiento se pueden consultar y modificar;
- navegación, tema, footer y textos secundarios cumplen los criterios de
  contraste y tamaño definidos en este plan;
- cada caso publicado aporta evidencia visual o resultados aprobados;
- el sitio tiene una página específica por servicio, enlazada desde la home.

## Estado actual verificado

Verificación realizada el 2026-07-22 sobre el código local y el sitio publicado.

| Área | Estado actual | Riesgo |
|---|---|---|
| Dominio | `lib/site.ts` declara `https://www.molpo.com` | Crítico: canonical, OG, JSON-LD, sitemap y robots apuntan a otro dominio |
| Footer | Muestra y enlaza `www.molpo.com` | Crítico: el visitante sale hacia un dominio estacionado |
| Variante `www` argentina | `www.molpo.com.ar` no resuelve | Alto: no existe una ruta segura para esa variante |
| Search Console | No hay verificación HTML; tampoco se observó TXT público | Alto: no existe evidencia de monitoreo de indexación |
| Analytics | No hay Google tag ni eventos | Alto: no se conocen fuentes ni contactos atribuibles |
| Privacidad | No existe página ni control de consentimiento | Alto si se incorpora analítica |
| Accesibilidad | Botón de tema 38×38 px; dos colores de texto quedan bajo 4.5:1 | Medio |
| Seguridad HTTP | Sólo se observó `X-Content-Type-Options`; faltan HSTS y CSP | Medio |
| Casos | Tres casos de más de 1.000 palabras, sin modelo de imágenes, métricas o testimonios | Alto para conversión |
| Servicios | Sólo existen como cards en la home | Medio para posicionamiento por intención |
| Calidad | No hay tests; `package.json` no tiene `typecheck` ni una verificación SEO | Medio: el error de dominio puede reaparecer |
| Worktree | Hay cambios no confirmados en `Nav.tsx` y `Nav.module.css` | Deben preservarse y no mezclarse con el plan |

## Qué funciona bien y no debe rehacerse

- La identidad azul, Founders Grotesk, el hero y el tono directo.
- La home como composición general y el CTA principal por WhatsApp.
- El sistema de temas y la preferencia `prefers-reduced-motion`.
- Next.js App Router con exportación estática.
- La estructura central `site`, los builders JSON-LD y el contenido tipado de
  `content/portfolio.ts`.
- Los títulos, descripciones y H1 únicos de las cinco páginas actuales.
- Las rutas actuales de casos y metodología.
- Los cambios locales que eliminan la flecha del menú móvil.

## Insumos externos necesarios

Estos datos no deben inventarse. Su ausencia no bloquea la corrección del dominio.

| Insumo | Responsable | Bloquea |
|---|---|---|
| Acceso al DNS de `molpo.com.ar` | Matías | Redirección `www` y Search Console |
| Acceso al proyecto Railway | Matías | Redirecciones y headers de seguridad |
| Cuenta Google propietaria | Matías | Search Console y GA4 |
| ID de medición `G-...` | Matías, después de crear GA4 | Activación de Analytics |
| Dirección `@molpo.com.ar` elegida | Matías | Cambio de email público |
| URL de LinkedIn y foto profesional | Matías | Bloque de confianza |
| Capturas anonimizadas y permiso de clientes | Matías/clientes | Evidencia de casos |
| Métricas y testimonios verificables | Matías/clientes | Resultados cuantitativos |
| Revisión de privacidad aplicable | Matías/asesor | Texto legal y política final de consentimiento |

## Estrategia de entregas

No implementar todo en un único PR. Cada entrega debe poder desplegarse y
revertirse de forma independiente.

```text
PR 0 · preservar trabajo local
   |
   v
PR 1 · dominio canónico ──> deploy ──> DNS/www ──> Search Console
   |
   +──────────────> PR 2 · analítica + privacidad
   |
   +──────────────> PR 3 · accesibilidad + seguridad
   |
   +──────────────> PR 4 · confianza + conversión
                            |
                            v
                    PR 5 · evidencia en casos
                            |
                            v
                    PR 6 · páginas de servicio
                            |
                            v
                    auditoría final y baseline
```

La corrección del dominio va primero porque todas las demás mediciones y
publicaciones deben comenzar sobre URLs canónicas definitivas.

## PR 0 — preservar el estado actual

Prioridad: bloqueo previo  
Esfuerzo: 15–30 minutos

### Trabajo

1. Revisar los cambios existentes de navegación.
2. Confirmarlos en un commit independiente o guardarlos temporalmente antes de
   crear la rama de profesionalización.
3. No incluir `.local/` ni archivos internos de `.gstack` en commits del sitio.
4. Crear una rama con prefijo `codex/`, por ejemplo
   `codex/profesionalizacion-molpo`.

### Criterios de aceptación

1. El worktree de implementación empieza limpio.
2. La eliminación de las flechas móviles conserva autoría e historial propios.
3. Ningún commit del plan contiene capturas de auditoría ni tokens internos.

## PR 1 — dominio canónico y regresión SEO

Prioridad: P0 crítica  
Esfuerzo: 3–5 horas incluyendo deploy y validación

### Cambios de código

| Archivo | Cambio |
|---|---|
| `lib/site.ts` | Cambiar `url` y `contact.web` a `https://molpo.com.ar`; agregar `contact.webDisplay: "molpo.com.ar"` |
| `components/Footer.tsx` | Renderizar `site.contact.webDisplay`; eliminar el texto hardcodeado `www.molpo.com` |
| `public/llms.txt` | Reemplazar la web y las tres URLs de casos por `https://molpo.com.ar/...` |
| `package.json` | Agregar `typecheck` y `check:seo` |
| `scripts/check-seo.mjs` | Validar el contenido exportado después de `next build` |

No duplicar cambios en `layout.tsx`, `jsonld.ts`, `robots.ts` o `sitemap.ts`:
deben heredar el dominio corregido desde `site.url`.

### Verificación automatizada propuesta

`check:seo` debe fallar si, dentro de `out/`:

- aparece `www.molpo.com`;
- un canonical, `og:url` o URL de JSON-LD no comienza con
  `https://molpo.com.ar`;
- `robots.txt` referencia otro sitemap;
- `sitemap.xml` contiene una URL de otro host;
- falta alguna de las cinco rutas públicas actuales.

### Trabajo de infraestructura

1. Desplegar primero el código corregido sobre el dominio principal.
2. Incorporar `www.molpo.com.ar` como dominio válido en Railway.
3. Crear el registro DNS requerido para `www`.
4. Configurar una redirección permanente de `www` al dominio raíz.
5. Mantener la redirección HTTP → HTTPS existente.

### Criterios de aceptación

1. `rg "www\.molpo\.com" app components content lib public out` no encuentra resultados.
2. Las cinco páginas tienen canonical propio bajo `https://molpo.com.ar`.
3. `https://molpo.com.ar/robots.txt` referencia
   `https://molpo.com.ar/sitemap.xml`.
4. El sitemap contiene exactamente las cinco páginas públicas vigentes.
5. `curl -I http://molpo.com.ar/` devuelve 301 hacia HTTPS.
6. `curl -I https://www.molpo.com.ar/` devuelve 301 hacia
   `https://molpo.com.ar/`.
7. `pnpm build`, `pnpm typecheck` y `pnpm check:seo` terminan con código 0.

### Rollback

Revertir el PR y redeplegar el artefacto anterior. No revertir DNS de forma
automática: confirmar antes que la versión anterior siga resolviendo el host.

## Operación 1 — Search Console

Prioridad: P0 después del deploy de PR 1  
Esfuerzo activo: 30–60 minutos; propagación externa variable

### Pasos

1. Abrir Google Search Console con la cuenta propietaria.
2. Crear una propiedad de tipo **Dominio** con `molpo.com.ar`.
3. Agregar en DNS el TXT entregado por Google y conservarlo.
4. Verificar la propiedad.
5. Enviar `https://molpo.com.ar/sitemap.xml`.
6. Inspeccionar y solicitar indexación de la home, metodología y los tres casos.
7. Registrar la fecha de envío y una captura del estado inicial fuera del repo.

### Criterios de aceptación

1. La propiedad de dominio figura como verificada.
2. El sitemap figura como procesado sin error de host.
3. Search Console descubre las cinco URLs canónicas.
4. Ninguna URL `molpo.com` aparece como enviada por el sitemap.

La indexación efectiva no es un criterio inmediato: Google decide cuándo
rastrear e indexar. El plan sólo exige que las señales enviadas sean correctas.

## PR 2 — GA4, eventos y privacidad

Prioridad: P1 alta  
Esfuerzo: 1–2 días  
Dependencias: PR 1 desplegado, ID `G-...`, decisión de privacidad

### Decisión técnica

Usar el Google tag directamente, sin Google Tag Manager. Cargarlo únicamente si:

- existe `NEXT_PUBLIC_GA_MEASUREMENT_ID`; y
- el visitante aceptó analítica.

La opción conservadora es consentimiento denegado por defecto. No incorporar
publicidad, remarketing ni otros tags en esta entrega.

### Cambios de código

| Archivo | Cambio |
|---|---|
| `components/Analytics.tsx` | Cargar `gtag.js` de forma condicional y configurar GA4 |
| `components/ConsentBanner.tsx` | Aceptar/rechazar analítica con opciones equivalentes |
| `components/TrackedLink.tsx` | Enviar eventos tipados sin bloquear la navegación |
| `lib/analytics.ts` | Definir nombres y parámetros permitidos |
| `app/layout.tsx` | Montar analítica y consentimiento |
| `app/privacidad/page.tsx` | Explicar responsable, finalidades, proveedores, retención y derechos |
| `components/Footer.tsx` | Agregar enlaces a privacidad y preferencias |
| CTAs actuales | Reemplazar o envolver los enlaces de contacto con `TrackedLink` |
| `app/sitemap.ts` | Agregar `/privacidad/` si se decide indexarla |

### Eventos

| Evento | Parámetros | Disparo |
|---|---|---|
| `contact_click` | `method: whatsapp|email`, `placement` | Click humano en un CTA de contacto |
| `client_site_click` | `client`, `case_slug` | Salida desde una ficha de caso |
| `consent_update` | `analytics: granted|denied` | Cambio explícito de preferencia; sólo local si analítica está denegada |

`placement` debe usar un conjunto cerrado: `nav_desktop`, `nav_mobile`,
`hero`, `floating`, `methodology_inline`, `methodology_end`, `case_end`,
`final_cta`, `footer`.

No crear `case_view`: GA4 ya registra `page_view`. Marcar `contact_click` como
evento clave, entendiendo que es un proxy de consulta y no un lead confirmado.

### Criterios de aceptación

1. Sin consentimiento no se solicita `gtag/js` ni se escribe una cookie de GA.
2. Aceptar activa GA4 y persiste la elección.
3. Rechazar persiste la elección y no carga GA4.
4. El footer permite reabrir las preferencias.
5. Cada CTA emite exactamente un `contact_click` en GA DebugView.
6. Método y ubicación coinciden con el elemento clicado.
7. Sin ID de medición, el sitio funciona sin errores y sin requests a Google.
8. La política de privacidad es accesible con teclado y desde todas las páginas.

### Rollback

Desactivar el ID de medición en Railway. El sitio debe seguir funcionando sin
revertir el deploy. Si el consentimiento produce una regresión, revertir el PR;
la propiedad GA4 puede permanecer creada.

## PR 3 — accesibilidad y seguridad básica

Prioridad: P1 alta  
Esfuerzo: 1 día  
Dependencia: coordinar CSP con PR 2

### Accesibilidad

| Archivo | Cambio |
|---|---|
| `app/globals.css` | Ajustar `--texto-tenue` y `--texto-footer` en ambos temas |
| `components/ThemeToggle.module.css` | Llevar el objetivo táctil a 44×44 px |
| `components/Nav.module.css` | Garantizar 44 px para controles móviles y al menos 24 px con separación en desktop |
| `components/Footer.module.css` | Aumentar área interactiva sin romper composición |
| Componentes interactivos | Verificar `focus-visible`, nombre accesible y orden de tabulación |

Los valores de color definitivos se eligen con un medidor, no a ojo. Todo texto
normal debe alcanzar al menos 4.5:1 en light y dark.

### Seguridad en Railway/edge

1. Aplicar primero Content Security Policy en modo report-only.
2. Incluir únicamente los orígenes necesarios para fuentes propias, imágenes,
   GA4 y conexiones de medición.
3. Al estabilizarla, activar CSP con `frame-ancestors 'none'`.
4. Agregar `Referrer-Policy: strict-origin-when-cross-origin`.
5. Agregar una `Permissions-Policy` que deniegue cámara, micrófono y geolocalización.
6. Activar HSTS sólo después de confirmar HTTPS válido en el dominio raíz y `www`.

### Criterios de aceptación

1. Los contrastes auditados alcanzan al menos 4.5:1.
2. Menú, tema y CTAs se usan sólo con teclado.
3. No hay foco atrapado al abrir o cerrar el menú móvil.
4. Los controles principales en móvil miden al menos 44×44 px.
5. CSP report-only no registra bloqueos legítimos durante navegación y contacto.
6. Tras activarla, los headers se observan con `curl -I`.
7. Home, metodología, casos, tema oscuro y consentimiento no muestran errores de consola.

### Rollback

Retirar primero CSP/HSTS desde el edge si bloquean recursos. Los cambios CSS se
pueden revertir por PR sin afectar contenido o indexación.

## PR 4 — confianza y conversión

Prioridad: P1 alta  
Esfuerzo de código: 4–8 horas  
Dependencias: email, foto y LinkedIn entregados por Matías

### Cambios

1. Cambiar el email público por una cuenta real `@molpo.com.ar` y verificar
   envío/recepción antes del deploy.
2. Reemplazar el símbolo del bloque “Sobre mí” por una foto optimizada, conservando
   el símbolo como recurso de marca secundario.
3. Agregar LinkedIn y una explicación explícita del modelo de estudio unipersonal.
4. Añadir una promesa de respuesta solamente si puede cumplirse, por ejemplo
   “Respondo dentro de un día hábil”.
5. Incorporar una franja de prueba bajo el hero con datos verificables, no
   aspiracionales.
6. Extender JSON-LD con `sameAs` sólo para perfiles públicos reales.

### Criterios de aceptación

1. No aparece `@gmail.com` en la interfaz, metadata o `llms.txt`.
2. El email corporativo recibe una prueba desde desktop y mobile.
3. La foto tiene dimensiones explícitas, formato optimizado y alt útil.
4. LinkedIn abre el perfil correcto.
5. Toda cifra pública tiene una fuente que Matías puede demostrar.
6. El CTA indica qué debe enviar el prospecto y qué ocurrirá después.

## PR 5 — casos orientados a evidencia

Prioridad: P2  
Esfuerzo: 2–4 días según disponibilidad de materiales  
Dependencia: aprobación de clientes

### Extensión del modelo

Agregar a `Proyecto` campos opcionales y tipados:

```ts
type Evidencia = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

type Metrica = {
  value: string;
  label: string;
  sourceNote?: string;
};

type Testimonio = {
  quote: string;
  name: string;
  role: string;
  company: string;
};
```

`Proyecto` recibe `evidencias`, `metricas` y `testimonio` como campos opcionales.
La página debe degradar correctamente si un cliente no autoriza alguno de ellos.

### Rediseño de lectura

Orden recomendado:

1. resumen del problema y resultado;
2. evidencia visual;
3. métricas o resultado cualitativo verificable;
4. desafío, solución y decisiones importantes;
5. testimonio;
6. detalle técnico y stack;
7. CTA relacionado con el problema del caso.

La información técnica extensa puede usar `<details>` nativo, siempre accesible
sin JavaScript. No eliminar contenido útil para SEO: mejorar jerarquía y
revelado progresivo.

### Criterios de aceptación

1. Cada captura está aprobada, anonimizada y tiene texto alternativo/caption.
2. Ninguna imagen revela clientes, precios, emails, teléfonos o credenciales.
3. Cada caso presenta al menos una evidencia visual aprobada.
4. Si no existen métricas cuantitativas, el resultado se declara cualitativo sin
   inventar porcentajes.
5. Las tres páginas siguen exportándose estáticamente.
6. Metadata, canonical, JSON-LD y breadcrumb permanecen correctos.
7. La lectura mobile no obliga a recorrer todo el detalle técnico antes de llegar
   al resultado y al CTA.

## PR 6 — páginas de servicio

Prioridad: P2  
Esfuerzo: 2–3 días  
Dependencias: PR 5 y primeras consultas de Search Console

### Rutas

- `/servicios/software-a-medida/`
- `/servicios/rescate-software-ia/`
- `/servicios/integracion-sistemas-datos/`

Cada página debe responder una intención distinta con contenido propio:

- problema y señales de que el servicio aplica;
- para quién es y para quién no;
- proceso y entregables;
- caso relacionado;
- preguntas comerciales reales;
- CTA específico.

Las cards de `Servicios` deben enlazar a estas páginas. No crear páginas
duplicadas por ciudad ni repetir el mismo copy cambiando “Tucumán”.

### Criterios de aceptación

1. Cada página tiene title, description, canonical y un solo H1 únicos.
2. Cada servicio enlaza al menos un caso y vuelve a la home.
3. Sitemap y navegación interna incluyen las tres rutas.
4. Las preguntas frecuentes son visibles; no añadir schema FAQ si el contenido
   o las guías de Google no lo justifican.
5. `check:seo` incluye las nuevas rutas esperadas.
6. No existe contenido casi duplicado entre servicios.

## Auditoría final y baseline

Prioridad: cierre obligatorio  
Esfuerzo: 4–6 horas más espera de datos de campo

### Matriz de verificación

| Capa | Verificación |
|---|---|
| Build | `pnpm build`, `pnpm typecheck`, `pnpm check:seo` |
| Dominio | Redirects HTTP/HTTPS/www, canonical, sitemap, robots, OG y JSON-LD |
| Visual | 375×812, 768×1024 y 1280×720; light/dark; menú abierto/cerrado |
| Accesibilidad | Teclado, foco, contraste, objetivos táctiles y reduced motion |
| Analytics | Consentimiento aceptado/rechazado, DebugView y no duplicación |
| Seguridad | Headers, CSP y ausencia de errores de consola/red |
| Search Console | Sitemap procesado y páginas descubiertas |
| Conversión | WhatsApp, email, LinkedIn, casos y CTAs finales |

### Baseline mensual

Registrar, sin instalar herramientas pagas todavía:

- impresiones y clics orgánicos;
- CTR por consulta y página;
- contactos por método y ubicación;
- consultas calificadas registradas manualmente;
- propuestas enviadas y proyectos ganados;
- Core Web Vitals cuando Search Console tenga datos suficientes.

Un clic de WhatsApp no equivale a un lead. Mantener una planilla o CRM mínimo
que relacione fuente, consulta, calificación, propuesta y resultado comercial.

## Definición de terminado

1. Todos los criterios de PR 1–6 aplicables están verificados.
2. No quedan referencias públicas a `molpo.com` ni a Gmail.
3. El dominio raíz es la única URL canónica y todas sus variantes redirigen.
4. Search Console y GA4 usan el mismo host y las mismas páginas.
5. Analítica respeta la decisión del visitante y no duplica eventos.
6. Las cinco páginas originales y las nuevas páginas de servicio pasan build,
   navegación, responsive y accesibilidad.
7. Los casos no publican información sin permiso.
8. Se documenta el baseline inicial y la fecha del próximo control.

## Fuera de alcance

- Rediseño completo de marca o cambio de tipografías.
- CMS, blog semanal o internacionalización.
- Google Ads, Meta Pixel, remarketing o automatización comercial.
- Compra o recuperación de `molpo.com`.
- Creación de métricas, testimonios o logos sin autorización.
- Google Business Profile si Molpo no cumple el requisito de atención presencial.

## Orden sugerido en calendario

| Período | Entrega |
|---|---|
| Día 1 | PR 0 y PR 1 |
| Día 2 | Deploy, DNS y Search Console |
| Días 3–4 | PR 2 |
| Día 5 | PR 3 |
| Semana 2 | PR 4 y recolección de materiales |
| Semana 3 | PR 5 |
| Semana 4 | PR 6 y auditoría final |

El calendario asume que DNS, cuentas y materiales se entregan sin demoras. La
secuencia se mantiene aunque las fechas cambien.
