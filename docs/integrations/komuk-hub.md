# Sync de solo lectura con el Hub de KOMUK

molpo trae los requerimientos del Hub como tickets espejo del cliente `KOMUK`
en `app.molpo.ar`. **Nunca escribe en el Hub**: el cliente HTTP sólo hace
`GET`. El token (`KOMUK_HUB_TOKEN`) no se loguea ni aparece en mensajes de
error ni en `last_error`.

## Variables

| Variable | Propósito |
|----------|-----------|
| `KOMUK_HUB_BASE_URL` | Origen del Hub, sin barra final |
| `KOMUK_HUB_TOKEN` | Bearer para la API externa |

Sin las dos, el sync programado no arranca (dev, e2e, previews). El botón
admin sí puede intentarlo y deja el error en `sync_estado`.

## Requisito

Tiene que existir el cliente `KOMUK` en `/clientes/` **antes** de sincronizar.
Si no está, el sync no llama al Hub y guarda un error claro.

## Cómo corre

Una vez al día a las **07:00 ART** vía `instrumentation.ts` (tick cada 15 min
que solo corre el sync en esa hora) y con el botón **Sincronizar ahora** del
tablero (sólo admin). Un `pg_try_advisory_lock` evita que dos procesos corran a
la vez.

El recorte es `updated_since = last_synced_at − 5 min` (o 1970 si nunca corrió).
El upsert es por `(external_source, external_id)`. Si `external_updated_at` no
cambió, el ticket queda "sin cambios".

## Qué pisa el sync y qué no

Pisa: título, detalle, prioridad, url, `external_url`, `external_updated_at`,
`external_status`.

Nunca toca: `estado` (el de trabajo en molpo), `respuesta`, `orden`, `tipo`,
`cliente`, `email`, `reporta`.

## Mapeo de status y prioridad

Se edita en `MAPEO` de `lib/komuk-hub-sync.ts`.

| Hub (status) | molpo |
|--------------|-------|
| `open`, `new`, `pending` | abierto |
| `in_progress`, `review`, `blocked` | en_curso |
| `done`, `resolved` | resuelto |
| `closed`, `cancelled`, `canceled` | cerrado |
| cualquier otro | abierto (y un `console.warn`) |

| Hub (priority) | molpo |
|----------------|-------|
| `low` | baja |
| `medium`, `normal` | media |
| `high`, `urgent`, `critical` | alta |
| cualquier otro | media (y un `console.warn`) |

## Errores

Si el Hub falla o hay un error inesperado, se guarda `sync_estado.last_error` y
**no** avanza `last_synced_at`. Los upserts que ya se hicieron quedan: el
próximo sync los ve como sin cambios.

Para ver el estado:

```sql
select * from sync_estado;
```
