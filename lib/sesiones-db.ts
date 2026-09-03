import "server-only";
import type postgres from "postgres";
import { ensureSchema } from "@/lib/db";
import { asegurarClientes } from "@/lib/clientes-db";
import {
  DIAS_SESION,
  MINUTOS_ACCESO,
  generarTokenAcceso,
  hashToken,
  venceEn,
  type Rol,
} from "@/lib/sesiones";

async function db(): Promise<postgres.Sql> {
  // Las dos tablas apuntan a `clientes` por clave foránea: sin ella, el
  // `create table` falla en el primer request contra una base vacía.
  const client = await asegurarClientes();
  await ensureSchema("sesiones", async () => {
    // Links de un solo uso que se mandan por mail.
    await client`
      create table if not exists accesos (
        id serial primary key,
        token_hash text not null unique,
        email text not null,
        rol text not null,
        cliente_id integer references clientes (id) on delete cascade,
        expira timestamptz not null,
        usado_en timestamptz,
        creado timestamptz not null default now()
      )
    `;
    // Sesiones vivas: una fila por dispositivo, para poder cerrarlas.
    await client`
      create table if not exists sesiones (
        id serial primary key,
        token_hash text not null unique,
        rol text not null,
        cliente_id integer references clientes (id) on delete cascade,
        expira timestamptz not null,
        creado timestamptz not null default now(),
        ultimo_uso timestamptz not null default now()
      )
    `;
  });
  return client;
}

/** Crea el link de un solo uso y devuelve el token en claro, que sólo viaja al mail. */
export async function crearAcceso(
  email: string,
  rol: Rol,
  clienteId: number | null,
): Promise<string> {
  const client = await db();
  const token = generarTokenAcceso();
  await client`
    insert into accesos (token_hash, email, rol, cliente_id, expira)
    values (${hashToken(token)}, ${email}, ${rol}, ${clienteId}, ${venceEn(MINUTOS_ACCESO)})
  `;
  return token;
}

/**
 * Consume el link: lo marca usado y devuelve a quién corresponde. El `usado_en
 * is null` dentro del update es lo que lo hace de un solo uso aunque entren dos
 * requests a la vez; la base resuelve el empate, no nosotros.
 */
export async function consumirAcceso(
  token: string,
): Promise<{ rol: Rol; cliente_id: number | null } | undefined> {
  const client = await db();
  const [acceso] = await client<{ rol: Rol; cliente_id: number | null }[]>`
    update accesos set usado_en = now()
    where token_hash = ${hashToken(token)} and usado_en is null and expira > now()
    returning rol, cliente_id
  `;
  return acceso;
}

/** Abre la sesión y devuelve el token en claro, que va a la cookie. */
export async function crearSesion(rol: Rol, clienteId: number | null): Promise<string> {
  const client = await db();
  const token = generarTokenAcceso();
  await client`
    insert into sesiones (token_hash, rol, cliente_id, expira)
    values (${hashToken(token)}, ${rol}, ${clienteId}, ${venceEn(DIAS_SESION * 24 * 60)})
  `;
  return token;
}

export type SesionViva = {
  rol: Rol;
  cliente_id: number | null;
  nombre: string | null;
};

/** La sesión de esa cookie, si sigue viva y el cliente sigue activo. */
export async function leerSesion(token: string): Promise<SesionViva | undefined> {
  const client = await db();
  const [sesion] = await client<SesionViva[]>`
    select s.rol, s.cliente_id, c.nombre
    from sesiones s left join clientes c on c.id = s.cliente_id
    where s.token_hash = ${hashToken(token)}
      and s.expira > now()
      -- Dar de baja al cliente corta sus sesiones abiertas en el acto.
      and (s.rol = 'admin' or c.activo)
  `;
  if (sesion) {
    await client`update sesiones set ultimo_uso = now() where token_hash = ${hashToken(token)}`;
  }
  return sesion;
}

export async function cerrarSesion(token: string): Promise<void> {
  const client = await db();
  await client`delete from sesiones where token_hash = ${hashToken(token)}`;
}

/** Limpia lo vencido. Se llama al abrir sesión: sin cron y sin tabla que crezca sola. */
export async function limpiarVencidos(): Promise<void> {
  const client = await db();
  await client`delete from accesos where expira < now() - interval '1 day'`;
  await client`delete from sesiones where expira < now()`;
}

/** Corta el acceso de un cliente en todos sus dispositivos, sin darlo de baja. */
export async function cerrarSesionesDeCliente(clienteId: number): Promise<void> {
  const client = await db();
  await client`delete from sesiones where cliente_id = ${clienteId}`;
  await client`delete from accesos where cliente_id = ${clienteId} and usado_en is null`;
}
