"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/tickets";
import { esNombreDuplicado, validateEmailCliente, validateNombreCliente } from "@/lib/clientes";
import { crearCliente, rotarToken, setClienteActivo } from "@/lib/clientes-db";

const NO_ENCONTRADO = "No se encontró ese cliente";

export async function crear(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const result = validateNombreCliente(formData.get("nombre"));
  if (!result.ok) {
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(result.error)}`);
  }

  const email = validateEmailCliente(formData.get("email"));
  if (!email.ok) {
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(email.error)}`);
  }

  try {
    await crearCliente(result.value, email.value);
  } catch (error) {
    // Sólo el choque contra el índice único es "nombre repetido"; el resto
    // (base caída, permisos) tiene que explotar en vez de disfrazarse.
    if (!esNombreDuplicado(error)) throw error;
    const mensaje = "Ya existe un cliente con ese nombre, revisá si está dado de baja más abajo";
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}

export async function rotar(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  // Un id vacío o inventado no puede terminar en un "Listo" que no pasó.
  const id = Number(formData.get("id"));
  const cliente = Number.isInteger(id) ? await rotarToken(id) : undefined;
  if (!cliente) {
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(NO_ENCONTRADO)}`);
  }

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}

export async function cambiarEstado(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "1";
  const cliente = Number.isInteger(id) ? await setClienteActivo(id, activo) : undefined;
  if (!cliente) {
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(NO_ENCONTRADO)}`);
  }

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}
