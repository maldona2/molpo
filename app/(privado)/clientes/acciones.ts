"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { identidad } from "@/lib/auth";
import { esNombreDuplicado, validateEmailCliente, validateNombreCliente } from "@/lib/clientes";
import { crearCliente, setClienteActivo, setClienteEmail } from "@/lib/clientes-db";
import { cerrarSesionesDeCliente } from "@/lib/sesiones-db";

const NO_ENCONTRADO = "No se encontró ese cliente";

export async function crear(formData: FormData) {
  if ((await identidad())?.rol !== "admin") redirect("/entrar/");

  const result = validateNombreCliente(formData.get("nombre"));
  if (!result.ok) {
    redirect(`/clientes/?error=${encodeURIComponent(result.error)}`);
  }

  const email = validateEmailCliente(formData.get("email"));
  if (!email.ok) {
    redirect(`/clientes/?error=${encodeURIComponent(email.error)}`);
  }

  try {
    await crearCliente(result.value, email.value);
  } catch (error) {
    // Sólo el choque contra el índice único es "nombre repetido"; el resto
    // (base caída, permisos) tiene que explotar en vez de disfrazarse.
    if (!esNombreDuplicado(error)) throw error;
    const mensaje = "Ya existe un cliente con ese nombre, revisá si está dado de baja más abajo";
    redirect(`/clientes/?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/clientes");
  redirect("/clientes/?ok=1");
}

/** Echa al cliente de todos sus dispositivos. Reemplaza al viejo "rotar token". */
export async function cerrarSesiones(formData: FormData) {
  if ((await identidad())?.rol !== "admin") redirect("/entrar/");

  // Un id vacío o inventado no puede terminar en un "Listo" que no pasó.
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    redirect(`/clientes/?error=${encodeURIComponent(NO_ENCONTRADO)}`);
  }
  await cerrarSesionesDeCliente(id);

  revalidatePath("/clientes");
  redirect("/clientes/?ok=1");
}

export async function cambiarEstado(formData: FormData) {
  if ((await identidad())?.rol !== "admin") redirect("/entrar/");

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "1";
  const cliente = Number.isInteger(id) ? await setClienteActivo(id, activo) : undefined;
  if (!cliente) {
    redirect(`/clientes/?error=${encodeURIComponent(NO_ENCONTRADO)}`);
  }

  revalidatePath("/clientes");
  redirect("/clientes/?ok=1");
}

/**
 * Carga o cambia el email del cliente. Sin esto, un cliente dado de alta antes
 * de que existiera la columna no tiene forma de entrar: el login pide el email
 * y no hay ninguno que matchee.
 */
export async function guardarEmail(formData: FormData) {
  if ((await identidad())?.rol !== "admin") redirect("/entrar/");

  const id = Number(formData.get("id"));
  const email = validateEmailCliente(formData.get("email"));
  if (!email.ok) {
    redirect(`/clientes/?error=${encodeURIComponent(email.error)}`);
  }
  if (!Number.isInteger(id) || !(await setClienteEmail(id, email.value ?? null))) {
    redirect(`/clientes/?error=${encodeURIComponent(NO_ENCONTRADO)}`);
  }

  revalidatePath("/clientes");
  redirect("/clientes/?ok=1");
}
