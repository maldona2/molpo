// Validación y tipos de la gestión de clientes. Sin acceso a base: lo
// testeable vive acá, las consultas en lib/clientes-db.ts.
import { randomBytes } from "node:crypto";

export type Cliente = {
  id: number;
  token: string;
  nombre: string;
  email: string | null;
  activo: boolean;
  creado: Date;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const LIMITE_NOMBRE = 200;
const LIMITE_EMAIL = 320;

// Mismo criterio que el resto del sitio: algo@algo.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email opcional del cliente. `""` vale y significa "sin email". */
export function validateEmailCliente(input: unknown): Result<string | undefined> {
  if (input === null || input === undefined) return { ok: true, value: undefined };
  if (typeof input !== "string") return { ok: false, error: "Email inválido" };
  const email = input.trim();
  if (!email) return { ok: true, value: undefined };
  if (email.length > LIMITE_EMAIL) return { ok: false, error: "El email es demasiado largo" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };
  return { ok: true, value: email };
}

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

/**
 * `unique_violation` de Postgres: el nombre ya está tomado. Cualquier otro
 * error (base caída, permisos) no es esto y tiene que propagarse, si no el
 * panel avisa "nombre repetido" por algo que no tiene nada que ver.
 */
export function esNombreDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}
