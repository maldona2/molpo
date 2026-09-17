# agente.molpo.ar — app partner Tienda Nube

Mismo proyecto Railway **molpo.**, otro servicio. No mezclar el FastAPI en el Next.

| Servicio Railway | Repo | Host |
|------------------|------|------|
| `molpo` | `molpo` (Next) | `molpo.ar`, `app.molpo.ar` |
| `agente` | `panther` (FastAPI) | `agente.molpo.ar` |
| `Postgres` | plugin | tablero / pedidos de app.molpo.ar |
| Postgres + pgvector | proyecto viejo `panther-agente` (por ahora) | catálogo y embeddings del agente |

El Postgres del agente **no** es el del tablero. Hoy el servicio `agente` usa el pgvector de `panther-agente` por TCP público. Más adelante se puede crear un pgvector en este mismo proyecto y migrar.

## Cómo se despliega el agente

Desde el repo `panther` (ya linkeado al proyecto molpo. / servicio `agente`):

```bash
cd ../panther
railway up -s agente --ci
```

## Pendiente: marketplace (no es molpo.ar)

Hoy `agente.molpo.ar` quedó mal enganchado al servicio Next de molpo.ar (mismo frontend del portfolio). Eso hay que deshacerlo.

Lo que tiene que ser, más adelante:

- **molpo.ar** = estudio (portfolio, servicios, contacto).
- **app.molpo.ar** = tablero de pedidos de clientes de desarrollo.
- **agente.molpo.ar** = producto: un marketplace de agentes conectados a Tienda Nube.
  - Home: listado / conexión de tiendas (OAuth), no el hero de molpo.ar.
  - Cada tienda instalada: `/s/{slug}` con la cara de ese comercio.
  - Admin del merchant: sync, consultas, desconectar.
  - No reutilizar el layout del portfolio (Nav, Casos, Sobre mí).

Hasta que eso exista, el FastAPI en Railway (`panther-web`) es el runtime. El CNAME de `agente` tiene que apuntar a **ese** servicio, no al de `molpo`.

| Host | Qué es |
|------|--------|
| `molpo.ar` | Sitio público. Oferta: `/servicios/agente-tiendanube/` |
| `app.molpo.ar` | Área privada de clientes Molpo (tablero, pedidos) |
| `agente.molpo.ar` | App partner: OAuth, chat `/s/{slug}`, webhooks |

## DNS

En Cloudflare, CNAME:

```
agente  →  <dominio que dé Railway para panther-web>
```

Proxy opcional. Luego en Railway (servicio `panther-web`): custom domain `agente.molpo.ar`.

Variable `PUBLIC_BASE_URL=https://agente.molpo.ar`.

## URLs para el portal de socios (app 42310)

- Redirect: `https://agente.molpo.ar/tiendanube/oauth/callback`
- Panel: `https://agente.molpo.ar/tiendanube/admin`
- Preferencias: `https://agente.molpo.ar/tiendanube/preferencias`
- Privacidad: `https://agente.molpo.ar/privacidad`
- Soporte: `https://agente.molpo.ar/soporte`
- Store redact: `https://agente.molpo.ar/tiendanube/privacy/store-redact`
- Customer redact: `https://agente.molpo.ar/tiendanube/privacy/customer-redact`
- Customers data: `https://agente.molpo.ar/tiendanube/privacy/customers-data`
