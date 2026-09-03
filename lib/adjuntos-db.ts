import "server-only";
import type postgres from "postgres";
import { ensureSchema, sql } from "@/lib/db";
import type { Adjunto } from "@/lib/adjuntos";

async function db(): Promise<postgres.Sql> {
  const client = sql();
  await ensureSchema("adjuntos", async () => {
    await client`
      create table if not exists adjuntos (
        id serial primary key,
        ticket_id integer not null references tickets (id) on delete cascade,
        nombre text not null,
        tipo text not null,
        bytes bytea not null,
        creado timestamptz not null default now()
      )
    `;
    await client`create index if not exists adjuntos_ticket_idx on adjuntos (ticket_id)`;
  });
  return client;
}

/** Sin la columna `bytes`: para listar en pantalla no hace falta traer la imagen. */
export type AdjuntoMeta = Omit<Adjunto, "bytes">;

export async function listAdjuntos(ticketIds: number[]): Promise<AdjuntoMeta[]> {
  if (ticketIds.length === 0) return [];
  const client = await db();
  return client<AdjuntoMeta[]>`
    select id, ticket_id, nombre, tipo, creado from adjuntos
    where ticket_id in ${client(ticketIds)}
    order by id
  `;
}

export async function createAdjunto(
  ticketId: number,
  nombre: string,
  tipo: string,
  bytes: Uint8Array,
): Promise<void> {
  const client = await db();
  await client`
    insert into adjuntos (ticket_id, nombre, tipo, bytes)
    values (${ticketId}, ${nombre}, ${tipo}, ${Buffer.from(bytes)})
  `;
}

/** El adjunto con sus bytes y el cliente dueño, para poder autorizar la descarga. */
export async function getAdjunto(
  id: number,
): Promise<{ nombre: string; tipo: string; bytes: Uint8Array; cliente: string } | undefined> {
  const client = await db();
  const [row] = await client<
    { nombre: string; tipo: string; bytes: Uint8Array; cliente: string }[]
  >`
    select a.nombre, a.tipo, a.bytes, t.cliente
    from adjuntos a join tickets t on t.id = a.ticket_id
    where a.id = ${id}
  `;
  return row;
}
