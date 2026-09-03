import "server-only";
import postgres from "postgres";

// ponytail: conexión única compartida por los módulos que tocan Postgres.
// Cada módulo crea su tabla en el primer uso; si aparece un tercer esquema,
// pasar a migraciones de verdad.
const globalForSql = globalThis as unknown as { sql?: postgres.Sql };

export function sql(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL: el módulo de soporte necesita Postgres");
  globalForSql.sql ??= postgres(url, { ssl: "prefer" });
  return globalForSql.sql;
}
