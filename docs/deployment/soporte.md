# Módulo de soporte (tickets de clientes)

Cada cliente entra con un link propio, carga bugs/mejoras/consultas y ve el
estado de cada pedido. Sin login: el token del link es la credencial.

- Cliente: `https://molpo.ar/soporte/<TOKEN_CLIENTE>/`
- Admin: `https://molpo.ar/admin/soporte/<TOKEN_ADMIN>/`

Un token desconocido devuelve 404. `/soporte/`, `/feedback/` y `/admin/` están
fuera de robots.txt y con `noindex`.

## Variables de entorno

| Variable | Propósito | Ejemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Postgres donde viven los tickets | `postgres://user:pass@host:5432/railway` |
| `SOPORTE_CLIENTES` | Tokens habilitados y nombre del cliente | `a1b2c3:Acme SA,d4e5f6:Otro Cliente` |
| `SOPORTE_ADMIN_TOKEN` | Token del panel de administración | cadena larga y aleatoria |

Generar tokens con `openssl rand -hex 16`. Sumar un cliente es agregar una
entrada a `SOPORTE_CLIENTES` y redeploy; quitarle el acceso es borrar la
entrada. Los tickets ya cargados quedan en la base bajo el nombre del cliente.

## Base de datos

En Railway: agregar el plugin Postgres al proyecto y referenciar su
`DATABASE_URL` desde el servicio de la web. La tabla `tickets` se crea sola en
el primer uso (`create table if not exists`), no hay migraciones.

## Avisos por mail

Van por Resend, con el mismo remitente que el formulario de contacto:

- Ticket nuevo: aviso a `CONTACT_TO`.
- Cambio de estado: aviso al cliente, si dejó su email al cargar el pedido.
  Incluye la respuesta y el link a su tablero. Editar sólo la respuesta no
  dispara mail; hace falta que cambie el estado.

Sin `RESEND_API_KEY` todo se guarda igual: sólo no salen los avisos.

## Límites conocidos

- El link es la credencial: si el cliente lo reenvía, quien lo tenga entra.
  Para rotarlo, cambiar el token en `SOPORTE_CLIENTES`.
- Rate limit de 20 pedidos por hora por token, en memoria del proceso.
- Sin adjuntos ni hilo de comentarios: el ida y vuelta sigue por mail.
- El email del cliente se guarda por ticket, no por cliente: si no lo carga,
  no recibe avisos de ese pedido.

## Feedback de cierre

Mismo token, sin variables nuevas: al terminar una auditoría o un desarrollo el
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
