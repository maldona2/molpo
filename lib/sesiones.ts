// Login sin contraseña: el cliente pide un link por mail, lo abre una vez y
// queda con una cookie de sesión. Sin acceso a base: lo testeable vive acá, las
// consultas en lib/sesiones-db.ts.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE_SESION = "molpo_sesion";

/** El link del mail vive poco: es de un solo uso y viaja por un canal ajeno. */
export const MINUTOS_ACCESO = 15;
/** La sesión dura lo que un trimestre de trabajo, para no pedir login cada vez. */
export const DIAS_SESION = 90;

export type Rol = "cliente" | "admin";

export type Identidad =
  | { rol: "admin" }
  | { rol: "cliente"; clienteId: number; nombre: string };

export function generarTokenAcceso(): string {
  return randomBytes(32).toString("hex");
}

/**
 * En la base guardamos el hash, nunca el token. Si alguien se lleva un dump de
 * `sesiones` o `accesos` no puede hacerse pasar por nadie: sha256 alcanza
 * porque el token ya tiene 256 bits de entropía y no hay nada que adivinar.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparación sin fugas de tiempo, para los pocos casos que comparan en memoria. */
export function tokensIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function venceEn(minutos: number, desde: Date = new Date()): Date {
  return new Date(desde.getTime() + minutos * 60 * 1000);
}

export function vencido(expira: Date, ahora: Date = new Date()): boolean {
  return expira.getTime() <= ahora.getTime();
}

/**
 * Emails con acceso de admin, de ADMIN_EMAILS (`uno@x.com,otro@y.com`). Es el
 * único lugar donde se decide quién es admin: el rol no vive en la base, así
 * que no se puede escalar privilegios escribiendo una fila.
 */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  const emails = new Set<string>();
  for (const entrada of (raw ?? "").split(",")) {
    const email = entrada.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return emails;
}

export function esAdminEmail(email: string, raw: string | undefined): boolean {
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}
