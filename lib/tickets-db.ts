import "server-only";
import type postgres from "postgres";
import { ensureSchema, sql } from "@/lib/db";
import type { Estado, Ticket, TicketInput } from "@/lib/tickets";

async function db(): Promise<postgres.Sql> {
  const client = sql();
  await ensureSchema("tickets", async () => {
    await client`
      create table if not exists tickets (
        id serial primary key,
        cliente text not null,
        tipo text not null,
        prioridad text not null,
        estado text not null default 'abierto',
        titulo text not null,
        detalle text not null,
        url text,
        reporta text,
        email text,
        respuesta text,
        creado timestamptz not null default now(),
        actualizado timestamptz not null default now()
      )
    `;
    // Bases creadas antes de la notificación al cliente no tienen la columna.
    await client`alter table tickets add column if not exists email text`;
    await client`create index if not exists tickets_cliente_idx on tickets (cliente, creado desc)`;
  });
  return client;
}

export async function listTickets(cliente?: string): Promise<Ticket[]> {
  const client = await db();
  const rows = cliente
    ? await client<Ticket[]>`select * from tickets where cliente = ${cliente} order by creado desc`
    : await client<Ticket[]>`select * from tickets order by creado desc limit 500`;
  return rows;
}

export async function createTicket(cliente: string, input: TicketInput): Promise<Ticket> {
  const client = await db();
  const [ticket] = await client<Ticket[]>`
    insert into tickets ${client({
      cliente,
      tipo: input.tipo,
      prioridad: input.prioridad,
      titulo: input.titulo,
      detalle: input.detalle,
      url: input.url ?? null,
      reporta: input.reporta ?? null,
      email: input.email ?? null,
    })}
    returning *
  `;
  return ticket;
}

export async function updateTicket(
  id: number,
  estado: Estado,
  respuesta: string | null,
): Promise<Ticket | undefined> {
  const client = await db();
  const [ticket] = await client<Ticket[]>`
    update tickets
    set estado = ${estado}, respuesta = ${respuesta}, actualizado = now()
    where id = ${id}
    returning *
  `;
  return ticket;
}
