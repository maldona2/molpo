import "server-only";
import type postgres from "postgres";
import { ensureSchema, sql } from "@/lib/db";
import { generarToken, type Cliente } from "@/lib/clientes";

/** Otras tablas tienen FK a `clientes`: primero tiene que existir esta. */
export async function asegurarClientes(): Promise<postgres.Sql> {
  const client = sql();
  await ensureSchema("clientes", async () => {
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
    // Con el email el cliente pide su propio link desde /soporte/, sin depender
    // de que se haya guardado la URL con el token.
    await client`alter table clientes add column if not exists email text`;
  });
  return client;
}

const db = asegurarClientes;

export async function listClientes(): Promise<Cliente[]> {
  const client = await db();
  return client<Cliente[]>`select * from clientes order by creado desc`;
}

export async function crearCliente(nombre: string, email?: string): Promise<Cliente> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    insert into clientes (token, nombre, email)
    values (${generarToken()}, ${nombre}, ${email ?? null})
    returning *
  `;
  return cliente;
}

/**
 * Cliente activo con ese email, para reenviarle su link. Devuelve undefined sin
 * distinguir "no existe" de "está de baja": quien pregunta no tiene que poder
 * averiguar quiénes son clientes.
 */
export async function clientePorEmail(email: string): Promise<Cliente | undefined> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    select * from clientes where lower(email) = lower(${email}) and activo limit 1
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

/** Cambia el email con el que el cliente pide su link. `null` lo deja sin acceso. */
export async function setClienteEmail(
  id: number,
  email: string | null,
): Promise<Cliente | undefined> {
  const client = await db();
  const [cliente] = await client<Cliente[]>`
    update clientes set email = ${email} where id = ${id} returning *
  `;
  return cliente;
}
