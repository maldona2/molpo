"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import {
  avisoDeTicket,
  avisoTrasMover,
  hayNovedad,
  hayQueAvisar,
  idDeTicket,
  normalizarRespuesta,
  parseEstado,
  urlTrasGuardar,
  type AvisoTablero,
} from "@/lib/tickets";
import { getTicket, updateTicket } from "@/lib/tickets-db";
import { correrSyncKomuk } from "@/lib/komuk-hub-db";

type Guardado =
  | { ok: true; cambio: boolean; mailEnviado: boolean; aviso: AvisoTablero | null }
  | { ok: false; motivo: "invalido" | "conflicto" };

/**
 * Guarda el estado y/o la respuesta de un ticket y le avisa al cliente. Lo
 * comparten el form del detalle y el tablero: cada uno decide a dónde ir
 * después, y cada uno chequea que quien llama sea admin.
 */
async function guardar(datos: {
  id: unknown;
  estado: unknown;
  respuesta: unknown;
  respuestaPrevia: unknown;
  avisar: boolean;
}): Promise<Guardado> {
  // idDeTicket y no Number: un id fuera de int4 es "no existe", no un 500 de postgres.
  const id = idDeTicket(String(datos.id));
  const estado = parseEstado(datos.estado);
  if (id === null || !estado) return { ok: false, motivo: "invalido" };

  const previo = await getTicket(id);
  if (!previo) return { ok: false, motivo: "invalido" };

  const respuesta = normalizarRespuesta(datos.respuesta, previo.respuesta);

  // Quien guarda una respuesta manda con cuál se pintó. Si mientras tanto
  // cambió (otra pestaña, el panel del tablero), guardar acá borraría eso sin
  // que nadie se entere: mejor avisar y perder un click.
  if (typeof datos.respuestaPrevia === "string" && datos.respuestaPrevia !== (previo.respuesta ?? "")) {
    revalidatePath("/tablero");
    return { ok: false, motivo: "conflicto" };
  }

  if (!hayNovedad(previo, estado, respuesta)) {
    return { ok: true, cambio: false, mailEnviado: false, aviso: null };
  }

  const ticket = await updateTicket(id, estado, respuesta);

  // El detalle puede guardar sólo una respuesta: el mail no puede decir que
  // el pedido "pasó" a un estado si el estado no cambió.
  const cambioEstado = previo.estado !== estado;
  let mailEnviado = false;
  if (datos.avisar && ticket?.email && hayQueAvisar(cambioEstado, respuesta)) {
    const envio = await sendMail({
      to: ticket.email,
      ...avisoDeTicket(ticket, estado, cambioEstado),
      // Al pedido, no al tablero: el mail habla de uno solo.
      button: {
        label: "Ver el pedido",
        href: `${process.env.APP_URL ?? "https://app.molpo.ar"}/tablero/${ticket.id}/`,
      },
    });
    mailEnviado = envio.ok;
  }

  revalidatePath("/tablero");
  revalidatePath(`/tablero/${id}`);
  return { ok: true, cambio: true, mailEnviado, aviso: avisoTrasMover(previo.estado, estado, mailEnviado) };
}

/** El form de la página del pedido. Vuelve siempre al mismo pedido. Sólo admin. */
export async function moverTicket(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");

  const r = await guardar({
    id: formData.get("id"),
    estado: formData.get("estado"),
    respuesta: formData.get("respuesta"),
    respuestaPrevia: formData.get("respuestaPrevia"),
    avisar: true,
  });
  const id = idDeTicket(String(formData.get("id")));
  if (id === null || (!r.ok && r.motivo === "invalido")) redirect("/tablero/");
  if (!r.ok) redirect(`/tablero/${id}/?conflicto=1`);
  redirect(urlTrasGuardar(id, r.cambio, r.aviso));
}

/** Botón "Sincronizar" del tablero. Sólo admin: trae del Hub, nunca escribe en él. */
export async function sincronizarKomuk() {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");
  const r = await correrSyncKomuk();
  revalidatePath("/tablero");
  redirect(r.ok ? "/tablero/?sync=ok" : "/tablero/?sync=error");
}

export type ResultadoGuardar =
  | { ok: true; mailEnviado: boolean }
  | { ok: false; motivo: "invalido" | "conflicto" };

/**
 * El tablero mueve y responde sin salir de la página: devuelve en vez de
 * redirigir. `avisar: false` es para Deshacer: el cliente ya recibió un mail
 * y no le mandamos otro por un cambio que nunca quisimos hacer.
 */
export async function guardarTicket(datos: {
  id: number;
  estado: string;
  respuesta?: string;
  respuestaPrevia?: string;
  avisar?: boolean;
}): Promise<ResultadoGuardar> {
  const quien = await identidad();
  if (quien?.rol !== "admin") return { ok: false, motivo: "invalido" };
  // Una server action la puede llamar cualquiera con cualquier cosa: no confiar en la forma.
  const d = (typeof datos === "object" && datos !== null ? datos : {}) as Record<string, unknown>;
  const r = await guardar({
    id: d.id,
    estado: d.estado,
    respuesta: d.respuesta,
    respuestaPrevia: d.respuestaPrevia,
    avisar: d.avisar !== false,
  });
  return r.ok ? { ok: true, mailEnviado: r.mailEnviado } : r;
}
