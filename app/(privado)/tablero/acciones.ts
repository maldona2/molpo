"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import {
  parseEstado,
  hayNovedad,
  hayQueAvisar,
  normalizarRespuesta,
  avisoDeTicket,
} from "@/lib/tickets";
import { getTicket, updateTicket } from "@/lib/tickets-db";

/**
 * Guarda el estado y/o la respuesta de un ticket, y le avisa al cliente. La usan
 * los botones de estado de la tarjeta (que sólo mandan el estado) y el form del
 * detalle (que también contesta). Sólo admin: el cliente no decide qué está resuelto.
 */
export async function moverTicket(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");

  const id = Number(formData.get("id"));
  const estado = parseEstado(formData.get("estado"));
  if (!Number.isInteger(id) || !estado) redirect("/tablero/?error=1");

  const previo = await getTicket(id);
  if (!previo) redirect("/tablero/?error=1");

  const respuesta = normalizarRespuesta(formData.get("respuesta"), previo.respuesta);

  // El form del detalle manda con qué respuesta se pintó. Si mientras tanto
  // cambió (otra pestaña, o un guardado desde la tarjeta), guardar acá borraría
  // eso sin que nadie se entere: mejor mandar a recargar y perder un click.
  const alPintar = formData.get("respuestaPrevia");
  if (typeof alPintar === "string" && alPintar !== (previo.respuesta ?? "")) {
    redirect(`/tablero/${id}/?conflicto=1`);
  }

  if (!hayNovedad(previo, estado, respuesta)) redirect("/tablero/");

  const ticket = await updateTicket(id, estado, respuesta);

  // El detalle puede guardar sólo una respuesta: el mail no puede decir que
  // el pedido "pasó" a un estado si el estado no cambió.
  const cambioEstado = previo.estado !== estado;
  if (ticket?.email && hayQueAvisar(cambioEstado, respuesta)) {
    await sendMail({
      to: ticket.email,
      ...avisoDeTicket(ticket, estado, cambioEstado),
      // Al pedido, no al tablero: el mail habla de uno solo.
      button: {
        label: "Ver el pedido",
        href: `${process.env.APP_URL ?? "https://app.molpo.ar"}/tablero/${ticket.id}/`,
      },
    });
  }

  revalidatePath("/tablero");
  revalidatePath(`/tablero/${id}`);
  redirect("/tablero/");
}


