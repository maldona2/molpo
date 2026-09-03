// Lógica del tablero kanban. Sin acceso a base: lo testeable vive acá.
// La extensión explícita la exige node al correr los tests con type stripping.
import { ESTADOS, type Estado, type Ticket } from "./tickets.ts";

/** Columnas del tablero, en el orden en que se leen. */
export const COLUMNAS: readonly Estado[] = ESTADOS;

/**
 * El cliente ordena su propia columna de Abierto y así dice qué le urge sin
 * tener que escribir un mail. Las otras columnas las maneja el estado del
 * trabajo, no su preferencia.
 */
export const COLUMNA_ORDENABLE: Estado = "abierto";

export function agruparPorEstado(tickets: Ticket[]): Record<Estado, Ticket[]> {
  const columnas = Object.fromEntries(ESTADOS.map((e) => [e, [] as Ticket[]])) as Record<
    Estado,
    Ticket[]
  >;
  for (const ticket of tickets) columnas[ticket.estado].push(ticket);
  return columnas;
}

/**
 * Mueve `id` a la posición `destino` de la lista y devuelve el orden nuevo.
 * Un destino fuera de rango se recorta a los extremos en vez de romper: el
 * índice llega de un drag y no vale la pena explotar por un pixel de más.
 */
export function moverEnLista(ids: number[], id: number, destino: number): number[] {
  const origen = ids.indexOf(id);
  if (origen === -1) return [...ids];

  const resto = ids.filter((otro) => otro !== id);
  const posicion = Math.max(0, Math.min(destino, resto.length));
  resto.splice(posicion, 0, id);
  return resto;
}

/** Sólo los ids que estaban en la columna, sin repetidos ni intrusos. */
export function sanearOrden(idsPedidos: unknown, idsReales: number[]): number[] {
  if (!Array.isArray(idsPedidos)) return idsReales;

  const validos = new Set(idsReales);
  const vistos = new Set<number>();
  const orden: number[] = [];

  for (const valor of idsPedidos) {
    const id = Number(valor);
    if (validos.has(id) && !vistos.has(id)) {
      vistos.add(id);
      orden.push(id);
    }
  }
  // Lo que el cliente no mandó (o mandó mal) queda al final, no se pierde.
  for (const id of idsReales) if (!vistos.has(id)) orden.push(id);
  return orden;
}
