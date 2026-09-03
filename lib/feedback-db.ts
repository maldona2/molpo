import "server-only";
import type postgres from "postgres";
import { sql } from "@/lib/db";
import type { Feedback, FeedbackInput } from "@/lib/feedback";

const globalForSql = globalThis as unknown as { feedbackReady?: Promise<void> };

async function db(): Promise<postgres.Sql> {
  const client = sql();
  globalForSql.feedbackReady ??= (async () => {
    await client`
      create table if not exists feedback (
        id serial primary key,
        cliente text not null,
        trabajo text not null,
        puntaje smallint not null,
        recomienda smallint not null,
        destacado text,
        mejorar text,
        comentario text not null,
        nombre text,
        email text,
        publicar boolean not null default false,
        creado timestamptz not null default now()
      )
    `;
    await client`create index if not exists feedback_cliente_idx on feedback (cliente, creado desc)`;
  })();
  await globalForSql.feedbackReady;
  return client;
}

export async function listFeedback(cliente?: string): Promise<Feedback[]> {
  const client = await db();
  return cliente
    ? await client<Feedback[]>`select * from feedback where cliente = ${cliente} order by creado desc`
    : await client<Feedback[]>`select * from feedback order by creado desc limit 500`;
}

export async function createFeedback(cliente: string, input: FeedbackInput): Promise<Feedback> {
  const client = await db();
  const [feedback] = await client<Feedback[]>`
    insert into feedback ${client({
      cliente,
      trabajo: input.trabajo,
      puntaje: input.puntaje,
      recomienda: input.recomienda,
      destacado: input.destacado ?? null,
      mejorar: input.mejorar ?? null,
      comentario: input.comentario,
      nombre: input.nombre ?? null,
      email: input.email ?? null,
      publicar: input.publicar,
    })}
    returning *
  `;
  return feedback;
}
