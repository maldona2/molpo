// Validación y tipos de la gestión de clientes. Sin acceso a base: lo
// testeable vive acá, las consultas en lib/clientes-db.ts.
import { randomBytes } from "node:crypto";

export type Cliente = {
  id: number;
  token: string;
  nombre: string;
  activo: boolean;
  creado: Date;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const LIMITE_NOMBRE = 200;

/** Token de acceso a /soporte/<token>/ y /feedback/<token>/. */
export function generarToken(): string {
  return randomBytes(16).toString("hex");
}

export function validateNombreCliente(input: unknown): Result<string> {
  if (typeof input !== "string") return { ok: false, error: "Falta el nombre" };
  const nombre = input.trim();
  if (!nombre) return { ok: false, error: "Falta el nombre" };
  if (nombre.length > LIMITE_NOMBRE) return { ok: false, error: "Nombre demasiado largo" };
  return { ok: true, value: nombre };
}
