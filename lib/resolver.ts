// Prompt que se le manda a Grok desde el tablero. Sin I/O: lo testeable vive
// acá; el helper local y el botón sólo lo transportan.

import { ETIQUETAS, type Prioridad, type Tipo } from "./tickets.ts";

export const RESOLVER_URL = "http://127.0.0.1:47821";

const INTRO: Record<Tipo, string> = {
  bug: "Hay un bug reportado por un cliente. Arreglalo en este repo.",
  mejora: "Hay un pedido de mejora de un cliente. Implementalo en este repo.",
  consulta: "Hay una consulta de un cliente. Resolvela en este repo.",
};

export type PromptTicket = {
  id: number;
  tipo: Tipo;
  prioridad: Prioridad;
  cliente: string;
  titulo: string;
  detalle: string;
  url: string | null;
  reporta: string | null;
  respuesta: string | null;
};

function origenLimpio(origenApp: string): string {
  return origenApp.replace(/\/+$/, "");
}

export function armarPrompt(
  ticket: PromptTicket,
  capturas: { id: number; nombre: string }[],
  origenApp: string,
): string {
  const origen = origenLimpio(origenApp);
  const lineas = [
    INTRO[ticket.tipo],
    "",
    `## Ticket #${ticket.id} · ${ETIQUETAS[ticket.tipo]} · ${ETIQUETAS[ticket.prioridad]}`,
    `Cliente: ${ticket.cliente}`,
    `Título: ${ticket.titulo}`,
  ];
  if (ticket.url) lineas.push(`Pantalla o URL: ${ticket.url}`);
  if (ticket.reporta) lineas.push(`Reporta: ${ticket.reporta}`);
  lineas.push("", "## Detalle", ticket.detalle);
  if (capturas.length > 0) {
    lineas.push("", "## Capturas");
    for (const captura of capturas) {
      lineas.push(`- ${origen}/adjuntos/${captura.id} (${captura.nombre}; puede pedir login)`);
    }
  }
  if (ticket.respuesta) {
    lineas.push("", "## Respuesta", ticket.respuesta);
  }
  lineas.push(
    "",
    `Ticket en el tablero: ${origen}/tablero/${ticket.id}/`,
    "",
    "No hagas commit ni push salvo que te lo pida.",
  );
  return lineas.join("\n");
}
