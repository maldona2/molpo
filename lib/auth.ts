import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, type Identidad } from "@/lib/sesiones";
import { leerSesion } from "@/lib/sesiones-db";

/** Quién está mirando, o null si no hay sesión válida. */
export async function identidad(): Promise<Identidad | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;

  const sesion = await leerSesion(token);
  if (!sesion) return null;

  if (sesion.rol === "admin") return { rol: "admin" };
  if (!sesion.cliente_id || !sesion.nombre) return null;
  return { rol: "cliente", clienteId: sesion.cliente_id, nombre: sesion.nombre };
}

/** Para páginas que exigen sesión: si no hay, manda a pedir el link. */
export async function exigirIdentidad(): Promise<Identidad> {
  const quien = await identidad();
  if (!quien) redirect("/entrar/");
  return quien;
}

/** Para el panel: un cliente logueado no puede ver lo de admin. */
export async function exigirAdmin(): Promise<void> {
  const quien = await exigirIdentidad();
  if (quien.rol !== "admin") redirect("/");
}
