import "server-only";
import type postgres from "postgres";
import { ensureSchema } from "@/lib/db";
import { asegurarTickets } from "@/lib/tickets-db";
import { asegurarClientes } from "@/lib/clientes-db";
import { configDesdeEnv } from "@/lib/komuk-hub";
import { FUENTE, sincronizar, type RepoSync, type ResultadoSync, type TicketEspejo } from "@/lib/komuk-hub-sync";

export type EstadoSync = {
  fuente: string;
  last_synced_at: Date | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  actualizado: Date;
};

// Clave arbitraria y fija para pg_try_advisory_lock: un solo sync a la vez
// entre procesos (réplicas, el intervalo y el botón al mismo tiempo).
const LOCK_KOMUK = 704_512_001;

async function db() {
  await asegurarClientes();
  const client = await asegurarTickets();
  await ensureSchema("sync_estado", async () => {
    await client`
      create table if not exists sync_estado (
        fuente text primary key,
        last_synced_at timestamptz,
        last_status text,
        last_error text,
        actualizado timestamptz not null default now()
      )
    `;
  });
  return client;
}

function repoDe(client: postgres.Sql): RepoSync {
  return {
    async ultimoSync(fuente) {
      const [row] = await client<{ last_synced_at: Date | null }[]>`
        select last_synced_at from sync_estado where fuente = ${fuente}
      `;
      return row?.last_synced_at ?? null;
    },
    async clienteExiste(nombre) {
      const [row] = await client<{ nombre: string }[]>`
        select nombre from clientes where lower(nombre) = lower(${nombre}) limit 1
      `;
      return row?.nombre ?? null;
    },
    async upsert(fuente, cliente, t: TicketEspejo) {
      const filas = await client<{ creado: boolean }[]>`
        insert into tickets (cliente, tipo, prioridad, estado, titulo, detalle, url,
          external_source, external_id, external_url, external_updated_at, external_status)
        values (${cliente}, 'mejora', ${t.prioridad}, ${t.estado}, ${t.titulo}, ${t.detalle}, ${t.externalUrl},
          ${fuente}, ${t.externalId}, ${t.externalUrl}, ${t.externalUpdatedAt}, ${t.externalStatus})
        on conflict (external_source, external_id) do update set
          titulo = excluded.titulo,
          detalle = excluded.detalle,
          prioridad = excluded.prioridad,
          url = excluded.url,
          external_url = excluded.external_url,
          external_updated_at = excluded.external_updated_at,
          external_status = excluded.external_status,
          actualizado = now()
        where tickets.external_updated_at is distinct from excluded.external_updated_at
        returning (xmax = 0) as creado
      `;
      const fila = filas[0];
      if (!fila) return "sin_cambios";
      return fila.creado ? "creado" : "actualizado";
    },
    async marcarOk(fuente, at) {
      await client`
        insert into sync_estado (fuente, last_synced_at, last_status, last_error, actualizado)
        values (${fuente}, ${at}, 'ok', null, now())
        on conflict (fuente) do update set
          last_synced_at = excluded.last_synced_at,
          last_status = 'ok',
          last_error = null,
          actualizado = now()
      `;
    },
    async marcarError(fuente, msg) {
      const error = msg.slice(0, 1000);
      await client`
        insert into sync_estado (fuente, last_synced_at, last_status, last_error, actualizado)
        values (${fuente}, null, 'error', ${error}, now())
        on conflict (fuente) do update set
          last_status = 'error',
          last_error = excluded.last_error,
          actualizado = now()
      `;
    },
  };
}

export async function leerEstadoSync(fuente = FUENTE): Promise<EstadoSync | undefined> {
  const client = await db();
  const [row] = await client<EstadoSync[]>`select * from sync_estado where fuente = ${fuente}`;
  return row;
}

export async function correrSyncKomuk(): Promise<ResultadoSync | { ok: false; error: string; ocupado: true }> {
  const client = await db();
  const repo = repoDe(client);
  let cfg;
  try {
    cfg = configDesdeEnv();
  } catch (e) {
    const error = (e as Error).message;
    await repo.marcarError(FUENTE, error);
    return { ok: false as const, error };
  }
  // reserve(): el advisory lock es por conexión y el pool de postgres.js puede
  // usar otra para el unlock.
  const conn = await client.reserve();
  try {
    const [{ ok }] = await conn`select pg_try_advisory_lock(${LOCK_KOMUK}) as ok`;
    if (!ok) return { ok: false as const, error: "Ya hay un sync en curso", ocupado: true as const };
    try {
      const r = await sincronizar({ repo, cfg });
      if (r.ok) {
        console.info(`[komuk-hub] sync ok: ${r.creados} nuevos, ${r.actualizados} actualizados, ${r.sinCambios} sin cambios`);
      } else {
        console.error(`[komuk-hub] sync falló: ${r.error}`);
      }
      return r;
    } finally {
      await conn`select pg_advisory_unlock(${LOCK_KOMUK})`;
    }
  } finally {
    conn.release();
  }
}
