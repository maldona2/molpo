"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/tickets";
import { validateNombreCliente } from "@/lib/clientes";
import { crearCliente, rotarToken, setClienteActivo } from "@/lib/clientes-db";

export async function crear(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const result = validateNombreCliente(formData.get("nombre"));
  if (!result.ok) {
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent(result.error)}`);
  }

  try {
    await crearCliente(result.value);
  } catch {
    // Único índice en lower(nombre): la causa casi segura es un nombre repetido.
    redirect(`/admin/clientes/${token}/?error=${encodeURIComponent("Ya existe un cliente con ese nombre")}`);
  }

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}

export async function rotar(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await rotarToken(id);

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}

export async function cambiarEstado(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "1";
  if (Number.isInteger(id)) await setClienteActivo(id, activo);

  revalidatePath(`/admin/clientes/${token}`);
  redirect(`/admin/clientes/${token}/?ok=1`);
}
