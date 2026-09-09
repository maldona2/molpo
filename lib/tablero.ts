// Lógica del tablero. Sin acceso a base: lo testeable vive acá.
// La extensión explícita la exige node al correr los tests con type stripping.
import { ESTADOS, type Estado, type Ticket } from "./tickets.ts";

/** Columnas del tablero, en el orden en que se leen. */
export const COLUMNAS: readonly Estado[] = ESTADOS;

export function agruparPorEstado(tickets: Ticket[]): Record<Estado, Ticket[]> {
  const columnas = Object.fromEntries(ESTADOS.map((e) => [e, [] as Ticket[]])) as Record<
    Estado,
    Ticket[]
  >;
  for (const ticket of tickets) columnas[ticket.estado].push(ticket);
  return columnas;
}
