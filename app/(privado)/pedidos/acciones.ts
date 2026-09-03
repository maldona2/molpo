"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import { validateTicket, ETIQUETAS } from "@/lib/tickets";
import { createTicket } from "@/lib/tickets-db";
import { createAdjunto } from "@/lib/adjuntos-db";
import { validarAdjunto, MAX_POR_TICKET } from "@/lib/adjuntos";

// Rate limit por cliente, mismo criterio que el resto del módulo.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(clave: string): boolean {
  const now = Date.now();
  const recent = (hits.get(clave) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(clave, recent);
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

export async function crearPedido(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "cliente") redirect("/entrar/");

  if (rateLimited(String(quien.clienteId))) {
    redirect(`/pedidos/?error=${encodeURIComponent("Demasiados envíos, probá más tarde")}`);
  }

  const result = validateTicket(Object.fromEntries(formData.entries()));
  if (!result.ok) redirect(`/pedidos/?error=${encodeURIComponent(result.error)}`);

  // Las capturas se validan antes de crear el ticket: si una no sirve, el
  // cliente corrige y reenvía sin que le quede un pedido a medias cargado.
  const capturas = await leerCapturas(formData);
  if (!capturas.ok) redirect(`/pedidos/?error=${encodeURIComponent(capturas.error)}`);

  const ticket = await createTicket(quien.nombre, result.value);
  for (const captura of capturas.value) {
    await createAdjunto(ticket.id, captura.nombre, captura.tipo, captura.bytes);
  }

  await sendMail({
    subject: `[${ETIQUETAS[ticket.tipo]}] ${quien.nombre}: ${ticket.titulo}`,
    body: [
      `Cliente: ${quien.nombre}`,
      `Tipo: ${ETIQUETAS[ticket.tipo]} · Prioridad: ${ETIQUETAS[ticket.prioridad]}`,
      ticket.reporta ? `Reporta: ${ticket.reporta}` : null,
      ticket.url ? `Pantalla o URL: ${ticket.url}` : null,
      capturas.value.length ? `Capturas: ${capturas.value.length}` : null,
      "",
      ticket.detalle,
    ],
  });

  revalidatePath("/tablero");
  redirect("/pedidos/?ok=1");
}
