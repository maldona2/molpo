# app.molpo.ar — el área privada

Todo lo que no es el sitio público vive en `app.molpo.ar`: los pedidos de los
clientes, el tablero, la gestión de clientes y el feedback.

| URL | Quién entra |
|-----|-------------|
| `app.molpo.ar/entrar/` | cualquiera pide su link por email |
| `app.molpo.ar/tablero/` | cliente (sus pedidos) y admin (todos) |
| `app.molpo.ar/tablero/<id>/` | el detalle de un pedido: el cliente los suyos, el admin todos |
| `app.molpo.ar/pedidos/` | cliente: carga un pedido nuevo |
| `app.molpo.ar/opinar/` | cliente: deja feedback de cierre |
| `app.molpo.ar/clientes/` | admin: alta y baja de clientes |
| `app.molpo.ar/opiniones/` | admin: feedback recibido |

## Cómo se separan los dominios

Un solo servicio de Railway sirve los dos dominios y `middleware.ts` decide qué
se ve en cada uno: en `app.molpo.ar` sólo las rutas privadas, en `molpo.ar` sólo
el sitio público. Lo que no corresponde da 404, así cada página tiene una sola
URL.

A propósito **no hay rewrite de por medio**: las rutas privadas viven en la raíz
y el middleware sólo bloquea. Con un prefijo interno la URL del navegador y la
ruta real no coinciden, y el router de cliente de Next tira 404 después de cada
redirect de un server action.

El chrome de marketing (Google Analytics, banner de cookies, JSON-LD) vive en
`app/(sitio)/layout.tsx`, no en el layout raíz. Antes estaba en la raíz y el
cliente veía el cartel de cookies encima del formulario de soporte. Mantener el
layout raíz sin `headers()` ni `cookies()` es lo que deja que las páginas de
marketing sigan siendo estáticas.

## Cómo entra la gente

Sin contraseñas. Se pide el email en `/entrar/`, llega un link, y al abrirlo
queda una cookie de sesión.

- El link vale **15 minutos y un solo uso**. El `usado_en is null` va dentro del
  `update`, así que dos requests simultáneos no lo usan dos veces: el empate lo
  resuelve la base.
- En la base se guarda el **hash** del token, nunca el token. Un dump de
  `sesiones` o `accesos` no sirve para hacerse pasar por nadie.
- La cookie es `httpOnly`, `Secure` en producción, `SameSite=lax`, 90 días.
- La respuesta de `/entrar/` es idéntica exista o no el email: si no, el
  formulario sirve para averiguar quiénes son clientes. Un envío fallido queda
  sólo en los logs.
- Quién es admin sale de `ADMIN_EMAILS`, no de la base: no se puede escalar
  privilegios escribiendo una fila.
- Dar de baja a un cliente corta sus sesiones abiertas en el acto. "Cerrar sus
  sesiones" en `/clientes/` lo echa de todos los dispositivos sin darlo de baja.

## Tablero

Columnas = los estados de siempre: Abierto, En curso, Resuelto, Cerrado.

- **Admin**: en cada tarjeta hay un select de estado. Al cambiarlo se mueve el
  pedido y manda el mismo aviso por mail de siempre. Filtro por cliente.
- **Cliente**: ve el tablero y entra al detalle; no cambia estados.

## Detalle del pedido

El título de cada tarjeta es un link a `/tablero/<id>/`: ahí está el pedido
entero, que en la tarjeta no entra. Detalle completo con sus saltos de línea,
pantalla o URL, quién lo reporta, cuándo se creó y cuándo fue la última novedad,
todas las capturas en miniatura y la respuesta del admin si ya la escribió.

- **Quién lo ve**: el admin todos, el cliente sólo los suyos. Un pedido ajeno da
  el mismo 404 que uno inexistente, igual que en `/adjuntos/<id>/`. Las dos
  rutas usan la misma función (`puedeVerTicket` en `lib/tickets.ts`): una sola
  regla de autorización, no dos que se van separando con el tiempo.
- **El admin gestiona desde acá**: cambia el estado y escribe la respuesta para
  el cliente en el mismo form, con un solo "Guardar y avisar". El select de
  la tarjeta usa la misma acción; cuando manda sólo el estado, la
  respuesta ya escrita queda intacta.
- **El mail dice la verdad**: si cambió el estado, "tu pedido está Resuelto"; si
  el admin sólo contestó, "novedad en tu pedido". El botón del mail va al pedido,
  no al tablero. Borrar una respuesta sin tocar el estado se guarda pero no manda
  mail: no hay novedad que contar.
- **Dos pestañas abiertas**: el form manda con qué respuesta se pintó. Si mientras
  tanto cambió, en vez de pisarla redirige con `?conflicto=1` y muestra la que
  quedó guardada. Se pierde un click, no lo que escribió el otro.
- **Resolver con Grok** (admin): un botón en el detalle manda el ticket a un
  helper local (`127.0.0.1:47821`) que abre Terminal en el repo del cliente.
  El cwd no viaja por la red: vive en `~/.molpo/proyectos.json` y la primera
  vez macOS pregunta la carpeta. El ticket no cambia de estado. Instalación:
  `pnpm resolver:install` en la Mac. Si el helper no está, el botón deja copiar
  el prompt.
- Un id que no es un id (`abc`, `1e3`, mayor a int4) da 404 antes de tocar la
  base: un número fuera de rango haría explotar la consulta en vez de no
  encontrar nada.

## Variables de entorno

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Postgres con todo: clientes, tickets, adjuntos, feedback, sesiones |
| `ADMIN_EMAILS` | Emails con acceso de admin, separados por coma |
| `APP_URL` | URL pública del subdominio, para los links de los mails |
| `RESEND_API_KEY` | Sin esto no salen los mails, pero todo lo demás anda |

## Puesta en marcha

1. En Railway, agregar `app.molpo.ar` como dominio del mismo servicio.
2. En el DNS, un CNAME de `app` al destino que indique Railway.
3. Cargar `ADMIN_EMAILS` con tu email y `APP_URL` con `https://app.molpo.ar`.
4. Entrar a `app.molpo.ar/entrar/`, pedir el link con tu email y dar de alta al
   primer cliente desde `/clientes/`.

Las tablas se crean solas en el primer uso. Las que tienen clave foránea esperan
a su dependencia: `sesiones` y `accesos` a `clientes`, `adjuntos` a `tickets`.
Sin eso el primer request contra una base vacía falla.

## Pedidos

Tipos (bug / mejora / consulta), prioridad y estado. El cliente los carga en
`/pedidos/` y los ve en su tablero.

- Ticket nuevo: aviso a `CONTACT_TO`.
- Cambio de estado o respuesta nueva: aviso al cliente, si dejó un email en ese
  pedido (ver "Detalle del pedido"). El email
  se guarda **por ticket**, no por cliente: si no lo carga, no recibe avisos de
  ese pedido.
- Rate limit de 20 pedidos por hora por cliente, en memoria del proceso.
- Nombre de cliente único sin importar mayúsculas: los tickets se agrupan por
  nombre, así que uno repetido mezclaría dos clientes.

## Capturas de pantalla

Hasta 3 imágenes por pedido, de 3 MB cada una.

- Van en la tabla `adjuntos`, en una columna `bytea`. Sin servicio de storage
  aparte: a este volumen la base alcanza, y borrar el ticket borra sus imágenes
  (`on delete cascade`). El día que pese, migrar a object storage.
- **El tipo se deduce de los primeros bytes, no del `Content-Type`**: un HTML
  renombrado a `.png` llega diciendo `image/png`, y servirlo como HTML desde
  nuestro dominio sería un XSS. Sólo entran PNG, JPG, GIF y WebP, y la ruta que
  las sirve vuelve a chequear la firma antes de responder.
- Se sirven desde `/adjuntos/<id>/`, que autoriza por la sesión: el cliente sólo
  ve las de sus propios tickets, el admin todas. Un adjunto ajeno da el mismo
  404 que uno inexistente.
- `serverActions.bodySizeLimit` está en 12 MB en `next.config.ts`: el default de
  Next es 1 MB y no alcanza para tres capturas.

## Feedback de cierre

Al terminar una auditoría o un desarrollo el cliente califica el trabajo en
`/opinar/`; las respuestas se ven en `/opiniones/` con el promedio de puntaje y
de recomendación.

- El checkbox "autorizo a publicar" marca cuáles se pueden usar como testimonio;
  sin esa marca el comentario queda para uso interno.
- Cada respuesta avisa a `CONTACT_TO`, con `reply-to` al cliente si dejó email.
- Rate limit de 10 respuestas por hora por cliente.
- Nada impide responder dos veces: se guardan las dos, ordenadas por fecha.

## Límite conocido

El rate limit vive en memoria del proceso: se reinicia con cada deploy y no se
comparte entre instancias. Alcanza para frenar un bot torpe, no para un ataque
con ganas.
