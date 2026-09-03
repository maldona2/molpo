# Módulo de soporte (tickets de clientes)

Cada cliente entra con un link propio, carga bugs/mejoras/consultas y ve el
estado de cada pedido. Sin login: el token del link es la credencial.

- Cliente: `https://molpo.ar/soporte/<TOKEN_CLIENTE>/`
- Cliente que perdió su link: `https://molpo.ar/soporte/` (pide el email y se lo reenvía)
- Admin: `https://molpo.ar/admin/soporte/<TOKEN_ADMIN>/`
- Gestión de clientes: `https://molpo.ar/admin/clientes/<TOKEN_ADMIN>/`

Un token desconocido devuelve 404. `/soporte/`, `/feedback/` y `/admin/` están
fuera de robots.txt y con `noindex`.

## Variables de entorno

| Variable | Propósito | Ejemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Postgres donde viven tickets, feedback y clientes | `postgres://user:pass@host:5432/railway` |
| `SOPORTE_ADMIN_TOKEN` | Token superadmin: entra a los tres paneles de `/admin/` | cadena larga y aleatoria |

Generar el token con `openssl rand -hex 16`. Los clientes (nombre, token de
acceso, activo/de baja) se administran desde `/admin/clientes/<TOKEN_ADMIN>/`,
no por variable de entorno: alta, rotar token y dar de baja son formularios en
esa página. Los tickets y el feedback ya cargados quedan en la base bajo el
nombre del cliente.

## Base de datos

En Railway: agregar el plugin Postgres al proyecto y referenciar su
`DATABASE_URL` desde el servicio de la web. Las tablas `clientes`, `tickets` y
`feedback` se crean solas en el primer uso (`create table if not exists`), no
hay migraciones.

## Avisos por mail

Van por Resend, con el mismo remitente que el formulario de contacto:

- Ticket nuevo: aviso a `CONTACT_TO`.
- Cambio de estado: aviso al cliente, si dejó su email al cargar el pedido.
  Incluye la respuesta y el link a su tablero. Editar sólo la respuesta no
  dispara mail; hace falta que cambie el estado.

Sin `RESEND_API_KEY` todo se guarda igual: sólo no salen los avisos.

## Límites conocidos

- El link es la credencial: si el cliente lo reenvía, quien lo tenga entra.
  Para rotarlo, usar "Rotar token" en `/admin/clientes/`.
- El cliente que pierde el link lo recupera en `/soporte/` con su email, si se lo
  cargaste en el alta. La respuesta es siempre la misma exista o no ese email,
  para que nadie averigüe quiénes son clientes probando direcciones; el envío
  fallido queda sólo en los logs.
- Nombre de cliente único (sin importar mayúsculas): crear uno repetido tira
  error, para no mezclar tickets bajo el mismo nombre.
- Rate limit de 20 pedidos por hora por token, en memoria del proceso.
- Sin adjuntos ni hilo de comentarios: el ida y vuelta sigue por mail.
- El email del cliente se guarda por ticket, no por cliente: si no lo carga,
  no recibe avisos de ese pedido.

## Feedback de cierre

Mismo token de cliente: al terminar una auditoría o un desarrollo el
cliente califica el trabajo en `https://molpo.ar/feedback/<TOKEN_CLIENTE>/` y
las respuestas se ven en `https://molpo.ar/admin/feedback/<TOKEN_ADMIN>/` con el
promedio de puntaje y de recomendación.

- Se guarda en la tabla `feedback`, que también se crea sola en el primer uso.
- Cada respuesta avisa a `CONTACT_TO` por mail, con `reply-to` al cliente si dejó
  su email.
- El checkbox "autorizo a publicar" marca cuáles se pueden usar como testimonio;
  sin esa marca el comentario queda para uso interno.
- El mail de ticket resuelto o cerrado incluye el link al feedback
  (`?trabajo=soporte` deja preseleccionado el tipo de trabajo).
- Rate limit de 10 respuestas por hora por token, en memoria del proceso.
- Nada impide que un cliente responda dos veces: se guardan las dos, ordenadas
  por fecha.

## Capturas de pantalla

El cliente puede adjuntar hasta 3 imágenes por pedido, de 3 MB cada una, que se
ven como miniaturas en su tablero y en el panel de admin.

- Van en la tabla `adjuntos`, en una columna `bytea`. Sin servicio de storage
  aparte: a este volumen la base alcanza, y borrar el ticket borra sus imágenes
  (`on delete cascade`). El día que pese, migrar a object storage.
- **El tipo se deduce de los primeros bytes, no del `Content-Type`**: un HTML
  renombrado a `.png` llega diciendo `image/png`, y servirlo como HTML desde
  nuestro dominio sería un XSS. Sólo entran PNG, JPG, GIF y WebP.
- Se sirven desde `/adjuntos/<token>/<id>/`, que valida que el token sea del
  cliente dueño del ticket (o el de admin). Un token ajeno da 404, igual que un
  adjunto inexistente.
- `serverActions.bodySizeLimit` está en 12 MB en `next.config.ts`: el default de
  Next es 1 MB y no alcanza para tres capturas.
