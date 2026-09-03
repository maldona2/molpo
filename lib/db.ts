import "server-only";
import postgres from "postgres";
import { crearMemo, type Once } from "@/lib/once";

// ponytail: conexión única compartida por los módulos que tocan Postgres.
// Cada módulo crea su tabla en el primer uso; si aparece un cuarto esquema,
// pasar a migraciones de verdad.
// En globalThis para sobrevivir al hot reload de dev sin abrir otra conexión.
const globalForSql = globalThis as unknown as { sql?: postgres.Sql; once?: Once };

export function sql(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL: el módulo de soporte necesita Postgres");
  globalForSql.sql ??= postgres(url, { ssl: "prefer" });
  return globalForSql.sql;
}

/**
 * Corre el `create table` de un módulo una sola vez por proceso. Si falla no
 * queda cacheado el error: el próximo request reintenta.
 */
export function ensureSchema(clave: string, crear: () => Promise<void>): Promise<void> {
  globalForSql.once ??= crearMemo();
  return globalForSql.once(clave, crear);
}
