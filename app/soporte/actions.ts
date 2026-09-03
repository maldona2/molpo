"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/mail";
import { site } from "@/lib/site";
import { esAdmin, parseEstado, validateTicket, ETIQUETAS } from "@/lib/tickets";
import { createTicket, updateTicket } from "@/lib/tickets-db";
import { clienteDeToken, tokenDeCliente } from "@/lib/clientes-db";
import { createAdjunto } from "@/lib/adjuntos-db";
import { validarAdjunto, MAX_POR_TICKET } from "@/lib/adjuntos";

// ponytail: rate limit in-memory por token, mismo criterio que /api/contact.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(token: string): boolean {
  const now = Date.now();
  const recent = (hits.get(token) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(token, recent);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  return false;
}

type Captura = { nombre: string; tipo: string; bytes: Uint8Array };

/** Lee las capturas del form y las valida por contenido, no por su Content-Type. */
async function leerCapturas(
  formData: FormData,
): Promise<{ ok: true; value: Captura[] } | { ok: false; error: string }> {
  const archivos = formData
    .getAll("capturas")
    .filter((entrada): entrada is File => entrada instanceof File && entrada.size > 0);

  if (archivos.length > MAX_POR_TICKET) {
    return { ok: false, error: `Podés adjuntar hasta ${MAX_POR_TICKET} capturas por pedido` };
  }

  const capturas: Captura[] = [];
  for (const archivo of archivos) {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const valido = validarAdjunto(archivo.name, bytes);
    if (!valido.ok) return { ok: false, error: valido.error };
    capturas.push({ ...valido.value, bytes });
  }
  return { ok: true, value: capturas };
}

export async function crearTicket(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const cliente = await clienteDeToken(token);
  if (!cliente) redirect("/soporte/invalido/");

  // Honeypot: oculto para humanos, los bots lo completan.
  if (formData.get("web")) redirect(`/soporte/${token}/?ok=1`);

  if (rateLimited(token)) {
    redirect(`/soporte/${token}/?error=${encodeURIComponent("Demasiados envíos, probá más tarde")}`);
  }

  const result = validateTicket(Object.fromEntries(formData.entries()));
  if (!result.ok) redirect(`/soporte/${token}/?error=${encodeURIComponent(result.error)}`);

  // Las capturas se validan antes de crear el ticket: si una no sirve, el
  // cliente corrige y reenvía sin que le quede un pedido a medias cargado.
  const capturas = await leerCapturas(formData);
  if (!capturas.ok) redirect(`/soporte/${token}/?error=${encodeURIComponent(capturas.error)}`);

  const ticket = await createTicket(cliente, result.value);
  for (const captura of capturas.value) {
    await createAdjunto(ticket.id, captura.nombre, captura.tipo, captura.bytes);
  }

  await sendMail({
    subject: `[${ETIQUETAS[ticket.tipo]}] ${cliente}: ${ticket.titulo}`,
    body: [
      `Cliente: ${cliente}`,
      `Tipo: ${ETIQUETAS[ticket.tipo]} · Prioridad: ${ETIQUETAS[ticket.prioridad]}`,
      ticket.reporta ? `Reporta: ${ticket.reporta}` : null,
      ticket.url ? `Pantalla o URL: ${ticket.url}` : null,
      "",
      ticket.detalle,
    ],
  });

  revalidatePath(`/soporte/${token}`);
  redirect(`/soporte/${token}/?ok=1`);
}

export async function actualizarTicket(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!esAdmin(token)) redirect("/soporte/invalido/");

  const id = Number(formData.get("id"));
  const estado = parseEstado(formData.get("estado"));
  const estadoPrevio = parseEstado(formData.get("estadoPrevio"));
  const respuesta = String(formData.get("respuesta") ?? "").trim().slice(0, 2000);
  if (!Number.isInteger(id) || !estado) {
    redirect(`/admin/soporte/${token}/?error=${encodeURIComponent("Datos inválidos")}`);
  }

  const ticket = await updateTicket(id, estado, respuesta || null);

  // Sólo avisamos cuando cambia el estado, no cuando se retoca la respuesta.
  if (ticket?.email && estado !== estadoPrevio) {
    const tokenCliente = await tokenDeCliente(ticket.cliente);
    await sendMail({
      to: ticket.email,
      subject: `Tu pedido #${ticket.id} está ${ETIQUETAS[estado].toLowerCase()}: ${ticket.titulo}`,
      body: [
        `Hola${ticket.reporta ? ` ${ticket.reporta}` : ""},`,
        "",
        `El pedido #${ticket.id} "${ticket.titulo}" pasó a ${ETIQUETAS[estado]}.`,
        ticket.respuesta ? "" : null,
        ticket.respuesta,
        // Sólo cuando el trabajo terminó: pedir feedback en un ticket abierto molesta.
        tokenCliente && (estado === "resuelto" || estado === "cerrado")
          ? `\n¿Cómo salió? Contame acá: ${site.url}/feedback/${tokenCliente}/?trabajo=soporte`
          : null,
      ],
      button: tokenCliente
        ? { label: "Ver todos tus pedidos", href: `${site.url}/soporte/${tokenCliente}/` }
        : undefined,
    });
  }
  revalidatePath(`/admin/soporte/${token}`);
  redirect(`/admin/soporte/${token}/?ok=1`);
}
