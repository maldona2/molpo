import "server-only";
import type postgres from "postgres";
import { sql } from "@/lib/db";
import { generarToken, type Cliente } from "@/lib/clientes";

const globalForSql = globalThis as unknown as { clientesReady?: Promise<void> };

async function db(): Promise<postgres.Sql> {
  const client = sql();
  globalForSql.clientesReady ??= (async () => {
    await client`
      create table if not exists clientes (
        id serial primary key,
        token text not null unique,
        nombre text not null,
        activo boolean not null default true,
        creado timestamptz not null default now()
      )
    `;
    // Un nombre repetido rompe el agrupado de tickets/feedback por cliente.
    await client`create unique index if not exists clientes_nombre_idx on clientes (lower(nombre))`;
  })();
  await globalForSql.clientesReady;
  return client;
}

export async function listClientes(): Promise<Cliente[]> {
  const client = await db();
  return client<Cliente[]>`select * from clientes order by creado desc`;
}

export async function crearCliente(nombre: string): Promise<Cliente> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    insert into clientes (token, nombre) values (${generarToken()}, ${nombre})
    returning *
  `;
  return cliente;
}

export async function rotarToken(id: number): Promise<Cliente | undefined> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    update clientes set token = ${generarToken()} where id = ${id} returning *
  `;
  return cliente;
}

export async function setClienteActivo(id: number, activo: boolean): Promise<Cliente | undefined> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    update clientes set activo = ${activo} where id = ${id} returning *
  `;
  return cliente;
}

/** Nombre del cliente dueño de ese token, o null si no existe o está dado de baja. */
export async function clienteDeToken(token: string): Promise<string | null> {
  const client = await db();
  const [row] = await client<{ nombre: string }[]>`
    select nombre from clientes where token = ${token} and activo limit 1
  `;
  return row?.nombre ?? null;
}

/** Token con el que ese cliente entra a su tablero, para armar el link del mail. */
export async function tokenDeCliente(nombre: string): Promise<string | null> {
  const client = await db();
  const [row] = await client<{ token: string }[]>`
    select token from clientes where lower(nombre) = lower(${nombre}) and activo limit 1
  `;
  return row?.token ?? null;
}
