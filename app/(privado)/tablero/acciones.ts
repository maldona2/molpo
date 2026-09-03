"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import { parseEstado, ETIQUETAS } from "@/lib/tickets";
import { idsDeColumna, listTickets, reordenarColumna, updateTicket } from "@/lib/tickets-db";
import { sanearOrden, COLUMNA_ORDENABLE } from "@/lib/tablero";

/** Cambia el estado de un ticket. Sólo admin: el cliente no decide qué está resuelto. */
export async function moverTicket(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "admin") redirect("/");

  const id = Number(formData.get("id"));
  const estado = parseEstado(formData.get("estado"));
  if (!Number.isInteger(id) || !estado) redirect("/tablero/?error=1");

  const previo = (await listTickets()).find((t) => t.id === id);
  if (!previo) redirect("/tablero/?error=1");
  if (previo.estado === estado) redirect("/tablero/");

  const ticket = await updateTicket(id, estado, previo.respuesta);

  // Mismo aviso que el panel viejo: mover la tarjeta es cambiar el estado.
  if (ticket?.email) {
    await sendMail({
      to: ticket.email,
      subject: `Tu pedido #${ticket.id} está ${ETIQUETAS[estado].toLowerCase()}: ${ticket.titulo}`,
      body: [
        `Hola${ticket.reporta ? ` ${ticket.reporta}` : ""},`,
        "",
        `El pedido #${ticket.id} "${ticket.titulo}" pasó a ${ETIQUETAS[estado]}.`,
        ticket.respuesta ? `\n${ticket.respuesta}` : null,
      ],
      button: { label: "Ver mis pedidos", href: `${process.env.APP_URL ?? "https://app.molpo.ar"}/tablero/` },
    });
  }

  revalidatePath("/tablero");
  redirect("/tablero/");
}

/**
 * Guarda el orden de la columna de abiertos del cliente: así dice qué le urge
 * sin escribir un mail. Sólo toca sus propios tickets.
 */
export async function reordenar(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "cliente") redirect("/");

  const pedidos = String(formData.get("orden") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  const reales = await idsDeColumna(quien.nombre, COLUMNA_ORDENABLE);
  await reordenarColumna(quien.nombre, COLUMNA_ORDENABLE, sanearOrden(pedidos, reales));

  revalidatePath("/tablero");
  redirect("/tablero/");
}
