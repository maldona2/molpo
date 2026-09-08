import "server-only";
import type postgres from "postgres";
import { ensureSchema, sql } from "@/lib/db";
import type { Estado, Ticket, TicketInput } from "@/lib/tickets";

/** `adjuntos` tiene FK a `tickets`: primero tiene que existir esta. */
export async function asegurarTickets(): Promise<postgres.Sql> {
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
    // El cliente ordena su columna de abiertos: `orden` guarda esa prioridad.
    await client`alter table tickets add column if not exists orden integer not null default 0`;
    await client`create index if not exists tickets_cliente_idx on tickets (cliente, creado desc)`;
  });
  return client;
}

const db = asegurarTickets;

export async function listTickets(cliente?: string): Promise<Ticket[]> {
  const client = await db();
  // `orden` manda y la fecha desempata: un ticket recién creado queda arriba
  // hasta que alguien lo reordene a mano.
  const rows = cliente
    ? await client<Ticket[]>`
        select * from tickets where cliente = ${cliente}
        order by orden asc, creado desc
      `
    : await client<Ticket[]>`select * from tickets order by orden asc, creado desc limit 500`;
  return rows;
}

/** Un ticket por id, sin filtrar por cliente: quién puede verlo lo decide la página. */
export async function getTicket(id: number): Promise<Ticket | undefined> {
  const client = await db();
  const [ticket] = await client<Ticket[]>`select * from tickets where id = ${id}`;
  return ticket;
}

/**
 * Reescribe el orden de una columna entera. A esta escala son decenas de filas,
 * así que reescribir todo evita el enredo del ranking fraccionario y de tener
 * que renormalizar cuando se acaban los decimales entre dos vecinos.
 */
export async function reordenarColumna(cliente: string, estado: Estado, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await db();
  await client.begin(async (tx) => {
    for (const [posicion, id] of ids.entries()) {
      // El cliente y el estado van en el where: un id de otro cliente no entra
      // aunque venga en el pedido.
      await tx`
        update tickets set orden = ${posicion}
        where id = ${id} and cliente = ${cliente} and estado = ${estado}
      `;
    }
  });
}

/** Ids de una columna, en su orden actual. Base para validar lo que llega del drag. */
export async function idsDeColumna(cliente: string, estado: Estado): Promise<number[]> {
  const client = await db();
  const rows = await client<{ id: number }[]>`
    select id from tickets where cliente = ${cliente} and estado = ${estado}
    order by orden asc, creado desc
  `;
  return rows.map((r) => r.id);
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
